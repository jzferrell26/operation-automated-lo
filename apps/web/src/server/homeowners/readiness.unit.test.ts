import { describe, expect, it } from "vitest";
import { HomeReadinessSchema, HomeWorkspaceSchema, UNKNOWN_HOME_READINESS } from "@oalo/contracts";
import { homeReadiness } from "./readiness.js";

describe("authenticated homeowner readiness projection", () => {
  it.each([
    [true, false, 25, 0, "setup_unavailable"],
    [true, true, 0, 0, "zero_allowance"],
    [true, true, 25, 25, "allowance_exhausted"],
    [true, true, 25, 26, "allowance_exhausted"],
    [true, true, 25, 24, "ready"],
    [false, true, 25, 0, "ready"],
  ] as const)(
    "projects role %s, adapter %s and allowance %s/%s",
    (write, connected, limit, used, freshLookup) => {
      expect(HomeReadinessSchema.parse(homeReadiness(write, connected, limit, used))).toEqual({
        storage: "ready",
        writeAccess: write ? "allowed" : "read_only",
        valuation: connected ? "ready" : "setup_unavailable",
        freshLookup,
      });
    },
  );
  it("keeps old workspace payloads honestly unknown without changing immutable report schemas", () => {
    const parsed = HomeWorkspaceSchema.parse({
      mode: "live",
      canWrite: false,
      valuationConnected: false,
      ghlConnected: false,
      monthlyLookupLimit: 0,
      lookupsThisMonth: 0,
      properties: [],
    });
    expect(parsed.readiness).toEqual(UNKNOWN_HOME_READINESS);
    expect(parsed.canWrite).toBe(false);
    expect(
      HomeReadinessSchema.safeParse({ ...parsed.readiness, credential: "not-allowed" }).success,
    ).toBe(false);
  });
});
