import type { CampaignNextActionId, CampaignStanding } from "@oalo/application";
import type { ApplicationRole, CampaignState } from "@oalo/contracts";

/**
 * The words the product shows a loan officer, in one place.
 *
 * Governed by `library/knowledge/private/standards/user-language-contract.md` (PRD-006b D1 to D4
 * and D8). Every string here is read by a mortgage loan officer who has never seen this codebase,
 * so none of them may carry an internal noun, a reference, a hash, or a code. The contract's
 * forbidden-vocabulary guard scans this file like any other user-facing source.
 *
 * The not-connected strings are shared constants rather than literals in screens on purpose: they
 * are a compliance commitment (PRD-004 RGL-002), and a commitment that lives in nine components
 * drifts. Their meaning is fixed; only their wording moved when PRD-006b landed.
 *
 * PRD-009f D-8 and 009F-AC-008: a sentence about the ads names the two accounts the ads need,
 * HighLevel and Meta, and no other. Billing belongs to Settings, under Account, where "Plan and
 * usage" says what it says; no connection sentence names a payment provider. The shell-wide banner
 * these strings once fed is gone (PRD-009a), so its accessible name went with it.
 */

/** One headline for a not-connected region, used by the shell and by the not-connected screen. */
export const NOT_CONNECTED_HEADLINE = "Not connected yet";

/** The not-connected disclosure. Names both accounts and both things that cannot happen without them. */
export const NOT_CONNECTED_DISCLOSURE =
  "HighLevel and Meta aren't connected to this workspace yet, so nothing here is live and nothing can be published.";

/** One region's state, where the region names itself and the detail states the truth. */
export const NOT_CONNECTED_DETAIL = "Not connected yet.";

/** Where a region's value would have come from. */
export const NOT_CONNECTED_SOURCE = "HighLevel and Meta aren't connected.";

/**
 * A metric's source line: why there is no figure, and what the figure needs. Amended 2026-10-02 by
 * the PRD-009 writing review pass 2 (MTK-008, W-28): connecting is a necessary condition, not a
 * promise, and no screen in PRD-009 can connect either account, so the line no longer asks the
 * reader to.
 */
export const NOT_LIVE_METRIC_SOURCE =
  "Not live yet. Spend and leads can't show here until Meta and HighLevel are connected.";

/** A metric's freshness line when there is no reading to be fresh or stale about. */
export const NOT_LIVE_YET = "Not live yet";

/**
 * What is true about connecting, and that nothing changes meanwhile. Amended 2026-10-02 by the
 * PRD-009 writing review pass 2 (MTK-008, W-28): the Connections page, which every "See what's
 * needed" link opens, has no connect control, and PRD-009's non-goal is making the connections
 * work, so a "connect when you're ready" sentence there named an action nobody could take
 * (contract section 2 rule 3: name what the product cannot do yet).
 */
export const NOT_CONNECTED_NEXT_STEP =
  "Connecting HighLevel and Meta isn't available in the app yet. Nothing here changes in the meantime.";

/** A navigation item the user cannot open until an account is connected. */
export const NOT_CONNECTED_NAVIGATION_DETAIL = "Available once your accounts are connected.";

/** A setup step that has nothing to check because nothing is connected. */
export const NOT_CONNECTED_SETUP_REASON =
  "Nothing to check yet. This step waits for a connected account.";

/** Who finishes that setup step. */
export const NOT_CONNECTED_SETUP_OWNER = "You, once you connect";

/**
 * PRD-009f D1. The page for `/leads`, `/leads/pipeline`, and `/automations`, which no longer exist.
 * It says where the work went, because the one reader it has followed an old link or typed an old
 * address.
 */
export const GONE_PAGE = Object.freeze({
  title: "This page is gone.",
  lead: "Your leads, pipelines and follow-up live in HighLevel.",
  homeLabel: "Go to Home",
});

/** The four access groups, named for what the group means to the user. */
export const ACCESS_GROUP_LABELS = Object.freeze({
  required: "Access this app needs",
  granted: "Access this app confirms after you connect",
  missing: "Access this app tells you about when something is blocked",
  optional: "Optional access",
});

