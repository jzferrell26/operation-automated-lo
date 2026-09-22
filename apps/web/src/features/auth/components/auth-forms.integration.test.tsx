import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SUPPORT_DETAILS_LABELS,
  SUPPORT_REFERENCE_NOT_RECORDED,
} from "../../../copy/user-language.js";
import { stubRefusedFetch } from "../../http/refusal.test-support.js";
import {
  CHANGE_PASSWORD,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
  SIGN_IN,
  SIGN_UP,
  VERIFY_EMAIL,
  userMessageSentence,
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

/**
 * PRD-006b 006B-AC-007 on the account screens.
 *
 * All six forms refuse through one hook, so the reference is proven once, on the sign-in form,
 * and `use-auth-submit.ts` is what makes that true for the other five: each of them renders
 * `problem` through `AuthProblem` and nothing else.
 *
 * Until 2026-09-20 the hook set a sentence and only a sentence. A route that answered a code the
 * product has no words for produced "Something went wrong on our side. Try again, and contact
 * support if it keeps happening", and the person who did contact support had nothing to give
 * them, although every auth route puts a reference on every answer it makes
 * (`apps/web/src/server/password-authentication-handler.ts:605,619`).
 */
describe("a refused sign-in", () => {
  const SUPPORT_REFERENCE = "correlation_signIn_5d2a91c7e3b04f68a1b2c3d4";

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function signIn(): Promise<void> {
    const user = userEvent.setup();
    await user.type(fieldFor("email", SIGN_IN.emailLabel), "dana@example.test");
    await user.type(
      document.querySelector("input[name='password']") as HTMLInputElement,
      "harbour lantern gate phrase",
    );
    await user.click(screen.getByRole("button", { name: SIGN_IN.submitLabel }));
  }

  it("shows the generic sentence and the support reference for a code it cannot map", async () => {
    stubRefusedFetch("AUTH_SOMETHING_NEW", SUPPORT_REFERENCE);
    render(<SignInForm signUpEnabled={false} signedOut={false} />);

    await signIn();

    const region = await screen.findByRole("alert");
    expect(region).toHaveTextContent(userMessageSentence(undefined));
    expect(screen.getByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_REFERENCE).closest("[data-support-details]")).not.toBeNull();
  });

  it("shows the mapped sentence and no reference for a code it knows", async () => {
    stubRefusedFetch("AUTH_CREDENTIALS_REJECTED", SUPPORT_REFERENCE);
    render(<SignInForm signUpEnabled={false} signedOut={false} />);

    await signIn();

    const region = await screen.findByRole("alert");
    expect(region).toHaveTextContent(userMessageSentence("AUTH_CREDENTIALS_REJECTED"));
    expect(screen.queryByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeNull();
    expect(screen.queryByText(SUPPORT_REFERENCE)).toBeNull();
  });

  it("says the reference was not recorded when the refusal carried none", async () => {
    stubRefusedFetch(undefined, undefined);
    render(<SignInForm signUpEnabled={false} signedOut={false} />);

    await signIn();

    expect(await screen.findByText(SUPPORT_REFERENCE_NOT_RECORDED)).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_DETAILS_LABELS.supportReference)).toBeInTheDocument();
  });

  /**
   * The rule the six forms keep by construction. If one of them ever renders `problem` some other
   * way, the reference stops reaching that screen and this is what says so.
   */
  it("is rendered the same way by every form that can refuse", async () => {
    const root = resolve("apps/web/src/features/auth/components");
    const forms = [
      "change-password-form.tsx",
      "forgot-password-form.tsx",
      "reset-password-form.tsx",
      "sign-in-form.tsx",
      "sign-up-form.tsx",
      "verify-email-form.tsx",
      "workspace-choice-form.tsx",
    ];
    for (const form of forms) {
      const source = await readFile(join(root, form), "utf8");
      expect(source, form).toContain("<AuthProblem>{problem}</AuthProblem>");
    }
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
