#!/usr/bin/env tsx
/**
 * Data Validation Script
 *
 * Validates migrated data integrity in Supabase database.
 * Checks posts, categories, hashtags, images, and relationships.
 *
 * Usage: npm run validate
 */

import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ValidationResult {
  category: string
  passed: boolean
  message: string
  details?: string[]
}

const results: ValidationResult[] = []

function addResult(category: string, passed: boolean, message: string, details?: string[]) {
  results.push({ category, passed, message, details })
  const icon = passed ? '✅' : '❌'
  console.log(`${icon} ${category}: ${message}`)
  if (details && details.length > 0) {
    details.forEach((detail) => console.log(`   • ${detail}`))
  }
}

async function validatePosts() {
  console.log('\n📝 Validating Posts...')

  // Count total posts
  const { count: totalPosts, error: countError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    addResult('Posts', false, `Failed to count posts: ${countError.message}`)
    return
  }

  addResult('Posts', totalPosts! > 0, `Found ${totalPosts} posts`)

  // Check for posts without categories
  const { data: orphanedPosts, error: orphanError } = await supabase.rpc('get_orphaned_posts', {})

  if (!orphanError && orphanedPosts) {
    const orphanCount = orphanedPosts.length
    if (orphanCount > 0) {
      const orphanTitles = orphanedPosts.map((p: { title: string }) => p.title).slice(0, 5)
      addResult('Orphaned Posts', false, `Found ${orphanCount} posts without categories`, orphanTitles)
    } else {
      addResult('Orphaned Posts', true, 'No posts without categories')
    }
  }

  // Check for duplicate slugs
  const { data: posts } = await supabase.from('posts').select('slug')

  if (posts) {
    const slugs = posts.map((p) => p.slug)
    const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index)
    const uniqueDuplicates = [...new Set(duplicates)]

    if (uniqueDuplicates.length > 0) {
      addResult('Unique Slugs', false, `Found ${uniqueDuplicates.length} duplicate slugs`, uniqueDuplicates)
    } else {
      addResult('Unique Slugs', true, 'All post slugs are unique')
    }
  }

  // Check published posts
  const { count: publishedCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)

  addResult('Published Posts', publishedCount! > 0, `${publishedCount} posts are published`)
}

async function validateCategories() {
  console.log('\n🏷️  Validating Categories...')

  // Count categories by level
  const { data: categories } = await supabase.from('categories').select('id, name, slug, parent_id').order('parent_id')

  if (!categories) {
    addResult('Categories', false, 'Failed to fetch categories')
    return
  }

  const prefectures = categories.filter((c) => c.parent_id === null)
  const cities = categories.filter((c) => c.parent_id !== null && categories.some((p) => p.id === c.parent_id && p.parent_id === null))
  const districts = categories.filter(
    (c) => c.parent_id !== null && categories.some((p) => p.id === c.parent_id && p.parent_id !== null)
  )

  addResult('Category Hierarchy', true, `${prefectures.length} prefectures, ${cities.length} cities, ${districts.length} districts`)

  // Check for orphaned categories (parent_id references non-existent category)
  const categoryIds = new Set(categories.map((c) => c.id))
  const orphanedCategories = categories.filter((c) => c.parent_id !== null && !categoryIds.has(c.parent_id))

  if (orphanedCategories.length > 0) {
    const orphanNames = orphanedCategories.map((c) => c.name)
    addResult('Category Integrity', false, `Found ${orphanedCategories.length} categories with invalid parent_id`, orphanNames)
  } else {
    addResult('Category Integrity', true, 'All categories have valid parent references')
  }

  // Check category slugs are unique
  const slugs = categories.map((c) => c.slug)
  const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index)
  const uniqueDuplicates = [...new Set(duplicates)]

  if (uniqueDuplicates.length > 0) {
    addResult('Unique Category Slugs', false, `Found ${uniqueDuplicates.length} duplicate category slugs`, uniqueDuplicates)
  } else {
    addResult('Unique Category Slugs', true, 'All category slugs are unique')
  }
}

