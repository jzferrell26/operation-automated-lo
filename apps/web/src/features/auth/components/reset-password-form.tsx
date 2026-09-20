"use client";

import { Button, PasswordField } from "@oalo/ui";
import type { FormEvent, ReactNode } from "react";

import { RESET_PASSWORD } from "../strings.js";
import { AuthProblem } from "./auth-feedback.js";
import styles from "./auth-form.module.css";
import { useAuthSubmit } from "./use-auth-submit.js";
import { useWorkspaceChoice, type WorkspaceChoiceResponse } from "./workspace-choice-form.js";

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

interface ResetResponse extends WorkspaceChoiceResponse {
  readonly error?: string;
}

export function ResetPasswordForm({ token }: Readonly<{ token: string }>): ReactNode {
  const { problem, submitting, submit } = useAuthSubmit<ResetResponse>();
  /**
   * PRD-006a D5 and PRD-006b D10. A person with bindings at more than one workspace answers the
   * choice here rather than being sent to a page that would have to ask them to sign in again with
   * the password they have only just chosen. The five-minute single-use token and the closed list
   * live in this state for the life of the page and are never written to browser storage.
   *
   * `passwordReset` is the flag the reset route put on the choose path it named, read back out and
   * sent with the choice, so the workspace this ends in still says the password is saved.
   */
  const choice = useWorkspaceChoice(problem, submitting, submit);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    choice.accept(
      await submit("/api/auth/reset-password", {
        token,
        password: String(form.get("password") ?? ""),
        confirmPassword: String(form.get("confirmPassword") ?? ""),
      }),
    );
  }

  if (choice.step !== null) return choice.step;

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
