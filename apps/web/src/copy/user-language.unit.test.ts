import { CampaignStateSchema } from "@oalo/contracts";
import { describe, expect, it } from "vitest";

import { findVocabularyHits } from "./forbidden-vocabulary.js";
import * as userLanguage from "./user-language.js";
import {
  CAMPAIGN_AD_RETIRED_LABEL,
  CAMPAIGN_NEXT_ACTION_LABELS,
  CAMPAIGN_NOT_AN_AD_YET,
  CAMPAIGN_SENT_BACK_LABEL,
  CAMPAIGN_STATE_LABELS,
  CAMPAIGN_VERSION_REPLACED_LABEL,
  CHECK_RESULT_PASSED,
  NEEDS_CHANGES_NEXT_ACTION,
  NOT_CONNECTED_DISCLOSURE,
  NOT_CONNECTED_NEXT_STEP,
  NOT_CONNECTED_SOURCE,
  NOT_LIVE_METRIC_SOURCE,
  ROLE_LABELS,
  SIGNED_IN_SOURCE,
  campaignStateLabel,
} from "./user-language.js";

/**
 * PRD-006b 006B-AC-008, the half a source scan cannot prove.
 *
 * The forbidden-vocabulary guard reads this module like any other and would catch a banned word in
 * a phrase that is written here. What it cannot catch is a phrase that is missing: a campaign state
 * with no entry in the map is not a forbidden string, it is an empty one, and before these maps
 * existed the three screens filled that gap by taking the underscores out of the stored token, so
 * `preflight_failed` reached a loan officer as "Preflight failed".
 *
 * These cases pin both halves: every state and every step the product can be in has words, and
 * none of those words is a word the contract bans.
 */

describe("the campaign state phrases", () => {
  it("names every state the schema allows", () => {
    for (const state of CampaignStateSchema.options) {
      expect(CAMPAIGN_STATE_LABELS[state], state).toMatch(/[A-Za-z]/u);
    }
    expect(Object.keys(CAMPAIGN_STATE_LABELS).toSorted()).toEqual(
      [...CampaignStateSchema.options].toSorted(),
    );
  });

  it("never renders the stored token, and never a forbidden word", () => {
    for (const [state, phrase] of Object.entries(CAMPAIGN_STATE_LABELS)) {
      expect(findVocabularyHits(phrase), `${state} reads "${phrase}"`).toEqual([]);
      expect(phrase).not.toContain("_");
    }
  });

  /**
   * The row the verifier reopened. It is named on its own so a future edit that reaches for
   * "Preflight failed" again fails on the sentence rather than on a generic sweep.
   */
  it("says the checks found something rather than naming the check", () => {
    expect(CAMPAIGN_STATE_LABELS.preflight_failed).toBe("Needs changes");
    expect(CAMPAIGN_STATE_LABELS.awaiting_approval).toBe("Ready for approval");
  });
});

/**
 * Finding S1b of the 2026-10-01 writing review. A send-back leaves a campaign in `awaiting_approval`,
 * so where it stands has to read the recorded decision as well as the state, or a version that was
 * just sent back is labelled "Ready for approval".
 */
describe("where a campaign stands once somebody has decided on it", () => {
  it("says a version that waits and was sent back was sent back", () => {
    expect(campaignStateLabel("awaiting_approval", "rejected")).toBe("Sent back for changes");
    expect(CAMPAIGN_SENT_BACK_LABEL).toBe("Sent back for changes");
  });

  it("keeps every other state's phrase, with or without a decision", () => {
    expect(campaignStateLabel("awaiting_approval", undefined)).toBe("Ready for approval");
    for (const state of CampaignStateSchema.options) {
      expect(campaignStateLabel(state, undefined), state).toBe(CAMPAIGN_STATE_LABELS[state]);
      if (state !== "awaiting_approval") {
        expect(campaignStateLabel(state, "rejected"), state).toBe(CAMPAIGN_STATE_LABELS[state]);
        expect(campaignStateLabel(state, "approved"), state).toBe(CAMPAIGN_STATE_LABELS[state]);
      }
    }
  });

  it("carries no forbidden word and no stored token", () => {
    for (const phrase of [CAMPAIGN_SENT_BACK_LABEL, CHECK_RESULT_PASSED]) {
      expect(findVocabularyHits(phrase), phrase).toEqual([]);
      expect(phrase).not.toContain("_");
    }
  });
});

/**
 * PRD-009e 009E-AC-010. Nothing in PRD-009 can publish an ad, so no screen can truthfully say a
 * campaign is "Live" or "Going live", and the three words the list adds say what is true of a version
 * the library or a person has acted on.
 */
describe("the campaign standings the list and the campaign page read (009E-AC-010)", () => {
  it("has no state phrase that says a campaign is live or going live", () => {
    for (const [state, phrase] of Object.entries(CAMPAIGN_STATE_LABELS)) {
      expect(phrase, state).not.toMatch(/\b(?:live|going live|launched|running)\b/iu);
    }
    expect(Object.values(CAMPAIGN_STATE_LABELS)).not.toContain("Live");
    expect(Object.values(CAMPAIGN_STATE_LABELS)).not.toContain("Going live");
  });

  it("says Ad retired, Sent back for changes, and Needs changes in the product's own words", () => {
    expect(CAMPAIGN_AD_RETIRED_LABEL).toBe("Ad retired");
    expect(campaignStateLabel("ad_retired", undefined)).toBe("Ad retired");
    expect(campaignStateLabel("awaiting_approval", "rejected")).toBe("Sent back for changes");
    expect(campaignStateLabel("preflight_failed", undefined)).toBe("Needs changes");
  });

  it("says a version nobody decided on that a newer one replaced was replaced", () => {
    expect(campaignStateLabel("replaced", undefined)).toBe(CAMPAIGN_VERSION_REPLACED_LABEL);
    expect(CAMPAIGN_VERSION_REPLACED_LABEL).toBe("Replaced by a newer version");
  });

  it("reads a standing the same with or without a decision, except a send-back", () => {
    for (const standing of ["ad_retired", "replaced"] as const) {
      for (const decision of [undefined, "approved", "rejected"] as const) {
        expect(campaignStateLabel(standing, decision), `${standing}/${String(decision)}`).toBe(
          campaignStateLabel(standing, undefined),
        );
      }
    }
  });

  it("carries no forbidden word and no stored token", () => {
    for (const phrase of [CAMPAIGN_AD_RETIRED_LABEL, CAMPAIGN_VERSION_REPLACED_LABEL]) {
      expect(findVocabularyHits(phrase), phrase).toEqual([]);
      expect(phrase).not.toContain("_");
    }
  });
});

