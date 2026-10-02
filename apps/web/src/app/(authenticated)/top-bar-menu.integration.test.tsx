import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NOT_CONNECTED_DISCLOSURE, NOT_CONNECTED_HEADLINE } from "../../copy/user-language.js";
import type { Capability } from "../../features/ui-foundation/model/synthetic-ui.js";
import type { RuntimeShellSession } from "../../server/runtime-authentication.js";
import {
  runtimeAuthenticationModuleStub,
  themeModuleStub,
  useReviewModeEnvironment,
} from "./review-mode-test-support.js";

/**
 * PRD-009a, 009A-AC-010 and 009A-AC-013, through the real authenticated layout.
 *
 * 010: "Homeowner reports" is in the menu whether `OALO_HOMEOWNER_REPORTS` is set or unset, and
 * the role projection (`reports:read`) still decides whether a given role can open it.
 *
 * 013: no review route renders the shell-wide not-connected banner, and the account control states
 * only who is signed in. Connection facts are stated once, where they matter (D-11), which is not
 * the shell. The walk covers every address the review workspace serves inside this layout.
 */

let pathname = "/overview";
let shell: RuntimeShellSession;

vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation.js", () => ({ usePathname: () => pathname }));
vi.mock("../../theme/index.js", () => themeModuleStub("Appearance theme"));
vi.mock("../../server/runtime-authentication.js", (importOriginal) =>
  runtimeAuthenticationModuleStub(importOriginal, () => shell),
);

const { default: AuthenticatedLayout } = await import("./layout.js");

const OWNER_CAPABILITIES: readonly Capability[] = [
  "campaign:create",
  "location:read",
  "onboarding:read",
  "pipeline:read",
  "reports:read",
  "settings:read",
];

function signedIn(
  capabilities: readonly Capability[],
  roleLabel = "Workspace owner",
): RuntimeShellSession {
  return Object.freeze({
    mode: "review" as const,
    authenticated: true,
    csrfToken: "a-session-bound-token-for-the-proof",
    session: Object.freeze({
      emailVerification: "verified" as const,
      safety: Object.freeze({
        dataMode: "synthetic" as const,
        writesEnabled: false as const,
        disclosure: NOT_CONNECTED_DISCLOSURE,
      }),
      user: Object.freeze({
        displayName: "Dana Reyes",
        roleLabel,
        capabilities: Object.freeze([...capabilities]),
      }),
      location: Object.freeze({
        displayName: "Dana's workspace",
        source: "Signed in with your email. HighLevel, Meta, and Stripe aren't connected yet.",
      }),
    }),
  });
}

async function renderLayout() {
  return render(await AuthenticatedLayout({ children: <h1>Page</h1> }));
}

function mainMenuLabels(): readonly string[] {
  const main = screen.getByRole("navigation", { name: "Main" });
  return within(main)
    .getAllByRole("listitem")
    .map((item) => (item.querySelector("[data-menu-label]")?.textContent ?? "").trim());
}

/**
 * The retired shell banner's accessible name, written out: PRD-009f removes its constant from the
 * copy module with the banner, and this suite has to keep looking for it to prove it is gone.
 */
const OLD_BANNER_LABEL = "Not connected yet: HighLevel, Meta, and Stripe";

const THE_SIX = [
  "Home",
  "Campaigns",
  "Brand",
  "Realtor partners",
  "Homeowner reports",
  "Settings",
] as const;

describe("Homeowner reports in the menu (009A-AC-010)", () => {
  useReviewModeEnvironment();

  beforeEach(() => {
    pathname = "/overview";
  });

  it.each([
    ["set", "enabled"],
    ["unset", undefined],
    ["set to anything else", "disabled"],
  ] as const)("lists it for a workspace owner with the flag %s", async (_state, value) => {
    vi.stubEnv("OALO_HOMEOWNER_REPORTS", value);
    shell = signedIn(OWNER_CAPABILITIES);
    await renderLayout();

    expect(mainMenuLabels()).toEqual(THE_SIX);
    expect(
      within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", {
        name: "Homeowner reports",
      }),
    ).toHaveAttribute("href", "/homeowners");
  });

  it.each([
    ["set", "enabled"],
    ["unset", undefined],
  ] as const)(
    "shows it as text with its reason to a role without reports:read, flag %s",
    async (_state, value) => {
      vi.stubEnv("OALO_HOMEOWNER_REPORTS", value);
      shell = signedIn(["location:read"]);
      await renderLayout();

      const main = screen.getByRole("navigation", { name: "Main" });
      expect(mainMenuLabels()).toEqual(THE_SIX);
      expect(within(main).queryByRole("link", { name: /Homeowner reports/u })).toBeNull();
      expect(within(main).getByText("Homeowner reports").closest("[data-state]")).toHaveAttribute(
        "data-state",
        "permission_restricted",
      );
    },
  );

  it("no longer reads the flag in the layout", () => {
    const layout = readFileSync(resolve("apps/web/src/app/(authenticated)/layout.tsx"), "utf8");
    expect(layout).not.toContain("OALO_HOMEOWNER_REPORTS");
  });
});

/** Every address the review workspace serves inside this layout after PRD-009's removals. */
const REVIEW_ROUTES = [
  "/overview",
  "/marketing/campaigns",
  "/marketing/campaigns/new",
  "/marketing/campaigns/library",
  "/marketing/campaigns/campaign_00000000000000000000000000000000",
  "/brand",
  "/partners",
  "/homeowners",
  "/homeowners/new",
  "/settings",
  "/settings/account",
  "/settings/connections",
  "/settings/routing",
  "/settings/billing",
  "/settings/change-password",
] as const;

