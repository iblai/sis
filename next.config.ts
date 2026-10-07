// ibl.ai: Node.js 22+ localStorage polyfill (missing getItem/setItem in SSR)
if (
  typeof window === "undefined" &&
  typeof localStorage !== "undefined" &&
  typeof localStorage.getItem !== "function"
) {
  const _s: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (k: string) => _s[k] ?? null,
    setItem: (k: string, v: string) => {
      _s[k] = String(v);
    },
    removeItem: (k: string) => {
      delete _s[k];
    },
    clear: () => {
      for (const k in _s) delete _s[k];
    },
    get length() {
      return Object.keys(_s).length;
    },
    key: (i: number) => Object.keys(_s)[i] ?? null,
  } as Storage;
}

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// The SDK's Account pages load the platform logo from the DM through next/image.
const apiHost = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.iblai.app").hostname;
const baseDomain = process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN?.replace(/^\./, "");
const remotePatterns = [
  { protocol: "https" as const, hostname: apiHost },
  ...(baseDomain ? [{ protocol: "https" as const, hostname: `*.${baseDomain}` }] : []),
];

const nextConfig: NextConfig = {
  // Vercel builds the regular output; standalone is for the Dockerfile.
  output: process.env.VERCEL ? undefined : "standalone",
  // The SDK's useVoiceChat never resets its isMounted ref after StrictMode's
  // dev double-mount, wedging voice input at "Processing…". Host workaround
  // (see /iblai-vibe-agent-chat "Known issues"); production runs effects once.
  reactStrictMode: false,
  images: { remotePatterns },
  poweredByHeader: false,
  async headers() {
    // Transport security (HSTS) is the host's; microphone stays open for voice chat.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
