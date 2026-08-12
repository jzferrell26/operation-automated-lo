import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:crypto", () => ({
  createHash: () => ({
    update() {
      return this;
    },
    digest() {
      return "a".repeat(64);
    },
  }),
}));

import { createCampaignProjections } from "@oalo/application";
import {
  CampaignVersionSchema,
  CollateralProjectionInputSchema,
  PaidAdProjectionInputSchema,
} from "@oalo/contracts";

describe("campaign projection hash collision guard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fails closed if distinct projection bodies produce the same digest", () => {
    vi.spyOn(CampaignVersionSchema, "parse").mockReturnValue({
      locationRef: "location_01TenantA",
      campaignRef: "campaign_01OpenHouse",
      campaignVersionRef: "version_01Campaign",
    } as never);
    vi.spyOn(CollateralProjectionInputSchema, "parse").mockReturnValue({
      locationRef: "location_01TenantA",
      campaignRef: "campaign_01OpenHouse",
      campaignVersionRef: "version_01Campaign",
      projectionRef: "projection_01Collateral",
      approvalSummary: { previewRef: "preview_01Collateral" },
    } as never);
    vi.spyOn(PaidAdProjectionInputSchema, "parse").mockReturnValue({
      locationRef: "location_01TenantA",
      campaignRef: "campaign_01OpenHouse",
      campaignVersionRef: "version_01Campaign",
      projectionRef: "projection_01PaidAd",
      approvalSummary: { previewRef: "preview_01PaidAd" },
    } as never);

    expect(() =>
      createCampaignProjections({ campaignVersion: {}, collateral: {}, paidAd: {} }),
    ).toThrow("must have separate hashes");
  });
});
