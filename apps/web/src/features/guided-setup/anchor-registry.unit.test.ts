import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  GUIDED_SETUP_ANCHORS,
  GUIDED_SETUP_ANCHOR_REGISTRY,
  GUIDED_SETUP_PANEL_SURFACE,
  anchorSelector,
  guidedSetupAnchorIds,
  onboardingChecklistAnchor,
  requiredAnchorsForRoute,
} from "./anchor-registry.js";

/**
 * PRD-006c D2 and 006C-AC-002, the source half.
 *
 * A tour breaks when a selector and a screen stop agreeing, and the usual way that happens is that
 * somebody types the id by hand in one of the two places. This scan makes that impossible to do
 * quietly: the only file in `apps/web/src` allowed to contain a `data-tour="..."` string literal
 * is the registry itself, which has to contain them in order to be the registry.
 *
 * The companion test, `anchor-registry.integration.test.tsx`, renders the screens and proves each
 * required anchor is actually there. One test without the other proves half of it: this one would
 * pass on a screen that never renders an anchor, and that one would pass on a screen that renders
 * a literal the registry has never heard of.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
const SCANNED_ROOT = "apps/web/src";
const REGISTRY_FILE = "apps/web/src/features/guided-setup/anchor-registry.ts";
const DATA_TOUR_LITERAL = /data-tour\s*=\s*"(?<anchor>[^"]*)"/gu;

/**
 * Test files are exempt, and only test files. A suite has to write the attribute out to assert
 * that a screen renders it, which is the one legitimate reason to have the string twice.
 */
function isTestFile(name: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(name);
}

async function collectSourceFiles(): Promise<readonly string[]> {
  const absolute = join(repositoryRoot, SCANNED_ROOT);
  const entries = await readdir(absolute, { recursive: true, withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() && !isTestFile(entry.name) && [".ts", ".tsx"].includes(extname(entry.name)),
    )
    .map((entry) =>
      relative(repositoryRoot, join(entry.parentPath, entry.name)).replaceAll("\\", "/"),
    )
    .filter((path) => path !== REGISTRY_FILE)
    .toSorted();
}

describe("guided setup anchor registry", () => {
  it("is the only place in apps/web/src that writes a data-tour value as a literal", async () => {
    const offenders: string[] = [];
    for (const file of await collectSourceFiles()) {
      const source = await readFile(join(repositoryRoot, file), "utf8");
      for (const match of source.matchAll(DATA_TOUR_LITERAL)) {
        offenders.push(`${file}: ${match.groups?.anchor ?? ""}`);
      }
    }
    expect(
      offenders,
      `Take the id from GUIDED_SETUP_ANCHORS instead:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("names every anchor exactly once", () => {
    const ids = guidedSetupAnchorIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.values(GUIDED_SETUP_ANCHORS).toSorted()).toEqual([...ids].toSorted());
  });

  it("keeps the three anchors that existed before the walkthrough", () => {
    // These three were on the onboarding screen with no consumer. Migrating them rather than
    // inventing a second convention is what stops `data-walkthrough` from ever appearing.
    expect(GUIDED_SETUP_ANCHORS.onboardingGetConnected).toBe("onboarding-get-connected");
    expect(GUIDED_SETUP_ANCHORS.onboardingLaunchReadiness).toBe("onboarding-launch-readiness");
    expect(onboardingChecklistAnchor("install-and-access")).toBe("onboarding-install-and-access");
  });

  it("gives every anchor a description and a place to render", () => {
    for (const anchor of guidedSetupAnchorIds()) {
      const record = GUIDED_SETUP_ANCHOR_REGISTRY[anchor];
      expect(record.description.length, anchor).toBeGreaterThan(0);
      expect(record.route.length, anchor).toBeGreaterThan(0);
    }
  });

  it("builds a selector that matches the attribute the screens render", () => {
    expect(anchorSelector(GUIDED_SETUP_ANCHORS.campaignCreateSubmit)).toBe(
      '[data-tour="campaign.create.submit"]',
    );
  });

  it("groups the panel's own anchors away from the page routes", () => {
    expect(requiredAnchorsForRoute(GUIDED_SETUP_PANEL_SURFACE)).toEqual([
      GUIDED_SETUP_ANCHORS.setupDetailsForm,
      GUIDED_SETUP_ANCHORS.setupRealtorForm,
      GUIDED_SETUP_ANCHORS.setupDone,
    ]);
  });
});
