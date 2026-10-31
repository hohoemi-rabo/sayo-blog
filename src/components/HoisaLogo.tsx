import { cn } from '@/lib/utils'
import { SITE_CONFIG } from '@/lib/site-config'

/**
 * HOISA ロゴ (欧文ワードマーク + 枝の飾り)。
 *
 * Cormorant Garamond の文字と SVG の枝飾りで描く。**これが正式ロゴ** (2026-10-31 紗代さん確定)。
 * 共有画像 public/og-image.jpg もこの形・色で作ってある (ここを変えたら作り直す)。
 * ヘッダー・ヒーロー・フッターはすべてここを参照する。
 *
 * - `header`: ヘッダー用の小サイズ (枝飾りのみ)
 * - `hero`: トップのヒーロー用。文字の下をくぐって枝へつながる曲線つき
 *
 * 文字は実テキストのまま描画する (読み上げ・検索で "HOISA" として扱われる)。装飾 SVG は aria-hidden。
 */

type HoisaLogoProps = {
  variant?: 'header' | 'hero'
  className?: string
}

export default function HoisaLogo({ variant = 'header', className }: HoisaLogoProps) {
  const isHero = variant === 'hero'

  // 枝と曲線は文字サイズ (em) 基準で配置する = どのサイズでも文字との位置関係が崩れない
  return (
    <span
      className={cn(
        'relative inline-block leading-none',
        isHero ? 'text-[clamp(4rem,11vw,8.5rem)]' : 'text-[2rem] md:text-[2.3rem]',
        className
      )}
    >
      {isHero && <Swoosh />}
      <span className="relative font-cormorant font-bold tracking-[0.04em] text-transparent bg-clip-text bg-gradient-to-b from-hoisa-light to-hoisa">
        {SITE_CONFIG.name}
      </span>
      <Sprig className="absolute left-full top-[0.22em] -ml-[0.08em] h-[0.86em] w-auto text-hoisa" />
    </span>
  )
}

/** A の右肩から伸びる枝。輪郭線のつぼみと塗りの葉で、デザイン案の手描き感に寄せる */
function Sprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 56"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      {/* 主枝 */}
      <path d="M4 54 C 12 44, 18 34, 22 18" />
      {/* 脇枝 */}
      <path d="M15 38 C 22 36, 30 32, 36 24" />
      <path d="M19 27 C 14 22, 11 16, 10 10" />
      {/* 葉 */}
      <path d="M9 47 C 2 46, -1 41, 1 37 C 6 38, 9 42, 9 47 Z" fill="currentColor" stroke="none" />
      <path d="M26 33 C 27 27, 32 24, 36 25 C 35 30, 31 33, 26 33 Z" fill="currentColor" stroke="none" opacity={0.75} />
      {/* つぼみ */}
      <ellipse cx="23" cy="13" rx="3.6" ry="5.4" transform="rotate(14 23 13)" />
      <ellipse cx="39" cy="20" rx="3.4" ry="5" transform="rotate(48 39 20)" />
      <ellipse cx="9" cy="6" rx="3" ry="4.4" transform="rotate(-18 9 6)" />
    </svg>
  )
}

/** ヒーロー版のみ: 左から文字の下をくぐり、枝の根元へ抜ける細い曲線 */
function Swoosh() {
  return (
    <svg
      viewBox="0 0 600 140"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -left-[0.6em] top-[0.62em] h-[0.95em] w-[calc(100%+1em)] text-hoisa/55"
    >
      <path d="M2 62 C 36 40, 70 128, 200 134 C 340 140, 488 118, 562 58 C 580 42, 592 24, 598 6" />
    </svg>
  )
}
