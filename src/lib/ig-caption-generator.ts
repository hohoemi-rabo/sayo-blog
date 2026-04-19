import { getGenerativeModel } from './gemini'
import { sleep } from './knowledge-generator'
import { createAdminClient } from './supabase'
import { SITE_CONFIG } from './site-config'
import { buildCaptionPrompt, assembleCaptionText } from './ig-caption-prompt'
import { parsePostSections, type PostSection } from './post-sections'
import type { IgCaptionConfig } from './types'

const DEFAULT_CAPTION_CONFIG: IgCaptionConfig = {
  required_hashtags: ['#長野県飯田市', '#sayosjournalブログ記事'],
  min_length: 200,
  max_length: 400,
  generated_hashtag_count: 8,
}

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000
const MAX_SECTION_TEXT_CHARS = 3000

export interface GeneratedIgCaption {
  caption: string
  hashtags: string[]
  image_url: string | null
  sequence_number: number
  section_heading: string
}

export interface GenerateIgCaptionsOptions {
  postId: string
  sectionIndexes: number[]
  startSequence?: number
}

/**
 * Generate one IG post draft per selected section of the blog article.
 *
 * Each selected <h2> section produces exactly one IG caption + hashtags,
 * using the section's heading + body + first <img> as inputs.
 */
export async function generateIgCaptions(
  options: GenerateIgCaptionsOptions
): Promise<GeneratedIgCaption[]> {
  const { postId, sectionIndexes, startSequence = 1 } = options

  if (!Array.isArray(sectionIndexes) || sectionIndexes.length === 0) {
    throw new Error('sectionIndexes must be a non-empty array')
  }

  const supabase = createAdminClient()
  const config = await loadCaptionConfig(supabase)
  const article = await loadArticle(supabase, postId)

  if (!article.is_published) {
    throw new Error('Cannot generate IG captions for an unpublished post')
  }

  const allSections = parsePostSections(article.content)
  if (allSections.length === 0) {
    throw new Error('この記事には見出し (h2) がありません。セクション構造に整形してください。')
  }

  // Validate + dedupe requested section indexes
  const uniqueIndexes = Array.from(new Set(sectionIndexes)).sort((a, b) => a - b)
  const chosen = uniqueIndexes
    .map((i) => allSections[i])
    .filter((s): s is PostSection => Boolean(s))
  if (chosen.length === 0) {
    throw new Error('指定されたセクションが見つかりません')
  }

  const articleUrl = buildArticleUrl(article.category_slug, article.slug)

  const results: GeneratedIgCaption[] = []

  for (let idx = 0; idx < chosen.length; idx++) {
    const section = chosen[idx]
    const sectionText = section.text.slice(0, MAX_SECTION_TEXT_CHARS)

    const prompt = buildCaptionPrompt({
      title: article.title,
      category: article.category_name,
      excerpt: article.excerpt,
      hashtags: article.hashtags,
      contentText: sectionText,
      articleUrl,
      count: 1,
      config,
      sectionHeading: section.heading,
    })

    const aiPosts = await callGeminiWithRetry(prompt)
    const first = aiPosts[0]
    if (!first) continue

    const generatedHashtags = mergeHashtags(
      first.hashtags,
      config.required_hashtags,
      config.generated_hashtag_count
    )
    const sanitizedBody = sanitizeCaptionBody({
      body: first.caption,
      articleUrl,
      articleTitle: article.title,
      requiredHashtags: config.required_hashtags,
    })
    const caption = assembleCaptionText({
      body: sanitizedBody,
      articleUrl,
      requiredHashtags: config.required_hashtags,
      generatedHashtags,
    })

    results.push({
      caption,
      hashtags: [...config.required_hashtags, ...generatedHashtags],
      image_url: section.imageUrl ?? null,
      sequence_number: startSequence + idx,
      section_heading: section.heading,
    })
  }

  return results
}

/**
 * Defense-in-depth: Gemini がプロンプト指示を無視して caption 本文に
 * 必須ハッシュタグ・記事URL・誘導文・タイトルを含めてしまうケースを
 * 最終フォーマット前に後処理で除去する。
 */
