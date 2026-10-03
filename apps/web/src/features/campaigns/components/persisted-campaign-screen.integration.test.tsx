import type { LibraryAdCatalogStanding } from "@oalo/application";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AD_SCENARIOS,
  APPROVER,
  CHIP_FOR_REFUSAL,
  CREATOR,
  OWNER,
  daysOutsideTimeElements,
  earlierFlowCampaign,
  libraryCampaign,
  pageOf,
  ruleAnswerFor,
  sampleLibrary,
  scenarioLibrary,
  wholeSentence,
  type LibraryCampaignOptions,
} from "../../../server/campaign-page.test-support.js";
import { USE_NEW_VERSION_ASK } from "../../../copy/ads-library-messages.js";
import { glyphBeforeWords, glyphMarkup } from "../../../testing/glyph-markup.js";
import { PersistedCampaignScreen } from "./persisted-campaign-screen.js";

// The approval card refreshes the page after a decision (PRD-008b D2), and "Use the new version"
// opens step 3, so both need an app router.
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

type Principal = typeof OWNER;

/** Renders the campaign page for a built campaign, read by `principal`. */
async function renderCampaign(
  options: LibraryCampaignOptions = {},
  principal: Principal = OWNER,
  versionNo?: number,
) {
  const campaign = await libraryCampaign(options);
  const page = await pageOf(campaign, {
    principal,
    ...(versionNo === undefined ? {} : { versionNo }),
  });
  return render(<PersistedCampaignScreen page={page} />);
}

const SENT_BACK_NEEDS_NEW_VERSION =
  "It was sent back for changes, so it needs a new version before anyone can approve it.";

/**
 * PRD-009e 009E-AC-001. The header: the eyebrow, the ad's name as the h1, one line with the run
 * dates, where it shows, and the budget, the decision-aware chip, and the two actions with the
 * launch button's one sentence directly under them.
 */
describe("the campaign page header (009E-AC-001)", () => {
  it("shows the eyebrow, the ad's name, and the one line", async () => {
    await renderCampaign({
      startsAt: "2026-10-06T09:00:00.000Z",
      endsAt: "2026-10-20T23:59:59.000Z",
    });

    expect(screen.getByText("From the ads library, First-time buyers")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Sample: First home, start here" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        wholeSentence(
          "Set to run from Tue, Oct 6, 2026 until Tue, Oct 20, 2026, in Austin, TX and Texas. $25 a day, up to $350 in total.",
        ),
      ),
    ).toBeInTheDocument();
  });

  it("draws the Campaigns crumb as a sentence-sized link inside the crumb row (R2 F-4)", async () => {
    await renderCampaign();

    const crumbs = screen.getByRole("navigation", { name: "Where you are" });
    const link = within(crumbs).getByRole("link", { name: "Campaigns" });
    expect(link).toHaveAttribute("href", "/marketing/campaigns");
    expect(link).toHaveAttribute("data-variant", "sentence");
  });

  it("says the ad starts when it is launched when no start day was chosen", async () => {
    await renderCampaign({ endsAt: "2026-10-20T23:59:59.000Z" });

    expect(
      screen.getByText(
        wholeSentence(
          /^Set to run from launch until Tue, Oct 20, 2026, in Austin, TX and Texas\./u,
        ),
      ),
    ).toBeInTheDocument();
  });

  it.each([
    ["ready for approval", {}, "Ready for approval"],
    ["approved", { decision: "approved" as const }, "Approved"],
    ["sent back", { decision: "rejected" as const }, "Sent back for changes"],
    ["needing changes", { needsChanges: true }, "Needs changes"],
    ["on a retired ad", { adId: "sample-spring-search", adVersion: 1 }, "Ad retired"],
  ] as const)(
    "shows one chip that reads the decision when it is %s",
    async (_state, options, chip) => {
      const { container } = await renderCampaign(options);

      const chips = container.querySelectorAll("[data-campaign-standing]");
      expect(chips).toHaveLength(1);
      expect(chips[0]).toHaveTextContent(chip);
    },
  );

  /**
   * QA-11. The page's chip said "Ready for approval" for a version whose ad was replaced, whose
   * picture changed, or that the library no longer holds, beside a notice that said it could not be
   * approved. Each scenario asks the approval rule (`libraryAdRefusalFor`) and expects the chip step 3
   * draws for that answer, in the header and in the versions card, for everybody who reads the page.
   */
  it.each(AD_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
    "draws the chip the approval rule gives for %s, and says Ready for approval only where it allows one",
    async (_name, scenario) => {
      const library = await scenarioLibrary(scenario);
      const campaign = await libraryCampaign(scenario.campaign);
      const refusal = ruleAnswerFor(campaign, library);
      const expected = refusal === undefined ? "Ready for approval" : CHIP_FOR_REFUSAL[refusal];
      for (const principal of [OWNER, APPROVER, CREATOR]) {
        const { container, unmount } = render(
          <PersistedCampaignScreen page={await pageOf(campaign, { principal, library })} />,
        );

        const chips = container.querySelectorAll("[data-campaign-standing]");
        expect(chips, principal.role).toHaveLength(1);
        expect(chips[0]?.textContent, principal.role).toBe(expected);
        // The newest version's row in the versions card is the same standing, in the same words.
        const row = container.querySelector("[data-versions] li[data-version-no='1']");
        expect(row?.querySelector("[data-tone]")?.textContent, principal.role).toBe(expected);
        if (refusal === undefined) {
          expect(screen.getAllByText("Ready for approval").length).toBeGreaterThan(0);
        } else {
          expect(screen.queryByText("Ready for approval"), principal.role).toBeNull();
          expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
        }
        unmount();
      }
    },
  );

  it("lets a recorded decision win over each reason the library gives", async () => {
    for (const scenario of AD_SCENARIOS) {
      for (const [decision, chip] of [
        ["approved", "Approved"],
        ["rejected", "Sent back for changes"],
      ] as const) {
        const library = await scenarioLibrary(scenario);
        const page = await pageOf(await libraryCampaign({ ...scenario.campaign, decision }), {
          principal: OWNER,
          library,
        });
        const { container, unmount } = render(<PersistedCampaignScreen page={page} />);

        expect(
          container.querySelector("[data-campaign-standing]"),
          `${scenario.name} / ${decision}`,
        ).toHaveTextContent(chip);
        unmount();
      }
    }
  });

  it("offers Make a new version as the secondary action and a disabled Launch on Facebook as the primary", async () => {
    const { container } = await renderCampaign();

    const actions = container.querySelector("[data-header-actions]");
    if (actions === null) throw new Error("The header has no actions.");
    const makeNew = within(actions as HTMLElement).getByRole("link", {
      name: "Make a new version",
    });
    expect(makeNew).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=2&campaign=campaign_01LibraryPage&from=campaigns",
    );
    const launch = within(actions as HTMLElement).getByRole("button", {
      name: "Launch on Facebook",
    });
    expect(launch).toBeDisabled();
    expect(launch).toHaveAttribute("data-variant", "primary");
    expect(launch).not.toHaveAttribute("href");
    expect(launch).not.toHaveAttribute("formaction");
  });

  it("ties the launch button's one sentence to it, directly under the buttons", async () => {
    const { container } = await renderCampaign();

    const actions = container.querySelector("[data-header-actions]");
    if (actions === null) throw new Error("The header has no actions.");
    const launch = within(actions as HTMLElement).getByRole("button", {
      name: "Launch on Facebook",
    });
    const sentence = (actions as HTMLElement).querySelector(
      `#${CSS.escape(launch.getAttribute("aria-describedby") ?? "")}`,
    );
    expect(sentence).toHaveTextContent(
      "Launching on Facebook isn't turned on yet, and it needs Meta connected. See what's needed for Meta.",
    );
    expect(sentence?.previousElementSibling).toBe(actions.firstElementChild);
    expect(
      within(sentence as HTMLElement).getByRole("link", { name: "See what's needed for Meta" }),
    ).toHaveAttribute("href", "/settings/connections");
  });

  it("leaves Make a new version out for somebody who cannot save one", async () => {
    await renderCampaign({}, APPROVER);

    expect(screen.queryByRole("link", { name: "Make a new version" })).toBeNull();
    expect(screen.getByRole("button", { name: "Launch on Facebook" })).toBeDisabled();
  });

  it("leaves Make a new version out when the ad is retired, because it could not be saved", async () => {
    await renderCampaign({ adId: "sample-spring-search", adVersion: 1 });

    expect(screen.queryByRole("link", { name: "Make a new version" })).toBeNull();
  });
});

