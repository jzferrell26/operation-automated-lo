import { Card, Icon } from "@oalo/ui";

import type { CampaignWorkspaceProjection } from "@oalo/application";

import {
  APPROVAL_ROLE_LABELS,
  CAMPAIGN_NEXT_ACTION_LABELS,
  CAMPAIGN_NOT_AN_AD_YET,
  CAMPAIGN_SAVED_NOTICE,
  CAMPAIGN_SENT_BACK_LABEL,
  CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION,
  CHECK_RESULT_NEEDS_CHANGES,
  CHECK_RESULT_PASSED,
  CHECK_RESULT_READY,
  SUPPORT_DETAILS_LABELS,
  campaignStateLabel,
} from "../../../copy/user-language.js";
import { GUIDED_SETUP_ANCHORS } from "../../guided-setup/anchor-registry.js";
import { SupportDetails } from "../../shell/components/support-details.js";
import { CampaignApprovalControls } from "./campaign-approval-controls.js";
import styles from "./open-house-draft-builder.module.css";

export function PersistedCampaignScreen({
  campaign,
}: Readonly<{ campaign: CampaignWorkspaceProjection }>) {
  /*
   * PRD-008b D2. "Ready for approval" and "An approver can sign off on it now" are true only while
   * the campaign is waiting for that approval, which means waiting with nobody having decided. Once
   * it has been approved the same checks still passed, so the result says that instead, and the
   * screen no longer invites a sign-off that has already happened.
   *
   * A send-back is the case the stored state cannot tell apart. It leaves the campaign in
   * `awaiting_approval` with a rejection recorded against it, so the state alone would keep saying
   * "Ready for approval" about a version that was just sent back. The recorded decision is what
   * says so, and the state badge, the check result, and the next steps all read it.
   */
  const awaitingApproval =
    campaign.state === "awaiting_approval" && campaign.approval === undefined;
  const sentBack =
    campaign.state === "awaiting_approval" && campaign.approval?.decision === "rejected";
  const standing = campaignStateLabel(campaign.state, campaign.approval?.decision);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Open House Boost</p>
          <h1>{campaign.headline}</h1>
          <p>{campaign.propertyAddress}</p>
        </div>
        <span>{standing}</span>
      </header>

      <Card className={styles.notice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>
            {campaign.persistenceKind === "postgres" ? "Saved" : "Saved on this computer"}
          </strong>
          <p>{CAMPAIGN_SAVED_NOTICE}</p>
        </div>
      </Card>

      <div className={styles.summaryGrid}>
        <Card padding="sm">
          <strong>Realtor</strong>
          <p>{campaign.realtorDisplayName}</p>
        </Card>
        <Card padding="sm">
          <strong>Where it stands</strong>
          <p>{standing}</p>
        </Card>
        <Card padding="sm">
          <strong>Daily budget</strong>
          <p>{dollars(campaign.dailyBudgetMinor)}</p>
        </Card>
        <Card padding="sm">
          <strong>Total budget</strong>
          <p>{dollars(campaign.totalBudgetMinor)}</p>
        </Card>
        <Card padding="sm">
          <strong>Where the ad runs</strong>
          <p>
            {campaign.targetingCountry}
            {campaign.targetingRegions.length > 0
              ? ` / ${campaign.targetingRegions.join(", ")}`
              : ""}
          </p>
        </Card>
        <Card padding="sm">
          <strong>Open house</strong>
          <p>
            {new Date(campaign.openHouseStartsAt).toLocaleString("en-US")} to{" "}
            {new Date(campaign.openHouseEndsAt).toLocaleString("en-US")}
          </p>
        </Card>
        <Card padding="sm">
          <strong>Disclosure</strong>
          <p>{campaign.disclosureText}</p>
        </Card>
        <Card padding="sm">
          <strong>Approval scope</strong>
          <p>
            Approval applies to this exact version. If you change the campaign, the new version
            needs its own approval.
          </p>
          <SupportDetails
            rows={[[SUPPORT_DETAILS_LABELS.versionId, campaign.campaignVersionRef]]}
          />
        </Card>
      </div>

      {/* PRD-006c D3 step 5 points at the campaign check result, which is the verdict and what the
          checks found, so the anchor is the whole section rather than its heading. PRD-008d, the
          scored baseline review of 2026-10-01: anchored to the heading alone, the walkthrough
          scrolled only the heading clear and dropped its panel straight onto the finding card
          below it, so at 768 and 1180 the one thing the step is about was under the panel. */}
      <section
        className={styles.review}
        aria-labelledby="campaign-check-title"
        data-tour={GUIDED_SETUP_ANCHORS.campaignCheckResult}
      >
        <div className={styles.reviewHeading}>
          <div>
            <p className={styles.eyebrow}>Campaign check</p>
            <h2 id="campaign-check-title">
              {campaign.preflight.blocking
                ? CHECK_RESULT_NEEDS_CHANGES
                : awaitingApproval
                  ? CHECK_RESULT_READY
                  : CHECK_RESULT_PASSED}
            </h2>
          </div>
        </div>
        {/* PRD-006c D2. The anchor is on the container, not on the list, because step 5 points at
            what the checks found whether or not they found anything, and an anchor that exists
            only in one branch is an anchor a step can fail to find. */}
        <div className={styles.findings} data-tour={GUIDED_SETUP_ANCHORS.campaignCheckFindings}>
          {campaign.preflight.findings.length === 0 ? (
            <Card padding="md">
              <strong>Nothing to fix.</strong>
              <p>
                This campaign meets every rule we check.
                {awaitingApproval ? " An approver can sign off on it now." : ""}
                {sentBack ? ` ${CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION}` : ""}
              </p>
            </Card>
          ) : (
            campaign.preflight.findings.map((finding) => (
              <Card key={finding.ruleCode} padding="md">
                <strong>{finding.description}</strong>
                <p>{finding.remediation}</p>
                <small>
                  {finding.severity === "blocking" ? "Fix this before approving" : "Worth a look"}
                </small>
                <SupportDetails rows={[[SUPPORT_DETAILS_LABELS.rule, finding.ruleCode]]} />
              </Card>
            ))
          )}
        </div>
      </section>

      {campaign.approval !== undefined ? (
        <section className={styles.review} aria-labelledby="campaign-approval-title">
          <div className={styles.reviewHeading}>
            <div>
              <p className={styles.eyebrow}>Approval</p>
              <h2 id="campaign-approval-title">Who decided</h2>
            </div>
          </div>
          <Card padding="md">
            <strong>
              {decisionLabel(campaign.approval.decision)} by{" "}
              {APPROVAL_ROLE_LABELS[campaign.approval.actorRole]}
            </strong>
            <p>{new Date(campaign.approval.decidedAt).toLocaleString("en-US")}</p>
            <small>{CAMPAIGN_NOT_AN_AD_YET}</small>
          </Card>
        </section>
      ) : null}

      <section className={styles.review} aria-labelledby="campaign-next-title">
        <div className={styles.reviewHeading}>
          <div>
            <p className={styles.eyebrow}>What to do next</p>
            <h2 id="campaign-next-title">Your next steps</h2>
          </div>
        </div>
        <div className={styles.findings}>
          {campaign.nextActions.map((action) => (
            <Card key={action.id} padding="sm">
              <strong>{action.available ? "Available" : "Not available"}</strong>
              <p>{CAMPAIGN_NEXT_ACTION_LABELS[action.id]}</p>
            </Card>
          ))}
        </div>
      </section>

      <CampaignApprovalControls
        campaignHref={campaign.detailHref}
        campaignRef={campaign.campaignRef}
        campaignVersionRef={campaign.campaignVersionRef}
        manifestHash={campaign.manifestHash}
        preflightResultHash={campaign.preflight.resultHash}
        rowVersion={campaign.rowVersion}
        canApprove={campaign.canApprove}
        alreadyDecided={campaign.approval?.decision}
        blocking={campaign.preflight.blocking}
        state={campaign.state}
      />

      <SupportDetails
        rows={[
          [SUPPORT_DETAILS_LABELS.versionId, campaign.campaignVersionRef],
          [SUPPORT_DETAILS_LABELS.contentFingerprint, campaign.manifestHash],
          [SUPPORT_DETAILS_LABELS.checkFingerprint, campaign.preflight.resultHash],
        ]}
      />
    </div>
  );
}

/** "Approved" or "Sent back for changes". The stored decision word is not the user's word. */
function decisionLabel(decision: "approved" | "rejected"): string {
  return decision === "approved" ? "Approved" : CAMPAIGN_SENT_BACK_LABEL;
}

function dollars(minor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
}
