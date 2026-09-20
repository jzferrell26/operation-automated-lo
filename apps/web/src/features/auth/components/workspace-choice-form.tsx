"use client";

import { Button } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import { CHOOSE_WORKSPACE, ROLE_LABELS, chooseWorkspaceOptionLabel } from "../strings.js";
import { AuthProblem } from "./auth-feedback.js";
import styles from "./auth-form.module.css";
import { followNext } from "./use-auth-submit.js";

/**
 * PRD-006a D5 and 006A-AC-016. The step where a person who reaches more than one workspace says
 * which one they want.
 *
 * It is reached two ways, which is why it is a component rather than a branch inside the sign-in
 * form: after a sign-in, and after a completed password reset (PRD-006b D10), where the person has
 * just proved control of their inbox and is being signed in without typing their password again.
 * Both hand it the same closed list and the same five-minute single-use token.
 *
 * The workspaces come from the server and are chosen by position in the server's own list. This
 * form never sends a workspace name, a location, a role, or a binding, so there is nothing in the
 * request to forge. Nothing here is written to `localStorage`, `sessionStorage`, or IndexedDB: the
 * token and the list live in the calling form's state for the life of the page and nowhere else,
 * which is the right lifetime for a five-minute single-use token.
 *
 * PRD-006d D4 ships no radio primitive, so the group stays native inside a governed label, which
 * is correct until one exists.
 */

export interface WorkspaceChoice {
  readonly index: number;
  readonly workspaceName: string;
  readonly bindingRole: string;
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

export interface WorkspaceChoiceFormProps {
  readonly problem: string | null;
  readonly submitting: boolean;
  readonly workspaces: readonly WorkspaceChoice[];
  choose(workspaceIndex: number): Promise<void>;
}

export function WorkspaceChoiceForm({
  problem,
  submitting,
  workspaces,
  choose,
}: WorkspaceChoiceFormProps): ReactNode {
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await choose(Number(form.get("workspaceIndex")));
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      <fieldset className={styles.choices}>
        <legend className={styles.choicesLegend}>{CHOOSE_WORKSPACE.title}</legend>
        {workspaces.map((workspace) => (
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

/**
 * The flag the server put on the choose path, read back out of it and sent with the choice.
 *
 * PRD-006b D10: a reset that reaches the choice step still has to end in the workspace that says
 * "Your password is saved. You're signed in." The route composes `next` on the server, this reads
 * the one parameter back out of it, and the choose route accepts it only as the one literal its
 * schema names. Nothing is invented here: when the server stops putting the flag on the path this
 * stops sending it, and no other value the query could hold can produce a path.
 */
function passwordResetFlagFrom(next: string | undefined): string | undefined {
  if (next === undefined) return undefined;
  const separator = next.indexOf("?");
  if (separator < 0) return undefined;
  return new URLSearchParams(next.slice(separator + 1)).get("passwordReset") ?? undefined;
}

/** What a sign-in or a completed reset hands the choice step: a token, a list, and the flag. */
export interface WorkspaceChoiceState {
  readonly token: string;
  readonly workspaces: readonly WorkspaceChoice[];
  readonly passwordReset: string | undefined;
}

export interface WorkspaceChoiceResponse {
  readonly next?: string;
  readonly choiceToken?: string;
  readonly workspaces?: readonly WorkspaceChoice[];
}

/** The choice a route offered, or `undefined` when it offered none and named a path instead. */
function workspaceChoiceFrom(
  payload: Readonly<WorkspaceChoiceResponse>,
): WorkspaceChoiceState | undefined {
  if (payload.choiceToken === undefined || payload.workspaces === undefined) return undefined;
  return Object.freeze({
    token: payload.choiceToken,
    workspaces: payload.workspaces,
    passwordReset: passwordResetFlagFrom(payload.next),
  });
}

/**
 * The choice step wired to the choose route. Both the sign-in form and the reset form render this
 * and nothing else once a choice has been offered, so the request body they send is written once.
 */
function WorkspaceChoiceStep({
  choice,
  problem,
  submitting,
  submit,
}: Readonly<{
  choice: WorkspaceChoiceState;
  problem: string | null;
  submitting: boolean;
  submit(path: string, body: unknown): Promise<Readonly<{ next?: string }> | undefined>;
}>): ReactNode {
  async function choose(workspaceIndex: number): Promise<void> {
    const payload = await submit("/api/auth/choose", {
      choiceToken: choice.token,
      workspaceIndex,
      ...(choice.passwordReset === undefined ? {} : { passwordReset: choice.passwordReset }),
    });
    followNext(payload?.next);
  }

  return (
    <WorkspaceChoiceForm
      choose={choose}
      problem={problem}
      submitting={submitting}
      workspaces={choice.workspaces}
    />
  );
}

export interface WorkspaceChoiceGate {
  /** The choice step to render instead of the form, or `null` while no choice has been offered. */
  readonly step: ReactNode | null;
  /**
   * Takes what a route answered: shows the choice step when one was offered, follows the path the
   * route named otherwise, and does nothing at all when the submit already reported a problem.
   */
  accept(payload: Readonly<WorkspaceChoiceResponse> | undefined): void;
}

/**
 * The whole choice step, owned in one place: the state, the response it is built from, and the
 * step itself.
 *
 * Two forms reach it, the sign-in form and the reset form (PRD-006b D10), and before this hook
 * existed each one carried its own copy of "was a choice offered, or is this a path to follow".
 * Two copies of that question are two chances for one of them to forget the reset flag.
 */
export function useWorkspaceChoice(
  problem: string | null,
  submitting: boolean,
  submit: (path: string, body: unknown) => Promise<Readonly<{ next?: string }> | undefined>,
): WorkspaceChoiceGate {
  const [choice, setChoice] = useState<WorkspaceChoiceState | null>(null);
  return {
    step:
      choice === null ? null : (
        <WorkspaceChoiceStep
          choice={choice}
          problem={problem}
          submit={submit}
          submitting={submitting}
        />
      ),
    accept(payload) {
      if (payload === undefined) return;
      const offered = workspaceChoiceFrom(payload);
      if (offered !== undefined) {
        setChoice(offered);
        return;
      }
      followNext(payload.next);
    },
  };
}
