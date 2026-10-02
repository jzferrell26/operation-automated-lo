import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DashboardPreviewProvider } from "./preview-provider.js";
import { ProductShell } from "./product-shell.js";

vi.mock("next/navigation.js", () => ({
  usePathname: () => "/overview",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../../theme/ThemeControl.js", () => ({
  ThemeControl: () => <div aria-label="Appearance theme">Theme control</div>,
}));

/**
 * PRD-009a D2 and 009A-AC-014, for the local dashboard preview. The preview keeps its own navy
 * navigation and screen compositions (009a Non-Goals, D5) and reads the one menu: exactly the six
 * labels in order, and no Leads and pipeline, Reports, Automations, Marketing studio and its
 * sub-items, or Getting started. Its floating walkthrough and setup welcome retire with the
 * product's (D-15).
 */

const THE_SIX = [
  "Home",
  "Campaigns",
  "Brand",
  "Realtor partners",
  "Homeowner reports",
  "Settings",
] as const;

/** jsdom has no layout, so the header-height observer gets an inert stand-in. */
class InertResizeObserver {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}

function renderPreviewShell() {
  vi.stubGlobal("ResizeObserver", InertResizeObserver);
  return render(
    <DashboardPreviewProvider>
      <ProductShell>
        <h1>Preview page</h1>
      </ProductShell>
    </DashboardPreviewProvider>,
  );
}

describe("the dashboard preview shell's menu (009A-AC-014)", () => {
  it("yields exactly the six labels, in order, and nothing the menu dropped", () => {
    renderPreviewShell();

    const menu = screen.getByRole("navigation", { name: "Main navigation" });
    const labels = within(menu)
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label"));
    expect(labels).toEqual(THE_SIX);
    expect(
      screen.queryByText(
        /Leads|Pipeline|^Reports$|Automations|Marketing studio|Property sites|Creative library|Brand kit|Getting started/u,
      ),
    ).toBeNull();
  });

  it("links nowhere the removals took away, and mounts no walkthrough", async () => {
    const user = userEvent.setup();
    const { container } = renderPreviewShell();

    expect(container.querySelector('[data-product-walkthrough="true"]')).toBeNull();
    expect(container.querySelector('a[href="/onboarding"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: "Help" }));
    const help = screen.getByRole("dialog", { name: "Help" });
    expect(within(help).queryByText(/walkthrough|setup/iu)).toBeNull();
    expect(document.querySelector('a[href="/onboarding"]')).toBeNull();
  });

  it("no longer carries the walkthrough or its guides as source", () => {
    const shell = readFileSync(
      resolve("apps/web/src/features/dashboard-preview/product-shell.tsx"),
      "utf8",
    );
    const help = readFileSync(
      resolve("apps/web/src/features/dashboard-preview/product-help.tsx"),
      "utf8",
    );
    for (const source of [shell, help]) {
      expect(source).not.toMatch(/product-walkthrough|product-guides|setup-wizard|\/onboarding/u);
    }
  });
});
