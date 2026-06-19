import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: "output: standalone" is for self-hosted Docker. On Vercel, the
  // default build produces proper serverless functions. Keeping this off so
  // vercel.json's includeFiles + the db/ directory are bundled correctly.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Bundle the SQLite DB + prisma client with API routes on Vercel.
  outputFileTracingIncludes: {
    "/api/**/*": ["./db/**", "./prisma/**", "./node_modules/.prisma/**"],
  },
};

export default nextConfig;
