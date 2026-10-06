import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
  },
  // Vinext checks multipart requests against this limit before route dispatch.
  // Leave room for the envelope; /api/uploads still enforces a 15 MB file cap.
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
};

export default nextConfig;
