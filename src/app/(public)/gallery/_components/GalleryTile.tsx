import Image from 'next/image'
import Link from 'next/link'
import { galleryImageAlt, galleryImageHref, type GalleryImage } from '@/lib/gallery'

interface GalleryTileProps {
  image: GalleryImage
  /** stagger 用の遅延 (ms) */
  delayMs?: number
}

/**
 * 1 枚の画像タイル。クリックで該当記事へ直行 (ライトボックス無し / 仕様 §7)。
 * masonry (CSS columns) の子なので break-inside-avoid で列跨ぎを防ぐ。
 */
export default function GalleryTile({ image, delayMs = 0 }: GalleryTileProps) {
  const href = galleryImageHref(image)
  const alt = galleryImageAlt(image)
  // ホバー時に重ねる説明: キャプション優先、無ければ記事タイトル
  const overlayText = image.caption || image.title

  return (
    <Link
      href={href}
      className="group relative mb-4 block break-inside-avoid overflow-hidden rounded-lg bg-black/5 shadow-sm transition-shadow duration-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 animate-fade-in"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <Image
        src={image.image_url}
        alt={alt}
        width={500}
        height={500}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        loading="lazy"
        className="h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />

      {/* ピン留めバッジ */}
      {image.is_featured && (
        <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-primary shadow-sm backdrop-blur-sm">
          ★ Pick
        </span>
      )}

      {/* ホバー時オーバーレイ: 記事タイトル / キャプション */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <p className="line-clamp-2 font-noto-sans-jp text-sm leading-snug text-white drop-shadow">
          {overlayText}
        </p>
      </div>
    </Link>
  )
}
