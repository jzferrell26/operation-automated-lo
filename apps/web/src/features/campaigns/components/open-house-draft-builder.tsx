"use client";

import { Button, Card, Icon, Link, LiveRegion, TextArea, TextField } from "@oalo/ui";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  CAMPAIGN_FIELD_NEEDS_A_LOOK,
  CHECK_RESULT_NEEDS_CHANGES,
  CHECK_RESULT_READY,
  SUPPORT_DETAILS_LABELS,
} from "../../../copy/user-language.js";
import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import { GUIDED_SETUP_ANCHORS } from "../../guided-setup/anchor-registry.js";
import { useGuidedSetup } from "../../guided-setup/guided-setup-context.js";
import {
  CAMPAIGN_FIELD_PLACEHOLDERS,
  campaignDraftPrefill,
  type SetupProfile,
} from "../../guided-setup/model/profile.js";
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

/**
 * PRD-006d 006D-AC-011. The controls a refusal named, keyed by the control's own `name`.
 *
 * The route hands back the schema's issues, each with a path whose first segment is the field. The
 * words on screen are this product's one sentence, never the schema's message: a refusal a person
 * reads must say what to do, and "String must contain at least 3 character(s)" says what a library
 * thinks. Anything the route sends that is not a list of issues with a leading string segment
 * produces no marks at all, and the status line above the form still says what happened.
 */
export function fieldsTheRouteNamed(issues: unknown): Readonly<Record<string, string>> {
  if (!Array.isArray(issues)) return {};
  const named: Record<string, string> = {};
  for (const issue of issues) {
    if (typeof issue !== "object" || issue === null) continue;
    const path = (issue as { path?: unknown }).path;
    if (!Array.isArray(path)) continue;
    const field = path[0];
    if (typeof field !== "string" || field === "") continue;
    named[field] = CAMPAIGN_FIELD_NEEDS_A_LOOK;
  }
  return named;
}

/**
 * PRD-006c D3's prefill rule. The demo defaults this screen shipped with are gone.
 *
 * Every field is now either derived from the profile the guided setup collected, or empty with a
 * placeholder that says what belongs there, or one of five pieces of starter wording that the
 * screen labels as starter wording. A signed-in user never sees a value the product invented and
 * presented as theirs: "123 Main Street, Dallas" reads exactly like an address somebody typed, and
 * an approver has no way to tell the difference.
 *
 * `profile` is passed in by the page, which reads it on the server, so this component makes no
 * request of its own to find out who the user is.
 */
