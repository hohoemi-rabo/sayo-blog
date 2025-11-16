#!/usr/bin/env tsx
/**
 * Category Migration Script
 *
 * Migrates category hierarchy to Supabase database.
 * Creates 3-level structure: Prefecture > City > District
 *
 * Usage: npm run migrate:categories
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

interface Prefecture {
  name: string
  slug: string
  order_num: number
  cities?: City[]
}

interface City {
  name: string
  slug: string
  order_num: number
  districts?: District[]
}

interface District {
  name: string
  slug: string
  order_num: number
}

/**
 * Category hierarchy definition
 * Customize this based on your actual data
 */
const categoryHierarchy: Prefecture[] = [
  {
    name: '長野県',
    slug: 'nagano',
    order_num: 1,
    cities: [
      {
        name: '飯田市',
        slug: 'iida',
        order_num: 1,
        districts: [
          { name: '上郷', slug: 'kamisato', order_num: 1 },
          { name: '座光寺', slug: 'zakoji', order_num: 2 },
          { name: '鼎', slug: 'kanae', order_num: 3 },
        ],
      },
      {
        name: '松本市',
        slug: 'matsumoto',
        order_num: 2,
        districts: [
          { name: '浅間温泉', slug: 'asama-onsen', order_num: 1 },
          { name: '上高地', slug: 'kamikochi', order_num: 2 },
        ],
      },
      {
        name: '軽井沢町',
        slug: 'karuizawa',
        order_num: 3,
      },
      {
        name: '白馬村',
        slug: 'hakuba',
        order_num: 4,
      },
    ],
  },
  {
    name: '東京都',
    slug: 'tokyo',
    order_num: 2,
    cities: [
      { name: '渋谷区', slug: 'shibuya', order_num: 1 },
      { name: '新宿区', slug: 'shinjuku', order_num: 2 },
    ],
  },
]

async function migrateCategories() {
  console.log('🚀 Starting category migration...\n')

  let totalCreated = 0

  try {
    for (const prefecture of categoryHierarchy) {
      // 1. Insert prefecture (top-level category)
      console.log(`📍 Creating prefecture: ${prefecture.name}`)
      const { data: prefectureData, error: prefectureError } = await supabase
        .from('categories')
        .insert({
          name: prefecture.name,
          slug: prefecture.slug,
          parent_id: null,
          order_num: prefecture.order_num,
          is_active: true,
        })
        .select()
        .single()

      if (prefectureError) {
        console.error(`   ❌ Failed to create ${prefecture.name}:`, prefectureError.message)
        continue
      }

      console.log(`   ✅ Created: ${prefecture.name} (ID: ${prefectureData.id})`)
      totalCreated++

      // 2. Insert cities under this prefecture
      if (prefecture.cities) {
        for (const city of prefecture.cities) {
          console.log(`   📍 Creating city: ${city.name}`)
          const { data: cityData, error: cityError } = await supabase
            .from('categories')
            .insert({
              name: city.name,
              slug: city.slug,
              parent_id: prefectureData.id,
              order_num: city.order_num,
              is_active: true,
            })
            .select()
            .single()

          if (cityError) {
            console.error(`      ❌ Failed to create ${city.name}:`, cityError.message)
            continue
          }

          console.log(`      ✅ Created: ${city.name} (ID: ${cityData.id})`)
          totalCreated++

          // 3. Insert districts under this city
          if (city.districts) {
            for (const district of city.districts) {
              console.log(`      📍 Creating district: ${district.name}`)
              const { error: districtError } = await supabase.from('categories').insert({
                name: district.name,
                slug: district.slug,
                parent_id: cityData.id,
                order_num: district.order_num,
                is_active: true,
              })

              if (districtError) {
                console.error(`         ❌ Failed to create ${district.name}:`, districtError.message)
                continue
              }

              console.log(`         ✅ Created: ${district.name}`)
              totalCreated++
            }
          }
        }
      }

      console.log('') // Empty line for readability
    }

    console.log('\n✅ Category migration completed!')
    console.log(`📊 Total categories created: ${totalCreated}`)

    // Verify hierarchy
    console.log('\n🔍 Verifying category hierarchy...')
    const { data: allCategories, error: verifyError } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id, order_num')
      .order('order_num', { ascending: true })

    if (verifyError) {
      console.error('❌ Failed to verify categories:', verifyError.message)
    } else {
      console.log(`✅ Found ${allCategories?.length || 0} categories in database`)
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateCategories()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
