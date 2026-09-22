import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VERIFY_EMAIL } from "../../copy/auth-messages.js";
import type { EmailVerificationView } from "../../features/shell/model/navigation.js";
import type { RuntimeShellSession } from "../../server/runtime-authentication.js";
import { useReviewModeEnvironment } from "./review-mode-test-support.js";

/**
 * PRD-006b D10's unverified-notice row and PRD-006a 006A-AC-021.
 *
 * D10 fixes the sentence "Confirm your email so you can reset your password later. Resend the
 * link." The string lived in the copy module for two batches with nothing rendering it, which is
 * how a requirement passes a writing review and still never reaches the person it was written for.
 * This suite is the renderer's proof: the real authenticated layout, in review mode, for each of
 * the three states the shell session can carry.
 *
 * The sentence is asserted twice over: once against the copy module, so this file declares no
 * user-facing words of its own, and once against D10's literal, so a later edit to the copy module
 * cannot quietly move the product away from the requirement while both sides still agree.
 */

const D10_UNVERIFIED_NOTICE =
  "Confirm your email so you can reset your password later. Resend the link.";
const CSRF_TOKEN = "a-session-bound-token-for-the-proof";

let shell: RuntimeShellSession;

vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation.js", () => ({ usePathname: () => "/overview" }));
vi.mock("../../theme/index.js", () => ({
  ThemeControl: () => <div aria-label="Theme control">Theme control</div>,
}));
/**
 * The guided setup is the layout's other dependency and has nothing to do with the notice. Saying
 * there are no preferences yet is the honest answer for a brand-new account and keeps this suite
 * failing for one reason only.
 */
vi.mock("../../server/setup-preferences.js", () => ({
  readSetupPreferencesForRequest: () => Promise.resolve(undefined),
}));
/**
 * Everything except the session resolution is the real module, including the path constants the
 * notice's form posts to, so a rename on either side fails here rather than shipping a control
 * that posts nowhere.
 */
vi.mock("../../server/runtime-authentication.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../server/runtime-authentication.js")>();
  return { ...actual, resolveRuntimeShellSession: () => Promise.resolve(shell) };
});

const { default: AuthenticatedLayout } = await import("./layout.js");
const { RESEND_VERIFICATION_PATH } = await import("../../server/runtime-authentication.js");

useReviewModeEnvironment();

function signedInShell(emailVerification: EmailVerificationView | undefined): RuntimeShellSession {
  return Object.freeze({
    mode: "review" as const,
    authenticated: true,
    csrfToken: CSRF_TOKEN,
    session: Object.freeze({
      emailVerification,
      safety: Object.freeze({
        dataMode: "synthetic" as const,
        writesEnabled: false as const,
        disclosure: "Nothing here is live.",
      }),
      user: Object.freeze({
        displayName: "Dana Reyes",
        roleLabel: "Workspace owner",
        capabilities: Object.freeze([]),
      }),
      location: Object.freeze({ displayName: "Dana's workspace", source: "Signed in" }),
    }),
  });
}

async function renderShellFor(emailVerification: EmailVerificationView | undefined) {
  shell = signedInShell(emailVerification);
  return render(await AuthenticatedLayout({ children: <p>The workspace</p> }));
}

beforeEach(() => {
  shell = signedInShell("not_applicable");
});

describe("the shell's unverified-email notice (PRD-006b D10, 006A-AC-021)", () => {
  it("says D10's sentence, visibly, without interrupting", async () => {
    const { container } = await renderShellFor("unverified");

    // The sentence is one line of copy with a control inside it: the shell says the first half and
    // offers the second half as the button, and together they are exactly what D10 asks for.
    expect(`${VERIFY_EMAIL.unverifiedNoticeBody} ${VERIFY_EMAIL.unverifiedResendLabel}`).toBe(
      D10_UNVERIFIED_NOTICE,
    );
    expect(VERIFY_EMAIL.unverifiedNotice).toBe(D10_UNVERIFIED_NOTICE);

    /**
     * Found by its sentence rather than by its role. The shell's own regions are also
     * `role="status"`, so the role alone names several elements and an assertion about "a status
     * region" would not be an assertion about this notice.
     */
    const body = screen.getByText(VERIFY_EMAIL.unverifiedNoticeBody);
    const notice = body.closest("[data-live-urgency]");
    expect(notice).not.toBeNull();
    // A thing to do when convenient is a status, never an alert: announced, not interrupting.
    expect(notice).toHaveAttribute("role", "status");
    expect(notice).toHaveAttribute("aria-live", "polite");
    expect(notice).toHaveAttribute("aria-atomic", "true");
    expect(notice).toHaveAttribute("data-live-urgency", "status");
    // Visible as well as announced: the notice must not be the screen-reader-only variant.
    expect(notice?.className).not.toContain("oalo-visually-hidden");
    expect(container.textContent).toContain(VERIFY_EMAIL.unverifiedNoticeBody);
  });

  it("offers the resend control as a form carrying the session-bound token", async () => {
    await renderShellFor("unverified");

    const control = screen.getByRole("button", { name: VERIFY_EMAIL.unverifiedResendLabel });
    expect(control).toHaveAttribute("type", "submit");

    const form = control.closest("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("action")).toBe(RESEND_VERIFICATION_PATH);
    expect(form?.getAttribute("method")).toBe("post");

    // A form post cannot set x-csrf-token, so the token travels as a field and the route promotes
    // it before the mutation gate sees it. The session cookie never reaches the document.
    const field = form?.querySelector('input[name="csrfToken"]');
    expect(field).toHaveAttribute("type", "hidden");
    expect(field).toHaveAttribute("value", CSRF_TOKEN);
  });

  it("says nothing at all once the address is confirmed", async () => {
    const { container } = await renderShellFor("verified");

    expect(screen.queryByText(VERIFY_EMAIL.unverifiedNoticeBody)).toBeNull();
    expect(screen.queryByRole("button", { name: VERIFY_EMAIL.unverifiedResendLabel })).toBeNull();
    expect(container.textContent).not.toContain(VERIFY_EMAIL.unverifiedNoticeBody);
  });

  /**
   * 006A-AC-021 is explicit: with the port not configured the shell shows no verification notice.
   * A deployment that never sent a message must not ask anyone to go and look for one, and a
   * control that could do nothing must not be offered.
   */
  it("says nothing on a deployment that cannot send, and nothing when the state is absent", async () => {
    const quiet = await renderShellFor("not_applicable");
    expect(quiet.container.textContent).not.toContain(VERIFY_EMAIL.unverifiedNoticeBody);
    quiet.unmount();

    const absent = await renderShellFor(undefined);
    expect(absent.container.textContent).not.toContain(VERIFY_EMAIL.unverifiedNoticeBody);
  });
});
