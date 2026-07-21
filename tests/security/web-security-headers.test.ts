import { describe, expect, it } from "vitest";

import nextConfig from "../../apps/web/next.config.js";

describe("Phase 0 web security headers", () => {
  it("applies the non-CSP baseline to every route", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    if (nextConfig.headers === undefined) {
      throw new Error("Next.js headers configuration is required");
    }

    const rules = await nextConfig.headers();
    expect(rules).toHaveLength(1);
    expect(rules[0]?.source).toBe("/:path*");
    expect(
      Object.fromEntries(rules[0]?.headers.map(({ key, value }) => [key, value]) ?? []),
    ).toMatchObject({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
    });
  });
});
