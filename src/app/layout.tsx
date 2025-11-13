import type { Metadata, Viewport } from "next";
import { Playfair_Display, Noto_Serif_JP, Noto_Sans_JP } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

// Heading font (decorative serif)
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '700'],
});

// Body font for Japanese text
const notoSerifJP = Noto_Serif_JP({
  subsets: ['latin'],
  variable: '--font-noto-serif-jp',
  weight: ['400', '500', '700'],
  display: 'swap',
});

// UI font for Japanese text
const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "Sayo's Journal | 言葉で場所・人・記憶をつなぐ",
    template: "%s | Sayo's Journal",
  },
  description: "ライター・インタビュアー本岡紗代のブログメディア。文章と写真で綴る、人と場所の物語。",
  keywords: ['ブログ', 'インタビュー', 'ライター', '地域', '旅', '長野', '飯田', '紗代'],
  authors: [{ name: 'Sayo Motooka' }],
  creator: 'Sayo Motooka',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    siteName: "Sayo's Journal",
    title: "Sayo's Journal | 言葉で場所・人・記憶をつなぐ",
    description: "ライター・インタビュアー本岡紗代のブログメディア。文章と写真で綴る、人と場所の物語。",
  },
  twitter: {
    card: 'summary_large_image',
    title: "Sayo's Journal",
    description: "言葉で場所・人・記憶をつなぐ",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#FF6B9D',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${playfair.variable} ${notoSerifJP.variable} ${notoSansJP.variable} font-noto-serif-jp antialiased`}
      >
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
