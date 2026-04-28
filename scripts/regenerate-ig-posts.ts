#!/usr/bin/env tsx
/**
 * One-off script: regenerate existing IG post drafts using the new FUNE-style
 * prompt and sanitizer. Updates caption + hashtags in place; preserves
 * id, sequence_number, image_url, status.
 *
 * Usage: npx tsx scripts/regenerate-ig-posts.ts
 *
 * Self-contained: avoids importing src/lib/supabase.ts (which pulls in
 * next/headers and breaks under tsx).
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildCaptionPrompt, assembleCaptionText } from '../src/lib/ig-caption-prompt'
import { parsePostSections } from '../src/lib/post-sections'
import { SITE_CONFIG } from '../src/lib/site-config'
import type { IgCaptionConfig } from '../src/lib/types'

// ------------------------------------------------------------
// Targets — derived from DB query (verified by image_url match)
// ------------------------------------------------------------
const TARGETS: Array<{
  igPostId: string
  postId: string
  sectionIndex: number
  label: string
}> = [
  {
    igPostId: '10fc87df-635e-49f7-a83b-d0726be719c3',
    postId: '050b91cd-9689-4f07-a816-2c0fd79f3bf4',
    sectionIndex: 1, // 三連蔵カレー
    label: 'seq=1 三連蔵カレー',
  },
  {
    igPostId: 'a146df74-4f9b-41a1-bb1a-8fa0b010fefb',
    postId: '050b91cd-9689-4f07-a816-2c0fd79f3bf4',
    sectionIndex: 3, // 三連蔵コーヒー
    label: 'seq=2 三連蔵コーヒー',
  },
]

// ------------------------------------------------------------
// Setup
// ------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const geminiKey = process.env.GEMINI_API_KEY
const geminiModelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'

if (!supabaseUrl || !serviceKey || !geminiKey) {
  console.error('❌ Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GEMINI_API_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const genAI = new GoogleGenerativeAI(geminiKey)
const model = genAI.getGenerativeModel({ model: geminiModelName })

const DEFAULT_CAPTION_CONFIG: IgCaptionConfig = {
  required_hashtags: ['#長野県飯田市', '#sayosjournalブログ記事'],
  min_length: 200,
  max_length: 400,
  generated_hashtag_count: 8,
}

const MAX_SECTION_TEXT_CHARS = 3000
const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
async function main() {
  const captionConfig = await loadCaptionConfig()

  for (const target of TARGETS) {
    console.log(`\n=== Regenerating ${target.label} (ig_post=${target.igPostId}) ===`)
    try {
      const article = await loadArticle(target.postId)
      const sections = parsePostSections(article.content)
      const section = sections[target.sectionIndex]
      if (!section) {
        console.error(`  ❌ section index ${target.sectionIndex} not found (${sections.length} sections)`)
        continue
      }
      console.log(`  section heading: ${section.heading}`)

      const articleUrl = `${SITE_CONFIG.url.replace(/\/$/, '')}/${article.category_slug}/${article.slug}`

      const prompt = buildCaptionPrompt({
        title: article.title,
        category: article.category_name,
        excerpt: article.excerpt,
        hashtags: article.hashtags,
        contentText: section.text.slice(0, MAX_SECTION_TEXT_CHARS),
        articleUrl,
        count: 1,
        config: captionConfig,
        sectionHeading: section.heading,
      })

      const aiPosts = await callGeminiWithRetry(prompt)
      const first = aiPosts[0]
      if (!first) {
        console.error('  ❌ AI returned no posts')
        continue
      }

      const generatedHashtags = mergeHashtags(
        first.hashtags,
        captionConfig.required_hashtags,
        captionConfig.generated_hashtag_count
      )
      const sanitizedBody = sanitizeCaptionBody({
        body: first.caption,
        articleUrl,
        articleTitle: article.title,
        requiredHashtags: captionConfig.required_hashtags,
      })
      const caption = assembleCaptionText({
        body: sanitizedBody,
        articleUrl,
        requiredHashtags: captionConfig.required_hashtags,
        generatedHashtags,
      })
      const hashtagsArray = [...captionConfig.required_hashtags, ...generatedHashtags]

      const { error: updateError } = await supabase
        .from('ig_posts')
        .update({ caption, hashtags: hashtagsArray })
        .eq('id', target.igPostId)

      if (updateError) {
        console.error('  ❌ DB update failed:', updateError)
        continue
      }

      console.log('  ✅ updated')
      console.log('  --- caption preview ---')
      console.log(caption.slice(0, 600))
      console.log('  ---')
    } catch (err) {
      console.error('  ❌ error:', err instanceof Error ? err.message : err)
    }
  }

  console.log('\n=== Done ===')
}

// ------------------------------------------------------------
// Helpers (inlined from ig-caption-generator.ts to avoid pulling in
// next/headers via the supabase.ts import chain)
// ------------------------------------------------------------

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

async function loadCaptionConfig(): Promise<IgCaptionConfig> {
  const { data, error } = await supabase
    .from('ig_settings')
    .select('setting_value')
    .eq('setting_key', 'caption_config')
    .maybeSingle()
  if (error || !data?.setting_value) return DEFAULT_CAPTION_CONFIG
  const v = data.setting_value as Partial<IgCaptionConfig>
  return {
    required_hashtags:
      Array.isArray(v.required_hashtags) && v.required_hashtags.length > 0
        ? v.required_hashtags
        : DEFAULT_CAPTION_CONFIG.required_hashtags,
    min_length: v.min_length ?? DEFAULT_CAPTION_CONFIG.min_length,
    max_length: v.max_length ?? DEFAULT_CAPTION_CONFIG.max_length,
    generated_hashtag_count:
      v.generated_hashtag_count ?? DEFAULT_CAPTION_CONFIG.generated_hashtag_count,
  }
}

async function loadArticle(postId: string): Promise<ArticleForCaption> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      id, title, slug, excerpt, content, is_published,
      post_categories(categories(slug, name, order_num)),
      post_hashtags(hashtags(name))
    `
    )
    .eq('id', postId)
    .maybeSingle()

  if (error || !data) throw new Error(`Post not found: ${postId}`)

  type RawCategory = { slug: string; name: string; order_num: number | null }
  type RawHashtag = { name: string }
  type Row = {
    id: string
    title: string
    slug: string
    excerpt: string | null
    content: string
    is_published: boolean
    post_categories: Array<{ categories: RawCategory | RawCategory[] | null }> | null
    post_hashtags: Array<{ hashtags: RawHashtag | RawHashtag[] | null }> | null
  }
  const row = data as unknown as Row

  const categoryRecords: RawCategory[] = (row.post_categories ?? [])
    .flatMap((r) => {
      if (!r.categories) return []
      return Array.isArray(r.categories) ? r.categories : [r.categories]
    })
  categoryRecords.sort((a, b) => (a.order_num ?? 9999) - (b.order_num ?? 9999))
  const primary = categoryRecords[0]
  if (!primary) throw new Error(`Post ${postId} has no category`)

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
    category_slug: primary.slug,
    category_name: primary.name,
    hashtags: hashtagNames,
  }
}

interface AiCaptionItem {
  caption: string
  hashtags: string[]
}

async function callGeminiWithRetry(prompt: string): Promise<AiCaptionItem[]> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = parseAiResponse(text)
      if (parsed.length === 0) throw new Error('AI returned zero captions')
      return parsed
    } catch (err) {
      lastError = err
      console.warn(`  attempt ${attempt}/${MAX_RETRIES} failed:`, err instanceof Error ? err.message : err)
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * 2 ** (attempt - 1)))
      }
    }
  }
  throw new Error(
    `Failed after ${MAX_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : 'unknown'}`
  )
}

function parseAiResponse(raw: string): AiCaptionItem[] {
  let s = raw.trim()
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(s) as { posts?: AiCaptionItem[] }
  if (!parsed.posts || !Array.isArray(parsed.posts)) {
    throw new Error('AI response missing "posts" array')
  }
  return parsed.posts
    .map((p) => ({
      caption: typeof p.caption === 'string' ? p.caption.trim() : '',
      hashtags: Array.isArray(p.hashtags) ? p.hashtags.map((t) => String(t).trim()).filter(Boolean) : [],
    }))
    .filter((p) => p.caption.length > 0)
}

function mergeHashtags(generated: string[], required: string[], targetCount: number): string[] {
  const requiredSet = new Set(required.map((t) => t.replace(/^#/, '').toLowerCase()))
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of generated) {
    const tag = raw.replace(/^#/, '').trim()
    if (!tag) continue
    const k = tag.toLowerCase()
    if (requiredSet.has(k)) continue
    if (seen.has(k)) continue
    seen.add(k)
    out.push(tag)
    if (out.length >= targetCount) break
  }
  return out
}

function sanitizeCaptionBody(input: {
  body: string
  articleUrl: string
  articleTitle: string
  requiredHashtags: string[]
}): string {
  const { body, articleUrl, articleTitle, requiredHashtags } = input
  let cleaned = body

  const urlPath = articleUrl.replace(/^https?:\/\/[^/]+/, '')
  const urlPatterns = [
    articleUrl,
    articleUrl.replace(/^https:\/\//, 'http://'),
    articleUrl.replace(/^http:\/\//, 'https://'),
    `http://localhost:3000${urlPath}`,
    `https://localhost:3000${urlPath}`,
    `https://www.sayo-kotoba.com${urlPath}`,
    `https://sayo-kotoba.com${urlPath}`,
  ]
  for (const p of urlPatterns) cleaned = cleaned.split(p).join('')

  cleaned = cleaned
    .replace(/📍\s*詳しくはブログで\s*/g, '')
    .replace(/詳しくはブログで/g, '')
    .replace(/^[ \t]*📍[ \t]*$/gm, '')

  for (const rawTag of requiredHashtags) {
    const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    cleaned = cleaned.replace(new RegExp(escaped, 'g'), '')
  }

  // Title-line stripping (conservative: full-title match only)
  const lines = cleaned.split('\n')
  while (lines.length > 0 && lines[0].trim() === '') lines.shift()
  if (lines.length > 0) {
    const first = lines[0].trim()
    if (isTitleLikeLine(first, articleTitle)) {
      lines.shift()
      while (lines.length > 0 && lines[0].trim() === '') lines.shift()
    }
  }
  cleaned = lines.join('\n')

  cleaned = cleaned
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return cleaned
}

function isTitleLikeLine(line: string, articleTitle: string): boolean {
  if (!line) return false
  const title = articleTitle.trim()
  if (!title) return false
  if (line === title) return true
  if (line === `【${title}】`) return true
  if (line.includes(title)) return true
  const stripped = line.replace(/^【[^】]*】/, '').replace(/【[^】]*】$/, '').trim()
  if (stripped && (stripped === title || title.includes(stripped))) return true
  return false
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
