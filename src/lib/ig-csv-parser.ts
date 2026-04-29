/**
 * Cowork CSV パーサ + バリデーション。ブラウザ・サーバー両対応。
 *
 * 入力 CSV の列仕様:
 *   post_id, posted_at, username, caption, image_files,
 *   permalink (任意), like_count (任意), comment_count (任意)
 */

import Papa from 'papaparse'

export interface IgImportRow {
  post_id: string
  posted_at: string
  username: string
  caption: string
  image_files: string[]
  permalink: string | null
  like_count: number | null
  comment_count: number | null
}

export interface CsvParseResult {
  rows: IgImportRow[]
  errors: string[]
}

export interface ImageMatchResult {
  matchedFiles: string[]
  missing: string[]
  extra: string[]
}

const REQUIRED_COLUMNS = [
  'post_id',
  'posted_at',
  'username',
  'caption',
  'image_files',
] as const

interface RawCsvRow {
  post_id?: string
  posted_at?: string
  username?: string
  caption?: string
  image_files?: string
  permalink?: string
  like_count?: string
  comment_count?: string
}

export function parseIgCsv(csvText: string): CsvParseResult {
  const errors: string[] = []
  const trimmed = csvText.replace(/^﻿/, '').trim()
  if (!trimmed) {
    return { rows: [], errors: ['CSV が空です'] }
  }

  const parsed = Papa.parse<RawCsvRow>(trimmed, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    for (const e of parsed.errors) {
      errors.push(
        `[${e.row !== undefined ? `${e.row + 2} 行目` : 'CSV'}] ${e.message}`
      )
    }
  }

  const headers = (parsed.meta.fields ?? []).map((h) => h.trim())
  const missingCols = REQUIRED_COLUMNS.filter((c) => !headers.includes(c))
  if (missingCols.length > 0) {
    errors.push(`必須列が不足しています: ${missingCols.join(', ')}`)
    return { rows: [], errors }
  }

  const rows: IgImportRow[] = []
  parsed.data.forEach((raw, idx) => {
    const lineNo = idx + 2 // 1: header, 2+: data rows
    const post_id = (raw.post_id ?? '').trim()
    const posted_at = (raw.posted_at ?? '').trim()
    const username = (raw.username ?? '').trim().replace(/^@+/, '')
    const caption = raw.caption ?? ''
    const imageFilesRaw = (raw.image_files ?? '').trim()

    if (!post_id) {
      errors.push(`[${lineNo} 行目] post_id が空です`)
      return
    }
    if (!posted_at) {
      errors.push(`[${lineNo} 行目] posted_at が空です`)
      return
    }
    if (Number.isNaN(Date.parse(posted_at))) {
      errors.push(`[${lineNo} 行目] posted_at が日時として解釈できません: ${posted_at}`)
      return
    }
    if (!username) {
      errors.push(`[${lineNo} 行目] username が空です`)
      return
    }
    if (!caption.trim()) {
      errors.push(`[${lineNo} 行目] caption が空です`)
      return
    }
    if (!imageFilesRaw) {
      errors.push(`[${lineNo} 行目] image_files が空です`)
      return
    }

    const image_files = imageFilesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (image_files.length === 0) {
      errors.push(`[${lineNo} 行目] image_files に有効なファイル名がありません`)
      return
    }

    rows.push({
      post_id,
      posted_at,
      username,
      caption,
      image_files,
      permalink: nullableString(raw.permalink),
      like_count: nullableInt(raw.like_count),
      comment_count: nullableInt(raw.comment_count),
    })
  })

  return { rows, errors }
}

export function matchImageFiles(
  rows: IgImportRow[],
  uploadedNames: string[]
): ImageMatchResult {
  const required = new Set<string>()
  for (const r of rows) for (const f of r.image_files) required.add(f)
  const uploaded = new Set(uploadedNames)

  const missing = [...required].filter((n) => !uploaded.has(n)).sort()
  const extra = [...uploaded].filter((n) => !required.has(n)).sort()
  const matchedFiles = [...required].filter((n) => uploaded.has(n)).sort()

  return { matchedFiles, missing, extra }
}

export function validateUsernameMatch(
  rows: IgImportRow[],
  expected: string
): string | null {
  const expectedNorm = expected.replace(/^@+/, '')
  const seen = new Set<string>()
  for (const r of rows) seen.add(r.username)
  const mismatched = [...seen].filter((u) => u !== expectedNorm)
  if (mismatched.length === 0) return null
  return `選択したアカウント "@${expectedNorm}" と CSV の username が一致しません: ${mismatched
    .map((u) => `@${u}`)
    .join(', ')}`
}

function nullableString(raw: string | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

function nullableInt(raw: string | undefined): number | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : null
}
