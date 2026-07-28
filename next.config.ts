import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // lib/catalog.ts reads data/wix-catalog.json at request time as the fallback
  // source before Supabase holds real credentials. Nothing imports it, so the
  // bundler can't see the dependency — without this the file is missing from
  // the serverless bundle and every page 500s on deploy.
  outputFileTracingIncludes: {
    "/**": ["./data/wix-catalog.json"],
  },
  images: {
    // Artwork is served from the public `product-media` bucket in Supabase
    // Storage. next/image refuses remote hosts that aren't listed here.
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
