"use client";

import { US_STATES } from "@oalo/contracts";
import { Button, Link, Select, Surface, TextArea, TextField } from "@oalo/ui";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation.js";
import { FINANCING_COPY as COPY } from "../../copy/financing-messages.js";
import { postInternalJson } from "../http/internal-api.js";
import { userMessageSentence } from "../http/user-messages.js";
import { FinancingCorrectionSchema } from "./model.js";
import {
  FINANCING_API_PATH,
  FinancingRequestSchema,
  FinancingSavedSchema,
  type FinancingFormContext,
} from "./model.js";
import {
  emptyFinancingDraft,
  financingFormInput,
  reusedFinancingDraft,
  type FinancingFormDraft,
} from "./form-model.js";
import { FinancingCheck, ScenarioEditor } from "./scenario-editor.js";
import styles from "./financing.module.css";

export function FinancingForm({
  context,
  source,
}: Readonly<{ context: FinancingFormContext; source?: string }>) {
  const initial = context.previous.find((item) => item.campaignRef === source);
  const [draft, setDraft] = useState<FinancingFormDraft>(() =>
    initial ? reusedFinancingDraft(initial.input) : emptyFinancingDraft(),
  );
  const [reused, setReused] = useState(Boolean(initial));
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false),
    requestId = useRef<string | null>(null),
    problemRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const enabled = context.canSave && context.brandReady && context.partners.length > 0;
  const disabled = !enabled || busy || saved;
  useEffect(() => {
    if (problem) problemRef.current?.focus();
  }, [problem]);
  const change = <K extends keyof FinancingFormDraft>(key: K, value: FinancingFormDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const propertyChange = (
    key:
      "address" | "stateCode" | "description" | "price" | "taxes" | "insurance" | "hoa" | "other",
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      [key]: value,
      propertyPermissionConfirmed: false,
      scenarios: current.scenarios.map((scenario) => ({ ...scenario, quoteConfirmed: false })),
    }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending.current) return;
    requestId.current ??= crypto.randomUUID();
    const input = FinancingRequestSchema.safeParse(financingFormInput(draft, requestId.current));
    if (!input.success) {
      setProblem(COPY.invalid);
      return;
    }
    pending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const response = await postInternalJson(FINANCING_API_PATH, input.data);
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 409)
          requestId.current = null;
        const correction =
          response.status === 400 || response.status === 404
            ? FinancingCorrectionSchema.safeParse(await response.json())
            : null;
        setProblem(
          response.status === 409
            ? COPY.conflict
            : correction?.success
              ? userMessageSentence(correction.data.error)
              : COPY.failed,
        );
        return;
      }
      const result = FinancingSavedSchema.safeParse(await response.json());
      if (!result.success) {
        setProblem(COPY.failed);
        return;
      }
      setSaved(true);
      router.push(`/marketing/campaigns/${result.data.campaignRef}`);
    } catch {
      setProblem(COPY.failed);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={styles.page} data-financing-form="">
      <header className={styles.header}>
        <Link href="/marketing/campaigns" variant="sentence">
          {COPY.back}
        </Link>
        <h1>{COPY.title}</h1>
        <p>{COPY.intro}</p>
        <p className={styles.notice}>{COPY.privateNotice}</p>
      </header>
      {context.synthetic ? (
        <p>Local demonstration. Use made-up property and quote details only.</p>
      ) : null}
      {!context.canSave ? <p>{COPY.noAccess}</p> : null}
      {!context.brandReady ? (
        <p>
          {COPY.missingBrand} <Link href="/brand">Review Brand</Link>
        </p>
      ) : (
        <p>
          Your saved brand: <strong>{context.brandName}</strong>
        </p>
      )}
      {!context.partners.length ? (
        <p>
          {COPY.missingPartner} <Link href="/partners">Realtor partners</Link>
        </p>
      ) : null}
      <form className={styles.form} onSubmit={(event) => void submit(event)} noValidate>
        {problem ? (
          <div ref={problemRef} className={styles.problem} role="alert" tabIndex={-1}>
            {problem}
          </div>
        ) : null}
        <fieldset
          className={styles.fieldset}
          disabled={disabled}
          aria-label="Financing report details"
        >
          {context.previous.length ? (
            <Surface padding="lg">
              <Select
                label="Reuse a saved comparison"
                value=""
                placeholder="Choose a previous setup"
                disabled={disabled}
                options={context.previous.map((item) => ({
                  value: item.campaignRef,
                  label: item.label,
                }))}
                onValueChange={(ref) => {
                  const found = context.previous.find((item) => item.campaignRef === ref);
                  if (found) {
                    setDraft(reusedFinancingDraft(found.input));
                    setReused(true);
                  }
                }}
              />
              {reused ? <p>{COPY.repeatNotice}</p> : null}
            </Surface>
          ) : null}
          <Surface padding="lg">
            <h2>{COPY.property}</h2>
            <div className={styles.fields}>
              <TextField
                label="Property address"
                value={draft.address}
                maxLength={300}
                requirement="required"
                onChange={(event) => propertyChange("address", event.currentTarget.value)}
              />
              <Select
                label="State"
                value={draft.stateCode}
                placeholder="Choose a state"
                requirement="required"
                disabled={disabled}
                options={Object.entries(US_STATES).map(([value, label]) => ({ value, label }))}
                onValueChange={(value) => propertyChange("stateCode", value)}
              />
              <TextField
                label="Purchase price ($)"
                value={draft.price}
                inputMode="decimal"
                maxLength={16}
                requirement="required"
                onChange={(event) => propertyChange("price", event.currentTarget.value)}
              />
              <Select
                label="Realtor partner"
                value={draft.partnerId}
                placeholder="Choose your saved partner"
                requirement="required"
                disabled={disabled}
                options={context.partners.map((item) => ({
                  value: item.id,
                  label: `${item.name}, ${item.company}`,
                }))}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    partnerId: value,
                    realtorPermissionConfirmed: false,
                  }))
                }
              />
            </div>
            <TextArea
              label="Property description"
              value={draft.description}
              requirement="required"
              maxLength={1800}
              rows={3}
              onChange={(event) => propertyChange("description", event.currentTarget.value)}
            />
          </Surface>
          <Surface padding="lg">
            <h2>{COPY.housing}</h2>
            <p>{COPY.housingHint}</p>
            <div className={styles.fields}>
              {(
                [
                  ["Monthly property taxes ($)", "taxes"],
                  ["Monthly homeowners insurance ($)", "insurance"],
                  ["Monthly HOA ($)", "hoa"],
                  ["Other monthly housing costs ($)", "other"],
                ] as const
              ).map(([label, key]) => (
                <TextField
                  key={key}
                  label={label}
                  value={draft[key]}
                  inputMode="decimal"
                  maxLength={16}
                  onChange={(event) => propertyChange(key, event.currentTarget.value)}
                />
              ))}
            </div>
          </Surface>
          <Surface padding="lg">
            <h2>Financing scenarios</h2>
            <p>{COPY.scopeNote}</p>
            {draft.scenarios.map((scenario, index) => (
              <details
                key={scenario.id}
                className={styles.details}
                open={draft.scenarios.length === 1 ? true : undefined}
              >
                <summary>
                  Scenario {index + 1}: {scenario.label || "Untitled option"}
                </summary>
                <ScenarioEditor
                  value={scenario}
                  disabled={disabled}
                  onChange={(value) =>
                    change(
                      "scenarios",
                      draft.scenarios.map((item) => (item.id === scenario.id ? value : item)),
                    )
                  }
                />
                {draft.scenarios.length > 1 ? (
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() =>
                      change(
                        "scenarios",
                        draft.scenarios.filter((item) => item.id !== scenario.id),
                      )
                    }
                  >
                    Remove scenario {index + 1}
                  </Button>
                ) : null}
              </details>
            ))}
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || draft.scenarios.length >= 5}
              onClick={() => {
                const previous = draft.scenarios[draft.scenarios.length - 1];
                if (!previous) return;
                change("scenarios", [
                  ...draft.scenarios,
                  {
                    ...previous,
                    id: crypto.randomUUID(),
                    label: `Option ${draft.scenarios.length + 1}`,
                    quoteConfirmed: false,
                    costs: previous.costs.map((cost) => ({ ...cost, id: crypto.randomUUID() })),
                  },
                ]);
              }}
            >
              Add comparison option
            </Button>
          </Surface>
          <Surface padding="lg">
            <h2>Marketing permission</h2>
            <FinancingCheck
              label="I have permission to market this property"
              checked={draft.propertyPermissionConfirmed}
              change={(value) => change("propertyPermissionConfirmed", value)}
            />
            <FinancingCheck
              label="The Realtor permits their identity on these shared materials"
              checked={draft.realtorPermissionConfirmed}
              change={(value) => change("realtorPermissionConfirmed", value)}
            />
            <p>{COPY.photoNote}</p>
          </Surface>
        </fieldset>
        <div className={styles.actions}>
          <Button type="submit" disabled={disabled}>
            {saved ? COPY.saved : busy ? COPY.saving : COPY.save}
          </Button>
          <Link href="/marketing/campaigns">{COPY.back}</Link>
        </div>
      </form>
    </div>
  );
}
