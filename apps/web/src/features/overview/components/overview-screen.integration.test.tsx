import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdsLibraryTopic } from "@oalo/contracts";
import { Icon, type IconName, type IconSize, type IconTone } from "@oalo/ui";

import { buildHomeChecklist, type SavedBrandRecord } from "../model/home-checklist.js";
import type { HomeCampaignRow, HomeList } from "../model/home-campaigns.js";
import type { HomeData } from "../model/home-view.js";
import {
  connectionStatements,
  connectionStatementsOutsideTheSetupCard,
  repeatedConnectionStatements,
} from "./connection-statements.test-support.js";
import { OverviewScreen } from "./overview-screen.js";

/**
 * PRD-009b 009B-AC-001, 002, 004, 006, 007, 008, 009, 010, and 014, at the screen.
 *
 * The screen takes the server read's answer and draws it, so each case here hands it the answer a
 * real account would get: a brand-new owner, an owner with everything saved, an approver with a
 * campaign waiting. The server read's own rules are in `home-reads.unit.test.ts` and, against real
 * rows, `home-reads.postgres.test.ts`.
 */

const ALL_TOPICS: readonly AdsLibraryTopic[] = [
  "first-time-buyers",
  "refinance",
  "va-loans",
  "pre-approval",
  "down-payment-help",
];

const NO_ROWS: HomeList = { rows: [], total: 0 };

function homeData(
  overrides: Partial<{
    topics: readonly AdsLibraryTopic[];
    installationStatuses: Parameters<typeof buildHomeChecklist>[0]["installationStatuses"];
    brand: SavedBrandRecord;
    running: HomeList;
    approval: HomeList | undefined;
  }> = {},
): HomeData {
  return {
    checklist: buildHomeChecklist({
      installationStatuses: overrides.installationStatuses ?? [],
      brand: overrides.brand,
    }),
    topics: overrides.topics ?? ALL_TOPICS,
    running: overrides.running ?? NO_ROWS,
    approval: "approval" in overrides ? overrides.approval : NO_ROWS,
  };
}

function row(overrides: Partial<HomeCampaignRow> = {}): HomeCampaignRow {
  return {
    campaignRef: "campaign_one",
    name: "First home, start here",
    href: "/marketing/campaigns/campaign_one",
    startsAt: "2026-10-03T14:00:00.000Z",
    endsAt: "2026-10-17T14:00:00.000Z",
    statusLabel: "With Meta",
    sample: false,
    ...overrides,
  };
}

function renderHome(data: HomeData = homeData(), props: { reviewSetup?: boolean } = {}) {
  return render(<OverviewScreen firstName="Alex" home={data} {...props} />);
}

function card(name: string): HTMLElement {
  const section = screen.getByRole("region", { name });
  return section;
}

describe("the composition (009B-AC-001)", () => {
  it("draws the greeting, the start card, the checklist, the two lists, and the footer, in that order", () => {
    const { container } = renderHome();
    const text = container.textContent ?? "";
    const positions = [
      "Welcome, Alex.",
      "Launch an ad",
      "Get set up",
      "Running now",
      "Needs your approval",
      "HighLevel stays your CRM. Your contacts, pipelines and follow-up live there.",
    ].map((fragment) => text.indexOf(fragment));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);
  });

  it("draws a notice above the greeting, as a child of the page, so the page's own gap spaces it (scored review pass 2, R4-13)", () => {
    const { container } = render(
      <OverviewScreen
        firstName="Alex"
        home={homeData()}
        notice={<p data-testid="notice">Your password is saved.</p>}
      />,
    );
    const page = container.firstElementChild;
    const notice = screen.getByTestId("notice");

    // The notice and the greeting are siblings in the one grid whose gap is the page gap, the
    // notice first; a wrapper outside the page would need its own copy of that gap.
    expect(notice.parentElement).toBe(page);
    expect(page?.firstElementChild).toBe(notice);
    expect(notice.nextElementSibling?.textContent).toBe("Welcome, Alex.");
  });

  it("draws nothing above the greeting when there is no notice", () => {
    const { container } = renderHome();

    expect(container.firstElementChild?.firstElementChild?.textContent).toBe("Welcome, Alex.");
  });

  it("draws nothing a CRM would: no metric, numbers, quick actions, coming-later row, or gallery", () => {
    const { container } = renderHome();

    for (const gone of [
      "Your numbers",
      "More numbers",
      "Quick actions",
      "More quick actions",
      "Coming later",
      "How things stand",
      "Needs your attention",
      "What you have going on",
      "What happened lately",
      "Your workspace",
      "Examples only",
    ]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
    expect(container.querySelector(".oalo-metric")).toBeNull();
    expect(container.querySelector("[data-overview-state]")).toBeNull();
    expect(container.querySelector("[data-demo-label]")).toBeNull();
    expect(screen.queryByText(/Realtor partner/iu)).toBeNull();
  });

  it("links to no section the product removed", () => {
    const { container } = renderHome(
      homeData({ running: { rows: [row()], total: 1 }, approval: { rows: [row()], total: 1 } }),
    );
    const hrefs = [...container.querySelectorAll("a")].map((anchor) => anchor.getAttribute("href"));

    expect(
      hrefs.filter((href) =>
        /^\/(?:leads|automations|reports|marketplace|onboarding)\b/u.test(href ?? ""),
      ),
    ).toEqual([]);
    expect(hrefs.filter((href) => /synthetic/iu.test(href ?? ""))).toEqual([]);
  });

  it("greets by first name, and plainly when the account has no name", () => {
    const { unmount } = renderHome();
    expect(screen.getByText("Welcome, Alex.")).toBeInTheDocument();
    unmount();

    render(<OverviewScreen firstName={undefined} home={homeData()} />);
    expect(screen.getByText("Welcome.")).toBeInTheDocument();
  });
});

