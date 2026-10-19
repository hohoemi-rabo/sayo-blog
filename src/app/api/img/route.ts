import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase'
import {
  VARIANT_BUCKET,
  isVariantWidth,
  parseSupabasePublicUrl,
  publicStorageUrl,
  variantKey,
} from '@/lib/image-variants'

/**
 * 画像の縮小版を返す (next/image のカスタムローダーの行き先)。
 *
 * 1. 縮小版が Storage にあれば、そこへリダイレクト
 * 2. 無ければ元画像を取って WebP に縮小 → Storage に保存 → リダイレクト
 * 3. 失敗したら元画像へリダイレクト (画像が出ないよりは重くても出す)
 *
 * リダイレクトは長期キャッシュさせるので、2 回目以降は CDN が返し関数は動かない。
 * 自プロジェクトの Supabase 公開画像 + 決まった幅しか受け付けない (任意 URL の変換台にさせない)。
 */

export const maxDuration = 30

const FETCH_TIMEOUT_MS = 10_000
const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const WEBP_QUALITY = 75
// アニメーション GIF や SVG は縮小すると壊れる / 意味が無いので元のまま返す
const PASSTHROUGH_TYPES = ['image/gif', 'image/svg+xml']

const LONG_CACHE = 'public, max-age=31536000, s-maxage=31536000, immutable'

function redirect(location: string, cacheControl: string) {
  return new Response(null, { status: 307, headers: { Location: location, 'Cache-Control': cacheControl } })
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const src = params.get('src') ?? ''
  const width = Number(params.get('w'))
  const source = parseSupabasePublicUrl(src)

  if (!source || !isVariantWidth(width)) {
    return new Response('Bad Request', { status: 400 })
  }

  const key = variantKey(source.bucket, source.path, width)
  const variantUrl = publicStorageUrl(VARIANT_BUCKET, key)
  const originalUrl = publicStorageUrl(source.bucket, source.path)

  try {
    const existing = await fetch(variantUrl, { method: 'HEAD', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (existing.ok) return redirect(variantUrl, LONG_CACHE)

    const original = await fetch(originalUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!original.ok) throw new Error(`original responded ${original.status}`)

    const contentType = original.headers.get('content-type') ?? ''
    if (PASSTHROUGH_TYPES.some((t) => contentType.startsWith(t))) return redirect(originalUrl, LONG_CACHE)

    const input = Buffer.from(await original.arrayBuffer())
    if (input.byteLength > MAX_SOURCE_BYTES) throw new Error(`original too large (${input.byteLength} bytes)`)

    const output = await sharp(input)
      .rotate() // EXIF の向きを反映してから縮小
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()

    const { error } = await createAdminClient()
      .storage.from(VARIANT_BUCKET)
      .upload(key, output, { contentType: 'image/webp', cacheControl: '31536000', upsert: true })
    if (error) throw error

    return redirect(variantUrl, LONG_CACHE)
  } catch (err) {
    console.error(`[api/img] variant failed (${key}):`, err)
    // 一時的な失敗かもしれないのでキャッシュさせず、次のアクセスで作り直す
    return redirect(originalUrl, 'no-store')
  }
}
