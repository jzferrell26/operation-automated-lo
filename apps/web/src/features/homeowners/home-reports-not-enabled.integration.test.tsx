import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomeownerError } from "../../server/homeowners/errors.js";
import { homeError } from "../../server/homeowners/http.js";
import { HomeownerWorkspace } from "./workspace.js";
import { stubDialogLayout } from "./home-workspace.test-support.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, F-14.
 *
 * A workspace that has not turned homeowner reports on answered the report list with a refusal, and
 * the page drew that refusal as a red alert ("Homeowner reports need to be enabled for this
 * workspace.") above its own title, with no glyph, over an empty card that says the same thing
 * honestly and offers the way forward. `LiveRegion` reserves `alert` for a failed submission or a
 * blocked provider result, and brief section 9 reserves the critical colour for failures. Not being
 * turned on yet is a state of the workspace, so the honest empty card is the whole statement.
 *
 * The refusal below is built by the real `homeError` from the real `HomeownerError`, so the body the
 * page reads is the body the server sends.
 */

const network = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), navigate: vi.fn() }));
vi.mock("../http/internal-api.js", () => ({
  getInternalJson: network.read,
  postInternalJson: network.write,
}));
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ push: network.navigate }) }));

const NOT_ENABLED_SENTENCE = "Homeowner reports need to be enabled for this workspace.";

beforeEach(() => {
  vi.resetAllMocks();
  stubDialogLayout();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function reportsNotEnabled(): Response {
  return homeError(new HomeownerError("REPORTS_NOT_CONFIGURED", 503, NOT_ENABLED_SENTENCE));
}

describe("a workspace that has not turned homeowner reports on", () => {
  it("shows the page title and the honest empty card, with no alert", async () => {
    network.read.mockResolvedValue(reportsNotEnabled());

    render(<HomeownerWorkspace />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Homeowner reports" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Connect the report workspace" }),
    ).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.body.textContent).not.toContain(NOT_ENABLED_SENTENCE);
  });

  it("makes the page title the first thing on the page, as the other pages have it", async () => {
    network.read.mockResolvedValue(reportsNotEnabled());

    const { container } = render(<HomeownerWorkspace />);
    await screen.findByRole("heading", { level: 1, name: "Homeowner reports" });

    const workspace = container.querySelector("[data-homeowner-workspace]");
    expect(workspace?.firstElementChild?.tagName).toBe("HEADER");
  });

  it("still offers the two ways forward the empty card carries", async () => {
    network.read.mockResolvedValue(reportsNotEnabled());

    render(<HomeownerWorkspace />);

    expect(await screen.findByRole("button", { name: "Check connection again" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Workspace connections" })).toHaveAttribute(
      "href",
      "/settings/connections",
    );
  });

  it("keeps the alert for a refusal that is a failure: reports unavailable", async () => {
    network.read.mockResolvedValue(homeError(new Error("connect ECONNREFUSED 10.0.0.5:5432")));

    render(<HomeownerWorkspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Homeowner reports are unavailable right now. Your existing data has not been replaced.",
    );
  });

  it("keeps the alert for a refusal with no code, with its sentence", async () => {
    network.read.mockResolvedValue(
      Response.json({ message: "Something went wrong." }, { status: 500 }),
    );

    render(<HomeownerWorkspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
  });
});

describe("the code the page treats as a state", () => {
  it("is the code the reports runtime throws when reports are not turned on", async () => {
    const runtime = await readFile(
      join(resolve(import.meta.dirname), "../../server/homeowners/runtime.ts"),
      "utf8",
    );

    expect(runtime).toMatch(/"REPORTS_NOT_CONFIGURED",\s*503,/u);
  });
});
