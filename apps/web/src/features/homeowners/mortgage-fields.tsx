"use client";
import { HomeMortgageSchema, type HomeMortgage } from "@oalo/contracts";
import { Select, TextField } from "@oalo/ui";
import { parseDollarInput } from "./model.js";
import styles from "./homeowners.module.css";

export interface MortgageDraft {
  source: HomeMortgage["source"];
  first: string;
  other: string;
  confirmed: boolean;
  asOf: string;
  original: string;
  rate: string;
  term: string;
  payments: string;
}
export function mortgageDraft(mortgage?: HomeMortgage): MortgageDraft {
  return {
    source: mortgage?.source ?? "unknown",
    first: mortgage?.firstBalanceMinor == null ? "" : String(mortgage.firstBalanceMinor / 100),
    other: mortgage?.otherBalanceMinor == null ? "" : String(mortgage.otherBalanceMinor / 100),
    confirmed: mortgage?.allLiensConfirmed ?? false,
    asOf: mortgage?.asOf ?? new Date().toISOString().slice(0, 10),
    original: mortgage?.loan ? String(mortgage.loan.originalPrincipalMinor / 100) : "",
    rate: mortgage?.loan ? String(mortgage.loan.annualRatePercent) : "",
    term: mortgage?.loan ? String(mortgage.loan.termMonths) : "360",
    payments: mortgage?.loan ? String(mortgage.loan.paymentsMade) : "",
  };
}
export function mortgageFromDraft(draft: MortgageDraft): HomeMortgage {
  if (draft.source === "unknown")
    return HomeMortgageSchema.parse({
      source: "unknown",
      firstBalanceMinor: null,
      otherBalanceMinor: null,
      allLiensConfirmed: false,
      asOf: draft.asOf,
      loan: null,
    });
  if (draft.source === "debt_free")
    return HomeMortgageSchema.parse({
      source: "debt_free",
      firstBalanceMinor: 0,
      otherBalanceMinor: 0,
      allLiensConfirmed: draft.confirmed,
      asOf: draft.asOf,
      loan: null,
    });
  if (draft.source === "amortized" && (!draft.rate.trim() || !draft.payments.trim()))
    throw new Error("Enter the interest rate and number of completed payments.");
  return HomeMortgageSchema.parse({
    source: draft.source,
    firstBalanceMinor: draft.source === "confirmed" ? parseDollarInput(draft.first) : null,
    otherBalanceMinor: parseDollarInput(draft.other),
    allLiensConfirmed: draft.confirmed,
    asOf: draft.asOf,
    loan:
      draft.source === "amortized"
        ? {
            originalPrincipalMinor: parseDollarInput(draft.original),
            annualRatePercent: Number(draft.rate),
            termMonths: Number(draft.term),
            paymentsMade: Number(draft.payments),
          }
        : null,
  });
}
const choices = [
  { value: "unknown", label: "I do not have the mortgage details yet" },
  { value: "confirmed", label: "I have current loan balances" },
  { value: "amortized", label: "Estimate from original loan terms" },
  { value: "debt_free", label: "The property has no secured loans" },
];
export function MortgageFields({
  value,
  onChange,
}: {
  value: MortgageDraft;
  onChange: (draft: MortgageDraft) => void;
}) {
  const update = (key: keyof MortgageDraft, next: string | boolean) =>
    onChange({ ...value, [key]: next });
  return (
    <div className={styles.formStack}>
      <Select
        label="Mortgage information source"
        value={value.source}
        options={choices}
        onValueChange={(source) =>
          onChange({ ...value, source: source as MortgageDraft["source"], confirmed: false })
        }
      />
      {value.source === "confirmed" ? (
        <TextField
          label="Current first mortgage balance"
          value={value.first}
          inputMode="decimal"
          onChange={(event) => update("first", event.target.value)}
          placeholder="325000.00"
          requirement="required"
        />
      ) : null}
      {value.source === "amortized" ? (
        <>
          <div className={styles.formGrid}>
            <TextField
              label="Original loan amount"
              value={value.original}
              inputMode="decimal"
              onChange={(event) => update("original", event.target.value)}
              requirement="required"
            />
            <TextField
              label="Fixed interest rate (%)"
              type="number"
              min="0"
              max="30"
              step="0.001"
              value={value.rate}
              onChange={(event) => update("rate", event.target.value)}
              requirement="required"
            />
            <TextField
              label="Loan term (months)"
              type="number"
              min="1"
              max="600"
              value={value.term}
              onChange={(event) => update("term", event.target.value)}
              requirement="required"
            />
            <TextField
              label="Completed monthly payments"
              type="number"
              min="0"
              max="600"
              value={value.payments}
              onChange={(event) => update("payments", event.target.value)}
              requirement="required"
            />
          </div>
          <p className={styles.note}>
            This estimates a scheduled fixed-rate balance. It does not account for extra repayments,
            missed payments, modifications or fees.
          </p>
        </>
      ) : null}
      {value.source === "confirmed" || value.source === "amortized" ? (
        <>
          <TextField
            label="Other secured loan balances"
            value={value.other}
            inputMode="decimal"
            onChange={(event) => update("other", event.target.value)}
            placeholder="Enter 0 only when confirmed"
          />
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={value.confirmed}
              onChange={(event) => update("confirmed", event.target.checked)}
            />
            <span>
              I have included every mortgage, HELOC and other secured loan. Unknown balances stay
              blank.
            </span>
          </label>
        </>
      ) : null}
      {value.source === "debt_free" ? (
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={value.confirmed}
            onChange={(event) => update("confirmed", event.target.checked)}
          />
          <span>I confirm the property has no mortgage, HELOC or other secured loan balance.</span>
        </label>
      ) : null}
      {value.source === "unknown" ? (
        <p className={styles.note}>
          You can create a property-value report now. Equity and borrowing scenarios will stay
          unavailable until all loan balances are confirmed.
        </p>
      ) : null}
      <TextField
        label="Mortgage information date"
        type="date"
        value={value.asOf}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(event) => update("asOf", event.target.value)}
        requirement="required"
      />
    </div>
  );
}
