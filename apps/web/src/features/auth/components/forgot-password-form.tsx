"use client";

import { Button } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import { FORGOT_PASSWORD_COPY } from "../strings.js";
import { AuthField, AuthNotice, AuthProblem } from "./auth-field.js";
import styles from "./auth-form.module.css";
import { useAuthSubmit } from "./use-auth-submit.js";

/**
 * PRD-006a D5 and 006A-AC-017. One confirmation, always.
 *
 * The page never says whether an address has an account, because saying so would let anyone turn
 * this form into an account-existence oracle. The server answers the same way for every address,
 * and this form shows the same sentence for every answer.
 */

export function ForgotPasswordForm(): ReactNode {
  const { problem, submitting, submit } = useAuthSubmit();
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await submit("/api/auth/forgot-password", {
      email: String(form.get("email") ?? ""),
    });
    if (payload !== undefined) setSent(true);
  }

  if (sent) return <AuthNotice>{FORGOT_PASSWORD_COPY.confirmation}</AuthNotice>;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      <AuthField
        autoComplete="email"
        label={FORGOT_PASSWORD_COPY.emailLabel}
        name="email"
        type="email"
      />
      <Button disabled={submitting} type="submit">
        {FORGOT_PASSWORD_COPY.submitLabel}
      </Button>
      <p className={styles.footer}>
        <a className="oalo-action-link" href="/sign-in">
          Sign in
        </a>
      </p>
    </form>
  );
}
