import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Render friendliness: routes are force-dynamic; the build never touches the
     database, so deploys succeed even before DATABASE_URL is wired. */
  reactStrictMode: false,
};

export default nextConfig;
