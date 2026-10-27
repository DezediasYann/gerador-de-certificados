import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export estático para o Tauri servir o frontend sem servidor Node.
  output: "export",
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
