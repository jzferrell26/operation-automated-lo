import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { findVocabularyHits } from "../../copy/forbidden-vocabulary.js";
import {
  isMappedErrorCode,
  showsSupportReference,
  UNKNOWN_ERROR_MESSAGE,
  USER_MESSAGES_BY_CODE,
  userMessageForCode,
  userMessageSentence,
} from "./user-messages.js";

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");

/**
 * Where a route's answer is built. Every `{ "error": "CODE" }` a browser can receive is written in
 * one of these, so scanning them is how PRD-006b 006B-AC-007's "every code the routes export" is
 * decided rather than guessed at from a hand-kept list that drifts.
 */
const HANDLER_ROOTS: readonly string[] = ["apps/web/src/app/api", "apps/web/src/server"];

/**
 * Codes a handler emits that are not answers to a browser, so they need no sentence.
 *
 * The health and version routes answer a monitor, not a person, and their bodies are read by the
 * deployment's own checks (`apps/web/src/app/api/health/**`). Nothing renders them in the product.
 */
const NOT_SHOWN_TO_A_USER: readonly Readonly<{ code: string; because: string }>[] = [
  { code: "READY", because: "The readiness route's own status word, read by a monitor." },
  { code: "DEPENDENCY_DEGRADED", because: "A readiness answer for a monitor, never a screen." },
  { code: "DEPENDENCY_UNAVAILABLE", because: "A readiness answer for a monitor, never a screen." },
  {
    code: "DEPENDENCY_PROBES_NOT_CONFIGURED",
    because: "A readiness answer for a monitor, never a screen.",
  },
  { code: "CONFIGURATION_INVALID", because: "A readiness answer for a monitor, never a screen." },
  {
    code: "RELEASE_MANIFEST_INVALID",
    because: "A readiness answer for a monitor, never a screen.",
  },
];

const ERROR_CODE = /\b(?:error|code)\b\s*[:,]\s*"(?<code>[A-Z][A-Z0-9_]{4,})"/gu;

/**
 * A code held as a record value, the way the approve route keeps its four library refusals
 * (`missing: "LIBRARY_AD_MISSING"` in `campaign-approval-handler.ts`), is not written as `error:` or
 * `code:`, so `ERROR_CODE` cannot see it and the test passed with those four unmapped (writing
 * review pass 1, guard gap 1). This second pattern reads a `key: "LIBRARY_AD_..."` pair.
 */
const RECORD_VALUE_CODE = /\b\w+\s*:\s*"(?<code>LIBRARY_AD_[A-Z0-9_]+)"/gu;

/**
 * The four refusals the approve route answers with 409 (`LIBRARY_AD_REFUSAL_CODES`). Named here as
 * well as found by the scan, so removing any one entry from `user-messages.ts` fails a test even if
 * the handler's shape changes again.
 */
const APPROVE_LIBRARY_AD_REFUSALS: readonly string[] = [
  "LIBRARY_AD_MISSING",
  "LIBRARY_AD_RETIRED",
  "LIBRARY_AD_REPLACED",
  "LIBRARY_AD_ART_CHANGED",
];

async function collectEmittedCodes(): Promise<readonly string[]> {
  const codes = new Set<string>();

  for (const root of HANDLER_ROOTS) {
    const entries = await readdir(join(repositoryRoot, root), {
      withFileTypes: true,
      recursive: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) {
        continue;
      }
      const source = await readFile(join(entry.parentPath, entry.name), "utf8");
      for (const pattern of [ERROR_CODE, RECORD_VALUE_CODE]) {
        for (const match of source.matchAll(pattern)) {
          const code = match.groups?.["code"];
          if (code !== undefined) {
            codes.add(code);
          }
        }
      }
    }
  }

  return [...codes].sort();
}

