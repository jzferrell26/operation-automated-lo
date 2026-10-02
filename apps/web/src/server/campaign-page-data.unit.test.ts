import { describe, expect, it } from "vitest";

import type { SavedAdBrand } from "./ad-brand-read.js";
import { sortCampaignListRows } from "./campaign-page-data.js";
import {
  APPROVER,
  CREATOR,
  OWNER,
  earlierFlowCampaign,
  libraryCampaign,
  pageOf,
  rowOf,
} from "./campaign-page.test-support.js";
import type { LibraryAdCampaignPage } from "../features/campaigns/campaign-page-model.js";

/**
 * PRD-009e. What the two Campaigns pages are handed, decided once and tested with literal records
 * and the repository's own sample library: no database, no component, no clock.
 */

async function libraryPageOf(
  ...args: Parameters<typeof libraryCampaign>
): Promise<LibraryAdCampaignPage> {
  const page = await pageOf(await libraryCampaign(...args), { principal: OWNER });
  if (page.kind !== "library-ad") throw new Error("Expected a library-ad page.");
  return page;
}

const NO_LIBRARY = {
  find: () => undefined,
  standingOf: () => undefined,
} as const;

describe("the campaign page's data for a library ad (009E-AC-001, 009E-AC-003)", () => {
  it("names the page after the library ad, with its topic, dates, places, budget, and art", async () => {
    const page = await libraryPageOf({
      startsAt: "2026-10-06T09:00:00.000Z",
      endsAt: "2026-10-20T23:59:59.000Z",
    });

    expect(page.name).toBe("Sample: First home, start here");
    expect(page.topic).toBe("first-time-buyers");
    expect(page.startsOn).toBe("2026-10-06");
    expect(page.endsOn).toBe("2026-10-20");
    expect(page.places).toEqual({ states: ["TX"], cities: ["Austin, TX"] });
    expect(page.budget).toEqual({ dailyDollars: 25, totalDollars: 350 });
    expect(page.ad).toMatchObject({
      id: "sample-first-home",
      version: 2,
      inLibrary: true,
      sample: true,
      callToAction: "LEARN_MORE",
    });
    expect(page.ad.art?.tall).toMatch(/^\/api\/ads-library\/samples\/sample-first-home\/2\/tall$/u);
    expect(page.advertiser).toMatchObject({ name: "Alex Morgan", nmls: "0000000" });
    expect(page.results.spendCents.value).toBeNull();
    expect(page.results.leads.value).toBeNull();
    expect(page.results.costPerLeadCents.value).toBeNull();
  });

  it("starts when the ad is launched when no start day was chosen", async () => {
    expect((await libraryPageOf()).startsOn).toBeUndefined();
  });

  it("offers a new version only to somebody who can save one, and never for a retired ad", async () => {
    const campaign = await libraryCampaign();

    const forOwner = (await pageOf(campaign, { principal: OWNER })) as LibraryAdCampaignPage;
    const forCreator = (await pageOf(campaign, { principal: CREATOR })) as LibraryAdCampaignPage;
    const forApprover = (await pageOf(campaign, { principal: APPROVER })) as LibraryAdCampaignPage;
    expect([forOwner, forCreator, forApprover].map((page) => page.canMakeNewVersion)).toEqual([
      true,
      true,
      false,
    ]);
    expect(forOwner.makeNewVersionHref).toBe(
      "/marketing/campaigns/new?step=2&campaign=campaign_01LibraryPage&from=campaigns",
    );

    const retired = await libraryPageOf({ adId: "sample-spring-search", adVersion: 1 });
    expect(retired.canMakeNewVersion).toBe(false);
  });

  it("tells which of the words the person changed from the library's own words", async () => {
    const page = await libraryPageOf({ headline: "Thinking about your first home? Begin here." });

    expect(page.ad.defaults?.headline).toBe("Thinking about your first home? Start here.");
    expect(page.words.headline).toBe("Thinking about your first home? Begin here.");
  });

  it("falls back to the saved headline and no picture when the library no longer holds the ad", async () => {
    const page = (await pageOf(await libraryCampaign(), {
      principal: OWNER,
      library: NO_LIBRARY,
    })) as LibraryAdCampaignPage;

    expect(page.name).toBe("Thinking about your first home? Start here.");
    expect(page.topic).toBeUndefined();
    expect(page.ad).toMatchObject({ inLibrary: false, art: undefined, sample: false });
    expect(page.ad.defaults).toBeUndefined();
    expect(page.canMakeNewVersion).toBe(false);
  });

  it("carries the plain fixes of a version the checks found something in", async () => {
    const page = await libraryPageOf({ needsChanges: true });

    expect(page.standing).toBe("preflight_failed");
    expect(page.fixes.length).toBeGreaterThan(0);
    for (const fix of page.fixes) expect(fix).toMatch(/\S/u);
    expect((await libraryPageOf()).fixes).toEqual([]);
  });
});

