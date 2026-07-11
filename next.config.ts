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
  // 公開名の確定に伴う旧 URL からの恒久リダイレクト (既存の被リンク / 検索インデックスを保つため 301)。
  //   ミニ記事   → 投稿記事: /request/mini → /request/post
  //   ロング記事 → 取材記事: /request/long → /request/interview
  // ※ DB/型/article_type などの内部コード名は mini / long のまま (ユーザー不可視)。
  async redirects() {
    return [
      { source: '/request/mini', destination: '/request/post', permanent: true },
      {
        source: '/request/mini/thanks',
        destination: '/request/post/thanks',
        permanent: true,
      },
      {
        source: '/request/long',
        destination: '/request/interview',
        permanent: true,
      },
      {
        source: '/request/long/thanks',
        destination: '/request/interview/thanks',
        permanent: true,
      },
    ]
  },
};

// Vercel BotID: 公開フォーム送信をボットから保護する (rewrites を注入)
export default withBotId(nextConfig);
