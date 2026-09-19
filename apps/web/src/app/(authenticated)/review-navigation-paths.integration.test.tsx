import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OALO_REVIEW_SURFACE_AUTHORIZED,
  loadAuthenticatedWorkspace,
} from "../../server/authenticated-workspace-data.js";

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

    const paths = [
      ...navigation.items.map((item) => item.href),
      ...navigation.marketingItems.map((item) => item.href),
      ...onboarding.getConnected.map((item) => item.completionHref),
      ...onboarding.launchReadiness.map((item) => item.completionHref),
    ];

    expect(paths.length).toBeGreaterThan(15);
    expect(paths.filter((path) => SYNTHETIC_PATH.test(path))).toEqual([]);
  });

  it("rewrites the one demo destination the fixture carries, without dropping the step", () => {
    const workspace = loadAuthenticatedWorkspace();
    const testLeadStep = workspace.ui.onboarding.launchReadiness.find(
      (item) => item.id === "synthetic_lead",
    );

    // The step stays: hiding it would hide the product. Only where it sends the user changes.
    expect(testLeadStep?.title).toBe("Send a test lead");
    expect(testLeadStep?.completionHref).toBe("/onboarding");
  });

  it("leaves the local demo's own routes alone", () => {
    vi.stubEnv("OALO_ENVIRONMENT", "local");
    vi.stubEnv("OALO_REVIEW_SURFACE", undefined);
    const workspace = loadAuthenticatedWorkspace();

    expect(
      workspace.ui.onboarding.launchReadiness.find((item) => item.id === "synthetic_lead")
        ?.completionHref,
    ).toBe("/onboarding/synthetic-lead");
  });
});
