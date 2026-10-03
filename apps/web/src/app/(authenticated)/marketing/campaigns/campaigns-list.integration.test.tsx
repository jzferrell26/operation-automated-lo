import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CampaignList } from "../../../../features/campaigns/components/campaign-list.js";
import type { CampaignListRow } from "../../../../features/campaigns/campaign-page-model.js";
import {
  APPROVER,
  daysOutsideTimeElements,
  earlierFlowCampaign,
  libraryCampaign,
  rowOf,
  wholeSentence,
} from "../../../../server/campaign-page.test-support.js";
import { glyphBeforeWords, glyphMarkup } from "../../../../testing/glyph-markup.js";

/**
 * PRD-009e 009E-AC-009, 009E-AC-011 and 009E-AC-012. The Campaigns list: the tab strip, one primary
 * action, and a table of every campaign with Ad, Topic, Runs, Where it shows, Status, and Last
 * change, with the same facts as cards below 720px (the stylesheet shows one of the two).
 */

vi.mock("next/navigation.js", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const NOW = new Date("2026-10-02T12:00:00.000Z");

async function rows(): Promise<readonly CampaignListRow[]> {
  return [
    await rowOf(
      await libraryCampaign({
        campaignRef: "campaign_01First",
        startsAt: "2026-10-06T09:00:00.000Z",
        endsAt: "2026-10-20T23:59:59.000Z",
        decision: "approved",
        decidedAt: "2026-10-01T12:00:00.000Z",
      }),
    ),
    await rowOf(
      await libraryCampaign({
        campaignRef: "campaign_01Second",
        adId: "sample-pre-approval",
        adVersion: 1,
        endsAt: "2026-10-22T23:59:59.000Z",
        cities: ["Round Rock, TX", "Austin, TX", "Killeen, TX"],
        createdAt: "2026-09-30T10:00:00.000Z",
      }),
    ),
  ];
}

/**
 * QA-13. The file's first test pays for what every later test reuses: it loads the sample ads library
 * once (the catalog and the digest of each picture, `sampleLibrary`) and draws the table for the first
 * time. That is 0.5 s alone, 5.3 s when the quality pass ran it beside other suites, which crossed the
 * 5 second default, and 12.6 s with 48 busy processes on a 16 core machine. 30 s is about five times
 * the pass's figure and more than twice the worst. It is a ceiling for a loaded machine: the test
 * still checks everything it checked, and a broken page still fails on its assertions.
 */
const FIRST_RENDER_TIMEOUT = 30_000;

describe("the Campaigns list (009E-AC-009)", () => {
  it(
    "heads the page with Campaigns, the two tabs, and one primary action, Launch an ad",
    async () => {
      const { container } = render(<CampaignList now={NOW} rows={await rows()} />);

      expect(screen.getByRole("heading", { level: 1, name: "Campaigns" })).toBeInTheDocument();
      const tabs = screen.getByRole("navigation", { name: "Campaigns sections" });
      expect(within(tabs).getByRole("link", { name: "Your campaigns" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(within(tabs).getByRole("link", { name: "Ads library" })).toHaveAttribute(
        "href",
        "/marketing/campaigns/library",
      );
      const primary = screen.getAllByRole("link", { name: "Launch an ad" });
      expect(primary).toHaveLength(1);
      expect(primary[0]).toHaveAttribute("href", "/marketing/campaigns/new");
      expect(container.querySelectorAll("button")).toHaveLength(0);
    },
    FIRST_RENDER_TIMEOUT,
  );

  it("is a table with Ad, Topic, Dates, Where it shows, Status, and Last change and no other column", async () => {
    render(<CampaignList now={NOW} rows={await rows()} />);

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Ad", "Topic", "Dates", "Where it shows", "Status", "Last change"]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("shows each ad's name as the link, a decorative thumbnail, and the facts", async () => {
    render(<CampaignList now={NOW} rows={await rows()} />);

    const table = screen.getByRole("table");
    const first = within(table).getByRole("link", { name: "Sample: First home, start here" });
    expect(first).toHaveAttribute("href", "/marketing/campaigns/campaign_01First");
    const row = first.closest("tr") as HTMLElement;
    const thumb = row.querySelector("img") as HTMLImageElement;
    expect(thumb.getAttribute("alt")).toBe("");
    expect(thumb.closest("[aria-hidden='true']")).not.toBeNull();
    expect(thumb.getAttribute("src")).toMatch(
      /\/api\/ads-library\/samples\/sample-first-home\/2\/tall$/u,
    );
    // Topic is the row's second cell. A hyphenated word is a unit of its own (review pass 2, R2 F-8),
    // so the cell is read as the words it shows.
    expect(row.querySelectorAll("td")[1]).toHaveTextContent("First-time buyers");
    expect(within(row).getByText(wholeSentence("Oct 6 to Oct 20"))).toBeInTheDocument();
    expect(within(row).getByText("Austin, TX and 1 more")).toBeInTheDocument();
    expect(within(row).getByText("Approved")).toBeInTheDocument();
    expect(within(row).getByText("Oct 1")).toBeInTheDocument();
  });

  it("says an ad that starts when it is launched runs until its end date, and lists a first place with a count", async () => {
    render(<CampaignList now={NOW} rows={await rows()} />);

    const row = within(screen.getByRole("table"))
      .getByRole("link", { name: "Sample: Get pre-approved before you shop" })
      .closest("tr") as HTMLElement;
    expect(within(row).getByText(wholeSentence("Until Oct 22"))).toBeInTheDocument();
    expect(within(row).getByText("Round Rock, TX and 3 more")).toBeInTheDocument();
    expect(within(row).getByText("Ready for approval")).toBeInTheDocument();
  });

  it("puts the year on a day that is not in the current year", async () => {
    render(<CampaignList now={new Date("2027-01-05T12:00:00.000Z")} rows={await rows()} />);

    const row = within(screen.getByRole("table"))
      .getByRole("link", { name: "Sample: First home, start here" })
      .closest("tr") as HTMLElement;
    expect(within(row).getByText(wholeSentence("Oct 6, 2026 to Oct 20, 2026"))).toBeInTheDocument();
    expect(within(row).getByText("Oct 1, 2026")).toBeInTheDocument();
  });

  it("labels a sample ad where it appears, with words a screen reader reads", async () => {
    render(<CampaignList now={NOW} rows={await rows()} />);

    const row = within(screen.getByRole("table"))
      .getByRole("link", { name: "Sample: First home, start here" })
      .closest("tr") as HTMLElement;
    expect(within(row).getByText("Sample ad")).toBeVisible();
  });

  it("carries the same facts as cards, for the frames below 720px", async () => {
    const { container } = render(<CampaignList now={NOW} rows={await rows()} />);

    const cards = container.querySelector("[data-campaign-cards]") as HTMLElement;
    const items = within(cards).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Sample: First home, start here");
    // Writing review W-9: a card has no column header, so each fact carries its own name.
    expect(items[0]).toHaveTextContent(
      "Topic: First-time buyers. Dates: Oct 6 to Oct 20. Where it shows: Austin, TX and 1 more.",
    );
    expect(items[0]).toHaveTextContent("Approved");
    expect(items[0]).toHaveTextContent("Last change: Oct 1");
    expect(items[1]).toHaveTextContent("Dates: Until Oct 22.");
    expect(
      within(items[0] as HTMLElement).getByRole("link", { name: "Sample: First home, start here" }),
    ).toHaveAttribute("href", "/marketing/campaigns/campaign_01First");
  });

  it("has no results column, no search, and no filters", async () => {
    const { container } = render(<CampaignList now={NOW} rows={await rows()} />);

    expect(
      container.querySelector("input, select, [role='searchbox'], [role='search']"),
    ).toBeNull();
    expect(
      within(screen.getByRole("table")).queryByText(/spend|leads|cost per lead|results/iu),
    ).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("the Campaigns list with no campaigns (009E-AC-011)", () => {
  it("says so, tells the person what to do, and keeps the one primary action inside the empty state", () => {
    const { container } = render(<CampaignList now={NOW} rows={[]} />);

    const empty = container.querySelector(".oalo-async-state[data-state='empty']") as HTMLElement;
    expect(within(empty).getByRole("heading", { name: "No campaigns yet" })).toBeInTheDocument();
    expect(
      within(empty).getByText("Pick an ad from the library to set up your first one."),
    ).toBeInTheDocument();
    const action = within(empty).getByRole("link", { name: "Launch an ad" });
    expect(action).toHaveAttribute("href", "/marketing/campaigns/new");
    // Exactly one primary action on the page, and it is the one inside the empty state.
    expect(screen.getAllByRole("link", { name: "Launch an ad" })).toHaveLength(1);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("navigation", { name: "Campaigns sections" })).toBeInTheDocument();
  });

  /*
   * Writing review W-10. A new real account has an empty library, so "Pick an ad from the library"
   * invited a choice that does not exist. With no ad to choose, the list says what the library says.
   */
  it("says what the library says, not to pick an ad, when the library has no ad yet", () => {
    const { container } = render(<CampaignList libraryEmpty now={NOW} rows={[]} />);

    const empty = container.querySelector(".oalo-async-state[data-state='empty']") as HTMLElement;
    expect(within(empty).getByRole("heading", { name: "No campaigns yet" })).toBeInTheDocument();
    expect(
      within(empty).getByText(
        "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then.",
      ),
    ).toBeInTheDocument();
    expect(within(empty).queryByText(/Pick an ad from the library/u)).toBeNull();
    // The page still has exactly one primary action, inside the empty state.
    expect(screen.getAllByRole("link", { name: "Launch an ad" })).toHaveLength(1);
  });

  it("does not change what a list with campaigns says, whatever the library holds", async () => {
    render(<CampaignList libraryEmpty now={NOW} rows={await rows()} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByText(/No ads in the library yet/u)).toBeNull();
  });
});

describe("a campaign saved before PRD-009 on the list (009E-AC-012)", () => {
  it("shows its saved headline as its name and Open house as its topic, with no property", async () => {
    const earlier = await rowOf(await earlierFlowCampaign({ decision: "approved" }), {
      principal: APPROVER,
    });
    render(<CampaignList now={NOW} rows={[earlier]} />);

    const table = screen.getByRole("table");
    const row = within(table)
      .getByRole("link", { name: "Tour this home this weekend" })
      .closest("tr") as HTMLElement;
    expect(within(row).getByText("Open house")).toBeInTheDocument();
    expect(table.textContent ?? "").not.toContain("Earlier flow");
    // Its run dates were open house times, which are not shown; its area is the typed region it saved.
    expect(within(row).getByText("Not set")).toBeInTheDocument();
    // "Where it shows" is the fourth cell; its hyphenated word is a unit of its own (pass 2, R2 F-8).
    expect(row.querySelectorAll("td")[3]).toHaveTextContent("Dallas-Fort Worth");
    expect(within(row).getByText("Approved")).toBeInTheDocument();
    expect(within(row).queryByText("Sample ad")).toBeNull();
    expect(table.textContent ?? "").not.toContain("123 Main Street");
    expect(table.textContent ?? "").not.toContain("Jordan Smith");
  });

  it("names a campaign whose ad the library no longer holds by its saved headline", async () => {
    const row = await rowOf(await libraryCampaign(), {
      library: { find: () => undefined, standingOf: () => undefined },
    });
    render(<CampaignList now={NOW} rows={[row]} />);

    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("link", { name: "Thinking about your first home? Start here." }),
    ).toBeInTheDocument();
    expect(within(table).getByText("Not in the library")).toBeInTheDocument();
    expect(table.querySelector("img")).toBeNull();
  });
});

/**
 * The scored baseline review of 2026-10-03, pass 1, part R2 (009G-AC-006). A row is one line of
 * facts and a tile; the stylesheet's measures are pinned in `campaign-page-layout.unit.test.ts`, and
 * what each cell and tile is made of is held here.
 */
describe("a row of the Campaigns list (review R2, F-9, F-10, F-11)", () => {
  it("keeps Topic, Dates, and Last change on one line while the table has room, and gives Status a cell the stylesheet never releases", async () => {
    render(<CampaignList now={NOW} rows={await rows()} />);

    const cells = [
      ...(within(screen.getByRole("table")).getAllByRole("row")[1] as HTMLElement).querySelectorAll(
        "td",
      ),
    ];
    const keeps = (cell: Element | undefined, name: string) =>
      (cell?.className ?? "").split(/\s+/u).some((className) => className.includes(name));
    // Ad, Topic, Dates, Where it shows, Status, Last change.
    expect(keeps(cells[1], "nowrap")).toBe(true);
    expect(keeps(cells[2], "nowrap")).toBe(true);
    expect(keeps(cells[3], "nowrap")).toBe(false);
    expect(keeps(cells[4], "chipCell")).toBe(true);
    expect(keeps(cells[5], "nowrap")).toBe(true);
  });

  it("keeps a campaign with no art in a tile with a glyph, and no image that could look as if it failed to load", async () => {
    const earlier = await rowOf(await earlierFlowCampaign({ decision: "approved" }), {
      principal: APPROVER,
    });
    expect(earlier.thumbnail).toBeUndefined();
    render(<CampaignList now={NOW} rows={[earlier]} />);

    const row = within(screen.getByRole("table"))
      .getByRole("link", { name: "Tour this home this weekend" })
      .closest("tr") as HTMLElement;
    const tile = row.querySelector("[data-thumb]") as HTMLElement;
    expect(tile).toHaveAttribute("data-thumb", "none");
    expect(tile).toHaveAttribute("aria-hidden", "true");
    expect(tile.querySelector("svg")).not.toBeNull();
    expect(tile.querySelector("img")).toBeNull();
    // The glyph says nothing: the tile is decorative, so a screen reader reads the name and the facts.
    expect(tile).toHaveTextContent("");
  });

  it("keeps the picture in a tile of its own kind when the ad has art", async () => {
    render(<CampaignList now={NOW} rows={await rows()} />);

    const row = within(screen.getByRole("table"))
      .getByRole("link", { name: "Sample: First home, start here" })
      .closest("tr") as HTMLElement;
    const tile = row.querySelector("[data-thumb]") as HTMLElement;
    expect(tile).toHaveAttribute("data-thumb", "art");
    expect(tile.querySelector("img")).not.toBeNull();
    expect(tile.querySelector("svg")).toBeNull();
  });

  it("draws the tile in every row of the table, which is also the table the 768 frame shows (pass 3, R2 P3-6)", async () => {
    const earlier = await rowOf(await earlierFlowCampaign(), { principal: APPROVER });
    render(<CampaignList now={NOW} rows={[...(await rows()), earlier]} />);

    // 009E-AC-009: "Ad (a decorative thumbnail and the name as the link)". There is one table and the
    // stylesheet no longer hides its tile between 720px and 1023px, so each row has its tile first
    // in the Ad cell, with the name as the link beside it.
    const dataRows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(dataRows).toHaveLength(3);
    for (const row of dataRows) {
      const cell = row.querySelector("td") as HTMLElement;
      const tile = cell.querySelector("[data-thumb]") as HTMLElement;
      expect(tile).toHaveAttribute("aria-hidden", "true");
      expect(tile.parentElement?.firstElementChild).toBe(tile);
      expect(within(cell).getByRole("link")).toBeInTheDocument();
    }
  });

  it("puts a phone card's status chip on a line of its own, and its last change in a caption after it (pass 3, R2 P3-7)", async () => {
    const { container } = render(<CampaignList now={NOW} rows={await rows()} />);

    const items = within(
      container.querySelector("[data-campaign-cards]") as HTMLElement,
    ).getAllByRole("listitem");
    for (const item of items) {
      const chip = item.querySelector("[data-campaign-standing]") as HTMLElement;
      const chipLine = chip.parentElement as HTMLElement;
      // The chip's line holds the chip and nothing else, so no running words share its baseline.
      expect(chipLine.tagName).toBe("P");
      expect(chipLine.textContent).toBe(chip.textContent);
      // The caption is the next line, and carries the date as a time element.
      const caption = chipLine.nextElementSibling as HTMLElement;
      expect(caption.tagName).toBe("P");
      expect(caption.className).toMatch(/cardCaption/u);
      expect(caption).toHaveTextContent(/^Last change: [A-Z][a-z]{2} \d{1,2}$/u);
      expect(caption.querySelector("time")).not.toBeNull();
      expect(caption.nextElementSibling).toBeNull();
    }
  });

  it("draws the tile on every phone card, beside the name, with or without art", async () => {
    const earlier = await rowOf(await earlierFlowCampaign(), { principal: APPROVER });
    const { container } = render(<CampaignList now={NOW} rows={[...(await rows()), earlier]} />);

    const items = within(
      container.querySelector("[data-campaign-cards]") as HTMLElement,
    ).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    for (const item of items) {
      const head = item.querySelector("[data-thumb]")?.parentElement as HTMLElement;
      expect(head, "a tile in the card's head").not.toBeNull();
      // The tile and the name share the head, the tile first.
      expect(head.firstElementChild).toBe(item.querySelector("[data-thumb]"));
      expect(within(head).getByRole("link")).toBeInTheDocument();
    }
    expect(
      items.map((item) => item.querySelector("[data-thumb]")?.getAttribute("data-thumb")),
    ).toEqual(["art", "art", "none"]);
  });
});

describe("the dates on the Campaigns list", () => {
  it.each([
    ["this year", NOW],
    ["a later year, so each day carries its year", new Date("2027-01-05T12:00:00.000Z")],
  ] as const)(
    "are all in time elements, in the table and in the cards, in %s",
    async (_when, now) => {
      const { container } = render(<CampaignList now={now} rows={await rows()} />);

      expect(daysOutsideTimeElements(container)).toEqual([]);
      const times = [...container.querySelectorAll("tbody time")];
      expect(times.length).toBeGreaterThanOrEqual(3);
      for (const time of times)
        expect(time.getAttribute("datetime")).toMatch(/^\d{4}-\d{2}-\d{2}/u);
      expect(
        container.querySelectorAll("[data-campaign-cards] time").length,
      ).toBeGreaterThanOrEqual(3);
    },
  );
});

/**
 * The scored baseline review of 2026-10-03, pass 2, part R2 (009G-AC-006): F-8 (a hyphenated word is
 * never read across a line break), N-2 (the plus on "Launch an ad"), N-3 (the action sits in the
 * header's action wrappers, which the phone rules stretch), and N-4 (an empty list stands on the
 * canvas as a card). The stylesheet's measures are pinned in `campaign-list-layout.unit.test.ts`.
 */
describe("a hyphenated word in the Campaigns list (review pass 2, R2 F-8)", () => {
  /** True when the element is the one-line unit `KeepWordsWhole` draws round a hyphenated word. */
  const isWhole = (element: HTMLElement) =>
    element.className.split(/\s+/u).some((className) => className.includes("whole"));

  it("keeps 'Pre-approval' whole in the Topic cell, and every hyphenated word of an ad's name whole", async () => {
    render(<CampaignList now={NOW} rows={await rows()} />);

    const table = screen.getByRole("table");
    expect(isWhole(within(table).getByText("Pre-approval"))).toBe(true);
    expect(isWhole(within(table).getByText("pre-approved"))).toBe(true);
    // A word with no hyphen is left to wrap, so only the hyphenated word is held.
    expect(within(table).queryByText("shop")).toBeNull();
  });

  it("holds the topic in a phone card whole too, and changes no word of any of it", async () => {
    const { container } = render(<CampaignList now={NOW} rows={await rows()} />);

    const cards = container.querySelector("[data-campaign-cards]") as HTMLElement;
    expect(isWhole(within(cards).getByText("Pre-approval."))).toBe(true);
    // The name is read exactly as before: the link's name is the ad's name, unbroken and uncut.
    expect(
      within(cards).getByRole("link", { name: "Sample: Get pre-approved before you shop" }),
    ).toBeInTheDocument();
  });
});

describe("the Launch an ad action of the Campaigns list (review pass 2, R2 N-2, N-3)", () => {
  it("draws the plus before its words, in the header's action wrappers, so the phone rules stretch it", async () => {
    const { container } = render(<CampaignList now={NOW} rows={await rows()} />);

    const link = screen.getByRole("link", { name: "Launch an ad" });
    expect(glyphBeforeWords(link)).toBe(glyphMarkup("plus"));
    const actions = link.closest("[data-launch-an-ad-actions]");
    expect(actions, "the header's action wrapper").not.toBeNull();
    expect(container.querySelector("header")).toContainElement(actions as HTMLElement);
    // The wrapper's own wrapper is the row of actions the phone rules give the full width to.
    expect((link.parentElement as HTMLElement).parentElement).toBe(actions);
  });

  it("draws the plus in the empty state's action as well", () => {
    render(<CampaignList now={NOW} rows={[]} />);

    expect(glyphBeforeWords(screen.getByRole("link", { name: "Launch an ad" }))).toBe(
      glyphMarkup("plus"),
    );
  });
});

describe("the Campaigns list with no campaigns, on the canvas (review pass 2, R2 N-4)", () => {
  it.each([
    ["with ads in the library", false],
    ["with none", true],
  ] as const)(
    "is a card, which is what a state standing on the page is, %s",
    (_when, libraryEmpty) => {
      const { container } = render(
        <CampaignList libraryEmpty={libraryEmpty} now={NOW} rows={[]} />,
      );

      expect(container.querySelector(".oalo-async-state[data-state='empty']")).toHaveAttribute(
        "data-surface",
        "card",
      );
    },
  );
});
