"use client";

import { useState } from "react";

import { postInternalJson } from "../../http/internal-api.js";
import { userMessageSentence } from "../strings.js";

/**
 * PRD-006a D5. The one submit every auth form makes.
 *
 * All six forms do the same four things: disable the button, post JSON to an `/api/auth/*` route,
 * turn an error code into the sentence PRD-006b D7 gives it, and re-enable the button. Keeping
 * that in one place means a change to how the product reports a refusal is a change to one file,
 * and it keeps each form about the fields it actually has.
 *
 * `postInternalJson` sends the session-bound token from the rendered meta element when there is
 * one. On the pre-session routes there is none, which is correct: those routes are protected by
 * the exact origin and host checks and by the rate limits, not by a token no browser could hold
 * yet.
 */

export interface AuthResponsePayload {
  readonly error?: string;
}

export interface AuthSubmit<Payload extends AuthResponsePayload> {
  /** The sentence to show, or null when there is nothing to report. */
  readonly problem: string | null;
  readonly submitting: boolean;
  /** Resolves to the response body on success, or undefined once `problem` has been set. */
  submit(path: string, body: unknown): Promise<Payload | undefined>;
  setProblem(problem: string | null): void;
}

export function useAuthSubmit<Payload extends AuthResponsePayload>(): AuthSubmit<Payload> {
  const [problem, setProblem] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(path: string, body: unknown): Promise<Payload | undefined> {
    setSubmitting(true);
    setProblem(null);
    try {
      const response = await postInternalJson(path, body);
      const payload = (await response.json()) as Payload;
      if (!response.ok) {
        setProblem(userMessageSentence(payload.error));
        return undefined;
      }
      return payload;
    } catch {
      // A network failure and an unreadable body say the same thing to the person: something went
      // wrong on our side. Neither reveals anything about the account.
      setProblem(userMessageSentence(undefined));
      return undefined;
    } finally {
      setSubmitting(false);
    }
  }

  return { problem, submitting, submit, setProblem };
}

/** Sends the browser to where the route said to go, when it said to go anywhere. */
export function followNext(next: string | undefined): void {
  if (next !== undefined && next.startsWith("/")) globalThis.location.assign(next);
}