export function OpenHouseDraftBuilder({
  profile,
}: Readonly<{ profile?: SetupProfile | undefined }> = {}) {
  const [result, setResult] = useState<PreflightResponse | null>(null);
  /**
   * `null` means nothing has gone wrong. `undefined` means something went wrong and the route gave
   * us no code to map, which renders the generic sentence plus the support reference.
   */
  const [errorCode, setErrorCode] = useState<string | null | undefined>(null);
  /**
   * PRD-006d 006D-AC-011. Which controls the route named, so the mark is on the field rather than
   * only in a sentence telling somebody to look for it.
   *
   * The draft route answers a schema refusal with the issues themselves
   * (`apps/web/src/server/campaign-preflight-handler.ts:17`), and every issue's first path segment
   * is the control's own `name`, because the schema keys and the form's field names are one list.
   * Nothing the route wrote reaches the screen: the sentence a person reads is this product's.
   */
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  /**
   * Counts refusals rather than recording one, because two refusals in a row carry the same code
   * and the second still has to move a person's attention back to the top of a fourteen-field form.
   */
  const [refusals, setRefusals] = useState(0);
  const problemRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const guidedSetup = useGuidedSetup();
  /**
   * The walkthrough's own copy wins when it has one. The page reads the profile on the server, and
   * the step before this one writes it a moment earlier, so on a client navigation the server's
   * copy can be one write behind. Preferring the copy in memory means the Realtor's name the user
   * just typed is already in the field when the screen appears, rather than a render later.
   */
  const prefill = campaignDraftPrefill(guidedSetup?.profile ?? profile);

  /**
   * 006D-AC-011, the half a component test cannot show: the message has to be on screen without
   * scrolling on the frame it occurs in, and the control that produced it is at the bottom of a
   * fourteen-field form. Moving focus to the message is what brings it into view and what puts a
   * keyboard user one Tab away from the first field rather than fourteen Shift Tabs away.
   *
   * The region is not in the tab order, so the keyboard walk gains no stop from it.
   */
  useEffect(() => {
    if (refusals === 0) return;
    problemRef.current?.focus();
  }, [refusals]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorCode(null);
    setFieldErrors({});
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
        const record = payload as { error?: string; issues?: unknown };
        setErrorCode(record.error);
        setFieldErrors(fieldsTheRouteNamed(record.issues));
        setRefusals((count) => count + 1);
        return;
      }
      setErrorCode(null);
      const saved = payload as PreflightResponse;
      setResult(saved);
      // PRD-006c D3 step 4. The walkthrough finishes this step when the checks have actually run,
      // which only this component knows. It is a callback up the tree the builder is already in.
      guidedSetup?.reportCampaignSaved({
        campaignRef: saved.campaignRef,
        detailHref: saved.detailHref,
        findings: saved.findings,
      });
    } catch {
      setErrorCode(undefined);
      setRefusals((count) => count + 1);
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
        {/*
          PRD-006d 006D-AC-011 and rubric axis 9. A failed save says what happened and what to do
          next, above the first field, through the product's announcer.

          Until 2026-09-20 it was a plain card below fourteen fields: unconnected, unannounced, and
          off the screen at 390 from where the control that produced it sits. The account screens
          had said the same kind of thing the right way since Wave 7b, which is the whole argument
          for it being one primitive rather than a pattern each screen remembers separately.

          `alert` urgency, not `status`: this is a refusal to understand, and the register the auth
          forms use for exactly that. It brings its own surface with it, from `primitives.css`, so
          this screen states no rule of its own for it. The support reference stays inside the
          collapsed region, so no code reaches a status line (PRD-006b D7).
        */}
        {errorCode === null ? null : (
          <LiveRegion
            ref={problemRef}
            message={
              <>
                <strong>We couldn&apos;t save this yet</strong>
                <span>{userMessageSentence(errorCode)}</span>
                {isMappedErrorCode(errorCode) ? null : (
                  <SupportDetails
                    rows={[[SUPPORT_DETAILS_LABELS.supportReference, errorCode ?? "Not recorded"]]}
                  />
                )}
              </>
            }
            tabIndex={-1}
            urgency="alert"
            visible
          />
        )}
        <fieldset className={styles.fieldset}>
          <legend>The property and the open house</legend>
          <div className={styles.group} data-tour={GUIDED_SETUP_ANCHORS.campaignCreateAddress}>
            <TextField
              defaultValue=""
              label="Property address"
              error={fieldErrors["address"]}
              name="address"
              placeholder={CAMPAIGN_FIELD_PLACEHOLDERS.address}
              requirement="required"
            />
            <TextField
              defaultValue=""
              label="State"
              maxLength={2}
              error={fieldErrors["stateCode"]}
              name="stateCode"
              placeholder={CAMPAIGN_FIELD_PLACEHOLDERS.stateCode}
              requirement="required"
            />
            <TextArea
              defaultValue=""
              label="Property description"
              error={fieldErrors["propertyDescription"]}
              name="propertyDescription"
              placeholder={CAMPAIGN_FIELD_PLACEHOLDERS.propertyDescription}
              requirement="required"
            />
          </div>
          <div className={styles.group} data-tour={GUIDED_SETUP_ANCHORS.campaignCreateDates}>
            <TextField
              label="Open house starts"
              error={fieldErrors["openHouseStartsAt"]}
              name="openHouseStartsAt"
              requirement="required"
              tone="data"
              type="datetime-local"
            />
            <TextField
              label="Open house ends"
              error={fieldErrors["openHouseEndsAt"]}
              name="openHouseEndsAt"
              requirement="required"
              tone="data"
              type="datetime-local"
            />
          </div>
          <div className={styles.group} data-tour={GUIDED_SETUP_ANCHORS.campaignCreateRealtor}>
            <TextField
              defaultValue={prefill.realtorDisplayName}
              label="Realtor name"
              error={fieldErrors["realtorDisplayName"]}
              name="realtorDisplayName"
              placeholder={CAMPAIGN_FIELD_PLACEHOLDERS.realtorDisplayName}
              requirement="required"
            />
          </div>
          <div className={styles.group} data-tour={GUIDED_SETUP_ANCHORS.campaignCreatePermissions}>
            <label className={styles.check}>
              <input name="propertyPermissionConfirmed" type="checkbox" />
              <span>I have permission to market this property.</span>
            </label>
            <label className={styles.check}>
              <input name="realtorPermissionConfirmed" type="checkbox" />
              <span>I have permission to use the Realtor&apos;s materials.</span>
            </label>
          </div>
        </fieldset>

        <fieldset
          className={styles.fieldset}
          data-tour={GUIDED_SETUP_ANCHORS.campaignCreateHeadline}
        >
          <legend>What the ad says</legend>
          <p className={styles.hint}>{GUIDED_SETUP_STEPS.createCampaign.starterTextNote}</p>
          <div className={styles.group}>
            <TextField
              defaultValue={prefill.headline}
              label="Headline"
              error={fieldErrors["headline"]}
              name="headline"
              requirement="required"
            />
            <TextArea
              defaultValue={prefill.body}
              label="Body"
              error={fieldErrors["body"]}
              name="body"
              requirement="required"
            />
            <TextField
              defaultValue={prefill.callToAction}
              label="Call to action"
              error={fieldErrors["callToAction"]}
              name="callToAction"
              requirement="required"
            />
            <TextArea
              defaultValue={prefill.disclosureText}
              label="Disclosure"
              error={fieldErrors["disclosureText"]}
              name="disclosureText"
              requirement="required"
            />
            <TextArea
              defaultValue={prefill.consentText}
              label="Lead consent"
              error={fieldErrors["consentText"]}
              name="consentText"
              requirement="required"
            />
          </div>
        </fieldset>

        <fieldset className={styles.fieldset} data-tour={GUIDED_SETUP_ANCHORS.campaignCreateBudget}>
          <legend>Budget and area</legend>
          <div className={styles.group}>
            <TextField
              defaultValue={prefill.region}
              label="Where the ad runs"
              error={fieldErrors["region"]}
              name="region"
              placeholder={CAMPAIGN_FIELD_PLACEHOLDERS.region}
              requirement="required"
            />
            <TextField
              defaultValue={prefill.dailyBudgetDollars}
              label="Daily budget ($)"
              min="5"
              error={fieldErrors["dailyBudgetDollars"]}
              name="dailyBudgetDollars"
              requirement="required"
              step="1"
              tone="data"
              type="number"
            />
            <TextField
              defaultValue={prefill.totalBudgetDollars}
              label="Total budget ($)"
              min="5"
              error={fieldErrors["totalBudgetDollars"]}
              name="totalBudgetDollars"
              requirement="required"
              step="1"
              tone="data"
              type="number"
            />
          </div>
          <p className={styles.hint}>
            Housing ads have their own rules. We apply them for you, every time.
          </p>
        </fieldset>

        <Button
          data-tour={GUIDED_SETUP_ANCHORS.campaignCreateSubmit}
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Running the checks" : "Save and run the checks"}
        </Button>
      </form>

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
      {/* No guided-setup anchor here on purpose: step 5 reads the result on the campaign's own
          page, which is where the walkthrough sends the user next, and an id that existed on two
          screens would let a step point at whichever happened to render. */}
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
      <div className={styles.findings}>
        {result.findings.length === 0 ? (
          <Card padding="md">
            <strong>Nothing to fix.</strong>
            <p>This campaign meets every rule we check. An approver can sign off on it now.</p>
          </Card>
        ) : (
          result.findings.map((finding) => (
            <CampaignCheckFinding finding={finding} key={finding.ruleCode} />
          ))
        )}
      </div>
      <Link href={result.detailHref} variant="action">
        Open campaign
      </Link>
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
