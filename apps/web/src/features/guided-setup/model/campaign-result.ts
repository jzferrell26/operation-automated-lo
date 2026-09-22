/**
 * PRD-006c D3 step 5 and D5. What the walkthrough knows about a saved campaign.
 *
 * Step 5 tells somebody whether the checks let their first campaign through, so the fact it reads
 * has to be the stored one. It used to be whatever the create screen had handed the provider in
 * this browser session, which is right for the person who has just pressed "Save and run the
 * checks" and wrong for everybody else: a person who signed in again the next morning had no
 * report in memory, no findings, and was therefore told the campaign was ready even when the
 * checks had blocked it. So this shape is what the server answers with, read through the campaign
 * repository under the same tenant context the rest of the page uses, and the in-session report is
 * the same shape so that one component can render either.
 *
 * A finding carries the plain description and the fix, and never the rule's own code: PRD-006b D5
 * puts the code inside the campaign page's collapsed support region and nowhere else, and the
 * walkthrough panel is not that region.
 */

export type SetupResultFinding = Readonly<{
  description: string;
  remediation: string;
}>;

export type SetupCampaignResult = Readonly<{
  campaignRef: string;
  /** Where the campaign lives, so steps 5 and 6 can take the user to it. */
  detailHref: string;
  /** Whether the latest check result let this version through to approval. */
  ready: boolean;
  findings: readonly SetupResultFinding[];
}>;
