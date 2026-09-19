/**
 * PRD-006b D7 and D10, held locally until the copy lane lands.
 *
 * Every string below is verbatim from PRD-006b D10's table, or from D7's rule that an error code
 * renders as a sentence saying what happened and what to do. PRD-006b D6 adds two guards over
 * this file once that lane merges, and PRD-006b's own copy modules then absorb it: this module is
 * shaped so that absorption is a re-export, not a rewrite. Nothing here is paraphrased, and
 * nothing here uses a word from PRD-006b D2's forbidden list.
 *
 * The reader is a mortgage loan officer who has never seen this codebase.
 */

export const AUTH_ERROR_CODES = Object.freeze([
  "AUTH_CREDENTIALS_REJECTED",
  "AUTH_RATE_LIMITED",
  "AUTH_EMAIL_ALREADY_REGISTERED",
  "AUTH_RESET_LINK_EXPIRED",
  "AUTH_VERIFICATION_LINK_EXPIRED",
  "AUTH_PASSWORDS_DO_NOT_MATCH",
  "AUTH_CURRENT_PASSWORD_REJECTED",
  "PASSWORD_TOO_SHORT",
  "PASSWORD_TOO_LONG",
  "PASSWORD_LOOKS_PERSONAL",
  "PASSWORD_TOO_COMMON",
] as const);

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

/** PRD-006b D7. Every code the auth routes can return, as a sentence. */
const AUTH_ERROR_SENTENCES: Readonly<Record<AuthErrorCode, string>> = Object.freeze({
  AUTH_CREDENTIALS_REJECTED:
    "That email and password don't match. Try again, or reset your password.",
  AUTH_RATE_LIMITED: "Too many attempts. Wait a few minutes and try again.",
  AUTH_EMAIL_ALREADY_REGISTERED:
    "That email already has an account. Sign in, or reset your password.",
  AUTH_RESET_LINK_EXPIRED: "This reset link has expired or was already used. Request a new one.",
  AUTH_VERIFICATION_LINK_EXPIRED: "This link has expired. We'll send a new one when you sign in.",
  AUTH_PASSWORDS_DO_NOT_MATCH: "Those passwords don't match.",
  AUTH_CURRENT_PASSWORD_REJECTED: "That doesn't match your current password.",
  PASSWORD_TOO_SHORT: "Use at least 12 characters.",
  PASSWORD_TOO_LONG: "Use at most 128 characters.",
  PASSWORD_LOOKS_PERSONAL: "Choose a password that isn't your name or email.",
  PASSWORD_TOO_COMMON: "That password is too common. Try a short phrase instead.",
});

/** PRD-006b D7. An unmapped code still says something true and something useful. */
export const UNMAPPED_ERROR_SENTENCE =
  "Something went wrong on our side. Try again, and contact support if it keeps happening.";

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === "string" && (AUTH_ERROR_CODES as readonly string[]).includes(value);
}

export function authErrorSentence(code: unknown): string {
  return isAuthErrorCode(code) ? AUTH_ERROR_SENTENCES[code] : UNMAPPED_ERROR_SENTENCE;
}

export const SIGN_IN_COPY = Object.freeze({
  title: "Sign in",
  lead: "Welcome back. Sign in to your Automated LO workspace.",
  emailLabel: "Email",
  passwordLabel: "Password",
  rememberLabel: "Keep me signed in for 30 days",
  submitLabel: "Sign in",
  forgotLink: "Forgot your password?",
  signUpFooter: "New here? Create your account.",
  honesty: "This sign-in is separate from HighLevel. Connecting HighLevel comes later.",
  signedOutNotice: "You're signed out.",
});

export const CHOOSE_WORKSPACE_COPY = Object.freeze({
  title: "Where do you want to work today?",
  submitLabel: "Continue",
});

/** PRD-006b D3's role labels, so an option reads "Acme, as Workspace owner". */
export const ROLE_LABELS_FOR_PEOPLE = Object.freeze({
  location_admin: "Workspace owner",
  campaign_creator: "Campaign creator",
  campaign_approver: "Approver",
  campaign_publisher: "Publisher",
  viewer: "Viewer",
  platform_support: "Support",
});

export function workspaceOptionLabel(workspaceName: string, roleLabel: string): string {
  return `${workspaceName}, as ${roleLabel}`;
}

export const SIGN_UP_COPY = Object.freeze({
  title: "Create your account",
  lead: "Takes about a minute. Then we'll set up your first Open House Boost together.",
  nameLabel: "Your name",
  emailLabel: "Email",
  passwordLabel: "Password",
  passwordHelper: "At least 12 characters. A short phrase works well.",
  companyLabel: "Company or team name (optional)",
  submitLabel: "Create account",
  existingAccount: "That email already has an account. Sign in, or reset your password.",
});

export const FORGOT_PASSWORD_COPY = Object.freeze({
  title: "Reset your password",
  lead: "Enter your email and we'll send you a link to choose a new one.",
  emailLabel: "Email",
  submitLabel: "Send reset link",
  confirmation:
    "If there's an account for that email, a reset link is on its way. It works for 30 minutes. Check your spam folder if it doesn't arrive.",
});

export const RESET_PASSWORD_COPY = Object.freeze({
  title: "Choose a new password",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm new password",
  submitLabel: "Save new password",
  linkExpired: "This reset link has expired or was already used. Request a new one.",
  mismatch: "Those passwords don't match.",
  success: "Your password is saved. You're signed in.",
});

export const VERIFY_EMAIL_COPY = Object.freeze({
  title: "Confirm your email",
  body: "Click confirm and you're done.",
  submitLabel: "Confirm",
  done: "Thanks, your email is confirmed.",
  expired: "This link has expired. We'll send a new one when you sign in.",
});

export const CHANGE_PASSWORD_COPY = Object.freeze({
  title: "Change your password",
  currentPasswordLabel: "Current password",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm new password",
  submitLabel: "Save",
  wrongCurrent: "That doesn't match your current password.",
  success: "Your password is updated. You've been signed out everywhere else.",
});

export const UNVERIFIED_EMAIL_NOTICE =
  "Confirm your email so you can reset your password later. Resend the link.";

export const SIGN_OUT_CONTROL_LABEL = "Sign out";

export const RESET_EMAIL_COPY = Object.freeze({
  subject: "Reset your Automated LO password",
  body(name: string): string {
    return `Hi ${name}, click the link below to choose a new password. It works for 30 minutes. If you didn't ask for this, you can ignore this email; your password won't change.`;
  },
});

export const VERIFICATION_EMAIL_COPY = Object.freeze({
  subject: "Confirm your email for Automated LO",
  body(name: string): string {
    return `Hi ${name}, confirm your email so you can reset your password if you ever need to.`;
  },
});
