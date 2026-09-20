import { describe, expect, it } from "vitest";

import {
  CHANGE_PASSWORD,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
  SIGN_IN,
  VERIFY_EMAIL,
} from "./auth-messages.js";
import { SIGN_OUT_LABEL } from "./user-language.js";
import { userMessageForCode, userMessageSentence } from "../features/http/user-messages.js";

/**
 * PRD-006b 006B-AC-010, pinned to the requirement rather than to itself.
 *
 * The component and route suites assert the rendered DOM against these same constants, which proves
 * the pages use the copy module but not that the copy module still says what PRD-006b D10 says.
 * Editing a constant would move the page and its test together and nothing would fail. So the D10
 * literals are written out below, once, as literals.
 *
 * The second half is the other drift: a route hands the browser an error code, the page turns it
 * into a sentence through `user-messages.ts`, and D10 gives that sentence for the sign-in, sign-up,
 * reset, verify, and change-password rows. Two modules therefore hold the same words, and the pairs
 * below fail if either one moves without the other.
 *
 * Do not "improve" `SIGN_IN.genericError` or `FORGOT_PASSWORD.confirmation` to match a real outcome.
 * Both are deliberately the same whatever happened, so neither tells an attacker whether an email
 * has an account (PRD-006a 006A-AC-013 and 006A-AC-017). That change needs `security-guardian`.
 */

describe("the account screens say exactly what PRD-006b D10 says", () => {
  it("pins the sign-in row", () => {
    expect(SIGN_IN.title).toBe("Sign in");
    expect(SIGN_IN.lead).toBe("Welcome back. Sign in to your Automated LO workspace.");
    expect(SIGN_IN.emailLabel).toBe("Email");
    expect(SIGN_IN.passwordLabel).toBe("Password");
    expect(SIGN_IN.rememberLabel).toBe("Keep me signed in for 30 days");
    expect(SIGN_IN.submitLabel).toBe("Sign in");
    expect(SIGN_IN.forgotLink).toBe("Forgot your password?");
    expect(SIGN_IN.signUpPrompt).toBe("New here? Create your account.");
    expect(SIGN_IN.highLevelNote).toBe(
      "This sign-in is separate from HighLevel. Connecting HighLevel comes later.",
    );
    expect(SIGN_IN.genericError).toBe(
      "That email and password don't match. Try again, or reset your password.",
    );
    expect(SIGN_IN.rateLimitedError).toBe("Too many attempts. Wait a few minutes and try again.");
  });

  it("pins the forgot-password row", () => {
    expect(FORGOT_PASSWORD.title).toBe("Reset your password");
    expect(FORGOT_PASSWORD.lead).toBe(
      "Enter your email and we'll send you a link to choose a new one.",
    );
    expect(FORGOT_PASSWORD.emailLabel).toBe("Email");
    expect(FORGOT_PASSWORD.submitLabel).toBe("Send reset link");
    expect(FORGOT_PASSWORD.confirmation).toBe(
      "If there's an account for that email, a reset link is on its way. It works for 30 minutes. Check your spam folder if it doesn't arrive.",
    );
  });

  it("pins the reset-password row", () => {
    expect(RESET_PASSWORD.title).toBe("Choose a new password");
    expect(RESET_PASSWORD.newPasswordLabel).toBe("New password");
    expect(RESET_PASSWORD.confirmPasswordLabel).toBe("Confirm new password");
    expect(RESET_PASSWORD.submitLabel).toBe("Save new password");
    expect(RESET_PASSWORD.expiredError).toBe(
      "This reset link has expired or was already used. Request a new one.",
    );
    expect(RESET_PASSWORD.mismatchError).toBe("Those passwords don't match.");
    expect(RESET_PASSWORD.successNotice).toBe("Your password is saved. You're signed in.");
  });

  it("pins the verify-email row", () => {
    expect(VERIFY_EMAIL.title).toBe("Confirm your email");
    expect(VERIFY_EMAIL.body).toBe("Click confirm and you're done.");
    expect(VERIFY_EMAIL.submitLabel).toBe("Confirm");
    expect(VERIFY_EMAIL.successNotice).toBe("Thanks, your email is confirmed.");
    expect(VERIFY_EMAIL.expiredError).toBe(
      "This link has expired. We'll send a new one when you sign in.",
    );
    expect(VERIFY_EMAIL.unverifiedNotice).toBe(
      "Confirm your email so you can reset your password later. Resend the link.",
    );
  });

  it("pins the change-password row", () => {
    expect(CHANGE_PASSWORD.title).toBe("Change your password");
    expect(CHANGE_PASSWORD.currentPasswordLabel).toBe("Current password");
    expect(CHANGE_PASSWORD.newPasswordLabel).toBe("New password");
    expect(CHANGE_PASSWORD.confirmPasswordLabel).toBe("Confirm new password");
    expect(CHANGE_PASSWORD.submitLabel).toBe("Save");
    expect(CHANGE_PASSWORD.wrongCurrentError).toBe("That doesn't match your current password.");
    expect(CHANGE_PASSWORD.successNotice).toBe(
      "Your password is updated. You've been signed out everywhere else.",
    );
  });

  it("pins the sign-out row", () => {
    expect(SIGN_OUT_LABEL).toBe("Sign out");
    expect(SIGN_IN.signedOutNotice).toBe("You're signed out.");
  });
});

describe("a route's error code becomes the screen's own sentence", () => {
  it("says on the sign-in page what the sign-in page says", () => {
    expect(userMessageSentence("AUTH_CREDENTIALS_REJECTED")).toBe(SIGN_IN.genericError);
    expect(userMessageSentence("AUTH_RATE_LIMITED")).toBe(SIGN_IN.rateLimitedError);
  });

  it("says on the reset, verify, and change-password pages what those pages say", () => {
    expect(userMessageSentence("AUTH_RESET_LINK_EXPIRED")).toBe(RESET_PASSWORD.expiredError);
    expect(userMessageSentence("AUTH_VERIFICATION_LINK_EXPIRED")).toBe(VERIFY_EMAIL.expiredError);
  });

  /**
   * Two codes carry a "what to do" the page's own one-line error does not: the page shows the
   * mismatch or the wrong current password beside the field, and the route adds the next step. So
   * the page's sentence is the code's `what`, not the whole pair.
   */
  it("keeps the field-level errors identical to what the page shows beside the field", () => {
    expect(userMessageForCode("AUTH_PASSWORDS_DO_NOT_MATCH").what).toBe(
      RESET_PASSWORD.mismatchError,
    );
    expect(userMessageForCode("AUTH_CURRENT_PASSWORD_REJECTED").what).toBe(
      CHANGE_PASSWORD.wrongCurrentError,
    );
  });
});