describe("the approval and the decider's name (009E-AC-004)", () => {
  it("carries the name the decision recorded, beside the role", async () => {
    const page = await libraryPageOf({
      decision: "approved",
      decidedBy: "location_admin",
      approverDisplayName: "Alex Morgan",
    });

    expect(page.decision).toEqual({
      decision: "approved",
      decidedAt: "2026-10-01T12:00:00.000Z",
      actorRole: "location_admin",
      approverDisplayName: "Alex Morgan",
    });
    expect(page.standing).toBe("approved");
  });

  it("carries the role and the time alone for a decision recorded without a name", async () => {
    const page = await libraryPageOf({ decision: "approved" });

    expect(page.decision).toEqual({
      decision: "approved",
      decidedAt: "2026-10-01T12:00:00.000Z",
      actorRole: "approver",
    });
    expect(page.decision).not.toHaveProperty("approverDisplayName");
  });
});

describe("the versions of a campaign (009E-AC-005)", () => {
  async function twoVersions() {
    return libraryCampaign({
      olderVersions: [
        {
          decision: "rejected",
          decidedAt: "2026-09-30T10:00:00.000Z",
          createdAt: "2026-09-29T10:00:00.000Z",
        },
      ],
      createdAt: "2026-10-01T10:00:00.000Z",
      createdBy: OWNER.actorRef,
    });
  }

  it("lists every version newest first with the chip each one reads from its own decision", async () => {
    const page = (await pageOf(await twoVersions(), { principal: OWNER })) as LibraryAdCampaignPage;

    expect(
      page.versions.map((entry) => [entry.versionNo, entry.standing, entry.decision?.decision]),
    ).toEqual([
      [2, "awaiting_approval", undefined],
      [1, "awaiting_approval", "rejected"],
    ]);
    expect(page.versions.map((entry) => entry.savedByViewer)).toEqual([true, false]);
    expect(page.versions[1]?.href).toBe("/marketing/campaigns/campaign_01LibraryPage/versions/1");
  });

  it("opens an older version read-only, with no controls and no notices", async () => {
    const page = (await pageOf(await twoVersions(), {
      principal: OWNER,
      versionNo: 1,
    })) as LibraryAdCampaignPage;

    expect(page.versionNo).toBe(1);
    expect(page.isLatest).toBe(false);
    expect(page.decision?.decision).toBe("rejected");
    expect(page.approvalControls).toBeUndefined();
    expect(page.notices).toEqual([]);
    expect(page.fixes).toEqual([]);
    expect(page.canMakeNewVersion).toBe(false);
  });

  it("answers nothing for a version the campaign never had", async () => {
    const campaign = await twoVersions();

    for (const versionNo of [3, 99]) {
      await expect(
        pageOf(campaign, { principal: OWNER, versionNo }),
        String(versionNo),
      ).rejects.toThrow("was not built");
    }
  });
});

