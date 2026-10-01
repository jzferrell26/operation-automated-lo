import { describe, expect, it } from "vitest";

import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import { GUIDED_SETUP_ANCHORS } from "../anchor-registry.js";
import { approveOrHandOffStep, stepDefinition } from "./step-model.js";

/**
 * PRD-008b 008B-AC-010. The three answers step 6 can give, as a table.
 *
 * Undecided, it is the step it always was: the approve control for somebody who can approve, the
 * copy-link control for everybody else, under the step's own title. Decided, it is one answer for
 * both, which points at the card that says what was recorded. The undecided rows are pinned to the
 * step definition and to the copy as they stood, so the branch that was there before cannot drift
 * while the new one is added beside it.
 */

const WORDS = GUIDED_SETUP_STEPS.approveOrHandOff;

describe("what step 6 shows", () => {
  it("is today's approve step for somebody who can approve a version nobody has decided on", () => {
    expect(approveOrHandOffStep({ canApprove: true, decision: undefined })).toEqual({
      anchor: GUIDED_SETUP_ANCHORS.campaignApproveControl,
      body: "Choose Approve this version. Nothing is published or sent.",
      title: stepDefinition(6).title,
    });
  });

  it("is today's hand-off step for everybody else on a version nobody has decided on", () => {
    expect(approveOrHandOffStep({ canApprove: false, decision: undefined })).toEqual({
      anchor: GUIDED_SETUP_ANCHORS.campaignHandoffLink,
      body: "Only an approver or your workspace owner can approve. Copy this link and send it to them.",
      title: stepDefinition(6).title,
    });
  });

  it.each([
    ["approved", WORDS.approvedTitle, WORDS.approvedBody],
    ["rejected", WORDS.sentBackTitle, WORDS.sentBackBody],
  ] as const)(
    "says what was recorded, and points at the card that holds it, once a version was %s",
    (decision, title, body) => {
      for (const canApprove of [true, false]) {
        expect(approveOrHandOffStep({ canApprove, decision }), String(canApprove)).toEqual({
          anchor: GUIDED_SETUP_ANCHORS.campaignApproveControl,
          body,
          title,
        });
      }
    },
  );

  it("never gives a decided version the copy-link control, which is not on its page", () => {
    for (const decision of ["approved", "rejected"] as const) {
      for (const canApprove of [true, false]) {
        const step = approveOrHandOffStep({ canApprove, decision });
        expect(step.anchor).not.toBe(GUIDED_SETUP_ANCHORS.campaignHandoffLink);
        expect(step.body).not.toContain("Copy this link");
        expect(step.title).not.toBe(stepDefinition(6).title);
      }
    }
  });
});
