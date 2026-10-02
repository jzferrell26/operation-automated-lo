import { describe, expect, it } from "vitest";

import type { LibraryAdCatalogStanding } from "@oalo/application";

import {
  HOME_LIST_LIMIT,
  buildApprovalList,
  buildRunningList,
  libraryAdStillApprovable,
  type HomeCampaignFacts,
} from "./home-campaigns.js";

/**
 * PRD-009b 009B-AC-009 and 009B-AC-010, the selection half. The screen's half is in
 * `overview-screen.integration.test.tsx`, and the real read's is in `home-reads.postgres.test.ts`.
 */

function campaign(
  overrides: Partial<HomeCampaignFacts> & { campaignRef: string },
): HomeCampaignFacts {
  return {
    name: `Campaign ${overrides.campaignRef}`,
    detailHref: `/marketing/campaigns/${overrides.campaignRef}`,
    startsAt: undefined,
    endsAt: "2026-12-31T23:59:00.000Z",
    state: "awaiting_approval",
    decision: undefined,
    updatedAt: "2026-10-01T12:00:00.000Z",
    canApprove: true,
    adAvailable: true,
    sample: false,
    ...overrides,
  };
}

describe("Running now (009B-AC-009)", () => {
  it("lists only live campaigns", () => {
    const list = buildRunningList([
      campaign({ campaignRef: "draft", state: "draft", canApprove: false }),
      campaign({ campaignRef: "approved", state: "approved", canApprove: false }),
      campaign({ campaignRef: "paused", state: "paused", canApprove: false }),
      campaign({ campaignRef: "live", state: "live", canApprove: false }),
    ]);

    expect(list.rows.map((row) => row.campaignRef)).toEqual(["live"]);
    expect(list.total).toBe(1);
  });

  it("is empty for a workspace with nothing live, which is every real account in PRD-009", () => {
    expect(buildRunningList([])).toEqual({ rows: [], total: 0 });
    expect(buildRunningList([campaign({ campaignRef: "waiting" })]).rows).toEqual([]);
  });

  it("shows the ad's name, the run dates, the status words, and one link", () => {
    const [row] = buildRunningList([
      campaign({
        campaignRef: "live",
        state: "live",
        name: "First home, start here",
        startsAt: "2026-10-03T14:00:00.000Z",
        endsAt: "2026-10-17T14:00:00.000Z",
        canApprove: false,
      }),
    ]).rows;

    expect(row).toMatchObject({
      name: "First home, start here",
      href: "/marketing/campaigns/live",
      startsAt: "2026-10-03T14:00:00.000Z",
      endsAt: "2026-10-17T14:00:00.000Z",
      statusLabel: "Live",
    });
  });

  it("shows three and counts the rest, newest first", () => {
    const live = ["a", "b", "c", "d"].map((ref, index) =>
      campaign({
        campaignRef: ref,
        state: "live",
        canApprove: false,
        updatedAt: `2026-10-0${String(index + 1)}T12:00:00.000Z`,
      }),
    );

    const list = buildRunningList(live);

    expect(HOME_LIST_LIMIT).toBe(3);
    expect(list.rows.map((row) => row.campaignRef)).toEqual(["d", "c", "b"]);
    expect(list.total).toBe(4);
  });
});

