/**
 * 公開ギャラリー (/gallery) の共有型・定数。
 * RPC `get_gallery_images` の戻り行に対応する。
 */

export interface GalleryImage {
  image_url: string
  caption: string | null
  alt: string | null
  is_featured: boolean
  post_published_at: string | null
  slug: string
  category_slug: string | null
  title: string
}

/** 1 ページあたりの画像枚数 */
export const GALLERY_PAGE_SIZE = 30

/**
 * ランダム並び用のシード文字列を生成する。
 * 初回ページ (SSR) と「もっと見る」(/api/gallery) で同じシードを共有することで、
 * 同一訪問中はページングが安定し（重複・欠落なし）、リロードのたびに並びが変わる。
 */
export function generateGallerySeed(): string {
  return Math.random().toString(36).slice(2, 12)
}

/** 画像タイルのリンク先 (記事ページ)。主カテゴリが無ければ slug 直下。 */
export function galleryImageHref(img: GalleryImage): string {
  return img.category_slug ? `/${img.category_slug}/${img.slug}` : `/${img.slug}`
}

/** alt フォールバック: alt → caption → 記事タイトル */
export function galleryImageAlt(img: GalleryImage): string {
  return img.alt || img.caption || img.title
}
