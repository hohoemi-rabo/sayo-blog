import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  // Vercel の画像最適化は使わない (Hobby の月 5,000 変換を超えると 402 で画像が出なくなる)。
  // Supabase の画像は自前の縮小版 (/api/img → Storage の image-variants) で配る。詳細は src/lib/image-variants.ts
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    // 縮小版は 400 / 800 / 1200 しか作らないので、srcset もこの 3 つに揃える
    deviceSizes: [400, 800, 1200],
    imageSizes: [],
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
      // 旧ドメイン (Vercel の既定ドメイン) → 独自ドメイン。2026-11 に Google 検索で旧ドメインの
      // 記事がまだ出ていた (canonical は新ドメインを指していたが、旧ドメインでも 200 で全ページ見えていた)。
      // パスとクエリはそのまま引き継ぐ。旧カテゴリの記事 (/news/xxx 等) は新ドメイン側で
      // 記事ページが正しいカテゴリへもう一度 308 する (2 回の転送で着く)。
      // /api/* は除外 = Vercel Cron などが既定ドメインを叩いても転送されないように。
      // 転送先は環境変数にしない (未設定時の既定値が旧ドメインなので、転送がループしうる)。
      {
        source: '/:path((?!api(?:/|$)).*)',
        has: [{ type: 'host', value: 'sayo-blog.vercel.app' }],
        destination: 'https://www.sayo-kotoba.com/:path',
        permanent: true,
      },
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
      // 2026-10 カテゴリ再編: 旧カテゴリ一覧ページ。旧記事 URL (/gourmet/xxx 等) は
      // 記事ページ側でカテゴリ不一致を検出して 301 する (記事ごとの対応表は持たない)
      { source: '/gourmet', destination: '/food', permanent: true },
      { source: '/spot', destination: '/outing', permanent: true },
      { source: '/news', destination: '/life', permanent: true },
    ]
  },
};

// Vercel BotID: 公開フォーム送信をボットから保護する (rewrites を注入)
export default withBotId(nextConfig);
