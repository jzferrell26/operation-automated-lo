import { Card, Icon } from "@oalo/ui";

import type { PreflightFinding } from "@oalo/contracts";

import type { LocalCampaignRecord } from "../../../server/local-campaign-store.js";
import styles from "./open-house-draft-builder.module.css";

export function PersistedCampaignScreen({ campaign }: Readonly<{ campaign: LocalCampaignRecord }>) {
  const manifest = campaign.version.manifest;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Open House Boost</p>
          <h1>{manifest.content.headline}</h1>
          <p>{manifest.property.address}</p>
        </div>
        <span>{stateLabel(campaign.state)}</span>
      </header>

      <Card className={styles.notice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Persisted local campaign record</strong>
          <p>
            The immutable campaign version, deterministic preflight evidence, and legal state
            transitions are persisted locally. Provider publication remains disabled.
          </p>
        </div>
      </Card>

      <div className={styles.summaryGrid}>
        <Card padding="sm"><strong>Realtor</strong><p>{manifest.partner.realtorDisplayName}</p></Card>
        <Card padding="sm"><strong>State</strong><p>{stateLabel(campaign.state)}</p></Card>
        <Card padding="sm"><strong>Daily budget</strong><p>{dollars(manifest.meta.dailyBudgetMinor)}</p></Card>
        <Card padding="sm"><strong>Total budget</strong><p>{dollars(manifest.meta.totalBudgetMinor)}</p></Card>
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
          <Card padding="md"><strong>Ready for an authorized approver.</strong><p>No blocking findings remain on this immutable version.</p></Card>
        ) : (
          <div className={styles.findings}>
            {campaign.preflight.findings.map((finding: PreflightFinding) => (
              <Card key={finding.ruleCode} padding="md">
                <strong>{finding.ruleCode}</strong>
                <p>{finding.description}</p>
                <small>{finding.remediation}</small>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className={styles.review} aria-labelledby="campaign-history-title">
        <div className={styles.reviewHeading}>
          <div>
            <p className={styles.eyebrow}>Append-only lifecycle</p>
            <h2 id="campaign-history-title">Campaign history</h2>
          </div>
        </div>
        <div className={styles.findings}>
          {campaign.events.map((event) => (
            <Card key={event.eventRef} padding="sm">
              <strong>{event.fromState} → {event.toState}</strong>
              <p>{new Date(event.occurredAt).toLocaleString("en-US")}</p>
              <small>{event.correlationRef}</small>
            </Card>
          ))}
        </div>
      </section>

      <Card padding="md">
        <strong>Approval authority required</strong>
        <p>
          This campaign is intentionally not self-approvable from the current loan-officer session.
          The next production slice must bind approval to a verified HighLevel principal with an
          allowed approver role.
        </p>
      </Card>

      <details>
        <summary>Immutable evidence</summary>
        <code>{campaign.version.campaignVersionRef}</code>
        <code>{campaign.version.manifestHash}</code>
        <code>{campaign.preflight.resultHash}</code>
      </details>
    </div>
  );
}

function stateLabel(state: LocalCampaignRecord["state"]): string {
  return state.replaceAll("_", " ").replace(/^./u, (value: string) => value.toUpperCase());
}

function dollars(minor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
}
