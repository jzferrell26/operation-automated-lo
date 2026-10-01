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
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
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
