import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { compileOpenHouseDraft } from "./open-house-draft.js";

const originalCwd = process.cwd();
const temporaryDirectories: string[] = [];

afterEach(async () => {
  process.chdir(originalCwd);
  vi.resetModules();
  for (const directory of temporaryDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

function validInput() {
  return {
    address: "123 Main Street, Dallas",
    stateCode: "TX",
    propertyDescription: "A sufficiently detailed property description for the open house.",
    openHouseStartsAt: "2030-09-21T17:00:00.000Z",
    openHouseEndsAt: "2030-09-21T20:00:00.000Z",
    realtorDisplayName: "Jordan Smith",
    headline: "Tour this home this weekend",
    body: "Join us for the open house and explore the property in person.",
    callToAction: "Get open house details",
    disclosureText: "Equal Housing Opportunity.",
    consentText: "By submitting, you agree to be contacted.",
    region: "Dallas-Fort Worth",
    dailyBudgetDollars: 25,
    totalBudgetDollars: 125,
    propertyPermissionConfirmed: true,
    realtorPermissionConfirmed: true,
  };
}

describe("local campaign persistence", () => {
  it("persists a passing campaign as awaiting approval with legal transitions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "oalo-campaign-store-"));
    temporaryDirectories.push(directory);
    process.chdir(directory);
    vi.resetModules();
    const { persistLocalCampaign, loadLocalCampaign } = await import("./local-campaign-store.js");
    const compiled = await compileOpenHouseDraft(validInput(), {});
    const saved = await persistLocalCampaign(compiled.version, compiled.preflight, {});
    expect(saved.state).toBe("awaiting_approval");
    expect(saved.events.map((event) => event.toState)).toEqual(["generated", "awaiting_approval"]);
    expect((await loadLocalCampaign(compiled.version.campaignRef, {}))?.version.manifestHash).toBe(
      compiled.version.manifestHash,
    );
  });

  it("persists a blocked campaign as preflight failed", async () => {
    const directory = await mkdtemp(join(tmpdir(), "oalo-campaign-store-"));
    temporaryDirectories.push(directory);
    process.chdir(directory);
    vi.resetModules();
    const { persistLocalCampaign } = await import("./local-campaign-store.js");
    const compiled = await compileOpenHouseDraft(
      { ...validInput(), realtorPermissionConfirmed: false },
      {},
    );
    const saved = await persistLocalCampaign(compiled.version, compiled.preflight, {});
    expect(saved.state).toBe("preflight_failed");
  });
});
