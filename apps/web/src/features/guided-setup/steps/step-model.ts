import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import { GUIDED_SETUP_ANCHORS, type GuidedSetupAnchorId } from "../anchor-registry.js";
import type { CampaignStanding } from "../model/campaign-result.js";

/**
 * PRD-006c D3. The seven steps as data: their position, their title, the element they point at,
 * the route they need the user to be on, and the time a first-time loan officer should need.
 *
 * Copy is imported from `apps/web/src/copy/guided-setup-messages.ts`, the module PRD-006b landed.
 * No string in this feature is written twice: a step that wanted different words would be a step
 * the copy contract has not seen.
 *
 * The budgets are the contract the timed browser run asserts against. A step over its budget is a
 * defect in the step, not a number to write down.
 */

export const OVERVIEW_ROUTE = "/overview";
export const CAMPAIGN_CREATE_ROUTE = "/marketing/campaigns/new";

/** The step's anchored element is inside the panel, so the panel does not point anywhere. */
export const PANEL_ANCHORED = "panel" as const;

export type StepRoute = typeof OVERVIEW_ROUTE | typeof CAMPAIGN_CREATE_ROUTE | "campaign" | null;

export type GuidedSetupStepDefinition = Readonly<{
  position: number;
  title: string;
  /** The element the panel points at, or `PANEL_ANCHORED` when the step's own form is the target. */
  anchor: GuidedSetupAnchorId | typeof PANEL_ANCHORED;
  /** Where the user must be for the step to make sense. `null` means anywhere. */
  route: StepRoute;
  /** D3's per-step budget, in seconds. */
  budgetSeconds: number;
}>;

export const GUIDED_SETUP_STEP_DEFINITIONS: readonly GuidedSetupStepDefinition[] = Object.freeze([
  Object.freeze({
    position: GUIDED_SETUP_STEPS.welcome.position,
    title: GUIDED_SETUP_STEPS.welcome.title,
    anchor: GUIDED_SETUP_ANCHORS.setupWelcome,
    route: OVERVIEW_ROUTE,
    budgetSeconds: 10,
  }),
  Object.freeze({
    position: GUIDED_SETUP_STEPS.yourDetails.position,
    title: GUIDED_SETUP_STEPS.yourDetails.title,
    anchor: PANEL_ANCHORED,
    route: OVERVIEW_ROUTE,
    budgetSeconds: 40,
  }),
  Object.freeze({
    position: GUIDED_SETUP_STEPS.realtorPartner.position,
    title: GUIDED_SETUP_STEPS.realtorPartner.title,
    anchor: PANEL_ANCHORED,
    route: OVERVIEW_ROUTE,
    budgetSeconds: 30,
  }),
  Object.freeze({
    position: GUIDED_SETUP_STEPS.createCampaign.position,
    title: GUIDED_SETUP_STEPS.createCampaign.title,
    anchor: GUIDED_SETUP_ANCHORS.campaignCreateAddress,
    route: CAMPAIGN_CREATE_ROUTE,
    budgetSeconds: 90,
  }),
  Object.freeze({
    position: GUIDED_SETUP_STEPS.readTheResult.position,
    title: GUIDED_SETUP_STEPS.readTheResult.title,
    anchor: GUIDED_SETUP_ANCHORS.campaignCheckResult,
    route: "campaign",
    budgetSeconds: 20,
  }),
  Object.freeze({
    position: GUIDED_SETUP_STEPS.approveOrHandOff.position,
    title: GUIDED_SETUP_STEPS.approveOrHandOff.title,
    anchor: GUIDED_SETUP_ANCHORS.campaignApproveControl,
    route: "campaign",
    budgetSeconds: 20,
  }),
  Object.freeze({
    position: GUIDED_SETUP_STEPS.whatHappensNext.position,
    title: GUIDED_SETUP_STEPS.whatHappensNext.title,
    anchor: PANEL_ANCHORED,
    route: null,
    budgetSeconds: 10,
  }),
]);

/** D3's total: the sum of the seven steps plus the 30 seconds sign-up takes. */
export const SIGN_UP_BUDGET_SECONDS = 30;
export const GUIDED_SETUP_TOTAL_BUDGET_SECONDS =
  SIGN_UP_BUDGET_SECONDS +
  GUIDED_SETUP_STEP_DEFINITIONS.reduce((total, step) => total + step.budgetSeconds, 0);
/** D3's ceiling: the owner's five minutes, from account creation to a saved first campaign. */
export const GUIDED_SETUP_CEILING_SECONDS = 300;

/** What step 6 shows: the panel's title and words, and the element it points at. */
export type ApproveOrHandOffStep = Readonly<{
  anchor: GuidedSetupAnchorId;
  body: string;
  title: string;
}>;

/**
 * PRD-006c D3 step 6 and PRD-008b 008B-AC-010 and 008B-AC-011. Which answer step 6 gives.
 *
 * A campaign nobody has decided on, and one the walkthrough could not read, get the two answers
 * this step has always had: somebody who can approve is pointed at the approve control, and
 * everybody else at the control that copies the link for an approver. They are the only campaigns
 * either control is for. Every other standing gets one answer for everybody, because what is true
 * of the campaign does not depend on who is looking:
 *
 * - approved or sent back: what was recorded, pointed at the card that says it, which is on every
 *   campaign page and is why the approve control's anchor is the one used;
 * - needs changes: that the version cannot be approved yet and what to do about it, pointed at what
 *   the checks found. The copy-link card is not on that page either, and the approve control is
 *   blocked, so neither is somewhere this step can honestly point.
 */