/** Short state words for one access group, so the raw group name never renders. */
export const ACCESS_GROUP_STATE_LABELS = Object.freeze({
  required: "Needed",
  granted: "Confirmed",
  missing: "Missing",
  optional: "Optional",
});

/**
 * Writing review delta check, D-2 (2026-10-03). The same four chips for a workspace where nothing is
 * connected. "Confirmed" and "Missing" claim a result of a check, and on that page every card under
 * them says "Nothing checked yet.", so a chip said more than the card beneath it. These say what the
 * group is for, never what was found: the access the app needs, the access it will confirm once
 * something can be connected, the access it will tell you about if something is blocked, and the
 * optional access. The demo workspace, whose groups hold sample grants, keeps the words above.
 */
export const ACCESS_GROUP_NOT_CONNECTED_STATE_LABELS = Object.freeze({
  required: "Needed",
  granted: "Not confirmed yet",
  missing: "When blocked",
  optional: "Optional",
});

export const ACCESS_GROUP_DESCRIPTION =
  "You haven't connected HighLevel yet, so there's nothing to confirm here.";
export const ACCESS_NOTHING_CHECKED = "Nothing checked yet.";
/**
 * Writing review closing check, N-2. "What it affects", said while nothing can be connected. It used
 * to read "No effect until you connect.", one line above "Connecting HighLevel and Meta isn't
 * available in the app yet", so the first read as a promise that connecting would have an effect.
 * PRD-009g D2 (009G-AC-009): it is said on every capability card, so it carries no connection
 * sentence; the page's notice already says "Nothing is connected from this page", once.
 */
export const ACCESS_NO_EFFECT_YET = "No effect yet.";

export const BRAND_PROFILE_SOURCE = "You haven't saved your brand details yet.";
export const BRAND_FIELD_VALUE = "Not saved yet";
export const BRAND_FIELD_SOURCE = "Not confirmed yet";
export const BRAND_MISSING_REASON = "You haven't confirmed this yet.";
export const BRAND_MISSING_NEXT_STEP = "Add it when you're ready.";
export const BRAND_SUGGESTION_VALUE = "No suggestion yet. Add a sample of your marketing first.";
export const BRAND_SUGGESTION_CONFIDENCE = "No suggestion yet";

/** One brand sample slot with nothing in it. The slot number keeps the list countable. */
export function brandSampleSlotLabel(position: number): string {
  return `Sample ${position}: nothing added yet`;
}

/** Plain labels for the brand field and suggestion states, so no raw token renders. */
export const BRAND_FIELD_STATE_LABELS: Readonly<Record<"confirmed" | "missing", string>> =
  Object.freeze({
    confirmed: "Confirmed",
    missing: "Not added yet",
  });

export const BRAND_SUGGESTION_STATE_LABELS: Readonly<Record<"needs_confirmation", string>> =
  Object.freeze({
    needs_confirmation: "Waiting for you",
  });

/**
 * What the product calls each role to the person who holds it (contract section 4).
 *
 * This is the only place a role becomes words. Anything that renders a role renders through here,
 * so `campaign_approver` never reaches a screen.
 */
export const ROLE_LABELS: Readonly<Record<ApplicationRole, string>> = Object.freeze({
  location_admin: "Workspace owner",
  campaign_creator: "Campaign creator",
  campaign_approver: "Approver",
  campaign_publisher: "Publisher",
  viewer: "Viewer",
  platform_support: "Support",
});

