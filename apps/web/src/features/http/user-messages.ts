/**
 * Every error a route can hand the browser, as two sentences a loan officer can act on
 * (PRD-006b D7, `library/knowledge/private/standards/user-language-contract.md` section 7).
 *
 * The codes themselves stay: they are how support and the audit trail find one request. What
 * changes is that none of them reaches a screen. A status line renders `what` and `whatToDo`, and
 * the code travels with the support reference inside the collapsed "Details for support" region.
 *
 * An unmapped code is not a crash and not a silent blank. It renders `UNKNOWN_ERROR_MESSAGE`, which
 * says the failure is ours and what to do about it, and `user-messages.unit.test.ts` fails if any
 * code the campaign or auth handlers emit is missing from the table, so the fallback stays a
 * safety net rather than the usual path.
 */

export type UserMessage = Readonly<{
  /** What happened, in the user's terms. Never a variable name, a value, or a stack. */
  what: string;
  /** What to do about it. Always present, even when the answer is to wait or to ask someone. */
  whatToDo: string;
}>;

/**
 * Keyed by the code the route puts in `{ "error": ... }`. Includes every code PRD-006a's auth
 * routes emit (`apps/web/src/server/password-authentication-handler.ts`), among them the password
 * policy reasons from `@oalo/auth`, which the sign-up, reset, and change-password routes return as
 * the error code itself. The sentences are PRD-006b D10's, split at the sentence boundary into the
 * pair.
 */
export const USER_MESSAGES_BY_CODE: Readonly<Record<string, UserMessage>> = Object.freeze({
  INVALID_CAMPAIGN_DRAFT: {
    what: "Some of the campaign details aren't filled in the way the checks expect.",
    whatToDo: "Look over the fields marked below and try again.",
  },
  INVALID_CAMPAIGN_COMMAND: {
    what: "Something in this request didn't look right to us.",
    whatToDo: "Refresh the page and try again.",
  },
  CAMPAIGN_PREFLIGHT_FAILED: {
    what: "We couldn't finish the checks on this campaign.",
    whatToDo: "Try again. If it keeps happening, contact support with the reference below.",
  },
  CAMPAIGN_APPROVAL_CONFLICT: {
    what: "This campaign changed since you opened it.",
    whatToDo: "Refresh the page and look again before approving.",
  },
  CAMPAIGN_APPROVAL_NOT_READY: {
    what: "This campaign isn't ready to approve yet.",
    whatToDo: "Fix what the checks found, save it again, then approve the new version.",
  },
  CAMPAIGN_APPROVAL_FAILED: {
    what: "We couldn't record your approval.",
    whatToDo: "Refresh the page and try again.",
  },
  CAMPAIGN_STORE_UNAVAILABLE: {
    what: "We can't reach your saved campaigns right now.",
    whatToDo: "Try again in a minute. Nothing you've saved is lost.",
  },
  WORKSPACE_UNAVAILABLE: {
    what: "We can't reach your workspace right now.",
    whatToDo: "Try again in a minute.",
  },
  UNAUTHENTICATED: {
    what: "You've been signed out.",
    whatToDo: "Sign in again to continue.",
  },
  FORBIDDEN: {
    what: "You don't have access to this.",
    whatToDo: "Ask your workspace owner to give you access.",
  },
  NOT_FOUND: {
    what: "We couldn't find that.",
    whatToDo: "Go back to your campaigns and open it from the list.",
  },
  SETUP_PREFERENCE_INVALID: {
    what: "We couldn't save that part of your setup.",
    whatToDo: "Check the fields you just filled in and try again.",
  },
  SETUP_PREFERENCE_FAILED: {
    what: "We couldn't save where you got to in the setup.",
    whatToDo: "Keep going. We'll try again, and nothing you typed is lost.",
  },
  SETUP_PREFERENCE_UNAVAILABLE: {
    what: "The guided setup isn't available in this workspace.",
    whatToDo: "You can still create a campaign from the Marketing menu.",
  },
  INVALID_AUTH_REQUEST: {
    what: "Something in this request didn't look right to us.",
    whatToDo: "Refresh the page and try again.",
  },
  AUTH_CREDENTIALS_REJECTED: {
    what: "That email and password don't match.",
    whatToDo: "Try again, or reset your password.",
  },
  AUTH_RATE_LIMITED: {
    what: "There have been too many attempts.",
    whatToDo: "Wait a few minutes and try again.",
  },
  AUTH_EMAIL_ALREADY_REGISTERED: {
    what: "That email already has an account.",
    whatToDo: "Sign in, or reset your password.",
  },
  AUTH_RESET_LINK_EXPIRED: {
    what: "This reset link has expired or was already used.",
    whatToDo: "Request a new one.",
  },
  AUTH_VERIFICATION_LINK_EXPIRED: {
    what: "This link has expired.",
    whatToDo: "We'll send a new one when you sign in.",
  },
  AUTH_PASSWORDS_DO_NOT_MATCH: {
    what: "Those passwords don't match.",
    whatToDo: "Type the same password in both fields.",
  },
  AUTH_CURRENT_PASSWORD_REJECTED: {
    what: "That doesn't match your current password.",
    whatToDo: "Check it and try again.",
  },
  PASSWORD_TOO_SHORT: {
    what: "That password is too short.",
    whatToDo: "Use at least 12 characters.",
  },
  PASSWORD_TOO_LONG: {
    what: "That password is too long.",
    whatToDo: "Use at most 128 characters.",
  },
  PASSWORD_LOOKS_PERSONAL: {
    what: "That password looks like your name or email.",
    whatToDo: "Choose a password that isn't your name or email.",
  },
  PASSWORD_TOO_COMMON: {
    what: "That password is too common.",
    whatToDo: "Try a short phrase instead.",
  },
});

/** What a user sees when a code has no sentence of its own. Always shown with the reference. */
export const UNKNOWN_ERROR_MESSAGE: UserMessage = Object.freeze({
  what: "Something went wrong on our side.",
  whatToDo: "Try again, and contact support if it keeps happening.",
});

/** The sentence pair for one code, or the honest generic pair. Never returns the code. */
export function userMessageForCode(code: string | undefined): UserMessage {
  if (code === undefined) {
    return UNKNOWN_ERROR_MESSAGE;
  }
  return USER_MESSAGES_BY_CODE[code] ?? UNKNOWN_ERROR_MESSAGE;
}

/** Whether a code has its own sentences, so a caller can decide to show the support reference. */
export function isMappedErrorCode(code: string | undefined): boolean {
  return code !== undefined && Object.hasOwn(USER_MESSAGES_BY_CODE, code);
}

/** One line for a status region: what happened, then what to do. */
export function userMessageSentence(code: string | undefined): string {
  const message = userMessageForCode(code);
  return `${message.what} ${message.whatToDo}`;
}
