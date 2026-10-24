import type { NextConfig } from "next";

/**
 * MD.Family Next.js config
 *
 * Modes:
 *  - Vercel (default): output = "standalone" + rewrites proxy /api/v1/* to backend
 *  - Android (BUILD_TARGET=android): output = "export" for Capacitor APK
 *
 * On Vercel, the frontend + API proxy run together. The backend
 * (FastAPI) runs on a separate service (Render/PythonAnywhere/your server).
 * The DATABASE_URL points to Neon (free PostgreSQL).
 */

const isAndroid = process.env.BUILD_TARGET === "android";

const nextConfig: NextConfig = {
  output: isAndroid ? "export" : "standalone",
  images: isAndroid ? { unoptimized: true } : undefined,
  trailingSlash: isAndroid ? true : undefined,
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // Proxy /api/v1/* to the FastAPI backend
  // On Vercel: the backend URL is set via MDFAMILY_BACKEND_URL env var
  // In dev: defaults to http://127.0.0.1:8000
  async rewrites() {
    if (isAndroid) return [];
    const backendUrl = process.env.MDFAMILY_BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
