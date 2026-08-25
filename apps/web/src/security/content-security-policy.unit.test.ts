import { describe, expect, it } from "vitest";

import {
  CSP_NONCE_HEADER,
  buildContentSecurityPolicy,
  contentSecurityPolicyHeaderName,
  createRequestNonce,
} from "./content-security-policy.js";

describe("content-security-policy", () => {
  it("creates opaque base64 nonces that differ per call", () => {
    const first = createRequestNonce();
    const second = createRequestNonce();

    expect(first).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(first.length).toBeGreaterThanOrEqual(16);
    expect(second).not.toBe(first);
  });

  it("binds script execution to the request nonce and denies framing", () => {
    const nonce = createRequestNonce();
    const policy = buildContentSecurityPolicy(nonce);

    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("rejects malformed nonces", () => {
    expect(() => buildContentSecurityPolicy("short")).toThrow(/base64/i);
    expect(() => buildContentSecurityPolicy("!!!!")).toThrow(/base64/i);
  });

  it("defaults to the enforced CSP header name", () => {
    expect(contentSecurityPolicyHeaderName()).toBe("Content-Security-Policy");
    expect(contentSecurityPolicyHeaderName("report-only")).toBe(
      "Content-Security-Policy-Report-Only",
    );
    expect(CSP_NONCE_HEADER).toBe("x-nonce");
  });
});
