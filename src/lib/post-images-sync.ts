/**
 * Data layer for the photo gallery: sync a post's extracted images into the
 * `post_images` table.
 *
 * `post-images.ts::extractPostImages` stays a PURE function (no DB, no `@/`
 * imports) so `post-images.test.ts` can run under `node --test` without a
 * bundler. The DB-touching `syncPostImages` therefore lives here, separate from
 * the pure extractor, and just calls `extractPostImages`.
 */

import { createAdminClient } from '@/lib/supabase'
import { extractPostImages } from '@/lib/post-images'

/**
 * Re-derive a post's gallery images from its current content/thumbnail and
 * persist them into `post_images` (delete → insert, idempotent).
 *
 * Denormalizes the post's published flag/date onto each row so the public
 * gallery query can filter without joining posts.
 *
 * Best-effort: never throws to the caller (logs and returns on failure) so a
 * sync hiccup can't break the article save itself.
 */
export async function syncPostImages(postId: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('content, thumbnail_url, is_published, published_at')
      .eq('id', postId)
      .maybeSingle()
    if (postErr) {
      console.error('[syncPostImages] failed to load post:', postErr)
      return
    }
    if (!post) return

    const images = extractPostImages({
      content: post.content,
      thumbnail_url: post.thumbnail_url,
    })

    // Replace the post's rows wholesale (idempotent).
    const { error: delErr } = await supabase
      .from('post_images')
      .delete()
      .eq('post_id', postId)
    if (delErr) {
      console.error('[syncPostImages] delete failed:', delErr)
      return
    }

    if (images.length === 0) return

    const rows = images.map((img) => ({
      post_id: postId,
      image_url: img.imageUrl,
      caption: img.caption,
      alt: img.alt,
      position: img.position,
      is_thumbnail: img.isThumbnail,
      post_is_published: post.is_published === true,
      post_published_at: post.published_at ?? null,
    }))

    const { error: insErr } = await supabase.from('post_images').insert(rows)
    if (insErr) {
      console.error('[syncPostImages] insert failed:', insErr)
    }
  } catch (err) {
    console.error('[syncPostImages] unexpected error:', err)
  }
}
