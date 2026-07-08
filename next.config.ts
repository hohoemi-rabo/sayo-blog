import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // 記事クラフト生成 (チラシ/メモ→記事) は runtime に文体プロファイルの md を fs 読みするため、
  // Vercel の関数バンドルに docs/writing-style-profile.md を同梱させる。
  outputFileTracingIncludes: {
    '/api/admin/posts/craft': ['./docs/writing-style-profile.md'],
  },
  experimental: {
    serverActions: {
      // 投稿記事フォーム (/request/post) の添付画像を 10MB × 最大 2 枚、
      // 記事化画面の追加画像を最大 8 枚まで 1 リクエストで送るため余裕を持たせる
      bodySizeLimit: '100mb',
    },
  },
  // 旧 /request/mini (ミニ記事) → /request/post (投稿記事) への恒久リダイレクト。
  // 既存の被リンク / 検索インデックスを保つため 301。
  async redirects() {
    return [
      { source: '/request/mini', destination: '/request/post', permanent: true },
      {
        source: '/request/mini/thanks',
        destination: '/request/post/thanks',
        permanent: true,
      },
    ]
  },
};

// Vercel BotID: 公開フォーム送信をボットから保護する (rewrites を注入)
export default withBotId(nextConfig);
