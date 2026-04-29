'use server'

import { revalidatePath } from 'next/cache'
import { assertAdminAuth } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'
import {
  type ActionResult,
  friendlyDbError,
  withRetry,
} from '@/lib/ig-action-utils'
import {
  matchImageFiles,
  parseIgCsv,
  validateUsernameMatch,
  type IgImportRow,
} from '@/lib/ig-csv-parser'
import {
  uploadImagesForImport,
  validateUploadFiles,
} from '@/lib/ig-import-storage'
import type { IgSource } from '@/lib/types'

const ADMIN_PATH = '/admin/instagram/imports'
const SOURCES_PATH = '/admin/instagram/sources'

export interface UploadResult {
  total: number
  inserted: number
  skipped: number
  failedImages: number
  warnings: string[]
}

export async function uploadIgImports(
  formData: FormData
): Promise<ActionResult<UploadResult>> {
  try {
    await assertAdminAuth()
  } catch {
    return { success: false, error: '認証が必要です', code: 'auth' }
  }

  const sourceId = String(formData.get('source_id') ?? '').trim()
  const csvText = String(formData.get('csv') ?? '')
  const rawFiles = formData.getAll('images')
  const files = rawFiles.filter((f): f is File => f instanceof File)

  if (!sourceId) {
    return { success: false, error: 'source_id が指定されていません', code: 'validation' }
  }
  if (!csvText.trim()) {
    return { success: false, error: 'CSV が空です', code: 'validation' }
  }
  if (files.length === 0) {
    return {
      success: false,
      error: '画像ファイルが選択されていません',
      code: 'validation',
    }
  }

  const supabase = createAdminClient()

  const { data: sourceRow, error: sourceError } = await supabase
    .from('ig_sources')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle()
  if (sourceError) {
    return { success: false, error: friendlyDbError(sourceError) }
  }
  if (!sourceRow) {
    return { success: false, error: '対象ソースが見つかりません', code: 'not_found' }
  }
  const source = sourceRow as IgSource
  if (source.permission_status !== 'approved' || !source.is_active) {
    return {
      success: false,
      error: '取り込み対象は許可済み + 取得有効のアカウントに限ります',
      code: 'validation',
    }
  }

  const parseResult = parseIgCsv(csvText)
  if (parseResult.errors.length > 0) {
    return {
      success: false,
      error: parseResult.errors.join(' / '),
      code: 'validation',
    }
  }
  const rows = parseResult.rows
  if (rows.length === 0) {
    return { success: false, error: '取り込める行がありません', code: 'validation' }
  }

  const usernameError = validateUsernameMatch(rows, source.ig_username)
  if (usernameError) {
    return { success: false, error: usernameError, code: 'validation' }
  }

  const fileValidation = validateUploadFiles(files)
  const warnings: string[] = []
  const fileRejections = fileValidation.rejected
  for (const r of fileRejections) {
    warnings.push(`${r.name}: ${r.error}`)
  }

  const validNames = fileValidation.valid.map((v) => v.name)
  const matchResult = matchImageFiles(rows, validNames)
  if (matchResult.missing.length > 0) {
    return {
      success: false,
      error: `必要な画像が不足しています: ${matchResult.missing.slice(0, 5).join(', ')}${matchResult.missing.length > 5 ? ' ほか' : ''}`,
      code: 'validation',
    }
  }
  if (matchResult.extra.length > 0) {
    warnings.push(
      `余分な画像 (取り込み対象外): ${matchResult.extra.slice(0, 5).join(', ')}${matchResult.extra.length > 5 ? ' ほか' : ''}`
    )
  }

  const usedNames = new Set<string>()
  for (const r of rows) for (const f of r.image_files) usedNames.add(f)
  const filesToUpload = fileValidation.valid.filter((v) => usedNames.has(v.name))

  const ids = rows.map((r) => r.post_id)
  const { data: existingRows, error: existingError } = await supabase
    .from('ig_imported_posts')
    .select('ig_post_id')
    .eq('source_id', source.id)
    .in('ig_post_id', ids)
  if (existingError) {
    return { success: false, error: friendlyDbError(existingError) }
  }
  const existingSet = new Set(
    (existingRows ?? []).map((r: { ig_post_id: string }) => r.ig_post_id)
  )
  const newRows = rows.filter((r) => !existingSet.has(r.post_id))
  const skipped = rows.length - newRows.length

  if (newRows.length === 0) {
    await touchSourceLastFetched(source.id)
    revalidatePath(ADMIN_PATH)
    revalidatePath(SOURCES_PATH)
    return {
      success: true,
      data: {
        total: rows.length,
        inserted: 0,
        skipped,
        failedImages: fileRejections.length,
        warnings,
      },
    }
  }

  const uploadResult = await uploadImagesForImport(
    source.ig_username,
    filesToUpload
  )
  for (const f of uploadResult.failed) {
    warnings.push(`画像アップロード失敗 ${f.name}: ${f.error}`)
  }
  const failedImages = fileRejections.length + uploadResult.failed.length
  const failedNameSet = new Set(uploadResult.failed.map((f) => f.name))
  const urlByName = new Map<string, string>()
  for (const u of uploadResult.uploaded) urlByName.set(u.name, u.publicUrl)

  const insertableRows: Array<ReturnType<typeof toInsertRow>> = []
  for (const row of newRows) {
    const skipDueToFailed = row.image_files.some((n) => failedNameSet.has(n))
    if (skipDueToFailed) {
      warnings.push(
        `${row.post_id} は画像のいずれかがアップロード失敗したためスキップしました`
      )
      continue
    }
    const storedUrls = row.image_files
      .map((n) => urlByName.get(n))
      .filter((u): u is string => Boolean(u))
    insertableRows.push(toInsertRow(source.id, row, storedUrls))
  }

  let inserted = 0
  if (insertableRows.length > 0) {
    const insertResult = await withRetry(
      async () =>
        await supabase.from('ig_imported_posts').insert(insertableRows).select('id'),
      'uploadIgImports.insert'
    )
    if (insertResult.error) {
      return { success: false, error: friendlyDbError(insertResult.error) }
    }
    inserted = (insertResult.data as Array<{ id: string }> | null)?.length ?? 0
  }

  await touchSourceLastFetched(source.id)
  revalidatePath(ADMIN_PATH)
  revalidatePath(SOURCES_PATH)

  return {
    success: true,
    data: {
      total: rows.length,
      inserted,
      skipped,
      failedImages,
      warnings,
    },
  }
}

function toInsertRow(
  sourceId: string,
  row: IgImportRow,
  storedUrls: string[]
) {
  return {
    source_id: sourceId,
    ig_post_id: row.post_id,
    caption: row.caption,
    image_urls: null,
    stored_image_urls: storedUrls,
    ig_posted_at: new Date(row.posted_at).toISOString(),
    likes_count: row.like_count,
    comment_count: row.comment_count,
    ig_post_url: row.permalink,
    status: 'pending' as const,
    selected_image_indexes: null,
  }
}

async function touchSourceLastFetched(sourceId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('ig_sources')
    .update({ last_fetched_at: new Date().toISOString() })
    .eq('id', sourceId)
  if (error) {
    console.error('[touchSourceLastFetched] error:', error)
  }
}
