import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Mic,
  UtensilsCrossed,
  MapPin,
  Search,
  FileEdit,
  Camera,
  Send,
  Sparkles,
  MessageSquare,
  PenLine,
  Inbox,
  FolderOpen,
  Archive,
  Repeat,
} from 'lucide-react'
import { SITE_CONFIG } from '@/lib/site-config'
import { withSiteOpenGraph } from '@/lib/seo-utils'

const ABOUT_DESCRIPTION =
  'HOISA は、飯田下伊那を中心に地域の「あれこれ」を運ぶ情報サイトです。SNS やチラシに流れていく情報を、あとから探せる記事として残していきます。運営はライター・編集者の本岡紗代 (FUNE)。'

export const metadata: Metadata = {
  title: 'About',
  description: ABOUT_DESCRIPTION,
  alternates: {
    canonical: `${SITE_CONFIG.url}/about`,
  },
  openGraph: withSiteOpenGraph({
    title: `HOISA について | ${SITE_CONFIG.name}`,
    description: ABOUT_DESCRIPTION,
    url: `${SITE_CONFIG.url}/about`,
  }),
}

/**
 * 構成 (2026-10, 紗代さんの原稿「HOISAについて.docx」):
 * HOISA について → 流れる情報を、残る情報へ (+ 3 つの記事のかたち) → 人の言葉と、AI の力と
 * → HOISA の特徴 (システム相談 CTA) → 運営者について。
 * サイトの説明を先に、紗代さんのプロフィールは最下部に置く。
 */

const pillars = [
  {
    icon: Sparkles,
    title: '自由記事',
    price: '無料',
    description: '私が出会った人・もの・場所を、自由に綴る記事。HOISA のいちばんの土台です。',
  },
  {
    icon: MessageSquare,
    title: '投稿記事',
    price: '無料',
    description:
      'SNS で発信されている情報をもとに、私が短い紹介記事に書き起こします。「これ紹介してほしい」を気軽に。',
  },
  {
    icon: PenLine,
    title: '取材記事',
    price: '500円〜',
    description:
      '私が直接取材にうかがって書く、じっくり丁寧な記事。お店・団体・活動の魅力を深くお伝えします。',
  },
]

const features = [
  { icon: Inbox, label: '集める', detail: '情報提供フォーム' },
  { icon: FolderOpen, label: '整理する', detail: '記事管理・要約' },
  { icon: Archive, label: '残す', detail: '検索できる記事に' },
  { icon: Search, label: '探す', detail: 'AI 検索' },
  { icon: Repeat, label: '届け直す', detail: 'SNS への再活用' },
]

const specialties = [
  { icon: Mic, title: 'インタビュー' },
  { icon: UtensilsCrossed, title: '食レポ記事' },
  { icon: MapPin, title: '観光ガイド記事' },
  { icon: Search, title: 'SEO' },
  { icon: FileEdit, title: '編集・構成' },
  { icon: Camera, title: '写真' },
]

// 「えっさほいさ」の掛け合い (原稿の改行どおり 1 行ずつ)
const essaLines = [
  '重たい！！',
  '手伝おうか？',
  'ありがとう！',
  'じゃ、そこ持ってくれる？',
  'うわ！それではバランスとれない！',
  'そうそう！いい感じ！',
  'えっさほいさ、えっさほいさ！',
]

