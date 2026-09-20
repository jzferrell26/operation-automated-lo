import { Button } from "@oalo/ui";
import type { ReactNode } from "react";

import type { EmailVerificationView } from "../../shell/model/navigation.js";
import { RESEND_VERIFICATION_PATH } from "../../../server/runtime-authentication.js";
import { VERIFY_EMAIL } from "../strings.js";
import { AuthNotice } from "./auth-feedback.js";
import styles from "./auth-form.module.css";

/**
 * PRD-006b D10's unverified-notice row, and the shell half of PRD-006a 006A-AC-021: "Confirm your
 * email so you can reset your password later. Resend the link."
 *
 * The sentence lived in the copy module for a batch with nothing rendering it, which is how a
 * requirement passes a writing review and still never reaches the person it was written for.
 *
 * It renders for `unverified` and for nothing else. 006A-AC-021 is explicit that a deployment with
 * no sending domain shows no verification notice, and that is what `not_applicable` carries: the
 * shell must never ask somebody to look in their inbox for a message this deployment never sent,
 * and must never offer a control that could not do anything.
 *
 * It says it through `AuthNotice`, the product's one way of confirming something on an account
 * screen: a `LiveRegion` at `status` urgency (PRD-006d D4 and 006D-AC-011), so a screen reader is
 * told without being interrupted. This is a thing to do when convenient, not an alert.
 *
 * The control is a plain form post, the same shape the sign-out control in this layout already
 * uses. The session-bound token travels as a hidden field and the route promotes it to the header
 * before the 005a mutation gate sees it, so no client script is loaded into the shell to make one
 * button work, and the button still cannot be pressed from another site.
 */
export function UnverifiedEmailNotice({
  csrfToken,
  state,
}: Readonly<{
  csrfToken: string | undefined;
  state: EmailVerificationView | undefined;
}>): ReactNode {
  if (state !== "unverified") return null;
  return (
    <AuthNotice>
      <span className={styles.noticeBody}>{VERIFY_EMAIL.unverifiedNoticeBody}</span>
      <form action={RESEND_VERIFICATION_PATH} className={styles.noticeActions} method="post">
        {csrfToken === undefined ? null : (
          <input name="csrfToken" type="hidden" value={csrfToken} />
        )}
        <Button size="sm" type="submit" variant="secondary">
          {VERIFY_EMAIL.unverifiedResendLabel}
        </Button>
      </form>
    </AuthNotice>
  );
}
