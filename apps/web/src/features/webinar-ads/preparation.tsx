"use client";
import { WebinarAdPreparationRequestSchema } from "@oalo/contracts";
import { Badge, Button, Card, Link, Select, Stepper, TextArea, TextField } from "@oalo/ui";
import { useRouter } from "next/navigation.js";
import { useEffect, useRef, useState } from "react";
import { AdCreative } from "../campaigns/components/ad-creative.js";
import { addDays } from "../campaigns/launch-model.js";
import { WEBINAR_ADS } from "./catalog.js";
import { WEBINAR_GOALS, type WebinarAd, type WebinarGoal } from "./model.js";
import {
  loadWebinarContext,
  loadWebinarEdit,
  saveWebinarPreparation,
  WebinarSavedSchema,
  WebinarIncompleteSaveSchema,
  webinarMoment,
  webinarRefusal,
  type WebinarContext,
  type WebinarRequest,
} from "./preparation-model.js";
import styles from "./preparation.module.css";
import {
  clearPendingWebinarSave,
  readPendingWebinarSave,
  retainPendingWebinarSave,
} from "./pending-save.js";

type Edit = Readonly<{ campaignRef: string; campaignVersionRef: string }>;
type Fields = {
  headline: string;
  primaryText: string;
  publicationId: string;
  daily: string;
  total: string;
  endsOn: string;
  places: string;
};
const STEPS = ["Choose a creative", "Set up your campaign", "Save for review"] as const;
export function WebinarAdPreparation({ edit }: Readonly<{ edit?: Edit | undefined }>) {
  const [context, setContext] = useState<WebinarContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chosen, setChosen] = useState<WebinarAd | undefined>();
  const [goal, setGoal] = useState<WebinarGoal | undefined>();
  const [fields, setFields] = useState<Fields>({
    headline: "",
    primaryText: "",
    publicationId: "",
    daily: "25",
    total: "350",
    endsOn: addDays(new Date().toISOString().slice(0, 10), 14),
    places: "",
  });
  const [problem, setProblem] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [invalidRetry, setInvalidRetry] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [recordedHref, setRecordedHref] = useState<string | null>(null);
  const [replaceRetry, setReplaceRetry] = useState(false);
  const pending = useRef<WebinarRequest | null>(null);
  const inFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const outcome = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    let active = true;
    setLoadError(null);
    void (async () => {
      try {
        const loaded = await loadWebinarContext();
        const prior =
          edit === undefined
            ? undefined
            : await loadWebinarEdit(edit.campaignRef, edit.campaignVersionRef);
        const retained = readPendingWebinarSave();
        if (retained.kind === "invalid") {
          setInvalidRetry(true);
          throw new Error(
            "A previous local save could not be verified. Nothing was replayed. Open Campaigns to check saved work, then clear the invalid local retry.",
          );
        }
        if (retained.kind === "unavailable")
          throw new Error(
            "This browser cannot retain a safe save retry. Enable storage for this tab or use another browser before preparing an ad.",
          );
        if (retained.kind === "stored") {
          const request = retained.request;
          // Context ownership is checked before any old copy is displayed or any retry is sent.
          if (
            !loaded.destinations.some(
              (choice) => choice.destination.publicationId === request.publicationId,
            )
          )
            throw new Error(
              "A previous save cannot be matched to this account's active publications. Nothing was displayed or replayed. Open the original account or Campaigns to check saved work.",
            );
          if (
            edit !== undefined &&
            (request.campaignRef !== edit.campaignRef ||
              request.expectedCampaignVersionRef !== edit.campaignVersionRef)
          ) {
            setReplaceRetry(true);
            throw new Error(
              "A previous save is awaiting confirmation. Starting this saved campaign's new version requires an explicit new request. Check Campaigns before replacing the local retry.",
            );
          }
          const source = WEBINAR_ADS.find(
            (ad) => ad.id === request.templateId && ad.version === request.templateVersion,
          );
          if (source === undefined)
            throw new Error(
              "The creative for a previous save is unavailable. Open Campaigns to check the saved version before preparing another.",
            );
          if (!active) return;
          setContext(loaded);
          setChosen(source);
          pending.current = request;
          setUncertain(true);
          setStep(3);
          setFields({
            headline: request.headline,
            primaryText: request.primaryText,
            publicationId: request.publicationId,
            daily: String(request.dailyBudgetDollars),
            total: String(request.totalBudgetDollars),
            endsOn: request.endsOn,
            places: request.places.join("; "),
          });
          setProblem(
            "A previous save is awaiting confirmation. Retry this exact preparation to resolve its saved version before making changes.",
          );
          return;
        }
        if (!active) return;
        setContext(loaded);
        if (prior !== undefined) {
          const source = WEBINAR_ADS.find(
            (ad) =>
              ad.id === prior.manifest.template.id &&
              ad.version === prior.manifest.template.version,
          );
          if (source === undefined)
            throw new Error(
              "This creative is unavailable. Return to Campaigns and choose a current creative.",
            );
          setChosen(source);
          setFields({
            headline: prior.manifest.content.headline,
            primaryText: prior.manifest.content.body,
            publicationId: prior.manifest.destination.publicationId,
            daily: String(prior.manifest.meta.dailyBudgetMinor / 100),
            total: String(prior.manifest.meta.totalBudgetMinor / 100),
            endsOn: prior.manifest.schedule.endsAt.slice(0, 10),
            places: [
              ...prior.manifest.meta.targeting.regions,
              ...prior.manifest.meta.targeting.cities,
            ].join("; "),
          });
          setStep(2);
        }
      } catch (error) {
        if (active) {
          setContext(null);
          setLoadError(
            error instanceof Error ? error.message : "Availability could not be checked. Retry.",
          );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [reload, edit?.campaignRef, edit?.campaignVersionRef]);
  useEffect(() => {
    if (problem !== null) outcome.current?.focus();
  }, [problem]);
  function move(next: 1 | 2 | 3) {
    setStep(next);
    setProblem(null);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function change<K extends keyof Fields>(key: K, value: Fields[K]) {
    if (busy || uncertain) return;
    setFields((current) => ({ ...current, [key]: value }));
    setInvalid((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setProblem(null);
  }
  const destination = context?.destinations.find(
    (choice) => choice.destination.publicationId === fields.publicationId,
  );
  const brandReady =
    context?.brand.saved === true &&
    ["name", "company", "nmls", "companyNmls", "disclosureLine"].every(
      (key) => context.brand.band[key as keyof typeof context.brand.band].trim().length > 0,
    );
  const enabled = context?.canPrepare === true && brandReady && destination !== undefined;
  const visible = goal === undefined ? WEBINAR_ADS : WEBINAR_ADS.filter((ad) => ad.goal === goal);
  const errorFor = (key: string) =>
    invalid.has(key) ? "Check this value before saving." : undefined;
  function body(): WebinarRequest | null {
    if (chosen === undefined) return null;
    const request: WebinarRequest = {
      requestId: crypto.randomUUID(),
      templateId: chosen.id,
      templateVersion: chosen.version,
      publicationId: fields.publicationId,
      headline: fields.headline.trim(),
      primaryText: fields.primaryText.trim(),
      endsOn: fields.endsOn,
      dailyBudgetDollars: Number(fields.daily),
      totalBudgetDollars: Number(fields.total),
      places: fields.places
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean),
      ...(edit === undefined
        ? {}
        : { campaignRef: edit.campaignRef, expectedCampaignVersionRef: edit.campaignVersionRef }),
    };
    const parsed = WebinarAdPreparationRequestSchema.safeParse(request);
    if (!parsed.success) {
      setInvalid(new Set(parsed.error.issues.map((issue) => String(issue.path[0]))));
      setProblem(
        "Check the highlighted fields. Add a published webinar, educational words, a valid budget and at least one city or state.",
      );
      return null;
    }
    // Retain the transport input. Parsed places are normalized output and are not the request shape.
    return request;
  }
  async function save() {
    if (inFlight.current || !enabled || conflict) return;
    const request = pending.current ?? body();
    if (request === null) return;
    if (!retainPendingWebinarSave(request)) {
      setProblem(
        "This browser could not retain the exact retry request. Nothing was sent. Enable storage for this tab or use another browser before saving.",
      );
      return;
    }
    pending.current = request;
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const response = await saveWebinarPreparation(request);
      const value: unknown = await response.json();
      if (!response.ok) {
        const error =
          typeof value === "object" &&
          value !== null &&
          "error" in value &&
          typeof value.error === "string"
            ? value.error
            : undefined;
        const retry = response.status >= 500 || response.status === 409;
        setConflict(response.status === 409);
        setUncertain(retry);
        const incomplete = WebinarIncompleteSaveSchema.safeParse(value);
        if (incomplete.success)
          setRecordedHref(`/marketing/campaigns/${incomplete.data.campaignRef}`);
        if (!retry) {
          pending.current = null;
          clearPendingWebinarSave();
        }
        setProblem(
          response.status === 409
            ? "The campaign or creative changed before this save could be confirmed. No new save was started. Open Campaigns and review the latest saved version before preparing another version."
            : error === "WEBINAR_SAVE_INCOMPLETE"
              ? "Your version was recorded, but its checks are unfinished. Retry this exact save to complete them. It is not ready for approval."
              : webinarRefusal(error),
        );
        return;
      }
      const saved = WebinarSavedSchema.safeParse(value);
      if (!saved.success) {
        setUncertain(true);
        setProblem(
          "The save response could not be verified. Retry this exact preparation to confirm its saved version.",
        );
        return;
      }
      setUncertain(false);
      clearPendingWebinarSave();
      router.push(saved.data.detailHref);
    } catch {
      setUncertain(true);
      setProblem(
        "The save response did not arrive. This version may have been recorded. Retry this exact save before changing the campaign.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={styles.page} data-webinar-preparation="">
      <Link href="/marketing/campaigns" variant="sentence">
        Campaigns
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>First-time homebuyer education</p>
        <h1 ref={heading} tabIndex={-1}>
          {edit === undefined ? "Prepare a webinar ad" : "Prepare a new version"}
        </h1>
        <p>
          Choose original artwork, edit your Facebook words and connect your published webinar. Your
          saved brand is included in both downloadable images.
        </p>
      </header>
      <Stepper
        label="Webinar ad preparation"
        steps={STEPS.map((title, index) => ({
          id: String(index + 1),
          title,
          state: index + 1 === step ? "current" : index + 1 < step ? "complete" : "upcoming",
        }))}
      />
      {loadError !== null ? (
        <Card padding="lg">
          <p role="alert">{loadError}</p>
          <Button onClick={() => setReload((value) => value + 1)}>Check availability again</Button>
          {invalidRetry ? (
            <>
              <p>
                Clearing the invalid browser entry does not remove a saved campaign. Check Campaigns
                before starting another preparation.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  if (clearPendingWebinarSave()) {
                    setInvalidRetry(false);
                    setReload((value) => value + 1);
                  }
                }}
              >
                Clear invalid local retry
              </Button>
            </>
          ) : null}
          {replaceRetry ? (
            <>
              <p>
                This replaces only the local retry request. It does not remove or approve the
                earlier saved campaign.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  if (clearPendingWebinarSave()) {
                    setReplaceRetry(false);
                    setConflict(false);
                    setUncertain(false);
                    pending.current = null;
                    setReload((value) => value + 1);
                  }
                }}
              >
                Start this new version instead
              </Button>
            </>
          ) : null}
          <Link href="/brand">Open Brand</Link>
          <Link href="/marketing/campaigns/funnels">Open your funnels</Link>
        </Card>
      ) : context === null ? (
        <p role="status">Checking your saved brand and published webinars.</p>
      ) : (
        <>
          {!brandReady ? (
            <Card padding="lg">
              <p>
                Complete your saved name, company, NMLS details and disclosure before saving an ad.
              </p>
              <Link href="/brand">Open Brand</Link>
            </Card>
          ) : null}
          {context.destinations.length === 0 ? (
            <Card padding="lg">
              <p>
                No active published webinar is available. Publish a live or on-demand webinar in
                your funnels, then check availability again.
              </p>
              <Link href="/marketing/campaigns/funnels">Open your funnels</Link>
              <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>
                Check availability again
              </Button>
            </Card>
          ) : null}
          {step === 1 || chosen === undefined ? (
            <>
              <div role="group" aria-label="Webinar learning topics" className={styles.actions}>
                <Button
                  variant="outline"
                  size="sm"
                  aria-pressed={goal === undefined}
                  onClick={() => setGoal(undefined)}
                >
                  All fifteen
                </Button>
                {(Object.keys(WEBINAR_GOALS) as WebinarGoal[]).map((value) => (
                  <Button
                    variant="outline"
                    size="sm"
                    key={value}
                    aria-pressed={goal === value}
                    onClick={() => setGoal(value)}
                  >
                    {WEBINAR_GOALS[value]}
                  </Button>
                ))}
              </div>
              <ul className={styles.grid}>
                {visible.map((ad) => (
                  <li key={ad.id}>
                    <Card padding="none" className={styles.creative}>
                      <AdCreative
                        advertiser={context.brand.band}
                        alt={ad.art.alt}
                        art={{ tall: ad.art.tall.path, square: ad.art.square.path }}
                        shape="tall"
                        sample={false}
                      />
                      <div className={styles.cardBody}>
                        <p className={styles.eyebrow}>{WEBINAR_GOALS[ad.goal]}</p>
                        <h2>{ad.name}</h2>
                        <p>{ad.learningConnection}</p>
                        <Badge tone="warning">Awaiting your review</Badge>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setChosen(ad);
                            setFields((current) => ({
                              ...current,
                              headline: ad.headline,
                              primaryText: ad.primaryText,
                            }));
                            move(2);
                          }}
                        >
                          Use this creative<span className="oalo-visually-hidden">: {ad.name}</span>
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className={styles.columns}>
              <Card padding="lg" className={styles.stack}>
                <h2>{chosen.name}</h2>
                <p>{chosen.learningConnection}</p>
                {step === 2 ? (
                  <fieldset disabled={busy || uncertain} className={styles.stack}>
                    <legend className="oalo-visually-hidden">Campaign details</legend>
                    <TextField
                      label="Facebook headline"
                      value={fields.headline}
                      maxLength={60}
                      description={fields.headline.length + " of 60 characters"}
                      error={errorFor("headline")}
                      onChange={(event) => change("headline", event.target.value)}
                    />
                    <TextArea
                      label="Facebook ad text"
                      value={fields.primaryText}
                      maxLength={300}
                      rows={5}
                      description={fields.primaryText.length + " of 300 characters"}
                      error={errorFor("primaryText")}
                      onChange={(event) => change("primaryText", event.target.value)}
                    />
                    <p className={styles.note}>
                      The illustrated panel keeps its original lettering. These edited words appear
                      separately in the Facebook placement. Keep them educational, without rates,
                      payments or loan terms.
                    </p>
                    <Select
                      label="Published webinar"
                      value={fields.publicationId}
                      onValueChange={(value) => change("publicationId", value)}
                      error={errorFor("publicationId")}
                      options={context.destinations.map((choice) => ({
                        value: choice.destination.publicationId,
                        label:
                          choice.title +
                          " (" +
                          (choice.destination.kind === "live-webinar" ? "Live" : "On-demand") +
                          ")",
                      }))}
                    />
                    {destination === undefined ? null : (
                      <p>
                        {destination.learningSummary ??
                          "Review the webinar content to confirm it teaches this creative's topic."}
                      </p>
                    )}
                    <TextField
                      label="Daily budget (USD)"
                      type="number"
                      min={5}
                      max={1000}
                      step="0.01"
                      value={fields.daily}
                      error={errorFor("dailyBudgetDollars")}
                      onChange={(event) => change("daily", event.target.value)}
                    />
                    <TextField
                      label="Total budget (USD)"
                      type="number"
                      min={5}
                      max={5000}
                      step="0.01"
                      value={fields.total}
                      error={errorFor("totalBudgetDollars")}
                      onChange={(event) => change("total", event.target.value)}
                    />
                    <TextField
                      label="Requested end date (UTC)"
                      type="date"
                      value={fields.endsOn}
                      error={errorFor("endsOn")}
                      onChange={(event) => change("endsOn", event.target.value)}
                    />
                    <TextArea
                      label="Cities or states"
                      rows={3}
                      value={fields.places}
                      error={errorFor("places")}
                      description="Separate places with semicolons, for example Austin, TX; Texas. No ZIP codes, age or gender targeting."
                      onChange={(event) => change("places", event.target.value)}
                    />
                    <div className={styles.actions}>
                      <Button variant="outline" onClick={() => move(1)}>
                        Back to creatives
                      </Button>
                      <Button
                        onClick={() => {
                          if (body() !== null) move(3);
                        }}
                      >
                        Review setup
                      </Button>
                    </div>
                  </fieldset>
                ) : (
                  <>
                    <dl className={styles.facts}>
                      <div>
                        <dt>Facebook headline</dt>
                        <dd>{fields.headline}</dd>
                      </div>
                      <div>
                        <dt>Facebook ad text</dt>
                        <dd>{fields.primaryText}</dd>
                      </div>
                      <div>
                        <dt>Webinar</dt>
                        <dd>{destination?.title ?? "Choose an active published webinar."}</dd>
                      </div>
                      <div>
                        <dt>Budget</dt>
                        <dd>{"$" + fields.daily + " a day, up to $" + fields.total + " total"}</dd>
                      </div>
                      <div>
                        <dt>Places</dt>
                        <dd>{fields.places}</dd>
                      </div>
                      <div>
                        <dt>Requested end</dt>
                        <dd>{fields.endsOn + " UTC"}</dd>
                      </div>
                    </dl>
                    <p>
                      The saved stop time is the earliest of your requested end, publication expiry
                      and live webinar start. Saving will confirm the exact UTC time.
                    </p>
                    <p>
                      Saving records a version and runs checks. It does not approve, publish, spend
                      money or launch an ad.
                    </p>
                    <div className={styles.actions}>
                      <Button
                        disabled={busy || uncertain}
                        variant="outline"
                        onClick={() => move(2)}
                      >
                        Edit setup
                      </Button>
                      <Button
                        disabled={!enabled || busy || conflict}
                        onClick={() => {
                          void save();
                        }}
                      >
                        {conflict
                          ? "Resolve the saved version first"
                          : busy
                            ? "Saving and checking"
                            : uncertain
                              ? "Retry this exact save"
                              : "Save and check"}
                      </Button>
                    </div>
                    {!enabled ? (
                      <p>
                        Complete your Brand and choose an active published webinar before saving.
                      </p>
                    ) : null}
                  </>
                )}
                {problem === null ? null : (
                  <div ref={outcome} role="alert" tabIndex={-1}>
                    <p>{problem}</p>
                    {recordedHref === null ? null : (
                      <Link href={recordedHref}>Inspect the recorded campaign</Link>
                    )}
                    {conflict ? <Link href="/marketing/campaigns">Open Campaigns</Link> : null}
                  </div>
                )}
              </Card>
              <Card padding="lg" className={styles.stack}>
                <h2>Your placement preview</h2>
                <p>{fields.primaryText}</p>
                <AdCreative
                  advertiser={context.brand.band}
                  alt={chosen.art.alt}
                  art={{ tall: chosen.art.tall.path, square: chosen.art.square.path }}
                  shape="tall"
                  sample={false}
                />
                <h3>{fields.headline}</h3>
                <p className={styles.note}>
                  This preview uses your saved brand. The saved review shows both exact branded PNGs
                  and all saved wording before you approve.
                </p>
                <p className={styles.note}>{context.brand.leadFormWording}</p>
                {destination === undefined ? null : (
                  <p className={styles.note}>
                    Publication available until {webinarMoment(destination.destination.expiresAt)}.
                    Optional HighLevel delivery is a separate setup.
                  </p>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
