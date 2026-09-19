"use client";

import { Card, Icon, SafeAction, Stack, type SafeActionDecision } from "@oalo/ui";
import { useState } from "react";

import type { DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";
import type { SyntheticCampaign } from "../model/synthetic-reporting.js";
import styles from "./reporting.module.css";

type CampaignLaunchReviewProps = Readonly<{
  campaign: DeepReadonly<SyntheticCampaign>;
}>;

const approvalVersionLabels = Object.freeze([
  ["page", "Page"],
  ["pdf", "PDF"],
  ["creative", "Creative"],
  ["copy", "Copy"],
  ["disclosure", "Disclosure"],
  ["targeting", "Targeting"],
  ["budget", "Budget"],
  ["dates", "Dates"],
  ["form", "Form"],
  ["destination", "Destination"],
] as const);

export function CampaignLaunchReview({ campaign }: CampaignLaunchReviewProps) {
  const [confirmed, setConfirmed] = useState(false);
  const decision: SafeActionDecision = {
    state: "ready",
    explanation:
      "Read every version, account, audience, exclusion, budget, and date before you confirm.",
    requiredRole: "A publisher",
    confirmation: {
      title: campaign.launchSummary.confirmation.title,
      effect: campaign.launchSummary.confirmation.effect,
      scope: `Version ${campaign.currentVersion} of this campaign`,
      result: campaign.launchSummary.confirmation.result,
    },
  };

  return (
    <Stack gap="6">
      <section aria-labelledby="meta-connection-title" className={styles.launchSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="meta-connection-title">Your Meta connection</h2>
            <p>Workspace: {campaign.metaConnection.activeLocationName}</p>
          </div>
          <span data-connection-state={campaign.metaConnection.state}>
            {campaign.metaConnection.state}
          </span>
        </div>
        <Card className={styles.connectionEvidence} padding="sm">
          <Icon decorative name="circle-dot" size="sm" tone="success" />
          <div>
            <strong>{campaign.metaConnection.source}</strong>
            <p>{campaign.metaConnection.freshness}</p>
          </div>
        </Card>
        <div className={styles.assetGrid}>
          {campaign.metaConnection.assets.map((asset) => (
            <Card data-meta-asset-kind={asset.kind} key={asset.providerId} padding="sm">
              <div className={styles.fieldStatusHeading}>
                <h3>{asset.label}</h3>
                <span>{asset.optional ? "Optional, selected" : "Selected"}</span>
              </div>
              <p>{asset.displayName}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="approval-scope-title" className={styles.launchSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="approval-scope-title">What the approval covers</h2>
            <p>
              Version {campaign.approvalSnapshot.campaignVersion}, approved by{" "}
              {campaign.approvalSnapshot.approver}
            </p>
          </div>
          <span>{campaign.approvalSnapshot.status}</span>
        </div>
        <div
          aria-label="Exactly what was approved"
          className={styles.tableRegion}
          role="region"
          tabIndex={0}
        >
          <table>
            <caption>What was approved in version {campaign.currentVersion}</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Version</th>
              </tr>
            </thead>
            <tbody>
              {approvalVersionLabels.map(([key, label]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{campaign.approvalSnapshot.versions[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="final-launch-title" className={styles.launchSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="final-launch-title">The launch summary</h2>
            <p>{campaign.launchSummary.policyClassification}</p>
          </div>
          <span>Nothing launches from here</span>
        </div>

        <div className={styles.launchSummaryGrid}>
          <Card padding="md">
            <h3>Who sees it</h3>
            <ul>
              {campaign.launchSummary.targets.map((target) => (
                <li key={target}>{target}</li>
              ))}
            </ul>
          </Card>
          <Card padding="md">
            <h3>Who does not</h3>
            <ul>
              {campaign.launchSummary.exclusions.map((exclusion) => (
                <li key={exclusion}>{exclusion}</li>
              ))}
            </ul>
          </Card>
          <Card padding="md">
            <h3>Budget and dates</h3>
            <dl className={styles.launchDetails}>
              <div>
                <dt>Budget</dt>
                <dd>
                  {campaign.launchSummary.budget.currency} {campaign.launchSummary.budget.amount}{" "}
                  {campaign.launchSummary.budget.cadence}
                </dd>
              </div>
              <div>
                <dt>Start date</dt>
                <dd>{campaign.launchSummary.schedule.startDate}</dd>
              </div>
              <div>
                <dt>End date</dt>
                <dd>{campaign.launchSummary.schedule.endDate}</dd>
              </div>
              <div>
                <dt>Timezone</dt>
                <dd>{campaign.launchSummary.schedule.timezone}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <SafeAction
          confirmLabel="Yes, that is right"
          decision={decision}
          label="Confirm the launch summary"
          onConfirm={() => setConfirmed(true)}
        />
        <p className={styles.confirmationStatus} role="status">
          {confirmed
            ? "You confirmed the launch summary. Nothing was launched."
            : "You have not confirmed the launch summary yet. Nothing can launch from here."}
        </p>
      </section>
    </Stack>
  );
}