describe("the start card (009B-AC-002)", () => {
  it("has the page's one h1, the corrected lead, and the question", () => {
    renderHome();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Launch an ad" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pick a ready-made Facebook ad for loan officers. Your name and NMLS number go on it for you. You set the budget, dates and area, then approve it.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("What do you want to promote?")).toBeInTheDocument();
    // 009d D3: the design's lead promised a logo, which PRD-009 cannot put on an ad.
    expect(screen.queryByText(/logo/iu)).toBeNull();
  });

  it("has one secondary button per topic that has an active ad, each opening step 1 with its topic", () => {
    renderHome(homeData({ topics: ["refinance", "va-loans"] }));
    const start = card("Launch an ad");
    const topics = within(start).getByRole("list", { name: "What do you want to promote?" });

    const links = within(topics).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Refinance", "VA loans"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/marketing/campaigns/new?topic=refinance",
      "/marketing/campaigns/new?topic=va-loans",
    ]);
  });

  it("has the one primary action, which opens step 1 with every ad", () => {
    const { container } = renderHome();

    const primary = within(card("Launch an ad")).getByRole("link", { name: "Choose an ad" });
    expect(primary).toHaveAttribute("href", "/marketing/campaigns/new");
    // One primary per screen: the page carries exactly one control drawn as the primary action.
    expect(container.querySelectorAll("[data-home-primary]")).toHaveLength(1);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("names the three steps", () => {
    renderHome();
    const steps = within(card("Launch an ad")).getByRole("list", { name: "What happens next" });

    expect(
      within(steps)
        .getAllByRole("listitem")
        .map((item) => item.textContent?.replace(/^\d/u, "")),
    ).toEqual(["Choose an ad", "Set it up", "Review and launch"]);
  });

  it("says the library is empty, and shows no topic, when no ad is active (009C-AC-012)", () => {
    renderHome(homeData({ topics: [] }));
    const start = card("Launch an ad");

    expect(
      within(start).getByText(
        "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then.",
      ),
    ).toBeInTheDocument();
    expect(within(start).queryByText("What do you want to promote?")).toBeNull();
    expect(within(start).queryByRole("list", { name: "What do you want to promote?" })).toBeNull();
    // "Choose an ad" still opens step 1, which says the same.
    expect(within(start).getByRole("link", { name: "Choose an ad" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/new",
    );
  });

  it("puts 'Choose an ad' first in the focus order, then the topics (009B-AC-003)", () => {
    const { container } = renderHome();
    const order = [...container.querySelectorAll("a[href]")].map((anchor) => anchor.textContent);

    expect(order.slice(0, 6)).toEqual([
      "Choose an ad",
      "First-time buyers",
      "Refinance",
      "VA loans",
      "Pre-approval",
      "Down payment help",
    ]);
  });
});

describe("the Get set up card (009B-AC-004, 009B-AC-007)", () => {
  it("shows the three items of D2 with their sentences, in order", () => {
    renderHome();
    const setup = card("Get set up");
    const items = within(setup).getAllByRole("listitem");

    expect(
      items.map((item) => within(item).getByRole("heading", { level: 3 }).textContent),
    ).toEqual(["Connect HighLevel", "Connect Meta", "Add your brand"]);
    // Writing review W-2: launching is off in PRD-009 even when both accounts are connected, so the
    // card never says connecting is enough for an ad to run.
    expect(
      within(setup).getByText(
        "You can set up an ad now. Launching it on Facebook isn't turned on yet, and it needs HighLevel and Meta connected.",
      ),
    ).toBeInTheDocument();
    expect(
      within(setup).getByText("New leads from your ads go to your HighLevel account."),
    ).toBeInTheDocument();
    expect(
      within(setup).getByText(
        "Your Facebook page and ad account. Meta needs both before an ad can launch.",
      ),
    ).toBeInTheDocument();
    expect(setup).not.toHaveTextContent("It runs once");
    expect(setup).not.toHaveTextContent("so your ads can run");
    // 009d D3: "logo" is not promised.
    expect(
      within(setup).getByText("Your name and NMLS number. They go on every ad automatically."),
    ).toBeInTheDocument();
  });

  /**
   * Writing review pass 2. With no active ad the start card says there is nothing to set up
   * (009C-AC-012, fixed criterion text), so the setup card cannot say "You can set up an ad now" on
   * the same page. It says only what is true: launching is off, and what it needs.
   */
  describe("when the library has no ad", () => {
    const WITH_ADS =
      "You can set up an ad now. Launching it on Facebook isn't turned on yet, and it needs HighLevel and Meta connected.";
    const NO_ADS =
      "Launching an ad on Facebook isn't turned on yet, and it needs HighLevel and Meta connected.";

    it("does not tell a person they can set up an ad now", () => {
      renderHome(homeData({ topics: [] }));
      const setup = card("Get set up");

      expect(within(setup).getByText(NO_ADS)).toBeInTheDocument();
      expect(within(setup).queryByText(WITH_ADS)).toBeNull();
      expect(document.body.textContent).not.toContain("You can set up an ad now");
    });

    it("keeps the start card's own sentence exactly (009C-AC-012)", () => {
      renderHome(homeData({ topics: [] }));

      expect(
        within(card("Launch an ad")).getByText(
          "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then.",
        ),
      ).toBeInTheDocument();
    });

    it("still says it once, inside the card, like every connection statement", () => {
      const { container } = renderHome(homeData({ topics: [] }));

      expect(connectionStatementsOutsideTheSetupCard(container)).toEqual([]);
      expect(repeatedConnectionStatements(container)).toEqual([]);
    });

    it("says an ad can be set up now as soon as the library has one", () => {
      renderHome(homeData({ topics: ["refinance"] }));
      const setup = card("Get set up");

      expect(within(setup).getByText(WITH_ADS)).toBeInTheDocument();
      expect(within(setup).queryByText(NO_ADS)).toBeNull();
    });
  });

  it("shows each state as a glyph plus words", () => {
    renderHome();
    const setup = card("Get set up");
    const labels = [...setup.querySelectorAll("[data-checklist-state]")];

    expect(labels.map((label) => label.textContent)).toEqual([
      "Not connected yet",
      "Not connected yet",
      "Not started",
    ]);
    for (const label of labels) {
      expect(label.querySelector("svg")).not.toBeNull();
    }
  });

  it("shows Connected, Needs attention, and Done in words as well", () => {
    renderHome(
      homeData({
        installationStatuses: ["reconnect_required"],
        brand: { name: "Alex Morgan", nmls: "1234567" },
      }),
    );
    const labels = [...card("Get set up").querySelectorAll("[data-checklist-state]")];

    expect(
      labels.map((label) => [label.getAttribute("data-checklist-state"), label.textContent]),
    ).toEqual([
      ["needs_attention", "Needs attention"],
      ["not_connected", "Not connected yet"],
      ["done", "Done"],
    ]);
  });

  it("counts Connected and Done, and no more (009B-AC-005)", () => {
    const { unmount } = renderHome();
    expect(within(card("Get set up")).getByText("0 of 3 done")).toBeInTheDocument();
    expect(
      within(card("Get set up")).getByRole("img", { name: "0 of 3 setup steps done" }),
    ).toBeInTheDocument();
    unmount();

    renderHome(
      homeData({
        installationStatuses: ["active"],
        brand: { name: "Alex Morgan", nmls: "1234567" },
      }),
    );
    expect(within(card("Get set up")).getByText("2 of 3 done")).toBeInTheDocument();
  });

  /*
   * Writing review W-3. The page both connection links open says "Nothing is connected from this
   * page" and has no connect control, so the links no longer say "Connect". While nothing is
   * connected they say what the page does: "See what's needed". W-24: the brand link names what to
   * add, fix or edit, which is the brand details.
   */
  it("gives each item a link named for it: both connections to Settings, the brand to Brand", () => {
    renderHome();
    const setup = card("Get set up");

    const highLevel = within(setup).getByRole("link", { name: "See what's needed for HighLevel" });
    expect(highLevel).toHaveAttribute("href", "/settings/connections");
    expect(highLevel).toHaveTextContent("See what's needed");
    const meta = within(setup).getByRole("link", { name: "See what's needed for Meta" });
    expect(meta).toHaveAttribute("href", "/settings/connections");
    expect(meta).toHaveTextContent("See what's needed");
    expect(within(setup).getByRole("link", { name: "Add your brand details" })).toHaveAttribute(
      "href",
      "/brand",
    );
    // Nothing on the card promises an action the destination does not have.
    expect(within(setup).queryByRole("link", { name: /^Connect/u })).toBeNull();
  });

  it("keeps each link's visible words inside its accessible name (WCAG 2.5.3)", () => {
    renderHome();
    const setup = card("Get set up");

    for (const link of within(setup).getAllByRole("link")) {
      const visible = (link.textContent ?? "").trim();
      expect(link.getAttribute("aria-label"), visible).toContain(visible);
    }
  });

  it("keeps each item's name in its link in every state", () => {
    renderHome(
      homeData({
        installationStatuses: ["missing_scope"],
        brand: { name: "Alex Morgan", nmls: "" },
      }),
    );
    const setup = card("Get set up");

    // "Fix" and "Review" stay for the states that are not "nothing is connected yet" (W-3).
    expect(within(setup).getByRole("link", { name: "Fix HighLevel" })).toHaveAttribute(
      "href",
      "/settings/connections",
    );
    expect(
      within(setup).getByRole("link", { name: "See what's needed for Meta" }),
    ).toBeInTheDocument();
    expect(within(setup).getByRole("link", { name: "Fix your brand details" })).toHaveAttribute(
      "href",
      "/brand",
    );
  });
});

describe("the card when setup is done or broken (009B-AC-006)", () => {
  // Meta can never be connected in PRD-009, so "all three done" is an injected state.
  const ALL_DONE: HomeData["checklist"] = {
    items: [
      { id: "highlevel", state: "connected" },
      { id: "meta", state: "connected" },
      { id: "brand", state: "done" },
    ],
    doneCount: 3,
    total: 3,
  };

  it("collapses to one line, with a link to review the items, when all three are done", () => {
    const done: HomeData = { ...homeData(), checklist: ALL_DONE };
    renderHome(done);
    const setup = card("You're set up");

    expect(within(setup).queryAllByRole("listitem")).toHaveLength(0);
    expect(within(setup).getByRole("link", { name: "Review your setup" })).toHaveAttribute(
      "href",
      "/overview?review=setup",
    );
  });

  it("opens the items again when the person asks to review them", () => {
    const done: HomeData = { ...homeData(), checklist: ALL_DONE };
    renderHome(done, { reviewSetup: true });

    expect(within(card("Get set up")).getAllByRole("listitem")).toHaveLength(3);
  });

  it("stays open, with the item marked, when anything needs attention", () => {
    renderHome(homeData({ installationStatuses: ["reconnect_required"] }));
    const setup = card("Get set up");

    expect(within(setup).getAllByRole("listitem")).toHaveLength(3);
    const marked = [...setup.querySelectorAll("li[data-state='needs_attention']")];
    expect(
      marked.map((item) => within(item as HTMLElement).getByRole("heading").textContent),
    ).toEqual(["Connect HighLevel"]);
  });
});

describe("state it once (009B-AC-008)", () => {
  it("says a connection is missing only inside the Get set up card, and says nothing twice", () => {
    const { container } = renderHome();

    expect(connectionStatementsOutsideTheSetupCard(container)).toEqual([]);
    expect(repeatedConnectionStatements(container)).toEqual([]);
  });

  it("holds when the page also has campaigns to show", () => {
    const { container } = renderHome(
      homeData({
        running: { rows: [row()], total: 1 },
        approval: { rows: [row({ statusLabel: "Ready for approval" })], total: 1 },
      }),
    );

    expect(connectionStatementsOutsideTheSetupCard(container)).toEqual([]);
    expect(repeatedConnectionStatements(container)).toEqual([]);
  });

  it("carries none of the old statements or the old metric text", () => {
    const { container } = renderHome();
    const text = container.textContent ?? "";

    expect(text).not.toContain("HighLevel and Meta aren't connected.");
    expect(text).not.toContain("HighLevel, Meta, and Stripe aren't connected");
    expect(text).not.toContain("Not connected yet.");
    expect(text).not.toContain("Connect HighLevel and Meta when you're ready");
    expect(text).not.toContain("Connecting HighLevel and Meta isn't available in the app yet");
    expect(text).not.toMatch(/Not live yet/iu);
    expect(text).not.toMatch(/Stripe/u);
    expect(container.querySelector(".oalo-metric__value")).toBeNull();
  });

  it("is a test that can fail: it flags a repeat and a statement outside the card", () => {
    const { container } = render(
      <main>
        <section data-home="setup">
          <p>HighLevel and Meta aren&apos;t connected.</p>
        </section>
        <p>HighLevel and Meta aren&apos;t connected.</p>
        <span data-checklist-state="not_connected">Not connected yet</span>
      </main>,
    );

    expect(connectionStatements(container)).toHaveLength(2);
    expect(connectionStatementsOutsideTheSetupCard(container)).toEqual([
      "HighLevel and Meta aren't connected.",
    ]);
    expect(repeatedConnectionStatements(container)).toEqual([
      "highlevel and meta aren't connected.",
    ]);
  });
});

describe("Running now (009B-AC-009)", () => {
  it("shows the empty state, with a link to launch an ad, when nothing is live", () => {
    renderHome();
    const running = card("Running now");

    expect(within(running).getByText("No ads running")).toBeInTheDocument();
    // Writing review W-2: it says launching is off, so it never reads as a promise.
    expect(
      within(running).getByText(
        "Ads you launch will show here with their spend and leads. Launching isn't turned on yet.",
      ),
    ).toBeInTheDocument();
    const launch = within(running).getByRole("link", { name: "Launch an ad" });
    expect(launch).toHaveAttribute("href", "/marketing/campaigns/new");
    expect(within(running).queryByRole("button")).toBeNull();
  });

  it("shows one live campaign: its name, run dates, status, and one link", () => {
    renderHome(homeData({ running: { rows: [row()], total: 1 } }));
    const running = card("Running now");

    expect(within(running).queryByText("No ads running")).toBeNull();
    const links = within(running).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent("First home, start here");
    expect(links[0]).toHaveAttribute("href", "/marketing/campaigns/campaign_one");
    expect(within(running).getByText("With Meta")).toBeInTheDocument();
    expect(within(running).getByText(/Oct 3, 2026/u)).toBeInTheDocument();
    expect(within(running).getByText(/Oct 17, 2026/u)).toBeInTheDocument();
  });

  it("says when a campaign starts as soon as it is launched", () => {
    renderHome(homeData({ running: { rows: [row({ startsAt: undefined })], total: 1 } }));

    expect(within(card("Running now")).getByText(/Starts when you launch it/u)).toBeInTheDocument();
  });

  it("draws every run date as a time element, so the global rule gives it tabular figures", () => {
    renderHome(homeData({ running: { rows: [row()], total: 1 } }));
    const running = card("Running now");

    const days = [...running.querySelectorAll("time")];
    expect(days.map((day) => [day.getAttribute("datetime"), day.textContent])).toEqual([
      ["2026-10-03", "Oct 3, 2026"],
      ["2026-10-17", "Oct 17, 2026"],
    ]);
    // Nothing else changed: the sentence reads as it did before the dates became elements.
    expect(running).toHaveTextContent("Set to run Oct 3, 2026 to Oct 17, 2026");
  });

  it("offers See all campaigns only when there are more than the three shown", () => {
    const three = {
      rows: [row({ campaignRef: "a" }), row({ campaignRef: "b" }), row({ campaignRef: "c" })],
      total: 3,
    };
    const { unmount } = renderHome(homeData({ running: three }));
    expect(
      within(card("Running now")).queryByRole("link", { name: "See all campaigns" }),
    ).toBeNull();
    unmount();

    renderHome(homeData({ running: { ...three, total: 5 } }));
    expect(
      within(card("Running now")).getByRole("link", { name: "See all campaigns" }),
    ).toHaveAttribute("href", "/marketing/campaigns");
  });
});

describe("Needs your approval (009B-AC-010)", () => {
  it("shows the empty state for an approver with nothing waiting", () => {
    renderHome();
    const approval = card("Needs your approval");

    expect(within(approval).getByText("Nothing to approve")).toBeInTheDocument();
    expect(
      within(approval).getByText(
        "A campaign waits here after its checks pass, until someone approves it or sends it back.",
      ),
    ).toBeInTheDocument();
  });

  it("lists a campaign that waits, with its status words and one link", () => {
    renderHome(
      homeData({ approval: { rows: [row({ statusLabel: "Ready for approval" })], total: 1 } }),
    );
    const approval = card("Needs your approval");

    expect(within(approval).getByRole("link", { name: "First home, start here" })).toHaveAttribute(
      "href",
      "/marketing/campaigns/campaign_one",
    );
    expect(within(approval).getByText("Ready for approval")).toBeInTheDocument();
  });

  it("is not drawn at all for a person who cannot approve, rather than saying nothing waits", () => {
    renderHome(homeData({ approval: undefined }));

    expect(screen.queryByRole("region", { name: "Needs your approval" })).toBeNull();
    expect(screen.queryByText("Nothing to approve")).toBeNull();
  });
});

describe("sample ads are labelled wherever they appear (009B-AC-014, 009C-AC-005)", () => {
  it("labels a campaign built on a sample ad, in both lists", () => {
    renderHome(
      homeData({
        running: { rows: [row({ sample: true })], total: 1 },
        approval: { rows: [row({ sample: true, statusLabel: "Ready for approval" })], total: 1 },
      }),
    );

    expect(within(card("Running now")).getByText("Sample ad")).toBeInTheDocument();
    expect(within(card("Needs your approval")).getByText("Sample ad")).toBeInTheDocument();
  });

  it("does not label a real ad as a sample", () => {
    renderHome(homeData({ running: { rows: [row()], total: 1 } }));

    expect(screen.queryByText("Sample ad")).toBeNull();
  });
});

describe("the two lists row (Wave 3 polish, 009B D3)", () => {
  it("holds both cards for a person who can approve, side by side in one row", () => {
    renderHome();
    const row = card("Running now").parentElement;

    expect(row).toBe(card("Needs your approval").parentElement);
    expect(row?.children).toHaveLength(2);
  });

  it("holds Running now alone, not an empty approval card, for a person who cannot approve", () => {
    renderHome(homeData({ approval: undefined }));
    const row = card("Running now").parentElement;

    // From 1100px the stylesheet keeps two equal columns (home-polish.unit.test.ts), so the card stays half width.
    expect(row?.children).toHaveLength(1);
    expect(screen.queryByText("Nothing to approve")).toBeNull();
  });
});

describe("the checklist glyphs and chips (Wave 3 polish)", () => {
  /** What `Icon` draws for a name at a size, to compare an item's glyph against, class names included. */
  function iconMarkup(name: IconName, size: IconSize, tone?: IconTone): string {
    const { container, unmount } = render(
      <Icon decorative name={name} size={size} {...(tone === undefined ? {} : { tone })} />,
    );
    const markup = container.innerHTML;
    unmount();
    return markup;
  }

  it("draws both connections as a plug and the brand as a palette, at 24px, as the mockup does", () => {
    renderHome();
    const drawn = [...card("Get set up").querySelectorAll("li[data-item] > span svg")].map(
      (svg) => svg.outerHTML,
    );

    expect(drawn).toEqual([
      iconMarkup("plug", "lg"),
      iconMarkup("plug", "lg"),
      iconMarkup("palette", "lg"),
    ]);
  });

  it("draws a megaphone over the empty Running now and a circled check over Nothing to approve", () => {
    renderHome();
    const drawnIn = (title: string): string | undefined =>
      card(title).querySelector("svg")?.outerHTML;

    expect(drawnIn("Running now")).toBe(iconMarkup("megaphone", "lg", "neutral"));
    expect(drawnIn("Needs your approval")).toBe(iconMarkup("circle-check", "lg", "neutral"));
  });

  it("marks every state chip so it stays one line, in the checklist and in both lists", () => {
    const { container } = renderHome(
      homeData({
        running: { rows: [row({ sample: true })], total: 1 },
        approval: { rows: [row({ statusLabel: "Ready for approval" })], total: 1 },
      }),
    );
    const chips = [...container.querySelectorAll(".oalo-state-label")];

    // Three checklist chips, then the status and the sample label in Running now, then the status in
    // Needs your approval.
    expect(chips).toHaveLength(6);
    for (const chip of chips) expect(chip.className).toMatch(/stateChip/u);
  });
});
