"use client";

import { US_STATES } from "@oalo/contracts";
import { Button, Card, FormField, Link, Select, TextArea, TextField } from "@oalo/ui";
import { useRouter } from "next/navigation.js";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { PROPERTY_CAMPAIGN_COPY as COPY } from "../../copy/property-campaign-messages.js";
import { FINANCING_CREATE_PATH } from "../financing/model.js";
import { FINANCING_COPY } from "../../copy/financing-messages.js";
import { FUNNEL_ROOT } from "../funnels/model.js";
import layout from "../campaigns/components/launch.module.css";
import { postInternalJson } from "../http/internal-api.js";
import {
  PROPERTY_CAMPAIGN_API_PATH,
  PropertyCampaignRequestSchema,
  PropertyCampaignSavedSchema,
  type PropertyCampaignFormData,
  type PropertyCampaignRequest,
} from "./model.js";
import styles from "./property-campaign.module.css";
import composer from "./property-composer.module.css";
import { PROPERTY_SUMMARY } from "../../copy/campaign-studio-messages.js";
import { PropertyFormSummary } from "./property-form-summary.js";

type PropertyDraftFields = Omit<PropertyCampaignRequest, "requestId">;

const EMPTY: Readonly<PropertyDraftFields> = Object.freeze({
  address: "",
  stateCode: "",
  description: "",
  startsAt: "",
  endsAt: "",
  partnerId: "",
  propertyPermissionConfirmed: false,
  realtorPermissionConfirmed: false,
});

function toInstant(value: string): string {
  const time = new Date(value);
  return Number.isFinite(time.getTime()) ? time.toISOString() : value;
}

