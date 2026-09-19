"use client";

import { Button } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import { CHANGE_PASSWORD_COPY } from "../strings.js";
import { AuthField, AuthNotice, AuthProblem } from "./auth-field.js";
import styles from "./auth-form.module.css";
import { useAuthSubmit } from "./use-auth-submit.js";

/**
 * PRD-006a D5 and 006A-AC-023. Change a password from inside the product.
 *
 * This form runs with a session, so the shared submit sends the session-bound token the shell
 * rendered and the request goes through the full mutation gate. The session doing the changing
 * survives; every other session the person holds is revoked, which is what the success sentence
 * tells them.
 */

export function ChangePasswordForm(): ReactNode {
  const { problem, submitting, submit } = useAuthSubmit();
  const [changed, setChanged] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setChanged(false);
    const form = new FormData(event.currentTarget);
    const payload = await submit("/api/auth/change-password", {
      currentPassword: String(form.get("currentPassword") ?? ""),
      newPassword: String(form.get("newPassword") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
    });
    if (payload !== undefined) setChanged(true);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      {changed ? <AuthNotice>{CHANGE_PASSWORD_COPY.success}</AuthNotice> : null}
      <AuthField
        autoComplete="current-password"
        label={CHANGE_PASSWORD_COPY.currentPasswordLabel}
        name="currentPassword"
        type="password"
      />
      <AuthField
        autoComplete="new-password"
        label={CHANGE_PASSWORD_COPY.newPasswordLabel}
        minLength={12}
        name="newPassword"
        type="password"
      />
      <AuthField
        autoComplete="new-password"
        label={CHANGE_PASSWORD_COPY.confirmPasswordLabel}
        minLength={12}
        name="confirmPassword"
        type="password"
      />
      <Button disabled={submitting} type="submit">
        {CHANGE_PASSWORD_COPY.submitLabel}
      </Button>
    </form>
  );
}
