import type { NextConfig } from "next";

const isAndroid = process.env.BUILD_TARGET === "android";

const nextConfig: NextConfig = {
  output: isAndroid ? "export" : "standalone",
  images: isAndroid ? { unoptimized: true } : undefined,
  trailingSlash: isAndroid ? true : undefined,
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // Rewrite /api/v1/* to the Python serverless function
  async rewrites() {
    if (isAndroid) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: "/backend-api/index.py",
      },
    ];
  },
};

export default nextConfig;
