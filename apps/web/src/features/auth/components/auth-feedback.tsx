import { Icon, Link, LiveRegion } from "@oalo/ui";
import type { ReactNode } from "react";

import type { InternalRefusal } from "../../http/internal-api.js";
import { SupportReference } from "../../shell/components/support-details.js";
import { RESET_PASSWORD, userMessageSentence } from "../strings.js";
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
  return (
    <LiveRegion
      className={styles.problem}
      message={
        <>
          <Icon className={styles.feedbackGlyph} decorative name="circle-x" size="sm" />
          {children}
        </>
      }
      urgency="alert"
      visible
    />
  );
}

/**
 * Brief section 9: each region pairs its colour and words with its tone's glyph, the one `Badge`
 * draws for that tone (`circle-x` for a refusal, `info` for a confirmation). The glyph is
 * decorative, so the sentence alone is what a screen reader hears (PRD-009 scored review R4-08).
 * The refusal's glyph takes the region's critical colour; the notice's takes the information blue
 * beside words in the body colour.
 *
 * The words stay direct children of the region, beside the glyph rather than inside a wrapper, so
 * a region found by its sentence is the region itself; the stylesheet puts every child after the
 * glyph in the second column.
 */
export function AuthNotice({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <LiveRegion
      className={styles.notice}
      message={
        <>
          <Icon className={styles.feedbackGlyph} decorative name="info" size="sm" tone="info" />
          {children}
        </>
      }
      urgency="status"
      visible
    />
  );
}

/**
 * The way to do what an expired reset link's sentence says ("Request a new one."): the link to the
 * page that sends a new link, in the row the sign-up notice puts its own next steps in. Rubric axis
 * 9: an error says what to do next, and where the next step is a page it is a control, not only
 * words (PRD-009 scored review pass 4, R4 F4-01).
 */
export function RequestNewLink(): ReactNode {
  return (
    <span className={styles.noticeActions}>
      <Link href="/forgot-password">{RESET_PASSWORD.requestNewLinkLabel}</Link>
    </span>
  );
}

/**
 * The reset page opened with no token in its address. It says the same sentence a refused form says
 * for a spent link, and gives the same way on.
 */
export function ResetLinkMissing(): ReactNode {
  return (
    <div className={styles.form}>
      <p className={styles.body}>{RESET_PASSWORD.expiredError}</p>
      <RequestNewLink />
    </div>
  );
}

/** The one refusal whose next step is a page of its own, named by the code the route answers with. */
const RESET_LINK_EXPIRED_CODE = "AUTH_RESET_LINK_EXPIRED";

/**
 * What an account screen says about a refused request: the sentence, and the reference when the
 * sentence is the generic one (PRD-006b D7). A refused reset link also carries the link to ask for
 * a new one, inside the same alert, under the sentence that tells the person to.
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
      {refusal.code === RESET_LINK_EXPIRED_CODE ? <RequestNewLink /> : null}
      <SupportReference refusal={refusal} />
    </>
  );
}
