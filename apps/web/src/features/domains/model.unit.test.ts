import { describe, expect, it } from "vitest";
import {
  DomainCommandSchema,
  isPublicDomainAddress,
  normalizeFunnelDomain,
  ownershipRecord,
} from "./model.js";

describe("customer domain trust boundary", () => {
  it("normalizes hostnames without treating a URL or IP as a tenant", () => {
    expect(normalizeFunnelDomain("  Learn.AcmeMortgage.com.  ")).toBe("learn.acmemortgage.com");
    for (const value of [
      "https://example.org", "example.org/path", "example.org:443", "*.example.org",
      "example.org@attacker.com", "127.0.0.1", "[::1]", "example..org", "-x.example.org",
      "app.vercel.app", "vercel.app", "localhost", "funnel.internal", "a_b.example.org",
      "example.org?other=tenant", "example.org\\attacker.com", "a".repeat(64) + ".com",
    ]) expect(normalizeFunnelDomain(value), value).toBeNull();
  });
  it("requires explicit control acknowledgement and a known funnel selection", () => {
    const input = { action: "connect", hostname: "learn.example.org", apex: false, defaultKind: "buyer", confirmed: true };
    expect(DomainCommandSchema.safeParse(input).success).toBe(true);
    expect(DomainCommandSchema.safeParse({ ...input, confirmed: false }).success).toBe(false);
    expect(DomainCommandSchema.safeParse({ ...input, defaultKind: "../settings" }).success).toBe(false);
    expect(DomainCommandSchema.safeParse({ ...input, locationId: "caller-chosen" }).success).toBe(false);
  });
  it("uses a separate proof on the precise hostname, not a shared Vercel verification", () => {
    const record = ownershipRecord("learn.example.org", "a".repeat(64));
    expect(record).toEqual({ type: "TXT", name: "_automatedlo.learn.example.org", value: `automatedlo-verification=${"a".repeat(64)}`, purpose: "ownership" });
  });
  it("refuses internal, special, mixed-encoding and documentary probe destinations", () => {
    for (const value of [
      "0.1.2.3", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.169.254",
      "172.16.1.1", "172.31.255.255", "192.168.0.1", "192.0.0.1", "192.0.2.1",
      "198.18.0.1", "198.19.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1",
      "255.255.255.255", "0177.0.0.1", "127.1", "1.2.3.256", "::ffff:127.0.0.1",
    ]) expect(isPublicDomainAddress(value), value).toBe(false);
    expect(isPublicDomainAddress("76.76.21.21")).toBe(true);
    expect(isPublicDomainAddress("216.198.79.1")).toBe(true);
  });
});
