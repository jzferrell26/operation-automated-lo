"use client";

import { Button, Link } from "@oalo/ui";
import { useState, type FormEvent, type ReactNode } from "react";

import { SIGN_IN, VERIFY_EMAIL } from "../strings.js";
import { AuthNotice, AuthProblem } from "./auth-feedback.js";
import styles from "./auth-form.module.css";
import { useAuthSubmit } from "./use-auth-submit.js";

/**
 * PRD-006a D5 and 006A-AC-021. One button.
 *
 * Confirming is a `POST`, not the act of opening the link, so a mail client that prefetches links
 * cannot burn the token before the person clicks anything.
 *
 * PRD-006d's named-state review, F-20: the confirmed state used to replace the whole form with a
 * sentence, so the screen a person lands on after confirming had no control on it and no way
 * onward. Rubric axis 5 asks every state to be operable and axis 9 asks it to say what to do
 * next. The sign-in link is the page's own way onward, in the D10 words the account screens
 * already use for it, and it is on the screen in both states rather than appearing only once the
 * form has gone.
 */

function SignInLink(): ReactNode {
  return (
    <p className={styles.footer}>
      <Link href="/sign-in">{SIGN_IN.submitLabel}</Link>
    </p>
  );
}

export function VerifyEmailForm({ token }: Readonly<{ token: string }>): ReactNode {
  const { problem, submitting, submit } = useAuthSubmit();
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const payload = await submit("/api/auth/verify-email", { token });
    if (payload !== undefined) setConfirmed(true);
  }

  if (confirmed) {
    return (
      <div className={styles.form}>
        <AuthNotice>{VERIFY_EMAIL.successNotice}</AuthNotice>
        <SignInLink />
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {problem === null ? null : <AuthProblem>{problem}</AuthProblem>}
      <p className={styles.body}>{VERIFY_EMAIL.body}</p>
      <Button disabled={submitting} type="submit">
        {VERIFY_EMAIL.submitLabel}
      </Button>
      <SignInLink />
    </form>
  );
}
