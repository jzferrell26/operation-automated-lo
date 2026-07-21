import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { loadSyntheticReporting } from "../model/synthetic-reporting.js";
import { CampaignDetailScreen } from "./campaign-detail-screen.js";
import { ReportsScreen } from "./reports-screen.js";

describe("synthetic reporting screens", () => {
  it("previews immutable artifact versions and stages a duplicate without changing history", async () => {
    const user = userEvent.setup();
    const reporting = loadSyntheticReporting();
    render(<CampaignDetailScreen reporting={reporting} />);

    expect(screen.getByRole("link", { name: "Open approved public link" })).toHaveAttribute(
      "href",
      "/public/synthetic-open-house-v3",
    );
    expect(screen.getByText("Immutable history: 3 versions")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preview version 2" }));
    expect(
      screen.getByRole("heading", { name: "Cedar Street open house, disclosure revision" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Duplicate as new draft" }));
    expect(screen.getByText("Local draft projection staged from version 2")).toBeInTheDocument();
    expect(screen.getByText("Immutable history: 3 versions")).toBeInTheDocument();
    const history = screen.getByRole("region", { name: "Campaign history" });
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
      expect(
        screen.getByRole("link", { name: `Download original ${creative.label}` }),
      ).toHaveAttribute("href", creative.downloadHref);
      expect(
        screen.getByRole("link", { name: `Download original ${creative.label}` }),
      ).toHaveAttribute("download", creative.downloadFileName);
    }
  });

  it("shows selected Meta assets, exact approval versions, and explicit no-write confirmation", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<CampaignDetailScreen reporting={loadSyntheticReporting()} />);

    expect(screen.getByText(/synthetic-location-prairie-home/u)).toBeInTheDocument();
    expect(screen.getByText("connected")).toBeInTheDocument();
    expect(screen.getAllByText(/^synthetic-provider-/u)).toHaveLength(5);

    const approvalTable = screen.getByRole("table", {
      name: "Exact approved versions for campaign version 3",
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

    await user.click(screen.getByRole("button", { name: "Confirm final launch summary" }));
    const confirmation = screen.getByRole("alertdialog", {
      name: "Confirm the exact synthetic launch summary",
    });
    expect(
      within(confirmation).getByText("Campaign synthetic-campaign-open-house-001, version 3"),
    ).toBeInTheDocument();
    await user.click(
      within(confirmation).getByRole("button", { name: "Confirm exact local summary" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Final launch summary confirmed locally for campaign version 3. No provider write occurred.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("stages a support-time entry locally and reveals links only for authorized locations", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const reporting = loadSyntheticReporting();
    render(<ReportsScreen reporting={reporting} />);

    const authorized = screen.getByText("Prairie Home Lending").closest("article");
    const restricted = screen.getByText("Location not included").closest("article");
    if (!authorized || !restricted) {
      throw new Error("Expected both authorized and restricted location cards.");
    }

    expect(within(authorized).getAllByRole("link")).toHaveLength(2);
    expect(within(restricted).queryByRole("link")).not.toBeInTheDocument();
    expect(within(restricted).queryByText(/campaigns|exceptions/iu)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Activity"), "Campaign review");
    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "25");
    await user.click(screen.getByRole("button", { name: "Add local entry" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Campaign review: 25 minutes staged locally. No support record was saved.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