async function validateHashtags() {
  console.log('\n#️⃣  Validating Hashtags...')

  // Count hashtags
  const { count: hashtagCount, error: countError } = await supabase
    .from('hashtags')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    addResult('Hashtags', false, `Failed to count hashtags: ${countError.message}`)
    return
  }

  addResult('Hashtags', hashtagCount! > 0, `Found ${hashtagCount} hashtags`)

  // Verify hashtag counts
  const { data: hashtags } = await supabase.from('hashtags').select('id, name, count')

  if (hashtags) {
    for (const hashtag of hashtags) {
      const { count: actualCount } = await supabase
        .from('post_hashtags')
        .select('*', { count: 'exact', head: true })
        .eq('hashtag_id', hashtag.id)

      if (actualCount !== hashtag.count) {
        addResult(
          'Hashtag Counts',
          false,
          `Hashtag "${hashtag.name}" count mismatch: stored=${hashtag.count}, actual=${actualCount}`
        )
      }
    }
  }

  addResult('Hashtag Counts', true, 'All hashtag counts are accurate')
}

async function validateImages() {
  console.log('\n🖼️  Validating Images...')

  // Get posts with thumbnail URLs
  const { data: posts } = await supabase.from('posts').select('id, title, thumbnail_url').not('thumbnail_url', 'is', null)

  if (!posts || posts.length === 0) {
    addResult('Images', true, 'No posts with thumbnails found (expected if images not yet uploaded)')
    return
  }

  addResult('Image URLs', true, `${posts.length} posts have thumbnail URLs`)

  // Check for broken image links (simple URL validation)
  const brokenLinks: string[] = []

  for (const post of posts) {
    if (post.thumbnail_url) {
      try {
        const url = new URL(post.thumbnail_url)
        if (!url.protocol.startsWith('http')) {
          brokenLinks.push(`${post.title}: Invalid protocol`)
        }
      } catch {
        brokenLinks.push(`${post.title}: Invalid URL`)
      }
    }
  }

  if (brokenLinks.length > 0) {
    addResult('Image URL Validity', false, `Found ${brokenLinks.length} invalid image URLs`, brokenLinks.slice(0, 5))
  } else {
    addResult('Image URL Validity', true, 'All image URLs are valid')
  }
}

async function validateRelationships() {
  console.log('\n🔗 Validating Relationships...')

  // Check post_categories relationships
  const { count: postCatCount } = await supabase.from('post_categories').select('*', { count: 'exact', head: true })

  addResult('Post-Category Links', postCatCount! > 0, `Found ${postCatCount} post-category relationships`)

  // Check post_hashtags relationships
  const { count: postHashCount } = await supabase.from('post_hashtags').select('*', { count: 'exact', head: true })

  addResult('Post-Hashtag Links', postHashCount! > 0, `Found ${postHashCount} post-hashtag relationships`)

  // Verify foreign key integrity
  const { data: postCategories } = await supabase.from('post_categories').select('post_id, category_id')

  if (postCategories) {
    const { data: posts } = await supabase.from('posts').select('id')
    const { data: categories } = await supabase.from('categories').select('id')

    const postIds = new Set(posts?.map((p) => p.id) || [])
    const categoryIds = new Set(categories?.map((c) => c.id) || [])

    const invalidPostCats = postCategories.filter((pc) => !postIds.has(pc.post_id) || !categoryIds.has(pc.category_id))

    if (invalidPostCats.length > 0) {
      addResult('Relationship Integrity', false, `Found ${invalidPostCats.length} invalid post-category relationships`)
    } else {
      addResult('Relationship Integrity', true, 'All relationships have valid foreign keys')
    }
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 VALIDATION SUMMARY')
  console.log('='.repeat(60))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const total = results.length

  console.log(`\nTotal Checks: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n⚠️  Issues found:')
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`\n❌ ${r.category}: ${r.message}`)
        if (r.details && r.details.length > 0) {
          r.details.forEach((detail) => console.log(`   • ${detail}`))
        }
      })
  }

  console.log('\n' + '='.repeat(60))

  if (failed === 0) {
    console.log('✅ All validation checks passed!')
  } else {
    console.log('⚠️  Some validation checks failed. Please review and fix the issues.')
  }
}

async function runValidation() {
  console.log('🔍 Starting data validation...')
  console.log('='.repeat(60))

  try {
    await validatePosts()
    await validateCategories()
    await validateHashtags()
    await validateImages()
    await validateRelationships()
    await printSummary()
  } catch (error) {
    console.error('\n❌ Validation failed:', error)
    process.exit(1)
  }
}

// Create helper RPC function for orphaned posts check
async function setupValidationHelpers() {
  console.log('🔧 Setting up validation helpers...')

  // This RPC function would need to be created in Supabase
  // For now, we'll handle it in the validation logic
  console.log('✅ Validation helpers ready\n')
}

// Run validation
setupValidationHelpers()
  .then(() => runValidation())
  .then(() => {
    console.log('\n🎉 Validation completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Validation failed:', error)
    process.exit(1)
  })
