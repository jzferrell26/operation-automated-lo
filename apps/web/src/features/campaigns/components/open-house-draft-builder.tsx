"use client";

import { Button, Card, Icon } from "@oalo/ui";
import { useState, type FormEvent } from "react";

import { postInternalJson } from "../../http/internal-api.js";
import styles from "./open-house-draft-builder.module.css";

type PreflightResponse = Readonly<{
  state: string;
  detailHref: string;
  version: {
    campaignRef: string;
    campaignVersionRef: string;
    manifestHash: string;
    manifest: {
      property: { address: string; openHouseStartsAt: string; openHouseEndsAt: string };
      partner: { realtorDisplayName: string };
      meta: { dailyBudgetMinor: number; totalBudgetMinor: number; specialAdCategory: string };
    };
  };
  preflight: {
    blocking: boolean;
    resultHash: string;
    findings: readonly {
      severity: "blocking" | "warning";
      ruleCode: string;
      description: string;
      remediation: string;
    }[];
  };
}>;

export function OpenHouseDraftBuilder() {
  const [result, setResult] = useState<PreflightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await postInternalJson("/api/campaigns/preflight", {
        address: form.get("address"),
        stateCode: form.get("stateCode"),
        propertyDescription: form.get("propertyDescription"),
        openHouseStartsAt: new Date(String(form.get("openHouseStartsAt"))).toISOString(),
        openHouseEndsAt: new Date(String(form.get("openHouseEndsAt"))).toISOString(),
        realtorDisplayName: form.get("realtorDisplayName"),
        headline: form.get("headline"),
        body: form.get("body"),
        callToAction: form.get("callToAction"),
        disclosureText: form.get("disclosureText"),
        consentText: form.get("consentText"),
        region: form.get("region"),
        dailyBudgetDollars: Number(form.get("dailyBudgetDollars")),
        totalBudgetDollars: Number(form.get("totalBudgetDollars")),
        propertyPermissionConfirmed: form.get("propertyPermissionConfirmed") === "on",
        realtorPermissionConfirmed: form.get("realtorPermissionConfirmed") === "on",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const record = payload as { message?: string; error?: string };
        throw new Error(record.message ?? record.error ?? "Campaign preflight failed");
      }
      setResult(payload as PreflightResponse);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Campaign preflight failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Open House Boost</p>
          <h1>Create campaign</h1>
          <p>
            Build one frozen campaign version and run the same deterministic preflight contract used
            by the production application layer.
          </p>
        </div>
      </header>

      <Card className={styles.notice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Safe local completion path</strong>
          <p>
            This flow validates the real campaign contract but does not persist, publish, spend, or
            call HighLevel or Meta yet.
          </p>
        </div>
      </Card>

      <form className={styles.form} onSubmit={handleSubmit}>
        <fieldset>
          <legend>Property and event</legend>
          <label>
            Property address
            <input name="address" required defaultValue="123 Main Street, Dallas" />
          </label>
          <label>
            State
            <input name="stateCode" required maxLength={2} defaultValue="TX" />
          </label>
          <label>
            Property description
            <textarea
              name="propertyDescription"
              required
              defaultValue="Beautiful home prepared for an upcoming open house."
            />
          </label>
          <label>
            Open house starts
            <input name="openHouseStartsAt" required type="datetime-local" />
          </label>
          <label>
            Open house ends
            <input name="openHouseEndsAt" required type="datetime-local" />
          </label>
          <label>
            Realtor name
            <input name="realtorDisplayName" required defaultValue="Jordan Smith" />
          </label>
          <label className={styles.check}>
            <input name="propertyPermissionConfirmed" type="checkbox" /> I confirm property
            marketing rights.
          </label>
          <label className={styles.check}>
            <input name="realtorPermissionConfirmed" type="checkbox" /> I confirm Realtor collateral
            permission.
          </label>
        </fieldset>

        <fieldset>
          <legend>Campaign content</legend>
          <label>
            Headline
            <input name="headline" required defaultValue="Tour this home this weekend" />
          </label>
          <label>
            Body
            <textarea
              name="body"
              required
              defaultValue="Join us for the open house and explore the property in person."
            />
          </label>
          <label>
            Call to action
            <input name="callToAction" required defaultValue="Get open house details" />
          </label>
          <label>
            Disclosure
            <textarea
              name="disclosureText"
              required
              defaultValue="Equal Housing Opportunity. Additional lender disclosures apply."
            />
          </label>
          <label>
            Lead consent
            <textarea
              name="consentText"
              required
              defaultValue="By submitting, you agree to be contacted about this property and related mortgage services."
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Meta plan</legend>
          <label>
            Region
            <input name="region" required defaultValue="Dallas-Fort Worth" />
          </label>
          <label>
            Daily budget ($)
            <input
              name="dailyBudgetDollars"
              required
              type="number"
              min="5"
              step="1"
              defaultValue="25"
            />
          </label>
          <label>
            Total budget ($)
            <input
              name="totalBudgetDollars"
              required
              type="number"
              min="5"
              step="1"
              defaultValue="125"
            />
          </label>
          <p className={styles.hint}>Housing Special Ad Category is enforced automatically.</p>
        </fieldset>

        <Button disabled={submitting} type="submit">
          {submitting ? "Running preflight…" : "Freeze draft and run preflight"}
        </Button>
      </form>

      {error ? (
        <Card padding="md">
          <strong>Could not compile draft</strong>
          <p>{error}</p>
        </Card>
      ) : null}
      {result ? <PreflightReview result={result} /> : null}
    </div>
  );
}

function PreflightReview({ result }: Readonly<{ result: PreflightResponse }>) {
  const dollars = (minor: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
  return (
    <section className={styles.review} aria-labelledby="preflight-review-title">
      <div className={styles.reviewHeading}>
        <div>
          <p className={styles.eyebrow}>Frozen version</p>
          <h2 id="preflight-review-title">
            Preflight {result.preflight.blocking ? "blocked" : "passed"}
          </h2>
        </div>
        <span data-blocking={result.preflight.blocking}>
          {result.preflight.blocking ? "Blocked" : "Ready for approval"}
        </span>
      </div>
      <div className={styles.summaryGrid}>
        <Card padding="sm">
          <strong>Property</strong>
          <p>{result.version.manifest.property.address}</p>
        </Card>
        <Card padding="sm">
          <strong>Realtor</strong>
          <p>{result.version.manifest.partner.realtorDisplayName}</p>
        </Card>
        <Card padding="sm">
          <strong>Budget</strong>
          <p>
            {dollars(result.version.manifest.meta.dailyBudgetMinor)} / day ·{" "}
            {dollars(result.version.manifest.meta.totalBudgetMinor)} total
          </p>
        </Card>
        <Card padding="sm">
          <strong>Ad category</strong>
          <p>{result.version.manifest.meta.specialAdCategory}</p>
        </Card>
      </div>
      {result.preflight.findings.length === 0 ? (
        <Card padding="md">
          <strong>No blocking findings.</strong>
          <p>The frozen draft passed the deterministic founding ruleset.</p>
        </Card>
      ) : (
        <div className={styles.findings}>
          {result.preflight.findings.map((finding) => (
            <Card key={finding.ruleCode} padding="md">
              <strong>{finding.ruleCode}</strong>
              <p>{finding.description}</p>
              <small>{finding.remediation}</small>
            </Card>
          ))}
        </div>
      )}
      <a className="oalo-action-link" href={result.detailHref}>
        Open persisted campaign
      </a>
      <details>
        <summary>Immutable evidence</summary>
        <code>{result.version.campaignVersionRef}</code>
        <code>{result.version.manifestHash}</code>
        <code>{result.preflight.resultHash}</code>
      </details>
    </section>
  );
}
