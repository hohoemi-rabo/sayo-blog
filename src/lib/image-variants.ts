/**
 * 画像の縮小版 (variant) の決まりごと。next/image のカスタムローダー (Client) と
 * 生成 API `/api/img` (Server) の両方から使うので、ここには Server 専用のものを置かない。
 *
 * なぜ自前か: Vercel Hobby の画像最適化は月 5,000 変換までで、超えると未キャッシュの画像が
 * 402 になり表示されなくなった (2026-10)。縮小版は Supabase Storage に 1 度だけ作って保存し、
 * 以後はそれを直接配る。
 */

export const VARIANT_BUCKET = 'image-variants'

/** 作る幅はこの 3 つだけ (幅ごとに 1 ファイル保存するので、増やすとストレージを食う) */
export const VARIANT_WIDTHS = [400, 800, 1200] as const
export type VariantWidth = (typeof VARIANT_WIDTHS)[number]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const PUBLIC_PREFIX = '/storage/v1/object/public/'

/** 要求幅以上で最小の variant 幅 (最大 1200) */
export function pickVariantWidth(width: number): VariantWidth {
  return VARIANT_WIDTHS.find((w) => w >= width) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]
}

export function isVariantWidth(width: number): width is VariantWidth {
  return (VARIANT_WIDTHS as readonly number[]).includes(width)
}

/**
 * 自プロジェクトの Supabase 公開 URL なら { bucket, path } (path はデコード済み) を返す。
 * それ以外 (外部 URL・blob:・ローカル画像) は null = 縮小しない。
 */
export function parseSupabasePublicUrl(src: string): { bucket: string; path: string } | null {
  if (!SUPABASE_URL) return null
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return null
  }
  if (url.origin !== new URL(SUPABASE_URL).origin || !url.pathname.startsWith(PUBLIC_PREFIX)) return null

  const [bucket, ...rest] = url.pathname.slice(PUBLIC_PREFIX.length).split('/')
  // 縮小版そのものをさらに縮小させない
  if (!bucket || bucket === VARIANT_BUCKET || rest.length === 0) return null
  try {
    return { bucket, path: rest.map(decodeURIComponent).join('/') }
  } catch {
    return null
  }
}

/** Storage 上のキー: w800/thumbnails/2026/01/xxx.jpeg.webp */
export function variantKey(bucket: string, path: string, width: VariantWidth): string {
  return `w${width}/${bucket}/${path}.webp`
}

export function publicStorageUrl(bucket: string, key: string): string {
  return `${SUPABASE_URL}${PUBLIC_PREFIX}${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
}
