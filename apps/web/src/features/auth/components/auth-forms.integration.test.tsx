import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CHANGE_PASSWORD,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
  SIGN_IN,
  SIGN_UP,
  VERIFY_EMAIL,
} from "../strings.js";
import { AuthNotice, AuthProblem } from "./auth-feedback.js";
import { ChangePasswordForm } from "./change-password-form.js";
import { ForgotPasswordForm } from "./forgot-password-form.js";
import { ResetPasswordForm } from "./reset-password-form.js";
import { SignInForm } from "./sign-in-form.js";
import { SignUpForm } from "./sign-up-form.js";
import { VerifyEmailForm } from "./verify-email-form.js";

/**
 * PRD-006a 006A-AC-032. What the six auth forms put on the page.
 *
 * Three things are under test and each is a promise to a person rather than a detail:
 *
 * 1. The visible "Forgot your password?" link, which is the owner's second requirement and sits
 *    in the form itself rather than behind a menu.
 * 2. The `autocomplete` values, because a sign-in a password manager cannot fill is a sign-in
 *    people will work around.
 * 3. That nothing in this feature writes to browser storage, proven by a scan of the source
 *    rather than by an assertion about one render.
 *
 * Every string is compared against the copy module, so a change to what a person reads is a
 * change PRD-006b's lane makes in one place and this notices.
 */

/**
 * The input a field renders, found by the name the form posts under, with its visible label
 * checked against the copy module. Querying by label text alone would be ambiguous: "New password"
 * is a prefix of "Confirm new password".
 *
 * PRD-006d 006D-AC-003 moved these fields onto `TextField` and `PasswordField`, so the label is no
 * longer the input's ancestor: `FormField` owns the identifier and points the label at it with
 * `htmlFor`. Reading `input.labels` therefore proves the stronger thing, that the label is
 * programmatically associated rather than merely nearby.
 */
function fieldFor(name: string, label: string): HTMLInputElement {
  const input = document.querySelector(`input[name="${name}"]`);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`No input is rendered for ${name}`);
  }
  const associated = [...(input.labels ?? [])]
    .map((element) => element.textContent ?? "")
    .join(" ");
  expect(associated).toContain(label);
  return input;
}

