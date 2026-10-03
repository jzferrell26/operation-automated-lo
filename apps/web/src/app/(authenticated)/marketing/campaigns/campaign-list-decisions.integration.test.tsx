import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AD_SCENARIOS,
  APPROVER,
  CHIP_FOR_REFUSAL,
  CREATOR,
  libraryCampaign,
  rowOf,
  ruleAnswerFor,
  scenarioLibrary,
  type LibraryCampaignOptions,
} from "../../../../server/campaign-page.test-support.js";
import { useReviewModeEnvironment } from "../../review-mode-test-support.js";
import CampaignListPage from "./page.js";

/**
 * PRD-008, the coordinator's follow-up to finding S1b of the 2026-10-01 writing review, and PRD-009e
 * 009E-AC-010.
 *
 * A send-back leaves a campaign in `awaiting_approval` with a rejection recorded against it, and the
 * list page named where each campaign stands from the state alone, so a campaign that had just been
 * sent back read "Ready for approval" on the list while its own page said it was sent back. The
 * reads are the one thing mocked: what this proves is what the page says about a campaign it was
 * given, and `campaign-workspace-read.test.ts` proves the projection carries the decision.
 *
 * Every status on the list comes from `campaignStateLabel`, extended for "Ad retired" (D8): the
 * recorded decision first, then the library's verdict on the ad, then the checks, then the state.
 */

const mocked = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("../../../../server/campaign-workspace-reads.js", () => ({
  readWorkspaceCampaignsForRequest: mocked.read,
}));

useReviewModeEnvironment();
afterEach(() => mocked.read.mockReset());

/** The list as the page reads it for one campaign, drawn, with its status chips. */
async function renderList(
  options: LibraryCampaignOptions,
  principal: typeof APPROVER | typeof CREATOR = APPROVER,
) {
  const row = await rowOf(await libraryCampaign(options), { principal });
  mocked.read.mockResolvedValue({ authenticated: true, campaigns: [row] });
  return render(await CampaignListPage());
}

