import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { GUIDED_SETUP_STEPS } from "../../copy/guided-setup-messages.js";
import { findVocabularyHits } from "../../copy/forbidden-vocabulary.js";
import { GUIDED_SETUP_STEP_DEFINITIONS } from "./steps/step-model.js";

/**
 * PRD-006c 006C-AC-017, 006C-AC-018, and the D3 budget arithmetic, as source facts.
 *
 * Three claims that are cheap to state and expensive to discover by hand:
 *
 * - Nothing in the guided setup reaches browser storage. Progress is server-side per person and
 *   per workspace, which is what makes a shared computer safe and a second machine resume; one
 *   `localStorage.setItem` would quietly undo all of that.
 * - No step offers to connect, publish, or spend. The walkthrough ends by saying what is not
 *   connected, and a control that contradicted that sentence would be worse than no walkthrough.
 * - The seven budgets still add up to what D3 says they do, so a budget cannot be quietly raised
 *   to make a failing timed run pass.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");

const SCANNED_PATHS: readonly string[] = [
  "apps/web/src/features/guided-setup",
  "apps/web/src/server/setup-preferences.ts",
  "apps/web/src/app/api/setup",
];

const BROWSER_STORAGE = /\b(?:localStorage|sessionStorage|indexedDB|IndexedDB|openDatabase)\b/u;

function isTestFile(name: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(name);
}

async function collectSources(): Promise<readonly Readonly<{ path: string; source: string }>[]> {
  const collected: { path: string; source: string }[] = [];
  for (const entry of SCANNED_PATHS) {
    const absolute = join(repositoryRoot, entry);
    const files =
      extname(absolute).length > 0
        ? [absolute]
        : (await readdir(absolute, { recursive: true, withFileTypes: true }))
            .filter(
              (found) =>
                found.isFile() &&
                !isTestFile(found.name) &&
                [".ts", ".tsx"].includes(extname(found.name)),
            )
            .map((found) => join(found.parentPath, found.name));
    for (const file of files) {
      collected.push({
        path: relative(repositoryRoot, file).replaceAll("\\", "/"),
        source: await readFile(file, "utf8"),
      });
    }
  }
  return collected;
}

describe("guided setup constraints", () => {
  it("never reads or writes browser storage", async () => {
    const offenders: string[] = [];
    for (const { path, source } of await collectSources()) {
      for (const line of source.split("\n")) {
        // A comment saying the feature does not use storage is not a use of storage.
        const code = line.replace(/^\s*(?:\/\/|\*|\/\*).*$/u, "");
        if (BROWSER_STORAGE.test(code)) offenders.push(`${path}: ${line.trim()}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("closes by naming every account that is not connected", () => {
    const closing = GUIDED_SETUP_STEPS.whatHappensNext.body;
    expect(closing).toContain("won't run as an ad yet");
    expect(closing).toContain("HighLevel");
    expect(closing).toContain("Meta");
    // The third account is named by the shared not-connected sentence the last step renders
    // beside this body; `guided-setup-steps.integration.test.tsx` asserts both are on screen.
  });

  it("offers no connect, publish, or spend wording anywhere in the step copy", () => {
    const everyString = JSON.stringify(GUIDED_SETUP_STEPS);
    for (const forbidden of ["Connect ", "Publish", "Launch now", "Pay ", "Add a card"]) {
      expect(everyString, forbidden).not.toContain(forbidden);
    }
  });

  it("keeps every step's copy inside the user-language contract", () => {
    for (const [name, step] of Object.entries(GUIDED_SETUP_STEPS)) {
      for (const [field, value] of Object.entries(step)) {
        if (typeof value !== "string") continue;
        expect(findVocabularyHits(value), `${name}.${field}: ${value}`).toEqual([]);
      }
    }
  });

  it("still adds up to the budgets D3 set", () => {
    expect(GUIDED_SETUP_STEP_DEFINITIONS.map((step) => step.budgetSeconds)).toEqual([
      10, 40, 30, 90, 20, 20, 10,
    ]);
    expect(
      GUIDED_SETUP_STEP_DEFINITIONS.reduce((total, step) => total + step.budgetSeconds, 0),
    ).toBe(220);
  });

  it("names the seven steps in order, each exactly once", () => {
    expect(GUIDED_SETUP_STEP_DEFINITIONS.map((step) => step.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    const titles = GUIDED_SETUP_STEP_DEFINITIONS.map((step) => step.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