/** PRD-009e 009E-AC-002. The results card comes first and says nothing is counted yet. */
describe("the results card on the page (009E-AC-002)", () => {
  it("comes first, with the three figures in words, one chip and one sentence", async () => {
    const { container } = await renderCampaign();

    const results = container.querySelector("[data-results-card]");
    expect(results).not.toBeNull();
    const regions = [...container.querySelectorAll("[role='region']")];
    expect(regions[0]).toBe(results);
    expect(within(results as HTMLElement).getAllByText("Not live yet")).toHaveLength(4);
    expect(
      within(results as HTMLElement).getByText(
        "This ad isn't running, so there is nothing to count yet. Spend comes from Meta, and leads are counted when they reach HighLevel.",
      ),
    ).toBeInTheDocument();
    expect(results?.textContent ?? "").not.toMatch(/\d/u);
  });

  it("is not shown on an older version, which never ran", async () => {
    const { container } = await renderCampaign(
      { olderVersions: [{ decision: "rejected" }] },
      OWNER,
      1,
    );

    expect(container.querySelector("[data-results-card]")).toBeNull();
  });
});

/** PRD-009e 009E-AC-003. The approved version's ad, its facts, and who it shows to. */
describe("the ad on the page (009E-AC-003)", () => {
  it("shows the ad with the person's own band, labelled with its version", async () => {
    const { container } = await renderCampaign();

    const ad = container.querySelector("[data-ad-card]") as HTMLElement;
    expect(within(ad).getByRole("heading", { name: "The ad" })).toBeInTheDocument();
    expect(within(ad).getByText("Version 1")).toBeInTheDocument();
    expect(ad.querySelector("[data-ad-feed-preview]")).not.toBeNull();
    expect(ad.querySelector("[data-brand-band='brand']")).toHaveTextContent("Alex Morgan");
    expect(ad.querySelector("[data-brand-band='brand']")).toHaveTextContent("NMLS 0000000");
    expect(within(ad).getByRole("img")).toHaveAttribute(
      "src",
      "/api/ads-library/samples/sample-first-home/2/tall",
    );
  });

  it("names the library ad and its version, which words changed, and who it shows to", async () => {
    const { container } = await renderCampaign({
      headline: "Thinking about your first home? Begin here.",
    });

    const facts = container.querySelector("[data-ad-card] dl") as HTMLElement;
    expect(
      within(facts).getByText("Sample: First home, start here, library version 2"),
    ).toBeInTheDocument();
    expect(within(facts).getByText("Headline changed. Ad text unchanged")).toBeInTheDocument();
    const shows = within(facts).getByText("Austin, TX and everything within 15 miles");
    expect(shows.closest("ul")).toHaveTextContent("Texas");
    expect(shows.closest("ul")).toHaveTextContent("the Facebook feed");
  });

  // Writing review pass 2, W-33. One fact, one name: where an ad shows is "Where it shows" here, in
  // the list, and on step 2 and 3, and the library ad is "Library ad" here and on step 3.
  it("labels the facts with the names every other screen uses", async () => {
    const { container } = await renderCampaign();

    const facts = container.querySelector("[data-ad-card] dl") as HTMLElement;
    expect([...facts.querySelectorAll("dt")].map((term) => term.textContent)).toEqual([
      "Library ad",
      "Words",
      "Where it shows",
    ]);
    expect(within(facts).queryByText("Shows in")).toBeNull();
  });

  it("labels a sample ad wherever it appears on the page, with a name a screen reader reads", async () => {
    const { container } = await renderCampaign();

    expect(
      within(container.querySelector("[data-ad-card]") as HTMLElement).getByText("Sample ad"),
    ).toBeVisible();
  });

  it("shows the words alone, with a sentence saying why, when the picture cannot be drawn", async () => {
    const campaign = await libraryCampaign();
    const page = await pageOf(campaign, {
      principal: OWNER,
      library: { find: () => undefined, standingOf: () => undefined },
    });
    const { container } = render(<PersistedCampaignScreen page={page} />);

    const ad = container.querySelector("[data-ad-card]") as HTMLElement;
    expect(within(ad).getByText("The picture for this ad isn't available.")).toBeInTheDocument();
    expect(ad.querySelector("img")).toBeNull();
    expect(within(ad).getByText("Thinking about your first home? Start here.")).toBeInTheDocument();
    expect(within(ad).queryByText("Sample ad")).toBeNull();
  });
});

