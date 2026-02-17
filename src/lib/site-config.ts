/**
 * Site-wide configuration constants
 * Centralized to avoid scattering values across layout.tsx and page files
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayo-blog.vercel.app'

export const SITE_CONFIG = {
  name: "Sayo's Journal",
  title: "Sayo's Journal | 言葉で場所・人・記憶をつなぐ",
  description:
    'ライター・インタビュアー本岡紗代のブログメディア。文章と写真で綴る、人と場所の物語。',
  url: siteUrl,
  locale: 'ja_JP',
  author: {
    name: '本岡紗代',
    nameEn: 'Sayo Motooka',
    url: siteUrl,
  },
  themeColor: '#FF6B9D',
  keywords: ['ブログ', 'インタビュー', 'ライター', '地域', '旅', '長野', '飯田', '紗代'],
} as const
