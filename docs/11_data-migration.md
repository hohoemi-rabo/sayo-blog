# 11: Data Migration Implementation

## Overview

Migrate 80+ existing articles from Excel/CSV backup to Supabase database. Includes category hierarchy setup, image upload to Supabase Storage, and data validation.

## Related Files

- `scripts/migrate-categories.ts` - Category hierarchy migration
- `scripts/migrate-images.ts` - Image upload to Supabase Storage
- `scripts/migrate-posts.ts` - Post data migration
- `scripts/validate-data.ts` - Data validation script
- `backup/posts.csv` - Exported article data
- `backup/images/` - Backup images directory

## Technical Details

### Migration Order

1. **Categories** - Build hierarchy (Prefecture > City > District)
2. **Hashtags** - Create hashtag master list
3. **Images** - Upload to Supabase Storage
4. **Posts** - Import post data with relationships
5. **Validation** - Verify data integrity

### Excel/CSV Structure

```
| タイトル | スラッグ | 本文 | 抜粋 | カテゴリ1 | カテゴリ2 | カテゴリ3 | ハッシュタグ | 画像名 | 公開日 |
```

### Image Storage Structure

```
/thumbnails/
  ├─ 2024/
  │   ├─ 10/
  │   │   ├─ apple-harvest-iida-2024.jpg
  │   │   └─ matsumoto-onsen-2024.jpg
  │   └─ 11/
  └─ 2023/
```

## Todo

### Prerequisites

- [ ] Export existing articles to CSV format
- [ ] Backup all images locally
- [ ] Create Supabase project if not exists
- [ ] Set up environment variables
- [ ] Install dependencies: `npm install @supabase/supabase-js papaparse`

### Category Hierarchy Migration

- [ ] Create `scripts/migrate-categories.ts`
- [ ] Extract unique categories from Excel data
- [ ] Build 3-level hierarchy (Prefecture > City > District)
- [ ] Insert categories with `parent_id` relationships
- [ ] Set appropriate `order_num` values
- [ ] Verify category tree structure
- [ ] Example categories:
  - [ ] 長野県 (parent_id: NULL)
  - [ ] 飯田市 (parent_id: 長野県ID)
  - [ ] 上郷 (parent_id: 飯田市ID)

### Hashtag Master Creation

- [ ] Create `scripts/migrate-hashtags.ts`
- [ ] Extract all unique hashtags from Excel
- [ ] Generate slugs (remove spaces, lowercase)
- [ ] Insert hashtags with count: 0 (will be updated by trigger)
- [ ] Common hashtags to include:
  - [ ] 飯田りんご, 信州そば, 古民家カフェ
  - [ ] 温泉旅行, 秋の信州, りんご狩り

### Image Upload to Supabase Storage

- [ ] Create `scripts/migrate-images.ts`
- [ ] Create Supabase Storage bucket: `thumbnails`
- [ ] Set bucket to public access
- [ ] Upload images with year/month structure
- [ ] Generate public URLs for each image
- [ ] Store URL mapping (filename → public URL)
- [ ] Handle duplicate filenames
- [ ] Add error handling and retry logic
- [ ] Log successful/failed uploads

### Post Data Migration

- [ ] Create `scripts/migrate-posts.ts`
- [ ] Read CSV file using papaparse
- [ ] For each row:
  - [ ] Insert post data
  - [ ] Link to categories (post_categories)
  - [ ] Link to hashtags (post_hashtags)
  - [ ] Use uploaded image URLs
- [ ] Handle errors gracefully
- [ ] Log progress (e.g., "Imported 10/80")
- [ ] Batch insert for performance (optional)
- [ ] Set `is_published: true` for all migrated posts

### Data Validation Script

- [ ] Create `scripts/validate-data.ts`
- [ ] Check post count matches Excel count
- [ ] Verify all images are accessible
- [ ] Check category hierarchy is correct
- [ ] Verify hashtag counts are accurate
- [ ] Check for orphaned posts (no categories)
- [ ] Validate all slugs are unique
- [ ] Check for broken image links
- [ ] Generate validation report

### Error Handling

- [ ] Add try-catch blocks to all migration scripts
- [ ] Log errors to file: `migration-errors.log`
- [ ] Continue on non-critical errors
- [ ] Rollback on critical failures
- [ ] Provide clear error messages
- [ ] Add option to resume from last checkpoint

### Documentation

- [ ] Create `MIGRATION.md` with step-by-step instructions
- [ ] Document required environment variables
- [ ] Add troubleshooting section
- [ ] Include rollback procedures
- [ ] Document data format requirements

## Script Examples

### Category Migration Script

