import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { loadSyntheticReporting } from "../model/synthetic-reporting.js";
import { CampaignDetailScreen } from "./campaign-detail-screen.js";

// Under a loaded integration run this file's renders can exceed the 5s project default; give it
// real headroom here rather than raising the default for every other suite.
vi.setConfig({ testTimeout: 20000 });

/**
 * PRD-009f D4. The campaign page's three tests, kept when the Reports page and its tests went.
 *
 * `reporting-screen.integration.test.tsx` held these beside the Reports page's own tests. The page
 * and its screen are gone, and `CampaignDetailScreen`, the artifact workspace, and the launch
 * review are not: the synthetic campaign page still renders them, so they keep their proof here.
 */
describe("synthetic campaign detail screen", () => {
  it("previews immutable artifact versions and stages a duplicate without changing history", async () => {
    const user = userEvent.setup();
    const reporting = loadSyntheticReporting();
    render(<CampaignDetailScreen reporting={reporting} />);

    /**
     * PRD-006d 006D-AC-003 moved this onto `Link`, whose `external` form says so in the
     * accessible name and opens with `noopener noreferrer`. The name a screen reader hears is
     * therefore longer than the visible words, on purpose: a link that changes window without
     * warning is the thing the announcement exists to prevent.
     */
    const approvedPageLink = screen.getByRole("link", {
      name: "Open the approved page, opens in a new tab",
    });
    expect(approvedPageLink).toHaveAttribute("href", "/public/synthetic-open-house-v3");
    expect(approvedPageLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(approvedPageLink).toHaveAttribute("target", "_blank");
    expect(screen.getByText("3 versions, none of them edited after the fact")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Version 2" }));
    expect(
      screen.getByRole("heading", { name: "Cedar Street open house, disclosure revision" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start a new draft from this" }));
    expect(screen.getByText("New draft started from version 2")).toBeInTheDocument();
    expect(screen.getByText("3 versions, none of them edited after the fact")).toBeInTheDocument();
    const history = screen.getByRole("region", { name: "What changed, and when" });
    expect(within(history).getByRole("list").children).toHaveLength(3);
  });

  it("renders every creative preview with its exact downloadable original", () => {
    const reporting = loadSyntheticReporting();
    render(<CampaignDetailScreen reporting={reporting} />);

    expect(screen.getByAltText("Open House feed creative preview")).toHaveAttribute(
      "src",
      "/synthetic-assets/open-house-feed-v3.svg",
    );
    expect(screen.getByAltText("Open House story creative preview")).toHaveAttribute(
      "src",
      "/synthetic-assets/open-house-story-v3.svg",
    );
    for (const creative of reporting.campaign.creatives) {
      expect(screen.getByRole("link", { name: `Download ${creative.label}` })).toHaveAttribute(
        "href",
        creative.downloadHref,
      );
      expect(screen.getByRole("link", { name: `Download ${creative.label}` })).toHaveAttribute(
        "download",
        creative.downloadFileName,
      );
    }
  });

  it("shows selected Meta assets, exact approval versions, and explicit no-write confirmation", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<CampaignDetailScreen reporting={loadSyntheticReporting()} />);

    // PRD-006b D2 and D8. The workspace id and the five account references are internal, so the
    // screen no longer prints any of them; the name of the workspace is what a user needs.
    expect(screen.queryByText(/synthetic-location-prairie-home/u)).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^synthetic-provider-/u)).toHaveLength(0);
    expect(screen.getByText("connected")).toBeInTheDocument();

    const approvalTable = screen.getByRole("table", {
      name: "What was approved in version 3",
    });
    expect(within(approvalTable).getAllByRole("row")).toHaveLength(11);
    for (const label of [
      "Page",
      "PDF",
      "Creative",
      "Copy",
      "Disclosure",
      "Targeting",
      "Budget",
      "Dates",
      "Form",
      "Destination",
    ]) {
      expect(within(approvalTable).getByRole("rowheader", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("Austin metro geography class")).toBeInTheDocument();
    expect(screen.getByText("ZIP targeting unavailable")).toBeInTheDocument();
    expect(screen.getByText("USD 25 daily")).toBeInTheDocument();
    expect(screen.getByText("2026-07-25")).toBeInTheDocument();
    expect(screen.getByText("2026-07-27")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm the launch summary" }));
    const confirmation = screen.getByRole("alertdialog", {
      name: "Confirm the exact synthetic launch summary",
    });
    // PRD-006b D2 and D8. The campaign's reference is internal, so the scope names the version the
    // user is looking at instead of printing an identifier in the middle of a sentence.
    expect(within(confirmation).getByText("Version 3 of this campaign")).toBeInTheDocument();
    await user.click(within(confirmation).getByRole("button", { name: "Yes, that is right" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "You confirmed the launch summary. Nothing was launched.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
