"use client";

import { Button, PasswordField } from "@oalo/ui";
import type { FormEvent, ReactNode } from "react";

import { RESET_PASSWORD } from "../strings.js";
import { AuthProblem } from "./auth-feedback.js";
import styles from "./auth-form.module.css";
import { followNext, useAuthSubmit } from "./use-auth-submit.js";

/**
 * PRD-006a D5 and 006A-AC-018. Choose a new password with the link from the email.
 *
 * The token arrives in the query string and is rendered into this component as a prop rather than
 * read again from the address bar on submit, so the page works the same whether or not the person
 * has navigated within it. It is never written to browser storage and never logged.
 *
 * The confirmation field exists because a typo here would lock the person out again and cost
 * another email.
 */

interface ResetResponse {
  readonly next?: string;
  readonly error?: string;
}

export function ResetPasswordForm({ token }: Readonly<{ token: string }>): ReactNode {
  const { problem, submitting, submit } = useAuthSubmit<ResetResponse>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await submit("/api/auth/reset-password", {
      token,
      password: String(form.get("password") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
    });
    followNext(payload?.next);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      <PasswordField
        autoComplete="new-password"
        label={RESET_PASSWORD.newPasswordLabel}
        minLength={12}
        name="password"
        requirement="required"
      />
      <PasswordField
        autoComplete="new-password"
        label={RESET_PASSWORD.confirmPasswordLabel}
        minLength={12}
        name="confirmPassword"
        requirement="required"
      />
      <Button disabled={submitting} type="submit">
        {RESET_PASSWORD.submitLabel}
      </Button>
    </form>
  );
}
