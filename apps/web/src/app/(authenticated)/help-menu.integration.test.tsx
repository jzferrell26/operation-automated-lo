import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Capability } from "../../features/ui-foundation/model/synthetic-ui.js";
import type { RuntimeShellSession } from "../../server/runtime-authentication.js";
import {
  runtimeAuthenticationModuleStub,
  themeModuleStub,
  useReviewModeEnvironment,
} from "./review-mode-test-support.js";

/**
 * PRD-009b D4 and 009B-AC-015. The Help control in the top bar opens a help menu that contains no
 * walkthrough restart.
 *
 * The floating walkthrough is retired, and with it the "Finish setup" chip and the help menu's
 * "Show me around again". Help is the shell's own: one control, one panel with a sentence in it and
 * a way to close it. This renders the real signed-in layout, which is where the walkthrough's
 * controls used to be put into the bar, and looks for them everywhere a person could.
 *
 * "At every frame" is the same component at every frame: the bar's Help shows its label at 768 and
 * wider and its icon below 720, and both are this one button (the shell's own tests measure the
 * frames; `tests/browser/review/top-bar.spec.ts` drives it in a browser).
 */

let shell: RuntimeShellSession;

vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation.js", () => ({ usePathname: () => "/overview" }));
vi.mock("../../theme/index.js", () => themeModuleStub("Appearance theme"));
vi.mock("../../server/runtime-authentication.js", (importOriginal) =>
  runtimeAuthenticationModuleStub(importOriginal, () => shell),
);

const { default: AuthenticatedLayout } = await import("./layout.js");

const CAPABILITIES: readonly Capability[] = ["campaign:create", "location:read", "settings:read"];

function signedInOwner(): RuntimeShellSession {
  return Object.freeze({
    mode: "review" as const,
    authenticated: true,
    csrfToken: "a-session-bound-token-for-the-proof",
    session: Object.freeze({
      emailVerification: "verified" as const,
      safety: Object.freeze({
        dataMode: "synthetic" as const,
        writesEnabled: false as const,
        disclosure: "Not connected yet.",
      }),
      user: Object.freeze({
        displayName: "Dana Reyes",
        roleLabel: "Workspace owner",
        capabilities: Object.freeze([...CAPABILITIES]),
      }),
      location: Object.freeze({
        displayName: "Dana's workspace",
        source: "Signed in with your email.",
      }),
    }),
  });
}

const WALKTHROUGH_CONTROL =
  /show me around|walkthrough|finish setup|guided setup|restart|take a tour/iu;

useReviewModeEnvironment();

describe("the Help control in the top bar (009B-AC-015)", () => {
  it("opens a help panel with a sentence and a way to close it, and no walkthrough restart", async () => {
    shell = signedInOwner();
    const user = userEvent.setup();
    render(await AuthenticatedLayout({ children: <h1>Page</h1> }));

    await user.click(screen.getByRole("button", { name: "Help" }));

    const panel = screen.getByRole("dialog", { name: "Help" });
    expect(
      within(panel).getByText(
        "Questions about Automated LO? Contact support and tell us which page you were on.",
      ),
    ).toBeInTheDocument();
    const controls = within(panel).queryAllByRole("button");
    expect(
      controls.map((control) => control.getAttribute("aria-label") ?? control.textContent),
    ).toEqual(["Close help"]);
    expect(within(panel).queryAllByRole("link")).toEqual([]);
    expect(panel.textContent).not.toMatch(WALKTHROUGH_CONTROL);
  });

  it("puts no walkthrough control anywhere in the bar, open or closed", async () => {
    shell = signedInOwner();
    const { container } = render(await AuthenticatedLayout({ children: <h1>Page</h1> }));
    const bar = screen.getByRole("banner");

    expect(
      [...bar.querySelectorAll("button, a, [role='button'], [role='menuitem']")]
        .map(
          (control) => `${control.getAttribute("aria-label") ?? ""} ${control.textContent ?? ""}`,
        )
        .filter((name) => WALKTHROUGH_CONTROL.test(name)),
    ).toEqual([]);
    expect(container.querySelector("[data-tour]")).toBeNull();
    expect(container.querySelector("[role='menu']")).toBeNull();
  });

  it("has one Help control, not the shell's and a second one beside it", async () => {
    shell = signedInOwner();
    render(await AuthenticatedLayout({ children: <h1>Page</h1> }));

    expect(screen.getAllByRole("button", { name: /^Help$/u })).toHaveLength(1);
  });
});
