import type { NextConfig } from "next";

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
      // IG 取得投稿のアップロードで画像 10MB × 最大 10 枚 + CSV を 1 リクエストで送る
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
