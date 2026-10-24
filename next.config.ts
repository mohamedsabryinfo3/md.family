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
  // NO rewrites needed — API routes are native Next.js routes!
};

export default nextConfig;
