import { PREFLIGHT_RULESET_REGISTRY } from "@oalo/application";
import { describe, expect, it } from "vitest";

import { RULE_PLAIN_NAMES } from "../../copy/launch-messages.js";
import {
  FIX_TARGETS,
  budgetProblems,
  cancelHref,
  defaultPrefill,
  fixTargetFor,
  launchHref,
  launchSentenceFor,
  parseLaunchAddress,
  type LaunchAdCard,
} from "./launch-model.js";

const CARD: LaunchAdCard = {
  id: "sample-first-home",
  version: 2,
  topic: "first-time-buyers",
  name: "Sample: First home, start here",
  headline: "Thinking about your first home? Start here.",
  primaryText: "Send me a message.",
  headlineMaxLength: 60,
  primaryTextMaxLength: 300,
  callToAction: "LEARN_MORE",
  alt: "A house drawn in simple shapes under a large mark",
  art: { tall: "/t.png", square: "/s.png" },
  approvedOn: "2026-09-28",
  sample: true,
};

describe("the launch address (D1, 009D-AC-001)", () => {
  it("reads typed values and defaults everything else", () => {
    expect(
      parseLaunchAddress({
        step: "2",
        topic: "refinance",
        ad: "sample-first-home",
        from: "home",
        campaign: "campaign_0123456789abcdef",
      }),
    ).toEqual({
      step: 2,
      topic: "refinance",
      ad: "sample-first-home",
      from: "home",
      campaign: "campaign_0123456789abcdef",
    });
  });

  it("ignores any other value: a URL in from, step 9, an unknown topic, and a path in ad", () => {
    expect(
      parseLaunchAddress({
        from: "https://example.invalid",
        step: "9",
        topic: "x",
        ad: "../etc/passwd",
        campaign: "javascript:alert(1)",
      }),
    ).toEqual({ step: 1, topic: undefined, ad: undefined, from: undefined, campaign: undefined });
    expect(parseLaunchAddress({ step: ["2", "3"], from: ["home"] })).toMatchObject({
      step: 1,
      from: undefined,
    });
  });

  it("only ever builds addresses inside the application", () => {
    for (const from of [undefined, "home", "campaigns", "library"] as const) {
      expect(cancelHref(from)).toMatch(/^\/(?:overview|marketing\/campaigns(?:\/library)?)$/u);
    }
    expect(cancelHref(parseLaunchAddress({ from: "https://example.invalid" }).from)).toBe(
      "/marketing/campaigns",
    );
    expect(launchHref({ step: 2, ad: "sample-first-home", from: "library" })).toBe(
      "/marketing/campaigns/new?step=2&ad=sample-first-home&from=library",
    );
    expect(launchHref({ step: 2, campaign: "campaign_0123456789abcdef" }, "brand")).toBe(
      "/marketing/campaigns/new?step=2&campaign=campaign_0123456789abcdef#brand",
    );
  });
});

describe("budget and dates (D6, 009D-AC-007)", () => {
  it("prefills $25 a day, ending 14 days out, $350 in total", () => {
    expect(defaultPrefill(CARD, "2026-10-02")).toMatchObject({
      dailyBudgetDollars: 25,
      totalBudgetDollars: 350,
      endsOn: "2026-10-16",
      places: [],
    });
  });

  it("refuses a daily budget outside $5 to $1,000 and a total outside $5 to $5,000", () => {
    expect(budgetProblems(25, 350)).toEqual([]);
    expect(budgetProblems(5, 5_000)).toEqual([]);
    expect(budgetProblems(4.99, 350)).toEqual(["daily"]);
    expect(budgetProblems(1_000.01, 350)).toEqual(["daily"]);
    expect(budgetProblems(25, 5_000.01)).toEqual(["total"]);
    expect(budgetProblems(25, 4)).toEqual(["total"]);
    expect(budgetProblems(Number.NaN, Number.NaN)).toEqual(["daily", "total"]);
  });
});

describe("the launch sentence (D7, 009D-AC-016)", () => {
  it("chooses one sentence for every row of D7", () => {
    expect(
      launchSentenceFor({
        metaConnected: false,
        retiredOn: null,
        approved: false,
        launchingTurnedOn: false,
      }),
    ).toEqual({ kind: "meta-not-connected" });
    for (const approved of [true, false]) {
      expect(
        launchSentenceFor({
          metaConnected: false,
          retiredOn: "Oct 1, 2026",
          approved,
          launchingTurnedOn: true,
        }),
      ).toEqual({ kind: "meta-not-connected" });
      expect(
        launchSentenceFor({
          metaConnected: true,
          retiredOn: "Oct 1, 2026",
          approved,
          launchingTurnedOn: true,
        }),
      ).toEqual({ kind: "retired", retiredOn: "Oct 1, 2026" });
    }
    expect(
      launchSentenceFor({
        metaConnected: true,
        retiredOn: null,
        approved: false,
        launchingTurnedOn: true,
      }),
    ).toEqual({ kind: "not-approved" });
    expect(
      launchSentenceFor({
        metaConnected: true,
        retiredOn: null,
        approved: true,
        launchingTurnedOn: false,
      }),
    ).toEqual({ kind: "not-turned-on" });
    // Nothing in PRD-009 can turn launching on, so every input true still has no launch to offer.
    expect(
      launchSentenceFor({
        metaConnected: true,
        retiredOn: null,
        approved: true,
        launchingTurnedOn: true,
      }),
    ).toEqual({ kind: "not-turned-on" });
  });
});

