import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SITE_CONFIG } from '@/lib/site-config'
import HoisaLogo from './HoisaLogo'

/**
 * トップページのヒーロー (HOISA)。デザイン案 s1.png のロゴ部分。
 *
 * 風景写真は**仮置き**: 正式な写真 (桜と伊那谷) が届くまで、公開記事「天竜峡」の写真を借りている
 * (紗代さんが撮影した写真なので権利が確実)。差し替えるときは HERO_PHOTO だけ変えればよい。
 */
const HERO_PHOTO = {
  src: 'https://nkvohswifpmarobyrnbe.supabase.co/storage/v1/object/public/thumbnails/2026/02/1771321123349.jpeg',
  alt: '天竜峡の山あいと天竜川を見下ろす風景',
}

const HERO_BG = 'bg-[#FCF3F2]'

export default function HeroSection() {
  return (
    <section className={`relative overflow-hidden ${HERO_BG}`}>
      {/* 風景写真: PC は右側から左へ溶かし、スマホは上部の帯にして下へ溶かす */}
      <div
        className="absolute inset-x-0 top-0 h-64 sm:h-80 lg:inset-y-0 lg:left-auto lg:h-auto lg:w-[64%]
          [mask-image:linear-gradient(to_bottom,black_45%,transparent)]
          lg:[mask-image:linear-gradient(to_right,transparent,rgba(0,0,0,0.55)_22%,black_55%)]"
      >
        <Image
          src={HERO_PHOTO.src}
          alt={HERO_PHOTO.alt}
          fill
          priority
          sizes="(min-width: 1024px) 64vw, 100vw"
          className="object-cover saturate-[0.85]"
        />
        {/* デザイン案の淡く霞んだトーンに寄せる (写真の彩度・暗さを白とピンクで和らげる) */}
        <div className="absolute inset-0 bg-white/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FCF3F2]/40 via-transparent to-[#FCF3F2]/50" />
      </div>

      <HeroDecorations />

      {/* 下端を次のセクションの地色へ溶かす */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />

      {/* 右上の手書き風ひとこと (PC のみ)。フォントはこの 14 文字だけのサブセットなので、
          文言を変えたら scripts/build-font-subsets.mjs の text も変えて `npm run fonts:subset` */}
      <p
        aria-hidden="true"
        className="hidden lg:block absolute right-[4%] top-10 z-10 font-hand text-lg leading-[2.1] tracking-[0.3em] text-text-primary/70 -rotate-6"
      >
        このまちの
        <br />
        <span className="pl-4">あれこれが、</span>
        <br />
        <span className="pl-10">だれかのもとへ。</span>
      </p>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-44 pb-14 sm:pt-56 lg:py-24">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:w-1/2 lg:max-w-none">
          <p className="font-mincho text-base sm:text-xl tracking-[0.3em] text-text-primary animate-slide-in-up stagger-2">
            {SITE_CONFIG.tagline}
          </p>

          <h1 className="mt-4 sm:mt-6 animate-slide-in-up stagger-3">
            <HoisaLogo variant="hero" />
          </h1>

          <p className="mt-8 sm:mt-10 font-mincho text-[0.95rem] sm:text-lg leading-[2.1] tracking-[0.12em] text-text-primary/85 animate-slide-in-up stagger-4">
            {/* 句の途中で折り返さないよう、句ごとに inline-block にする */}
            <span className="inline-block">深く掘った話も、</span>
            <span className="inline-block">誰かが届けたい話も、</span>
            <span className="inline-block">小さなお知らせも。</span>
            <br />
            <span className="inline-block">飯田下伊那の「あれこれ」が、</span>
            <span className="inline-block">ここを行き交います。</span>
          </p>

          <Link
            href="/about"
            className="group mt-7 inline-flex items-center gap-1.5 font-noto-sans-jp text-sm text-hoisa hover:text-text-primary transition-colors animate-fade-in stagger-5"
          >
            {SITE_CONFIG.name}について
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/** 背景の細い曲線と、桜の花びらに見立てたぼかしの粒 (CSS / SVG のみ) */
function HeroDecorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        fill="none"
        className="absolute inset-0 h-full w-full text-hoisa/25"
      >
        <path d="M-20 420 C 260 300, 420 520, 720 380 S 1180 160, 1460 260" stroke="currentColor" strokeWidth="1.2" />
        <path d="M-20 120 C 200 60, 380 200, 620 110" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span className="absolute left-[3%] top-[18%] h-24 w-24 rounded-full bg-hoisa-light/25 blur-2xl" />
      <span className="absolute left-[38%] bottom-[8%] h-16 w-16 rounded-full bg-hoisa-light/20 blur-xl" />
      <span className="absolute right-[6%] bottom-[12%] h-28 w-28 rounded-full bg-white/50 blur-2xl" />
    </div>
  )
}
