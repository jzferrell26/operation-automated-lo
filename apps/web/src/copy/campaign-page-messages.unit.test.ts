import { describe, expect, it } from "vitest";

import { findVocabularyHits } from "./forbidden-vocabulary.js";
import * as messages from "./campaign-page-messages.js";
import {
  AD_CARD,
  APPROVAL,
  APPROVER_ROLE_NOUNS,
  CAMPAIGNS_PAGE,
  CAMPAIGNS_TABS,
  EARLIER_FLOW_LINE,
  NOTICES,
  RESULTS,
  decidedLine,
  decisionParts,
  libraryEyebrow,
  listPlaces,
  runLine,
  runsRange,
  savedLine,
  showsLine,
  wherePreview,
} from "./campaign-page-messages.js";

/**
 * PRD-009e. The words of the Campaigns page and the campaign page, in one file the writing review
 * reads. The source guard reads the strings; these cases read the sentences the helpers build.
 */

function everyString(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(everyString);
  return [];
}

describe("the campaign page's words", () => {
  it("carry no forbidden word and no stored token", () => {
    const strings = Object.values(messages).flatMap(everyString);
    expect(strings.length).toBeGreaterThan(40);
    for (const phrase of strings) {
      expect(findVocabularyHits(phrase), phrase).toEqual([]);
    }
  });

  it("keep the tab strip's words the library tab reads", () => {
    expect(CAMPAIGNS_TABS).toEqual({
      label: "Campaigns sections",
      campaigns: "Your campaigns",
      library: "Ads library",
    });
  });

  it("say what the design fixes, word for word", () => {
    expect(CAMPAIGNS_PAGE.emptyTitle).toBe("No campaigns yet");
    expect(CAMPAIGNS_PAGE.emptyDescription).toBe(
      "Pick an ad from the library to set up your first one.",
    );
    expect(RESULTS.notLiveSentence).toBe(
      "This ad isn't running, so there is nothing to count yet. Spend comes from Meta, and leads are counted when they reach HighLevel.",
    );
    expect(RESULTS.chip).toBe("Not live yet");
    expect(EARLIER_FLOW_LINE).toBe("Made with the earlier open house flow.");
    expect(APPROVAL.covers).toBe(
      "The approval covers this version and these words only. A new version needs its own approval.",
    );
    expect(NOTICES.chooseAnotherAd).toBe("Choose another ad");
    expect(AD_CARD.title).toBe("The ad");
  });

  it("have no dash in any sentence", () => {
    for (const phrase of Object.values(messages).flatMap(everyString)) {
      expect(phrase, phrase).not.toMatch(/[–—]/u);
    }
  });
});

describe("the sentences the helpers build", () => {
  it("writes a run range, or that the ad runs until its end date", () => {
    expect(runsRange("Oct 6", "Oct 20")).toBe("Oct 6 to Oct 20");
    expect(runsRange(undefined, "Oct 20")).toBe("Until Oct 20");
  });

  it("writes the first place and how many more", () => {
    expect(wherePreview("Austin, TX", 0)).toBe("Austin, TX");
    expect(wherePreview("Austin, TX", -1)).toBe("Austin, TX");
    expect(wherePreview("Austin, TX", 2)).toBe("Austin, TX and 2 more");
  });

  it("writes the eyebrow with or without a topic", () => {
    expect(libraryEyebrow("Refinance")).toBe("From the ads library, Refinance");
    expect(libraryEyebrow(undefined)).toBe("From the ads library");
  });

  it("joins places so a city's own comma never reads as a separator", () => {
    expect(listPlaces([])).toBe("");
    expect(listPlaces(["Austin, TX"])).toBe("Austin, TX");
    expect(listPlaces(["Austin, TX", "Texas"])).toBe("Austin, TX and Texas");
    expect(listPlaces(["Austin, TX", "Round Rock, TX", "Texas"])).toBe(
      "Austin, TX; Round Rock, TX; and Texas",
    );
  });

  it("writes the one line under the title", () => {
    const base = { endsOn: "Tue, Oct 20, 2026", places: "Austin, TX", daily: "$25", total: "$350" };

    expect(runLine({ ...base, startsOn: undefined })).toBe(
      "Runs from launch until Tue, Oct 20, 2026, in Austin, TX. $25 a day, up to $350 in total.",
    );
    expect(runLine({ ...base, startsOn: "Tue, Oct 6, 2026" })).toBe(
      "Runs from Tue, Oct 6, 2026 until Tue, Oct 20, 2026, in Austin, TX. $25 a day, up to $350 in total.",
    );
  });

  it("writes who it shows to, ending in the Facebook feed", () => {
    expect(showsLine(["Austin, TX"], "the Facebook feed")).toBe("Austin, TX, the Facebook feed");
  });

  it("writes a decision with the name beside the role, or the role alone", () => {
    const named = {
      name: "Alex Morgan",
      roleNoun: "workspace owner",
      rolePhrase: "the workspace owner",
    };
    const unnamed = {
      name: undefined,
      roleNoun: "workspace owner",
      rolePhrase: "the workspace owner",
    };

    expect(decisionParts("Approved", named)).toEqual({
      lead: "Approved by ",
      name: "Alex Morgan",
      trail: ", workspace owner, on ",
    });
    expect(decisionParts("Approved", unnamed)).toEqual({
      lead: "Approved by the workspace owner on ",
      name: undefined,
      trail: "",
    });
    expect(decidedLine("Sent back", "Sep 30, 2026", named)).toBe(
      "Sent back on Sep 30, 2026 by Alex Morgan, workspace owner",
    );
    expect(decidedLine("Approved", "Oct 1, 2026", unnamed)).toBe(
      "Approved on Oct 1, 2026 by the workspace owner",
    );
  });

  it("writes who saved a version, and says so when the viewer did", () => {
    expect(savedLine("Oct 1, 2026", false)).toBe("Saved on Oct 1, 2026");
    expect(savedLine("Oct 1, 2026", true)).toBe("Saved on Oct 1, 2026 by you");
  });

  it("names every role an approval can carry", () => {
    expect(Object.keys(APPROVER_ROLE_NOUNS).toSorted()).toEqual([
      "approver",
      "lender_approver",
      "location_admin",
      "realtor_approver",
    ]);
    for (const noun of Object.values(APPROVER_ROLE_NOUNS)) expect(noun).not.toContain("_");
  });
});
