import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server.js";
import { publicDomainAuthority } from "./funnel-domain-routing.js";
import { proxy } from "../proxy.js";

const environment = { OALO_ENVIRONMENT: "local", OALO_APP_URL: "https://127.0.0.1:3443" };
afterEach(() => vi.unstubAllEnvs());
describe("local platform TLS transport authority", () => {
  it("recognizes the configured gateway Host across the server's loopback transport port", () => {
    expect(
      publicDomainAuthority(
        "https://127.0.0.1:3100/funnel-media/homebuyers.webp",
        "127.0.0.1:3443",
        environment,
      ),
    ).toEqual({ origin: environment.OALO_APP_URL, domainHost: null });
  });
  it("preserves canonical platform origin for same-origin visitor and auth consumers", () => {
    expect(
      publicDomainAuthority(
        "https://127.0.0.1:3100/api/funnel-public/test",
        "127.0.0.1:3443",
        environment,
      ).origin,
    ).toBe("https://127.0.0.1:3443");
  });
  it.each(["production", "preview", "staging", undefined])(
    "never normalizes transport in %s",
    (mode) => {
      expect(() =>
        publicDomainAuthority("https://127.0.0.1:3100/overview", "127.0.0.1:3443", {
          ...environment,
          OALO_ENVIRONMENT: mode,
        }),
      ).toThrow();
    },
  );
  it.each([
    ["https://127.0.0.1:3100", null],
    ["https://127.0.0.1:3100", "127.0.0.1"],
    ["https://127.0.0.1:3100", "127.0.0.1:3444"],
    ["https://127.0.0.1:3100", "learn.example.org"],
    ["https://127.0.0.1:3100", "127.0.0.1:3443,evil.example.org"],
    ["http://127.0.0.1:3100", "127.0.0.1:3443"],
    ["https://127.0.0.1", "127.0.0.1:3443"],
    ["https://127.0.0.2:3100", "127.0.0.1:3443"],
    ["https://evil.example.org:3100", "127.0.0.1:3443"],
    ["https://user:password@127.0.0.1:3100", "127.0.0.1:3443"],
  ] as const)("refuses unsupported URL %s / Host %s", (url, host) =>
    expect(() => publicDomainAuthority(url, host, environment)).toThrow(),
  );
  it("does not normalize an externally configured platform or an HTTP canonical origin", () => {
    expect(() =>
      publicDomainAuthority("https://platform.example.org:3100", "platform.example.org:3443", {
        ...environment,
        OALO_APP_URL: "https://platform.example.org:3443",
      }),
    ).toThrow();
    expect(() =>
      publicDomainAuthority("http://127.0.0.1:3100", "127.0.0.1:3443", {
        ...environment,
        OALO_APP_URL: "http://127.0.0.1:3443",
      }),
    ).toThrow();
  });
  it("preserves the proxy CSP for the actual local gateway request shape", () => {
    vi.stubEnv("OALO_ENVIRONMENT", "local");
    vi.stubEnv("OALO_APP_URL", environment.OALO_APP_URL);
    const request = new NextRequest(
      new Request("https://127.0.0.1:3100/funnel-media/homebuyers.webp", {
        headers: { host: "127.0.0.1:3443", "x-forwarded-proto": "https" },
      }),
    );
    const response = proxy(request);
    // NextRequest normalizes 127.0.0.1 to localhost, before proxy receives it.
    expect(new URL(request.url).hostname).toBe("localhost");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("nonce-");
  });
  it("does not use forwarded-host to rescue a wrong actual Host", () => {
    vi.stubEnv("OALO_ENVIRONMENT", "local");
    vi.stubEnv("OALO_APP_URL", environment.OALO_APP_URL);
    const request = new NextRequest(
      new Request("https://127.0.0.1:3100/overview", {
        headers: {
          host: "evil.example.org",
          "x-forwarded-host": "127.0.0.1:3443",
          "x-forwarded-proto": "https",
          "next-router-prefetch": "1",
        },
      }),
    );
    expect(proxy(request).status).toBe(404);
  });
});
