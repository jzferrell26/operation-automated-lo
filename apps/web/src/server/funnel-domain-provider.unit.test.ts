import { describe, expect, it, vi } from "vitest";
import {
  createDomainProvider,
  isPublicIpv6,
  type DomainResolver,
} from "./funnel-domain-provider.js";
const environment = {
  OALO_FUNNEL_DOMAINS: "enabled",
  OALO_VERCEL_DOMAINS_TOKEN: "synthetic-token-not-a-live-secret",
  OALO_VERCEL_PROJECT_ID: "prj_test",
  OALO_VERCEL_TEAM_ID: "team_test",
};
const host = "learn.example.org",
  challenge = "a".repeat(64);
function resolver(overrides: Partial<DomainResolver> = {}): DomainResolver {
  return {
    resolveTxt: async () => [[`automatedlo-verification=${challenge}`]],
    resolve4: async () => ["76.76.21.21"],
    resolve6: async () => [],
    ...overrides,
  };
}
function transport(values: unknown[]) {
  const calls: string[] = [];
  const fetcher = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    calls.push(`${init?.method} ${String(input)}`);
    return values.length ? Response.json(values.shift()) : new Response(null, { status: 404 });
  });
  return { calls, fetcher };
}
const domain = (extra: Record<string, unknown> = {}) => ({
  name: host,
  projectId: "prj_test",
  verified: true,
  ...extra,
});
describe("fixed-scope domain provider", () => {
  it("requires exact TXT and distinguishes missing from uncertain DNS", async () => {
    expect(await createDomainProvider(environment, fetch, resolver()).owns(host, challenge)).toBe(
      true,
    );
    expect(
      await createDomainProvider(
        environment,
        fetch,
        resolver({ resolveTxt: async () => [["other"]] }),
      ).owns(host, challenge),
    ).toBe(false);
    expect(
      await createDomainProvider(
        environment,
        fetch,
        resolver({
          resolveTxt: async () => {
            throw { code: "ENODATA" };
          },
        }),
      ).owns(host, challenge),
    ).toBe(false);
    await expect(
      createDomainProvider(
        environment,
        fetch,
        resolver({
          resolveTxt: async () => {
            throw { code: "ETIMEOUT" };
          },
        }),
      ).owns(host, challenge),
    ).rejects.toThrow("temporarily");
  });
  it("uses current recommendations and preserves project/team parity", async () => {
    const wire = transport([
      domain({
        verified: false,
        verification: [{ type: "TXT", domain: "_vercel.example.org", value: "proof" }],
      }),
      domain({
        verified: false,
        verification: [{ type: "TXT", domain: "_vercel.example.org", value: "proof" }],
      }),
      {
        misconfigured: true,
        recommendedCNAME: [
          { rank: 2, value: "backup.vercel-dns.com" },
          { rank: 1, value: "tenant.vercel-dns-017.com" },
        ],
      },
    ]);
    const result = await createDomainProvider(environment, wire.fetcher).attach(host, false);
    expect(result.records).toEqual([
      { type: "TXT", name: "_vercel.example.org", value: "proof", purpose: "hosting" },
      { type: "CNAME", name: host, value: "tenant.vercel-dns-017.com", purpose: "routing" },
    ]);
    expect(result.verified).toBe(false);
    expect(result.configured).toBe(false);
    expect(
      wire.calls.every(
        (call) =>
          call.startsWith("GET https://api.vercel.com/") ||
          call.startsWith("POST https://api.vercel.com/"),
      ),
    ).toBe(true);
    expect(wire.calls.every((call) => call.includes("teamId=team_test"))).toBe(true);
    expect(wire.calls[1]).toContain("/v9/projects/prj_test/domains/learn.example.org/verify");
  });
  it.each([
    { redirect: "https://other.example.org" },
    { gitBranch: "other" },
    { customEnvironmentId: "env_other" },
    { projectId: "prj_foreign" },
    { name: "other.example.org" },
  ])("refuses existing destination %j without mutation", async (extra) => {
    const wire = transport([domain(extra)]);
    await expect(
      createDomainProvider(environment, wire.fetcher).attach(host, false),
    ).rejects.toThrow();
    expect(wire.calls).toHaveLength(1);
  });
  it("adds only a missing project domain and obtains apex recommendations", async () => {
    const wire = transport([
      { misconfigured: false, recommendedIPv4: [{ rank: 1, value: ["76.76.21.21"] }] },
    ]);
    const fetcher = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ name: host });
        return Response.json(domain());
      }
      if (String(input).includes("/config?")) return wire.fetcher(input, init);
      return new Response(null, { status: 404 });
    });
    expect((await createDomainProvider(environment, fetcher).attach(host, true)).records).toEqual([
      { type: "A", name: host, value: "76.76.21.21", purpose: "routing" },
    ]);
  });
  it.each(["127.0.0.1", "192.0.0.9", "192.0.2.1", "169.254.1.1"])(
    "refuses unsafe mixed A answer %s before TLS",
    async (address) => {
      const probe = vi.fn(async () => true);
      expect(
        await createDomainProvider(
          environment,
          fetch,
          resolver({ resolve4: async () => ["76.76.21.21", address] }),
          probe,
        ).certificate(host),
      ).toBe(false);
      expect(probe).not.toHaveBeenCalled();
    },
  );
  it.each([
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002:7f00:1::",
    "3fff::1",
    "2001::1",
  ])("refuses unsafe mixed AAAA answer %s", async (address) => {
    const probe = vi.fn(async () => true);
    expect(isPublicIpv6(address)).toBe(false);
    expect(
      await createDomainProvider(
        environment,
        fetch,
        resolver({ resolve6: async () => [address] }),
        probe,
      ).certificate(host),
    ).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });
  it("pins a public IPv4 with original SNI only after both families are qualified", async () => {
    const probe = vi.fn(async () => true);
    expect(isPublicIpv6("2606:4700:4700::1111")).toBe(true);
    expect(
      await createDomainProvider(
        environment,
        fetch,
        resolver({ resolve6: async () => ["2606:4700:4700::1111"] }),
        probe,
      ).certificate(host),
    ).toBe(true);
    expect(probe).toHaveBeenCalledExactlyOnceWith(host, "76.76.21.21");
  });
  it("never fetches an invalid hostname or unsafe provider recommendation", async () => {
    const wire = transport([
      domain(),
      { misconfigured: false, recommendedIPv4: [{ rank: 1, value: ["192.0.0.9"] }] },
    ]);
    await expect(
      createDomainProvider(environment, wire.fetcher).attach(host, true),
    ).rejects.toThrow("Invalid hosting");
    await expect(
      createDomainProvider(environment, wire.fetcher).attach("https://host.com", false),
    ).rejects.toThrow("Invalid domain");
    expect(wire.calls).toHaveLength(2);
  });
});
