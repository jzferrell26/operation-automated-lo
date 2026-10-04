import { readdirSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkspaceView } from "../../../features/workspace/model.js";
import { workspaceData } from "../../../features/workspace/workspace.test-support.js";
import { useReviewModeEnvironment } from "../review-mode-test-support.js";
import WorkspaceModulePage, { generateMetadata } from "./page.js";

/**
 * PRD-009f 009F-AC-003, 009F-AC-004, 009F-AC-010, and the part of 009F-AC-001 that says an
 * unrelated unknown address is still the ordinary not-found.
 *
 * The catch-all serves the addresses that survive the removals: Realtor partners, Settings and its
 * routing and billing pages. It is asked for each one the way the framework asks for it, in review
 * mode, with the data loader mocked, because what this proves is which screen each address chooses
 * and what that screen says. Reading the data for the right workspace is proven against a database
 * in the `.postgres.test.ts` suites.
 */

const mocked = vi.hoisted(() => ({ workspacePageData: vi.fn() }));
vi.mock("../../../server/workspace-page-data.js", () => ({
  workspacePageData: mocked.workspacePageData,
}));
vi.mock("next/navigation.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation.js")>()),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

useReviewModeEnvironment();

async function open(address: string) {
  const path = address.split("/").filter(Boolean);
  const view = (await WorkspaceModulePage({
    params: Promise.resolve({ workspacePath: path }),
  })) as React.ReactElement;
  return render(view);
}

beforeEach(() => {
  mocked.workspacePageData.mockReset();
  mocked.workspacePageData.mockImplementation(async (view: WorkspaceView) =>
    workspaceData(view, { lookupsUsed: 4 }),
  );
});

describe("009F-AC-003: the addresses that stay still serve their page", () => {
  it.each([
    ["/partners", "partners", "Your Realtor partners"],
    ["/settings", "settings", "Settings"],
    ["/settings/routing", "routing", "Where new leads go in HighLevel"],
    ["/settings/billing", "billing", "Plan and usage"],
  ] as const)("%s opens the %s page", async (address, view, title) => {
    await open(address);

    expect(mocked.workspacePageData).toHaveBeenCalledWith(view);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });

  it("answers not-found for an address that is neither kept nor moved, with no sentence about a gone page", async () => {
    for (const address of ["/leads/someone", "/settings/not-a-page", "/reports/2026", "/nothing"])
      await expect(open(address), address).rejects.toMatchObject({
        digest: "NEXT_HTTP_ERROR_FALLBACK;404",
      });
  });

  it("no longer reads data for an address that moved or went", async () => {
    for (const address of ["/marketing", "/marketing/creative", "/leads", "/automations"])
      await expect(open(address), address).rejects.toMatchObject({
        digest: "NEXT_HTTP_ERROR_FALLBACK;404",
      });
    expect(mocked.workspacePageData).not.toHaveBeenCalled();
  });

  it("keeps the pages that survive in the catch-all and nothing else in its directory", () => {
    expect(readdirSync(join(import.meta.dirname)).sort()).toEqual([
      "error.tsx",
      "loading.tsx",
      "page.tsx",
      "workspace-routes.integration.test.tsx",
    ]);
  });
});

describe("009F-AC-004: Settings is one page with three cards", () => {
  it("names Account, Connections with HighLevel and Meta, and where new leads go in HighLevel", async () => {
    await open("/settings");

    const cards = screen.getAllByRole("heading", { level: 2 });
    expect(cards.map((card) => card.textContent)).toEqual([
      "Account",
      "Connections",
      "Where new leads go in HighLevel",
    ]);
    expect(screen.getByText(/HighLevel and Meta/u)).toBeInTheDocument();
  });

  it("links each card to its sub-page, and Account also to Plan and usage", async () => {
    await open("/settings");

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs.sort()).toEqual([
      "/settings/account",
      "/settings/billing",
      "/settings/connections",
      "/settings/routing",
    ]);
    const account = screen.getByRole("heading", { name: "Account" }).closest("section")!;
    expect(within(account).getByRole("link", { name: "Plan and usage" })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  it("no longer offers report branding or workspace access as settings", async () => {
    await open("/settings");

    expect(screen.queryByText(/Report branding/u)).toBeNull();
    expect(screen.queryByText(/Workspace access/u)).toBeNull();
    expect(document.querySelector('a[href="/settings/profile"]')).toBeNull();
    expect(document.querySelector('a[href="/settings/team"]')).toBeNull();
  });

  it("keeps the billing page's heading and the sentence after it", async () => {
    await open("/settings/billing");

    expect(
      screen.getByRole("heading", { level: 2, name: "Subscription billing is not enabled" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No subscription, invoice or payment method is claimed for this workspace. Your lookup allowance controls requests; it is not proof of a lookup charge or customer payment.",
      ),
    ).toBeInTheDocument();
  });
});

describe("009F-AC-010: Realtor partners stays a plain list with one honest line at the top", () => {
  it("puts the line before the list and the editor, and keeps both", async () => {
    await open("/partners");

    const line = screen.getByText(
      "Your ads show only you. Realtor partners never appear in paid ads.",
    );
    const addButton = screen.getByRole("button", { name: /Add Realtor partner/u });
    expect(line.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText("Search your Realtor partners")).toBeInTheDocument();
  });
});

/**
 * PRD-009 writing review closing check, N-1. The four addresses this page serves were the only
 * menu pages whose tab still read "Automated LO", so a person with three tabs open could not tell
 * Realtor partners from Settings. Each address now names itself, and the root layout's template
 * adds the product after it.
 */
describe("N-1: each address the catch-all serves names itself in the tab", () => {
  async function titleOf(address: string) {
    const path = address.split("/").filter(Boolean);
    return (await generateMetadata({ params: Promise.resolve({ workspacePath: path }) })).title;
  }

  it.each([
    ["/partners", "Realtor partners"],
    ["/settings", "Settings"],
    ["/settings/routing", "Where new leads go"],
    ["/settings/billing", "Plan and usage"],
  ] as const)("%s is titled %s", async (address, title) => {
    expect(await titleOf(address)).toBe(title);
  });

  it("leaves an address it does not serve to the default title, as the page answers it not-found", async () => {
    expect(await titleOf("/nothing")).toBeUndefined();
    expect(await titleOf("/settings/not-a-page")).toBeUndefined();
  });
});
