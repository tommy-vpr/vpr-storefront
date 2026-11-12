import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],

  images: {
    // Payload media served through Next (local dev without GCS, or a private bucket).
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/api/cms/media/file/**", search: "" },
    ],
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

export default withPayload(nextConfig);
