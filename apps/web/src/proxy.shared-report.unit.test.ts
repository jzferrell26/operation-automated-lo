import { NextRequest } from "next/server.js";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy.js";
import { contentSecurityPolicyHeaderName } from "./security/content-security-policy.js";

/**
 * PRD-008c. The headers a shared report link gets, including when there is no report behind it.
 *
 * `proxy.ts` applies them by request path, before routing, so they do not depend on what the route
 * goes on to render. That is what keeps the not-found page for a shared link
 * (`app/(public)/home-report/[secret]/not-found.tsx`) as private as the report: it is answered
 * with the same no-referrer, no-store, and noindex headers whether the link is live, expired,
 * turned off, never made, or not even shaped like a link.
 */

const SHAPES = {
  "a live-looking link": `/home-report/${"a1".repeat(32)}`,
  "a link of zeros": `/home-report/${"0".repeat(64)}`,
  "something that is not shaped like a link": "/home-report/not-a-link",
} as const;

function answerFor(path: string) {
  return proxy(new NextRequest(new Request(`https://reports.example.test${path}`)));
}

describe("the headers on a shared report link", () => {
  it.each(Object.entries(SHAPES))("hides %s from referrers, caches, and search", (_shape, path) => {
    const response = answerFor(path);

    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get(contentSecurityPolicyHeaderName("enforce"))).toContain("nonce-");
  });

  it("gives the same answer whatever the link says, so the headers cannot reveal which exist", () => {
    const [first, ...others] = Object.values(SHAPES).map((path) => {
      const response = answerFor(path);
      return ["Referrer-Policy", "Cache-Control", "X-Robots-Tag"].map((name) =>
        response.headers.get(name),
      );
    });

    for (const other of others) {
      expect(other).toEqual(first);
    }
  });
});