describe("the library notices (009E-AC-006)", () => {
  it("says the ad was retired, with a way to choose another ad for a version nobody approved", async () => {
    const page = await libraryPageOf({ adId: "sample-spring-search", adVersion: 1 });

    expect(page.standing).toBe("ad_retired");
    expect(page.notices).toEqual([
      {
        kind: "retired",
        retiredOn: "2026-09-30",
        blocksApproval: true,
        chooseAnotherAdHref:
          "/marketing/campaigns/new?step=1&campaign=campaign_01LibraryPage&from=campaigns",
      },
    ]);
    // A version the library would refuse to approve is not offered an approve control.
    expect(page.approvalControls).toBeUndefined();
  });

  it("keeps an approved version approved, with no action, when its ad is retired", async () => {
    const page = await libraryPageOf({
      adId: "sample-spring-search",
      adVersion: 1,
      decision: "approved",
    });

    expect(page.standing).toBe("approved");
    expect(page.notices).toEqual([
      {
        kind: "retired",
        retiredOn: "2026-09-30",
        blocksApproval: false,
        chooseAnotherAdHref: undefined,
      },
    ]);
    // Somebody has decided, so there is nothing left to approve and no control is offered.
    expect(page.approvalControls).toBeUndefined();
  });

  it("offers the approve control only to a version nobody has decided on", async () => {
    expect((await libraryPageOf()).approvalControls).toMatchObject({
      campaignRef: "campaign_01LibraryPage",
      blocking: false,
      canApprove: true,
      alreadyDecided: undefined,
      state: "awaiting_approval",
    });
    expect((await libraryPageOf({ needsChanges: true })).approvalControls).toMatchObject({
      blocking: true,
    });
    for (const decision of ["approved", "rejected"] as const) {
      expect((await libraryPageOf({ decision })).approvalControls, decision).toBeUndefined();
    }
  });

  it("offers choosing another ad on a sent-back version whose ad is retired", async () => {
    const page = await libraryPageOf({
      adId: "sample-spring-search",
      adVersion: 1,
      decision: "rejected",
    });

    expect(page.standing).toBe("awaiting_approval");
    expect(page.notices[0]).toMatchObject({ kind: "retired", blocksApproval: true });
  });

  it("carries the ads library's offer to use the new version, with the new words and what is kept, for a version nobody has decided on", async () => {
    const page = await libraryPageOf({ adVersion: 1 });

    expect(page.notices).toEqual([
      {
        kind: "newer-version",
        canUse: true,
        offer: {
          campaignRef: "campaign_01LibraryPage",
          ad: { id: "sample-first-home", name: expect.stringMatching(/\S/u) },
          fromVersion: 1,
          toVersion: 2,
          newWords: {
            headline: "Thinking about your first home? Start here.",
            primaryText: expect.stringMatching(/\S/u),
          },
          kept: {
            dailyBudgetDollars: 25,
            totalBudgetDollars: 350,
            endsOn: "2099-10-20",
            places: ["TX", "Austin, TX"],
          },
          undecided: true,
        },
      },
    ]);
    expect(page.approvalControls).toBeUndefined();
  });

  it("only mentions the new version, with no action, for a version somebody has decided on", async () => {
    for (const decision of ["approved", "rejected"] as const) {
      const page = await libraryPageOf({ adVersion: 1, decision });

      expect(page.notices, decision).toEqual([
        expect.objectContaining({
          kind: "newer-version",
          offer: expect.objectContaining({ undecided: false }),
        }),
      ]);
    }
  });

  it("tells the notice that somebody who cannot save a version cannot use the new one", async () => {
    const page = (await pageOf(await libraryCampaign({ adVersion: 1 }), {
      principal: APPROVER,
    })) as LibraryAdCampaignPage;

    expect(page.notices).toEqual([
      expect.objectContaining({
        kind: "newer-version",
        canUse: false,
        offer: expect.objectContaining({ undecided: true }),
      }),
    ]);
  });

  it("offers no new version when the ad's newest version is the one the campaign has", async () => {
    const page = await libraryPageOf({ adVersion: 2 });

    expect(page.notices.map((notice) => notice.kind)).not.toContain("newer-version");
  });

  it("says the ad is not in the library when the catalog does not hold it", async () => {
    const page = (await pageOf(await libraryCampaign(), {
      principal: OWNER,
      library: NO_LIBRARY,
    })) as LibraryAdCampaignPage;

    expect(page.notices).toEqual([
      {
        kind: "missing",
        blocksApproval: true,
        chooseAnotherAdHref:
          "/marketing/campaigns/new?step=1&campaign=campaign_01LibraryPage&from=campaigns",
      },
    ]);
    expect(page.approvalControls).toBeUndefined();
  });

  describe("when Brand changed after the version was saved", () => {
    async function brandOf(overrides: Partial<SavedAdBrand["band"]> = {}, saved = true) {
      const base: SavedAdBrand = {
        band: {
          name: "Alex Morgan",
          title: "Loan officer",
          company: "Prairie Home Lending",
          nmls: "0000000",
          companyNmls: "0000000",
          colorPresetId: "navy",
          disclosureLine: "Equal Housing Opportunity.",
          ...overrides,
        },
        leadFormWording:
          "By submitting, you agree to be contacted about home financing and related mortgage services.",
        saved,
        brandProfileVersionRef: "brandprofile_test",
        partnerNames: [],
      };
      return base;
    }

    it("says so to the person who saved it, whatever part of Brand changed", async () => {
      const campaign = await libraryCampaign({ createdBy: OWNER.actorRef });
      for (const change of [
        { name: "Alex M. Morgan" },
        { title: "Senior loan officer" },
        { company: "Prairie Lending" },
        { nmls: "1234567" },
        { companyNmls: "7654321" },
        { colorPresetId: "forest" },
        { disclosureLine: "Equal Housing Lender." },
      ]) {
        const page = (await pageOf(campaign, {
          principal: OWNER,
          brand: await brandOf(change),
        })) as LibraryAdCampaignPage;
        expect(page.notices, JSON.stringify(change)).toEqual([{ kind: "brand-changed" }]);
      }
      const reworded = await brandOf();
      const page = (await pageOf(campaign, {
        principal: OWNER,
        brand: { ...reworded, leadFormWording: "A different sentence." },
      })) as LibraryAdCampaignPage;
      expect(page.notices).toEqual([{ kind: "brand-changed" }]);
    });

    it("says nothing when Brand is the same, was never saved, or could not be read", async () => {
      const campaign = await libraryCampaign({ createdBy: OWNER.actorRef });

      for (const brand of [await brandOf(), await brandOf({ name: "" }, false), undefined]) {
        const page = (await pageOf(campaign, { principal: OWNER, brand })) as LibraryAdCampaignPage;
        expect(page.notices).toEqual([]);
      }
    });

    it("says nothing to somebody who did not save it, because their Brand is not the one it froze", async () => {
      const campaign = await libraryCampaign({ createdBy: OWNER.actorRef });
      const page = (await pageOf(campaign, {
        principal: APPROVER,
        brand: await brandOf({ name: "Somebody Else" }),
      })) as LibraryAdCampaignPage;

      expect(page.notices).toEqual([]);
    });
  });
});