describe("the campaign next-step phrases", () => {
  it("gives every step the application layer can name a sentence with no forbidden word", () => {
    const keys = Object.keys(CAMPAIGN_NEXT_ACTION_LABELS);
    expect(keys.length).toBeGreaterThan(0);
    for (const [id, phrase] of Object.entries(CAMPAIGN_NEXT_ACTION_LABELS)) {
      expect(findVocabularyHits(phrase), `${id} reads "${phrase}"`).toEqual([]);
      expect(phrase.trim().length).toBeGreaterThan(0);
    }
  });
});

/**
 * PRD-009f 009F-AC-008, and decision D-8.
 *
 * Ads need two accounts, HighLevel for the leads and Meta for the ads, so a sentence about them
 * names those two and no other. Billing lives under Settings, Account, "Plan and usage", where the
 * page says what it says; a connection sentence that names a payment provider tells a loan officer
 * something the ads do not need. The check reads every string the module exports, nested ones
 * included, so a new constant is held to it the moment it is added.
 */
function everyString(
  value: unknown,
  path: string,
): readonly Readonly<{ path: string; text: string }>[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, inner]) => everyString(inner, `${path}.${key}`));
}

describe("the connection sentences", () => {
  it("name HighLevel and Meta and never a payment provider", () => {
    for (const { path, text } of everyString({ ...userLanguage }, "user-language")) {
      expect(text, path).not.toMatch(/stripe/iu);
    }
    for (const sentence of [
      NOT_CONNECTED_DISCLOSURE,
      NOT_CONNECTED_SOURCE,
      NOT_CONNECTED_NEXT_STEP,
    ]) {
      expect(sentence).toMatch(/HighLevel and Meta/u);
    }
  });

  /**
   * Writing review pass 2, W-28. No screen can connect HighLevel or Meta in PRD-009 (its non-goal),
   * and launching is off even with both connected. So no connection sentence asks the reader to
   * connect, and none says connecting is all an ad needs. They say what is true: it is not
   * available in the app yet, and what the ad needs.
   */
  it("never asks the reader to connect an account, because no screen can do that yet", () => {
    for (const sentence of [
      NOT_CONNECTED_NEXT_STEP,
      NOT_LIVE_METRIC_SOURCE,
      CAMPAIGN_NOT_AN_AD_YET,
    ]) {
      expect(sentence).not.toMatch(/\bconnect\b/iu);
      expect(sentence).not.toMatch(/when you.re ready/iu);
    }
    expect(NOT_CONNECTED_NEXT_STEP).toBe(
      "Connecting HighLevel and Meta isn't available in the app yet. Nothing here changes in the meantime.",
    );
    expect(NOT_LIVE_METRIC_SOURCE).toBe(
      "Not live yet. Spend and leads can't show here until Meta and HighLevel are connected.",
    );
  });

  it("says launching is off as well as the accounts, when it says a campaign won't run", () => {
    expect(CAMPAIGN_NOT_AN_AD_YET).toBe(
      "This campaign won't run as an ad yet. Launching isn't turned on, and HighLevel and Meta aren't connected.",
    );
    expect(CAMPAIGN_NEXT_ACTION_LABELS.provider_publish).toBe(CAMPAIGN_NOT_AN_AD_YET);
  });

  it("has no constant left that nothing reads", () => {
    expect(Object.keys(userLanguage)).not.toContain("CAMPAIGN_SAVED_NOTICE");
  });

  it("says only who is signed in on the account line", () => {
    expect(SIGNED_IN_SOURCE).toBe("Signed in with your email.");
  });

  it("no longer carries a name for the shell-wide banner that is gone", () => {
    expect(Object.keys(userLanguage)).not.toContain("NOT_CONNECTED_BANNER_LABEL");
  });
});

/**
 * PRD-008 follow-up Quality L-2, closed by 009F-AC-008. "Fix what the checks found, then save it
 * again." was said to every reader of a version whose checks need changes, including an approver who
 * cannot make a new version. The sentence now says who can.
 */
describe("what to do about a version whose checks found something", () => {
  it("names the person who can make the new version, for every reader", () => {
    expect(NEEDS_CHANGES_NEXT_ACTION).toBe(
      "The campaign creator fixes what the checks found and saves it again.",
    );
    expect(CAMPAIGN_NEXT_ACTION_LABELS.remediate_preflight).toBe(NEEDS_CHANGES_NEXT_ACTION);
    expect(findVocabularyHits(NEEDS_CHANGES_NEXT_ACTION)).toEqual([]);
  });
});

describe("the role phrases", () => {
  it("still carries no forbidden word, so the two maps are held to one rule", () => {
    for (const phrase of Object.values(ROLE_LABELS)) {
      expect(findVocabularyHits(phrase)).toEqual([]);
    }
  });
});