/** PRD-009e D2 and 009E-AC-004. Who decided, with the name beside the role, or the role alone. */
describe("the approval on the page (009E-AC-004)", () => {
  it("names the decider beside their role and the date, and says what the approval covers", async () => {
    await renderCampaign({
      decision: "approved",
      decidedBy: "location_admin",
      approverDisplayName: "Alex Morgan",
    });

    const approval = screen.getByRole("region", { name: "Approval" });
    expect(approval).toHaveTextContent("Approved by Alex Morgan, workspace owner, on Oct 1, 2026.");
    expect(within(approval).getByText("Alex Morgan").tagName).toBe("STRONG");
    expect(within(approval).getByText("Oct 1, 2026")).toHaveAttribute(
      "datetime",
      "2026-10-01T12:00:00.000Z",
    );
    expect(approval).toHaveTextContent(
      "The approval covers this version and these words only. A new version needs its own approval.",
    );
  });

  it("says the role and the date alone for a decision recorded without a name", async () => {
    await renderCampaign({ decision: "approved", decidedBy: "location_admin" });

    const approval = screen.getByRole("region", { name: "Approval" });
    expect(approval).toHaveTextContent("Approved by the workspace owner on Oct 1, 2026.");
    expect(within(approval).queryByRole("strong")).toBeNull();
  });

  it("says an approver, with or without a name", async () => {
    await renderCampaign({ decision: "approved" });

    expect(screen.getByRole("region", { name: "Approval" })).toHaveTextContent(
      "Approved by an approver on Oct 1, 2026.",
    );
  });

  it("says nobody has approved a version nobody has decided on", async () => {
    await renderCampaign();

    const approval = screen.getByRole("region", { name: "Approval" });
    expect(approval).toHaveTextContent("Nobody has approved this version yet.");
    expect(approval).not.toHaveTextContent("covers this version");
  });

  it("says who sent a version back, with the name beside the role", async () => {
    await renderCampaign({
      decision: "rejected",
      decidedAt: "2026-09-30T10:00:00.000Z",
      approverDisplayName: "Casey Rivera",
    });

    const approval = screen.getByRole("region", { name: "Approval" });
    expect(approval).toHaveTextContent(
      "Sent back for changes by Casey Rivera, approver, on Sep 30, 2026.",
    );
    expect(approval).not.toHaveTextContent("covers this version");
  });

  /** The name is text, whatever the person typed at sign-up (D2). */
  it("shows a name that looks like markup as the characters it is", async () => {
    const { container } = await renderCampaign({
      decision: "approved",
      approverDisplayName: "<img src=x onerror=alert(1)> Alex",
    });

    expect(container.querySelector("img[onerror]")).toBeNull();
    expect(screen.getByRole("region", { name: "Approval" })).toHaveTextContent(
      "<img src=x onerror=alert(1)> Alex",
    );
  });
});