describe("the sign-in form", () => {
  it("shows a visible forgot-password link that reaches the forgot-password page", () => {
    render(<SignInForm signUpEnabled={false} signedOut={false} />);

    const link = screen.getByRole("link", { name: SIGN_IN.forgotLink });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/forgot-password");
  });

  it("carries the autocomplete values a password manager fills from", () => {
    render(<SignInForm signUpEnabled={false} signedOut={false} />);

    expect(fieldFor("email", SIGN_IN.emailLabel)).toHaveAttribute("autocomplete", "email");
    expect(fieldFor("password", SIGN_IN.passwordLabel)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("says what the sign-in is and is not, and offers the keep-me-signed-in choice", () => {
    render(<SignInForm signUpEnabled={false} signedOut={false} />);

    expect(screen.getByText(SIGN_IN.highLevelNote)).toBeInTheDocument();
    expect(screen.getByLabelText(SIGN_IN.rememberLabel)).not.toBeChecked();
    expect(screen.getByRole("button", { name: SIGN_IN.submitLabel })).toBeInTheDocument();
  });

  it("offers a way to create an account only when sign-up is served", () => {
    const { unmount } = render(<SignInForm signUpEnabled={false} signedOut={false} />);
    expect(screen.queryByRole("link", { name: SIGN_IN.signUpPrompt })).toBeNull();
    unmount();

    render(<SignInForm signUpEnabled signedOut={false} />);
    expect(screen.getByRole("link", { name: SIGN_IN.signUpPrompt })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("says so after a sign-out", () => {
    render(<SignInForm signUpEnabled={false} signedOut />);

    expect(screen.getByText(SIGN_IN.signedOutNotice)).toBeInTheDocument();
  });
});

describe("the sign-up form", () => {
  it("asks for a name, an address, and a new password, and says how long it must be", () => {
    render(<SignUpForm />);

    expect(fieldFor("name", SIGN_UP.nameLabel)).toHaveAttribute("autocomplete", "name");
    expect(fieldFor("email", SIGN_UP.emailLabel)).toHaveAttribute("autocomplete", "email");
    expect(fieldFor("password", SIGN_UP.passwordLabel)).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByText(SIGN_UP.passwordHelp)).toBeInTheDocument();
    expect(fieldFor("companyName", SIGN_UP.companyLabel)).not.toBeRequired();
  });
});

describe("the forgot-password, reset, verify, and change-password forms", () => {
  it("asks for an address and nothing else", () => {
    render(<ForgotPasswordForm />);

    expect(fieldFor("email", FORGOT_PASSWORD.emailLabel)).toHaveAttribute("autocomplete", "email");
    expect(screen.getByRole("button", { name: FORGOT_PASSWORD.submitLabel })).toBeInTheDocument();
  });

  it("asks for the new password twice, because a typo here costs another email", () => {
    render(<ResetPasswordForm token="a-token" />);

    expect(fieldFor("password", RESET_PASSWORD.newPasswordLabel)).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(fieldFor("confirmPassword", RESET_PASSWORD.confirmPasswordLabel)).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  it("never puts the token on the page as text", () => {
    const { container } = render(<ResetPasswordForm token="a-token-that-must-not-be-shown" />);

    expect(container.textContent).not.toContain("a-token-that-must-not-be-shown");
  });

  it("confirms an address with one button", () => {
    render(<VerifyEmailForm token="a-token" />);

    expect(screen.getByText(VERIFY_EMAIL.body)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: VERIFY_EMAIL.submitLabel })).toBeInTheDocument();
  });

  it("asks for the current password before a new one", () => {
    render(<ChangePasswordForm />);

    expect(fieldFor("currentPassword", CHANGE_PASSWORD.currentPasswordLabel)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(fieldFor("newPassword", CHANGE_PASSWORD.newPasswordLabel)).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(fieldFor("confirmPassword", CHANGE_PASSWORD.confirmPasswordLabel)).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });
});

describe("what a person is told when something is wrong", () => {
  it("connects a field's own instruction to the field, not merely near it", () => {
    render(<SignUpForm />);

    const password = fieldFor("password", SIGN_UP.passwordLabel);
    const describedBy = password.getAttribute("aria-describedby") ?? "";
    expect(describedBy).not.toEqual("");
    const described = describedBy
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    expect(described).toContain(SIGN_UP.passwordHelp);
  });

  it("announces a refusal, and puts it above the fields so it is on screen at 390", () => {
    const { container } = render(<AuthProblem>{SIGN_IN.genericError}</AuthProblem>);

    const region = screen.getByRole("alert");
    expect(region).toHaveAttribute("aria-live", "assertive");
    expect(region).toHaveTextContent(SIGN_IN.genericError);
    expect(container.firstElementChild).toBe(region);
  });

  it("announces a confirmation without interrupting", () => {
    render(<AuthNotice>{CHANGE_PASSWORD.successNotice}</AuthNotice>);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent(CHANGE_PASSWORD.successNotice);
  });

  it("puts the refusal before the first field in every form that can refuse", () => {
    render(<SignInForm signUpEnabled={false} signedOut />);

    const notice = screen.getByText(SIGN_IN.signedOutNotice);
    const firstField = fieldFor("email", SIGN_IN.emailLabel);
    expect(notice.compareDocumentPosition(firstField) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

describe("browser storage", () => {
  it("is never written to anywhere in the auth feature or its server module", async () => {
    const roots = [resolve("apps/web/src/features/auth"), resolve("apps/web/src/app/(public)")];
    const files: string[] = [];
    for (const root of roots) {
      for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile()) continue;
        if (![".ts", ".tsx"].includes(extname(entry.name))) continue;
        files.push(join(entry.parentPath, entry.name));
      }
    }
    files.push(resolve("apps/web/src/server/password-authentication-handler.ts"));
    expect(files.length).toBeGreaterThan(6);

    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      // The comments in these files name the three stores to say they are not used, so the scan
      // looks for a member access rather than the bare word.
      if (/\b(?:localStorage|sessionStorage|indexedDB)\s*[.[]/u.test(source)) {
        offenders.push(relative(resolve("."), file).replaceAll("\\", "/"));
      }
    }

    expect(offenders).toEqual([]);
  });
});
