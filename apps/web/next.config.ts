import { resolve } from "node:path";

import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
] as const;

/**
 * PRD-009f D1 and 009F-AC-002. Where each address that moved now goes.
 *
 * The framework answers these before any page renders, so each is a real 307 in review, synthetic,
 * and dashboard preview modes alike. A page cannot do the same from under the signed-in layout:
 * that group streams, so a `redirect()` there is a 200 that navigates in the browser.
 *
 * Every row is a fixed pair of addresses inside the application. Nothing here reads the request, so
 * none of it can be steered to another site, and the status is temporary because a page that left
 * may come back. Saved message drafts, partners, and campaigns are untouched: this only moves where
 * an old address leads.
 */
const REMOVED_ADDRESS_REDIRECTS = [
  ["/marketing", "/marketing/campaigns"],
  ["/marketing/property-sites", "/marketing/campaigns"],
  ["/marketing/creative", "/marketing/campaigns"],
  ["/marketing/ads", "/marketing/campaigns"],
  ["/marketing/messaging", "/marketing/campaigns"],
  ["/marketing/blueprints", "/marketing/campaigns/library"],
  ["/reports", "/marketing/campaigns"],
  ["/marketplace", "/overview"],
  ["/settings/profile", "/brand"],
  ["/settings/team", "/settings/account"],
  ["/onboarding", "/overview"],
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@oalo/application", "@oalo/config", "@oalo/ui"],
  async headers() {
    return [{ source: "/:path*", headers: [...securityHeaders] }];
  },
  async redirects() {
    return REMOVED_ADDRESS_REDIRECTS.map(([source, destination]) => ({
      source,
      destination,
      permanent: false,
    }));
  },
  turbopack: {
    root: resolve(import.meta.dirname, "../.."),
  },
};

export default nextConfig;
