/**
 * Site-wide configuration constants
 * Centralized to avoid scattering values across layout.tsx and page files
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayo-blog.vercel.app'

export const SITE_CONFIG = {
  name: 'HOISA',
  // ヘッダー・ヒーロー・フッターで共通に使うキャッチ (表記ゆれ防止のため直書きしない)
  tagline: '飯田下伊那のあれこれを、運ぶ。',
  title: 'HOISA | 飯田下伊那のあれこれを、運ぶ。',
  description:
    '深く掘った話も、誰かが届けたい話も、小さなお知らせも。飯田下伊那の「あれこれ」が行き交う地域メディア。ライター・本岡紗代が文章と写真で届けます。',
  url: siteUrl,
  locale: 'ja_JP',
  author: {
    name: '本岡紗代',
    nameEn: 'Sayo Motooka',
    url: siteUrl,
  },
  themeColor: '#FF6B9D',
  keywords: ['HOISA', '飯田', '下伊那', '南信州', '地域情報', 'イベント', 'グルメ', 'おでかけ', 'インタビュー', 'ライター'],
} as const
