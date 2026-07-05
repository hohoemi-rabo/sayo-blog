#!/usr/bin/env tsx
/**
 * Backfill AI summaries (summary_short / summary_medium / summary_long)
 * for existing posts.
 *
 * 冪等: すでに3つとも要約が入っている記事はスキップする (何度流しても安全、
 * 途中で止まっても再開できる)。Gemini のレート制限を避けるため各記事の間に
 * 待機を入れる。1記事が失敗しても全体は止めず次へ進む。
 *
 * Usage:
 *   npm run backfill:summaries                 # 全記事 (既存はスキップ)
 *   npm run backfill:summaries -- --limit 3    # 先頭3件だけ (お試し)
 *   npm run backfill:summaries -- --force      # 既存の要約も上書き再生成
 *
 * env 巻き上げ回避: gemini.ts は module ロード時に GEMINI_API_KEY を読むため、
 * dotenv でロードした後に summary-generator を動的 import する。
 */

import { config } from 'dotenv'

// Load environment variables from .env.local (must run before the dynamic import)
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const geminiApiKey = process.env.GEMINI_API_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!geminiApiKey) {
  console.error('❌ Missing GEMINI_API_KEY (.env.local)')
  process.exit(1)
}

// --- args ---
const args = process.argv.slice(2)
const force = args.includes('--force')
const limitIdx = args.indexOf('--limit')
const limit =
  limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null

// 記事間の待機 (ms)。レート制限に優しく。
const DELAY_MS = 1500

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function hasAllSummaries(p: {
  summary_short: string | null
  summary_medium: string | null
  summary_long: string | null
}): boolean {
  return (
    !!p.summary_short?.trim() &&
    !!p.summary_medium?.trim() &&
    !!p.summary_long?.trim()
  )
}

async function main() {
  // dotenv ロード後に import (gemini.ts の module 評価をこのタイミングまで遅らせる)
  const { generateSummaries } = await import('../src/lib/summary-generator')

  console.log('📝 Backfilling AI summaries...')
  if (force) console.log('   (--force: 既存の要約も上書きします)')
  if (limit) console.log(`   (--limit ${limit}: 先頭 ${limit} 件のみ)`)

  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      'id, title, content, summary_short, summary_medium, summary_long'
    )
    .order('published_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('❌ Failed to load posts:', error.message)
    process.exit(1)
  }
  if (!posts || posts.length === 0) {
    console.log('No posts found. Nothing to do.')
    return
  }

  const targets = limit ? posts.slice(0, limit) : posts

  let generated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < targets.length; i++) {
    const post = targets[i]
    const tag = `[${i + 1}/${targets.length}] ${post.title}`

    if (!force && hasAllSummaries(post)) {
      console.log(`  ⏭  ${tag} — 既に要約あり (skip)`)
      skipped++
      continue
    }

    // 本文が実質空ならスキップ (generateSummaries は空だと throw する)
    const plain = (post.content ?? '').replace(/<[^>]*>/g, '').trim()
    if (!plain) {
      console.log(`  ⏭  ${tag} — 本文が空 (skip)`)
      skipped++
      continue
    }

    const t0 = Date.now()
    try {
      const s = await generateSummaries(post.content)
      if (!s.short && !s.medium && !s.long) {
        console.error(`  ✗ ${tag} — 生成結果が空 (fail)`)
        failed++
      } else {
        const { error: upErr } = await supabase
          .from('posts')
          .update({
            summary_short: s.short || null,
            summary_medium: s.medium || null,
            summary_long: s.long || null,
          })
          .eq('id', post.id)
        if (upErr) {
          console.error(`  ✗ ${tag} — 保存失敗: ${upErr.message}`)
          failed++
        } else {
          console.log(
            `  ✓ ${tag} — ${s.short.length}/${s.medium.length}/${s.long.length}字 (${Date.now() - t0}ms)`
          )
          generated++
        }
      }
    } catch (e) {
      console.error(
        `  ✗ ${tag} — 生成エラー: ${e instanceof Error ? e.message : e}`
      )
      failed++
    }

    // 最後の1件の後は待たない
    if (i < targets.length - 1) await sleep(DELAY_MS)
  }

  console.log('\n─────────────────────────────')
  console.log(`Posts processed : ${targets.length}`)
  console.log(`Generated       : ${generated}`)
  console.log(`Skipped         : ${skipped}`)
  if (failed > 0) console.log(`Failed          : ${failed}`)
  console.log('✅ Backfill complete.')
  if (failed > 0) {
    console.log('   失敗した記事はもう一度このコマンドを流せば再試行されます (冪等)。')
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