describe("error codes become sentences", () => {
  it("has a sentence pair for every code a route can hand the browser", async () => {
    const excluded = new Set(NOT_SHOWN_TO_A_USER.map((entry) => entry.code));
    const unmapped = (await collectEmittedCodes()).filter(
      (code) => !excluded.has(code) && !isMappedErrorCode(code),
    );

    expect(unmapped).toEqual([]);
  });

  it("finds the four approve refusals that the route keeps as record values", async () => {
    const found = await collectEmittedCodes();

    for (const code of APPROVE_LIBRARY_AD_REFUSALS) {
      expect(found, code).toContain(code);
    }
  });

  it.each(APPROVE_LIBRARY_AD_REFUSALS)("maps %s to its own plain sentences", (code) => {
    expect(isMappedErrorCode(code)).toBe(true);
    expect(userMessageForCode(code)).not.toBe(UNKNOWN_ERROR_MESSAGE);
    expect(userMessageSentence(code)).not.toContain("on our side");
    expect(userMessageSentence(code)).toContain("can't be approved.");
  });

  it("tells the person who pressed Approve what to do, in the four refusals' own words", () => {
    expect(userMessageSentence("LIBRARY_AD_MISSING")).toBe(
      "This ad isn't in the library, so this version can't be approved. Choose another ad. Your budget, dates and area are kept.",
    );
    expect(userMessageSentence("LIBRARY_AD_RETIRED")).toBe(
      "This ad was taken out of the library, so this version can't be approved. Choose another ad. Your budget, dates and area are kept.",
    );
    expect(userMessageSentence("LIBRARY_AD_REPLACED")).toBe(
      "A newer version of this ad is in the library, so this version can't be approved. Use the new version of the ad, then approve that one.",
    );
    expect(userMessageSentence("LIBRARY_AD_ART_CHANGED")).toBe(
      "The picture for this ad changed after this version was saved, so this version can't be approved. Make a new version from the ad, then approve that one.",
    );
  });

  // Writing review pass 2, W-30. "Pick it again" cannot work for an ad that was taken out, "kept" is
  // untrue for a new campaign (its drafts are held per ad), and the campaign page has no "Choose an
  // ad" to go back to. "Choose another ad" is true on both.
  it("tells a person whose ad has left the library to choose another, and to check what they set", () => {
    expect(userMessageSentence("LIBRARY_AD_NOT_AVAILABLE")).toBe(
      "This ad isn't in the library any more, or a newer version replaced it. Choose another ad. Check the words, budget and area before you save.",
    );
  });

  it("sends the approver to the campaign creator when the checks are not passing", () => {
    expect(userMessageSentence("CAMPAIGN_APPROVAL_NOT_READY")).toBe(
      "This campaign isn't ready to approve yet. Ask the campaign creator to fix what the checks found and save a new version, then approve that one.",
    );
  });

  // Writing review W-18. The guided setup is gone, and so is the Marketing menu this sentence named.
  it("sends a person to a place that exists when the guided setup is unavailable", () => {
    expect(userMessageSentence("SETUP_PREFERENCE_UNAVAILABLE")).toBe(
      "The guided setup isn't available in this workspace. You can still launch an ad from Campaigns.",
    );
    expect(userMessageSentence("SETUP_PREFERENCE_UNAVAILABLE")).not.toMatch(/Marketing menu/u);
  });

  /**
   * Writing review pass 2, W-27. "Contact support with the reference below" was said, and nothing
   * was below: a mapped code showed no support reference, and the step that said it never drew one.
   * The rule is written down once, in `showsSupportReference`: a reference shows for a code with no
   * sentence of its own, and for a code whose own sentence points at it.
   */
  describe("the support reference a sentence points at (writing review W-27)", () => {
    it("says what to give support, and where it is, for a failed save", () => {
      expect(userMessageSentence("CAMPAIGN_PREFLIGHT_FAILED")).toBe(
        "We couldn't finish the checks on this campaign. Try again. If it keeps happening, contact support and give them the support reference below.",
      );
    });

    it('shows a reference for every code whose sentence says "reference below"', () => {
      const pointing = Object.entries(USER_MESSAGES_BY_CODE).filter(([, message]) =>
        /reference below/u.test(`${message.what} ${message.whatToDo}`),
      );
      expect(pointing.map(([code]) => code)).toContain("CAMPAIGN_PREFLIGHT_FAILED");
      for (const [code] of pointing) {
        expect(showsSupportReference(code), code).toBe(true);
      }
    });

    it("also shows one for a code with no sentence of its own, and for a request that never answered", () => {
      expect(showsSupportReference("A_CODE_FROM_THE_FUTURE")).toBe(true);
      expect(showsSupportReference(undefined)).toBe(true);
    });

    it("shows none for a code whose sentence needs none", () => {
      expect(showsSupportReference("LIBRARY_AD_NOT_AVAILABLE")).toBe(false);
      expect(showsSupportReference("CAMPAIGN_APPROVAL_CONFLICT")).toBe(false);
      expect(showsSupportReference("UNAUTHENTICATED")).toBe(false);
    });

    it("never points at a reference from the generic sentence, which the reference always accompanies", () => {
      expect(userMessageSentence(undefined)).not.toMatch(/reference below/u);
    });
  });

  it("states a reason for every code it does not map", () => {
    expect(NOT_SHOWN_TO_A_USER.every((entry) => entry.because.length > 20)).toBe(true);
  });

  it("says what happened and what to do, in every entry", () => {
    for (const [code, message] of Object.entries(USER_MESSAGES_BY_CODE)) {
      expect(message.what.length, code).toBeGreaterThan(10);
      expect(message.whatToDo.length, code).toBeGreaterThan(10);
      expect(message.what.endsWith("."), code).toBe(true);
      expect(message.whatToDo.endsWith("."), code).toBe(true);
    }
  });

  it("never renders the code itself, in any sentence", () => {
    for (const [code, message] of Object.entries(USER_MESSAGES_BY_CODE)) {
      const sentence = `${message.what} ${message.whatToDo}`;
      expect(sentence.includes(code), code).toBe(false);
      expect(findVocabularyHits(sentence), code).toEqual([]);
    }
    expect(findVocabularyHits(userMessageSentence(undefined))).toEqual([]);
  });

  it("falls back to an honest generic answer for a code it has never seen", () => {
    expect(userMessageForCode("A_CODE_FROM_THE_FUTURE")).toBe(UNKNOWN_ERROR_MESSAGE);
    expect(userMessageForCode(undefined)).toBe(UNKNOWN_ERROR_MESSAGE);
    expect(isMappedErrorCode("A_CODE_FROM_THE_FUTURE")).toBe(false);
    expect(isMappedErrorCode(undefined)).toBe(false);
    expect(userMessageSentence("A_CODE_FROM_THE_FUTURE")).toBe(
      "Something went wrong on our side. Try again, and contact support if it keeps happening.",
    );
  });

  it("maps the three codes the sub-PRD names, word for word", () => {
    expect(userMessageSentence("CAMPAIGN_APPROVAL_CONFLICT")).toBe(
      "This campaign changed since you opened it. Refresh the page and look again before approving.",
    );
    expect(userMessageSentence("UNAUTHENTICATED")).toBe(
      "You've been signed out. Sign in again to continue.",
    );
    expect(userMessageSentence("WORKSPACE_UNAVAILABLE")).toBe(
      "We can't reach your workspace right now. Try again in a minute.",
    );
  });
});
