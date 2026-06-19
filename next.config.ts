import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Bundle the SQLite DB file with API route serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/api/**/*": ["./db/**"],
  },
};

export default nextConfig;
