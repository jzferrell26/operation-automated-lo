import { describe, expect, it } from "vitest";
import { publicDomainAuthority, isCustomerDomainPath } from "./funnel-domain-routing.js";
const environment = {
  OALO_APP_URL: "https://platform.example.org",
  OALO_FUNNEL_DOMAINS: "enabled",
};
const id = "12345678-1234-4123-8123-123456789abc";
describe("public domain authority and private route refusal", () => {
  it("derives custom origin only from actual exact URL authority", () => {
    expect(
      publicDomainAuthority("https://learn.example.org/f/test", "learn.example.org", environment),
    ).toEqual({ origin: "https://learn.example.org", domainHost: "learn.example.org" });
    expect(
      publicDomainAuthority("https://platform.example.org/f/test", null, environment).domainHost,
    ).toBeNull();
    expect(() =>
      publicDomainAuthority(
        "https://platform.example.org/f/test",
        "learn.example.org",
        environment,
      ),
    ).toThrow();
  });
  it.each([
    "http://learn.example.org",
    "https://learn.example.org:444",
    "https://127.0.0.1",
    "https://learn.internal",
  ])("rejects unsupported custom authority %s", (url) =>
    expect(() => publicDomainAuthority(url, null, environment)).toThrow(),
  );
  it("refuses custom routing when disabled without changing platform routing", () => {
    expect(() =>
      publicDomainAuthority("https://learn.example.org", null, {
        ...environment,
        OALO_FUNNEL_DOMAINS: "disabled",
      }),
    ).toThrow();
    expect(
      publicDomainAuthority(environment.OALO_APP_URL, null, {
        ...environment,
        OALO_FUNNEL_DOMAINS: "disabled",
      }).domainHost,
    ).toBeNull();
  });
  it("only allows the finite public funnel journey, static assets and its inquiry POST", () => {
    for (const path of [
      `/f/${id}`,
      `/f/${id}/thanks`,
      `/f/${id}/confirmation`,
      `/f/${id}/watch`,
      `/f/${id}/book`,
      "/_next/static/chunks/app.js",
      "/favicon.ico",
      "/funnel-media/homebuyers.webp",
      "/funnel-media/homeowners.webp",
    ])
      expect(isCustomerDomainPath(path, "GET"), path).toBe(true);
    expect(isCustomerDomainPath(`/api/funnel-public/${id}`, "POST")).toBe(true);
    for (const path of [
      "/overview",
      "/sign-in",
      "/settings/domains",
      "/api/auth/sign-in",
      "/api/funnels/publication",
      "/p/test",
      "/_next/image",
      "/f/bad",
      "/_next/static/../server.js",
    ])
      expect(isCustomerDomainPath(path, "GET"), path).toBe(false);
    expect(isCustomerDomainPath(`/api/funnel-public/${id}`, "GET")).toBe(false);
    expect(isCustomerDomainPath(`/f/${id}`, "POST")).toBe(false);
  });
});