describe("the Campaigns list's rows (009E-AC-009, 009E-AC-010)", () => {
  it("names a row after the library ad and shows its topic, runs, places, and thumbnail", async () => {
    const row = await rowOf(
      await libraryCampaign({
        startsAt: "2026-10-06T09:00:00.000Z",
        endsAt: "2026-10-20T23:59:59.000Z",
      }),
    );

    expect(row).toMatchObject({
      campaignRef: "campaign_01LibraryPage",
      href: "/marketing/campaigns/campaign_01LibraryPage",
      name: "Sample: First home, start here",
      topic: "first-time-buyers",
      earlierFlow: false,
      sample: true,
      startsOn: "2026-10-06",
      endsOn: "2026-10-20",
      places: ["Austin, TX", "Texas"],
      alt: "",
    });
    expect(row.thumbnail).toMatch(/\/tall$/u);
  });

  it.each([
    ["ready for approval", {}, "awaiting_approval", undefined],
    ["needing changes", { needsChanges: true }, "preflight_failed", undefined],
    ["approved", { decision: "approved" as const }, "approved", "approved"],
    ["sent back", { decision: "rejected" as const }, "awaiting_approval", "rejected"],
    ["on a retired ad", { adId: "sample-spring-search", adVersion: 1 }, "ad_retired", undefined],
  ] as const)(
    "reads a campaign %s as its standing",
    async (_label, options, standing, decision) => {
      const row = await rowOf(await libraryCampaign(options));

      expect(row.standing).toBe(standing);
      expect(row.decision).toBe(decision);
    },
  );

  it("gives every viewer the same standing, so the list never differs by role", async () => {
    const campaign = await libraryCampaign();
    const standings = await Promise.all(
      [CREATOR, APPROVER, OWNER].map(
        async (principal) => (await rowOf(campaign, { principal })).standing,
      ),
    );

    expect(new Set(standings)).toEqual(new Set(["awaiting_approval"]));
  });

  it("falls back to the saved headline and no topic when the library no longer holds the ad", async () => {
    const row = await rowOf(await libraryCampaign(), { library: NO_LIBRARY });

    expect(row).toMatchObject({
      name: "Thinking about your first home? Start here.",
      topic: undefined,
      earlierFlow: false,
      thumbnail: undefined,
      sample: false,
      standing: "awaiting_approval",
    });
  });

  it("orders rows by their last change, newest first, and by reference when they tie", async () => {
    const [older, newer, tieA, tieB] = await Promise.all([
      rowOf(
        await libraryCampaign({
          campaignRef: "campaign_01Older",
          createdAt: "2026-09-01T10:00:00.000Z",
        }),
      ),
      rowOf(
        await libraryCampaign({
          campaignRef: "campaign_01Newer",
          createdAt: "2026-10-01T10:00:00.000Z",
        }),
      ),
      rowOf(
        await libraryCampaign({
          campaignRef: "campaign_01TieB",
          createdAt: "2026-09-15T10:00:00.000Z",
        }),
      ),
      rowOf(
        await libraryCampaign({
          campaignRef: "campaign_01TieA",
          createdAt: "2026-09-15T10:00:00.000Z",
        }),
      ),
    ]);

    expect(sortCampaignListRows([older, tieB, newer, tieA]).map((row) => row.campaignRef)).toEqual([
      "campaign_01Newer",
      "campaign_01TieA",
      "campaign_01TieB",
      "campaign_01Older",
    ]);
  });
});

