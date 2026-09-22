import { CampaignStateSchema } from "@oalo/contracts";
import { describe, expect, it } from "vitest";

import { findVocabularyHits } from "./forbidden-vocabulary.js";
import {
  CAMPAIGN_NEXT_ACTION_LABELS,
  CAMPAIGN_STATE_LABELS,
  ROLE_LABELS,
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

describe("the role phrases", () => {
  it("still carries no forbidden word, so the two maps are held to one rule", () => {
    for (const phrase of Object.values(ROLE_LABELS)) {
      expect(findVocabularyHits(phrase)).toEqual([]);
    }
  });
});
