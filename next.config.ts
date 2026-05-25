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
  experimental: {
    serverActions: {
      // 情報窓口フォーム (/request/mini) の添付画像を 10MB × 最大 2 枚、
      // 記事化画面の追加画像を最大 8 枚まで 1 リクエストで送るため余裕を持たせる
      bodySizeLimit: '100mb',
    },
  },
};

// Vercel BotID: 公開フォーム送信をボットから保護する (rewrites を注入)
export default withBotId(nextConfig);
