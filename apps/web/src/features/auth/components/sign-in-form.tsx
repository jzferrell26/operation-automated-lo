"use client";

import { Button, Link, PasswordField, TextField } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import { CHOOSE_WORKSPACE, ROLE_LABELS, SIGN_IN, chooseWorkspaceOptionLabel } from "../strings.js";
import { AuthProblem } from "./auth-feedback.js";
import styles from "./auth-form.module.css";
import { followNext, useAuthSubmit } from "./use-auth-submit.js";

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

interface WorkspaceChoice {
  readonly index: number;
  readonly workspaceName: string;
  readonly bindingRole: string;
}

interface SignInResponse {
  readonly next?: string;
  readonly error?: string;
  readonly choiceToken?: string;
  readonly workspaces?: readonly WorkspaceChoice[];
}

/**
 * The label a person reads for each binding role. PRD-005a D2 maps the database roles to session
 * roles; PRD-006b's `ROLE_LABELS` maps those to words, and this is the composition of the two.
 */
const BINDING_ROLE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  location_admin: ROLE_LABELS.location_admin,
  creator: ROLE_LABELS.campaign_creator,
  approver: ROLE_LABELS.campaign_approver,
  publisher: ROLE_LABELS.campaign_publisher,
  analyst: ROLE_LABELS.viewer,
});

export interface SignInFormProps {
  readonly signUpEnabled: boolean;
  readonly signedOut: boolean;
}

export function SignInForm({ signUpEnabled, signedOut }: SignInFormProps): ReactNode {
  const { problem, submitting, submit } = useAuthSubmit<SignInResponse>();
  const [choice, setChoice] = useState<Readonly<{
    token: string;
    workspaces: readonly WorkspaceChoice[];
  }> | null>(null);

  async function handleSignIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await submit("/api/auth/sign-in", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      keepSignedIn: form.get("keepSignedIn") === "on",
    });
    if (payload === undefined) return;
    if (payload.choiceToken !== undefined && payload.workspaces !== undefined) {
      setChoice({ token: payload.choiceToken, workspaces: payload.workspaces });
      return;
    }
    followNext(payload.next);
  }

  async function handleChoice(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (choice === null) return;
    const form = new FormData(event.currentTarget);
    const payload = await submit("/api/auth/choose", {
      choiceToken: choice.token,
      workspaceIndex: Number(form.get("workspaceIndex")),
    });
    followNext(payload?.next);
  }

  if (choice !== null) {
    return (
      <form className={styles.form} onSubmit={handleChoice}>
        {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
        <fieldset className={styles.choices}>
          <legend className={styles.choicesLegend}>{CHOOSE_WORKSPACE.title}</legend>
          {choice.workspaces.map((workspace) => (
            <label className={styles.check} key={workspace.index}>
              <input
                defaultChecked={workspace.index === 0}
                name="workspaceIndex"
                type="radio"
                value={workspace.index}
              />
              <span>
                {chooseWorkspaceOptionLabel(
                  workspace.workspaceName,
                  BINDING_ROLE_LABELS[workspace.bindingRole] ?? "",
                )}
              </span>
            </label>
          ))}
        </fieldset>
        <Button disabled={submitting} type="submit">
          {CHOOSE_WORKSPACE.submitLabel}
        </Button>
      </form>
    );
  }

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
