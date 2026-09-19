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

    expect(screen.getByRole("link", { name: "Open the approved page" })).toHaveAttribute(
      "href",
      "/public/synthetic-open-house-v3",
    );
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
    await user.click(screen.getByRole("button", { name: "Add entry" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Campaign review: 25 minutes. Nothing was saved.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("renders complete campaign evidence and filters history across every required dimension", async () => {
    const user = userEvent.setup();
    render(<ReportsScreen reporting={loadSyntheticReporting()} />);

    const history = screen.getByRole("region", { name: "Campaign history" });
    const cedar = within(history)
      .getByRole("heading", { name: "Cedar Street Open House Boost" })
      .closest("article");
    if (!cedar) throw new Error("Expected the Cedar Street campaign card.");
    for (const label of [
      "Current version",
      "Realtor",
      "Approvers",
      "Publish time",
      "Budget",
      "Spend",
      "Leads",
      "Cost per lead",
      "Appointments",
      "Applications",
      "Funded or closed",
      "Page",
      "PDF",
      "QR destination",
      "Creative",
      "Email package",
      "SMS package",
      "Approval",
      "Meta state",
      "Lead count",
      "GHL outcome summary",
    ]) {
      expect(within(cedar).getByText(label)).toBeInTheDocument();
    }
    expect(within(cedar).getByText("Unavailable")).toBeInTheDocument();
    expect(within(cedar).getByText("Excluded test leads")).toBeInTheDocument();
    expect(within(cedar).getAllByRole("link")).toHaveLength(4);

    await user.type(screen.getByLabelText("Search campaigns"), "Lakeview");
    expect(within(history).queryByText("Cedar Street Open House Boost")).not.toBeInTheDocument();
    expect(within(history).getByText("Lakeview Buyer Seminar")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    for (const [label, value] of [
      ["Realtor", "Morgan Diaz"],
      ["Property", "88 Lakeview Avenue"],
      ["Status", "completed"],
      ["Event date", "2026-06-15"],
      ["Generation date", "2026-06-08"],
      ["Publish date", "2026-06-11"],
    ] as const) {
      const control = screen.getByLabelText(label);
      if (control instanceof HTMLSelectElement) await user.selectOptions(control, value);
      else {
        await user.clear(control);
        await user.type(control, value);
      }
      expect(within(history).queryByText("Cedar Street Open House Boost")).not.toBeInTheDocument();
      expect(within(history).getByText("Lakeview Buyer Seminar")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Clear filters" }));
    }
  });

  it("groups privacy-safe blueprint evidence and suppresses low-volume results", async () => {
    const user = userEvent.setup();
    render(<ReportsScreen reporting={loadSyntheticReporting()} />);

    expect(document.querySelectorAll("[data-exception-kind]")).toHaveLength(8);
    expect(
      screen.getByText(
        "Small groups are hidden. No workspace is named. Nothing here changes a campaign.",
      ),
    ).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Results grouped by Blueprint version" });
    expect(
      within(table).getByRole("row", { name: /Open House v3 Benchmark ready 25 2 14 5/u }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("row", { name: /Seminar v2 Suppressed 8 1 Unavailable/u }),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Group blueprint results by"),
      "creativeVersion",
    );
    expect(
      screen.getByRole("table", { name: "Results grouped by Creative version" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Suppressed")).toHaveLength(3);
  });

  it("shows structured cohort evidence and stages Realtor audit records without writes", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<ReportsScreen reporting={loadSyntheticReporting()} />);

    const cohort = screen.getByRole("table", {
      name: "Where the founding cohort stands",
    });
    expect(within(cohort).getByRole("row", { name: /Purchase completed/u })).toHaveTextContent(
      "Synthetic founding-cohort event projection",
    );
    expect(within(cohort).getByRole("row", { name: /Support time observed/u })).toHaveTextContent(
      "25 minutes staged locally, no saved record",
    );
    expect(
      within(cohort).getByRole("row", { name: /Meta verification blocked/u }),
    ).toHaveTextContent("Live controlled-account read-back required");

    const realtor = document.querySelector("[data-realtor-identity='Jordan Lee']");
    if (!(realtor instanceof HTMLElement)) throw new Error("Expected the assigned Realtor card.");
    expect(within(realtor).getByText("Cedar Street Open House Boost")).toBeInTheDocument();
    expect(within(realtor).getByText(/Disabled by default/u)).toBeInTheDocument();
    expect(within(realtor).getByText(/GHL contacts, Borrower details/u)).toBeInTheDocument();

    await user.click(within(realtor).getByRole("button", { name: "Stage approved link share" }));
    expect(within(realtor).getByText(/Share recorded for Public page v3/u)).toHaveTextContent(
      "Nothing was sent anywhere",
    );
    const auditItems = within(realtor).getAllByRole("listitem");
    expect(auditItems.at(-1)).toHaveTextContent(/Share, staged locally, Realtor sharing control/u);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("preserves campaign filters when the surrounding theme rerenders", async () => {
    const user = userEvent.setup();
    const reporting = loadSyntheticReporting();
    const { rerender } = render(
      <div data-theme="light">
        <ReportsScreen reporting={reporting} />
      </div>,
    );

    await user.type(screen.getByLabelText("Search campaigns"), "Lakeview");
    expect(screen.getByLabelText("Search campaigns")).toHaveValue("Lakeview");
    const history = screen.getByRole("region", { name: "Campaign history" });
    expect(within(history).queryByText("Cedar Street Open House Boost")).not.toBeInTheDocument();

    rerender(
      <div data-theme="dark">
        <ReportsScreen reporting={reporting} />
      </div>,
    );

    expect(screen.getByLabelText("Search campaigns")).toHaveValue("Lakeview");
    const rerenderedHistory = screen.getByRole("region", { name: "Campaign history" });
    expect(
      within(rerenderedHistory).queryByText("Cedar Street Open House Boost"),
    ).not.toBeInTheDocument();
    expect(within(rerenderedHistory).getByText("Lakeview Buyer Seminar")).toBeInTheDocument();
  });
});
