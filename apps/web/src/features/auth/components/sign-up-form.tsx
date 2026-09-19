"use client";

import { Button } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import { SIGN_UP_COPY } from "../strings.js";
import { AuthField, AuthNotice, AuthProblem } from "./auth-field.js";
import styles from "./auth-form.module.css";
import { followNext, useAuthSubmit } from "./use-auth-submit.js";

/**
 * PRD-006a D5 and 006A-AC-020. Create an account, then land in the workspace.
 *
 * The duplicate-address answer is the one place the product says whether an address already has
 * an account. D5 makes that trade on purpose: a sign-up that pretends to succeed leaves a real
 * person with no account and no explanation. The page says so plainly and offers both ways
 * forward.
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
          {SIGN_UP_COPY.existingAccount}{" "}
          <a className="oalo-action-link" href="/sign-in">
            Sign in
          </a>{" "}
          <a className="oalo-action-link" href="/forgot-password">
            Reset your password
          </a>
        </AuthNotice>
      ) : null}
      <AuthField autoComplete="name" label={SIGN_UP_COPY.nameLabel} name="name" type="text" />
      <AuthField autoComplete="email" label={SIGN_UP_COPY.emailLabel} name="email" type="email" />
      <AuthField
        autoComplete="new-password"
        helper={SIGN_UP_COPY.passwordHelper}
        label={SIGN_UP_COPY.passwordLabel}
        minLength={12}
        name="password"
        type="password"
      />
      <AuthField
        autoComplete="organization"
        label={SIGN_UP_COPY.companyLabel}
        name="companyName"
        required={false}
        type="text"
      />
      <Button disabled={submitting} type="submit">
        {SIGN_UP_COPY.submitLabel}
      </Button>
    </form>
  );
}
