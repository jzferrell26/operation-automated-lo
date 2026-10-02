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
import {
  CampaignApprovalControls,
  type CampaignApprovalControlsProps,
} from "./campaign-approval-controls.js";
import { reviewFixture } from "./launch-flow.test-support.js";
import { LaunchReview } from "./launch-review.js";

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

/**
 * PRD-009d 009D-AC-015. Step 3 of "Launch an ad" reuses this control, so every test of it runs in
 * both places: alone, as the campaign page shows it, and inside step 3 built from the same version.
 * Step 3 draws a recorded decision as its own card (D8) rather than as this control, so the tests
 * about a decision the page already stored run on the campaign page only.
 */
const CAMPAIGN_PAGE = "on the campaign page";
const STEP_THREE = "on step 3 of Launch an ad";

function stepThree(props: CampaignApprovalControlsProps) {
  const finding = {
    ruleCode: "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
    affected: "content.headline",
    remediation: "Take 'low rates' out of the headline. Ads can't state rate claims.",
  };
  return (
    <LaunchReview
      review={reviewFixture(
        {
          campaignRef: props.campaignRef,
          campaignVersionRef: props.campaignVersionRef,
          manifestHash: props.manifestHash,
          preflightResultHash: props.preflightResultHash,
          rowVersion: props.rowVersion,
          canApprove: props.canApprove,
          state: props.state,
          detailHref: props.campaignHref,
        },
        props.blocking ? [finding] : [],
      )}
    />
  );
}

const HOSTS = [
  [
    CAMPAIGN_PAGE,
    (props: CampaignApprovalControlsProps) => <CampaignApprovalControls {...props} />,
  ],
  [STEP_THREE, stepThree],
] as const;

const APPROVE_LABEL = "Approve this version";
const SEND_BACK_LABEL = "Send back for changes";

async function approve(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: APPROVE_LABEL }));
  await user.click(await screen.findByRole("button", { name: "Yes, approve" }));
}

async function sendBack(): Promise<void> {
  await userEvent.setup().click(screen.getByRole("button", { name: SEND_BACK_LABEL }));
}

/** A route that answers 200 to a decision, with the reference header every answer carries. */
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

/**
 * PRD-008b 008B-AC-005. A decision that did not land changes nothing about what the person can do:
 * both controls are still there and still usable, and the page was not asked to refresh.
 */
function expectDecisionStillOffered(): void {
  expect(screen.getByRole("button", { name: APPROVE_LABEL })).toBeEnabled();
  expect(screen.getByRole("button", { name: SEND_BACK_LABEL })).toBeEnabled();
  expect(mocked.refresh).not.toHaveBeenCalled();
}

describe.each(HOSTS)("the approval control %s when the route refuses", (_where, mount) => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the generic sentence and the support reference for a code it cannot map", async () => {
    stubRefusedFetch("CAMPAIGN_ELEVENTH_HOUR_SURPRISE", SUPPORT_REFERENCE, 409);
    render(mount(APPROVABLE));

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
    expectDecisionStillOffered();
  });

  it("shows the mapped sentence and no reference for a code it knows", async () => {
    stubRefusedFetch("CAMPAIGN_APPROVAL_CONFLICT", SUPPORT_REFERENCE, 409);
    render(mount(APPROVABLE));

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        userMessageSentence("CAMPAIGN_APPROVAL_CONFLICT"),
      );
    });
    expect(screen.queryByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeNull();
    expect(screen.queryByText(SUPPORT_REFERENCE)).toBeNull();
    expectDecisionStillOffered();
  });

  /*
   * Writing review W-1. The four library refusals used to fall through to "Something went wrong on
   * our side. Try again", which blames us for a library change and offers a retry that cannot work.
   */
  it.each([
    ["LIBRARY_AD_MISSING", "This ad isn't in the library, so this version can't be approved."],
    [
      "LIBRARY_AD_RETIRED",
      "This ad was taken out of the library, so this version can't be approved.",
    ],
    [
      "LIBRARY_AD_REPLACED",
      "A newer version of this ad is in the library, so this version can't be approved.",
    ],
    [
      "LIBRARY_AD_ART_CHANGED",
      "The picture for this ad changed after this version was saved, so this version can't be approved.",
    ],
  ])("says plainly why a library change refused it, for %s", async (code, what) => {
    stubRefusedFetch(code, SUPPORT_REFERENCE, 409);
    render(mount(APPROVABLE));

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(what);
    });
    expect(screen.getByRole("status")).not.toHaveTextContent("Something went wrong on our side");
    expect(screen.getByRole("status")).not.toHaveTextContent("Try again");
    expect(screen.queryByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeNull();
    expectDecisionStillOffered();
  });

  it("still shows the row, and says so, when the refusal carried no reference", async () => {
    stubRefusedFetch(undefined, undefined, 409);
    render(mount(APPROVABLE));

    await approve();

    expect(await screen.findByText(SUPPORT_REFERENCE_NOT_RECORDED)).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeInTheDocument();
    expectDecisionStillOffered();
  });

  it("says the same thing when nothing answered at all", async () => {
    stubUnreachedFetch();
    render(mount(APPROVABLE));

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(userMessageSentence(undefined));
    });
    expect(screen.getByText(SUPPORT_REFERENCE_NOT_RECORDED)).toBeInTheDocument();
    expectDecisionStillOffered();
  });

  it("keeps both controls, and does not refresh, when a send-back is refused", async () => {
    stubRefusedFetch("CAMPAIGN_APPROVAL_CONFLICT", SUPPORT_REFERENCE, 409);
    render(mount(APPROVABLE));

    await sendBack();

    expect(
      await screen.findByText(userMessageSentence("CAMPAIGN_APPROVAL_CONFLICT")),
    ).toBeVisible();
    expectDecisionStillOffered();
  });

  it("leaves no support region behind on a decision that landed", async () => {
    stubDecisionFetch({ decision: "approved", duplicate: false });
    render(mount(APPROVABLE));

    await approve();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Approved. This campaign won't run as an ad yet. Launching isn't turned on, and HighLevel and Meta aren't connected.",
      );
    });
    expect(screen.queryByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeNull();
  });
});

