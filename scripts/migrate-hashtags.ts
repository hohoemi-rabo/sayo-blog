#!/usr/bin/env tsx
/**
 * Hashtag Migration Script
 *
 * Creates initial hashtag master list in Supabase database.
 * Hashtag counts will be automatically updated by triggers when posts are linked.
 *
 * Usage: npm run migrate:hashtags
 */

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

/**
 * Generate slug from hashtag name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, '')
}

/**
 * Common hashtags for migration
 * Add your actual hashtags here or extract from CSV
 */
const commonHashtags = [
  // 食べ物・グルメ
  '飯田りんご',
  '信州そば',
  'りんご狩り',
  '長野グルメ',
  '信州牛',
  '野沢菜',
  'おやき',

  // 場所・観光
  '古民家カフェ',
  '温泉旅行',
  '秋の信州',
  '白馬',
  '上高地',
  '軽井沢',
  '松本城',

  // 体験・アクティビティ
  'トレッキング',
  'スキー',
  'スノーボード',
  'サイクリング',
  '星空観察',

  // 文化・伝統
  '伝統工芸',
  '手仕事',
  '木工',
  '陶芸',
  '染物',

  // シーズン・イベント
  '紅葉',
  '桜',
  '新緑',
  '雪景色',
  '祭り',

  // その他
  '信州の風景',
  'ローカル',
  '地域おこし',
  '移住',
  '田舎暮らし',
]

async function migrateHashtags() {
  console.log('🚀 Starting hashtag migration...\n')

  let successCount = 0
  let errorCount = 0

  try {
    for (const hashtagName of commonHashtags) {
      const slug = generateSlug(hashtagName)

      console.log(`🏷️  Creating hashtag: ${hashtagName} (${slug})`)

      const { error } = await supabase.from('hashtags').insert({
        name: hashtagName,
        slug: slug,
        count: 0, // Will be updated by trigger when posts are linked
      })

      if (error) {
        // Ignore duplicate errors (unique constraint)
        if (error.code === '23505') {
          console.log(`   ⚠️  Already exists: ${hashtagName}`)
        } else {
          console.error(`   ❌ Failed to create ${hashtagName}:`, error.message)
          errorCount++
        }
      } else {
        console.log(`   ✅ Created: ${hashtagName}`)
        successCount++
      }
    }

    console.log('\n✅ Hashtag migration completed!')
    console.log(`📊 Results:`)
    console.log(`   • Created: ${successCount}`)
    console.log(`   • Errors: ${errorCount}`)
    console.log(`   • Total: ${commonHashtags.length}`)

    // Verify hashtags
    console.log('\n🔍 Verifying hashtags...')
    const { data: allHashtags, error: verifyError } = await supabase
      .from('hashtags')
      .select('id, name, slug, count')
      .order('name', { ascending: true })

    if (verifyError) {
      console.error('❌ Failed to verify hashtags:', verifyError.message)
    } else {
      console.log(`✅ Found ${allHashtags?.length || 0} hashtags in database`)
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateHashtags()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
