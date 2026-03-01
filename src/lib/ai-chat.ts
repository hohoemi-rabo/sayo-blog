import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ChatMessage,
  ArticleCard,
  SpotInfo,
  KnowledgeSpot,
} from './types'
import type { MatchedArticle } from './ai-prompt'

const MAX_MESSAGE_LENGTH = 1000
const MAX_HISTORY_TURNS = 10
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// -------------------------------------------------------------------
// Validation
// -------------------------------------------------------------------

interface ValidatedRequest {
  message: string
  session_id: string
  history: ChatMessage[]
}

export function validateChatRequest(
  body: unknown
): { ok: true; data: ValidatedRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'リクエストボディが不正です' }
  }

  const { message, session_id, history } = body as Record<string, unknown>

  if (typeof message !== 'string' || message.trim().length === 0) {
    return { ok: false, error: 'メッセージを入力してください' }
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `メッセージは${MAX_MESSAGE_LENGTH}文字以内にしてください`,
    }
  }

  if (typeof session_id !== 'string' || !UUID_REGEX.test(session_id)) {
    return { ok: false, error: 'session_id が不正です' }
  }

  if (!Array.isArray(history)) {
    return { ok: false, error: 'history は配列である必要があります' }
  }

  // Trim history to max turns
  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS).filter(
    (h): h is ChatMessage =>
      typeof h === 'object' &&
      h !== null &&
      (h.role === 'user' || h.role === 'assistant') &&
      typeof h.content === 'string'
  )

  return {
    ok: true,
    data: {
      message: message.trim(),
      session_id,
      history: trimmedHistory,
    },
  }
}

// -------------------------------------------------------------------
// Post-processing: extract patterns from Gemini response
// -------------------------------------------------------------------

export function extractArticleSlugs(text: string): string[] {
  const matches = text.matchAll(/\[\[([^\]]+)\]\]/g)
  const slugs = new Set<string>()
  for (const match of matches) {
    slugs.add(match[1].trim())
  }
  return Array.from(slugs)
}

export function extractSpotNames(text: string): string[] {
  const matches = text.matchAll(/\{\{spot:([^}]+)\}\}/g)
  const names = new Set<string>()
  for (const match of matches) {
    names.add(match[1].trim())
  }
  return Array.from(names)
}

// -------------------------------------------------------------------
// Post-processing: fetch article cards
// -------------------------------------------------------------------

export async function fetchArticleCards(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<ArticleCard[]> {
  if (slugs.length === 0) return []

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      slug,
      title,
      thumbnail_url,
      excerpt,
      post_categories(categories(slug))
    `
    )
    .in('slug', slugs)
    .eq('is_published', true)

  if (error || !data) {
    console.error('Failed to fetch article cards:', error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((post: any) => ({
    slug: post.slug,
    title: post.title,
    thumbnail_url: post.thumbnail_url || null,
    excerpt: post.excerpt || null,
    category: post.post_categories?.[0]?.categories?.slug || '',
  }))
}

// -------------------------------------------------------------------
// Post-processing: match spots from knowledge metadata
// -------------------------------------------------------------------

export function matchSpots(
  spotNames: string[],
  matchedArticles: MatchedArticle[]
): SpotInfo[] {
  if (spotNames.length === 0) return []

  const allSpots: KnowledgeSpot[] = matchedArticles.flatMap(
    (a) => a.metadata.spots || []
  )

  return spotNames
    .map((name) => allSpots.find((s) => s.name === name))
    .filter((s): s is KnowledgeSpot => s != null)
    .map((spot) => ({
      name: spot.name,
      address: spot.address,
      phone: spot.phone,
      hours: spot.hours,
      mapUrl: spot.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.address)}`
        : undefined,
    }))
}

// -------------------------------------------------------------------
// Post-processing: fetch related tag suggestions
// -------------------------------------------------------------------

export async function fetchSuggestions(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase
    .from('ai_prompt_tags')
    .select('label')
    .eq('is_active', true)
    .order('order_num')
    .limit(5)

  if (error || !data) {
    console.error('Failed to fetch suggestions:', error)
    return []
  }

  return data.map((t) => t.label)
}
