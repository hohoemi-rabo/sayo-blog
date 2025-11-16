#!/usr/bin/env tsx
/**
 * Post Migration Script
 *
 * Migrates post data from CSV to Supabase database.
 * Links posts to categories and hashtags, uses uploaded image URLs.
 *
 * Usage: npm run migrate:posts
 *
 * CSV Format Expected:
 * タイトル,スラッグ,本文,抜粋,カテゴリ1,カテゴリ2,カテゴリ3,ハッシュタグ,画像名,公開日
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import Papa from 'papaparse'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuration
const CSV_FILE = './backup/posts.csv'
const URL_MAP_FILE = './backup/image-urls.json'

interface PostRow {
  タイトル: string
  スラッグ: string
  本文: string
  抜粋: string
  カテゴリ1?: string
  カテゴリ2?: string
  カテゴリ3?: string
  ハッシュタグ: string
  画像名: string
  公開日: string
}

/**
 * Generate slug from hashtag name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, '')
}

async function migratePosts() {
  console.log('🚀 Starting post migration...\n')

  // Check if CSV file exists
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`)
    console.log(`📝 Please create the CSV file with your post data:`)
    console.log(`   Format: タイトル,スラッグ,本文,抜粋,カテゴリ1,カテゴリ2,カテゴリ3,ハッシュタグ,画像名,公開日`)
    console.log(`\n💡 For now, you can create a sample CSV with a few test posts`)
    process.exit(1)
  }

  // Load image URL mapping
  let imageUrls: Record<string, string> = {}
  if (fs.existsSync(URL_MAP_FILE)) {
    console.log(`📂 Loading image URL mapping from ${URL_MAP_FILE}...`)
    imageUrls = JSON.parse(fs.readFileSync(URL_MAP_FILE, 'utf8'))
    console.log(`✅ Loaded ${Object.keys(imageUrls).length} image URLs\n`)
  } else {
    console.log(`⚠️  Image URL mapping not found: ${URL_MAP_FILE}`)
    console.log(`   Posts will be created without thumbnail URLs`)
    console.log(`   Run 'npm run migrate:images' first to upload images\n`)
  }

  try {
    // Read CSV file
    console.log(`📂 Reading CSV file: ${CSV_FILE}...`)
    const csvContent = fs.readFileSync(CSV_FILE, 'utf8')
    const { data: rows, errors } = Papa.parse<PostRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    })

    if (errors.length > 0) {
      console.error('❌ CSV parsing errors:', errors)
      process.exit(1)
    }

    console.log(`✅ Found ${rows.length} posts in CSV\n`)

    // Pre-fetch all categories and hashtags for performance
    console.log('🔍 Pre-fetching categories and hashtags...')
    const { data: allCategories } = await supabase.from('categories').select('id, name, slug')

    const { data: allHashtags } = await supabase.from('hashtags').select('id, name, slug')

    const categoryMap = new Map(allCategories?.map((cat) => [cat.name, cat]) || [])
    const hashtagMap = new Map(allHashtags?.map((tag) => [tag.name, tag]) || [])

    console.log(`✅ Loaded ${categoryMap.size} categories, ${hashtagMap.size} hashtags\n`)

    let successCount = 0
    let errorCount = 0
    const errorLog: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      console.log(`[${rowNum}/${rows.length}] 📝 Importing: ${row.タイトル}`)

      try {
        // 1. Insert post
        const thumbnailUrl = row.画像名 ? imageUrls[row.画像名] || null : null

        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            title: row.タイトル,
            slug: row.スラッグ,
            content: row.本文 || '',
            excerpt: row.抜粋 || '',
            thumbnail_url: thumbnailUrl,
            published_at: row.公開日 || new Date().toISOString(),
            is_published: true,
            view_count: 0,
          })
          .select()
          .single()

        if (postError) {
          throw new Error(`Post insertion failed: ${postError.message}`)
        }

        console.log(`   ✅ Post created (ID: ${post.id})`)

        // 2. Link categories
        const categoryNames = [row.カテゴリ1, row.カテゴリ2, row.カテゴリ3].filter(Boolean)

        if (categoryNames.length > 0) {
          for (const categoryName of categoryNames) {
            const category = categoryMap.get(categoryName!)

            if (category) {
              const { error: catError } = await supabase.from('post_categories').insert({
                post_id: post.id,
                category_id: category.id,
              })

              if (catError) {
                console.log(`   ⚠️  Failed to link category "${categoryName}": ${catError.message}`)
              } else {
                console.log(`   🏷️  Linked category: ${categoryName}`)
              }
            } else {
              console.log(`   ⚠️  Category not found: ${categoryName}`)
            }
          }
        }

        // 3. Link hashtags
        if (row.ハッシュタグ && row.ハッシュタグ.trim()) {
          const hashtagNames = row.ハッシュタグ.split(',').map((t) => t.trim())

          for (const hashtagName of hashtagNames) {
            if (!hashtagName) continue

            let hashtag = hashtagMap.get(hashtagName)

            // Create hashtag if it doesn't exist
            if (!hashtag) {
              const slug = generateSlug(hashtagName)
              const { data: newHashtag, error: hashtagError } = await supabase
                .from('hashtags')
                .upsert(
                  {
                    name: hashtagName,
                    slug: slug,
                    count: 0,
                  },
                  { onConflict: 'slug' }
                )
                .select()
                .single()

              if (hashtagError || !newHashtag) {
                console.log(`   ⚠️  Failed to create hashtag "${hashtagName}": ${hashtagError?.message || 'Unknown error'}`)
                continue
              }

              hashtag = newHashtag as { id: string; name: string; slug: string }
              hashtagMap.set(hashtagName, hashtag)
              console.log(`   🆕 Created new hashtag: ${hashtagName}`)
            }

            // Link post to hashtag
            if (!hashtag) {
              console.log(`   ⚠️  Hashtag not found: ${hashtagName}`)
              continue
            }

            const { error: tagError } = await supabase.from('post_hashtags').insert({
              post_id: post.id,
              hashtag_id: hashtag.id,
            })

            if (tagError) {
              console.log(`   ⚠️  Failed to link hashtag "${hashtagName}": ${tagError.message}`)
            } else {
              console.log(`   #️⃣  Linked hashtag: ${hashtagName}`)
            }
          }
        }

        successCount++
        console.log(`   ✅ Import complete\n`)
      } catch (error) {
        errorCount++
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`   ❌ Failed: ${errorMessage}\n`)
        errorLog.push(`Row ${rowNum} (${row.タイトル}): ${errorMessage}`)
      }
    }

    console.log('✅ Post migration completed!')
    console.log(`📊 Results:`)
    console.log(`   • Success: ${successCount}`)
    console.log(`   • Errors: ${errorCount}`)
    console.log(`   • Total: ${rows.length}`)

    if (errorLog.length > 0) {
      console.log(`\n📝 Error Log:`)
      errorLog.forEach((error) => console.log(`   ${error}`))

      // Save error log to file
      const errorLogFile = './migration-errors.log'
      fs.writeFileSync(errorLogFile, errorLog.join('\n'), 'utf8')
      console.log(`\n💾 Errors saved to: ${errorLogFile}`)
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migratePosts()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
