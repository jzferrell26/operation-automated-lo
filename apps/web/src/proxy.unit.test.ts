import { NextRequest } from "next/server.js";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy.js";
import { contentSecurityPolicyHeaderName } from "./security/content-security-policy.js";

/**
 * PRD-006a 006A-AC-019. The two pages a password-reset or email-confirmation link lands on.
 *
 * A token in a query string leaks two ways without these headers: into the `Referer` of anything
 * the page links to, and into any shared or proxy cache that is free to keep the rendered page.
 * `no-referrer` and `no-store` close both.
 *
 * The nonce policy is asserted unchanged on the same responses, because that is the failure mode
 * to watch for: `authSurfaceSecurityHeaders` would emit its own `default-src 'self'`, which would
 * intersect with the nonce policy and block the theme bootstrap script, so only these two headers
 * are applied here.
 */

const CSP_HEADER = contentSecurityPolicyHeaderName("enforce");

function respondTo(path: string) {
  return proxy(new NextRequest(new Request(`https://review.operation-automated-lo.test${path}`)));
}

describe("headers on the token-bearing pages", () => {
  it.each(["/reset-password", "/verify-email"])(
    "sends no referrer and stores nothing for %s",
    (path) => {
      const response = respondTo(`${path}?token=a-token-that-must-not-travel`);

      expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      // Still the per-request nonce policy, not the two-directive policy
      // `authSurfaceSecurityHeaders` would emit, which carries no nonce and would block the
      // theme bootstrap script.
      expect(response.headers.get(CSP_HEADER)).toContain("nonce-");
      expect(response.headers.get(CSP_HEADER)).toContain("'strict-dynamic'");
    },
  );

  it("applies the same treatment to a path below either page", () => {
    const response = respondTo("/reset-password/anything");

    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("leaves every other page alone", () => {
    for (const path of ["/sign-in", "/overview", "/reset-password-elsewhere"]) {
      const response = respondTo(path);

      expect(response.headers.get("Referrer-Policy"), path).toBeNull();
      expect(response.headers.get("Cache-Control"), path).toBeNull();
      expect(response.headers.get(CSP_HEADER), path).toContain("nonce-");
    }
  });
});

describe("sealed public financing response policy", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  it.each(["", "/report.pdf", `/media/${"a".repeat(64)}`])(
    "leaves exact read response CSP to its sealed handler: %s",
    (suffix) => {
      for (const method of ["GET", "HEAD"]) {
        const response = proxy(
          new NextRequest(
            new Request(`https://reports.example.com/p/${id}${suffix}`, {
              method,
              headers: { "x-nonce": "visitor-forged", "content-security-policy": "visitor-policy" },
            }),
          ),
        );
        expect(response.headers.get(CSP_HEADER)).toBeNull();
        expect(response.headers.get("x-middleware-request-content-security-policy")).toContain(
          "nonce-",
        );
        expect(response.headers.get("x-middleware-request-x-nonce")).not.toBe("visitor-forged");
        expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
        expect(response.headers.get("Cache-Control")).toBe("no-store");
      }
    },
  );
  it("leaves only actual form POST response CSP to its handler", () => {
    const response = proxy(
      new NextRequest(
        new Request(`https://reports.example.com/p/${id}/inquiry`, { method: "POST" }),
      ),
    );
    expect(response.headers.get(CSP_HEADER)).toBeNull();
    expect(response.headers.get("x-middleware-request-content-security-policy")).toContain(
      "nonce-",
    );
  });
  it.each([
    "/p",
    "/p/not-a-uuid",
    `/p/${id}/private`,
    `/p/${id}/media/invalid`,
    `/p/${id}/inquiry`,
    `/p/${id}/report.pdf/more`,
    `/p/${id}/`,
    "/overview",
    "/sign-in",
    "/marketing/campaigns",
    "/f/00000000-0000-4000-8000-000000000001",
    "/home-report/not-a-link",
  ])("preserves original response nonce policy on %s", (path) => {
    expect(respondTo(path).headers.get(CSP_HEADER)).toContain("nonce-");
  });
});
