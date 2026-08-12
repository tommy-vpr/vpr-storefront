import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],

  images: {
    /**
     * next/image refuses a remote URL unless its host is listed here — it
     * throws rather than falling back, so a collection banner pointing at any
     * host not named below breaks the page rather than the image.
     *
     * Product images already come from Shopify's CDN, and banners are
     * uploaded to GCS like the rest of the WMS's generated assets.
     */
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
};

export default nextConfig;
