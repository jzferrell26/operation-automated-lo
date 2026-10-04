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
    // The writing review delta check, D-8: the chip says "Connected", not the data's own word.
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.queryByText("connected")).not.toBeInTheDocument();

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

/**
 * The scored baseline review of 2026-10-03, pass 2, part R2, N-5 (axes 2 to 4; the screen is exempt
 * from axis 10 by the rubric's section 5 entry of 2026-10-03). The stylesheet's measures are pinned
 * in `campaign-detail-look.unit.test.ts`.
 */
describe("the demo campaign page's status words (review pass 2, R2 N-5c)", () => {
  it("draws each status as a Badge, so every one carries a glyph and a tone", () => {
    const { container } = render(<CampaignDetailScreen reporting={loadSyntheticReporting()} />);

    const approved = container.querySelector("[data-artifact-status='approved']") as HTMLElement;
    expect(approved).toHaveAttribute("data-tone", "success");
    expect(approved.querySelector("svg")).not.toBeNull();
    const connected = container.querySelector("[data-connection-state='connected']") as HTMLElement;
    expect(connected).toHaveAttribute("data-tone", "success");
    expect(connected.querySelector("svg")).not.toBeNull();
    // Pass 3, R2 P3-2: `badge-and-live-region.md`, "Tones and glyphs", puts "selected" under `info`
    // (and `neutral` under draft, inactive, unavailable), so a selected asset is not the grey of
    // "Replaced" or "Not live yet".
    for (const selected of screen.getAllByText(/^(Optional, selected|Selected)$/u)) {
      expect(selected).toHaveAttribute("data-tone", "info");
      expect(selected.querySelector("svg")).not.toBeNull();
    }
  });

  it("tells an approved version from a superseded one by tone and glyph, not by the word alone", async () => {
    const user = userEvent.setup();
    const { container } = render(<CampaignDetailScreen reporting={loadSyntheticReporting()} />);

    // The preview's badge is one element that takes the chosen version's status, so what the approved
    // version drew is read before the superseded one is chosen.
    const approved = container.querySelector("[data-artifact-status='approved']") as HTMLElement;
    const approvedTone = approved.getAttribute("data-tone");
    const approvedGlyph = approved.querySelector("svg")?.innerHTML;
    await user.click(screen.getByRole("button", { name: "Version 2" }));
    const superseded = container.querySelector(
      "[data-artifact-status='superseded']",
    ) as HTMLElement;

    expect(approvedTone).toBe("success");
    expect(superseded).toHaveAttribute("data-tone", "neutral");
    expect(superseded.querySelector("svg")?.innerHTML).not.toBe(approvedGlyph);
  });

  // The writing review delta check, D-8. The chips said the data's own lowercase words ("approved",
  // "superseded", "connected") beside sentence-case chips such as "Optional, selected" and every chip
  // on the real pages, and "superseded" is not a plain word. The data keeps its words.
  it("says each status in sentence case and plain words, and keeps the data's own word in the markup", async () => {
    const user = userEvent.setup();
    const { container } = render(<CampaignDetailScreen reporting={loadSyntheticReporting()} />);

    const approved = container.querySelector("[data-artifact-status='approved']") as HTMLElement;
    expect(approved).toHaveTextContent("Approved");
    await user.click(screen.getByRole("button", { name: "Version 2" }));
    const superseded = container.querySelector(
      "[data-artifact-status='superseded']",
    ) as HTMLElement;
    expect(superseded).toHaveTextContent("Replaced");
    expect(superseded).not.toHaveTextContent("superseded");
    expect(container.querySelector("[data-connection-state='connected']")).toHaveTextContent(
      "Connected",
    );
  });

  it("says no status chip in the data's lowercase words, in the history, the connection or the approval", () => {
    const { container } = render(<CampaignDetailScreen reporting={loadSyntheticReporting()} />);

    const chips = [...container.querySelectorAll(".oalo-state-label")].map(
      (chip) => chip.textContent ?? "",
    );
    expect(chips.length).toBeGreaterThan(6);
    for (const chip of chips) {
      expect(chip, chip).not.toMatch(/^(?:approved|superseded|connected)$/u);
      expect(chip, chip).toMatch(/^[A-Z]/u);
    }
  });

  it("draws every row of the history's status as a Badge too", () => {
    render(<CampaignDetailScreen reporting={loadSyntheticReporting()} />);

    const history = screen.getByRole("region", { name: "What changed, and when" });
    for (const row of within(history).getAllByRole("listitem")) {
      expect(row.querySelector(".oalo-state-label"), row.textContent ?? "").not.toBeNull();
    }
  });
});

describe("the demo campaign page's section rhythm (review pass 2, R2 N-5a)", () => {
  it("makes every section a child of the page, so each section title stands the page's one gap below the block before it", () => {
    const { container } = render(<CampaignDetailScreen reporting={loadSyntheticReporting()} />);

    const page = container.firstElementChild as HTMLElement;
    const sections = [
      "creative-originals-title",
      "campaign-history-title",
      "meta-connection-title",
      "approval-scope-title",
      "final-launch-title",
    ].map((id) => container.querySelector(`section[aria-labelledby='${id}']`));
    for (const section of sections) {
      expect(section, "a section with a title").not.toBeNull();
      expect(section?.parentElement).toBe(page);
    }
  });

  it("keeps the version picker, the preview and the actions together as one group", () => {
    const { container } = render(<CampaignDetailScreen reporting={loadSyntheticReporting()} />);

    const picker = container.querySelector("[aria-label='Preview a version']") as HTMLElement;
    const group = picker.parentElement as HTMLElement;
    expect(group.parentElement).toBe(container.firstElementChild);
    expect(within(group).getByRole("link", { name: /^Open the approved page/u })).not.toBeNull();
    expect(
      within(group).getByRole("button", { name: "Start a new draft from this" }),
    ).not.toBeNull();
  });
});