/**
 * PRD-008b 008B-AC-004.
 *
 * The card used to keep offering the decision it had just recorded until the page was reloaded, and
 * the regions around it kept saying "Ready for approval". A decision that landed now replaces both
 * controls with what was recorded and refreshes the page so the persisted state is what the rest of
 * the screen reads. The cases where a decision did not land are the refusal tests above, which each
 * end by checking that both controls are still offered (008B-AC-005).
 */
describe.each(HOSTS)(
  "the approval control %s once a decision has been recorded",
  (where, mount) => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("offers both controls before anyone has decided", () => {
      render(mount(APPROVABLE));

      expectDecisionStillOffered();
    });

    it.each([
      [
        "an approval",
        approve,
        { decision: "approved", duplicate: false } as const,
        "Approved. This campaign won't run as an ad yet. Launching isn't turned on, and HighLevel and Meta aren't connected.",
      ],
      [
        "a duplicate approval",
        approve,
        { decision: "approved", duplicate: true } as const,
        "Already approved.",
      ],
      [
        "a send-back",
        sendBack,
        { decision: "rejected", duplicate: false } as const,
        "Sent back for changes. The campaign creator can fix it and save a new version.",
      ],
      [
        "a duplicate send-back",
        sendBack,
        { decision: "rejected", duplicate: true } as const,
        "Already sent back for changes.",
      ],
    ])(
      "replaces both controls with the outcome and refreshes after %s",
      async (_label, decide, body, sentence) => {
        stubDecisionFetch(body);
        render(mount(APPROVABLE));

        await decide();

        await waitFor(() => {
          expect(screen.getByRole("status")).toHaveTextContent(sentence);
        });
        expect(screen.queryByRole("button", { name: APPROVE_LABEL })).toBeNull();
        expect(screen.queryByRole("button", { name: SEND_BACK_LABEL })).toBeNull();
        // The card keeps its own title once a decision replaces its controls.
        expect(screen.getByText("Approve this version")).toBeInTheDocument();
        expect(mocked.refresh).toHaveBeenCalledTimes(1);
      },
    );

    it("moves focus to the outcome, because the control that had it is gone", async () => {
      stubDecisionFetch({ decision: "approved", duplicate: false });
      render(mount(APPROVABLE));

      await approve();

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveFocus();
      });
    });

    it.runIf(where === CAMPAIGN_PAGE)(
      "keeps the outcome on screen when the refreshed page hands it the stored decision",
      async () => {
        stubDecisionFetch({ decision: "approved", duplicate: false });
        const { rerender } = render(mount(APPROVABLE));

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
      },
    );
  },
);

/**
 * Finding H1 of the 2026-10-01 writing re-review, and the guard that nothing else moved with it.
 *
 * The control gives one reason for each state it can be in. A version whose checks need changes is
 * not approvable by anyone, so `canApprove` is false for an approver there too; the reason has to be
 * the checks, and it used to be the viewers

/**
 * Finding H1 of the 2026-10-01 writing re-review, and the guard that nothing else moved with it.
 *
 * The control gives one reason for each state it can be in. A version whose checks need changes is
 * not approvable by anyone, so `canApprove` is false for an approver there too; the reason has to be
 * the checks, and it used to be the viewer's permission. Every other row is what the control said
 * before, so a change to the order of the tests cannot quietly change what it says for them.
 */
