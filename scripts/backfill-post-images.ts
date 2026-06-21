#!/usr/bin/env tsx
/**
 * Backfill post_images for every existing post.
 *
 * One-shot, idempotent (delete -> insert per post), mirrors syncPostImages but
 * standalone so it can run via tsx without the Next.js runtime.
 *
 * Usage: npm run backfill:gallery
 */

import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { extractPostImages } from '../src/lib/post-images'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🖼  Backfilling post_images...')

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, content, thumbnail_url, is_published, published_at')
    .order('published_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('❌ Failed to load posts:', error.message)
    process.exit(1)
  }
  if (!posts || posts.length === 0) {
    console.log('No posts found. Nothing to do.')
    return
  }

  let totalImages = 0
  let postsWithImages = 0
  let failures = 0

  for (const post of posts) {
    const images = extractPostImages({
      content: post.content,
      thumbnail_url: post.thumbnail_url,
    })

    // delete -> insert (idempotent)
    const { error: delErr } = await supabase
      .from('post_images')
      .delete()
      .eq('post_id', post.id)
    if (delErr) {
      console.error(`  ✗ [${post.title}] delete failed:`, delErr.message)
      failures++
      continue
    }

    if (images.length === 0) continue

    const rows = images.map((img) => ({
      post_id: post.id,
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
      console.error(`  ✗ [${post.title}] insert failed:`, insErr.message)
      failures++
      continue
    }

    totalImages += rows.length
    postsWithImages++
    console.log(`  ✓ [${post.title}] ${rows.length} image(s)`)
  }

  console.log('\n─────────────────────────────')
  console.log(`Posts processed : ${posts.length}`)
  console.log(`Posts w/ images : ${postsWithImages}`)
  console.log(`Total images    : ${totalImages}`)
  if (failures > 0) console.log(`Failures        : ${failures}`)
  console.log('✅ Backfill complete.')
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
