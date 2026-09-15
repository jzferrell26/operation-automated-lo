import { Card, Icon } from "@oalo/ui";

import type { CampaignWorkspaceProjection } from "@oalo/application";

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
            {campaign.persistenceKind === "postgres"
              ? "Persisted tenant campaign record"
              : "Persisted local campaign record"}
          </strong>
          <p>
            The immutable campaign version, deterministic preflight evidence, and legal state are
            stored for this location. Provider publication remains disabled.
          </p>
        </div>
      </Card>

      <div className={styles.summaryGrid}>
        <Card padding="sm">
          <strong>Realtor</strong>
          <p>{campaign.realtorDisplayName}</p>
        </Card>
        <Card padding="sm">
          <strong>State</strong>
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
          <strong>Targeting</strong>
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
            Exact version {campaign.campaignVersionRef}. New material edits cannot inherit this
            decision.
          </p>
        </Card>
      </div>

      <section className={styles.review} aria-labelledby="campaign-preflight-title">
        <div className={styles.reviewHeading}>
          <div>
            <p className={styles.eyebrow}>Deterministic gate</p>
            <h2 id="campaign-preflight-title">
              Preflight {campaign.preflight.blocking ? "blocked" : "passed"}
            </h2>
          </div>
        </div>
        {campaign.preflight.findings.length === 0 ? (
          <Card padding="md">
            <strong>Ready for an authorized approver.</strong>
            <p>No blocking findings remain on this immutable version.</p>
          </Card>
        ) : (
          <div className={styles.findings}>
            {campaign.preflight.findings.map((finding) => (
              <Card key={finding.ruleCode} padding="md">
                <strong>{finding.ruleCode}</strong>
                <p>{finding.description}</p>
                <small>{finding.remediation}</small>
              </Card>
            ))}
          </div>
        )}
      </section>

      {campaign.approval !== undefined ? (
        <section className={styles.review} aria-labelledby="campaign-approval-title">
          <div className={styles.reviewHeading}>
            <div>
              <p className={styles.eyebrow}>Human decision</p>
              <h2 id="campaign-approval-title">Approval evidence</h2>
            </div>
          </div>
          <Card padding="md">
            <strong>
              {campaign.approval.decision} by {campaign.approval.actorRole}
            </strong>
            <p>{new Date(campaign.approval.decidedAt).toLocaleString("en-US")}</p>
            <small>Provider publication remains disabled.</small>
          </Card>
        </section>
      ) : null}

      <section className={styles.review} aria-labelledby="campaign-next-title">
        <div className={styles.reviewHeading}>
          <div>
            <p className={styles.eyebrow}>Role-aware next step</p>
            <h2 id="campaign-next-title">Available next actions</h2>
          </div>
        </div>
        <div className={styles.findings}>
          {campaign.nextActions.map((action) => (
            <Card key={action.id} padding="sm">
              <strong>{action.available ? "Available" : "Unavailable"}</strong>
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

      <details>
        <summary>Immutable evidence</summary>
        <code>{campaign.campaignVersionRef}</code>
        <code>{campaign.manifestHash}</code>
        <code>{campaign.preflight.resultHash}</code>
      </details>
    </div>
  );
}

function stateLabel(state: CampaignWorkspaceProjection["state"]): string {
  return state.replaceAll("_", " ").replace(/^./u, (value: string) => value.toUpperCase());
}

function dollars(minor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
}
