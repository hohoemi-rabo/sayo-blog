import { parseSupabasePublicUrl, pickVariantWidth } from '@/lib/image-variants'

/**
 * next/image のカスタムローダー (next.config.ts の images.loaderFile)。
 * Supabase の画像は `/api/img` (縮小版を作って保存 → そこへリダイレクト) を通す。
 * ローカル (/public) や外部・blob: の画像は縮小せずそのまま。
 */
export default function imageLoader({ src, width }: { src: string; width: number }): string {
  if (parseSupabasePublicUrl(src)) {
    return `/api/img?src=${encodeURIComponent(src)}&w=${pickVariantWidth(width)}`
  }
  // ローカル画像は元ファイルのまま。w を付けるのは「ローダーが width を使っていない」警告を避けるため
  if (src.startsWith('/')) return `${src}?w=${width}`
  return src
}
