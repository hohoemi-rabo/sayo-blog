#!/usr/bin/env tsx
/**
 * Image Migration Script
 *
 * Uploads images from local backup directory to Supabase Storage.
 * Creates year/month folder structure and generates public URLs.
 *
 * Usage: npm run migrate:images
 */

import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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
const IMAGE_DIR = './backup/images'
const BUCKET_NAME = 'thumbnails'
const URL_MAP_FILE = './backup/image-urls.json'

/**
 * Get file extension
 */
function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase()
}

/**
 * Get content type from file extension
 */
function getContentType(filename: string): string {
  const ext = getFileExtension(filename)
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  return contentTypes[ext] || 'application/octet-stream'
}

/**
 * Extract date from filename or use current date
 * Expected format: *-YYYY-MM-DD.* or *-YYYYMMDD.*
 */
function extractDateFromFilename(filename: string): { year: string; month: string } {
  // Try format: *-YYYY-MM-DD.*
  const match1 = filename.match(/(\d{4})-(\d{2})-\d{2}/)
  if (match1) {
    return { year: match1[1], month: match1[2] }
  }

  // Try format: *-YYYYMMDD.*
  const match2 = filename.match(/(\d{4})(\d{2})\d{2}/)
  if (match2) {
    return { year: match2[1], month: match2[2] }
  }

  // Default to current date
  const now = new Date()
  return {
    year: now.getFullYear().toString(),
    month: (now.getMonth() + 1).toString().padStart(2, '0'),
  }
}

/**
 * Create storage bucket if it doesn't exist
 */
async function ensureBucketExists() {
  console.log(`🪣 Checking if bucket "${BUCKET_NAME}" exists...`)

  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message)
    throw listError
  }

  const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME)

  if (!bucketExists) {
    console.log(`📦 Creating bucket "${BUCKET_NAME}"...`)
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    })

    if (createError) {
      console.error('❌ Failed to create bucket:', createError.message)
      throw createError
    }

    console.log(`✅ Bucket "${BUCKET_NAME}" created successfully`)
  } else {
    console.log(`✅ Bucket "${BUCKET_NAME}" already exists`)
  }
}

async function migrateImages() {
  console.log('🚀 Starting image migration...\n')

  // Check if image directory exists
  if (!fs.existsSync(IMAGE_DIR)) {
    console.error(`❌ Image directory not found: ${IMAGE_DIR}`)
    console.log(`📝 Please create the directory and place your images there:`)
    console.log(`   mkdir -p ${IMAGE_DIR}`)
    console.log(`   # Then copy your images to ${IMAGE_DIR}/`)
    process.exit(1)
  }

  try {
    // Ensure bucket exists
    await ensureBucketExists()

    // Read all files from image directory
    const files = fs.readdirSync(IMAGE_DIR).filter((file) => {
      const ext = getFileExtension(file)
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
    })

    if (files.length === 0) {
      console.log(`⚠️  No image files found in ${IMAGE_DIR}`)
      console.log(`   Supported formats: .jpg, .jpeg, .png, .webp, .gif`)
      return
    }

    console.log(`📊 Found ${files.length} image files\n`)

    const urlMap: Record<string, string> = {}
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const filePath = path.join(IMAGE_DIR, file)

      console.log(`[${i + 1}/${files.length}] 📤 Uploading: ${file}`)

      try {
        // Read file
        const fileBuffer = fs.readFileSync(filePath)

        // Extract date for folder structure
        const { year, month } = extractDateFromFilename(file)
        const uploadPath = `${year}/${month}/${file}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(uploadPath, fileBuffer, {
          contentType: getContentType(file),
          upsert: false, // Don't overwrite existing files
        })

        if (uploadError) {
          // Check if file already exists
          if (uploadError.message.includes('already exists')) {
            console.log(`   ⚠️  Already exists: ${uploadPath}`)
            // Still get the public URL
            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadPath)
            urlMap[file] = urlData.publicUrl
          } else {
            console.error(`   ❌ Failed: ${uploadError.message}`)
            errorCount++
            continue
          }
        } else {
          console.log(`   ✅ Uploaded to: ${uploadPath}`)
          successCount++
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadPath)
        urlMap[file] = urlData.publicUrl
        console.log(`   🔗 URL: ${urlData.publicUrl}`)
      } catch (error) {
        console.error(`   ❌ Error processing ${file}:`, error)
        errorCount++
      }

      console.log('') // Empty line for readability
    }

    // Save URL mapping to JSON file
    console.log(`💾 Saving URL mapping to ${URL_MAP_FILE}...`)
    fs.writeFileSync(URL_MAP_FILE, JSON.stringify(urlMap, null, 2), 'utf8')
    console.log(`✅ URL mapping saved (${Object.keys(urlMap).length} entries)`)

    console.log('\n✅ Image migration completed!')
    console.log(`📊 Results:`)
    console.log(`   • Uploaded: ${successCount}`)
    console.log(`   • Errors: ${errorCount}`)
    console.log(`   • Total URLs: ${Object.keys(urlMap).length}`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateImages()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
