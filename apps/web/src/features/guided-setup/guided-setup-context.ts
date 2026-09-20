"use client";

import { createContext, useContext } from "react";

import type { SetupCampaignResult } from "./model/campaign-result.js";
import type { GuidedSetupProgress } from "./model/progress.js";
import type { SetupProfile } from "./model/profile.js";

/**
 * What the campaign create screen hands back when the checks have run.
 *
 * It is `SetupCampaignResult` and not a shape of its own, because step 5 renders either this or
 * the server's reading of the same campaign and two shapes would be two ways for the same step to
 * be wrong. The create screen may pass findings that also carry a severity and a rule code; the
 * panel reads neither.
 */
export type SavedCampaignReport = SetupCampaignResult;

/**
 * PRD-006c D5. What a step, the shell, and the campaign screens can ask of the guided setup.
 *
 * The context is deliberately small. It carries the state the walkthrough owns and the four verbs
 * that change it, and nothing else: no DOM handle, no router, no fetch. A step component that
 * wanted more than this would be a step doing the provider's job.
 *
 * `reportCampaignSaved` is how the campaign draft builder, which lives on its own page and knows
 * nothing about the walkthrough, tells the walkthrough that step 4 is finished. It is a callback
 * rather than a shared store because the builder is already a child of the provider: passing the
 * fact up the tree it is already in beats inventing a second place for it to live.
 */
export interface GuidedSetupContextValue {
  readonly enabled: boolean;
  readonly open: boolean;
  readonly progress: GuidedSetupProgress;
  readonly profile: SetupProfile | undefined;
  readonly canApprove: boolean;
  readonly showFinishChip: boolean;
  /**
   * True from the moment "Not now" is pressed until the new position has been saved. PRD-006d's
   * F-23: the dismissal is a write, and the next page load reads it back, so the panel stays open
   * and the control stays disabled until the write has landed.
   */
  readonly dismissPending: boolean;
  goToStep(step: number): void;
  /** Answers whether the write landed, so the step that asked can stay put when it did not. */
  saveProfile(profile: SetupProfile): Promise<boolean>;
  dismissSetup(): void;
  resumeSetup(): void;
  restartSetup(): void;
  completeSetup(): void;
  reportCampaignSaved(report: SavedCampaignReport): void;
}

export const GuidedSetupContext = createContext<GuidedSetupContextValue | undefined>(undefined);

/**
 * Outside the provider this answers `undefined` rather than raising, because the draft builder and
 * the campaign screens render in synthetic mode too, where there is no walkthrough to talk to.
 */
export function useGuidedSetup(): GuidedSetupContextValue | undefined {
  return useContext(GuidedSetupContext);
}