/** PRD-009e D3 and 009E-AC-005. Every version, and older ones read-only at their own address. */
describe("the versions on the page (009E-AC-005)", () => {
  const OLDER = [
    {
      decision: "rejected" as const,
      decidedAt: "2026-09-30T10:00:00.000Z",
      createdAt: "2026-09-29T10:00:00.000Z",
    },
  ];

  it("lists every version newest first with its chip, who saved it, and who decided on it", async () => {
    await renderCampaign({ olderVersions: OLDER, createdBy: OWNER.actorRef });

    const versions = screen.getByRole("region", { name: "Versions" });
    const rows = within(versions).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Version 2");
    expect(rows[0]).toHaveTextContent("Ready for approval");
    expect(rows[0]).toHaveTextContent("Saved on Oct 1, 2026 by you");
    expect(rows[1]).toHaveTextContent("Version 1");
    expect(rows[1]).toHaveTextContent("Sent back for changes");
    expect(rows[1]).toHaveTextContent("Saved on Sep 29, 2026");
    expect(rows[1]).not.toHaveTextContent("by you");
    expect(rows[1]).toHaveTextContent("Sent back on Sep 30, 2026 by an approver");
  });

  it("opens an older version at its own address and leaves the shown one unlinked", async () => {
    await renderCampaign({ olderVersions: OLDER });

    const versions = screen.getByRole("region", { name: "Versions" });
    expect(within(versions).getByRole("link", { name: /^Open\s+Version 1$/u })).toHaveAttribute(
      "href",
      "/marketing/campaigns/campaign_01LibraryPage/versions/1",
    );
    expect(within(versions).getAllByRole("link")).toHaveLength(1);
  });

  // Writing review W-6: `aria-current` told only assistive technology which row was on screen.
  it("says in words which version is on screen, where the other rows say Open", async () => {
    await renderCampaign({ olderVersions: OLDER });

    const rows = within(screen.getByRole("region", { name: "Versions" })).getAllByRole("listitem");
    expect(rows[0]).toHaveAttribute("aria-current", "true");
    expect(rows[0]).toHaveTextContent("Viewing now");
    expect(rows[1]).not.toHaveTextContent("Viewing now");
    expect(rows[1]).toHaveTextContent("Open");
  });

  it("shows an older version read-only, with no approve, launch, or new-version control", async () => {
    const { container } = await renderCampaign({ olderVersions: OLDER }, OWNER, 1);

    expect(
      screen.getByText(
        "You're looking at an older version. It can't be approved, launched or changed from here.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See the latest version" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/campaign_01LibraryPage",
    );
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send back for changes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Launch on Facebook" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Make a new version" })).toBeNull();
    expect(container.querySelector("[data-approval-card]")).toBeNull();
    // It still says what it was: version 1, sent back, and who sent it back.
    expect(
      within(container.querySelector("[data-ad-card]") as HTMLElement).getByText("Version 1"),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Approval" })).toHaveTextContent(
      "Sent back for changes by an approver on Sep 30, 2026.",
    );
    expect(container.querySelector("[data-campaign-standing]")).toHaveTextContent(
      "Sent back for changes",
    );
  });
});

