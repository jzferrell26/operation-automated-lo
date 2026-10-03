import { describe, expect, it } from "vitest";

import { findVocabularyHits } from "./forbidden-vocabulary.js";
import * as messages from "./campaign-page-messages.js";
import {
  AD_CARD,
  APPROVAL,
  APPROVER_ROLE_NOUNS,
  CAMPAIGN_CARD_LABELS,
  CAMPAIGN_COLUMNS,
  CAMPAIGNS_PAGE,
  CAMPAIGNS_TABS,
  EARLIER_FLOW_LINE,
  EARLIER_FLOW_TOPIC,
  NOTICES,
  RESULTS,
  cardFact,
  decidedLine,
  decisionParts,
  libraryEyebrow,
  listPlaces,
  retiredKept,
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
    // Writing review W-17: a loan officer remembers an open house campaign, not a "flow".
    expect(EARLIER_FLOW_TOPIC).toBe("Open house");
    expect(EARLIER_FLOW_LINE).toBe("Made with the earlier open house tool.");
    expect(APPROVAL.covers).toBe(
      "The approval covers this version and these words only. A new version needs its own approval.",
    );
    expect(NOTICES.chooseAnotherAd).toBe("Choose another ad");
    expect(AD_CARD.title).toBe("The ad");
  });

  it("say what the library says when it holds no ad, instead of inviting a choice (W-10)", () => {
    expect(CAMPAIGNS_PAGE.emptyDescriptionNoAds).toBe(
      "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then.",
    );
    expect(CAMPAIGNS_PAGE.emptyDescriptionNoAds).not.toMatch(/pick an ad/iu);
  });

  // W-15 chose "Shows in" for the campaign page; W-33 found four other places calling the whole fact
  // "Where it shows", and "Shows in:" names only the placement (the Facebook feed), so the fact is
  // labelled "Where it shows" everywhere and "Shows in:" stays step 2's sentence about the feed.
  it("say where an ad shows, and when it runs, the way every other screen does (W-33)", () => {
    expect(AD_CARD.shows).toBe("Where it shows");
    expect(AD_CARD.shows).toBe(CAMPAIGN_COLUMNS.where);
    expect(AD_CARD.shows).toBe(CAMPAIGN_CARD_LABELS.where);
    expect(CAMPAIGN_COLUMNS.runs).toBe("Dates");
    expect(CAMPAIGN_COLUMNS.runs).toBe(CAMPAIGN_CARD_LABELS.dates);
  });

  it("do not tell a reader they approved what someone else approved (W-8)", () => {
    expect(NOTICES.missingApproved).toBe(
      "This ad isn't in the library. This campaign keeps its approved version.",
    );
    expect(retiredKept("Oct 1, 2026")).toBe(
      "This ad was taken out of the library on Oct 1, 2026. This campaign keeps its approved version.",
    );
    expect(NOTICES.missingApproved).not.toMatch(/\byou\b/iu);
    expect(retiredKept("Oct 1, 2026")).not.toMatch(/\byou\b/iu);
  });

  it("name each fact on a campaign card (W-9)", () => {
    expect(cardFact(CAMPAIGN_CARD_LABELS.topic, "Refinance")).toBe("Topic: Refinance.");
    expect(cardFact(CAMPAIGN_CARD_LABELS.dates, "Oct 6 to Oct 20")).toBe("Dates: Oct 6 to Oct 20.");
    expect(cardFact(CAMPAIGN_CARD_LABELS.where, "Austin, TX and 2 more")).toBe(
      "Where it shows: Austin, TX and 2 more.",
    );
    expect(CAMPAIGN_CARD_LABELS.lastChange).toBe("Last change");
  });

  it("have no dash in any sentence", () => {
    for (const phrase of Object.values(messages).flatMap(everyString)) {
      expect(phrase, phrase).not.toMatch(/[\u2013\u2014]/u);
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
      "Set to run from launch until Tue, Oct 20, 2026, in Austin, TX. $25 a day, up to $350 in total.",
    );
    expect(runLine({ ...base, startsOn: "Tue, Oct 6, 2026" })).toBe(
      "Set to run from Tue, Oct 6, 2026 until Tue, Oct 20, 2026, in Austin, TX. $25 a day, up to $350 in total.",
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
