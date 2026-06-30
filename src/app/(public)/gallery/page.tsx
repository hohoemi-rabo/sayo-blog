import { Metadata } from 'next'
import { createClient } from '@/lib/supabase'
import { SITE_CONFIG } from '@/lib/site-config'
import {
  GALLERY_PAGE_SIZE,
  galleryImageAlt,
  galleryImageHref,
  generateGallerySeed,
  type GalleryImage,
} from '@/lib/gallery'
import { generateImageGallerySchema, JsonLd } from '@/lib/structured-data'
import InfiniteImageGrid from './_components/InfiniteImageGrid'

// 訪問のたびに並びをランダムにするため、リクエストごとにシードを生成する。
// そのため ISR ではなく動的レンダリング。画像 1 クエリのみで軽量。
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `ギャラリー | ${SITE_CONFIG.name}`,
  description:
    '南信州（飯田・下伊那）の人・場所・食を綴った記事の写真ギャラリー。気になる一枚から、その物語へ。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/gallery`,
  },
  openGraph: {
    title: `ギャラリー | ${SITE_CONFIG.name}`,
    description: '記事の写真から、その物語へ。',
    url: `${SITE_CONFIG.url}/gallery`,
    type: 'website',
  },
}

export default async function GalleryPage() {
  const supabase = createClient()
  // この訪問のランダム並びを固定するシード。初回ページと「もっと見る」で共有する。
  const seed = generateGallerySeed()
  // 1 件多めに取って hasMore を判定
  const { data, error } = await supabase.rpc('get_gallery_images', {
    p_limit: GALLERY_PAGE_SIZE + 1,
    p_offset: 0,
    p_seed: seed,
  })

  if (error) {
    console.error('[gallery] rpc error:', error)
  }

  const rows = (data ?? []) as GalleryImage[]
  const hasMore = rows.length > GALLERY_PAGE_SIZE
  const initialImages = hasMore ? rows.slice(0, GALLERY_PAGE_SIZE) : rows

  const gallerySchema = generateImageGallerySchema(
    initialImages.map((img) => ({
      url: img.image_url,
      contentUrl: `${SITE_CONFIG.url}${galleryImageHref(img)}`,
      name: galleryImageAlt(img),
      caption: img.caption,
    }))
  )

  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <JsonLd data={gallerySchema} />
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="font-playfair text-3xl font-bold text-text-primary md:text-4xl">
          ギャラリー
        </h1>
        <p className="mt-4 font-noto-serif-jp leading-relaxed text-text-secondary">
          記事に綴った写真を、一覧で。気になる一枚をクリックすると、その物語へ。
        </p>
      </header>

      <InfiniteImageGrid
        initialImages={initialImages}
        initialHasMore={hasMore}
        seed={seed}
      />
    </div>
  )
}
