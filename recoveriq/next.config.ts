import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        // Never cache the service worker itself, so updates roll out immediately.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
