import { createAdminClient } from '@/lib/supabase'
import {
  INQUIRY_IMAGE_ACCEPT,
  INQUIRY_IMAGE_MAX_BYTES,
} from '@/lib/inquiry-schema'

/**
 * 情報窓口フォームの添付ファイルを Supabase Storage (inquiry-images) に保存する。
 *
 * inquiry-images バケットの INSERT は authenticated 限定のため、
 * 公開フォーム(匿名)・管理画面(独自 cookie 認証)いずれも anon クライアントでは書けない。
 * → 必ず service role (createAdminClient) 経由でアップロードする。
 *
 * 公開フォームはチラシ PDF も受け付けるため、許可 mime は呼び出し側が `accept` で指定する
 * (管理画面の「追加画像」は記事本文に差し込むので画像のみ)。
 */

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
}

export function inquiryImageExt(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null
}

export class InquiryImageError extends Error {}

/**
 * ファイル 1 点ずつ mime/サイズを検証して mini/{inquiryId}/{prefix}{index}.{ext} に保存。
 * @returns 公開 URL の配列 (入力順)
 * @throws InquiryImageError 検証エラー時 (ユーザー向けメッセージ)
 */
export async function uploadInquiryImages(opts: {
  inquiryId: string
  files: File[]
  namePrefix?: string
  startIndex?: number
  /** 許可する mime。既定は画像のみ */
  accept?: readonly string[]
}): Promise<string[]> {
  const {
    inquiryId,
    files,
    namePrefix = '',
    startIndex = 0,
    accept = INQUIRY_IMAGE_ACCEPT,
  } = opts
  if (files.length === 0) return []

  const allowsPdf = accept.includes('application/pdf')
  const supabase = createAdminClient()
  const urls: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!accept.includes(file.type)) {
      throw new InquiryImageError(
        allowsPdf
          ? '対応していない形式です（JPEG / PNG / WebP / HEIC / PDF のみ）'
          : '対応していない画像形式です（JPEG / PNG / WebP / HEIC のみ）'
      )
    }
    if (file.size > INQUIRY_IMAGE_MAX_BYTES) {
      throw new InquiryImageError('ファイルは 1 点あたり 10MB までです')
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
