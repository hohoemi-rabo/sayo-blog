import { createAdminClient } from './supabase'
import { generateIgCaptions } from './ig-caption-generator'
import { parsePostSections } from './post-sections'
import { getAutoGenerateConfigOrDefault } from './ig-settings'
import type { IgPostStatus } from './types'

/**
 * Auto-generate Instagram post drafts for a newly published blog post.
 *
 * Invoked from `after()` in the post save Server Action, so failures here
 * must never bubble up and block the article save response.
 *
 * Skips when:
 *  - auto_generate.enabled is false
 *  - the post already has ig_posts (duplicate prevention)
 *  - the article has no <h2> sections (cannot map to IG posts)
 */
export async function triggerIgAutoGenerate(postId: string): Promise<void> {
  try {
    const config = await getAutoGenerateConfigOrDefault()
    if (!config.enabled) {
      console.info(`[ig-auto-generator] skipped (disabled) for post ${postId}`)
      return
    }

    const supabase = createAdminClient()

    const { count: existingCount, error: countError } = await supabase
      .from('ig_posts')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)

    if (countError) {
      console.error('[ig-auto-generator] failed to count existing ig_posts:', countError)
      return
    }
    if ((existingCount ?? 0) > 0) {
      console.info(
        `[ig-auto-generator] skipped (already has ${existingCount} drafts) for post ${postId}`
      )
      return
    }

    const { data: postRow, error: postError } = await supabase
      .from('posts')
      .select('id, content, is_published')
      .eq('id', postId)
      .maybeSingle()

    if (postError || !postRow) {
      console.error('[ig-auto-generator] post not found:', postId, postError)
      return
    }
    if (!postRow.is_published) {
      console.info(
        `[ig-auto-generator] skipped (post is not published) for ${postId}`
      )
      return
    }

    const sections = parsePostSections(postRow.content ?? '')
    if (sections.length === 0) {
      console.warn(
        `[ig-auto-generator] skipped (no <h2> sections) for post ${postId}`
      )
      return
    }

    const sectionIndexes = sections.map((s) => s.index)

    const generated = await generateIgCaptions({
      postId,
      sectionIndexes,
      startSequence: 1,
    })

    if (generated.length === 0) {
      console.warn(
        `[ig-auto-generator] generator produced zero captions for post ${postId}`
      )
      return
    }

    const rows = generated.map((g) => ({
      post_id: postId,
      caption: g.caption,
      hashtags: g.hashtags,
      image_url: g.image_url,
      sequence_number: g.sequence_number,
      status: 'draft' as IgPostStatus,
    }))

    const { error: insertError } = await supabase.from('ig_posts').insert(rows)
    if (insertError) {
      console.error(
        '[ig-auto-generator] insert failed for post',
        postId,
        insertError
      )
      return
    }

    console.info(
      `[ig-auto-generator] created ${rows.length} draft(s) for post ${postId}`
    )
  } catch (err) {
    console.error('[ig-auto-generator] unexpected failure:', err)
  }
}
