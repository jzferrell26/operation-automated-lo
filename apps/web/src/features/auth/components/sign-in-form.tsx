"use client";

import { Button, Link, PasswordField, TextField } from "@oalo/ui";
import type { FormEvent, ReactNode } from "react";

import { SIGN_IN } from "../strings.js";
import { AuthProblem } from "./auth-feedback.js";
import styles from "./auth-form.module.css";
import { useAuthSubmit } from "./use-auth-submit.js";
import { useWorkspaceChoice, type WorkspaceChoiceResponse } from "./workspace-choice-form.js";

/**
 * PRD-006a D5 and 006A-AC-032. The sign-in form, and the workspace choice that follows it when a
 * person holds bindings at more than one workspace.
 *
 * Nothing here is written to `localStorage`, `sessionStorage`, or IndexedDB. The choice token and
 * the workspace list live in React state for the life of this page and nowhere else, so closing
 * the tab discards them, which is the right lifetime for a five-minute single-use token.
 *
 * The workspaces come from the server and are chosen by position in the server's own list. This
 * form never sends a workspace name, a location, a role, or a binding, so there is nothing in the
 * request to forge.
 *
 * PRD-006d 006D-AC-003: every field is a `TextField` or a `PasswordField` and every destination is
 * a `Link`, so the label, the description, the error wiring, and the focus ring all come from the
 * primitives rather than from this file. The two boolean controls (keep me signed in, and the
 * workspace radio group) stay native: PRD-006d D4 ships no checkbox or radio primitive, and a
 * native control in a governed label is correct until one exists.
 */

interface SignInResponse extends WorkspaceChoiceResponse {
  readonly error?: string;
}

export interface SignInFormProps {
  readonly signUpEnabled: boolean;
  readonly signedOut: boolean;
}

export function SignInForm({ signUpEnabled, signedOut }: SignInFormProps): ReactNode {
  const { problem, submitting, submit } = useAuthSubmit<SignInResponse>();
  const choice = useWorkspaceChoice(problem, submitting, submit);

  async function handleSignIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    choice.accept(
      await submit("/api/auth/sign-in", {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        keepSignedIn: form.get("keepSignedIn") === "on",
      }),
    );
  }

  if (choice.step !== null) return choice.step;

  return (
    <form className={styles.form} onSubmit={handleSignIn}>
      {signedOut ? <p className={styles.notice}>{SIGN_IN.signedOutNotice}</p> : null}
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      <TextField
        autoComplete="email"
        label={SIGN_IN.emailLabel}
        name="email"
        requirement="required"
        type="email"
      />
      <PasswordField
        autoComplete="current-password"
        label={SIGN_IN.passwordLabel}
        name="password"
        requirement="required"
      />
      <label className={styles.check}>
        <input name="keepSignedIn" type="checkbox" />
        <span>{SIGN_IN.rememberLabel}</span>
      </label>
      <Button disabled={submitting} type="submit">
        {SIGN_IN.submitLabel}
      </Button>
      <p className={styles.footer}>
        <Link href="/forgot-password">{SIGN_IN.forgotLink}</Link>
        {signUpEnabled ? <Link href="/sign-up">{SIGN_IN.signUpPrompt}</Link> : null}
      </p>
      <p className={styles.honesty}>{SIGN_IN.highLevelNote}</p>
    </form>
  );
}
