/**
 * 情報窓口フォームの添付 (チラシ・写真・PDF) を Gemini vision に渡す Part に変換する (Server 専用)。
 *
 * チラシは文字が画像の中にしかなく、紗代さんが手で書き写すのがいちばんの手間だった。
 * 添付をそのまま AI に読ませて、貼り付け本文と同じ「素材」として記事化に使う。
 */

import type { Part } from '@google/generative-ai'
import { INQUIRY_ATTACHMENT_ACCEPT } from '@/lib/inquiry-schema'

const FETCH_TIMEOUT_MS = 15_000

/** 添付の保存先。DB の値だが、任意 URL を取りに行かないよう念のため限定する */
const ATTACHMENT_URL_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inquiry-images/`

/** content-type が汎用値で返ってきたときの拡張子フォールバック */
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
}

/**
 * 添付 URL を取得して inlineData の Part にする。
 * 1 件でも読めなければ throw する (黙って飛ばすと、チラシの情報が抜けた記事が
 * 何事もなく出来上がり、紗代さんが気づけないため)。
 */
export async function loadInquiryAttachmentParts(urls: string[]): Promise<Part[]> {
  return Promise.all(urls.map(loadOne))
}

async function loadOne(url: string): Promise<Part> {
  if (!url.startsWith(ATTACHMENT_URL_PREFIX)) {
    throw new Error(`想定外の添付 URL です: ${url}`)
  }

  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  } catch (err) {
    throw new Error(
      `添付ファイルの読み込みに失敗しました (${err instanceof Error ? err.message : 'unknown'})。もう一度お試しください`
    )
  }
  if (!res.ok) {
    throw new Error(`添付ファイルの読み込みに失敗しました (HTTP ${res.status})`)
  }

  const mimeType = resolveMimeType(url, res.headers.get('content-type'))
  const data = Buffer.from(await res.arrayBuffer()).toString('base64')
  return { inlineData: { data, mimeType } }
}

function resolveMimeType(url: string, contentType: string | null): string {
  const accepted = INQUIRY_ATTACHMENT_ACCEPT as readonly string[]
  const fromHeader = contentType?.split(';')[0].trim().toLowerCase()
  if (fromHeader && accepted.includes(fromHeader)) return fromHeader

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  const fromExt = MIME_BY_EXT[ext]
  if (fromExt) return fromExt

  throw new Error(`AI が読めない形式の添付です: ${url}`)
}
