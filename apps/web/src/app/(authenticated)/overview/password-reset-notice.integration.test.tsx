import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RESET_PASSWORD } from "../../../copy/auth-messages.js";
import {
  OVERVIEW_AFTER_PASSWORD_RESET_PATH,
  OVERVIEW_PATH,
} from "../../../server/password-authentication-handler.js";
import AuthenticatedLayout from "../layout.js";
import { useReviewModeEnvironment } from "../review-mode-test-support.js";
import OverviewPage from "./page.js";

/**
 * PRD-006b D10 and the writing review's F-03.
 *
 * D10's reset-password row ends "Success: the user lands in the workspace with the notice 'Your
 * password is saved. You're signed in.'" The string lived in the copy module for a batch with
 * nothing rendering it, which is how a requirement passes a copy review and still fails the person
 * it was written for. This suite is the renderer's proof: the workspace the reset route redirects
 * to, inside the real authenticated layout, with and without the flag the route sets.
 *
 * The sentence is asserted twice over: once against the copy module, so this file declares no
 * user-facing words of its own, and once against D10's literal, so a later edit to the copy module
 * cannot quietly move the product away from the requirement while both sides still agree.
 */

vi.mock("next/headers.js", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("next/navigation.js", () => ({
  usePathname: () => "/overview",
  redirect: (path: string) => {
    throw new Error(`unexpected redirect to ${path}`);
  },
}));
vi.mock("../../../theme/index.js", () => ({
  ThemeControl: () => <div aria-label="Theme control">Theme control</div>,
}));
/**
 * The workspace read is the page's other dependency and has nothing to do with the notice. It is
 * answered here rather than stood up, so this suite fails for one reason only.
 */
vi.mock("../../../server/campaign-workspace-reads.js", () => ({
  readWorkspaceCampaignsForRequest: () =>
    Promise.resolve(Object.freeze({ authenticated: true, campaigns: [] })),
}));

const D10_SUCCESS_NOTICE = "Your password is saved. You're signed in.";

/** The reset route exists only on a review deployment, so that is the workspace measured here. */
useReviewModeEnvironment();

/** The workspace exactly as the browser reaches it: the layout, the page, and one query. */
async function renderWorkspaceWithQuery(
  parameters: Readonly<Record<string, string | string[] | undefined>>,
) {
  return render(
    await AuthenticatedLayout({
      children: await OverviewPage({ searchParams: Promise.resolve(parameters) }),
    }),
  );
}

describe("the workspace a completed password reset lands on (PRD-006b D10)", () => {
  it("announces the saved-and-signed-in notice, visibly, without interrupting", async () => {
    const { container } = await renderWorkspaceWithQuery({ passwordReset: "1" });

    /**
     * Found by its sentence rather than by its role. The workspace's own empty regions are also
     * `role="status"`, so the role alone names several elements, and an assertion about "a status
     * region" would not be an assertion about this notice.
     */
    const notice = screen.getByText(RESET_PASSWORD.successNotice);
    expect(notice).toHaveTextContent(D10_SUCCESS_NOTICE);
    // A confirmation is a status, never an alert: it is announced, and it does not interrupt.
    expect(notice).toHaveAttribute("role", "status");
    expect(notice).toHaveAttribute("aria-live", "polite");
    expect(notice).toHaveAttribute("aria-atomic", "true");
    expect(notice).toHaveAttribute("data-live-urgency", "status");
    // Visible as well as announced: the notice must not be the screen-reader-only variant.
    expect(notice.className).not.toContain("oalo-visually-hidden");
    expect(container.textContent).toContain(D10_SUCCESS_NOTICE);
  });

  /**
   * The route and the renderer have to agree on one key and one value, and two literals in two
   * files agree only until somebody edits one of them. So the address the route actually returns
   * is parsed here and handed to the page: rename the parameter on either side and this fails.
   */
  it("renders for the exact address the reset route returns", async () => {
    const landing = new URL(OVERVIEW_AFTER_PASSWORD_RESET_PATH, "https://oalo.local");
    expect(landing.pathname).toBe(OVERVIEW_PATH);

    const { container } = await renderWorkspaceWithQuery(
      Object.fromEntries(landing.searchParams.entries()),
    );

    expect(container.textContent).toContain(D10_SUCCESS_NOTICE);
  });

  it("says nothing on an ordinary visit to the workspace", async () => {
    const { container } = await renderWorkspaceWithQuery({});

    expect(screen.queryByText(RESET_PASSWORD.successNotice)).toBeNull();
    expect(container.textContent).not.toContain(D10_SUCCESS_NOTICE);
  });

  it("says nothing for a value the route never wrote", async () => {
    const { container } = await renderWorkspaceWithQuery({ passwordReset: "yes" });

    expect(screen.queryByText(RESET_PASSWORD.successNotice)).toBeNull();
    expect(container.textContent).not.toContain(D10_SUCCESS_NOTICE);
  });
});
