import type { ReactNode } from "react";

import {
  PASSWORD_RESET_NOTICE_PARAMETER,
  PASSWORD_RESET_NOTICE_VALUE,
} from "../../../server/password-authentication-handler.js";
import { RESET_PASSWORD } from "../strings.js";
import { AuthNotice } from "./auth-feedback.js";

/**
 * PRD-006b D10, the reset-password success state: the person lands in the workspace and reads
 * "Your password is saved. You're signed in."
 *
 * This is the other half of the flag `handleResetPassword` puts on the workspace path. It renders
 * on the server, in the first HTML the browser receives after the redirect, so the sentence is
 * there before anything else settles rather than appearing a moment later.
 *
 * It says it through `AuthNotice`, which is the product's one way of confirming something on an
 * account screen: a `LiveRegion` at `status` urgency (PRD-006d D4 and 006D-AC-011), so a screen
 * reader is told without being interrupted. A confirmation is not an alert.
 *
 * It reads the query rather than holding state, which is what makes it clear itself: the flag is
 * in the address, so the next navigation is a workspace with no notice on it, and a reload of the
 * same address says the same true thing.
 *
 * The comparison is the exact pair the route wrote, not a truthiness check, so no other value
 * summons the sentence. Someone who types that one address themselves still reads it, and that is
 * the same exposure `/sign-in?signedOut=1` already carries: a sentence about the reader's own
 * account, shown to the reader, changing nothing. The flag grants nothing and gates nothing; the
 * session cookie the reset route set is what signs the person in.
 */
export function PasswordResetNotice({
  parameters,
}: Readonly<{
  parameters: Readonly<Record<string, string | string[] | undefined>>;
}>): ReactNode {
  if (parameters[PASSWORD_RESET_NOTICE_PARAMETER] !== PASSWORD_RESET_NOTICE_VALUE) return null;
  return <AuthNotice>{RESET_PASSWORD.successNotice}</AuthNotice>;
}
