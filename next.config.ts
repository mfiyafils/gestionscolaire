import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / WASM database drivers outside the bundler so both
  // PostgreSQL (pg) and the embedded fallback (PGlite) work at runtime on Render.
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  poweredByHeader: false,
  reactStrictMode: true,
  // Production hardening for hosted environments (Render / Vercel / Netlify)
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