export function approveOrHandOffStep(
  input: Readonly<{ canApprove: boolean; standing: CampaignStanding }>,
): ApproveOrHandOffStep {
  const words = GUIDED_SETUP_STEPS.approveOrHandOff;
  switch (input.standing) {
    case "approved":
      return {
        anchor: GUIDED_SETUP_ANCHORS.campaignApproveControl,
        body: words.approvedBody,
        title: words.approvedTitle,
      };
    case "sent_back":
      return {
        anchor: GUIDED_SETUP_ANCHORS.campaignApproveControl,
        body: words.sentBackBody,
        title: words.sentBackTitle,
      };
    case "needs_changes":
      return {
        anchor: GUIDED_SETUP_ANCHORS.campaignCheckFindings,
        body: words.needsChangesBody,
        title: words.needsChangesTitle,
      };
    case "waiting":
    case "unknown":
      return input.canApprove
        ? {
            anchor: GUIDED_SETUP_ANCHORS.campaignApproveControl,
            body: words.approveBody,
            title: words.title,
          }
        : {
            anchor: GUIDED_SETUP_ANCHORS.campaignHandoffLink,
            body: words.handOffBody,
            title: words.title,
          };
  }
}

/**
 * PRD-008b 008B-AC-011. What step 5 says about the campaign.
 *
 * "Ready for approval" is the answer for a version waiting for somebody to decide it, and for
 * nothing else. A version whose checks need changes is not ready, and one that was approved, or sent
 * back, is past ready.
 */
export function readTheResultBody(standing: CampaignStanding): string {
  const words = GUIDED_SETUP_STEPS.readTheResult;
  switch (standing) {
    case "unknown":
      return words.unknownBody;
    case "needs_changes":
      return words.needsChangesBody;
    case "waiting":
      return words.readyBody;
    case "approved":
      return words.approvedBody;
    case "sent_back":
      return words.sentBackBody;
  }
}

/**
 * PRD-006c 006C-AC-018 and PRD-008b 008B-AC-011. What step 7 says.
 *
 * The first sentence is about the campaign and follows where it stands. The last is the same for
 * every campaign, and it is the one the final step is required to carry: the campaign will not run
 * as an ad until HighLevel and Meta are connected. A campaign the walkthrough could not read gets
 * the sentence that says only that, because it says nothing about a state it does not know.
 */
export function whatHappensNextBody(standing: CampaignStanding): string {
  const words = GUIDED_SETUP_STEPS.whatHappensNext;
  switch (standing) {
    case "unknown":
      return words.body;
    case "waiting":
      return `${words.waitingLead} ${words.tail}`;
    case "needs_changes":
      return `${words.needsChangesLead} ${words.tail}`;
    case "approved":
      return `${words.approvedLead} ${words.tail}`;
    case "sent_back":
      return `${words.sentBackLead} ${words.tail}`;
  }
}

export function stepDefinition(position: number): GuidedSetupStepDefinition {
  const found = GUIDED_SETUP_STEP_DEFINITIONS.find((step) => step.position === position);
  if (found === undefined) {
    throw new Error(`No guided setup step at position ${String(position)}`);
  }
  return found;
}

/**
 * The ordered fields step 4 points at, in the order a loan officer fills them. The step's highlight
 * moves along this list, so the panel is never pointing at a field the user has already finished.
 */
export const CAMPAIGN_FIELD_SEQUENCE: readonly GuidedSetupAnchorId[] = Object.freeze([
  GUIDED_SETUP_ANCHORS.campaignCreateAddress,
  GUIDED_SETUP_ANCHORS.campaignCreateDates,
  GUIDED_SETUP_ANCHORS.campaignCreateRealtor,
  GUIDED_SETUP_ANCHORS.campaignCreatePermissions,
  GUIDED_SETUP_ANCHORS.campaignCreateHeadline,
  GUIDED_SETUP_ANCHORS.campaignCreateBudget,
  GUIDED_SETUP_ANCHORS.campaignCreateSubmit,
]);

/** What each field in that sequence is called, in the words the create screen uses for it. */
export const CAMPAIGN_FIELD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  [GUIDED_SETUP_ANCHORS.campaignCreateAddress]: "The address and the state",
  [GUIDED_SETUP_ANCHORS.campaignCreateDates]: "When the open house starts and ends",
  [GUIDED_SETUP_ANCHORS.campaignCreateRealtor]: "Your Realtor's name",
  [GUIDED_SETUP_ANCHORS.campaignCreatePermissions]: "The two permission boxes",
  [GUIDED_SETUP_ANCHORS.campaignCreateHeadline]: "What the ad says",
  [GUIDED_SETUP_ANCHORS.campaignCreateBudget]: "Budget and area",
  [GUIDED_SETUP_ANCHORS.campaignCreateSubmit]: "Save and run the checks",
});
