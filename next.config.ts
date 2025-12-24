import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Diz ao Next.js para não tentar compilar o firebase-admin
  serverExternalPackages: ["firebase-admin"],

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;