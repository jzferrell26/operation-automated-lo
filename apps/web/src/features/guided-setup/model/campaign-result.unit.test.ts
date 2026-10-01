import { describe, expect, it } from "vitest";

import { campaignStanding, type SetupCampaignResult } from "./campaign-result.js";

/**
 * PRD-008b 008B-AC-011. One answer to "where does this campaign stand", for every step that talks
 * about it.
 *
 * Steps 5, 6, and 7 each say something about the campaign, and each used to answer from a different
 * part of the record or from none: step 5 from the check result alone, step 6 from who is looking,
 * and step 7 from nothing, so it said "approved" to everybody. A decision beats the check result,
 * because it is the recorded fact and a decided version has already passed its checks. The check
 * result beats waiting, because a version that fails them is waiting for its author and nobody
 * else. A campaign the walkthrough could not read has no standing, and the steps say less about it
 * rather than guess.
 */

function campaign(overrides: Partial<SetupCampaignResult>): SetupCampaignResult {
  return {
    campaignRef: "campaign_standing001",
    detailHref: "/x",
    ready: true,
    findings: [],
    ...overrides,
  };
}

describe("where a campaign stands, as the walkthrough reads it", () => {
  it.each([
    ["is unknown when the campaign could not be read", undefined, "unknown"],
    ["is waiting when the checks passed and nobody has decided", campaign({}), "waiting"],
    [
      "needs changes when the checks found something to fix",
      campaign({ ready: false }),
      "needs_changes",
    ],
    ["is approved once an approval is recorded", campaign({ decision: "approved" }), "approved"],
    ["is sent back once a rejection is recorded", campaign({ decision: "rejected" }), "sent_back"],
  ] as const)("%s", (_what, result, standing) => {
    expect(campaignStanding(result)).toBe(standing);
  });

  it("lets a recorded decision speak before the check result does", () => {
    expect(campaignStanding(campaign({ ready: false, decision: "approved" }))).toBe("approved");
    expect(campaignStanding(campaign({ ready: false, decision: "rejected" }))).toBe("sent_back");
  });

  it("treats an explicit undefined decision as no decision", () => {
    expect(campaignStanding(campaign({ decision: undefined }))).toBe("waiting");
  });
});
