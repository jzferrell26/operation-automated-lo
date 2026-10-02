import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CAMPAIGNS_TABS } from "../../../copy/campaign-page-messages.js";
import { ADS_LIBRARY_PATH, CAMPAIGNS_LIST_PATH, CampaignsTabs } from "./campaigns-tabs.js";

/**
 * PRD-009e 009E-AC-009 and PRD-009c 009C-AC-010. The tab strip that heads both Campaigns tabs. Each
 * tab is its own page, so the tabs are links in a labelled `nav`; the library tab (009c part 2)
 * imports `CampaignsTabs({ current })` and the words of `CAMPAIGNS_TABS`, so both are pinned here.
 */

describe("the Campaigns tab strip", () => {
  it("is a labelled navigation of two links to the two tabs' addresses", () => {
    render(<CampaignsTabs current="campaigns" />);

    const nav = screen.getByRole("navigation", { name: "Campaigns sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Your campaigns", "/marketing/campaigns"],
      ["Ads library", "/marketing/campaigns/library"],
    ]);
    expect(CAMPAIGNS_LIST_PATH).toBe("/marketing/campaigns");
    expect(ADS_LIBRARY_PATH).toBe("/marketing/campaigns/library");
  });

  it.each([
    ["campaigns", "Your campaigns", "Ads library"],
    ["library", "Ads library", "Your campaigns"],
  ] as const)("marks only the %s tab as the current page", (current, marked, other) => {
    render(<CampaignsTabs current={current} />);

    expect(screen.getByRole("link", { name: marked })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: other })).not.toHaveAttribute("aria-current");
    expect(document.querySelectorAll("[aria-current='page']")).toHaveLength(1);
  });

  it("draws each tab as a Link from the UI package, so the shared focus ring applies", () => {
    render(<CampaignsTabs current="campaigns" />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("data-variant", "inline");
    }
  });

  it("says its words from the one copy module the library tab reads", () => {
    render(<CampaignsTabs current="library" />);

    expect(screen.getByRole("navigation")).toHaveAttribute("aria-label", CAMPAIGNS_TABS.label);
    expect(screen.getByRole("link", { name: CAMPAIGNS_TABS.campaigns })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: CAMPAIGNS_TABS.library })).toBeInTheDocument();
  });
});
