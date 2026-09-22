import { z } from "zod";

import { GUIDED_SETUP_TOTAL_STEPS } from "../../../copy/guided-setup-messages.js";

/**
 * PRD-006c D4 and D5. The `guided_setup.v1` preference value and the pure transitions over it.
 *
 * Every transition here is a function from one progress value to the next. Nothing in this module
 * reads a clock, a request, or the DOM: the caller passes the instant, so the seven-day chip window
 * can be proven with a fixed clock rather than by waiting a week. The provider writes the result
 * through `POST /api/setup/progress`, and the route validates it again with the same schema, so a
 * transition the browser invents that this module cannot produce is refused at the boundary.
 */

export const GUIDED_SETUP_PREFERENCE_KEY = "guided_setup.v1";

/** D5. How long the "Finish setup" chip survives a dismissal. Fixed, not configurable. */
export const FINISH_SETUP_CHIP_DAYS = 7;
const MILLISECONDS_PER_DAY = 86_400_000;

export const GUIDED_SETUP_STATUSES = Object.freeze([
  "not_started",
  "in_progress",
  "dismissed",
  "completed",
] as const);

export type GuidedSetupStatus = (typeof GUIDED_SETUP_STATUSES)[number];

export const GuidedSetupProgressSchema = z
  .object({
    status: z.enum(GUIDED_SETUP_STATUSES),
    currentStep: z.number().int().min(1).max(GUIDED_SETUP_TOTAL_STEPS),
    completedSteps: z
      .array(z.number().int().min(1).max(GUIDED_SETUP_TOTAL_STEPS))
      .max(GUIDED_SETUP_TOTAL_STEPS),
    campaignRef: z.string().min(8).max(128).optional(),
    dismissedAt: z.iso.datetime().optional(),
    completedAt: z.iso.datetime().optional(),
    restartedCount: z.number().int().min(0).max(1000),
  })
  .strict();

export type GuidedSetupProgress = z.infer<typeof GuidedSetupProgressSchema>;

/**
 * The value a user who has never signed in has. It is a factory rather than a constant because
 * `completedSteps` is a mutable array on the inferred type, and a shared array would let one
 * caller's copy leak into another's.
 */
export function initialGuidedSetupProgress(): GuidedSetupProgress {
  return { status: "not_started", currentStep: 1, completedSteps: [], restartedCount: 0 };
}

/**
 * A stored value that no longer parses is treated as absent rather than as a reason to fail the
 * page. The user loses their place in the walkthrough, which is recoverable; a workspace that will
 * not render is not.
 */
export function parseStoredProgress(value: unknown): GuidedSetupProgress {
  const parsed = GuidedSetupProgressSchema.safeParse(value);
  return parsed.success ? parsed.data : initialGuidedSetupProgress();
}

/**
 * Everything between where the person is and where they are going becomes complete.
 *
 * For every ordinary Continue that is exactly one step, which is what this used to say. D5's
 * approver is the case that needed more: somebody who can approve and whose colleague has already
 * created the campaign goes from step 3 straight to step 5, and step 4 is genuinely done, by the
 * creator. Crediting only `step - 1` left step 3 showing as unfinished in the panel's own progress
 * track, on a step the person had just pressed Continue on.
 */
function withStep(progress: GuidedSetupProgress, step: number): GuidedSetupProgress {
  const gained: number[] = [];
  for (
    let position = Math.min(progress.currentStep, step - 1);
    position <= step - 1;
    position += 1
  ) {
    if (position >= 1) gained.push(position);
  }
  const completed = new Set([...progress.completedSteps, ...gained]);
  return {
    ...progress,
    status: "in_progress",
    currentStep: step,
    completedSteps: [...completed].sort((left, right) => left - right),
  };
}

/** D5. "Let's go" and every "Continue": the named step becomes current and the one before it done. */
export function advanceTo(progress: GuidedSetupProgress, step: number): GuidedSetupProgress {
  const bounded = Math.min(Math.max(step, 1), GUIDED_SETUP_TOTAL_STEPS);
  return withStep(progress, bounded);
}

/** The walkthrough opens for the first time. Step 1 is current and nothing is complete yet. */
export function begin(progress: GuidedSetupProgress): GuidedSetupProgress {
  return { ...progress, status: "in_progress", currentStep: Math.max(progress.currentStep, 1) };
}

/** D5. "Not now" and Escape. The step the user was on stays current, so resume lands there. */
export function dismiss(progress: GuidedSetupProgress, at: Date): GuidedSetupProgress {
  return { ...progress, status: "dismissed", dismissedAt: at.toISOString() };
}

/** D5. The chip and the help menu both reopen at `currentStep` without changing anything else. */
export function resume(progress: GuidedSetupProgress): GuidedSetupProgress {
  const { dismissedAt: _dismissedAt, ...rest } = progress;
  return { ...rest, status: "in_progress" };
}

/** D5. "Show me around again". The profile is untouched; only the journey restarts. */
export function restart(progress: GuidedSetupProgress): GuidedSetupProgress {
  const { dismissedAt: _dismissedAt, completedAt: _completedAt, ...rest } = progress;
  return {
    ...rest,
    status: "in_progress",
    currentStep: 1,
    completedSteps: [],
    restartedCount: progress.restartedCount + 1,
  };
}

/** D5. Step 7's "Done". A completed setup never auto-starts again. */
export function complete(progress: GuidedSetupProgress, at: Date): GuidedSetupProgress {
  return {
    ...progress,
    status: "completed",
    currentStep: GUIDED_SETUP_TOTAL_STEPS,
    completedSteps: Array.from({ length: GUIDED_SETUP_TOTAL_STEPS }, (_unused, index) => index + 1),
    completedAt: at.toISOString(),
  };
}

/** D5. The campaign the setup created, so steps 5 through 7 reopen it after a resume. */
export function withCampaign(
  progress: GuidedSetupProgress,
  campaignRef: string,
): GuidedSetupProgress {
  return { ...progress, campaignRef };
}

/**
 * D5. Auto-start happens while the setup is `not_started` or `in_progress`, on every authenticated
 * render. `dismissed` and `completed` are the two states that keep the sheet shut.
 */
export function shouldAutoStart(progress: GuidedSetupProgress): boolean {
  return progress.status === "not_started" || progress.status === "in_progress";
}

/**
 * D5. The chip is the way back for seven days after a dismissal; after that the help menu is.
 * A setup that was never dismissed, or that is finished, shows no chip.
 *
 * There is no lower bound on the elapsed time, and that is deliberate. The instant the caller
 * passes is the one the page was rendered on, and a dismissal happens after the render, so a
 * freshly dismissed setup reads as dismissed slightly in the future. Refusing that would hide the
 * chip in exactly the case it exists for. Anything that has not yet aged seven days is inside the
 * window, whichever side of the render it landed on.
 */
export function shouldShowFinishChip(progress: GuidedSetupProgress, now: Date): boolean {
  if (progress.status !== "dismissed" || progress.dismissedAt === undefined) return false;
  const dismissedAt = Date.parse(progress.dismissedAt);
  if (Number.isNaN(dismissedAt)) return false;
  return now.getTime() - dismissedAt < FINISH_SETUP_CHIP_DAYS * MILLISECONDS_PER_DAY;
}

export function isStepComplete(progress: GuidedSetupProgress, step: number): boolean {
  return progress.completedSteps.includes(step);
}