describe("Needs your approval (009B-AC-010)", () => {
  it("does not exist for a person who cannot approve", () => {
    expect(buildApprovalList([campaign({ campaignRef: "waiting" })], false)).toBeUndefined();
  });

  it("lists a campaign whose latest version passed its checks and has no recorded decision", () => {
    const list = buildApprovalList([campaign({ campaignRef: "waiting" })], true);

    expect(list?.rows.map((row) => row.campaignRef)).toEqual(["waiting"]);
    expect(list?.rows[0]?.statusLabel).toBe("Ready for approval");
  });

  it("never lists an approved version", () => {
    const list = buildApprovalList(
      [
        campaign({
          campaignRef: "approved",
          state: "approved",
          decision: "approved",
          canApprove: false,
        }),
      ],
      true,
    );

    expect(list?.rows).toEqual([]);
  });

  it("never lists a version that was sent back, though the stored state stays awaiting approval", () => {
    const list = buildApprovalList(
      [campaign({ campaignRef: "sent-back", state: "awaiting_approval", decision: "rejected" })],
      true,
    );

    expect(list?.rows).toEqual([]);
  });

  it("never lists a version whose checks need changes", () => {
    const list = buildApprovalList(
      [campaign({ campaignRef: "needs-changes", state: "preflight_failed", canApprove: false })],
      true,
    );

    expect(list?.rows).toEqual([]);
  });

  it("never lists a version whose library ad was retired, replaced, or removed", () => {
    const list = buildApprovalList(
      [campaign({ campaignRef: "ad-retired", adAvailable: false })],
      true,
    );

    expect(list?.rows).toEqual([]);
  });

  it("never lists a campaign the application layer would refuse this person's approval on", () => {
    const list = buildApprovalList([campaign({ campaignRef: "refused", canApprove: false })], true);

    expect(list?.rows).toEqual([]);
  });

  it("lists up to three, newest first, and counts every one that waits", () => {
    const waiting = ["a", "b", "c", "d", "e"].map((ref, index) =>
      campaign({ campaignRef: ref, updatedAt: `2026-10-0${String(index + 1)}T12:00:00.000Z` }),
    );

    const list = buildApprovalList(waiting, true);

    expect(list?.rows.map((row) => row.campaignRef)).toEqual(["e", "d", "c"]);
    expect(list?.total).toBe(5);
  });

  it("carries the sample label of a campaign built on a sample ad (009C-AC-005)", () => {
    const list = buildApprovalList([campaign({ campaignRef: "sample", sample: true })], true);

    expect(list?.rows[0]?.sample).toBe(true);
  });
});

/**
 * 009B-AC-010, "an ad-retired version never appears". The approval command refuses a library-ad
 * version for the four reasons of `assertLibraryAdApprovable` (`campaign-approval-command.ts`), so
 * a campaign it would refuse is not waiting for anybody. This is that rule, case for case.
 */
describe("a library ad that can still be approved", () => {
  const recorded = { id: "first-home", version: 2, tallSha256: "tall", squareSha256: "square" };
  const standing = (
    overrides: Partial<LibraryAdCatalogStanding> = {},
  ): LibraryAdCatalogStanding => ({
    status: "active",
    highestVersion: 2,
    highestStatus: "active",
    tallSha256: "tall",
    squareSha256: "square",
    ...overrides,
  });

  it("is approvable while the ad is active, at its highest version, with the art it recorded", () => {
    expect(libraryAdStillApprovable(recorded, standing())).toBe(true);
  });

  it("is not approvable when the catalog no longer has the version", () => {
    expect(libraryAdStillApprovable(recorded, undefined)).toBe(false);
  });

  it("is not approvable once the ad was retired, even when only its newest version was", () => {
    expect(libraryAdStillApprovable(recorded, standing({ status: "retired" }))).toBe(false);
    expect(libraryAdStillApprovable(recorded, standing({ highestStatus: "retired" }))).toBe(false);
  });

  it("is not approvable once a newer version replaced it", () => {
    expect(
      libraryAdStillApprovable(recorded, standing({ status: "replaced", highestVersion: 3 })),
    ).toBe(false);
    expect(libraryAdStillApprovable(recorded, standing({ highestVersion: 3 }))).toBe(false);
  });

  it("is not approvable when either picture changed since the version was saved", () => {
    expect(libraryAdStillApprovable(recorded, standing({ tallSha256: "other" }))).toBe(false);
    expect(libraryAdStillApprovable(recorded, standing({ squareSha256: "other" }))).toBe(false);
  });
});
