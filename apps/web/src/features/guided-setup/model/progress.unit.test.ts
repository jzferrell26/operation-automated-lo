import { describe, expect, it } from "vitest";

import {
  FINISH_SETUP_CHIP_DAYS,
  GuidedSetupProgressSchema,
  advanceTo,
  begin,
  complete,
  dismiss,
  initialGuidedSetupProgress,
  isStepComplete,
  parseStoredProgress,
  restart,
  resume,
  shouldAutoStart,
  shouldShowFinishChip,
  withCampaign,
} from "./progress.js";

/**
 * PRD-006c D5. The transitions, with the clock supplied rather than read.
 *
 * The seven-day chip window is the reason this module takes an instant as an argument: a test that
 * had to wait a week would not exist, and a test that mocked `Date.now` would be proving the mock.
 */

const NOW = new Date("2026-09-19T12:00:00.000Z");
const DAY = 86_400_000;

describe("guided setup progress", () => {
  it("starts not started, at step one, with nothing complete", () => {
    const progress = initialGuidedSetupProgress();
    expect(progress).toEqual({
      status: "not_started",
      currentStep: 1,
      completedSteps: [],
      restartedCount: 0,
    });
    expect(shouldAutoStart(progress)).toBe(true);
  });

  it("gives every caller its own completed-steps array", () => {
    const first = initialGuidedSetupProgress();
    first.completedSteps.push(1);
    expect(initialGuidedSetupProgress().completedSteps).toEqual([]);
  });

  it("marks the step before the new one complete, in order, without duplicates", () => {
    let progress = begin(initialGuidedSetupProgress());
    progress = advanceTo(progress, 2);
    progress = advanceTo(progress, 3);
    progress = advanceTo(progress, 2);
    progress = advanceTo(progress, 3);
    expect(progress.completedSteps).toEqual([1, 2]);
    expect(progress.currentStep).toBe(3);
    expect(isStepComplete(progress, 1)).toBe(true);
    expect(isStepComplete(progress, 3)).toBe(false);
  });

  it("never advances past the seventh step or before the first", () => {
    const progress = begin(initialGuidedSetupProgress());
    expect(advanceTo(progress, 99).currentStep).toBe(7);
    expect(advanceTo(progress, 0).currentStep).toBe(1);
  });

  it("keeps the current step when the user dismisses, so resume lands there", () => {
    const dismissed = dismiss(advanceTo(begin(initialGuidedSetupProgress()), 4), NOW);
    expect(dismissed.status).toBe("dismissed");
    expect(dismissed.currentStep).toBe(4);
    expect(dismissed.dismissedAt).toBe(NOW.toISOString());
    expect(shouldAutoStart(dismissed)).toBe(false);

    const resumed = resume(dismissed);
    expect(resumed.status).toBe("in_progress");
    expect(resumed.currentStep).toBe(4);
    expect(resumed.dismissedAt).toBeUndefined();
  });

  it("shows the chip inside the seven-day window and not after it", () => {
    const dismissed = dismiss(begin(initialGuidedSetupProgress()), NOW);
    expect(shouldShowFinishChip(dismissed, NOW)).toBe(true);
    expect(
      shouldShowFinishChip(dismissed, new Date(NOW.getTime() + FINISH_SETUP_CHIP_DAYS * DAY - 1)),
    ).toBe(true);
    expect(
      shouldShowFinishChip(dismissed, new Date(NOW.getTime() + FINISH_SETUP_CHIP_DAYS * DAY)),
    ).toBe(false);
    // A dismissal that has not yet aged is inside the window, whichever side of the caller's
    // clock it landed on: the page was rendered a moment before the user pressed "Not now".
    expect(shouldShowFinishChip(dismissed, new Date(NOW.getTime() - 1))).toBe(true);
  });

  it("shows no chip for a setup that was never dismissed or is finished", () => {
    expect(shouldShowFinishChip(initialGuidedSetupProgress(), NOW)).toBe(false);
    expect(shouldShowFinishChip(complete(initialGuidedSetupProgress(), NOW), NOW)).toBe(false);
  });

  it("restarts at step one, keeps the campaign, and counts the restart", () => {
    const finished = complete(
      withCampaign(begin(initialGuidedSetupProgress()), "campaign_abc123de"),
      NOW,
    );
    const again = restart(finished);
    expect(again.currentStep).toBe(1);
    expect(again.completedSteps).toEqual([]);
    expect(again.restartedCount).toBe(1);
    expect(again.campaignRef).toBe("campaign_abc123de");
    expect(again.completedAt).toBeUndefined();
    expect(restart(again).restartedCount).toBe(2);
  });

  it("never auto-starts once it is complete", () => {
    const finished = complete(begin(initialGuidedSetupProgress()), NOW);
    expect(finished.status).toBe("completed");
    expect(finished.completedSteps).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(finished.completedAt).toBe(NOW.toISOString());
    expect(shouldAutoStart(finished)).toBe(false);
  });

  it("treats a stored value it cannot read as a setup that has not started", () => {
    expect(parseStoredProgress({ status: "somewhere_else" })).toEqual(initialGuidedSetupProgress());
    expect(parseStoredProgress(null)).toEqual(initialGuidedSetupProgress());
    expect(parseStoredProgress({ ...initialGuidedSetupProgress(), currentStep: 9 })).toEqual(
      initialGuidedSetupProgress(),
    );
  });

  it("refuses a stored value carrying a field the schema does not declare", () => {
    const parsed = GuidedSetupProgressSchema.safeParse({
      ...initialGuidedSetupProgress(),
      locationId: "00000000-0000-4000-8000-000000000801",
    });
    expect(parsed.success).toBe(false);
  });
});