describe("a campaign saved before PRD-009 (009E-AC-012, D4)", () => {
  it("opens as an earlier-flow page with its saved words, and nothing about a property", async () => {
    const page = await pageOf(await earlierFlowCampaign({ decision: "approved" }), {
      principal: OWNER,
    });

    expect(page.kind).toBe("earlier-flow");
    if (page.kind !== "earlier-flow") return;
    expect(page.headline).toBe("Tour this home this weekend");
    expect(page.body).toMatch(/open house/u);
    expect(page.decision?.decision).toBe("approved");
    expect(page.standing).toBe("approved");
    for (const key of [
      "propertyAddress",
      "address",
      "openHouseStartsAt",
      "realtorDisplayName",
      "approvalControls",
      "makeNewVersionHref",
    ]) {
      expect(page, key).not.toHaveProperty(key);
    }
    expect(JSON.stringify(page)).not.toContain("123 Main Street");
    expect(JSON.stringify(page)).not.toContain("Jordan Smith");
  });

  it("shows its saved headline as the row's name and the earlier flow as its topic", async () => {
    const row = await rowOf(await earlierFlowCampaign());

    expect(row).toMatchObject({
      name: "Tour this home this weekend",
      topic: undefined,
      earlierFlow: true,
      thumbnail: undefined,
      sample: false,
      startsOn: undefined,
      endsOn: undefined,
      standing: "awaiting_approval",
    });
    expect(JSON.stringify(row)).not.toContain("123 Main Street");
  });
});
