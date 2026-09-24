import { describe, expect, it } from "vitest";
import { initialPreviewState, previewStateSchema } from "./model.js";
import { setupCanFinish, setupTasks, productSetupSchema } from "./setup-model.js";

describe("product setup saved progress", () => {
  it("adds progress to existing demo records without replacing the user's data", () => {
    const { setup: _setup, ...old } = initialPreviewState();
    old.profile.company = "Existing company";
    old.leadStages["sample-lead-1"] = "Application";
    const migrated = previewStateSchema.parse(old);
    expect(migrated.profile.company).toBe("Existing company");
    expect(migrated.leadStages["sample-lead-1"]).toBe("Application");
    expect(migrated.setup.welcomeSeen).toBe(false);
    expect(migrated.setup.status).toBe("not_started");
  });
  it("never counts visiting steps or viewing sample data as completing setup", () => {
    const state = initialPreviewState();
    state.setup.step = "review";
    state.setup.status = "in_progress";
    expect(setupTasks(state).filter((task) => task.complete)).toHaveLength(0);
    expect(setupCanFinish(state)).toBe(false);
  });
  it("requires a real saved campaign reference and an explicit unblocked demo approval", () => {
    const state = initialPreviewState();
    Object.assign(state.setup, {
      profileSaved: true,
      brandSaved: true,
      partnerId: state.partners[0]!.id,
      routingSaved: true,
      connectionsReviewed: true,
      campaignRef: `campaign_${"a".repeat(32)}`,
    });
    const base = {
      campaignRef: state.setup.campaignRef!,
      campaignVersionRef: "campaignversion_test",
      detailHref: `/marketing/campaigns/${state.setup.campaignRef}`,
      manifestHash: "demo",
      preflightResultHash: "demo",
      state: "awaiting_approval" as const,
      blocking: false,
      headline: "Open house",
      propertyAddress: "214 Cedar Street",
      realtorDisplayName: "Jordan Avery",
      dailyBudgetMinor: 2500,
      totalBudgetMinor: 7500,
      specialAdCategory: "HOUSING" as const,
      persistenceKind: "browser" as const,
      providerPublicationAuthorized: false as const,
      createdAt: new Date().toISOString(),
      findings: [],
    };
    expect(setupCanFinish(state)).toBe(false);
    state.campaigns.push(base);
    expect(setupTasks(state).find((task) => task.id === "campaign")?.complete).toBe(true);
    expect(setupCanFinish(state)).toBe(false);
    state.campaigns[0]!.state = "approved";
    expect(setupCanFinish(state)).toBe(true);
    state.campaigns[0]!.blocking = true;
    expect(setupCanFinish(state)).toBe(false);
  });
  it("validates guide identifiers and does not accept arbitrary URLs or selectors", () => {
    const setup = initialPreviewState().setup;
    expect(
      productSetupSchema.safeParse({
        ...setup,
        guide: { id: "https://untrusted.example", index: 0, paused: false },
      }).success,
    ).toBe(false);
    expect(
      productSetupSchema.safeParse({
        ...setup,
        guide: { id: "campaign", index: 400, paused: false },
      }).success,
    ).toBe(false);
    expect(productSetupSchema.safeParse({ ...setup, campaignRef: "../../other" }).success).toBe(
      false,
    );
  });
});