describe("the campaign list for a campaign somebody has decided on", () => {
  it("says a sent-back campaign was sent back, and never that it is ready for approval", async () => {
    await renderList({ decision: "rejected" });

    expect(screen.getAllByText("Sent back for changes").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ready for approval")).toBeNull();
    expect(screen.queryByText("Approve this version.")).toBeNull();
  });

  /**
   * 008B-AC-009, the approved half. An approval moves the state to `approved`, so the stored state
   * already says so; this keeps it that way and keeps the list from describing an approved
   * campaign as ready for approval or as sent back.
   */
  it("says an approved campaign is approved, and never that it is ready for approval", async () => {
    await renderList({ decision: "approved" });

    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ready for approval")).toBeNull();
    expect(screen.queryByText("Sent back for changes")).toBeNull();
    expect(screen.queryByText("Approve this version.")).toBeNull();
  });

  it("still says a campaign nobody has decided on is ready for approval", async () => {
    await renderList({});

    expect(screen.getAllByText("Ready for approval").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sent back for changes")).toBeNull();
  });
});

/**
 * 009E-AC-010 and 009d D8. One case for every state the table lists: each draws one chip, and the
 * chip is the label `campaignStateLabel` gives that standing, for everybody who reads the list.
 */
describe("the campaign list's status for every state of 009d D8 (009E-AC-010)", () => {
  it.each([
    ["ready for approval, for an approver", {}, APPROVER, "Ready for approval", "info"],
    [
      "ready for approval, for somebody who cannot approve",
      {},
      CREATOR,
      "Ready for approval",
      "info",
    ],
    ["needing changes", { needsChanges: true }, APPROVER, "Needs changes", "critical"],
    ["approved", { decision: "approved" as const }, APPROVER, "Approved", "success"],
    ["sent back", { decision: "rejected" as const }, APPROVER, "Sent back for changes", "warning"],
    [
      "on a retired ad",
      { adId: "sample-spring-search", adVersion: 1 },
      APPROVER,
      "Ad retired",
      "neutral",
    ],
  ] as const)("reads a campaign %s as %s", async (_state, options, principal, label, tone) => {
    const { container } = await renderList(options, principal);

    const chips = container.querySelectorAll("[data-campaign-table] [data-campaign-standing]");
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent(label);
    expect(chips[0]).toHaveAttribute("data-tone", tone);
  });

  it("lets a recorded decision win over a retired ad", async () => {
    await renderList({ adId: "sample-spring-search", adVersion: 1, decision: "approved" });

    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ad retired")).toBeNull();
  });

  /**
   * QA-11. The list said "Ready for approval" for a version whose ad was replaced, whose picture
   * changed, or that the library no longer holds, while its own page said it could not be approved.
   * Each scenario asks the approval rule (`libraryAdRefusalFor`) and expects the chip step 3 draws for
   * that answer, so the list says "Ready for approval" only where the rule allows an approval.
   */
  describe("for an ad the approval rule may refuse (QA-11)", () => {
    it.each(AD_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
      "draws the chip the rule gives for %s, to everybody who reads the list",
      async (_name, scenario) => {
        const library = await scenarioLibrary(scenario);
        const campaign = await libraryCampaign(scenario.campaign);
        const refusal = ruleAnswerFor(campaign, library);
        const expected = refusal === undefined ? "Ready for approval" : CHIP_FOR_REFUSAL[refusal];
        for (const principal of [APPROVER, CREATOR]) {
          const row = await rowOf(campaign, { principal, library });
          mocked.read.mockResolvedValue({ authenticated: true, campaigns: [row] });
          const { container, unmount } = render(await CampaignListPage());

          const chips = container.querySelectorAll(
            "[data-campaign-table] [data-campaign-standing]",
          );
          expect(chips, principal.role).toHaveLength(1);
          expect(chips[0]?.textContent, principal.role).toBe(expected);
          // The phone cards carry the same chip, so a narrow screen cannot say something else.
          const cards = container.querySelectorAll(
            "[data-campaign-cards] [data-campaign-standing]",
          );
          expect([...cards].map((chip) => chip.textContent)).toEqual([expected]);
          if (refusal !== undefined) {
            expect(screen.queryByText("Ready for approval"), principal.role).toBeNull();
          }
          unmount();
        }
      },
    );

    it("lets a recorded decision win over each reason", async () => {
      for (const scenario of AD_SCENARIOS) {
        for (const [decision, chip] of [
          ["approved", "Approved"],
          ["rejected", "Sent back for changes"],
        ] as const) {
          const library = await scenarioLibrary(scenario);
          const row = await rowOf(await libraryCampaign({ ...scenario.campaign, decision }), {
            library,
          });
          mocked.read.mockResolvedValue({ authenticated: true, campaigns: [row] });
          const { container, unmount } = render(await CampaignListPage());

          expect(
            container.querySelector("[data-campaign-table] [data-campaign-standing]"),
            `${scenario.name} / ${decision}`,
          ).toHaveTextContent(chip);
          unmount();
        }
      }
    });
  });

  it("never shows a campaign as live or going live, whatever state it is stored in", async () => {
    const campaign = await libraryCampaign({ decision: "approved" });
    for (const state of ["publishing", "live", "paused", "completed", "archived"] as const) {
      const row = await rowOf({ ...campaign, record: { ...campaign.record, state } });
      mocked.read.mockResolvedValue({ authenticated: true, campaigns: [row] });
      const { container, unmount } = render(await CampaignListPage());

      expect(container.textContent, state).not.toMatch(/\b(?:live|going live)\b/iu);
      unmount();
    }
  });

  it("keeps the plain words of the table: one status per row and nothing else says where it stands", async () => {
    const { container } = await renderList({ decision: "rejected" });

    const row = container.querySelector("[data-campaign-row]") as HTMLElement;
    expect(
      within(row).getAllByText(
        /Sent back for changes|Approved|Ready for approval|Needs changes|Ad retired/u,
      ),
    ).toHaveLength(1);
  });
});
