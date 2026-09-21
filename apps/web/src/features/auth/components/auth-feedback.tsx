import { LiveRegion } from "@oalo/ui";
import type { ReactNode } from "react";

import type { InternalRefusal } from "../../http/internal-api.js";
import { SupportReference } from "../../shell/components/support-details.js";
import { userMessageSentence } from "../strings.js";
import styles from "./auth-form.module.css";

/**
 * The two things an account screen ever says back to a person, and the only two ways it says them.
 *
 * PRD-006d 006D-AC-011 asks that every form result be announced as well as shown. Both of these
 * render through `LiveRegion` (PRD-006d D4) rather than a bare `role` attribute, so the urgency
 * policy lives in one primitive: a refusal interrupts, a confirmation does not. Field-level errors
 * never come through here; they belong to the field, connected by `FormField`'s `aria-describedby`.
 *
 * Both are visible, not screen-reader-only, and both sit above the fields so that at 390 the
 * message is on screen without scrolling.
 */

export function AuthProblem({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return <LiveRegion className={styles.problem} message={children} urgency="alert" visible />;
}

export function AuthNotice({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return <LiveRegion className={styles.notice} message={children} urgency="status" visible />;
}

/**
 * What an account screen says about a refused request: the sentence, and the reference when the
 * sentence is the generic one (PRD-006b D7).
 *
 * `useAuthSubmit` builds this the moment a route answers and keeps it in state, which is why it is
 * a function returning a node rather than a component the six forms would each have to remember to
 * render. All six render `problem` through `AuthProblem` and nothing else, so a refusal that owes a
 * reference carries it on every one of them, including the workspace-choice step.
 */
export function authProblemFor(refusal: InternalRefusal): ReactNode {
  return (
    <>
      <span>{userMessageSentence(refusal.code)}</span>
      <SupportReference refusal={refusal} />
    </>
  );
}
