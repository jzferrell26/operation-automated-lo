import { NextRequest } from "next/server.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy, config } from "./proxy.js";
afterEach(() => vi.unstubAllEnvs());
function request(path: string, headers: Record<string, string> = {}) {
  vi.stubEnv("OALO_APP_URL", "https://platform.example.org");
  vi.stubEnv("OALO_FUNNEL_DOMAINS", "enabled");
  return new NextRequest(new Request(`https://learn.example.org${path}`, { headers }));
}
describe("domain private-page proxy refusal", () => {
  it("allows only a no-store public root consumer, never a customer root POST", () => {
    const response = proxy(request("/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(
      proxy(new NextRequest(new Request("https://learn.example.org/", { method: "POST" }))).status,
    ).toBe(404);
  });
  it.each([
    "/overview",
    "/settings/domains",
    "/sign-in",
    "/api/auth/sign-in",
    "/api/funnels/publication",
    "/home-report/secret",
    "/p/unbuilt",
  ])("denies %s before rendering even with prefetch and session hints", (path) => {
    expect(
      proxy(
        request(path, {
          "next-router-prefetch": "1",
          purpose: "prefetch",
          cookie: "session=not-a-real-session",
          "x-forwarded-host": "platform.example.org",
        }),
      ).status,
    ).toBe(404);
  });
  it("retains existing platform CSP/security responses", () => {
    request("/overview");
    const response = proxy(new NextRequest(new Request("https://platform.example.org/overview")));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("nonce-");
  });
  it("routes public path shapes only to their independently owner-checked consumers", () => {
    const response = proxy(request("/f/12345678-1234-4123-8123-123456789abc/thanks"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(config.matcher).toEqual([{ source: "/:path*" }]);
  });
  it("rejects mismatched actual authority and disabled custom routing", () => {
    expect(proxy(request("/overview", { host: "platform.example.org" })).status).toBe(404);
    const incoming = request("/f/12345678-1234-4123-8123-123456789abc");
    vi.stubEnv("OALO_FUNNEL_DOMAINS", "disabled");
    expect(proxy(incoming).status).toBe(404);
  });
});
