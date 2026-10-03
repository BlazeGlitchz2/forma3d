import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext checks multipart requests against this limit before route dispatch.
  // Leave room for the envelope; /api/uploads still enforces a 15 MB file cap.
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
};

export default nextConfig;
