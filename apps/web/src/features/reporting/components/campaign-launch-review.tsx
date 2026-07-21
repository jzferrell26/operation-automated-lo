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
      "Review every version, selected asset, target, exclusion, budget value, and date before confirming.",
    requiredRole: "Synthetic Publisher",
    confirmation: {
      title: campaign.launchSummary.confirmation.title,
      effect: campaign.launchSummary.confirmation.effect,
      scope: `Campaign ${campaign.id}, version ${campaign.currentVersion}`,
      result: campaign.launchSummary.confirmation.result,
    },
  };

  return (
    <Stack gap="6">
      <section aria-labelledby="meta-connection-title" className={styles.launchSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="meta-connection-title">Meta connection and selected assets</h2>
            <p>
              Active location: {campaign.metaConnection.activeLocationName} (
              {campaign.metaConnection.activeLocationId})
            </p>
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
              <code>{asset.providerId}</code>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="approval-scope-title" className={styles.launchSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="approval-scope-title">Exact approval scope</h2>
            <p>
              Campaign version {campaign.approvalSnapshot.campaignVersion}, approved by{" "}
              {campaign.approvalSnapshot.approver}
            </p>
          </div>
          <span>{campaign.approvalSnapshot.status}</span>
        </div>
        <div
          aria-label="Exact approved artifact and launch versions"
          className={styles.tableRegion}
          role="region"
          tabIndex={0}
        >
          <table>
            <caption>
              Exact approved versions for campaign version {campaign.currentVersion}
            </caption>
            <thead>
              <tr>
                <th scope="col">Approval item</th>
                <th scope="col">Exact version</th>
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
            <h2 id="final-launch-title">Final synthetic launch summary</h2>
            <p>{campaign.launchSummary.policyClassification}</p>
          </div>
          <span>Provider write disabled</span>
        </div>

        <div className={styles.launchSummaryGrid}>
          <Card padding="md">
            <h3>Every target</h3>
            <ul>
              {campaign.launchSummary.targets.map((target) => (
                <li key={target}>{target}</li>
              ))}
            </ul>
          </Card>
          <Card padding="md">
            <h3>Every exclusion</h3>
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
          confirmLabel="Confirm exact local summary"
          decision={decision}
          label="Confirm final launch summary"
          onConfirm={() => setConfirmed(true)}
        />
        <p className={styles.confirmationStatus} role="status">
          {confirmed
            ? "Final launch summary confirmed locally for campaign version 3. No provider write occurred."
            : "Final launch summary has not been confirmed. No provider write is available."}
        </p>
      </section>
    </Stack>
  );
}
