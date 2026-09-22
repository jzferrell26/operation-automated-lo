import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { findVocabularyHits } from "../../copy/forbidden-vocabulary.js";
import {
  isMappedErrorCode,
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
      for (const match of source.matchAll(ERROR_CODE)) {
        const code = match.groups?.["code"];
        if (code !== undefined) {
          codes.add(code);
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
