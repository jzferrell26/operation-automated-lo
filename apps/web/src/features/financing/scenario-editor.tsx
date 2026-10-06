"use client";

import { Button, FormField, Select, TextArea, TextField } from "@oalo/ui";
import { FINANCING_COPY as COPY } from "../../copy/financing-messages.js";
import type { ScenarioDraft } from "./form-model.js";
import styles from "./financing.module.css";

export function FinancingCheck({
  label,
  checked,
  change,
}: Readonly<{ label: string; checked: boolean; change: (checked: boolean) => void }>) {
  return (
    <FormField className={styles.check} label={label}>
      {(props) => (
        <input
          {...props}
          type="checkbox"
          checked={checked}
          onChange={(event) => change(event.currentTarget.checked)}
        />
      )}
    </FormField>
  );
}

export function ScenarioEditor({
  value: s,
  disabled,
  onChange,
}: Readonly<{
  value: ScenarioDraft;
  disabled: boolean;
  onChange: (value: ScenarioDraft) => void;
}>) {
  const set = <K extends keyof ScenarioDraft>(key: K, value: ScenarioDraft[K]) =>
    onChange({
      ...s,
      [key]: value,
      ...(key === "costs" ? { costsComplete: false } : {}),
      ...(key !== "quoteConfirmed" ? { quoteConfirmed: false } : {}),
    });
  const decimal = (
    label: string,
    key:
      "downPayment" | "rate" | "apr" | "fee" | "mi" | "sellerCredit" | "lenderCredit" | "deposit",
    required = false,
  ) => (
    <TextField
      label={label}
      value={s[key]}
      inputMode="decimal"
      maxLength={16}
      requirement={required ? "required" : "optional"}
      onChange={(event) => set(key, event.currentTarget.value)}
    />
  );
  return (
    <div className={styles.scenario}>
      <div className={styles.fields}>
        <TextField
          label="Scenario name"
          value={s.label}
          maxLength={160}
          requirement="required"
          onChange={(event) => set("label", event.currentTarget.value)}
        />
        <Select
          label="Loan program"
          value={s.program}
          disabled={disabled}
          options={[
            { value: "conventional", label: "Conventional" },
            { value: "fha", label: "FHA" },
            { value: "va", label: "VA" },
          ]}
          onValueChange={(value) => {
            if (value !== "conventional" && value !== "fha" && value !== "va") return;
            onChange({
              ...s,
              program: value,
              quoteConfirmed: false,
              fee: value === "conventional" ? "0" : "",
              feeTreatment: value === "conventional" ? "none" : "financed",
              mi: value === "va" ? "0" : "",
            });
          }}
        />
        {decimal("Down payment %", "downPayment", true)}
        <TextField
          label="Term in months"
          inputMode="numeric"
          value={s.termMonths}
          requirement="required"
          maxLength={3}
          onChange={(event) => set("termMonths", event.currentTarget.value)}
        />
        {decimal("Note rate %", "rate", true)}
        {decimal("APR % (from quote)", "apr")}
        <TextField
          label="Quote source or reference"
          value={s.quoteSource}
          requirement="required"
          maxLength={160}
          onChange={(event) => set("quoteSource", event.currentTarget.value)}
        />
        <TextField
          label="Quote issued (UTC date)"
          type="date"
          value={s.quotedOn}
          requirement="required"
          onChange={(event) => set("quotedOn", event.currentTarget.value)}
        />
        <TextField
          label="Quote valid through (UTC date)"
          type="date"
          value={s.expiresOn}
          requirement="required"
          onChange={(event) => set("expiresOn", event.currentTarget.value)}
        />
        {decimal("Monthly mortgage insurance ($)", "mi")}
        {s.program !== "conventional" ? (
          <>
            {decimal(
              s.program === "fha"
                ? "FHA upfront premium ($, from quote)"
                : "VA funding fee ($, from quote)",
              "fee",
            )}
            <Select
              label="Program fee payment"
              disabled={disabled}
              value={s.feeTreatment}
              options={[
                { value: "financed", label: "Financed into loan" },
                { value: "cash", label: "Paid in cash" },
                { value: "none", label: "None, confirmed zero" },
              ]}
              onValueChange={(value) => {
                if (value === "financed" || value === "cash" || value === "none")
                  onChange({
                    ...s,
                    feeTreatment: value,
                    fee: value === "none" ? "0" : s.fee,
                    quoteConfirmed: false,
                  });
              }}
            />
          </>
        ) : null}
      </div>
      <details className={styles.details}>
        <summary>Closing costs, prepaids, credits, and deposit</summary>
        <p>{COPY.costHint}</p>
        {s.costs.map((cost, index) => (
          <div key={cost.id}>
            <div className={styles.costRow}>
              <TextField
                label={`Cost ${index + 1} name`}
                value={cost.label}
                maxLength={160}
                requirement="required"
                onChange={(event) =>
                  set(
                    "costs",
                    s.costs.map((item) =>
                      item.id === cost.id ? { ...item, label: event.currentTarget.value } : item,
                    ),
                  )
                }
              />
              <Select
                label={`Cost ${index + 1} category`}
                disabled={disabled}
                value={cost.category}
                options={[
                  { value: "closing", label: "Closing cost" },
                  { value: "prepaid", label: "Prepaid" },
                  { value: "escrow", label: "Initial escrow" },
                ]}
                onValueChange={(value) => {
                  if (value === "closing" || value === "prepaid" || value === "escrow")
                    set(
                      "costs",
                      s.costs.map((item) =>
                        item.id === cost.id ? { ...item, category: value } : item,
                      ),
                    );
                }}
              />
              <TextField
                label={`Cost ${index + 1} amount ($)`}
                value={cost.amount}
                inputMode="decimal"
                maxLength={16}
                requirement="required"
                onChange={(event) =>
                  set(
                    "costs",
                    s.costs.map((item) =>
                      item.id === cost.id ? { ...item, amount: event.currentTarget.value } : item,
                    ),
                  )
                }
              />
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  set(
                    "costs",
                    s.costs.filter((item) => item.id !== cost.id),
                  )
                }
              >
                Remove cost {index + 1}
              </Button>
            </div>
            <FinancingCheck
              label={`Cost ${index + 1} was paid before closing`}
              checked={cost.paidBeforeClosing}
              change={(value) =>
                set(
                  "costs",
                  s.costs.map((item) =>
                    item.id === cost.id ? { ...item, paidBeforeClosing: value } : item,
                  ),
                )
              }
            />
          </div>
        ))}
        <Button
          variant="secondary"
          type="button"
          disabled={s.costs.length >= 20}
          onClick={() =>
            set("costs", [
              ...s.costs,
              {
                id: crypto.randomUUID(),
                label: "",
                category: "closing",
                amount: "",
                paidBeforeClosing: false,
              },
            ])
          }
        >
          Add cost
        </Button>
        <FinancingCheck
          label="This cost list is complete, including any intentionally zero costs"
          checked={s.costsComplete}
          change={(value) => set("costsComplete", value)}
        />
        <div className={styles.fields}>
          {decimal("Seller credit ($)", "sellerCredit")}
          {decimal("Lender credit ($)", "lenderCredit")}
          {decimal("Deposit already paid ($)", "deposit")}
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            onChange({
              ...s,
              sellerCredit: "0",
              lenderCredit: "0",
              deposit: "0",
              quoteConfirmed: false,
            })
          }
        >
          Confirm no credits or deposit
        </Button>
      </details>
      <TextArea
        label="Eligibility and quote assumptions"
        value={s.assumptions}
        maxLength={1000}
        rows={2}
        onChange={(event) => set("assumptions", event.currentTarget.value)}
      />
      <FinancingCheck
        label="I have checked these inputs against the stated quote source"
        checked={s.quoteConfirmed}
        change={(value) => set("quoteConfirmed", value)}
      />
    </div>
  );
}
