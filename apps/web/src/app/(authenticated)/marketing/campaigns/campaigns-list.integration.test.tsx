import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CampaignList } from "../../../../features/campaigns/components/campaign-list.js";
import type { CampaignListRow } from "../../../../features/campaigns/campaign-page-model.js";
import {
  APPROVER,
  earlierFlowCampaign,
  libraryCampaign,
  rowOf,
} from "../../../../server/campaign-page.test-support.js";

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

describe("the Campaigns list (009E-AC-009)", () => {
  it("heads the page with Campaigns, the two tabs, and one primary action, Launch an ad", async () => {
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
  });

  it("is a table with Ad, Topic, Runs, Where it shows, Status, and Last change and no other column", async () => {
    render(<CampaignList now={NOW} rows={await rows()} />);

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Ad", "Topic", "Runs", "Where it shows", "Status", "Last change"]);
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
    expect(within(row).getByText("First-time buyers")).toBeInTheDocument();
    expect(within(row).getByText("Oct 6 to Oct 20")).toBeInTheDocument();
    expect(within(row).getByText("Austin, TX and 1 more")).toBeInTheDocument();
    expect(within(row).getByText("Approved")).toBeInTheDocument();
    expect(within(row).getByText("Oct 1")).toBeInTheDocument();
  });

  it("says an ad that starts when it is launched runs until its end date, and lists a first place with a count", async () => {
    render(<CampaignList now={NOW} rows={await rows()} />);

    const row = within(screen.getByRole("table"))
      .getByRole("link", { name: "Sample: Get pre-approved before you shop" })
      .closest("tr") as HTMLElement;
    expect(within(row).getByText("Until Oct 22")).toBeInTheDocument();
    expect(within(row).getByText("Round Rock, TX and 3 more")).toBeInTheDocument();
    expect(within(row).getByText("Ready for approval")).toBeInTheDocument();
  });

  it("puts the year on a day that is not in the current year", async () => {
    render(<CampaignList now={new Date("2027-01-05T12:00:00.000Z")} rows={await rows()} />);

    const row = within(screen.getByRole("table"))
      .getByRole("link", { name: "Sample: First home, start here" })
      .closest("tr") as HTMLElement;
    expect(within(row).getByText("Oct 6, 2026 to Oct 20, 2026")).toBeInTheDocument();
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
    expect(items[0]).toHaveTextContent(
      "First-time buyers. Oct 6 to Oct 20. Austin, TX and 1 more.",
    );
    expect(items[0]).toHaveTextContent("Approved");
    expect(items[0]).toHaveTextContent("Oct 1");
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
});

describe("a campaign saved before PRD-009 on the list (009E-AC-012)", () => {
  it("shows its saved headline as its name and Earlier flow as its topic, with no property", async () => {
    const earlier = await rowOf(await earlierFlowCampaign({ decision: "approved" }), {
      principal: APPROVER,
    });
    render(<CampaignList now={NOW} rows={[earlier]} />);

    const table = screen.getByRole("table");
    const row = within(table)
      .getByRole("link", { name: "Tour this home this weekend" })
      .closest("tr") as HTMLElement;
    expect(within(row).getByText("Earlier flow")).toBeInTheDocument();
    // Its run dates were open house times, which are not shown; its area is the typed region it saved.
    expect(within(row).getByText("Not set")).toBeInTheDocument();
    expect(within(row).getByText("Dallas-Fort Worth")).toBeInTheDocument();
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
