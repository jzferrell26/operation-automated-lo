"use client";

import { Button, Link, PasswordField, TextField } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import { SIGN_UP } from "../strings.js";
import { AuthNotice, AuthProblem } from "./auth-feedback.js";
import styles from "./auth-form.module.css";
import { followNext, useAuthSubmit } from "./use-auth-submit.js";

/**
 * PRD-006a D5 and 006A-AC-020. Create an account, then land in the workspace.
 *
 * The duplicate-address answer is the one place the product says whether an address already has
 * an account. D5 makes that trade on purpose: a sign-up that pretends to succeed leaves a real
 * person with no account and no explanation. The page says so plainly and offers both ways
 * forward.
 *
 * PRD-006d 006D-AC-003: the four fields are primitives, so the password rule reaches the person as
 * the field's own description rather than as a paragraph that nothing connects to the control.
 */

interface SignUpResponse {
  readonly next?: string;
  readonly state?: string;
  readonly error?: string;
}

export function SignUpForm(): ReactNode {
  const { problem, submitting, submit } = useAuthSubmit<SignUpResponse>();
  const [existing, setExisting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setExisting(false);
    const form = new FormData(event.currentTarget);
    const companyName = String(form.get("companyName") ?? "").trim();
    const payload = await submit("/api/auth/sign-up", {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      ...(companyName.length === 0 ? {} : { companyName }),
    });
    if (payload === undefined) return;
    if (payload.state === "existing") {
      setExisting(true);
      return;
    }
    followNext(payload.next);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      {existing ? (
        <AuthNotice>
          <span className={styles.noticeBody}>{SIGN_UP.existingAccountError}</span>
          <span className={styles.noticeActions}>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/forgot-password">Reset your password</Link>
          </span>
        </AuthNotice>
      ) : null}
      <TextField
        autoComplete="name"
        label={SIGN_UP.nameLabel}
        name="name"
        requirement="required"
        type="text"
      />
      <TextField
        autoComplete="email"
        label={SIGN_UP.emailLabel}
        name="email"
        requirement="required"
        type="email"
      />
      <PasswordField
        autoComplete="new-password"
        description={SIGN_UP.passwordHelp}
        label={SIGN_UP.passwordLabel}
        minLength={12}
        name="password"
        requirement="required"
      />
      {/* The copy already carries "(optional)" (PRD-006b D10), so no requirement marker: the
          field must not say the same word twice. */}
      <TextField
        autoComplete="organization"
        label={SIGN_UP.companyLabel}
        name="companyName"
        type="text"
      />
      <Button disabled={submitting} type="submit">
        {SIGN_UP.submitLabel}
      </Button>
    </form>
  );
}
