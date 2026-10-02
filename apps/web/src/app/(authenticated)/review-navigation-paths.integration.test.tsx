import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OALO_REVIEW_SURFACE_AUTHORIZED,
  loadAuthenticatedWorkspace,
} from "../../server/authenticated-workspace-data.js";
import SyntheticCampaignPage from "./marketing/campaigns/synthetic-open-house-001/page.js";

/**
 * PRD-006b 006B-AC-012.
 *
 * The demo keeps its `synthetic-*` routes, because renaming them is not this sub-PRD's job. What a
 * connected-account workspace may not do is send a loan officer to one: a path is something a user
 * reads in the address bar, and `synthetic-open-house-001` is exactly the vocabulary PRD-006b D2
 * bans. This walks every link the workspace can hand the shell and every setup step's destination
 * and asserts that none of them carries that word.
 */

const SYNTHETIC_PATH = /synthetic/iu;

/** A connected-account deployment: nothing is stubbed out, and nothing is connected either. */
function stubConnectedAccountWorkspace(): void {
  vi.stubEnv("OALO_ENVIRONMENT", "production");
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", OALO_REVIEW_SURFACE_AUTHORIZED);
}

beforeEach(stubConnectedAccountWorkspace);
afterEach(() => vi.unstubAllEnvs());

describe("paths a connected-account workspace can send a user to", () => {
  it("has no navigation item, marketing item, or setup step pointing at a demo route", () => {
    const workspace = loadAuthenticatedWorkspace();
    const { navigation, onboarding } = workspace.ui;

    // PRD-009a (009A-AC-014, 2026-10-01): the six-item menu replaced nine items and the six
    // Marketing Suite sub-items, so the walk covers 6 menu paths and the 9 setup steps.
    const paths = [
      ...navigation.items.map((item) => item.href),
      ...onboarding.getConnected.map((item) => item.completionHref),
      ...onboarding.launchReadiness.map((item) => item.completionHref),
    ];

    expect(paths.length).toBe(15);
    expect(paths.filter((path) => SYNTHETIC_PATH.test(path))).toEqual([]);
  });

  /**
   * Amended on 2026-10-01 by PRD-009 (009f D1): `/onboarding` and its step pages, the fixture's one
   * demo destination among them, are gone and redirect to Home, so every setup step now points at a
   * page that survives and the step itself stays.
   */
  it("points every setup step at a page that survives, without dropping the step", () => {
    const workspace = loadAuthenticatedWorkspace();
    const steps = [
      ...workspace.ui.onboarding.getConnected,
      ...workspace.ui.onboarding.launchReadiness,
    ];
    const testLeadStep = steps.find((item) => item.id === "synthetic_lead");

    expect(testLeadStep?.title).toBe("Send a test lead");
    expect(testLeadStep?.completionHref).toBe("/overview");
    expect(
      steps.filter((item) => /^\/(?:onboarding|settings\/team)\b/u.test(item.completionHref)),
    ).toEqual([]);
  });

  /**
   * PRD-008b 008B-AC-008. Nothing links to the demo campaign address, and a person who types it in
   * is not shown a not-connected screen for a campaign that was never theirs: it does not exist in
   * a connected-account workspace. Rendering the page throws Next.js's not-found signal.
   */
  it("does not answer the demo campaign address at all", () => {
    let thrown: unknown;
    try {
      SyntheticCampaignPage();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });

  it("leaves the local demo's own routes alone", () => {
    vi.stubEnv("OALO_ENVIRONMENT", "local");
    vi.stubEnv("OALO_REVIEW_SURFACE", undefined);
    const workspace = loadAuthenticatedWorkspace();

    // PRD-009 (009f D1): the demo's test-lead step points at Home, where the checklist now lives.
    expect(
      workspace.ui.onboarding.launchReadiness.find((item) => item.id === "synthetic_lead")
        ?.completionHref,
    ).toBe("/overview");
  });
});