```typescript
// scripts/migrate-categories.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateCategories() {
  console.log('Starting category migration...')

  // 1. Create top-level (prefectures)
  const prefectures = [
    { name: '長野県', slug: 'nagano', order_num: 1 },
    { name: '東京都', slug: 'tokyo', order_num: 2 },
  ]

  for (const prefecture of prefectures) {
    const { data, error } = await supabase
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

    if (error) {
      console.error(`Failed to insert ${prefecture.name}:`, error)
    } else {
      console.log(`✓ Created: ${prefecture.name}`)

      // 2. Create cities under this prefecture
      if (prefecture.slug === 'nagano') {
        const cities = [
          { name: '飯田市', slug: 'iida', order_num: 1 },
          { name: '松本市', slug: 'matsumoto', order_num: 2 },
        ]

        for (const city of cities) {
          const { data: cityData, error: cityError } = await supabase
            .from('categories')
            .insert({
              name: city.name,
              slug: city.slug,
              parent_id: data.id,
              order_num: city.order_num,
              is_active: true,
            })
            .select()
            .single()

          if (cityError) {
            console.error(`Failed to insert ${city.name}:`, cityError)
          } else {
            console.log(`  ✓ Created: ${city.name}`)

            // 3. Create districts under cities (if any)
            if (city.slug === 'iida') {
              await supabase.from('categories').insert({
                name: '上郷',
                slug: 'kamisato',
                parent_id: cityData.id,
                order_num: 1,
                is_active: true,
              })
              console.log(`    ✓ Created: 上郷`)
            }
          }
        }
      }
    }
  }

  console.log('Category migration completed!')
}

migrateCategories()
```

### Image Upload Script

```typescript
// scripts/migrate-images.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function uploadImages() {
  console.log('Starting image upload...')

  const imageDir = './backup/images'
  const files = fs.readdirSync(imageDir)

  const urlMap: Record<string, string> = {}

  for (const file of files) {
    const filePath = path.join(imageDir, file)
    const fileBuffer = fs.readFileSync(filePath)

    // Determine upload path (by year/month)
    const uploadPath = `2024/10/${file}`

    const { data, error } = await supabase.storage
      .from('thumbnails')
      .upload(uploadPath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) {
      console.error(`✗ Failed to upload ${file}:`, error.message)
    } else {
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(uploadPath)

      urlMap[file] = urlData.publicUrl
      console.log(`✓ Uploaded: ${file}`)
    }
  }

  // Save URL mapping for post migration
  fs.writeFileSync(
    './backup/image-urls.json',
    JSON.stringify(urlMap, null, 2)
  )

  console.log('Image upload completed!')
  console.log(`Total: ${Object.keys(urlMap).length} images uploaded`)
}

uploadImages()
```

### Post Migration Script

```typescript
// scripts/migrate-posts.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import Papa from 'papaparse'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migratePosts() {
  console.log('Starting post migration...')

  // Load image URL mapping
  const imageUrls = JSON.parse(
    fs.readFileSync('./backup/image-urls.json', 'utf8')
  )

  // Read CSV file
  const csvFile = fs.readFileSync('./backup/posts.csv', 'utf8')
  const { data: rows } = Papa.parse(csvFile, { header: true })

  let successCount = 0
  let errorCount = 0

  for (const row of rows as any[]) {
    try {
      // 1. Insert post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          title: row['タイトル'],
          slug: row['スラッグ'],
          content: row['本文'],
          excerpt: row['抜粋'],
          thumbnail_url: imageUrls[row['画像名']],
          published_at: row['公開日'],
          is_published: true,
          view_count: 0,
        })
        .select()
        .single()

      if (postError) throw postError

      // 2. Link categories
      const categoryNames = [
        row['カテゴリ1'],
        row['カテゴリ2'],
        row['カテゴリ3'],
      ].filter(Boolean)

      for (const categoryName of categoryNames) {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('name', categoryName)
          .single()

        if (category) {
          await supabase.from('post_categories').insert({
            post_id: post.id,
            category_id: category.id,
          })
        }
      }

      // 3. Link hashtags
      const hashtagNames = row['ハッシュタグ']
        .split(',')
        .map((t: string) => t.trim())

      for (const hashtagName of hashtagNames) {
        const { data: hashtag } = await supabase
          .from('hashtags')
          .upsert(
            {
              name: hashtagName,
              slug: hashtagName.toLowerCase().replace(/\s+/g, '-'),
            },
            { onConflict: 'name' }
          )
          .select()
          .single()

        if (hashtag) {
          await supabase.from('post_hashtags').insert({
            post_id: post.id,
            hashtag_id: hashtag.id,
          })
        }
      }

      successCount++
      console.log(`✓ Imported (${successCount}/${rows.length}): ${row['タイトル']}`)
    } catch (error) {
      errorCount++
      console.error(`✗ Failed: ${row['タイトル']}`, error)
    }
  }

  console.log(`\nMigration completed!`)
  console.log(`Success: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
}

migratePosts()
```

## References

- REQUIREMENTS.md - Section 9 (Data Migration Plan)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Papa Parse](https://www.papaparse.com/)

## Validation Checklist

- [ ] All 80+ posts imported successfully
- [ ] All images display correctly
- [ ] Category hierarchy is correct (3 levels)
- [ ] Hashtag counts are accurate
- [ ] No orphaned posts (all have categories)
- [ ] All slugs are unique
- [ ] Published dates are correct
- [ ] URLs follow pattern: `/[prefecture]/[slug]/`
- [ ] Full-text search works on migrated content
- [ ] Filters work correctly with migrated data
