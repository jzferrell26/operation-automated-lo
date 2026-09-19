import { Card, Icon } from "@oalo/ui";

import type { CampaignWorkspaceProjection } from "@oalo/application";

import {
  APPROVAL_ROLE_LABELS,
  CAMPAIGN_NOT_AN_AD_YET,
  CAMPAIGN_SAVED_NOTICE,
  CHECK_RESULT_NEEDS_CHANGES,
  CHECK_RESULT_READY,
  SUPPORT_DETAILS_LABELS,
} from "../../../copy/user-language.js";
import { SupportDetails } from "../../shell/components/support-details.js";
import { CampaignApprovalControls } from "./campaign-approval-controls.js";
import styles from "./open-house-draft-builder.module.css";

export function PersistedCampaignScreen({
  campaign,
}: Readonly<{ campaign: CampaignWorkspaceProjection }>) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Open House Boost</p>
          <h1>{campaign.headline}</h1>
          <p>{campaign.propertyAddress}</p>
        </div>
        <span>{stateLabel(campaign.state)}</span>
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
          <p>{stateLabel(campaign.state)}</p>
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

      <section className={styles.review} aria-labelledby="campaign-check-title">
        <div className={styles.reviewHeading}>
          <div>
            <p className={styles.eyebrow}>Campaign check</p>
            <h2 id="campaign-check-title">
              {campaign.preflight.blocking ? CHECK_RESULT_NEEDS_CHANGES : CHECK_RESULT_READY}
            </h2>
          </div>
        </div>
        {campaign.preflight.findings.length === 0 ? (
          <Card padding="md">
            <strong>Nothing to fix.</strong>
            <p>This campaign meets every rule we check. An approver can sign off on it now.</p>
          </Card>
        ) : (
          <div className={styles.findings}>
            {campaign.preflight.findings.map((finding) => (
              <Card key={finding.ruleCode} padding="md">
                <strong>{finding.description}</strong>
                <p>{finding.remediation}</p>
                <small>
                  {finding.severity === "blocking" ? "Fix this before approving" : "Worth a look"}
                </small>
                <SupportDetails rows={[[SUPPORT_DETAILS_LABELS.rule, finding.ruleCode]]} />
              </Card>
            ))}
          </div>
        )}
      </section>

      {campaign.approval !== undefined ? (
        <section className={styles.review} aria-labelledby="campaign-approval-title">
          <div className={styles.reviewHeading}>
            <div>
              <p className={styles.eyebrow}>Approval</p>
              <h2 id="campaign-approval-title">Who signed off</h2>
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
              <p>{action.label}</p>
            </Card>
          ))}
        </div>
      </section>

      <CampaignApprovalControls
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

/** The campaign's state as a sentence-case phrase, never the underlying token. */
function stateLabel(state: CampaignWorkspaceProjection["state"]): string {
  return state.replaceAll("_", " ").replace(/^./u, (value: string) => value.toUpperCase());
}

/** "Approved" or "Sent back for changes". The stored decision word is not the user's word. */
function decisionLabel(decision: "approved" | "rejected"): string {
  return decision === "approved" ? "Approved" : "Sent back for changes";
}

function dollars(minor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
}
