import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  newDomainClaim,
  checkFunnelDomain,
  FunnelDomainError,
  type FunnelDomainStore,
} from "./funnel-domain-store.js";
import type { DomainProvider } from "./funnel-domain-provider.js";
function fixture() {
  let current = newDomainClaim({
    hostname: "learn.example.org",
    apex: false,
    defaultKind: "buyer",
  });
  const calls: string[] = [];
  const store: FunnelDomainStore = {
    list: async () => [current],
    command: async (action, id, revision, candidate) => {
      calls.push(action);
      if (id !== current.id || revision !== current.revision)
        throw new FunnelDomainError(409, "DOMAIN_CONFLICT");
      current = {
        ...current,
        revision: randomUUID(),
        ...(action === "claim" ? { claimed: true } : {}),
        ...(action === "finish" ? (candidate as Partial<typeof current>) : {}),
      };
      return current;
    },
  };
  const provider: DomainProvider = {
    owns: vi.fn(async () => true),
    attach: vi.fn(async () => ({ verified: true, configured: true, records: [] })),
    certificate: vi.fn(async () => true),
  };
  return {
    get current() {
      return current;
    },
    store,
    provider,
    calls,
  };
}
describe("persisted domain check progression", () => {
  it("generates bounded independent challenges and never claims on acknowledgement", () => {
    const a = newDomainClaim(
        { hostname: "learn.example.org", apex: false, defaultKind: "buyer" },
        1000,
      ),
      b = newDomainClaim(
        { hostname: "learn.example.org", apex: false, defaultKind: "buyer" },
        1000,
      );
    expect(a.challenge).not.toBe(b.challenge);
    expect(a.claimed).toBe(false);
    expect(Date.parse(a.challengeExpiresAt) - 1000).toBe(72 * 3600000);
    expect(a.records[0]?.name).toBe("_automatedlo.learn.example.org");
  });
  it("reserves, proves exact DNS, claims, checks hosting and TLS then finishes", async () => {
    const f = fixture();
    expect(
      (await checkFunnelDomain(f.store, f.provider, f.current.id, f.current.revision)).status,
    ).toBe("ready");
    expect(f.calls).toEqual(["reserve", "claim", "finish"]);
  });
  it("missing ownership never attaches to Vercel", async () => {
    const f = fixture();
    f.provider.owns = async () => false;
    expect(
      (await checkFunnelDomain(f.store, f.provider, f.current.id, f.current.revision)).status,
    ).toBe("ownership_needed");
    expect(f.provider.attach).not.toHaveBeenCalled();
    expect(f.calls).toEqual(["reserve", "finish"]);
  });
  it.each(["owns", "attach", "certificate"] as const)(
    "persists attention after uncertain %s",
    async (method) => {
      const f = fixture();
      f.provider[method] = async () => {
        throw new Error("Provider unavailable");
      };
      expect(
        (await checkFunnelDomain(f.store, f.provider, f.current.id, f.current.revision)).status,
      ).toBe("attention");
    },
  );
  it.each([
    [false, true, "hosting_needed"],
    [true, false, "dns_needed"],
  ] as const)("persists separate hosting/DNS state", async (verified, configured, status) => {
    const f = fixture();
    f.provider.attach = async () => ({ verified, configured, records: [] });
    expect(
      (await checkFunnelDomain(f.store, f.provider, f.current.id, f.current.revision)).status,
    ).toBe(status);
    expect(f.provider.certificate).not.toHaveBeenCalled();
  });
  it("does not undo a concurrent disconnect after network work", async () => {
    const f = fixture(),
      old = f.current.revision;
    f.provider.attach = async () => {
      await f.store.command("disconnect", f.current.id, f.current.revision);
      return { verified: true, configured: true, records: [] };
    };
    await expect(checkFunnelDomain(f.store, f.provider, f.current.id, old)).rejects.toThrow(
      "DOMAIN_CONFLICT",
    );
  });
});
