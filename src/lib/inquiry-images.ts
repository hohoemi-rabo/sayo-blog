import { createAdminClient } from '@/lib/supabase'
import {
  INQUIRY_IMAGE_ACCEPT,
  INQUIRY_IMAGE_MAX_BYTES,
} from '@/lib/inquiry-schema'

/**
 * 情報窓口フォームの添付画像を Supabase Storage (inquiry-images) に保存する。
 *
 * inquiry-images バケットの INSERT は authenticated 限定のため、
 * 公開フォーム(匿名)・管理画面(独自 cookie 認証)いずれも anon クライアントでは書けない。
 * → 必ず service role (createAdminClient) 経由でアップロードする。
 */

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

export function inquiryImageExt(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null
}

export class InquiryImageError extends Error {}

/**
 * 画像 1 枚ずつ mime/サイズを検証して mini/{inquiryId}/{prefix}{index}.{ext} に保存。
 * @returns 公開 URL の配列 (入力順)
 * @throws InquiryImageError 検証エラー時 (ユーザー向けメッセージ)
 */
export async function uploadInquiryImages(opts: {
  inquiryId: string
  files: File[]
  namePrefix?: string
  startIndex?: number
}): Promise<string[]> {
  const { inquiryId, files, namePrefix = '', startIndex = 0 } = opts
  if (files.length === 0) return []

  const supabase = createAdminClient()
  const urls: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!INQUIRY_IMAGE_ACCEPT.includes(file.type as (typeof INQUIRY_IMAGE_ACCEPT)[number])) {
      throw new InquiryImageError(
        '対応していない画像形式です（JPEG / PNG / WebP / HEIC のみ）'
      )
    }
    if (file.size > INQUIRY_IMAGE_MAX_BYTES) {
      throw new InquiryImageError('画像は 1 枚あたり 10MB までです')
    }
    const ext = inquiryImageExt(file.type) ?? 'bin'
    const path = `mini/${inquiryId}/${namePrefix}${startIndex + i}.${ext}`
    const { error } = await supabase.storage
      .from('inquiry-images')
      .upload(path, file, { contentType: file.type, upsert: true })
    if (error) {
      throw new InquiryImageError(`画像のアップロードに失敗しました: ${error.message}`)
    }
    const { data } = supabase.storage.from('inquiry-images').getPublicUrl(path)
    urls.push(data.publicUrl)
  }

  return urls
}
