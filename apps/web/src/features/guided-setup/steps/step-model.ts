import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import { GUIDED_SETUP_ANCHORS, type GuidedSetupAnchorId } from "../anchor-registry.js";

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