/** The lowercase form, for the middle of a sentence ("Only an approver can do this"). */
export function roleLabelInSentence(role: ApplicationRole): string {
  const label = ROLE_LABELS[role];
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/**
 * Who approved a campaign. This is a different, narrower set of roles from `ApplicationRole`: an
 * approval carries the authority the approver signed with, which can be the workspace owner's, a
 * lender's, or a Realtor's. They still render through a map, so no token reaches the record.
 */
export type ApprovalActorRole =
  "approver" | "lender_approver" | "location_admin" | "realtor_approver";

export const APPROVAL_ROLE_LABELS: Readonly<Record<ApprovalActorRole, string>> = Object.freeze({
  approver: "an approver",
  lender_approver: "a lender approver",
  location_admin: "the workspace owner",
  realtor_approver: "a Realtor approver",
});

/** Who can approve, said the same way everywhere it is said. */
export const APPROVER_OR_OWNER = "An approver or the workspace owner";
export const CAMPAIGN_CREATOR_PARTY = "The campaign creator";
export const WORKSPACE_OWNER_PARTY = "Your workspace owner";

/** The signed-in shell's account line. It says who is signed in and nothing about connections. */
export const SIGNED_IN_SOURCE = "Signed in with your email.";

/** The shell above the workspace name. */
export const WORKSPACE_EYEBROW = "Your workspace";

/**
 * What the shell calls the person and the workspace when the name read yields nothing.
 *
 * D2 forbids an internal reference in anything a person reads, and the references the session
 * carries are exactly that: they begin with a forbidden prefix and mean nothing to anybody outside
 * the database. D3's replacements are "you" for the person and "your workspace" for the tenant, so
 * a shell with no name says those instead of showing a person their own row identifier. Neither
 * string claims a fact the read failed to establish.
 */
export const SESSION_USER_FALLBACK = "You";
export const SESSION_WORKSPACE_FALLBACK = "Your workspace";

export const SIGNED_OUT_HEADING = "You're signed out";
export const SIGNED_OUT_PROMPT = "Sign in to see your workspace";
export const SIGN_OUT_LABEL = "Sign out";

/**
 * The one collapsed region per screen where a reference, a fingerprint, a rule code, or a support
 * reference may appear, with plain labels (contract section 6).
 */
export const SUPPORT_DETAILS_SUMMARY = "Details for support";
export const SUPPORT_DETAILS_LABELS = Object.freeze({
  versionId: "Version ID",
  contentFingerprint: "Content fingerprint",
  checkFingerprint: "Check fingerprint",
  rule: "Rule",
  supportReference: "Support reference",
});

/**
 * What the support-reference row says when the request carried none.
 *
 * A failure that never reached the server, or one whose answer had no reference on it, still has
 * to show the row: a person who is told to contact support and then finds nothing to quote has
 * been sent away empty-handed. Saying so is the honest version of that row.
 */
export const SUPPORT_REFERENCE_NOT_RECORDED = "Not recorded";

/**
 * What the campaign check ends in. Never "blocked".
 *
 * Two results are the check's own: "Ready for approval" when it passed and a decision is still to
 * be made, and "Needs changes" when it found something to fix. The third is what the heading says
 * once the version is no longer waiting for that decision, because somebody approved it or sent it
 * back: the checks still passed, and "Ready for approval" would be false.
 */
export const CHECK_RESULT_READY = "Ready for approval";
export const CHECK_RESULT_NEEDS_CHANGES = "Needs changes";
export const CHECK_RESULT_PASSED = "Checks passed";

/**
 * A sent-back version stays in `awaiting_approval`, because the approval command records the
 * rejection and sets that state again. These two say what is true of it, and the second is the
 * check card's sentence for it: the checks passed, and the way forward is a new version.
 */
export const CAMPAIGN_SENT_BACK_LABEL = "Sent back for changes";
export const CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION =
  "It was sent back for changes, so it needs a new version before anyone can approve it.";

/**
 * PRD-006d 006D-AC-011. What a field says when a save comes back naming it.
 *
 * The status line above the form already says what happened and what to do
 * ("Look over the fields marked below and try again."), so the field's own job
 * is to be the mark. One short sentence, connected to the control through the
 * field wrapper's `aria-describedby`, so a screen reader meets it on the field
 * rather than having to go looking for it.
 */
export const CAMPAIGN_FIELD_NEEDS_A_LOOK = "This one needs another look.";

/** What a campaign can and cannot do once it is saved and approved. */
export const CAMPAIGN_NOT_AN_AD_YET =
  "This campaign won't run as an ad yet. Launching isn't turned on, and HighLevel and Meta aren't connected.";

/**
 * Where a campaign stands, in the words a loan officer uses for it (contract sections 3 and 4).
 *
 * The three screens that show this used to make the words out of the stored state by taking the
 * underscores out of it, so `preflight_failed` read "Preflight failed" and put a D2 word in front
 * of the person whose campaign it was. A map keyed by `CampaignState` cannot do that: it is
 * exhaustive, so a new state is a typecheck failure until somebody writes the phrase for it, and
 * it is in this file, so the forbidden-vocabulary guard reads every phrase in it.
 *
 * `awaiting_approval` and `preflight_failed` deliberately borrow the two phrases the campaign
 * check already ends in. A campaign whose check passed and whose approval has not happened is the
 * same fact said twice on the same screen, and saying it two different ways would read as two
 * different facts.
 */
export const CAMPAIGN_STATE_LABELS: Readonly<Record<CampaignState, string>> = Object.freeze({
  draft: "Draft",
  generated: "Not checked yet",
  preflight_failed: CHECK_RESULT_NEEDS_CHANGES,
  awaiting_approval: CHECK_RESULT_READY,
  approved: "Approved",
  // PRD-009e 009E-AC-010. Nothing in PRD-009 can publish an ad, so no screen can truthfully say a
  // campaign is "Live" or "Going live", and neither word is left here to be shown by accident. The
  // two states stay in the map because the schema still has them (the Meta publish PRD will use
  // them), and they read as what is known: the ad is being sent to Meta, or Meta has it.
  publishing: "Sending to Meta",
  live: "With Meta",
  paused: "Paused",
  completed: "Finished",
  archived: "Archived",
});

/**
 * PRD-009e 009E-AC-010. The two standings a campaign can be in that the stored state cannot say.
 *
 * "Ad retired": the library took the ad this version was made from out of the library, and nobody
 * has approved the version, so it can no longer be approved (009c D4). "Replaced": a newer version
 * of the campaign exists and nobody ever decided on this one, so it is neither waiting for an
 * approver nor approved. Neither is a stored state, so they are standings, and the label function
 * below reads them with the state.
 */
export const CAMPAIGN_AD_RETIRED_LABEL = "Ad retired";
export const CAMPAIGN_VERSION_REPLACED_LABEL = "Replaced by a newer version";

/**
 * Where a campaign stands, given what has been decided on it.
 *
 * `CAMPAIGN_STATE_LABELS` is keyed by the stored state, and a send-back does not change the stored
 * state: the campaign stays in `awaiting_approval` with a rejection recorded against it. Read on its
 * own the state says "Ready for approval" about a version that was just sent back. The recorded
 * decision is what tells the two apart, so a screen that shows where a campaign stands asks here
 * with the decision it has, and gets the state's phrase unless that decision is a send-back.
 */
export function campaignStateLabel(
  state: CampaignStanding,
  decision: "approved" | "rejected" | undefined,
): string {
  if (state === "ad_retired") return CAMPAIGN_AD_RETIRED_LABEL;
  if (state === "replaced") return CAMPAIGN_VERSION_REPLACED_LABEL;
  return state === "awaiting_approval" && decision === "rejected"
    ? CAMPAIGN_SENT_BACK_LABEL
    : CAMPAIGN_STATE_LABELS[state];
}

/**
 * What to do about a version whose checks found something, said the same way to everyone who reads
 * it. PRD-008 follow-up Quality L-2: "Fix what the checks found, then save it again." was addressed
 * to every reader, including an approver who cannot edit, so it asked people to do what they
 * cannot. This one names the person who can, and is true for the creator reading it too.
 */
export const NEEDS_CHANGES_NEXT_ACTION =
  "The campaign creator fixes what the checks found and saves it again.";

/**
 * What to do next about one campaign, keyed by the step the application layer named.
 *
 * The application layer used to carry these sentences itself, which put five user-facing lines
 * outside the D1 voice and outside every glob the vocabulary guard reads: "Review persisted
 * version evidence." and "Approve this exact persisted version." went to screens with three D2
 * words between them. It now returns a key and nothing in English, and the words live here with
 * the rest of the product's words.
 *
 * The map is exhaustive over `CampaignNextActionId`, so a new step cannot reach a screen without a
 * sentence.
 */
export const CAMPAIGN_NEXT_ACTION_LABELS: Readonly<Record<CampaignNextActionId, string>> =
  Object.freeze({
    review_evidence: "Look over this version and what the checks found.",
    approve_version: "Approve this version.",
    already_decided: "Someone has already decided on this version.",
    wait_for_approver: "Waiting for an approver to look at this version.",
    remediate_preflight: NEEDS_CHANGES_NEXT_ACTION,
    provider_publish: CAMPAIGN_NOT_AN_AD_YET,
  });
