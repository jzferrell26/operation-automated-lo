import { describe, expect, it } from "vitest";

import { WebinarSavedSchema } from "./preparation-model.js";

const saved = {
  campaignRef: "campaign_webinar001",
  campaignVersionRef: "campaignversion_webinar001",
  manifestHash: "a".repeat(64),
  preflightResultHash: "b".repeat(64),
  rowVersion: 2,
  versionNo: 2,
  state: "awaiting_approval",
  duplicate: true,
  detailHref: "/marketing/campaigns/campaign_webinar001",
  effectiveEndsAt: "2030-06-12T18:00:00.000Z",
  providerEnabled: false,
};

describe("webinar save result destination", () => {
  it("accepts the current campaign and its exact original historical version on replay", () => {
    expect(WebinarSavedSchema.safeParse(saved).success).toBe(true);
    expect(
      WebinarSavedSchema.safeParse({
        ...saved,
        detailHref: "/marketing/campaigns/campaign_webinar001/versions/2",
      }).success,
    ).toBe(true);
  });

  it.each([
    "/marketing/campaigns/campaign_foreign001",
    "/marketing/campaigns/campaign_foreign001/versions/2",
    "/marketing/campaigns/campaign_webinar001/versions/1",
    "/marketing/campaigns/campaign_webinar001/versions/02",
    "/marketing/campaigns/campaign_webinar001/versions/2?next=foreign",
    "/marketing/campaigns/campaign_webinar001/versions/2#review",
    "https://foreign.test/marketing/campaigns/campaign_webinar001/versions/2",
    "//foreign.test/marketing/campaigns/campaign_webinar001/versions/2",
    "/marketing/campaigns/campaign_webinar001/versions/2/",
  ])("refuses a destination that does not exactly identify this campaign result: %s", (href) => {
    expect(WebinarSavedSchema.safeParse({ ...saved, detailHref: href }).success).toBe(false);
  });
});
