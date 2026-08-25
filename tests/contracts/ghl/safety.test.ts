import { describe, expect, it } from "vitest";

import { createLiveCaptureAdapter } from "../../../packages/ghl/src/live-capture.js";
import {
  UnsafeFixtureError,
  assertFixtureIsSanitized,
  assertFixtureOnlyRequest,
} from "../../../packages/ghl/src/sanitization.js";

describe("HighLevel Phase 0 fixture safety", () => {
  it.each([
    { accessToken: "synthetic-forbidden" },
    { customerEmail: "synthetic-at-example.invalid" },
    { campaignBudget: 1 },
    { headers: { Authorization: "synthetic-forbidden" } },
  ])("rejects forbidden fixture fields", (value) => {
    expect(() => assertFixtureIsSanitized(value)).toThrow(UnsafeFixtureError);
  });

  it.each([
    { transport: "app-test-live", method: "GET", path: "/locations/test" },
    { transport: "fixture-replay", method: "DELETE", path: "/campaigns/test" },
    { transport: "fixture-replay", method: "POST", path: "/audiences/test/members" },
  ])("rejects live or destructive requests", (request) => {
    expect(() => assertFixtureOnlyRequest(request)).toThrow(UnsafeFixtureError);
  });

  it("keeps the live capture adapter inert without authorization", async () => {
    const adapter = createLiveCaptureAdapter({});

    expect(adapter.mode).toBe("disabled");
    await expect(adapter.capture()).rejects.toThrow(/OALO_GHL_LIVE_CAPTURE=authorized/i);
  });
});
