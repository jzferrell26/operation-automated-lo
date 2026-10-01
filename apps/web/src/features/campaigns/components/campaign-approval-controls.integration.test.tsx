import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

/**
 * The card refreshes the page it sits on once a decision lands (PRD-008b D2), so it asks the app
 * router for `refresh`. There is no app router in a component test; this is the one it would get.
 */
const mocked = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ refresh: mocked.refresh }) }));

beforeEach(() => {
  mocked.refresh.mockReset();
});

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

/**
 * PRD-008b 008B-AC-004 and 008B-AC-005.
 *
 * The card used to keep offering the decision it had just recorded until the page was reloaded, and
 * the regions around it kept saying "Ready for approval". A decision that landed now replaces both
 * controls with what was recorded and refreshes the page so the persisted state is what the rest of
 * the screen reads. A decision that did not land changes nothing about what the person can do.
 */

const APPROVE_LABEL = "Approve this version";
const SEND_BACK_LABEL = "Send back for changes";

function stubDecisionFetch(body: { decision: "approved" | "rejected"; duplicate: boolean }): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json",
            [SUPPORT_REFERENCE_HEADER]: SUPPORT_REFERENCE,
          },
        }),
    ),
  );
}

async function sendBack(): Promise<void> {
  await userEvent.setup().click(screen.getByRole("button", { name: SEND_BACK_LABEL }));
}

describe("the approval control once a decision has been recorded", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers both controls before anyone has decided", () => {
    render(<CampaignApprovalControls {...APPROVABLE} />);

    expect(screen.getByRole("button", { name: APPROVE_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: SEND_BACK_LABEL })).toBeEnabled();
    expect(mocked.refresh).not.toHaveBeenCalled();
  });

  it.each([
    [
      "an approval",
      { decision: "approved", duplicate: false } as const,
      "Approved. This campaign won't run as an ad until HighLevel and Meta are connected.",
    ],
    [
      "a duplicate approval",
      { decision: "approved", duplicate: true } as const,
      "Already approved.",
    ],
  ])(
    "replaces both controls with the outcome and refreshes after %s",
    async (_label, body, sentence) => {
      stubDecisionFetch(body);
      render(<CampaignApprovalControls {...APPROVABLE} />);

      await approve();

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(sentence);
      });
      expect(screen.queryByRole("button", { name: APPROVE_LABEL })).toBeNull();
      expect(screen.queryByRole("button", { name: SEND_BACK_LABEL })).toBeNull();
      expect(mocked.refresh).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [
      "a send-back",
      { decision: "rejected", duplicate: false } as const,
      "Sent back for changes. The campaign creator can fix it and save a new version.",
    ],
    [
      "a duplicate send-back",
      { decision: "rejected", duplicate: true } as const,
      "Already sent back for changes.",
    ],
  ])(
    "replaces both controls with the outcome and refreshes after %s",
    async (_label, body, sentence) => {
      stubDecisionFetch(body);
      render(<CampaignApprovalControls {...APPROVABLE} />);

      await sendBack();

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(sentence);
      });
      expect(screen.queryByRole("button", { name: APPROVE_LABEL })).toBeNull();
      expect(screen.queryByRole("button", { name: SEND_BACK_LABEL })).toBeNull();
      expect(mocked.refresh).toHaveBeenCalledTimes(1);
    },
  );

  it("moves focus to the outcome, because the control that had it is gone", async () => {
    stubDecisionFetch({ decision: "approved", duplicate: false });
    render(<CampaignApprovalControls {...APPROVABLE} />);

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveFocus();
    });
  });

  it("keeps the outcome on screen when the refreshed page hands it the stored decision", async () => {
    stubDecisionFetch({ decision: "approved", duplicate: false });
    const { rerender } = render(<CampaignApprovalControls {...APPROVABLE} />);

    await approve();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Approved.");
    });

    // What `router.refresh()` does to this card: the same component, new props from the server.
    rerender(
      <CampaignApprovalControls {...APPROVABLE} alreadyDecided="approved" state="approved" />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Approved.");
    expect(screen.queryByRole("button", { name: APPROVE_LABEL })).toBeNull();
    expect(screen.queryByRole("button", { name: SEND_BACK_LABEL })).toBeNull();
  });
});

describe("the approval control when a decision did not land", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps both controls, says why, and does not refresh, when the route refuses", async () => {
    stubRefusedFetch("CAMPAIGN_ELEVENTH_HOUR_SURPRISE", SUPPORT_REFERENCE, 409);
    render(<CampaignApprovalControls {...APPROVABLE} />);

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Something went wrong on our side. Try again, and contact support if it keeps happening.",
      );
    });
    expect(screen.getByRole("button", { name: APPROVE_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: SEND_BACK_LABEL })).toBeEnabled();
    expect(screen.getByText(SUPPORT_REFERENCE)).toBeInTheDocument();
    expect(mocked.refresh).not.toHaveBeenCalled();
  });

  it("keeps both controls, says why, and does not refresh, when a send-back is refused", async () => {
    stubRefusedFetch("CAMPAIGN_APPROVAL_CONFLICT", SUPPORT_REFERENCE, 409);
    render(<CampaignApprovalControls {...APPROVABLE} />);

    await sendBack();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        userMessageSentence("CAMPAIGN_APPROVAL_CONFLICT"),
      );
    });
    expect(screen.getByRole("button", { name: APPROVE_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: SEND_BACK_LABEL })).toBeEnabled();
    expect(mocked.refresh).not.toHaveBeenCalled();
  });

  it("keeps both controls, says so, and does not refresh, when nothing answered", async () => {
    stubUnreachedFetch();
    render(<CampaignApprovalControls {...APPROVABLE} />);

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(userMessageSentence(undefined));
    });
    expect(screen.getByText(SUPPORT_REFERENCE_NOT_RECORDED)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: APPROVE_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: SEND_BACK_LABEL })).toBeEnabled();
    expect(mocked.refresh).not.toHaveBeenCalled();
  });
});
