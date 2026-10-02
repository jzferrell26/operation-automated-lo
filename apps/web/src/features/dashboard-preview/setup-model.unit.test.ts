import { describe, expect, it } from "vitest";
import { initialPreviewState, previewStateSchema } from "./model.js";
import { productSetupSchema } from "./setup-model.js";

describe("the demo's saved setup record", () => {
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
