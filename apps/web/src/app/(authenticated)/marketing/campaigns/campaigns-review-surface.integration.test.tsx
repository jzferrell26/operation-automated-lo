import { tmpdir } from "node:os";
import { join } from "node:path";

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadSyntheticReporting } from "../../../../features/reporting/model/synthetic-reporting.js";
import { loadSyntheticUiFixture } from "../../../../features/ui-foundation/data/load-synthetic-ui.js";
import { OALO_REVIEW_SURFACE_AUTHORIZED } from "../../../../server/authenticated-workspace-data.js";
import {
  collectFixtureStrings,
  forbiddenReviewStrings,
  leakedReviewStrings,
  reviewSurfaceText,
  staleAllowances,
  type ReviewSurfaceAllowance,
} from "../../review-surface-sweep.js";
import CampaignListPage from "./page.js";
import NewCampaignPage from "./new/page.js";
import SyntheticCampaignPage from "./synthetic-open-house-001/page.js";

const redirectCalls: string[] = [];

vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation.js")>();
  return {
    ...actual,
    redirect(path: string) {
      redirectCalls.push(path);
      return actual.redirect(path);
    },
  };
});

/**
 * Nothing from the synthetic reporting fixture may reach any marketing campaign route in review
 * mode. The synthetic detail route branches to `ReviewNotConnectedScreen`, the list route reads
 * persisted records and finds none, and the create route is a static form, so every entry below is
 * a short closed-vocabulary token that happens to be a substring of route-authored copy.
 */
const reportingAllowances: readonly ReviewSurfaceAllowance[] = [
  {
    path: "campaign.metaConnection.state",
    value: "connected",
    because: "Substring of the route heading about this campaign not being connected yet.",
  },
  {
    path: "campaign.metaConnection.assets[*].kind",
    value: "page",
    because:
      "Substring of the region name that names your Meta pages. The enum value is also the ordinary English word the copy has to use for a Facebook Page.",
  },
  {
    path: "campaign.artifacts[*].status",
    value: "approved",
    because: "Substring of the create route's own 'Ready for approval' and approval copy.",
  },
  {
    path: "campaign.creatives[*].placement",
    value: "story",
    because: "Substring of the create route's own copy.",
  },
];

/** The synthetic UI fixture must not reach these routes either; the same tokens collide. */
const uiAllowances: readonly ReviewSurfaceAllowance[] = [
  // PRD-009a (009A-AC-014, 2026-10-01): Campaigns moved from the Marketing Suite sub-items into
  // the six-item menu, and the "/marketing" hub item left it, so these allowances follow.
  {
    path: "navigation.items[*].href",
    value: "/marketing/campaigns",
    because: "Substring of the create route's '/marketing/campaigns/new' quick action.",
  },
  {
    path: "navigation.items[*].id",
    value: "campaigns",
    because: "Substring of the same route path; navigation does not render on these routes.",
  },
  {
    path: "navigation.items[*].label",
    value: "Campaigns",
    because: "Substring of the list route's own heading, 'Campaigns in this location'.",
  },
  {
    path: "overview.activeWork[*].type",
    value: "campaign",
    because: "Substring of route-authored campaign copy such as 'Create campaign'.",
  },
  {
    path: "overview.health[*].label",
    value: "HighLevel",
    because: "Substring of the review disclosure and the create route's provider-disabled notice.",
  },
  {
    path: "overview.health[*].label",
    value: "Meta",
    because: "Substring of the review disclosure and of the 'Meta connection' region name.",
  },
  {
    path: "overview.health[*].id",
    value: "meta",
    because: "Substring of the region names that say what a connected Meta account would show.",
  },
  {
    path: "onboarding.getConnected[*].title",
    value: "Meta connection",
    because: "Substring of the region name 'Your Meta connection'; no setup step renders here.",
  },
  {
    path: "session.safety.dataMode",
    because: "Literal 'synthetic' fixed by runtimeSafetySchema.",
  },
];

function stubWorkspaceEnvironment(environment: string, reviewSurface: string | undefined): void {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
}

