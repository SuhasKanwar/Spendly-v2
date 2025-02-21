import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  distDir: 'dist',
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  }
};

export default nextConfig;