/** A separate preparation path. It does not replace the existing curated-ad experience. */
export function PropertyCampaignForm({ data }: Readonly<{ data: PropertyCampaignFormData }>) {
  const router = useRouter();
  const [fields, setFields] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const requestId = useRef<string | null>(null);
  const pending = useRef(false);
  const problemRef = useRef<HTMLDivElement>(null);
  const enabled = data.canSave && data.brandReady && data.partners.length > 0;

  useEffect(() => {
    if (problem !== null) problemRef.current?.focus();
  }, [problem]);

  function change<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setInvalid((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || pending.current || saved) return;
    requestId.current ??= crypto.randomUUID();
    const parsed = PropertyCampaignRequestSchema.safeParse({
      ...fields,
      startsAt: toInstant(fields.startsAt),
      endsAt: toInstant(fields.endsAt),
      requestId: requestId.current,
    });
    if (!parsed.success) {
      setInvalid(new Set(parsed.error.issues.map((issue) => String(issue.path[0]))));
      setProblem(COPY.invalid);
      return;
    }
    pending.current = true;
    setBusy(true);
    setProblem(null);
    setInvalid(new Set());
    try {
      const response = await postInternalJson(PROPERTY_CAMPAIGN_API_PATH, parsed.data);
      if (!response.ok) {
        // A timeout/server refusal can follow a successful write. Keep its key for a safe retry.
        if (response.status >= 400 && response.status < 500 && response.status !== 409) {
          requestId.current = null;
        }
        setProblem(response.status === 409 ? COPY.conflict : COPY.saveFailed);
        return;
      }
      const result = PropertyCampaignSavedSchema.safeParse(await response.json());
      if (!result.success) {
        setProblem(COPY.saveFailed);
        return;
      }
      setSaved(true);
      router.push(`/marketing/campaigns/${result.data.campaignRef}`);
    } catch {
      setProblem(COPY.saveFailed);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const errorFor = (name: string) => (invalid.has(name) ? COPY.invalid : undefined);
  return (
    <div className={`${layout.page} ${composer.page}`} data-property-preparation="">
      <header className={layout.header}>
        <Link className={composer.crumb} href="/marketing/campaigns" variant="sentence">
          {COPY.campaigns}
        </Link>
        <div className={layout.headText}>
          <p className={layout.note}>{COPY.eyebrow}</p>
          <h1>{COPY.title}</h1>
          <p className={layout.lead}>{COPY.intro}</p>
          <Link href={FINANCING_CREATE_PATH} variant="sentence">
            {FINANCING_COPY.title}
          </Link>
          <Link href={FUNNEL_ROOT} variant="sentence">
            Explore your five funnels
          </Link>
        </div>
      </header>
      <ol className={composer.sequence} aria-label={PROPERTY_SUMMARY.sequenceLabel}>
        {PROPERTY_SUMMARY.sequence.map((step, index) => (
          <li key={step} aria-current={index === 0 ? "step" : undefined}>
            <span className={composer.step} aria-hidden="true">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {data.synthetic ? <p className={layout.locked}>{COPY.synthetic}</p> : null}
      <div className={composer.composer}>
        <Card padding="lg" className={composer.formCard}>
          <form className={layout.form} noValidate onSubmit={(event) => void submit(event)}>
            <p className={layout.note}>{COPY.boundary}</p>
            {!data.canSave ? <p>{COPY.role}</p> : null}
            {!data.brandReady ? (
              <div>
                <p>{COPY.brandMissing}</p>
                <Link href="/brand">{COPY.brandAction}</Link>
              </div>
            ) : (
              <p>
                {COPY.brandLabel}: <strong>{data.brandName}</strong>
              </p>
            )}
            {data.partners.length === 0 ? (
              <div>
                <p>{COPY.partnersMissing}</p>
                <Link href="/partners">{COPY.partnersAction}</Link>
              </div>
            ) : null}
            {problem === null ? null : (
              <div ref={problemRef} className={layout.problem} role="alert" tabIndex={-1}>
                {problem}
              </div>
            )}
            <fieldset
              aria-label={COPY.title}
              className={styles.fieldset}
              disabled={!enabled || busy || saved}
            >
              <section className={layout.section} aria-labelledby="property-details-title">
                <div className={composer.sectionHeading}>
                  <span aria-hidden="true">01</span>
                  <h2 id="property-details-title">{COPY.propertyTitle}</h2>
                </div>
                <TextField
                  label={COPY.addressLabel}
                  name="address"
                  value={fields.address}
                  requirement="required"
                  maxLength={300}
                  error={errorFor("address")}
                  onChange={(event) => change("address", event.currentTarget.value)}
                />
                <Select
                  label={COPY.stateLabel}
                  name="stateCode"
                  value={fields.stateCode}
                  requirement="required"
                  placeholder={COPY.statePlaceholder}
                  error={errorFor("stateCode")}
                  options={Object.entries(US_STATES).map(([value, label]) => ({ value, label }))}
                  disabled={!enabled || busy || saved}
                  onValueChange={(value) => change("stateCode", value)}
                />
                <TextArea
                  label={COPY.descriptionLabel}
                  name="description"
                  value={fields.description}
                  requirement="required"
                  maxLength={3000}
                  rows={4}
                  error={errorFor("description")}
                  onChange={(event) => change("description", event.currentTarget.value)}
                />
                <Select
                  label={COPY.partnerLabel}
                  name="partnerId"
                  value={fields.partnerId}
                  requirement="required"
                  placeholder={COPY.partnerPlaceholder}
                  error={errorFor("partnerId")}
                  options={data.partners.map((partner) => ({
                    value: partner.id,
                    label: `${partner.name}, ${partner.company}`,
                  }))}
                  disabled={!enabled || busy || saved}
                  onValueChange={(value) => {
                    change("partnerId", value);
                    change("realtorPermissionConfirmed", false);
                  }}
                />
              </section>
              <section className={layout.section} aria-labelledby="property-event-title">
                <div className={composer.sectionHeading}>
                  <span aria-hidden="true">02</span>
                  <h2 id="property-event-title">{COPY.eventTitle}</h2>
                </div>
                <p className={layout.note}>{COPY.timeNote}</p>
                <div className={layout.pair}>
                  <TextField
                    label={COPY.startsLabel}
                    name="startsAt"
                    type="datetime-local"
                    requirement="required"
                    value={fields.startsAt}
                    error={errorFor("startsAt")}
                    onChange={(event) => change("startsAt", event.currentTarget.value)}
                  />
                  <TextField
                    label={COPY.endsLabel}
                    name="endsAt"
                    type="datetime-local"
                    requirement="required"
                    value={fields.endsAt}
                    error={errorFor("endsAt")}
                    onChange={(event) => change("endsAt", event.currentTarget.value)}
                  />
                </div>
              </section>
              <section className={layout.section} aria-labelledby="property-permission-title">
                <div className={composer.sectionHeading}>
                  <span aria-hidden="true">03</span>
                  <h2 id="property-permission-title">{COPY.permissionTitle}</h2>
                </div>
                <FormField className={styles.permission} label={COPY.propertyPermission}>
                  {(control) => (
                    <input
                      {...control}
                      type="checkbox"
                      checked={fields.propertyPermissionConfirmed}
                      onChange={(event) =>
                        change("propertyPermissionConfirmed", event.currentTarget.checked)
                      }
                    />
                  )}
                </FormField>
                <FormField className={styles.permission} label={COPY.partnerPermission}>
                  {(control) => (
                    <input
                      {...control}
                      type="checkbox"
                      checked={fields.realtorPermissionConfirmed}
                      onChange={(event) =>
                        change("realtorPermissionConfirmed", event.currentTarget.checked)
                      }
                    />
                  )}
                </FormField>
                <p className={layout.note}>{COPY.permissionNote}</p>
              </section>
            </fieldset>
            <div className={`${layout.actions} ${composer.saveActions}`}>
              <Link href="/marketing/campaigns">{COPY.campaigns}</Link>
              <Button type="submit" disabled={!enabled || busy || saved}>
                {saved ? COPY.saved : busy ? COPY.saving : COPY.save}
              </Button>
            </div>
          </form>
        </Card>
        <PropertyFormSummary
          address={fields.address}
          description={fields.description}
          brandName={data.brandReady ? data.brandName : ""}
          partner={data.partners.find((partner) => partner.id === fields.partnerId)}
        />
      </div>
    </div>
  );
}
