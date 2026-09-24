// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildHomeReport } from "@oalo/application/homeowner-reports";
import { HomeReportInputSchema, type HomeProperty, type HomeWorkspace } from "@oalo/contracts";
import { HomeownerWorkspace } from "./workspace.js";
import { useHomeWorkspace } from "./use-home-workspace.js";
import { sampleHomeAddress, sampleHomeValuation } from "./model.js";

const mocked = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn() }));
vi.mock("../http/internal-api.js", () => ({
  getInternalJson: mocked.get,
  postInternalJson: mocked.post,
}));
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ push: mocked.push }) }));

const propertyId = `home_${"a".repeat(32)}`;
let workspace: HomeWorkspace;
let property: HomeProperty;
beforeEach(() => {
  // Reset queued one-shot responses as well as call history. A failed scenario
  // must not donate a response or pending promise to the next test.
  vi.resetAllMocks();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(16, 120, 240, 44),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const now = new Date();
  const input = HomeReportInputSchema.parse({
    requestId: "00000000-0000-4000-8000-000000000001",
    association: "property_only",
    contactId: "property-only",
    contactName: "Property valuation",
    address: sampleHomeAddress,
    mortgage: {
      source: "confirmed",
      firstBalanceMinor: 32_500_000,
      otherBalanceMinor: 0,
      allLiensConfirmed: true,
      asOf: now.toISOString().slice(0, 10),
      loan: null,
    },
    brand: {
      name: "Fixture Officer",
      company: "Fixture Lending",
      email: "",
      phone: "",
      nmls: "",
      companyNmls: "",
      tagline: "",
    },
    communicationBasis: "requested_report",
    confirmedProperty: true,
  });
  const report = buildHomeReport(
    input,
    sampleHomeValuation(now),
    `hreport_${"b".repeat(32)}`,
    propertyId,
    now,
  );
  property = {
    id: propertyId,
    contactId: input.contactId,
    contactName: input.contactName,
    address: input.address,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    enrollment: { cadence: "off", paused: false, deliverUpdates: false, nextRefreshAt: null },
    reports: [report],
    reviewRequestedAt: null,
    lastError: null,
  };
  workspace = {
    mode: "live",
    canWrite: true,
    valuationConnected: true,
    ghlConnected: false,
    deliveryEnabled: false,
    monthlyLookupLimit: 10,
    lookupsThisMonth: 1,
    properties: [property],
  };
  mocked.get.mockImplementation(async (path: string) =>
    Response.json(path.includes("/reports/") ? { delivery: null } : workspace),
  );
  mocked.post.mockImplementation(async () => Response.json({ message: "Action saved." }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openReport() {
  render(<HomeownerWorkspace view="detail" propertyId={propertyId} />);
  await screen.findByRole("heading", { name: sampleHomeAddress.street, level: 1 });
  return userEvent.setup();
}

describe("report actions", () => {
  it("keeps validation and refused saves inside the dialog without losing the entered balance", async () => {
    const user = await openReport();
    await user.click(screen.getByRole("button", { name: "Update loan details" }));
    const dialog = screen.getByRole("dialog", { name: "Update mortgage details" });
    fireEvent.change(within(dialog).getByLabelText("Current first mortgage balance"), {
      target: { value: "invalid" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Save updated report" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Check the mortgage details",
    );
    expect(mocked.post).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText("Current first mortgage balance"), {
      target: { value: "300000" },
    });
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    mocked.post.mockResolvedValueOnce(
      Response.json({ message: "The balance update could not be saved." }, { status: 503 }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Save updated report" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The balance update could not be saved.",
    );
    expect(within(dialog).getByLabelText("Current first mortgage balance")).toHaveValue("300000");
    expect(within(dialog).getByRole("button", { name: "Save updated report" })).toBeEnabled();
  });

  it("reopens canceled schedule edits from the saved preferences", async () => {
    const user = await openReport();
    await user.click(screen.getByRole("button", { name: "Update schedule" }));
    await user.click(screen.getByRole("combobox", { name: "Update frequency" }));
    await user.click(screen.getByRole("option", { name: "Monthly valuation refresh" }));
    await user.click(screen.getByLabelText("Pause scheduled updates"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Update schedule" }));
    expect(screen.getByRole("combobox", { name: "Update frequency" })).toHaveTextContent(
      "On demand only",
    );
    expect(screen.getByLabelText("Pause scheduled updates")).not.toBeChecked();
    expect(mocked.post).not.toHaveBeenCalled();
  });

  it("retains the dialog and disables other actions while the save is pending", async () => {
    const user = await openReport();
    let complete: (response: Response) => void = () => {
      throw new Error("No pending request");
    };
    mocked.post.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    await user.click(screen.getByRole("button", { name: "Update loan details" }));
    await user.click(screen.getByRole("button", { name: "Save updated report" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save updated report" })).toBeDisabled(),
    );
    expect(screen.getByLabelText("Current first mortgage balance")).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeVisible();
    await act(async () => complete(Response.json({ message: "Updated report saved." })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocked.post).toHaveBeenCalledTimes(1);
  });

  it("reports missing clipboard support and retains a share link when revocation fails", async () => {
    const user = await openReport();
    const url = `https://example.test/home-report/${"c".repeat(64)}`;
    mocked.post.mockResolvedValueOnce(
      Response.json({ url, expiresAt: new Date(Date.now() + 86400000).toISOString() }),
    );
    await user.click(screen.getByRole("button", { name: "Share report" }));
    await user.click(
      screen.getByLabelText("I authorize sharing this report with the intended homeowner."),
    );
    await user.click(screen.getByRole("button", { name: "Create report link" }));
    expect(await screen.findByLabelText("Private report link")).toHaveValue(url);
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined as unknown as Clipboard);
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(
      await screen.findByText(
        "Clipboard access is unavailable. Select the report link to copy it.",
      ),
    ).toBeVisible();
    mocked.post.mockResolvedValueOnce(
      Response.json({ message: "Revocation was not saved." }, { status: 503 }),
    );
    await user.click(screen.getByRole("button", { name: "Revoke share links" }));
    await waitFor(() => expect(mocked.post).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Private report link")).toHaveValue(url);
  });

  it("lets an owner remove a failed first lookup and keeps viewer roles read-only", async () => {
    property.reports = [];
    property.lastError = "VALUATION_NOT_FOUND";
    const user = await openReport();
    await user.click(screen.getByRole("button", { name: "Remove property" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Remove property" })).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Remove property" }));
    await waitFor(() => expect(mocked.push).toHaveBeenCalledWith("/homeowners"));
    expect(mocked.post).toHaveBeenCalledWith("/api/homeowner-reports", {
      action: "delete",
      propertyId,
      confirmed: true,
    });
    cleanup();
    workspace.canWrite = false;
    await openReport();
    expect(screen.queryByRole("button", { name: "Remove property" })).not.toBeInTheDocument();
  });

  it("rejects an overlapping mutation before dispatch and releases the guard after a failure", async () => {
    const { result } = renderHook(() => useHomeWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));
    let reject: (failure: Error) => void = () => {
      throw new Error("No pending command");
    };
    mocked.post.mockImplementationOnce(
      () =>
        new Promise<Response>((_resolve, fail) => {
          reject = fail;
        }),
    );
    let pending: Promise<unknown> | undefined;
    await act(async () => {
      pending = result.current
        .command({ action: "resolve-review", propertyId })
        .catch((failure: unknown) => failure);
      await expect(result.current.command({ action: "revoke", propertyId })).rejects.toThrow(
        "Wait for the current report action",
      );
    });
    expect(mocked.post).toHaveBeenCalledTimes(1);
    await act(async () => {
      reject(new Error("Temporary network failure"));
      await pending;
    });
    expect(result.current.busy).toBe(false);
    await act(async () => {
      await result.current.command({ action: "resolve-review", propertyId });
    });
    expect(mocked.post).toHaveBeenCalledTimes(2);
  });
});