/** PRD-009e 009E-AC-006. Library notices appear only when they apply, each with at most one action. */
describe("the library notices on the page (009E-AC-006)", () => {
  it("shows no notice when none applies", async () => {
    const { container } = await renderCampaign();

    expect(container.querySelector("[data-library-notices]")).toBeNull();
  });

  it("says the ad was retired and offers choosing another ad for a version nobody approved", async () => {
    await renderCampaign({ adId: "sample-spring-search", adVersion: 1 });

    const notice = screen.getByText(
      wholeSentence(
        "This ad was taken out of the library on Sep 30, 2026, so this version can't be approved. Your budget, dates and area are kept.",
      ),
    );
    const item = notice.closest("li") as HTMLElement;
    expect(within(item).getAllByRole("link")).toHaveLength(1);
    expect(within(item).getByRole("link", { name: "Choose another ad" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=1&campaign=campaign_01LibraryPage&from=campaigns",
    );
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
  });

  // The writing review delta check, D-5. A retired ad whose retirement day the library did not record
  // says "taken out of the library" here as on step 3, and "isn't in the library" stays the missing
  // ad's sentence.
  it("says a retirement with no day on record the way step 3 does", async () => {
    const sample = await sampleLibrary();
    const campaign = await libraryCampaign({ adId: "sample-spring-search", adVersion: 1 });
    const page = await pageOf(campaign, {
      principal: OWNER,
      library: {
        find: (id: string, version: number) => {
          const found = sample.find(id, version);
          if (found === undefined) return undefined;
          const entry = { ...found.entry } as { retired?: unknown };
          delete entry.retired;
          return { ...found, entry: entry as typeof found.entry };
        },
        standingOf: sample.standingOf.bind(sample),
      },
    });
    render(<PersistedCampaignScreen page={page} />);

    const notice = screen.getByText(
      "This ad was taken out of the library, so this version can't be approved.",
    );
    expect(
      within(notice.closest("li") as HTMLElement).getByRole("link", { name: "Choose another ad" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("This ad isn't in the library, so this version can't be approved."),
    ).toBeNull();
  });

  it("only says an approved campaign keeps the version it approved when its ad is retired", async () => {
    await renderCampaign({
      adId: "sample-spring-search",
      adVersion: 1,
      decision: "approved",
    });

    const notice = screen.getByText(
      wholeSentence(
        "This ad was taken out of the library on Sep 30, 2026. This campaign keeps its approved version.",
      ),
    );
    expect(within(notice.closest("li") as HTMLElement).queryByRole("link")).toBeNull();
    expect(within(notice.closest("li") as HTMLElement).queryByRole("button")).toBeNull();
  });

  it("says a newer version exists and offers using it for a version nobody approved", async () => {
    await renderCampaign({ adVersion: 1 });

    const item = screen
      .getByText("A newer version of this ad is in the library.")
      .closest("li") as HTMLElement;
    expect(within(item).getByRole("button", { name: "Use the new version" })).toBeInTheDocument();
    expect(within(item).getAllByRole("button")).toHaveLength(1);
  });

  it("only says a newer version exists for a version somebody has decided on, with no action", async () => {
    for (const decision of ["approved", "rejected"] as const) {
      const { unmount } = await renderCampaign({ adVersion: 1, decision });

      const item = screen
        .getByText("A newer version of this ad is in the library.")
        .closest("li") as HTMLElement;
      expect(within(item).queryByRole("button"), decision).toBeNull();
      expect(within(item).queryByRole("link"), decision).toBeNull();
      unmount();
    }
  });

  it("only says a newer version exists to somebody who cannot save a version", async () => {
    await renderCampaign({ adVersion: 1 }, APPROVER);

    const item = screen
      .getByText("A newer version of this ad is in the library.")
      .closest("li") as HTMLElement;
    expect(within(item).queryByRole("button")).toBeNull();
  });

  /**
   * QA-12. An approver who cannot save a version, arriving from the hand-off link, saw the Approval
   * card, no Approve, and "A newer version of this ad is in the library." with nothing to press, no
   * reason, and nobody named. Step 3 names who can (writing review delta check, D-3), in
   * `USE_NEW_VERSION_ASK`, and the page now says that same sentence in the same place. Step 3's own
   * test is in `launch-review.integration.test.tsx`.
   */
  it("tells somebody who can't save a version who can, in the sentence step 3 uses, and nobody else", async () => {
    const sentence = "Ask the campaign creator or your workspace owner to use the new version.";
    expect(USE_NEW_VERSION_ASK).toBe(sentence);
    const noticeOf = () =>
      screen
        .getByText("A newer version of this ad is in the library.")
        .closest("li") as HTMLElement;

    const approver = await renderCampaign({ adVersion: 1 }, APPROVER);
    expect(within(noticeOf()).getByText(sentence)).toBeInTheDocument();
    expect(within(noticeOf()).queryByRole("button")).toBeNull();
    expect(within(noticeOf()).queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    approver.unmount();

    // Somebody who can save a version has the action, and is not told to ask anybody else.
    const owner = await renderCampaign({ adVersion: 1 }, OWNER);
    expect(
      within(noticeOf()).getByRole("button", { name: "Use the new version" }),
    ).toBeInTheDocument();
    expect(within(noticeOf()).queryByText(sentence)).toBeNull();
    owner.unmount();

    // A version somebody decided on has nothing left to move, so nobody is asked to move it.
    for (const decision of ["approved", "rejected"] as const) {
      const decided = await renderCampaign({ adVersion: 1, decision }, APPROVER);
      expect(within(noticeOf()).queryByText(sentence), decision).toBeNull();
      decided.unmount();
    }
  });

  it("says the ad is not in the library when the catalog does not hold it", async () => {
    const campaign = await libraryCampaign();
    const page = await pageOf(campaign, {
      principal: OWNER,
      library: { find: () => undefined, standingOf: () => undefined },
    });
    render(<PersistedCampaignScreen page={page} />);

    expect(
      screen.getByText("This ad isn't in the library, so this version can't be approved."),
    ).toBeInTheDocument();
  });

  /**
   * The writing review delta check, D-4. Where the page offers no Approve because the approval
   * command would refuse (QA-06), it says why, in the sentences step 3 and the approval refusal say.
   * An approver who followed the hand-off link used to see an Approval card with nothing to press and
   * no reason.
   */
  async function renderWithStanding(
    change: Partial<LibraryAdCatalogStanding>,
    principal: Principal = OWNER,
    options: LibraryCampaignOptions = {},
  ) {
    const sample = await sampleLibrary();
    const page = await pageOf(await libraryCampaign(options), {
      principal,
      library: {
        find: sample.find.bind(sample),
        standingOf: (ad: Readonly<{ id: string; version: number }>) => {
          const standing = sample.standingOf(ad);
          return standing === undefined ? undefined : { ...standing, ...change };
        },
      },
    });
    return render(<PersistedCampaignScreen page={page} />);
  }
  const ART_CHANGED = { tallSha256: "0".repeat(64) } as const;

  it("says the picture changed, and offers a new version, where Approve is gone for a changed picture", async () => {
    await renderWithStanding(ART_CHANGED);

    const item = screen
      .getByText(
        "The picture for this ad changed after this version was saved, so this version can't be approved.",
      )
      .closest("li") as HTMLElement;
    expect(item).toHaveAttribute("data-notice", "art-changed");
    expect(within(item).getAllByRole("link")).toHaveLength(1);
    expect(within(item).getByRole("link", { name: "Make a new version" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=2&campaign=campaign_01LibraryPage&from=campaigns",
    );
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
  });

  it("gives an approver the reason, and no link they could not use, for a changed picture", async () => {
    await renderWithStanding(ART_CHANGED, APPROVER);

    const item = screen
      .getByText(
        "The picture for this ad changed after this version was saved, so this version can't be approved.",
      )
      .closest("li") as HTMLElement;
    expect(within(item).queryByRole("link")).toBeNull();
    expect(within(item).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
  });

  it("says nothing about a changed picture on a version somebody approved", async () => {
    const { container } = await renderWithStanding(ART_CHANGED, OWNER, { decision: "approved" });

    expect(container.querySelector("[data-notice='art-changed']")).toBeNull();
  });

  it("says a newer version is in the library, and offers another ad, when it cannot offer the new one", async () => {
    await renderWithStanding({ status: "replaced", highestStatus: "replaced" });

    const item = screen
      .getByText(
        "A newer version of this ad is in the library, so this version can't be approved. Your budget, dates and area are kept.",
      )
      .closest("li") as HTMLElement;
    expect(item).toHaveAttribute("data-notice", "replaced");
    expect(within(item).getByRole("link", { name: "Choose another ad" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=1&campaign=campaign_01LibraryPage&from=campaigns",
    );
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
  });
});

/** PRD-009e 009E-AC-007. The one collapsed region where identifiers may appear. */
describe("the details for support on the page (009E-AC-007)", () => {
  it("is a collapsed region holding only the version reference, the library ad, and the support reference", async () => {
    const { container } = await renderCampaign();

    const details = container.querySelector("details[data-support-details]") as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(within(details).getByText("Details for support")).toBeInTheDocument();
    const rows = [...details.querySelectorAll("dl > div")].map((row) => [
      row.querySelector("dt")?.textContent,
      row.querySelector("dd")?.textContent,
    ]);
    expect(rows).toEqual([
      ["Version ID", "campaignversion_01LibraryV1"],
      ["Library ad", "sample-first-home, version 2"],
      ["Support reference", "campaign_01LibraryPage"],
    ]);
    expect(container.querySelectorAll("details[data-support-details]")).toHaveLength(1);
  });

  it("keeps every identifier out of the page's own words", async () => {
    const { container } = await renderCampaign({
      decision: "approved",
      approverDisplayName: "Alex Morgan",
    });

    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-support-details]").forEach((node) => node.remove());
    const text = clone.textContent ?? "";
    for (const identifier of [
      "campaignversion_",
      "campaign_01",
      "sample-first-home",
      "manifest",
      "libcreative_",
    ]) {
      expect(text, identifier).not.toContain(identifier);
    }
  });
});

/**
 * PRD-009e 009E-AC-008. No address, open house time, Realtor partner, contact list, lead table,
 * pipeline, appointment, application, or funded figure, and no link to /leads. The source scan of
 * both pages' components is in `campaign-page-source-scan.unit.test.ts`.
 */
describe("what the campaign page never shows (009E-AC-008)", () => {
  it("shows no property, open house time, Realtor, or CRM figure and links nowhere near /leads", async () => {
    const { container } = await renderCampaign({ decision: "approved" });

    const text = container.textContent ?? "";
    for (const forbidden of [
      /open house/iu,
      /realtor partner/iu,
      /pipeline/iu,
      /appointment/iu,
      /application/iu,
      /funded/iu,
      /lead table/iu,
      /contacts?\b/iu,
    ]) {
      expect(text, String(forbidden)).not.toMatch(forbidden);
    }
    for (const link of container.querySelectorAll("a")) {
      expect(link.getAttribute("href") ?? "", link.textContent ?? "").not.toMatch(/^\/leads/u);
    }
  });
});

/** PRD-008b. The approve control and the checks, as the page reads the recorded decision. */
describe("the approve control on the page (PRD-008b)", () => {
  it("keeps approval unavailable for creators and enabled for approvers", async () => {
    const forCreator = await renderCampaign({}, CREATOR);
    expect(
      screen.getByText("Only an approver or your workspace owner can approve a campaign."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeDisabled();
    forCreator.unmount();

    await renderCampaign({}, APPROVER);
    expect(screen.getByRole("button", { name: "Approve this version" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Send back for changes" })).toBeEnabled();
  });

  it("stops saying an approved version is ready for approval, and offers no control to approve it again", async () => {
    const { container } = await renderCampaign({ decision: "approved" });

    expect(screen.queryByText("Ready for approval")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send back for changes" })).toBeNull();
    expect(container.querySelector("[data-approval-card]")).toBeNull();
    expect(screen.queryByText(SENT_BACK_NEEDS_NEW_VERSION)).toBeNull();
    expect(screen.getByRole("region", { name: "Approval" })).toHaveTextContent("Approved by");
  });

  it("says a sent-back version was sent back and never that it is ready for approval", async () => {
    await renderCampaign({ decision: "rejected" });

    expect(screen.queryAllByText("Ready for approval")).toHaveLength(0);
    expect(screen.getAllByText("Sent back for changes").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send back for changes" })).toBeNull();
    // The Approval section says what the sent-back version needs, once.
    expect(screen.getByRole("region", { name: "Approval" })).toHaveTextContent(
      SENT_BACK_NEEDS_NEW_VERSION,
    );
    expect(screen.getAllByText(SENT_BACK_NEEDS_NEW_VERSION)).toHaveLength(1);
  });

  it.each([
    ["an approver", APPROVER],
    ["a campaign creator", CREATOR],
  ])(
    "gives %s the checks as the reason on a version that needs changes",
    async (_who, principal) => {
      const { container } = await renderCampaign({ needsChanges: true }, principal);

      const control = container.querySelector("[data-approval-card]") as HTMLElement;
      expect(
        within(control).getByText("This version needs changes before anyone can approve it."),
      ).toBeInTheDocument();
      expect(within(control).getByRole("button", { name: "Approve this version" })).toBeDisabled();
      expect(container.querySelector("[data-hand-off]")).toBeNull();
      const fixes = screen.getByRole("region", { name: "What to fix" });
      expect(within(fixes).getAllByRole("listitem").length).toBeGreaterThan(0);
    },
  );

  it("puts the approval section above the control on a version still waiting", async () => {
    const { container } = await renderCampaign({}, APPROVER);

    const order = [
      ...container.querySelectorAll("[data-approval-section], [data-approval-card]"),
    ].map((node) => (node.hasAttribute("data-approval-section") ? "section" : "control"));
    expect(order).toEqual(["section", "control"]);
  });
});

/** PRD-009e D4 and 009E-AC-012. A campaign saved before PRD-009 opens read-only with one line. */
describe("a campaign saved before PRD-009 (009E-AC-012)", () => {
  async function renderEarlier(decision?: "approved" | "rejected", principal: Principal = OWNER) {
    const page = await pageOf(
      await earlierFlowCampaign(decision === undefined ? {} : { decision }),
      {
        principal,
      },
    );
    return render(<PersistedCampaignScreen page={page} />);
  }

  it("says it was made with the earlier flow and shows its saved words", async () => {
    const { container } = await renderEarlier();

    expect(container.querySelector("[data-campaign-page='earlier-flow']")).not.toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Tour this home this weekend" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Made with the earlier open house tool.")).toBeInTheDocument();
    const words = screen.getByRole("region", { name: "The saved words" });
    expect(words).toHaveTextContent(
      "Join us for the open house and explore the property in person.",
    );
    expect(words).toHaveTextContent("Equal Housing Opportunity.");
  });

  it("titles the saved words at the section step, as the library-ad page's main cards are (pass 3, R2 P3-5)", async () => {
    await renderEarlier();

    // "The ad" and "Results" are `.cardHead h2` (`--text-section-size`); the side cards "Approval" and
    // "Versions" are `.cardTitle` (`--text-card-size`). The main column's card is not a side card.
    const title = screen.getByRole("heading", { level: 2, name: "The saved words" });
    expect(title.className).not.toMatch(/cardTitle/u);
    expect(title.parentElement?.className).toMatch(/cardHead/u);
    for (const side of ["Approval", "Versions"]) {
      expect(screen.getByRole("heading", { level: 2, name: side }).className).toMatch(/cardTitle/u);
    }
  });

  it("offers Launch an ad and no Make a new version, approve control, or launch button", async () => {
    await renderEarlier();

    expect(screen.getByRole("link", { name: "Launch an ad" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new?step=1&from=campaigns",
    );
    expect(screen.queryByRole("link", { name: "Make a new version" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve this version" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Launch on Facebook" })).toBeNull();
  });

  it("shows its recorded decision and never a property field", async () => {
    const { container } = await renderEarlier("approved");

    expect(screen.getByRole("region", { name: "Approval" })).toHaveTextContent(
      "Approved by an approver on Sep 20, 2026.",
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain("123 Main Street");
    expect(text).not.toContain("Jordan Smith");
    expect(text).not.toContain("Dallas");
    expect(text).not.toMatch(/\b2030\b/u);
  });

  it("keeps its one detail region to the version reference and the support reference", async () => {
    const { container } = await renderEarlier();

    const details = container.querySelector("details[data-support-details]") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect([...details.querySelectorAll("dt")].map((term) => term.textContent)).toEqual([
      "Version ID",
      "Support reference",
    ]);
  });
});

/**
 * Every date is a `time` element (PRD-008d, 009a), so the global stylesheet draws it with tabular
 * figures in the interface face, which the browser's design-quality check holds every photographed
 * screen to. Found on CI for the header line and the versions card.
 */
describe("the dates on the campaign page", () => {
  it.each([
    ["ready for approval", {}],
    ["approved", { decision: "approved" as const }],
    ["sent back", { decision: "rejected" as const }],
    [
      "approved on a retired ad",
      { adId: "sample-spring-search", adVersion: 1, decision: "approved" as const },
    ],
    ["undecided on a retired ad", { adId: "sample-spring-search", adVersion: 1 }],
  ] as const)("are all in time elements when the campaign is %s", async (_state, options) => {
    const { container } = await renderCampaign({
      startsAt: "2026-10-06T09:00:00.000Z",
      endsAt: "2026-10-20T23:59:59.000Z",
      ...options,
    });

    expect(daysOutsideTimeElements(container)).toEqual([]);
    expect(container.querySelectorAll("time").length).toBeGreaterThan(0);
  });

  it("gives the run dates and the saved date their own machine values", async () => {
    const { container } = await renderCampaign({
      startsAt: "2026-10-06T09:00:00.000Z",
      endsAt: "2026-10-20T23:59:59.000Z",
    });

    const lead = container.querySelector("header p:nth-of-type(2)") as HTMLElement;
    expect([...lead.querySelectorAll("time")].map((time) => time.getAttribute("datetime"))).toEqual(
      ["2026-10-06", "2026-10-20"],
    );
    const versions = container.querySelector("[data-versions]") as HTMLElement;
    expect(versions.querySelector("time")).toHaveTextContent(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/u);
  });

  it("are in time elements on a page made before PRD-009", async () => {
    const earlier = render(
      <PersistedCampaignScreen
        page={await pageOf(await earlierFlowCampaign(), { principal: OWNER })}
      />,
    );

    expect(daysOutsideTimeElements(earlier.container)).toEqual([]);
  });
});

/**
 * PRD-009 design direction 6.5 and 009d D8: a version whose checks found something is drawn with the
 * chip "Needs changes", the plain fixes, and "Make a new version". The design gives it no heading
 * of its own: "Needs changes" is the chip, and "What to fix" heads the fixes.
 */
describe("a campaign that needs changes", () => {
  it("shows the chip, the plain fixes, and Make a new version, and no heading called Needs changes", async () => {
    const { container } = await renderCampaign({ needsChanges: true });

    const chip = container.querySelector("[data-campaign-standing='preflight_failed']");
    expect(chip).toHaveTextContent("Needs changes");
    const fixes = screen.getByRole("region", { name: "What to fix" });
    expect(within(fixes).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Make a new version" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Needs changes" })).toBeNull();
  });
});

/**
 * The scored baseline review of 2026-10-03, pass 1, part R2 (009G-AC-006). What each finding's
 * picture showed is held in the page's own structure here; the stylesheet's measures are pinned in
 * `campaign-page-layout.unit.test.ts`.
 */
describe("a library notice's glyph (review R2, F-3)", () => {
  it.each([
    ["a retired ad", { adId: "sample-spring-search", adVersion: 1 }],
    [
      "a retired ad on an approved version",
      { adId: "sample-spring-search", adVersion: 1, decision: "approved" as const },
    ],
  ] as const)(
    "is in the row of its sentence, first, so it sits on the sentence's first line, for %s",
    async (_state, options) => {
      const { container } = await renderCampaign(options);

      const text = container.querySelector("[data-notice] p") as HTMLElement;
      expect(text).not.toBeNull();
      // The glyph and the sentence are the row's two children and nothing else: the glyph is a block,
      // so left among running words it takes a line of its own.
      expect([...text.children].map((child) => child.tagName.toLowerCase())).toEqual([
        "svg",
        "span",
      ]);
      expect(text.firstElementChild).toHaveAttribute("aria-hidden", "true");
      expect(text.lastElementChild?.textContent ?? "").toMatch(
        /^This ad was taken out of the library/u,
      );
    },
  );
});

describe("the cards on the campaign page (review R2, F-2)", () => {
  /** The inner padding every card on the page takes from `Surface` and `Card`. */
  function insets(container: HTMLElement): string[] {
    return [...container.querySelectorAll("[data-padding]")].map(
      (card) => card.getAttribute("data-padding") ?? "",
    );
  }

  it("gives every card one inset, whatever the page holds", async () => {
    const { container } = await renderCampaign({ needsChanges: true });

    const names = [
      "[data-results-card]",
      "[data-ad-card]",
      "[data-approval-section]",
      "[data-fixes]",
      "[data-approval-card]",
      "[data-versions]",
    ];
    for (const selector of names) {
      expect(container.querySelector(selector), `a ${selector}`).not.toBeNull();
      expect(container.querySelector(selector)).toHaveAttribute("data-padding", "lg");
    }
    expect(new Set(insets(container))).toEqual(new Set(["lg"]));
  });

  it("gives the older-version notice and the approved page the same inset", async () => {
    const older = await renderCampaign(
      {
        olderVersions: [
          {
            decision: "rejected",
            decidedAt: "2026-09-30T10:00:00.000Z",
            createdAt: "2026-09-29T10:00:00.000Z",
          },
        ],
      },
      OWNER,
      1,
    );
    expect(older.container.querySelector("[data-older-version]")).not.toBeNull();
    expect(new Set(insets(older.container))).toEqual(new Set(["lg"]));
    older.unmount();

    const approved = await renderCampaign({ decision: "approved" }, OWNER);
    expect(new Set(insets(approved.container))).toEqual(new Set(["lg"]));
  });

  it("gives a page made before PRD-009 the same inset", async () => {
    const campaign = await earlierFlowCampaign({ decision: "approved" });
    const page = await pageOf(campaign, { principal: OWNER });
    const { container } = render(<PersistedCampaignScreen page={page} />);

    expect(new Set(insets(container))).toEqual(new Set(["lg"]));
  });
});

/**
 * The scored baseline review of 2026-10-03, pass 2, part R2, N-2 and N-1. The mockup draws a glyph
 * before the words of each action on the page (`campaign-detail.html`), and the `Button` and the
 * `action` link are rows, so a glyph passed with the words sits on their first line.
 */
describe("the glyphs on the campaign page's actions (review pass 2, R2 N-2)", () => {
  it("draws a pencil before 'Make a new version' and a rocket before 'Launch on Facebook'", async () => {
    await renderCampaign();

    expect(glyphBeforeWords(screen.getByRole("link", { name: "Make a new version" }))).toBe(
      glyphMarkup("pencil"),
    );
    expect(glyphBeforeWords(screen.getByRole("button", { name: "Launch on Facebook" }))).toBe(
      glyphMarkup("rocket"),
    );
  });

  it("draws a plus before 'Launch an ad' on a page saved before PRD-009, in the header's action wrappers", async () => {
    const page = await pageOf(await earlierFlowCampaign(), { principal: OWNER });
    const { container } = render(<PersistedCampaignScreen page={page} />);

    const link = screen.getByRole("link", { name: "Launch an ad" });
    expect(glyphBeforeWords(link)).toBe(glyphMarkup("plus"));
    // The wrappers the phone rules stretch, so the action spans the column on a phone (N-3).
    const actions = link.closest("[data-launch-an-ad-actions]");
    expect(container.querySelector("header")).toContainElement(actions as HTMLElement);
  });
});

describe("a library notice's card (review pass 2, R2 N-1)", () => {
  it("is a Surface at the large inset, so a phone takes the primitive's phone inset with every other card", async () => {
    const { container } = await renderCampaign({ adId: "sample-spring-search", adVersion: 1 });

    const notice = container.querySelector("[data-notice]") as HTMLElement;
    expect(notice).not.toBeNull();
    const card = notice.querySelector("[data-padding]");
    expect(card).toHaveAttribute("data-padding", "lg");
    expect(card).toHaveAttribute("data-variant", "card");
  });
});
