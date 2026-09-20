/**
 * The exact words on the sign-in, choose-workspace, sign-up, forgot-password, reset-password,
 * verify-email, and change-password screens, and in the two account emails (PRD-006b D10).
 *
 * PRD-006a builds those screens and routes and imports every string from here, so the writing
 * review happens once, against this file, rather than seven times against seven components.
 *
 * Two of these are security controls, not copy. `SIGN_IN.genericError` and
 * `FORGOT_PASSWORD.confirmation` are deliberately identical whatever the real outcome, so neither
 * page tells an attacker whether an email has an account (PRD-006a 006A-AC-013 and 006A-AC-017).
 * Making either one more specific needs `security-guardian`, not a copy edit.
 */

export const SIGN_IN = Object.freeze({
  title: "Sign in",
  lead: "Welcome back. Sign in to your Automated LO workspace.",
  emailLabel: "Email",
  passwordLabel: "Password",
  rememberLabel: "Keep me signed in for 30 days",
  submitLabel: "Sign in",
  forgotLink: "Forgot your password?",
  signUpPrompt: "New here? Create your account.",
  highLevelNote: "This sign-in is separate from HighLevel. Connecting HighLevel comes later.",
  genericError: "That email and password don't match. Try again, or reset your password.",
  rateLimitedError: "Too many attempts. Wait a few minutes and try again.",
  signedOutNotice: "You're signed out.",
});

export const CHOOSE_WORKSPACE = Object.freeze({
  title: "Where do you want to work today?",
  submitLabel: "Continue",
});

/** One option on the choose-workspace step: the workspace name and the role the user holds there. */
export function chooseWorkspaceOptionLabel(workspaceName: string, roleLabel: string): string {
  return `${workspaceName}, as ${roleLabel}`;
}

export const SIGN_UP = Object.freeze({
  title: "Create your account",
  lead: "Takes about a minute. Then we'll set up your first Open House Boost together.",
  nameLabel: "Your name",
  emailLabel: "Email",
  passwordLabel: "Password",
  passwordHelp: "At least 12 characters. A short phrase works well.",
  companyLabel: "Company or team name (optional)",
  submitLabel: "Create account",
  existingAccountError: "That email already has an account. Sign in, or reset your password.",
});

/** One sentence per way a password can fail the policy. Never a rule name or a code. */
export const PASSWORD_POLICY_MESSAGES = Object.freeze({
  tooShort: "Use at least 12 characters.",
  tooLong: "Use at most 128 characters.",
  containsIdentity: "Choose a password that isn't your name or email.",
  tooCommon: "That password is too common. Try a short phrase instead.",
});

export const FORGOT_PASSWORD = Object.freeze({
  title: "Reset your password",
  lead: "Enter your email and we'll send you a link to choose a new one.",
  emailLabel: "Email",
  submitLabel: "Send reset link",
  confirmation:
    "If there's an account for that email, a reset link is on its way. It works for 30 minutes. Check your spam folder if it doesn't arrive.",
});

export const RESET_PASSWORD = Object.freeze({
  title: "Choose a new password",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm new password",
  submitLabel: "Save new password",
  expiredError: "This reset link has expired or was already used. Request a new one.",
  mismatchError: "Those passwords don't match.",
  successNotice: "Your password is saved. You're signed in.",
});

/**
 * D10's unverified-notice row is one sentence with a control inside it: "Confirm your email so you
 * can reset your password later. Resend the link." The shell says the first half and offers the
 * second half as the control, so the two parts are declared once here and the whole sentence is
 * composed from them rather than typed a second time. Editing either part moves `unverifiedNotice`
 * with it, so the requirement's literal and the words on screen cannot drift apart.
 */
const UNVERIFIED_NOTICE_BODY = "Confirm your email so you can reset your password later.";
const UNVERIFIED_RESEND_LABEL = "Resend the link.";

export const VERIFY_EMAIL = Object.freeze({
  title: "Confirm your email",
  body: "Click confirm and you're done.",
  submitLabel: "Confirm",
  successNotice: "Thanks, your email is confirmed.",
  expiredError: "This link has expired. We'll send a new one when you sign in.",
  unverifiedNotice: `${UNVERIFIED_NOTICE_BODY} ${UNVERIFIED_RESEND_LABEL}`,
  unverifiedNoticeBody: UNVERIFIED_NOTICE_BODY,
  unverifiedResendLabel: UNVERIFIED_RESEND_LABEL,
});

export const CHANGE_PASSWORD = Object.freeze({
  title: "Change your password",
  currentPasswordLabel: "Current password",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm new password",
  submitLabel: "Save",
  wrongCurrentError: "That doesn't match your current password.",
  successNotice: "Your password is updated. You've been signed out everywhere else.",
});

/** The reset email. The last sentence is what stops a recipient worrying about a stray link. */
export const RESET_PASSWORD_EMAIL = Object.freeze({
  subject: "Reset your Automated LO password",
  body: (name: string): string =>
    `Hi ${name}, click the link below to choose a new password. It works for 30 minutes. If you didn't ask for this, you can ignore this email; your password won't change.`,
});

export const VERIFY_EMAIL_EMAIL = Object.freeze({
  subject: "Confirm your email for Automated LO",
  body: (name: string): string =>
    `Hi ${name}, confirm your email so you can reset your password if you ever need to.`,
});