describe.each(HOSTS)("what the approval control says %s in each state", (where, mount) => {
  const PERMISSION = "Only an approver or your workspace owner can approve a campaign.";
  const SEND_IT_ON = "Send them this page and ask them to look at this version.";
  const NEEDS_CHANGES = "This version needs changes before anyone can approve it.";
  const FIX_IT = "The campaign creator fixes what the checks found and saves it again.";
  // PRD-008 follow-up Quality L-2 (009F-AC-008): addressed to nobody in particular, it asked an
  // approver who cannot edit to do what they cannot.
  const OLD_FIX_IT = "Fix what the checks found, then save it again.";
  const ALREADY_DECIDED = "Someone has already decided on this version.";
  const READ_WHO_DECIDED = "Read who decided, above. Nothing else happens from this page.";
  const READY =
    "Read the wording, the budget, where the ad runs, the dates, and the disclosures before you approve.";

  const rows = [
    ["an approver on a version waiting for a decision", { ...APPROVABLE }, [READY], [PERMISSION]],
    [
      "somebody who cannot approve a version waiting for a decision",
      { ...APPROVABLE, canApprove: false },
      [PERMISSION, SEND_IT_ON],
      [NEEDS_CHANGES, READY],
    ],
    [
      "somebody who cannot approve a version whose checks need changes",
      { ...APPROVABLE, canApprove: false, blocking: true, state: "preflight_failed" },
      [NEEDS_CHANGES, FIX_IT],
      [PERMISSION, SEND_IT_ON, OLD_FIX_IT],
    ],
    [
      "an approving role on a version whose checks need changes",
      { ...APPROVABLE, canApprove: true, blocking: true, state: "preflight_failed" },
      [NEEDS_CHANGES, FIX_IT],
      [PERMISSION, SEND_IT_ON, OLD_FIX_IT],
    ],
    [
      "anybody on a version that was approved",
      { ...APPROVABLE, canApprove: false, alreadyDecided: "approved", state: "approved" },
      [ALREADY_DECIDED, READ_WHO_DECIDED],
      [PERMISSION, NEEDS_CHANGES],
    ],
    [
      "anybody on a version that was sent back",
      { ...APPROVABLE, canApprove: true, alreadyDecided: "rejected" },
      [ALREADY_DECIDED, READ_WHO_DECIDED],
      [PERMISSION, NEEDS_CHANGES],
    ],
  ] as const;
  // Step 3 draws a decided version as D8's card, not as this control, and a viewer who cannot
  // approve a version waiting for a decision gets D8's hand-off card alone (`launch-review` tests).
  const stepThreeRows = rows.filter(
    ([, props]) =>
      !("alreadyDecided" in props) &&
      !(props.canApprove === false && !("blocking" in props && props.blocking)),
  );
  it.each(where === STEP_THREE ? stepThreeRows : rows)(
    "says the right reason to %s",
    (_who, props, present, absent) => {
      render(mount(props));

      for (const sentence of present)
        expect(screen.getByText(sentence), sentence).toBeInTheDocument();
      for (const sentence of absent) expect(screen.queryByText(sentence), sentence).toBeNull();
      expect(screen.queryByText(/Read the decision below/u)).toBeNull();
    },
  );
});

/**
 * Writing review W-7. The card names one thing, "this version", and says nothing it has no outcome
 * for: the Approval card above it already says nobody has approved the version.
 */
describe.each(HOSTS)("the words of the approval card %s", (_where, mount) => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is titled for the version, not the campaign", () => {
    render(mount(APPROVABLE));

    expect(screen.getAllByText("Approve this version").length).toBeGreaterThan(0);
    expect(screen.queryByText("Approve this campaign")).toBeNull();
  });

  it("says nothing in its status line until there is an outcome", () => {
    render(mount(APPROVABLE));

    expect(screen.queryByText("Nobody has approved this version yet.")).toBeNull();
    for (const status of screen.queryAllByRole("status")) {
      expect(status).toBeEmptyDOMElement();
    }
  });

  it("says what approving does, in plain words, and what it does not do", async () => {
    const user = userEvent.setup();
    render(mount(APPROVABLE));

    await user.click(screen.getByRole("button", { name: APPROVE_LABEL }));

    expect(
      await screen.findByText(
        "Saves your name as the approver of this exact version. Nothing is published or sent.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This version is approved. Changing the campaign later needs a new approval.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Records your name against/u)).toBeNull();
  });
});
