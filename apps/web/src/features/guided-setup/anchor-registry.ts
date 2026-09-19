/**
 * PRD-006c D2. The one place an anchor id is written down.
 *
 * The attribute stays `data-tour` because three anchors already used it before this feature
 * existed. Introducing a second convention would leave two, and a screen would eventually carry
 * the wrong one. Every anchored element in `apps/web/src` takes its id from `GUIDED_SETUP_ANCHORS`
 * or from `onboardingChecklistAnchor`, and two tests hold that line:
 *
 * - `anchor-registry.unit.test.ts` scans the source for a `data-tour="..."` string literal and
 *   fails if one exists outside this file. A literal is how a tour silently detaches from a screen.
 * - `anchor-registry.integration.test.tsx` renders every screen this registry names and asserts
 *   each `required` anchor is present exactly once.
 *
 * `required` means the guided setup cannot complete without it: the step that points at it has
 * nowhere to point. An optional anchor is one a branch may or may not reach, such as the hand-off
 * link, which only a user who cannot approve ever sees.
 */

export type GuidedSetupAnchorId = (typeof GUIDED_SETUP_ANCHORS)[keyof typeof GUIDED_SETUP_ANCHORS];

export type GuidedSetupAnchorRecord = Readonly<{
  /** The route the anchored element renders on. The provider navigates here before pointing. */
  route: string;
  /** What the element is, in the words the step copy uses for it. */
  description: string;
  /** Whether a screen that omits this anchor is a defect. */
  required: boolean;
}>;

export const GUIDED_SETUP_ANCHORS = Object.freeze({
  setupWelcome: "setup.welcome",
  setupDetailsForm: "setup.details.form",
  setupRealtorForm: "setup.realtor.form",
  campaignCreateAddress: "campaign.create.address",
  campaignCreateDates: "campaign.create.dates",
  campaignCreateRealtor: "campaign.create.realtor",
  campaignCreatePermissions: "campaign.create.permissions",
  campaignCreateHeadline: "campaign.create.headline",
  campaignCreateBudget: "campaign.create.budget",
  campaignCreateSubmit: "campaign.create.submit",
  campaignCheckResult: "campaign.check.result",
  campaignCheckFindings: "campaign.check.findings",
  campaignApproveControl: "campaign.approve.control",
  campaignHandoffLink: "campaign.handoff.link",
  setupDone: "setup.done",
  shellHelpMenu: "shell.help.menu",
  shellFinishSetupChip: "shell.finish-setup.chip",
  onboardingGetConnected: "onboarding-get-connected",
  onboardingLaunchReadiness: "onboarding-launch-readiness",
} as const);

/**
 * The onboarding checklist renders one anchor per item, so its ids are a family rather than a
 * constant. The prefix lives here with every other id, and the source scan allows the template
 * because it is built from this constant.
 */
export const ONBOARDING_CHECKLIST_ANCHOR_PREFIX = "onboarding-";

export function onboardingChecklistAnchor(itemId: string): string {
  return `${ONBOARDING_CHECKLIST_ANCHOR_PREFIX}${itemId}`;
}

const OVERVIEW_ROUTE = "/overview";
const CAMPAIGN_CREATE_ROUTE = "/marketing/campaigns/new";
const CAMPAIGN_DETAIL_ROUTE = "/marketing/campaigns";
const ONBOARDING_ROUTE = "/onboarding";
/** The shell renders on every authenticated route, so its anchors name no single one. */
export const SHELL_SURFACE = "*";
/**
 * Three anchors mark the guided setup's own form and its closing panel, so the element lives in
 * the step panel rather than on a page. The panel is one of the places an anchor can be, which is
 * why this field says where the element renders rather than naming a URL.
 */
export const GUIDED_SETUP_PANEL_SURFACE = "guided-setup-panel";

export const GUIDED_SETUP_ANCHOR_REGISTRY: Readonly<
  Record<GuidedSetupAnchorId, GuidedSetupAnchorRecord>
> = Object.freeze({
  [GUIDED_SETUP_ANCHORS.setupWelcome]: Object.freeze({
    route: OVERVIEW_ROUTE,
    description: "The quick actions on your overview",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.setupDetailsForm]: Object.freeze({
    route: GUIDED_SETUP_PANEL_SURFACE,
    description: "Your details",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.setupRealtorForm]: Object.freeze({
    route: GUIDED_SETUP_PANEL_SURFACE,
    description: "Your Realtor partner",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignCreateAddress]: Object.freeze({
    route: CAMPAIGN_CREATE_ROUTE,
    description: "The property address and state",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignCreateDates]: Object.freeze({
    route: CAMPAIGN_CREATE_ROUTE,
    description: "When the open house starts and ends",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignCreateRealtor]: Object.freeze({
    route: CAMPAIGN_CREATE_ROUTE,
    description: "The Realtor's name",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignCreatePermissions]: Object.freeze({
    route: CAMPAIGN_CREATE_ROUTE,
    description: "The two permission boxes",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignCreateHeadline]: Object.freeze({
    route: CAMPAIGN_CREATE_ROUTE,
    description: "What the ad says",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignCreateBudget]: Object.freeze({
    route: CAMPAIGN_CREATE_ROUTE,
    description: "Budget and area",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignCreateSubmit]: Object.freeze({
    route: CAMPAIGN_CREATE_ROUTE,
    description: "Save and run the checks",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignCheckResult]: Object.freeze({
    route: CAMPAIGN_DETAIL_ROUTE,
    description: "The campaign check result",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignCheckFindings]: Object.freeze({
    route: CAMPAIGN_DETAIL_ROUTE,
    description: "What the checks found",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignApproveControl]: Object.freeze({
    route: CAMPAIGN_DETAIL_ROUTE,
    description: "Approve this version",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.campaignHandoffLink]: Object.freeze({
    route: CAMPAIGN_DETAIL_ROUTE,
    description: "Copy the link for an approver",
    // Only a user who cannot approve reaches this branch, so a screen that
    // renders the approve control instead is correct, not incomplete.
    required: false,
  }),
  [GUIDED_SETUP_ANCHORS.setupDone]: Object.freeze({
    route: GUIDED_SETUP_PANEL_SURFACE,
    description: "What happens next",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.shellHelpMenu]: Object.freeze({
    route: SHELL_SURFACE,
    description: "The help menu in the workspace header",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.shellFinishSetupChip]: Object.freeze({
    route: SHELL_SURFACE,
    // Present only while a dismissed setup is inside its seven-day window.
    description: "Finish setup",
    required: false,
  }),
  [GUIDED_SETUP_ANCHORS.onboardingGetConnected]: Object.freeze({
    route: ONBOARDING_ROUTE,
    description: "Connect your accounts",
    required: true,
  }),
  [GUIDED_SETUP_ANCHORS.onboardingLaunchReadiness]: Object.freeze({
    route: ONBOARDING_ROUTE,
    description: "Ready to launch",
    required: true,
  }),
});

export function guidedSetupAnchorIds(): readonly GuidedSetupAnchorId[] {
  return Object.keys(GUIDED_SETUP_ANCHOR_REGISTRY) as readonly GuidedSetupAnchorId[];
}

export function requiredAnchorsForRoute(route: string): readonly GuidedSetupAnchorId[] {
  return guidedSetupAnchorIds().filter((anchor) => {
    const record = GUIDED_SETUP_ANCHOR_REGISTRY[anchor];
    return record.required && record.route === route;
  });
}

/** The attribute selector for one anchor, used by the step panel and by every test. */
export function anchorSelector(anchor: GuidedSetupAnchorId): string {
  return `[data-tour="${anchor}"]`;
}
