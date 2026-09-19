"use client";

import { Button, Card, Icon } from "@oalo/ui";
import { useState, type FormEvent } from "react";

import {
  CHECK_RESULT_NEEDS_CHANGES,
  CHECK_RESULT_READY,
  SUPPORT_DETAILS_LABELS,
} from "../../../copy/user-language.js";
import { isMappedErrorCode, userMessageSentence } from "../../http/user-messages.js";
import { postInternalJson } from "../../http/internal-api.js";
import { SupportDetails } from "../../shell/components/support-details.js";
import styles from "./open-house-draft-builder.module.css";

type PreflightResponse = Readonly<{
  state: string;
  detailHref: string;
  campaignRef: string;
  campaignVersionRef: string;
  manifestHash: string;
  preflightResultHash: string;
  blocking: boolean;
  findings: readonly {
    severity: "blocking" | "warning";
    ruleCode: string;
    description: string;
    remediation: string;
  }[];
  headline: string;
  propertyAddress: string;
  realtorDisplayName: string;
  dailyBudgetMinor: number;
  totalBudgetMinor: number;
  specialAdCategory: string;
  persistenceKind: "filesystem" | "postgres";
  providerPublicationAuthorized: false;
}>;

export function OpenHouseDraftBuilder() {
  const [result, setResult] = useState<PreflightResponse | null>(null);
  /**
   * `null` means nothing has gone wrong. `undefined` means something went wrong and the route gave
   * us no code to map, which renders the generic sentence plus the support reference.
   */
  const [errorCode, setErrorCode] = useState<string | null | undefined>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorCode(null);
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
        /**
         * The route answers with a code. PRD-006b D7 says a code never reaches a status line, so
         * the code is mapped to sentences here and kept only for the support region below.
         */
        const record = payload as { error?: string };
        setErrorCode(record.error);
        return;
      }
      setErrorCode(null);
      setResult(payload as PreflightResponse);
    } catch {
      setErrorCode(undefined);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Open House Boost</p>
          <h1>Create an Open House Boost</h1>
          <p>
            Tell us about the open house. We&apos;ll check it against the rules before anyone
            approves it.
          </p>
        </div>
      </header>

      <Card className={styles.notice} padding="md">
        <Icon decorative name="lock" size="sm" tone="info" />
        <div>
          <strong>Nothing goes out from this page</strong>
          <p>This is saved to your workspace. It doesn&apos;t publish, spend, or send anything.</p>
        </div>
      </Card>

      <form className={styles.form} onSubmit={handleSubmit}>
        <fieldset>
          <legend>The property and the open house</legend>
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
            <input name="propertyPermissionConfirmed" type="checkbox" /> I have permission to market
            this property.
          </label>
          <label className={styles.check}>
            <input name="realtorPermissionConfirmed" type="checkbox" /> I have permission to use the
            Realtor&apos;s materials.
          </label>
        </fieldset>

        <fieldset>
          <legend>What the ad says</legend>
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
          <legend>Budget and area</legend>
          <label>
            Where the ad runs
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
          <p className={styles.hint}>
            Housing ads have their own rules. We apply them for you, every time.
          </p>
        </fieldset>

        <Button disabled={submitting} type="submit">
          {submitting ? "Running the checks" : "Save and run the checks"}
        </Button>
      </form>

      {errorCode === null ? null : (
        <Card padding="md">
          <strong>We couldn&apos;t save this yet</strong>
          <p>{userMessageSentence(errorCode)}</p>
          {isMappedErrorCode(errorCode) ? null : (
            <SupportDetails
              rows={[[SUPPORT_DETAILS_LABELS.supportReference, errorCode ?? "Not recorded"]]}
            />
          )}
        </Card>
      )}
      {result ? <CampaignCheckResult result={result} /> : null}
    </div>
  );
}

function CampaignCheckResult({ result }: Readonly<{ result: PreflightResponse }>) {
  const dollars = (minor: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
  const headline = result.blocking ? CHECK_RESULT_NEEDS_CHANGES : CHECK_RESULT_READY;
  return (
    <section className={styles.review} aria-labelledby="campaign-check-title">
      <div className={styles.reviewHeading}>
        <div>
          <p className={styles.eyebrow}>Saved</p>
          <h2 id="campaign-check-title">{headline}</h2>
        </div>
        <span data-blocking={result.blocking}>{headline}</span>
      </div>
      <div className={styles.summaryGrid}>
        <Card padding="sm">
          <strong>Property</strong>
          <p>{result.propertyAddress}</p>
        </Card>
        <Card padding="sm">
          <strong>Realtor</strong>
          <p>{result.realtorDisplayName}</p>
        </Card>
        <Card padding="sm">
          <strong>Budget</strong>
          <p>
            {dollars(result.dailyBudgetMinor)} / day · {dollars(result.totalBudgetMinor)} total
          </p>
        </Card>
        <Card padding="sm">
          <strong>Ad category</strong>
          <p>{result.specialAdCategory}</p>
        </Card>
      </div>
      {result.findings.length === 0 ? (
        <Card padding="md">
          <strong>Nothing to fix.</strong>
          <p>This campaign meets every rule we check. An approver can sign off on it now.</p>
        </Card>
      ) : (
        <div className={styles.findings}>
          {result.findings.map((finding) => (
            <CampaignCheckFinding finding={finding} key={finding.ruleCode} />
          ))}
        </div>
      )}
      <a className="oalo-action-link" href={result.detailHref}>
        Open campaign
      </a>
      <SupportDetails
        rows={[
          [SUPPORT_DETAILS_LABELS.versionId, result.campaignVersionRef],
          [SUPPORT_DETAILS_LABELS.contentFingerprint, result.manifestHash],
          [SUPPORT_DETAILS_LABELS.checkFingerprint, result.preflightResultHash],
        ]}
      />
    </section>
  );
}

/**
 * One thing the checks found. The plain explanation comes first and the fix second, because that is
 * the order a loan officer needs them in; the rule's code is real and stays, one region down.
 */
function CampaignCheckFinding({
  finding,
}: Readonly<{ finding: PreflightResponse["findings"][number] }>) {
  return (
    <Card padding="md">
      <strong>{finding.description}</strong>
      <p>{finding.remediation}</p>
      <small>
        {finding.severity === "blocking" ? "Fix this before approving" : "Worth a look"}
      </small>
      <SupportDetails rows={[[SUPPORT_DETAILS_LABELS.rule, finding.ruleCode]]} />
    </Card>
  );
}
