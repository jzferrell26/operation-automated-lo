import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeownerStoreError } from "@oalo/db";
import type { HomeProperty, HomeWorkspace } from "@oalo/contracts";
import {
  leakedReviewStrings,
  reviewSurfaceText,
  userLanguageForbiddenStrings,
} from "../../app/(authenticated)/review-surface-sweep.js";
import { HomeownerError } from "../../server/homeowners/errors.js";
import { homeError } from "../../server/homeowners/http.js";
import { HomeEnvironmentSchema, reportOrigin } from "../../server/homeowners/runtime.js";
import { HomeownerWorkspace } from "./workspace.js";
import {
  liveWorkspace,
  sampleSavedProperty,
  stubDialogLayout,
} from "./home-workspace.test-support.js";

/**
 * PRD-008c 008C-AC-004, the client half: no homeowner report response puts a machine code in front
 * of a person.
 *
 * Every refusal below is built by the real `homeError`, from the real error classes and, for the
 * report web address, from the real `reportOrigin`, so the body the screen receives is the body the
 * server sends. The screen reads only `message` today (`use-home-workspace.ts`), which is why this
 * is a regression guard rather than a fix: it fails the day somebody renders `error` beside it.
 *
 * What it checks on each screen is the whole readable surface, through the same function the
 * review-surface sweep reads a rendered page with, so a code in an attribute or a description
 * counts as much as one in a paragraph.
 */

const network = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), navigate: vi.fn() }));
vi.mock("../http/internal-api.js", () => ({
  getInternalJson: network.read,
  postInternalJson: network.write,
}));
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ push: network.navigate }) }));

const MACHINE_CODE = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/u;

/**
 * The status the workspace draws while it opens. The tests below wait for it to go. They used to wait
 * for "no status region at all", which stopped being true when the not-turned-on card became the
 * product's empty state (an `AsyncState`, which is itself a polite `role="status"`; scored review
 * pass 2, P2-07).
 */
const OPENING_SENTENCE = "Opening homeowner reports…";

let workspace: HomeWorkspace;
let property: HomeProperty;

beforeEach(() => {
  vi.resetAllMocks();
  stubDialogLayout();
  property = sampleSavedProperty();
  workspace = liveWorkspace([property]);
  network.read.mockImplementation(async (path: string) =>
    Response.json(path.includes("/reports/") ? { delivery: null } : workspace),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openReport() {
  render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
  await screen.findByRole("heading", { name: property.address.street, level: 1 });
  return userEvent.setup();
}

/** The real error `reportOrigin` throws for one deployment setting, so the sentence is not copied. */
function reportAddressRefusal(environment: Record<string, string>): Response {
  try {
    reportOrigin(HomeEnvironmentSchema.parse(environment));
  } catch (error) {
    return homeError(error);
  }
  throw new Error("The report web address was accepted, so there is no refusal to show.");
}

function expectNoMachineCodeOnScreen(...codes: readonly string[]): void {
  const surface = reviewSurfaceText(document.body);
  for (const code of codes) {
    expect(surface).not.toContain(code);
  }
  expect(surface).not.toMatch(MACHINE_CODE);
  expect(leakedReviewStrings(surface, userLanguageForbiddenStrings())).toEqual([]);
}

describe("a refused homeowner report request", () => {
  it("shows the sentence for a conflicting request and not its code", async () => {
    const user = await openReport();
    await user.click(screen.getByRole("button", { name: "Update loan details" }));
    const dialog = screen.getByRole("dialog", { name: "Update mortgage details" });
    network.write.mockResolvedValueOnce(homeError(new HomeownerStoreError("IDEMPOTENCY_CONFLICT")));

    await user.click(within(dialog).getByRole("button", { name: "Save updated report" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "This saved request was already used with different details. Start a new report request.",
    );
    expect(network.write).toHaveBeenCalledTimes(1);
    expectNoMachineCodeOnScreen("IDEMPOTENCY_CONFLICT");
  });

  it.each([
    ["has no web address set up", {}, "REPORT_URL_NOT_CONFIGURED"],
    [
      "has a web address that is not secure",
      { OALO_APP_URL: "http://reports.example.test" },
      "REPORT_URL_NOT_CONFIGURED",
    ],
  ] as const)(
    "shows what to do, and not the code, when sharing is unavailable because the deployment %s",
    async (_case, environment, code) => {
      const user = await openReport();
      await user.click(screen.getByRole("button", { name: "Share report" }));
      const dialog = screen.getByRole("dialog", { name: "Create a private report link?" });
      await user.click(
        within(dialog).getByLabelText(
          "I authorize sharing this report with the intended homeowner.",
        ),
      );
      network.write.mockResolvedValueOnce(reportAddressRefusal(environment));

      await user.click(within(dialog).getByRole("button", { name: "Create report link" }));

      const alert = await within(dialog).findByRole("alert");
      expect(alert).toHaveTextContent("We can't create a report link yet");
      expect(alert).toHaveTextContent("Contact support");
      expectNoMachineCodeOnScreen(code);
    },
  );

  it("shows the unavailable sentence and not its code when the workspace cannot be opened", async () => {
    network.read.mockResolvedValue(homeError(new Error("connect ECONNREFUSED 10.0.0.5:5432")));

    render(<HomeownerWorkspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Homeowner reports are unavailable right now. Your existing data has not been replaced.",
    );
    await waitFor(() => expect(screen.queryByText(OPENING_SENTENCE)).not.toBeInTheDocument());
    expectNoMachineCodeOnScreen("REPORTS_UNAVAILABLE");
  });

  it("shows the sentence for a role that cannot act and not its code, wherever it is announced", async () => {
    const user = await openReport();
    await user.click(screen.getByRole("button", { name: "Update schedule" }));
    network.write.mockResolvedValueOnce(
      homeError(
        new HomeownerError(
          "REPORT_ACCESS_DENIED",
          403,
          "Your role cannot perform this report action. Ask your workspace owner.",
        ),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Save update preferences" }));

    // The sentence is announced on the page and again inside the dialog, so there are two alerts.
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    for (const alert of alerts) {
      expect(alert).toHaveTextContent(
        "Your role cannot perform this report action. Ask your workspace owner.",
      );
    }
    expectNoMachineCodeOnScreen("REPORT_ACCESS_DENIED");
  });
});

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

const NOT_ENABLED_SENTENCE = "Homeowner reports need to be enabled for this workspace.";

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
    await waitFor(() => expect(screen.queryByText(OPENING_SENTENCE)).not.toBeInTheDocument());
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

  /**
   * The scored baseline review pass 2, P2-07: "screens ... do not implement state views ad hoc"
   * (`03-components/async-empty-error-permission-state.md`). The card was hand-built, with its own
   * inset and rhythm; it is the product's empty state now, on the page's card surface, with the two
   * ways forward in the state's two action slots, as the Realtor partners page's empty list is.
   */
  it("draws the empty card as the product's empty state, with its actions in the action slots", async () => {
    network.read.mockResolvedValue(reportsNotEnabled());

    render(<HomeownerWorkspace />);

    const state = (
      await screen.findByRole("heading", { level: 2, name: "Connect the report workspace" })
    ).closest("section");
    expect(state).toHaveAttribute("data-state", "empty");
    expect(state).toHaveAttribute("data-surface", "card");
    const actions = state?.querySelector(".oalo-state-actions");
    expect(within(actions as HTMLElement).getByRole("button")).toHaveTextContent(
      "Check connection again",
    );
    expect(within(actions as HTMLElement).getByRole("link")).toHaveTextContent(
      "Workspace connections",
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
