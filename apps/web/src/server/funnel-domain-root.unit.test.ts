import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { domainRootDestination } from "./funnel-domain-routing.js";
const mocks = vi.hoisted(() => ({ capability: vi.fn(), pool: {} }));
vi.mock("./campaign-persistence-runtime.js", async (original) => ({
  ...(await original<typeof import("./campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => mocks.pool,
}));
vi.mock("./funnel-public-store.js", async (original) => ({
  ...(await original<typeof import("./funnel-public-store.js")>()),
  funnelCapability: mocks.capability,
}));
const environment = {
  OALO_APP_URL: "https://platform.example.org",
  OALO_FUNNEL_DOMAINS: "enabled",
  OALO_FUNNEL_PUBLICATION: "enabled",
  OALO_FUNNEL_DATA_KEY: randomBytes(32).toString("base64url"),
};
const id = "12345678-1234-4123-8123-123456789abc";
beforeEach(() => vi.resetAllMocks());
describe("domain root destination admission", () => {
  it("keeps the platform root out of domain database lookup", async () => {
    expect(await domainRootDestination("platform.example.org", environment)).toEqual({
      kind: "platform",
    });
    expect(mocks.capability).not.toHaveBeenCalled();
  });
  it.each([
    null,
    "learn.example.org:444",
    "user@learn.example.org",
    "learn.example.org/path",
    "127.0.0.1",
    "learn.internal",
    "learn.example.org?redirect=bad",
  ])("refuses malformed authority %s before querying", async (host) => {
    await expect(domainRootDestination(host, environment)).rejects.toThrow();
    expect(mocks.capability).not.toHaveBeenCalled();
  });
  it.each(["OALO_FUNNEL_DOMAINS", "OALO_FUNNEL_PUBLICATION"])(
    "refuses when %s is disabled",
    async (setting) => {
      await expect(
        domainRootDestination("learn.example.org", { ...environment, [setting]: "disabled" }),
      ).rejects.toThrow();
      expect(mocks.capability).not.toHaveBeenCalled();
    },
  );
  it("returns only a relative public destination selected by the host capability", async () => {
    mocks.capability.mockResolvedValue({ id });
    expect(await domainRootDestination("learn.example.org", environment)).toEqual({
      kind: "customer",
      path: `/f/${id}`,
    });
    expect(mocks.capability).toHaveBeenCalledExactlyOnceWith(mocks.pool, "domainDefault", [
      "learn.example.org",
    ]);
  });
  it("preserves unavailable destinations and refuses hostile or extra database fields", async () => {
    mocks.capability.mockResolvedValue(null);
    expect(await domainRootDestination("learn.example.org", environment)).toEqual({
      kind: "customer",
      path: null,
    });
    for (const invalid of [
      { id: "https://outside.example.org" },
      { id, locationId: "unexpected" },
      {},
    ]) {
      mocks.capability.mockResolvedValue(invalid);
      await expect(domainRootDestination("learn.example.org", environment)).rejects.toThrow();
    }
  });
});
