"use client";

import { Button } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  CHOOSE_WORKSPACE_COPY,
  ROLE_LABELS_FOR_PEOPLE,
  SIGN_IN_COPY,
  workspaceOptionLabel,
} from "../strings.js";
import { AuthField, AuthProblem } from "./auth-field.js";
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
 * roles; PRD-006b D3 maps those to words, and this is the composition of the two.
 */
const BINDING_ROLE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  location_admin: ROLE_LABELS_FOR_PEOPLE.location_admin,
  creator: ROLE_LABELS_FOR_PEOPLE.campaign_creator,
  approver: ROLE_LABELS_FOR_PEOPLE.campaign_approver,
  publisher: ROLE_LABELS_FOR_PEOPLE.campaign_publisher,
  analyst: ROLE_LABELS_FOR_PEOPLE.viewer,
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
        <h2>{CHOOSE_WORKSPACE_COPY.title}</h2>
        {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
        <ul className={styles.choices}>
          {choice.workspaces.map((workspace) => (
            <li key={workspace.index}>
              <label className={styles.check}>
                <input
                  defaultChecked={workspace.index === 0}
                  name="workspaceIndex"
                  type="radio"
                  value={workspace.index}
                />
                {workspaceOptionLabel(
                  workspace.workspaceName,
                  BINDING_ROLE_LABELS[workspace.bindingRole] ?? "",
                )}
              </label>
            </li>
          ))}
        </ul>
        <Button disabled={submitting} type="submit">
          {CHOOSE_WORKSPACE_COPY.submitLabel}
        </Button>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSignIn}>
      {signedOut ? <p className={styles.notice}>{SIGN_IN_COPY.signedOutNotice}</p> : null}
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      <AuthField autoComplete="email" label={SIGN_IN_COPY.emailLabel} name="email" type="email" />
      <AuthField
        autoComplete="current-password"
        label={SIGN_IN_COPY.passwordLabel}
        name="password"
        type="password"
      />
      <label className={styles.check}>
        <input name="keepSignedIn" type="checkbox" />
        {SIGN_IN_COPY.rememberLabel}
      </label>
      <Button disabled={submitting} type="submit">
        {SIGN_IN_COPY.submitLabel}
      </Button>
      <p className={styles.footer}>
        <a className="oalo-action-link" href="/forgot-password">
          {SIGN_IN_COPY.forgotLink}
        </a>
        {signUpEnabled ? (
          <a className="oalo-action-link" href="/sign-up">
            {SIGN_IN_COPY.signUpFooter}
          </a>
        ) : null}
      </p>
      <p className={styles.honesty}>{SIGN_IN_COPY.honesty}</p>
    </form>
  );
}
