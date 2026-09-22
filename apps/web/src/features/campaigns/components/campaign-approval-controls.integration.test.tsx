import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SUPPORT_DETAILS_LABELS,
  SUPPORT_REFERENCE_NOT_RECORDED,
} from "../../../copy/user-language.js";
import { SUPPORT_REFERENCE_HEADER } from "../../http/internal-api.js";
import { stubRefusedFetch, stubUnreachedFetch } from "../../http/refusal.test-support.js";
import { userMessageSentence } from "../../http/user-messages.js";
import { CampaignApprovalControls } from "./campaign-approval-controls.js";

/**
 * PRD-006b 006B-AC-007 on the approval control.
 *
 * The control turns the route's code into sentences, which it has done since PRD-006b landed. What
 * it did not do was carry the support reference on the one answer that needs it: a code the product
 * has no sentence for renders "Something went wrong on our side. Try again, and contact support if
 * it keeps happening", and until 2026-09-20 that sentence arrived on its own, so the person it sent
 * to support had nothing to give them. The approve route puts a reference on every response it
 * makes (`apps/web/src/server/campaign-approval-handler.ts:46,79,81,100`), success or refusal.
 *
 * Both halves are here, because either one alone is a weaker claim: a mapped code must still show
 * its own sentence and no reference, or every refusal would drag a reference nobody needs into
 * view.
 */

const SUPPORT_REFERENCE = "correlation_approve_7f3c1d9e5a2b4c6d8e0f1a2b";

const APPROVABLE = {
  campaignHref: "/marketing/campaigns/page_01Approvable",
  campaignRef: "page_01Approvable",
  campaignVersionRef: "page_01ApprovableV1",
  manifestHash: "a".repeat(64),
  preflightResultHash: "b".repeat(64),
  rowVersion: 1,
  canApprove: true,
  blocking: false,
  state: "awaiting_approval",
} as const;

async function approve(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Approve this version" }));
  await user.click(await screen.findByRole("button", { name: "Yes, approve" }));
}

describe("the approval control when the route refuses", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the generic sentence and the support reference for a code it cannot map", async () => {
    stubRefusedFetch("CAMPAIGN_ELEVENTH_HOUR_SURPRISE", SUPPORT_REFERENCE, 409);
    render(<CampaignApprovalControls {...APPROVABLE} />);

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Something went wrong on our side. Try again, and contact support if it keeps happening.",
      );
    });
    expect(screen.getByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_REFERENCE)).toBeInTheDocument();
    // D8: the reference is inside the collapsed region and nowhere else on the screen.
    expect(screen.getByText(SUPPORT_REFERENCE).closest("[data-support-details]")).not.toBeNull();
  });

  it("shows the mapped sentence and no reference for a code it knows", async () => {
    stubRefusedFetch("CAMPAIGN_APPROVAL_CONFLICT", SUPPORT_REFERENCE, 409);
    render(<CampaignApprovalControls {...APPROVABLE} />);

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        userMessageSentence("CAMPAIGN_APPROVAL_CONFLICT"),
      );
    });
    expect(screen.queryByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeNull();
    expect(screen.queryByText(SUPPORT_REFERENCE)).toBeNull();
  });

  it("still shows the row, and says so, when the refusal carried no reference", async () => {
    stubRefusedFetch(undefined, undefined, 409);
    render(<CampaignApprovalControls {...APPROVABLE} />);

    await approve();

    expect(await screen.findByText(SUPPORT_REFERENCE_NOT_RECORDED)).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeInTheDocument();
  });

  it("says the same thing when nothing answered at all", async () => {
    stubUnreachedFetch();
    render(<CampaignApprovalControls {...APPROVABLE} />);

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(userMessageSentence(undefined));
    });
    expect(screen.getByText(SUPPORT_REFERENCE_NOT_RECORDED)).toBeInTheDocument();
  });

  it("leaves no support region behind on a decision that landed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ decision: "approved", duplicate: false }), {
            status: 200,
            headers: {
              "content-type": "application/json",
              [SUPPORT_REFERENCE_HEADER]: SUPPORT_REFERENCE,
            },
          }),
      ),
    );
    render(<CampaignApprovalControls {...APPROVABLE} />);

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Approved. This campaign won't run as an ad until HighLevel and Meta are connected.",
      );
    });
    expect(screen.queryByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeNull();
  });
});