describe("no shell-wide not-connected banner in review mode (009A-AC-013)", () => {
  useReviewModeEnvironment();

  it.each(REVIEW_ROUTES)(
    "%s renders no banner and an account control without a connection clause",
    async (route) => {
      pathname = route;
      shell = signedIn(OWNER_CAPABILITIES);
      const user = userEvent.setup();
      await renderLayout();

      expect(screen.queryByLabelText(OLD_BANNER_LABEL)).not.toBeInTheDocument();
      expect(screen.queryByText(NOT_CONNECTED_HEADLINE)).not.toBeInTheDocument();
      expect(screen.queryByText(NOT_CONNECTED_DISCLOSURE)).not.toBeInTheDocument();
      expect(document.querySelector("aside")).toBeNull();

      await user.click(screen.getByRole("button", { name: "Your account: Dana Reyes" }));
      const account = screen.getByRole("dialog", { name: "Your account" });
      expect(account).toHaveTextContent("Dana Reyes");
      expect(account.textContent).not.toMatch(/connected|HighLevel|Meta|Stripe/u);
      expect(within(account).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    },
  );

  it("states who is signed out, and nothing about connections, without a session", async () => {
    pathname = "/overview";
    shell = Object.freeze({
      mode: "review" as const,
      authenticated: false,
      session: undefined,
      csrfToken: undefined,
    });
    await renderLayout();

    expect(screen.queryByLabelText(OLD_BANNER_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(NOT_CONNECTED_HEADLINE)).not.toBeInTheDocument();
    expect(mainMenuLabels()).toEqual(THE_SIX);
  });
});

describe("the synthetic demo keeps one sample-data line (009A-AC-013, 009a D3)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders exactly one sample-data line, in the top bar region, and no banner", async () => {
    vi.stubEnv("OALO_ENVIRONMENT", "local");
    vi.stubEnv("OALO_REVIEW_SURFACE", undefined);
    pathname = "/overview";
    await renderLayout();

    const lines = screen.getAllByText("Local demo with sample data.");
    expect(lines).toHaveLength(1);
    expect(within(screen.getByRole("banner")).getByText("Local demo with sample data.")).toBe(
      lines[0],
    );
    expect(screen.queryByLabelText(OLD_BANNER_LABEL)).not.toBeInTheDocument();
    expect(mainMenuLabels()).toEqual(THE_SIX);
  });
});

/**
 * PRD-009b D4 and 009B-AC-015. The Help control in the top bar opens a help menu that contains no
 * walkthrough restart.
 *
 * The floating walkthrough is retired, and with it the "Finish setup" chip and the help menu's "Show
 * me around again". Help is the shell's own: one control, one panel with a sentence in it and a way to
 * close it. This renders the real signed-in layout, which is where the walkthrough's controls used to
 * be put into the bar, and looks for them everywhere a person could. "At every frame" is the same
 * component at every frame: the bar's Help shows its label at 768 and wider and its icon below 720,
 * and both are this one button (`tests/browser/review/top-bar.spec.ts` drives it in a browser).
 */
describe("the Help control in the top bar (009B-AC-015)", () => {
  useReviewModeEnvironment();

  const WALKTHROUGH_CONTROL =
    /show me around|walkthrough|finish setup|guided setup|restart|take a tour/iu;

  beforeEach(() => {
    pathname = "/overview";
    shell = signedIn(OWNER_CAPABILITIES);
  });

  it("opens a help panel with a sentence and a way to close it, and no walkthrough restart", async () => {
    const user = userEvent.setup();
    await renderLayout();

    await user.click(screen.getByRole("button", { name: "Help" }));

    const panel = screen.getByRole("dialog", { name: "Help" });
    // Writing review pass 2, W-36. A sign-up makes a person the workspace owner, so for the owner
    // "Ask your workspace owner" sent the usual reader to themselves. The owner is told what is true
    // and nothing they cannot follow.
    expect(
      within(panel).getByText("Questions about Automated LO? Write down which page you were on."),
    ).toBeInTheDocument();
    expect(panel.textContent).not.toMatch(/ask your workspace owner/iu);
    const controls = within(panel).queryAllByRole("button");
    expect(
      controls.map((control) => control.getAttribute("aria-label") ?? control.textContent),
    ).toEqual(["Close help"]);
    expect(within(panel).queryAllByRole("link")).toEqual([]);
    expect(panel.textContent).not.toMatch(WALKTHROUGH_CONTROL);
  });

  it.each(["Campaign creator", "Approver", "Publisher", "Viewer"])(
    "still points a %s at their workspace owner, who is somebody else",
    async (roleLabel) => {
      shell = signedIn(OWNER_CAPABILITIES, roleLabel);
      const user = userEvent.setup();
      await renderLayout();

      await user.click(screen.getByRole("button", { name: "Help" }));

      expect(
        within(screen.getByRole("dialog", { name: "Help" })).getByText(
          "Questions about Automated LO? Ask your workspace owner, and tell them which page you were on.",
        ),
      ).toBeInTheDocument();
    },
  );

  it("puts no walkthrough control anywhere in the bar, open or closed", async () => {
    const { container } = await renderLayout();
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
    await renderLayout();

    expect(screen.getAllByRole("button", { name: /^Help$/u })).toHaveLength(1);
  });
});
