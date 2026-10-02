import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NO_LIVE_RESULTS, type CampaignResultsInput } from "../campaign-page-model.js";
import { CampaignResultsCard } from "./campaign-results-card.js";

/**
 * PRD-009e D1, 009E-AC-002 and MTK-009. The results card shows spend, leads sent to HighLevel, and
 * cost per lead, and no other figure. A figure with no live source says so in words and never shows
 * 0; a figure with a value shows where it came from and when it was last updated.
 */

const LIVE: CampaignResultsInput = {
  spendCents: { value: 12_345, source: "meta", updatedAt: "2026-10-03T14:15:00.000Z" },
  leads: { value: 12, source: "ghl", updatedAt: "2026-10-03T14:20:00.000Z" },
  costPerLeadCents: { value: 1_029, source: "meta", updatedAt: "2026-10-03T14:15:00.000Z" },
};

function figure(id: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-figure='${id}']`);
  if (found === null) throw new Error(`No ${id} figure.`);
  return found;
}

describe("the results card with no live value", () => {
  it("shows the three figures, each Not live yet, and no other figure", () => {
    const { container } = render(<CampaignResultsCard results={NO_LIVE_RESULTS} />);

    const labels = [...container.querySelectorAll("[data-figure]")].map(
      (node) => node.firstElementChild?.textContent,
    );
    expect(labels).toEqual(["Spend", "Leads sent to HighLevel", "Cost per lead"]);
    for (const id of ["spend", "leads", "cost-per-lead"]) {
      expect(within(figure(id)).getByText("Not live yet")).toBeInTheDocument();
      expect(figure(id)).toHaveAttribute("data-has-value", "false");
    }
  });

  it("carries one Not live yet chip and the one sentence, and no digit anywhere in it", () => {
    const { container } = render(<CampaignResultsCard results={NO_LIVE_RESULTS} />);

    const card = container.querySelector("[data-results-card]") as HTMLElement;
    expect(within(card).getAllByText("Not live yet")).toHaveLength(4);
    expect(
      within(card).getByText(
        "This ad isn't running, so there is nothing to count yet. Spend comes from Meta, and leads are counted when they reach HighLevel.",
      ),
    ).toBeInTheDocument();
    expect(card.textContent ?? "").not.toMatch(/\d/u);
    expect(within(card).queryByText(/Source:|Updated/u)).toBeNull();
  });

  it("is a named region of its own", () => {
    render(<CampaignResultsCard results={NO_LIVE_RESULTS} />);

    expect(screen.getByRole("region", { name: "Results" })).toBeInTheDocument();
  });
});

describe("the results card with live values", () => {
  it("shows each figure with its source and when it was last updated", () => {
    render(<CampaignResultsCard results={LIVE} />);

    expect(figure("spend")).toHaveTextContent("$123.45");
    expect(figure("spend")).toHaveTextContent("Source: Meta. Updated Oct 3, 2026, 2:15 PM UTC");
    expect(figure("leads")).toHaveTextContent("12");
    expect(figure("leads")).toHaveTextContent(
      "Source: HighLevel. Updated Oct 3, 2026, 2:20 PM UTC",
    );
    expect(figure("cost-per-lead")).toHaveTextContent("$10.29");
    expect(figure("cost-per-lead")).toHaveTextContent("Source: Meta");
    expect(figure("spend")).toHaveAttribute("data-has-value", "true");
  });

  it("drops the chip and the sentence once any figure has a value", () => {
    render(<CampaignResultsCard results={LIVE} />);

    const card = screen.getByRole("region", { name: "Results" });
    expect(within(card).queryByText("This ad isn't running", { exact: false })).toBeNull();
    expect(within(card).queryByText("Not live yet")).toBeNull();
  });

  it("still says Not live yet for a figure that has none, beside one that has a value", () => {
    render(
      <CampaignResultsCard
        results={{ ...LIVE, leads: { value: null, source: "ghl", updatedAt: null } }}
      />,
    );

    expect(within(figure("leads")).getByText("Not live yet")).toBeInTheDocument();
    expect(figure("spend")).toHaveTextContent("$123.45");
  });

  /** A zero is a claim that something was counted, so it shows only when a source says zero. */
  it("shows a zero when a source returned zero, with the source", () => {
    render(
      <CampaignResultsCard
        results={{
          ...LIVE,
          leads: { value: 0, source: "ghl", updatedAt: "2026-10-03T14:20:00.000Z" },
        }}
      />,
    );

    expect(figure("leads")).toHaveTextContent("0");
    expect(figure("leads")).toHaveTextContent("Source: HighLevel");
    expect(within(figure("leads")).queryByText("Not live yet")).toBeNull();
  });

  it("says the update time was not recorded when a source gave none, or an unreadable one", () => {
    render(
      <CampaignResultsCard
        results={{
          spendCents: { value: 500, source: "application", updatedAt: null },
          leads: { value: 1, source: "ghl", updatedAt: "not a time" },
          costPerLeadCents: { value: 500, source: "application", updatedAt: null },
        }}
      />,
    );

    expect(figure("spend")).toHaveTextContent("Source: Automated LO. Update time not recorded");
    expect(figure("leads")).toHaveTextContent("Update time not recorded");
  });
});
