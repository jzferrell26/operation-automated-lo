import type { ReportingMetricKey } from "@oalo/application";
import type { ReportingException } from "@oalo/contracts";

/**
 * What a loan officer reads about campaign reporting, in one place.
 *
 * Governed by `library/knowledge/private/standards/user-language-contract.md` (PRD-006b D1 to D4
 * and section 7). The application layer's `reporting.ts` names a figure or an exception by key and
 * writes no English; the sentences live here, keyed by those names, so the forbidden-vocabulary
 * guard reads every one of them like any other copy (PRD-008c, 008C-AC-005). The same move closed
 * `campaign-workspace-read.ts` on 2026-09-21, and `CAMPAIGN_NEXT_ACTION_LABELS` in
 * `user-language.ts` is its precedent.
 *
 * Both maps are exhaustive over the application layer's own keys, so a new exception code or a new
 * figure is a typecheck failure here until somebody writes the sentence for it.
 */

/**
 * What happened, and what a person can do about it, for each reason a campaign's reporting can go
 * wrong. Each is two short sentences at most and fits the contract's 240-character limit on an
 * exception's explanation.
 *
 * The provider is always named. The code does not say whether HighLevel or Meta is meant for a
 * connection that expired or could not be confirmed, so those two say "HighLevel or Meta" rather
 * than guess, and the Meta ones say Meta because only Meta can be the subject.
 */
export const REPORTING_EXCEPTION_EXPLANATIONS: Readonly<
  Record<ReportingException["code"], string>
> = Object.freeze({
  token_expired:
    "Your HighLevel or Meta connection has expired. Reconnect it to see live numbers again.",
  token_failed: "We couldn't confirm your HighLevel or Meta connection. Try reconnecting it.",
  meta_disconnected:
    "A Meta ad account or page this campaign uses is no longer connected. Reconnect it so the campaign can keep running.",
  ad_disapproved: "Meta rejected this campaign's ad. Change the ad and save a new version.",
  reporting_stale:
    "These numbers haven't updated recently. Check that your HighLevel and Meta connections are still working.",
  lead_route_failed:
    "A new lead couldn't be sent to the right person. Check your routing settings.",
  mapping_missing:
    "This campaign is missing a link to something in HighLevel, like a pipeline or a calendar. Check your routing settings.",
  approval_stale:
    "This campaign changed after it was approved, so the approval no longer covers it. Approve the new version.",
  reconciliation_gap:
    "What Meta or HighLevel shows doesn't match what's saved for this campaign. Contact support so we can look into it.",
});

/**
 * What each figure on a campaign's reporting record means, in the words a loan officer would use to
 * explain it to a Realtor partner. A figure with no live source shows "Not live yet" instead of one
 * of these; these only say what the number is once there is one.
 */
export const REPORTING_METRIC_DEFINITIONS: Readonly<Record<ReportingMetricKey, string>> =
  Object.freeze({
    spendCents: "What Meta says has been spent on this campaign's ads.",
    leads: "Leads this campaign brought in. Test leads aren't counted.",
    costPerLeadCents:
      "What each lead cost, worked out as spend divided by leads. It stays blank until both numbers are available.",
    appointments: "Appointments in HighLevel that came from this campaign.",
    applications: "Applications in HighLevel that came from this campaign.",
    fundedOrClosed: "Loans marked funded or closed in HighLevel that came from this campaign.",
  });
