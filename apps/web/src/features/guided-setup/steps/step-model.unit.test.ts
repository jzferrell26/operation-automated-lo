import { describe, expect, it } from "vitest";

import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import { GUIDED_SETUP_ANCHORS } from "../anchor-registry.js";
import type { CampaignStanding } from "../model/campaign-result.js";
import {
  approveOrHandOffStep,
  readTheResultBody,
  stepDefinition,
  whatHappensNextBody,
} from "./step-model.js";

/**
 * PRD-008b 008B-AC-010 and 008B-AC-011. What steps 5, 6, and 7 say, as tables over where the
 * campaign stands.
 *
 * Step 6 is the three-way table it was in 008B-AC-010, with a fourth answer for a version whose
 * checks need changes. The undecided rows are pinned to the step definition and to the copy as they
 * stood, so the branch that was there before cannot drift while the others are added beside it.
 * Steps 5 and 7 are the same idea: every standing has a sentence, the ones that were already true
 * keep their words, and every step 7 sentence still says the campaign will not run as an ad.
 */

const WORDS = GUIDED_SETUP_STEPS.approveOrHandOff;

describe("what step 6 shows", () => {
  it("is today's approve step for somebody who can approve a version nobody has decided on", () => {
    expect(approveOrHandOffStep({ canApprove: true, standing: "waiting" })).toEqual({
      anchor: GUIDED_SETUP_ANCHORS.campaignApproveControl,
      body: "Choose Approve this version. Nothing is published or sent.",
      title: stepDefinition(6).title,
    });
  });

  it("is today's hand-off step for everybody else on a version nobody has decided on", () => {
    expect(approveOrHandOffStep({ canApprove: false, standing: "waiting" })).toEqual({
      anchor: GUIDED_SETUP_ANCHORS.campaignHandoffLink,
      body: "Only an approver or your workspace owner can approve. Copy this link and send it to them.",
      title: stepDefinition(6).title,
    });
  });

  it("is the same two answers when the campaign could not be read, as it always was", () => {
    expect(approveOrHandOffStep({ canApprove: true, standing: "unknown" })).toEqual(
      approveOrHandOffStep({ canApprove: true, standing: "waiting" }),
    );
    expect(approveOrHandOffStep({ canApprove: false, standing: "unknown" })).toEqual(
      approveOrHandOffStep({ canApprove: false, standing: "waiting" }),
    );
  });

  it.each([
    ["approved", WORDS.approvedTitle, WORDS.approvedBody],
    ["sent_back", WORDS.sentBackTitle, WORDS.sentBackBody],
  ] as const)(
    "says what was recorded, and points at the card that holds it, once a version is %s",
    (standing, title, body) => {
      for (const canApprove of [true, false]) {
        expect(approveOrHandOffStep({ canApprove, standing }), String(canApprove)).toEqual({
          anchor: GUIDED_SETUP_ANCHORS.campaignApproveControl,
          body,
          title,
        });
      }
    },
  );

  it("says the checks need changes, and points at what they found, for everybody", () => {
    for (const canApprove of [true, false]) {
      expect(approveOrHandOffStep({ canApprove, standing: "needs_changes" })).toEqual({
        anchor: GUIDED_SETUP_ANCHORS.campaignCheckFindings,
        body: WORDS.needsChangesBody,
        title: WORDS.needsChangesTitle,
      });
    }
  });

  it("never gives a version that cannot be approved the approve or copy-link control", () => {
    for (const standing of ["approved", "sent_back", "needs_changes"] as const) {
      for (const canApprove of [true, false]) {
        const step = approveOrHandOffStep({ canApprove, standing });
        expect(step.anchor).not.toBe(GUIDED_SETUP_ANCHORS.campaignHandoffLink);
        expect(step.body).not.toContain("Copy this link");
        expect(step.body).not.toContain("Choose Approve this version");
        expect(step.title).not.toBe(stepDefinition(6).title);
      }
    }
  });
});

describe("what step 5 says", () => {
  it.each([
    ["unknown", GUIDED_SETUP_STEPS.readTheResult.unknownBody],
    ["needs_changes", GUIDED_SETUP_STEPS.readTheResult.needsChangesBody],
    ["waiting", GUIDED_SETUP_STEPS.readTheResult.readyBody],
    ["approved", "Your campaign is saved and approved. Nothing has been published or sent."],
    [
      "sent_back",
      "Your campaign is saved, and it was sent back for changes. It needs a new version before anyone can approve it.",
    ],
  ] as const)("says the right thing for a campaign that is %s", (standing, expected) => {
    expect(readTheResultBody(standing)).toBe(expected);
  });

  it("says a campaign is ready for approval only while it is waiting for approval", () => {
    const standings: readonly CampaignStanding[] = [
      "unknown",
      "needs_changes",
      "waiting",
      "approved",
      "sent_back",
    ];
    for (const standing of standings) {
      expect(readTheResultBody(standing).includes("ready for approval"), standing).toBe(
        standing === "waiting",
      );
    }
  });
});

describe("what step 7 says", () => {
  const TAIL =
    "It won't run as an ad yet: HighLevel and Meta aren't connected. When they are, this is where you'll launch it.";

  it.each([
    ["waiting", `Your campaign is saved and waiting for approval. ${TAIL}`],
    ["needs_changes", `Your campaign is saved, and the checks found things to fix first. ${TAIL}`],
    ["approved", `Your campaign is saved and approved. ${TAIL}`],
    [
      "sent_back",
      `Your campaign is saved, and it was sent back for changes. It needs a new version before anyone can approve it. ${TAIL}`,
    ],
    [
      "unknown",
      "Your campaign won't run as an ad yet: HighLevel and Meta aren't connected. When they are, this is where you'll launch it.",
    ],
  ] as const)("says the right thing for a campaign that is %s", (standing, expected) => {
    expect(whatHappensNextBody(standing)).toBe(expected);
  });

  it("keeps the approved sentence exactly as it was, because it was true for that campaign", () => {
    expect(whatHappensNextBody("approved")).toBe(
      "Your campaign is saved and approved. It won't run as an ad yet: HighLevel and Meta aren't connected. When they are, this is where you'll launch it.",
    );
  });

  it("says the campaign is approved only when an approval is recorded", () => {
    for (const standing of ["waiting", "needs_changes", "sent_back", "unknown"] as const) {
      expect(whatHappensNextBody(standing), standing).not.toMatch(/\bapproved\b/u);
    }
  });

  it("states, for every campaign, that it will not run as an ad until the accounts are connected (006C-AC-018)", () => {
    for (const standing of [
      "waiting",
      "needs_changes",
      "approved",
      "sent_back",
      "unknown",
    ] as const) {
      const body = whatHappensNextBody(standing);
      expect(body, standing).toContain("won't run as an ad yet");
      expect(body, standing).toContain("HighLevel");
      expect(body, standing).toContain("Meta");
    }
  });
});
