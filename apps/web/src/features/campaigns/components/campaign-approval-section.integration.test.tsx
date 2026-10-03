import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { APPROVAL } from "../../../copy/campaign-page-messages.js";
import { CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION } from "../../../copy/user-language.js";
import { CampaignApprovalSection } from "./campaign-approval-section.js";

/**
 * Pass 4, R2 F4-1. The Approval card's first sentence is the card's lead, and the mockup draws it in
 * the strong ink (`campaign-detail.html:553`: a plain `.small`), while the sentence under it is the
 * quiet one (`.small muted`). jsdom has no cascade, so what is held here is which class each
 * sentence wears; `campaign-page-layout.unit.test.ts` holds the ink each class sets.
 */

function paragraphs(): readonly HTMLElement[] {
  const card = screen.getByRole("region", { name: APPROVAL.title });
  return [...card.querySelectorAll("p")];
}

describe("the Approval card's sentences", () => {
  it("draws 'Nobody has approved this version yet.' as the card's lead sentence", () => {
    render(<CampaignApprovalSection decision={undefined} />);

    const [lead, ...rest] = paragraphs();
    expect(lead).toHaveTextContent(APPROVAL.nobody);
    expect(lead?.className).toMatch(/decisionLine/u);
    expect(rest).toHaveLength(0);
  });

  it("draws 'Approved by ...' as the lead and the coverage sentence under it as the quiet one", () => {
    render(
      <CampaignApprovalSection
        decision={{
          decision: "approved",
          decidedAt: "2026-10-02T15:00:00.000Z",
          actorRole: "location_admin",
          approverDisplayName: "Dana Reyes",
        }}
      />,
    );

    const [lead, covers, ...rest] = paragraphs();
    expect(lead).toHaveTextContent("Approved by Dana Reyes, workspace owner, on");
    expect(within(lead as HTMLElement).getByText("Dana Reyes").tagName).toBe("STRONG");
    expect(lead?.className).toMatch(/decisionLine/u);
    expect(covers).toHaveTextContent(APPROVAL.covers);
    expect(covers?.className).not.toMatch(/decisionLine/u);
    expect(rest).toHaveLength(0);
  });

  it("draws 'Sent back for changes by ...' as the lead and the new-version sentence as the quiet one", () => {
    render(
      <CampaignApprovalSection
        decision={{
          decision: "rejected",
          decidedAt: "2026-10-02T15:00:00.000Z",
          actorRole: "approver",
        }}
      />,
    );

    const [lead, next, ...rest] = paragraphs();
    expect(lead).toHaveTextContent("Sent back for changes by an approver on");
    expect(lead?.className).toMatch(/decisionLine/u);
    expect(next).toHaveTextContent(CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION);
    expect(next?.className).not.toMatch(/decisionLine/u);
    expect(rest).toHaveLength(0);
  });
});
