import { LiveRegion } from "@oalo/ui";
import type { ReactNode } from "react";

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
