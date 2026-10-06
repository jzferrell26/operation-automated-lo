"use client";

import { Button, Icon, Link, TextArea, TextField, FormField } from "@oalo/ui";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { z } from "zod";
import { FUNNEL_COPY as COPY } from "../../copy/funnel-messages.js";
import { postInternalJson } from "../http/internal-api.js";
import { FUNNELS, funnelDefinition } from "./catalog.js";
import { FIELD_GROUPS } from "./fields.js";
import {
  FUNNEL_API,
  FUNNEL_ROOT,
  FUNNEL_TEMPLATE_VERSION,
  FunnelPhotoSchema,
  FunnelSaveResponseSchema,
  FunnelSaveSchema,
  type FunnelFields,
  type FunnelKind,
  type FunnelStep,
  type FunnelStudioContext,
} from "./model.js";
import { FunnelSurface } from "./surface.js";
import styles from "./studio.module.css";

export function FunnelCatalog({ context }: Readonly<{ context: FunnelStudioContext }>) {
  return (
    <div className={styles.catalog}>
      <header className={styles.catalogHead}>
        <div>
          <p className={styles.eyebrow}>{COPY.eyebrow}</p>
          <h1>{COPY.title}</h1>
          <p className={styles.lead}>{COPY.intro}</p>
        </div>
        <span className={styles.designed}>
          <Icon decorative name="layers" />
          FIELD-ONLY EDITING
        </span>
      </header>
      <p className={styles.notice}>
        <Icon decorative name="lock" size="sm" />
        {COPY.private}
      </p>
      <div className={styles.catalogGrid}>
        {FUNNELS.map((funnel, index) => {
          const draft = context.drafts.find((item) => item.kind === funnel.kind);
          return (
            <article className={styles.catalogCard} key={funnel.kind}>
              <div className={styles.thumbnail} aria-hidden="true" inert>
                <div className={styles.miniature}>
                  <FunnelSurface
                    kind={funnel.kind}
                    fields={draft?.fields ?? funnel.defaults}
                    brand={draft?.brand ?? context.brand}
                    step="landing"
                    onStep={() => undefined}
                    compact
                  />
                </div>
                <span className={styles.cardNumber}>0{index + 1}</span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardHeading}>
                  <h2>{funnel.name}</h2>
                  <span>{funnel.steps.length} pages</span>
                </div>
                <p>{funnel.description}</p>
                <div className={styles.journey}>
                  {funnel.steps.map((step, i) => (
                    <span key={step.id}>
                      {i > 0 ? <Icon decorative name="chevron-right" size="sm" /> : null}
                      {step.label}
                    </span>
                  ))}
                </div>
                <div className={styles.cardFooter}>
                  <span>{draft ? COPY.saved : COPY.initial}</span>
                  <Link variant="action" href={`${FUNNEL_ROOT}/${funnel.kind}`}>
                    {COPY.edit}
                    <Icon decorative name="arrow-right" size="sm" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className={styles.bottomNote}>
        <Icon decorative name="check" size="sm" />
        {COPY.noFakeProof}
      </p>
    </div>
  );
}

function localEventValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
const photoReply = z.object({ photo: FunnelPhotoSchema }).strict();
export function FunnelEditor({
  kind,
  context,
  fullPreview = false,
}: Readonly<{ kind: FunnelKind; context: FunnelStudioContext; fullPreview?: boolean }>) {
  const definition = funnelDefinition(kind);
  const stored = context.drafts.find((item) => item.kind === kind);
  const [fields, setFields] = useState<FunnelFields>(
    stored?.fields ?? structuredClone(definition.defaults),
  );
  const [baseline, setBaseline] = useState<FunnelFields>(
    stored?.fields ?? structuredClone(definition.defaults),
  );
  const [revision, setRevision] = useState(stored?.revision ?? null);
  const [brand, setBrand] = useState(stored?.brand ?? context.brand);
  const [step, setStep] = useState<FunnelStep>("landing");
  const [section, setSection] = useState("message");
  const [size, setSize] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false),
    [problem, setProblem] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const requestId = useRef<string | null>(null),
    pending = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null),
    heroRef = useRef<HTMLInputElement>(null),
    hostRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  const dirty = JSON.stringify(fields) !== JSON.stringify(baseline);
  const disabled = !context.canSave || busy || photoBusy;
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    const preview = previewRef.current;
    if (preview) {
      preview.scrollTop = 0;
      preview.scrollIntoView?.({ block: "start" });
      preview
        .querySelector<HTMLElement>("[data-funnel-surface] h2")
        ?.focus({ preventScroll: true });
    }
  }, [step]);
  useEffect(() => {
    if (problem) errorRef.current?.focus();
  }, [problem]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function change<K extends keyof FunnelFields>(key: K, value: FunnelFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setInvalid((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }
  function openPhoto(slot: "heroPhoto" | "hostPhoto") {
    setSection("photos");
    setTimeout(() => (slot === "heroPhoto" ? heroRef : hostRef).current?.focus(), 0);
  }
  async function upload(event: ChangeEvent<HTMLInputElement>, slot: "heroPhoto" | "hostPhoto") {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = "";
    if (file.size > 3_000_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProblem(COPY.uploadFailed);
      return;
    }
    setPhotoBusy(true);
    setProblem(null);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Unreadable photo"));
        reader.onerror = () => reject(new Error("Unreadable photo"));
        reader.readAsDataURL(file);
      });
      const response = await postInternalJson(`${FUNNEL_API}/photo`, {
        data,
        alt: slot === "hostPhoto" ? brand.name || "Webinar host" : fields.offerTitle,
      });
      const result = photoReply.safeParse(await response.json());
      if (!response.ok || !result.success) {
        setProblem(COPY.uploadFailed);
        return;
      }
      change(slot, result.data.photo);
      change("mediaPermissionConfirmed", false);
    } catch {
      setProblem(COPY.uploadFailed);
    } finally {
      setPhotoBusy(false);
    }
  }
  async function save() {
    if (disabled || pending.current || !context.brandReady) return;
    requestId.current ??= crypto.randomUUID();
    const parsed = FunnelSaveSchema.safeParse({
      kind,
      templateVersion: FUNNEL_TEMPLATE_VERSION,
      fields,
      expectedRevision: revision,
      requestId: requestId.current,
    });
    if (!parsed.success) {
      setInvalid(new Set(parsed.error.issues.map((issue) => String(issue.path[1]))));
      const key = String(parsed.error.issues[0]?.path[1] ?? "headline");
      const affected = FIELD_GROUPS.find((item) => item.fields.some((field) => field.key === key));
      setSection(
        affected?.id ??
          (key.startsWith("event") ? "details" : key.includes("Photo") ? "photos" : "message"),
      );
      setProblem(COPY.invalid);
      return;
    }
    if ((fields.heroPhoto || fields.hostPhoto) && !fields.mediaPermissionConfirmed) {
      setSection("photos");
      setProblem(COPY.mediaPermission);
      return;
    }
    pending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const response = await postInternalJson(FUNNEL_API, parsed.data);
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 409)
          requestId.current = null;
        setProblem(response.status === 409 ? COPY.conflict : COPY.failed);
        return;
      }
      const result = FunnelSaveResponseSchema.safeParse(await response.json());
      if (!result.success) {
        setProblem(COPY.failed);
        return;
      }
      setFields(result.data.draft.fields);
      setBaseline(result.data.draft.fields);
      setBrand(result.data.draft.brand);
      setRevision(result.data.draft.revision);
      requestId.current = null;
    } catch {
      setProblem(COPY.failed);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const group = FIELD_GROUPS.find((item) => item.id === section) ?? FIELD_GROUPS[0];
  return (
    <div className={`${styles.editor} ${fullPreview ? styles.full : ""}`}>
      <header className={styles.editorHead}>
        <div>
          <Link variant="sentence" href={fullPreview ? `${FUNNEL_ROOT}/${kind}` : FUNNEL_ROOT}>
            {fullPreview ? COPY.edit : COPY.back}
          </Link>
          <h1>{definition.name}</h1>
          <p>{COPY.fieldOnly}</p>
        </div>
        <div className={styles.saveBar}>
          {!fullPreview ? (
            <>
              <span role="status">
                {busy ? COPY.saving : dirty ? COPY.unsaved : revision ? COPY.saved : COPY.initial}
              </span>
              <Button
                type="button"
                disabled={disabled || !context.brandReady}
                onClick={() => void save()}
              >
                {busy ? COPY.saving : COPY.save}
              </Button>
            </>
          ) : (
            <Link variant="action" href={`${FUNNEL_ROOT}/${kind}`}>
              {COPY.edit}
            </Link>
          )}
        </div>
      </header>
      <p className={styles.notice}>
        <Icon decorative name="lock" size="sm" />
        {COPY.private}
      </p>
      {!context.canSave && !fullPreview ? <p className={styles.notice}>{COPY.readOnly}</p> : null}
      {!context.brandReady && !fullPreview ? (
        <p className={styles.notice}>
          {COPY.brandMissing}{" "}
          <Link variant="sentence" href="/brand">
            {COPY.brandLink}
          </Link>
        </p>
      ) : null}
      {problem ? (
        <div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>
          {problem}
          {problem === COPY.conflict ? (
            <Link href={`${FUNNEL_ROOT}/${kind}`} external>
              Open saved version
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className={styles.editorGrid}>
        {!fullPreview ? (
          <aside className={styles.controls} aria-label={COPY.editor}>
            <div className={styles.sectionPicker}>
              <FormField label={COPY.section}>
                {(control) => (
                  <select
                    {...control}
                    value={section}
                    onChange={(event) => setSection(event.target.value)}
                  >
                    {FIELD_GROUPS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                    <option value="photos">Photos</option>
                  </select>
                )}
              </FormField>
            </div>
            <div className={styles.controlFields}>
              <fieldset disabled={disabled} className={styles.fieldset}>
                <legend>{section === "photos" ? COPY.permissions : group?.label}</legend>
                {section === "photos" ? (
                  <>
                    <p>{COPY.photoNote}</p>
                    {(["heroPhoto", "hostPhoto"] as const).map((slot) => (
                      <div className={styles.photoField} key={slot}>
                        {fields[slot] ? (
                          <img src={fields[slot].dataUrl} alt={fields[slot].alt} />
                        ) : (
                          <div className={styles.photoEmpty}>
                            <Icon decorative name="image" size="lg" />
                          </div>
                        )}
                        <TextField
                          label={slot === "heroPhoto" ? COPY.uploadHero : COPY.uploadHost}
                          ref={slot === "heroPhoto" ? heroRef : hostRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => void upload(event, slot)}
                        />
                        {fields[slot] ? (
                          <>
                            <TextField
                              label={
                                slot === "heroPhoto"
                                  ? "Cover photo description"
                                  : "Host photo description"
                              }
                              value={fields[slot].alt}
                              maxLength={180}
                              error={invalid.has(slot) ? COPY.invalid : undefined}
                              onChange={(event) => {
                                const photo = fields[slot];
                                if (photo)
                                  change(slot, { ...photo, alt: event.currentTarget.value });
                              }}
                            />
                            <Button
                              variant="secondary"
                              type="button"
                              onClick={() => change(slot, null)}
                            >
                              {COPY.removePhoto}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ))}
                    <FormField label={COPY.mediaPermission}>
                      {(control) => (
                        <input
                          {...control}
                          type="checkbox"
                          checked={fields.mediaPermissionConfirmed}
                          onChange={(event) =>
                            change("mediaPermissionConfirmed", event.currentTarget.checked)
                          }
                        />
                      )}
                    </FormField>
                    {photoBusy ? <p role="status">{COPY.uploadBusy}</p> : null}
                  </>
                ) : (
                  <>
                    <p className={styles.fieldNote}>{group?.description}</p>
                    {group?.fields
                      .filter((field) => !field.kinds || field.kinds.includes(kind))
                      .map((field) =>
                        field.multiline ? (
                          <TextArea
                            key={field.key}
                            label={field.label}
                            name={field.key}
                            rows={4}
                            maxLength={1200}
                            value={fields[field.key]}
                            error={invalid.has(field.key) ? COPY.invalid : undefined}
                            onChange={(event) => change(field.key, event.currentTarget.value)}
                          />
                        ) : (
                          <TextField
                            key={field.key}
                            label={field.label}
                            name={field.key}
                            maxLength={field.key.endsWith("Url") ? 1500 : 150}
                            value={fields[field.key]}
                            error={invalid.has(field.key) ? COPY.invalid : undefined}
                            onChange={(event) => change(field.key, event.currentTarget.value)}
                          />
                        ),
                      )}
                    {section === "details" && kind === "live-webinar" ? (
                      <>
                        <TextField
                          label="Event starts (your device time zone)"
                          type="datetime-local"
                          error={invalid.has("eventStartsAt") ? COPY.invalid : undefined}
                          value={localEventValue(fields.eventStartsAt)}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            change("eventStartsAt", value ? new Date(value).toISOString() : "");
                            change(
                              "eventTimeZone",
                              Intl.DateTimeFormat().resolvedOptions().timeZone,
                            );
                          }}
                        />
                        <p className={styles.fieldNote}>
                          Saved event time zone: {fields.eventTimeZone}. Enter the time as it
                          appears on your device.
                        </p>
                        <TextField
                          label="Session length in minutes"
                          type="number"
                          error={invalid.has("eventDurationMinutes") ? COPY.invalid : undefined}
                          min={15}
                          max={240}
                          value={String(fields.eventDurationMinutes)}
                          onChange={(event) =>
                            change("eventDurationMinutes", Number(event.currentTarget.value))
                          }
                        />
                      </>
                    ) : null}
                  </>
                )}
              </fieldset>
            </div>
            <div className={styles.controlFooter}>
              <p>{COPY.savedBoundary}</p>
              <Link variant="sentence" href={`${FUNNEL_ROOT}/${kind}/preview`} external>
                {COPY.preview}
              </Link>
              <small>The full preview uses your last saved version.</small>
            </div>
          </aside>
        ) : null}
        <section className={styles.previewArea} aria-label={COPY.previewTitle}>
          <div className={styles.previewToolbar}>
            <nav aria-label={COPY.pages}>
              {definition.steps.map((item) => (
                <Button
                  variant="secondary"
                  type="button"
                  key={item.id}
                  aria-current={step === item.id ? "step" : undefined}
                  onClick={() => setStep(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>
            <div className={styles.sizes}>
              <Button
                variant="secondary"
                type="button"
                aria-pressed={size === "desktop"}
                aria-label={COPY.desktop}
                onClick={() => setSize("desktop")}
              >
                <Icon decorative name="monitor" size="sm" />
              </Button>
              <Button
                variant="secondary"
                type="button"
                aria-pressed={size === "mobile"}
                aria-label={COPY.mobile}
                onClick={() => setSize("mobile")}
              >
                <Icon decorative name="panel-left" size="sm" />
              </Button>
            </div>
          </div>
          <div className={styles.previewScroll} ref={previewRef}>
            <div className={styles.previewFrame} data-size={size}>
              <FunnelSurface
                key={`${kind}:${step}`}
                kind={kind}
                fields={fields}
                brand={brand}
                step={step}
                onStep={setStep}
                {...(!disabled && !fullPreview ? { onPhoto: openPhoto } : {})}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