beforeEach(() => {
  redirectCalls.length = 0;
  stubWorkspaceEnvironment("production", OALO_REVIEW_SURFACE_AUTHORIZED);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** What a page throws while it renders, or `undefined` when it renders without throwing. */
function whatItThrows(renderPage: () => unknown): unknown {
  try {
    renderPage();
  } catch (error) {
    return error;
  }
  return undefined;
}

function sweepSurface(container: HTMLElement): readonly string[] {
  const surface = reviewSurfaceText(container);
  return [
    ...leakedReviewStrings(
      surface,
      forbiddenReviewStrings(loadSyntheticReporting(), reportingAllowances),
    ),
    ...leakedReviewStrings(surface, forbiddenReviewStrings(loadSyntheticUiFixture(), uiAllowances)),
  ];
}

describe("authenticated marketing campaign routes", () => {
  it("sweeps both whole fixtures rather than a hardcoded amount", () => {
    const reporting = loadSyntheticReporting();
    const ui = loadSyntheticUiFixture();

    expect(collectFixtureStrings(reporting).length).toBeGreaterThan(100);
    // PRD-009a: the six-item menu leaves the fixture with 382 strings (2026-10-01).
    expect(collectFixtureStrings(ui).length).toBeGreaterThan(350);
    expect(forbiddenReviewStrings(reporting, reportingAllowances).length).toBeGreaterThan(80);
    expect(forbiddenReviewStrings(ui, uiAllowances).length).toBeGreaterThan(200);
    expect(staleAllowances(reporting, reportingAllowances)).toEqual([]);
    expect(staleAllowances(ui, uiAllowances)).toEqual([]);
  });

  /**
   * PRD-008b 008B-AC-008. The demo campaign address answered in review mode with a not-connected
   * screen, and nothing links to it. A signed-in person has no demo campaign, so the address now
   * answers as a page that does not exist. Synthetic mode is untouched and is covered at the end of
   * this file.
   */
  it("answers not found at the demo campaign address in review mode", () => {
    expect(whatItThrows(() => SyntheticCampaignPage())).toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  /**
   * PRD-009d D3. "Launch an ad" shows the signed-in person's own Brand on every ad, so in review
   * mode it is a page for a session: a visitor with none is sent to sign in, as the list is, rather
   * than shown a library with a band that belongs to nobody.
   */
  it("redirects an unauthenticated review visitor away from the create route", async () => {
    await expect(NewCampaignPage({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
      digest: expect.any(String),
    });

    expect(redirectCalls).toEqual(["/sign-in"]);
  });

  /**
   * PRD-005a 005A-AC-010. "No campaigns in this location yet" is a claim about a tenant, so the
   * review list route no longer renders it for a visitor with no verified session. It redirects to
   * the review sign-in path instead, which Next.js signals by throwing a redirect.
   */
  it("redirects an unauthenticated review visitor instead of listing an empty location", async () => {
    await expect(CampaignListPage()).rejects.toMatchObject({ digest: expect.any(String) });

    expect(redirectCalls).toEqual(["/sign-in"]);
  });

  /**
   * Rubric axis 9 and `03-components/async-empty-error-permission-state.md`: an empty list is the
   * shared `empty` state with its one creation action, not a card assembled on the page. PRD-008d's
   * baseline review of 2026-10-01 found the hand-built card when it photographed the state. PRD-009e
   * 009E-AC-011 renames the state's words and its action; it stays the shared state.
   */
  it("says a workspace with no campaigns is empty through the shared empty state", async () => {
    stubWorkspaceEnvironment("local", undefined);
    vi.stubEnv(
      "OALO_LOCAL_CAMPAIGN_STORE",
      join(tmpdir(), `oalo-no-campaigns-${String(process.pid)}-${String(Date.now())}.json`),
    );

    const { container } = render(await CampaignListPage());

    const empty = container.querySelector(".oalo-async-state[data-state='empty']");
    expect(empty?.querySelector("h2")?.textContent).toBe("No campaigns yet");
    expect(empty?.querySelector("a[href='/marketing/campaigns/new']")?.textContent).toBe(
      "Launch an ad",
    );
    expect(container.querySelectorAll("article")).toHaveLength(0);
  });

  it("keeps the demo-rich synthetic campaign detail for local development", () => {
    stubWorkspaceEnvironment("local", undefined);

    const { container } = render(<SyntheticCampaignPage />);

    expect(sweepSurface(container).length).toBeGreaterThan(20);
  });
});