export default function AboutPage() {
  return (
    <>
      {/* 1｜HOISA について */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-12 md:pb-16 relative">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-text-primary mb-3">
              About
            </h1>
            <Ornament />
          </div>

          <Chapter number={1} eyebrow="HOISA について" title="飯田下伊那の「あれこれ」を、運ぶ。">
            <p>HOISA は、飯田下伊那を中心に、地域の「あれこれ」を運ぶ情報サイトです。</p>
            <p>深く掘った取材記事も、誰かが届けたい活動の話も、講座や居場所の小さな情報も。</p>
            <p>
              速報性や話題性だけを追うのではなく、「この地域に、こんな人・場所・営みがある」と、あとから見つけられる形で残していきます。
            </p>
            <div className="rounded-2xl bg-white/80 border border-primary/15 px-6 py-5">
              <p>
                名前の由来は<strong className="text-text-primary">「えっさほいさ」</strong>。
              </p>
              <p className="mt-2">
                情報がひとつの場所にとどまらず、人から人へ、場所から場所へ。地域の中を行き交うように運ばれていくサイトを目指しています。
              </p>
            </div>
          </Chapter>
        </div>
      </section>

      {/* 2｜流れる情報を、残る情報へ (+ 3 つの記事のかたち) */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <Chapter number={2} title="流れる情報を、残る情報へ。">
          <p>
            SNS の投稿やチラシに載った情報が、時間とともに消えたり、目に入りにくくなったりするのは、少しもったいない。
          </p>
          <p>
            HOISA では、地域に散らばる情報を Web 記事として整理し、検索できる形で蓄積することを目指しています。
          </p>
          <p>
            また、せっかく整えた情報を一度きりにせず、SNS で届け直したり、別の情報とつないだり、必要な人があとから探せるように並べる、アルバムのような場所になればいいなとも思っています。
          </p>
          <p>HOISA では、情報を蓄積するだけではなく、循環することも大切にしています。</p>
          <p className="text-text-primary font-medium">
            あなたの活動や地域の情報も、HOISA に簡単に残せる仕組みがあります。
            ご自身で書いた記事の寄稿や、「こんなことを伝えたい」という情報提供も歓迎しています。
          </p>
        </Chapter>

        <div className="max-w-4xl mx-auto mt-12">
          <h3 className="text-center text-xl md:text-2xl font-playfair font-bold text-text-primary mb-3">
            3 つの記事のかたち
          </h3>
          <p className="max-w-2xl mx-auto text-center font-noto-serif-jp text-text-secondary leading-relaxed mb-8">
            飯田下伊那は、誰かに頼ることが少し苦手な土地かもしれません。
            でも、伝えたい想い、知ってほしいお店、来てほしいイベントがあるなら、
            ここに書き留めてみませんか。私が、あなたの代わりに言葉にします。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {pillars.map(({ icon: Icon, title, price, description }) => (
              <div
                key={title}
                className="bg-white rounded-xl border border-border-decorative/60 p-6 hover:shadow-decorative transition-shadow duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-noto-sans-jp font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1">
                    {price}
                  </span>
                </div>
                <h4 className="text-base font-bold font-noto-sans-jp text-text-primary mb-2">{title}</h4>
                <p className="text-sm text-text-secondary font-noto-serif-jp leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3 mt-10">
            <Link
              href="/request/post"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-primary text-white hover:text-white font-noto-sans-jp font-medium hover:bg-primary-hover hover:shadow-md transition-all duration-200"
            >
              HOISA に寄稿・情報を届ける
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/request/interview"
              className="font-noto-sans-jp text-sm text-text-secondary hover:text-primary underline underline-offset-4"
            >
              取材記事のご依頼はこちら
            </Link>
          </div>
        </div>
      </section>

      {/* 3｜人の言葉と、AI の力と */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <Chapter number={3} title="人の言葉と、AI の力と。">
          <p>AI に地域を丸ごと語らせたいわけではありません。</p>
          <p>
            <strong className="text-text-primary">HOISA の AI は、</strong>
            長い記事を読みやすく要約したり、蓄積した情報から必要なものを探したり、散らばった情報を整理したりするために使っています。
          </p>
          <p className="text-text-primary font-medium">
            つまり、AI は人の代わりに地域を語るものではなく、人と情報をつなぐ案内役です。
          </p>
          <p>
            その土台になるのは、地域で発信された情報や、取材して聞いた言葉、出典や更新日を確かめられる記録。
          </p>
          <p>
            人が持つ背景や温度を残しながら、AI にも扱いやすい形に整えることで、飯田下伊那の情報を、今読む人にも、これから探す人にも届けられる場所をつくっていきます。
          </p>
        </Chapter>
      </section>

      {/* HOISA の特徴 + システム相談 CTA */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary/5 via-primary/10 to-accent-turquoise/5 rounded-2xl border border-primary/15 p-6 sm:p-10 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-noto-serif-jp font-bold text-text-primary mb-3">
              HOISA の特徴
            </h2>
            <Ornament />
          </div>

          <p className="max-w-2xl mx-auto font-noto-serif-jp text-text-secondary leading-relaxed mb-8">
            HOISA は、情報提供フォーム、記事管理、AI 検索、記事の要約、SNS への再活用など、地域情報を「集める・整理する・残す・探す・届け直す」ための仕組みを持ったサイトです。
          </p>

          <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
            {features.map(({ icon: Icon, label, detail }) => (
              <li key={label} className="bg-white rounded-xl border border-border-decorative/60 px-3 py-4 text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" aria-hidden="true" />
                <p className="font-noto-sans-jp text-sm font-bold text-text-primary">{label}</p>
                <p className="font-noto-sans-jp text-xs text-text-secondary mt-0.5">{detail}</p>
              </li>
            ))}
          </ul>

          <div className="max-w-2xl mx-auto space-y-4 font-noto-serif-jp text-text-secondary leading-relaxed">
            <p>そして、この仕組みは HOISA だけのものにする予定ではありません。</p>
            <ul className="space-y-2 pl-1">
              {[
                '自分たちの地域でも、こんな情報サイトをつくりたい',
                '団体や施設の情報を、もっと整理して発信したい',
                'AI も使いながら、更新しやすいサイトをつくりたい',
              ].map((voice) => (
                <li key={voice} className="rounded-lg bg-white/80 px-4 py-2 text-text-primary">
                  「{voice}」
                </li>
              ))}
            </ul>
            <p>
              そんな方には、HOISA で使用しているシステムや機能の導入・購入についてもご相談いただけます。
              「こんなサイト、うちにもほしいな」と思ったら、まずはご一報ください。
            </p>
          </div>

          <div className="text-center mt-8">
            <a
              href={SITE_CONFIG.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-primary text-white hover:text-white font-noto-sans-jp font-medium hover:bg-primary-hover hover:shadow-md transition-all duration-200"
            >
              HOISA の仕組み・システムについて相談する
              <Send className="w-4 h-4" />
            </a>
            <p className="mt-3 font-noto-sans-jp text-xs text-text-secondary">Instagram の DM で受け付けています</p>
          </div>
        </div>
      </section>

      {/* 運営者について */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-noto-serif-jp font-bold text-text-primary mb-3">
              運営者について
            </h2>
            <Ornament />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mb-10">
            <div className="relative w-36 h-36 md:w-44 md:h-44 flex-shrink-0 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <Image
                src="/images/profile.jpg"
                alt="本岡紗代"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 144px, 176px"
              />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl font-noto-serif-jp font-bold text-text-primary">
                本岡紗代<span className="ml-2 text-lg font-playfair">（FUNE）</span>
              </p>
              <p className="text-sm text-primary font-noto-sans-jp mt-1 mb-3">ライター・編集者</p>
              <p className="font-noto-serif-jp text-text-secondary leading-relaxed">
                約10年にわたり、飲食店、企業、イベント、文化、地域で活動する人々を取材してきました。
                国語の成績のみでなんとか学生時代を凌いだすえ、現在に至ります。
              </p>
            </div>
          </div>

          <div className="space-y-5 font-noto-serif-jp text-text-secondary leading-loose">
            <p>このサイトを始めるにあたって、文章についての自分の考えを改めて考えました。</p>
            <p>
              まず、伝えたい。
              <br />
              そして伝えるには言葉が必要。
            </p>
            <p>
              けれど、言葉が伝わるようになるまでは、たくさんの試行錯誤があり、少しずつ意味がのり、やがて誰かに届く。
            </p>
            <p>
              その場の空気、その人が選んだ言葉、なぜその行動をしているのか。
              <br />
              そんなことも伝えられれば。そういうふうに考えました。
            </p>
            <p>
              そして思い浮かんだ言葉が、<strong className="text-text-primary">「えっさほいさ」</strong>です。
            </p>

            <div className="my-8 rounded-2xl bg-primary/5 border border-primary/15 px-6 py-6 sm:px-10">
              <ul className="space-y-2 font-noto-sans-jp text-text-primary">
                {essaLines.map((line, i) => (
                  <li
                    key={line}
                    className={i % 2 === 0 ? 'text-left' : 'text-right'}
                  >
                    <span
                      className={
                        i === essaLines.length - 1
                          ? 'inline-block font-bold text-primary text-lg'
                          : 'inline-block rounded-2xl bg-white px-4 py-1.5 shadow-sm'
                      }
                    >
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p>
              こんな過程が、なかなか愛おしい。
              <br />
              最初から息が合っているわけではなくて、あっちを持ったり、こっちを持ったり。声をかけて、ずれて、また直して。
              <br />
              そのうち、いつの間にかリズムができている。
            </p>
            <p className="text-text-primary font-medium">
              私にとっての「えっさほいさ」は、試行錯誤の末に生まれるリズムなのだと思います。
            </p>
            <p>そして私は、生まれたものだけではなく、そこに至るまでの試行錯誤も伝えられたら、と思っています。</p>
            <p>
              お店ができるまで。活動が続いてきた理由。誰かが何かを始めたきっかけ。今の形になるまでに、何を考えて、何を変えてきたのか。
              <br />
              そういう途中の話は、完成したものの陰に隠れてしまうことがあります。
            </p>
            <p>
              地域にも、まだ残る形になっていない情報がたくさんあります。検索できない小さな物語も、誰かにとっては大切な地域の記憶です。
            </p>
            <p className="text-text-primary font-medium">
              試して、直して、また運ぶ。そのうち、えっさほいさとリズムが生まれる。
              <br />
              HOISA も、そんな場所でありたいと思っています。
            </p>
          </div>

          {/* 得意分野 (旧 What I Do を簡略化して残す) */}
          <div className="mt-12">
            <p className="text-center font-noto-sans-jp text-sm font-medium text-text-secondary mb-4">
              お手伝いできること
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {specialties.map(({ icon: Icon, title }) => (
                <li
                  key={title}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border-decorative/60 px-4 py-2 font-noto-sans-jp text-sm text-text-primary"
                >
                  <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                  {title}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center mt-10">
            <p className="font-noto-serif-jp text-text-secondary mb-4">
              お仕事のご依頼・ご相談は、<br className="sm:hidden" />
              Instagram の DM からもお気軽にどうぞ。
            </p>
            <a
              href={SITE_CONFIG.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary text-primary font-noto-sans-jp hover:bg-primary/10 transition-all duration-200"
            >
              Instagram で連絡する
              <Send className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

function Ornament() {
  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="mx-3 w-1.5 h-1.5 rounded-full bg-primary" />
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
    </div>
  )
}

/** 原稿の「1｜〜」「2｜〜」の章。番号 + 見出し + 本文 */
function Chapter({
  number,
  eyebrow,
  title,
  children,
}: {
  number: number
  eyebrow?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="max-w-3xl mx-auto">
      {eyebrow && (
        <p className="font-noto-sans-jp text-sm font-medium tracking-widest text-primary mb-2">{eyebrow}</p>
      )}
      <div className="flex items-baseline gap-3 mb-6">
        <span className="font-playfair text-3xl md:text-4xl font-bold text-primary/40 leading-none">
          {String(number).padStart(2, '0')}
        </span>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-noto-serif-jp font-bold text-text-primary leading-snug">
          {title}
        </h2>
      </div>
      <div className="space-y-4 font-noto-serif-jp text-text-secondary leading-loose border-l-2 border-primary/15 pl-5 sm:pl-7">
        {children}
      </div>
    </div>
  )
}