function sanitizeCaptionBody(input: {
  body: string
  articleUrl: string
  articleTitle: string
  requiredHashtags: string[]
}): string {
  const { body, articleUrl, articleTitle, requiredHashtags } = input
  let cleaned = body

  // 1. Remove article URL (all common variants: https/http, localhost dev URL, bare domain)
  const urlPath = articleUrl.replace(/^https?:\/\/[^/]+/, '') // /gourmet/xxx
  const urlPatterns = [
    articleUrl,
    articleUrl.replace(/^https:\/\//, 'http://'),
    articleUrl.replace(/^http:\/\//, 'https://'),
    `http://localhost:3000${urlPath}`,
    `https://localhost:3000${urlPath}`,
    `https://www.sayo-kotoba.com${urlPath}`,
    `https://sayo-kotoba.com${urlPath}`,
  ]
  for (const pattern of urlPatterns) {
    cleaned = cleaned.split(pattern).join('')
  }

  // 2. Remove marker phrases the system will add itself
  cleaned = cleaned
    .replace(/📍\s*詳しくはブログで\s*/g, '')
    .replace(/詳しくはブログで/g, '')
    .replace(/^[ \t]*📍[ \t]*$/gm, '')

  // 3. Remove required hashtag lines (the exact tags)
  for (const rawTag of requiredHashtags) {
    const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    cleaned = cleaned.replace(new RegExp(escaped, 'g'), '')
  }

  // 4. Remove leading title-like line.
  //    Gemini often prepends variants like "【飯田市】タイトル", "タイトル - サブタイトル",
  //    or just the article title. We strip the first non-empty line if it looks like a heading.
  const lines = cleaned.split('\n')
  while (lines.length > 0 && lines[0].trim() === '') lines.shift()
  if (lines.length > 0) {
    const firstLine = lines[0].trim()
    if (isTitleLikeLine(firstLine, articleTitle)) {
      lines.shift()
      // Drop a following blank line too, if any
      while (lines.length > 0 && lines[0].trim() === '') lines.shift()
    }
  }
  cleaned = lines.join('\n')

  // 5. Normalize whitespace
  cleaned = cleaned
    .replace(/[ \t]+\n/g, '\n') // trailing spaces before newline
    .replace(/\n{3,}/g, '\n\n') // collapse excessive blank lines
    .trim()

  return cleaned
}

/**
 * Decide whether a line looks like a prepended title (should be removed).
 * Triggers:
 *  - Exact match with articleTitle
 *  - Contains articleTitle (e.g. "【飯田市】articleTitle")
 *  - articleTitle contains the line stripped of decorations
 *  - Starts with 【...】 and has no sentence-ending punctuation (short heading)
 */
function isTitleLikeLine(line: string, articleTitle: string): boolean {
  if (!line) return false
  const title = articleTitle.trim()
  if (!title) return false

  if (line === title) return true
  if (line === `【${title}】`) return true
  if (line.includes(title)) return true

  // Strip leading/trailing brackets and compare
  const stripped = line.replace(/^【[^】]*】/, '').replace(/【[^】]*】$/, '').trim()
  if (stripped && (stripped === title || title.includes(stripped))) return true

  // Heuristic: 【xxx】で始まる短い見出し (≤40 chars, no 。 or 、)
  if (/^【[^】]+】/.test(line) && line.length <= 40 && !/[。、]/.test(line)) {
    return true
  }

  return false
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

type SupabaseAdmin = ReturnType<typeof createAdminClient>

interface ArticleForCaption {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  is_published: boolean
  category_slug: string
  category_name: string
  hashtags: string[]
}

async function loadCaptionConfig(supabase: SupabaseAdmin): Promise<IgCaptionConfig> {
  const { data, error } = await supabase
    .from('ig_settings')
    .select('setting_value')
    .eq('setting_key', 'caption_config')
    .maybeSingle()
  if (error) {
    console.error('[ig-caption-generator] Failed to load caption_config', error)
    return DEFAULT_CAPTION_CONFIG
  }
  const value = data?.setting_value as Partial<IgCaptionConfig> | undefined
  if (!value) return DEFAULT_CAPTION_CONFIG
  return {
    required_hashtags:
      Array.isArray(value.required_hashtags) && value.required_hashtags.length > 0
        ? value.required_hashtags
        : DEFAULT_CAPTION_CONFIG.required_hashtags,
    min_length: value.min_length ?? DEFAULT_CAPTION_CONFIG.min_length,
    max_length: value.max_length ?? DEFAULT_CAPTION_CONFIG.max_length,
    generated_hashtag_count:
      value.generated_hashtag_count ?? DEFAULT_CAPTION_CONFIG.generated_hashtag_count,
  }
}

interface RawCategory {
  slug: string
  name: string
  order_num: number | null
}

interface RawHashtag {
  name: string
}

interface RawPostRow {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  is_published: boolean
  post_categories: Array<{ categories: RawCategory | RawCategory[] | null }> | null
  post_hashtags: Array<{ hashtags: RawHashtag | RawHashtag[] | null }> | null
}

async function loadArticle(
  supabase: SupabaseAdmin,
  postId: string
): Promise<ArticleForCaption> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      content,
      is_published,
      post_categories(categories(slug, name, order_num)),
      post_hashtags(hashtags(name))
    `
    )
    .eq('id', postId)
    .maybeSingle()

  if (error || !data) {
    throw new Error(`Post not found: ${postId}`)
  }

  const row = data as unknown as RawPostRow

  const categoryRecords: RawCategory[] = (row.post_categories ?? [])
    .flatMap((r) => {
      if (!r.categories) return []
      return Array.isArray(r.categories) ? r.categories : [r.categories]
    })

  categoryRecords.sort((a, b) => (a.order_num ?? 9999) - (b.order_num ?? 9999))

  const primaryCategory = categoryRecords[0]
  if (!primaryCategory) {
    throw new Error(`Post ${postId} has no category — cannot build article URL`)
  }

  const hashtagNames: string[] = (row.post_hashtags ?? [])
    .flatMap((r) => {
      if (!r.hashtags) return []
      return Array.isArray(r.hashtags) ? r.hashtags.map((h) => h.name) : [r.hashtags.name]
    })
    .filter(Boolean)

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    content: row.content,
    is_published: row.is_published,
    category_slug: primaryCategory.slug,
    category_name: primaryCategory.name,
    hashtags: hashtagNames,
  }
}

function buildArticleUrl(categorySlug: string, postSlug: string): string {
  const base = SITE_CONFIG.url.replace(/\/$/, '')
  return `${base}/${categorySlug}/${postSlug}`
}

interface AiCaptionItem {
  caption: string
  hashtags: string[]
}

async function callGeminiWithRetry(prompt: string): Promise<AiCaptionItem[]> {
  const model = getGenerativeModel()

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = parseAiResponse(text)
      if (parsed.length === 0) {
        throw new Error('AI returned zero captions')
      }
      return parsed
    } catch (err) {
      lastError = err
      console.warn(
        `[ig-caption-generator] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        err instanceof Error ? err.message : err
      )
      if (attempt < MAX_RETRIES) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1))
      }
    }
  }
  throw new Error(
    `Failed to generate IG captions after ${MAX_RETRIES} attempts: ${
      lastError instanceof Error ? lastError.message : 'unknown error'
    }`
  )
}

function parseAiResponse(raw: string): AiCaptionItem[] {
  let jsonStr = raw.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }
  const parsed = JSON.parse(jsonStr) as { posts?: AiCaptionItem[] }
  if (!parsed.posts || !Array.isArray(parsed.posts)) {
    throw new Error('AI response missing "posts" array')
  }
  return parsed.posts
    .map((p) => ({
      caption: typeof p.caption === 'string' ? p.caption.trim() : '',
      hashtags: Array.isArray(p.hashtags)
        ? p.hashtags.map((t) => String(t).trim()).filter(Boolean)
        : [],
    }))
    .filter((p) => p.caption.length > 0)
}

function mergeHashtags(
  generated: string[],
  required: string[],
  targetCount: number
): string[] {
  const requiredNormalized = new Set(
    required.map((t) => t.replace(/^#/, '').toLowerCase())
  )
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of generated) {
    const tag = raw.replace(/^#/, '').trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (requiredNormalized.has(key)) continue
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
    if (result.length >= targetCount) break
  }

  return result
}
