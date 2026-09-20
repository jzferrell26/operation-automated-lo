"use client";

import { Button, Link, TextField } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import { FORGOT_PASSWORD, SIGN_IN } from "../strings.js";
import { AuthNotice, AuthProblem } from "./auth-feedback.js";
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

  if (sent) return <AuthNotice>{FORGOT_PASSWORD.confirmation}</AuthNotice>;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      <TextField
        autoComplete="email"
        label={FORGOT_PASSWORD.emailLabel}
        name="email"
        requirement="required"
        type="email"
      />
      <Button disabled={submitting} type="submit">
        {FORGOT_PASSWORD.submitLabel}
      </Button>
      <p className={styles.footer}>
        <Link href="/sign-in">{SIGN_IN.submitLabel}</Link>
      </p>
    </form>
  );
}
