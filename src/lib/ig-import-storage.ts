/**
 * Cowork CSV 取り込みフローでの画像 Storage アップロード。
 *
 * - バケット: `ig-imported`
 * - パス規則: `{ig_username}/{filename}` ({filename} は CSV の `image_files` 値そのまま)
 * - SERVICE_ROLE で動作（管理画面の Server Action から呼ぶ前提）
 */

import { createAdminClient } from '@/lib/supabase'

export interface UploadedImage {
  name: string // CSV の image_files 値 (= ファイル名そのもの)
  path: string // ig_username/filename
  publicUrl: string
}

export interface UploadFailure {
  name: string
  error: string
}

export interface UploadImagesResult {
  uploaded: UploadedImage[]
  failed: UploadFailure[]
}

const BUCKET = 'ig-imported'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp']
const RETRY_MAX = 3

export interface ValidImage {
  name: string
  file: File
}

export interface FileValidationResult {
  valid: ValidImage[]
  rejected: UploadFailure[]
}

/**
 * クライアントから渡された File[] を受け取り、サイズ / MIME / 拡張子を
 * チェックして弾く。複数のセクションから再利用するため Storage と分離。
 */
export function validateUploadFiles(files: File[]): FileValidationResult {
  const valid: ValidImage[] = []
  const rejected: UploadFailure[] = []

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      rejected.push({
        name: file.name,
        error: `ファイルサイズが 10MB を超えています (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      })
      continue
    }
    const ext = extOf(file.name)
    const mimeOk = ALLOWED_MIME.has(file.type.toLowerCase())
    const extOk = ALLOWED_EXT.includes(ext)
    if (!mimeOk && !extOk) {
      rejected.push({
        name: file.name,
        error: `サポート外の形式です (jpg/jpeg/png/webp のみ)`,
      })
      continue
    }
    valid.push({ name: file.name, file })
  }

  return { valid, rejected }
}

export async function uploadImagesForImport(
  igUsername: string,
  files: ValidImage[]
): Promise<UploadImagesResult> {
  const supabase = createAdminClient()
  const uploaded: UploadedImage[] = []
  const failed: UploadFailure[] = []
  const safeUsername = sanitizeUsernameForPath(igUsername)

  for (const item of files) {
    const path = `${safeUsername}/${item.name}`
    const buffer = await item.file.arrayBuffer()
    const contentType = item.file.type || mimeFromExt(extOf(item.name))

    let lastError: string | null = null
    let success = false
    for (let attempt = 1; attempt <= RETRY_MAX; attempt++) {
      try {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, buffer, {
            contentType,
            upsert: true,
          })
        if (error) {
          lastError = error.message
          await sleep(200 * Math.pow(2, attempt - 1))
          continue
        }
        success = true
        break
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        await sleep(200 * Math.pow(2, attempt - 1))
      }
    }

    if (!success) {
      failed.push({ name: item.name, error: lastError ?? 'アップロード失敗' })
      continue
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    uploaded.push({ name: item.name, path, publicUrl: pub.publicUrl })
  }

  return { uploaded, failed }
}

function extOf(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx === -1 ? '' : filename.slice(idx).toLowerCase()
}

function mimeFromExt(ext: string): string {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

/**
 * ig_username は ^[a-zA-Z0-9._]{1,30}$ で検証されているはずだが、
 * Storage パスとして安全に扱うため念のため不要な文字を除去。
 */
function sanitizeUsernameForPath(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._]/g, '')
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
