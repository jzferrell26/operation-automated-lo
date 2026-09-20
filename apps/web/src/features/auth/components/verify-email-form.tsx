"use client";

import { Button } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import { VERIFY_EMAIL } from "../strings.js";
import { AuthNotice, AuthProblem } from "./auth-feedback.js";
import styles from "./auth-form.module.css";
import { useAuthSubmit } from "./use-auth-submit.js";

/**
 * PRD-006a D5 and 006A-AC-021. One button.
 *
 * Confirming is a `POST`, not the act of opening the link, so a mail client that prefetches links
 * cannot burn the token before the person clicks anything.
 */

export function VerifyEmailForm({ token }: Readonly<{ token: string }>): ReactNode {
  const { problem, submitting, submit } = useAuthSubmit();
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const payload = await submit("/api/auth/verify-email", { token });
    if (payload !== undefined) setConfirmed(true);
  }

  if (confirmed) return <AuthNotice>{VERIFY_EMAIL.successNotice}</AuthNotice>;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      <p className={styles.body}>{VERIFY_EMAIL.body}</p>
      <Button disabled={submitting} type="submit">
        {VERIFY_EMAIL.submitLabel}
      </Button>
    </form>
  );
}