describe("Fix it (009D-AC-019) and See what we checked (009D-AC-014)", () => {
  const everyCode = [
    ...new Set([
      ...PREFLIGHT_RULESET_REGISTRY.ruleset_libraryAd001,
      ...PREFLIGHT_RULESET_REGISTRY.ruleset_openHouseFounding001,
    ]),
  ].sort();

  it("has a place to fix and a plain name for every rule code in the registry, and no other", () => {
    expect(Object.keys(FIX_TARGETS).sort()).toEqual(everyCode);
    expect(Object.keys(RULE_PLAIN_NAMES).sort()).toEqual(everyCode);
    expect(RULE_PLAIN_NAMES.WORDS_PRIVATE_INFO_REQUEST).toBe("Doesn't ask for private details");
  });

  // Writing review pass 2, W-32. A name says what the check does, in the same shape as its
  // neighbours ("Images are large enough"), and never that an ad "runs", which nothing can in PRD-009.
  it("names the checks that said less, or something untrue, by what they check", () => {
    expect(RULE_PLAIN_NAMES.META_HOUSING_CATEGORY_REQUIRED).toBe("Marked as a housing ad for Meta");
    expect(RULE_PLAIN_NAMES.WORDS_NUMBER).toBe("No numbers in the words, except your NMLS number");
    expect(RULE_PLAIN_NAMES.WORDS_TOO_LONG).toBe("Words are within this ad's length limit");
    expect(RULE_PLAIN_NAMES.IMAGE_QUALITY_LOW).toBe("Images are large enough");
    for (const [code, name] of Object.entries(RULE_PLAIN_NAMES)) {
      expect(name, code).not.toMatch(/runs?/iu);
    }
  });

  it("sends the words, budget, dates, and area to step 2, and a retired ad to step 1", () => {
    expect(fixTargetFor({ ruleCode: "WORDS_TOO_LONG", affected: "content.headline" })).toEqual({
      step: 2,
      at: "words",
    });
    expect(fixTargetFor({ ruleCode: "BUDGET_OUT_OF_BOUNDS", affected: "meta" })).toEqual({
      step: 2,
      at: "budget",
    });
    expect(fixTargetFor({ ruleCode: "RUN_DATES_INVALID", affected: "schedule.endsAt" })).toEqual({
      step: 2,
      at: "budget",
    });
    expect(fixTargetFor({ ruleCode: "TARGETING_NOT_ALLOWED", affected: "meta.targeting" })).toEqual(
      { step: 2, at: "area" },
    );
    expect(fixTargetFor({ ruleCode: "LIBRARY_AD_RETIRED", affected: "libraryAd" })).toEqual({
      step: 1,
    });
    for (const code of ["NMLS_NUMBER_REQUIRED", "EQUAL_HOUSING_REQUIRED", "DISCLOSURE_REQUIRED"]) {
      expect(fixTargetFor({ ruleCode: code, affected: "advertiser.nmls" }), code).toEqual({
        step: 2,
        at: "brand",
      });
    }
  });

  it("sends a word finding to the words when it is in the headline or ad text, and to Brand otherwise", () => {
    for (const code of [
      "WORDS_PRIVATE_INFO_REQUEST",
      "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
      "WORDS_NUMBER",
      "WORDS_CO_BRAND",
      "WORDS_INVALID_CHARACTERS",
    ]) {
      expect(fixTargetFor({ ruleCode: code, affected: "content.headline" }), code).toEqual({
        step: 2,
        at: "words",
      });
      expect(fixTargetFor({ ruleCode: code, affected: "content.body" }), code).toEqual({
        step: 2,
        at: "words",
      });
      for (const brandPath of [
        "advertiser.name",
        "advertiser.title",
        "advertiser.company",
        "content.disclosureText",
        "content.consentText",
      ]) {
        expect(
          fixTargetFor({ ruleCode: code, affected: brandPath }),
          `${code} ${brandPath}`,
        ).toEqual({ step: 2, at: "brand" });
      }
    }
  });
});
