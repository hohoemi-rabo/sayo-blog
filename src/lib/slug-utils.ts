import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Generate a URL-friendly slug from a title.
 *
 * Mirrors the existing convention used elsewhere (scripts/migrate-posts.ts:54
 * and PostForm.tsx:57): keep Japanese characters as-is (Hiragana / Katakana /
 * CJK Unified Ideographs), lowercase ASCII, replace whitespace with hyphens,
 * strip everything else. Browsers display the encoded URL as Japanese.
 */
export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9぀-ゟ゠-ヿ一-鿿-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
  return slug || 'post'
}

/**
 * Generate a unique post slug that doesn't collide with existing rows.
 *
 * For event posts (eventDate provided), prefer `event-{YYYY-MM-DD}-{title}`
 * for a more descriptive URL. On collision, append `-2`, `-3`, ...
 */
export async function generateUniquePostSlug(
  client: SupabaseClient,
  title: string,
  options?: { eventDate?: string | null }
): Promise<string> {
  const baseRaw = slugifyTitle(title)
  const base = options?.eventDate
    ? `event-${options.eventDate}-${baseRaw}`.slice(0, 100)
    : baseRaw

  let candidate = base
  for (let attempt = 1; attempt <= 100; attempt++) {
    const { count } = await client
      .from('posts')
      .select('id', { head: true, count: 'exact' })
      .eq('slug', candidate)
    if (!count || count === 0) return candidate
    const suffix = `-${attempt + 1}`
    candidate = `${base.slice(0, 100 - suffix.length)}${suffix}`
  }

  // 100 collisions is exceptional — fall back to a timestamp suffix.
  const fallback = `-${Date.now()}`
  return `${base.slice(0, 100 - fallback.length)}${fallback}`
}
