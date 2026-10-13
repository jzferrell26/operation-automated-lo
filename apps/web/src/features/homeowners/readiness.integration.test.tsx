import { act, cleanup, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type HomeWorkspace } from "@oalo/contracts";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { HomeownerWorkspace } from "./workspace.js";
import { useHomeWorkspace } from "./use-home-workspace.js";
import {
  liveWorkspace,
  sampleSavedProperty,
  stubDialogLayout,
} from "./home-workspace.test-support.js";

const network = vi.hoisted(() => ({
  reports: { read: vi.fn(), write: vi.fn() },
  navigate: vi.fn(),
}));
vi.mock("../http/internal-api.js", () => ({
  getInternalJson: network.reports.read,
  postInternalJson: network.reports.write,
}));
vi.mock("next/navigation.js", () => ({ useRouter: () => ({ push: network.navigate }) }));
let workspace: HomeWorkspace;
const property = sampleSavedProperty();
beforeEach(() => {
  vi.resetAllMocks();
  stubDialogLayout();
  workspace = liveWorkspace([
    {
      ...property,
      reports: property.reports.map((report) => ({
        ...report,
        input: { ...report.input, association: "property_only", contactId: "property-only" },
      })),
    },
  ]);
  network.reports.read.mockImplementation(async (path: string) =>
    Response.json(path.includes("/reports/") ? { delivery: null } : workspace),
  );
  network.reports.write.mockResolvedValue(Response.json({ message: "Saved." }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("homeowner readiness without new provider authority", () => {
  it("uses the governed body token only on the new readiness notice", async () => {
    workspace = liveWorkspace(workspace.properties, { monthlyLookupLimit: 0 });
    render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
    const notice = (await screen.findByText("New valuations need a lookup allowance")).closest(
      "div",
    );
    expect(notice?.className).toMatch(/readinessNotice/u);
    const css = await readFile(join(import.meta.dirname, "homeowners.module.css"), "utf8");
    expect(css).toMatch(
      /\.notice\.readinessNotice p\s*\{\s*font-size:\s*var\(--text-secondary-size\);\s*\}/u,
    );
  });
  it.each([
    [
      { ghlConnected: false, deliveryEnabled: true },
      "HighLevel contact access is unavailable for this workspace.",
    ],
    [
      { ghlConnected: true, deliveryEnabled: false },
      "HighLevel report delivery is unavailable for this workspace.",
    ],
    [
      { ghlConnected: true, deliveryEnabled: true, canWrite: false },
      "You have read-only access to this report.",
    ],
  ])(
    "explains an unavailable linked-report handoff without dispatching it",
    async (overrides, reason) => {
      workspace = liveWorkspace([property], overrides);
      const user = userEvent.setup();
      render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
      await screen.findByRole("heading", { name: property.address.street, level: 1 });
      const handoff = screen.getByRole("button", { name: "Hand off to HighLevel" });
      expect(handoff).toBeDisabled();
      expect(
        screen.getByText(new RegExp(String(reason).replaceAll(".", "\\."), "u")),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
      await user.click(handoff);
      expect(network.reports.write).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog", { name: "Hand this report to HighLevel?" })).toBeNull();
    },
  );
  it("requires a recheck before handoff when capability is unknown", async () => {
    workspace = liveWorkspace([property], {
      readiness: {
        storage: "unknown",
        writeAccess: "unknown",
        valuation: "unknown",
        freshLookup: "unknown",
      },
    });
    render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
    await screen.findByRole("heading", { name: property.address.street, level: 1 });
    expect(screen.getByRole("button", { name: "Hand off to HighLevel" })).toBeDisabled();
    expect(screen.getByText(/HighLevel handoff availability could not be checked/u)).toBeVisible();
    expect(network.reports.write).not.toHaveBeenCalled();
  });
  it("retains the deliberate handoff for a configured writer without dispatching on open", async () => {
    workspace = liveWorkspace([property]);
    const user = userEvent.setup();
    render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
    await screen.findByRole("heading", { name: property.address.street, level: 1 });
    const handoff = screen.getByRole("button", { name: "Hand off to HighLevel" });
    expect(handoff).toBeEnabled();
    await user.click(handoff);
    expect(
      await screen.findByRole("dialog", { name: "Hand this report to HighLevel?" }),
    ).toBeVisible();
    expect(network.reports.write).not.toHaveBeenCalled();
  });
  it("names the active monthly control and preserves turning off an existing delivery preference", async () => {
    workspace = liveWorkspace(
      [
        {
          ...property,
          enrollment: { ...property.enrollment, cadence: "monthly", deliverUpdates: true },
        },
      ],
      { deliveryEnabled: false },
    );
    const user = userEvent.setup();
    render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
    await screen.findByRole("heading", { name: property.address.street, level: 1 });
    expect(
      screen.getByText(
        /You can pause updates or turn off an existing delivery preference using Monthly updates\./u,
      ),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Monthly updates" }));
    const delivery = screen.getByLabelText(
      /Hand fresh reports to the configured HighLevel workflow/u,
    );
    expect(delivery).toBeEnabled();
    await user.click(delivery);
    await user.click(screen.getByRole("button", { name: "Save update preferences" }));
    expect(network.reports.write).toHaveBeenCalledWith(
      "/api/homeowner-reports",
      expect.objectContaining({ action: "enrollment", deliverUpdates: false }),
    );
  });
  it.each([
    [0, 0, "New valuations need a lookup allowance"],
    [10, 10, "This month's valuation allowance is used"],
  ])("keeps saved actions at allowance %s used %s", async (limit, used, heading) => {
    workspace = liveWorkspace(workspace.properties, {
      monthlyLookupLimit: Number(limit),
      lookupsThisMonth: Number(used),
    });
    const user = userEvent.setup();
    render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
    expect(await screen.findByText(heading)).toBeVisible();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Share report" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh value" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Update loan details" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Save updated report" }),
    );
    expect(network.reports.write).toHaveBeenCalledWith(
      "/api/homeowner-reports",
      expect.objectContaining({ action: "revise" }),
    );
    await user.click(screen.getByRole("button", { name: "Update schedule" }));
    expect(screen.getByText(/You can pause updates or choose On demand only now/u)).toBeVisible();
    expect(screen.getByRole("button", { name: "Save update preferences" })).toBeEnabled();
  });
  it("keeps cached-value creation available with zero fresh lookup allowance", async () => {
    workspace = liveWorkspace([], {
      monthlyLookupLimit: 0,
      lookupsThisMonth: 0,
      ghlConnected: false,
    });
    const user = userEvent.setup();
    render(<HomeownerWorkspace view="new" initialBrand={property.reports[0]!.input.brand} />);
    await screen.findByRole("heading", { name: "Create a homeowner report" });
    for (const [label, value] of [
      ["Property street address", "214 Cedar Street"],
      ["City", "Dallas"],
      ["State", "TX"],
      ["ZIP code", "75201"],
    ])
      await user.type(screen.getByLabelText(label!), value!);
    await user.click(
      screen.getByLabelText(
        "I have confirmed the property address and authorize this valuation lookup.",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Create report" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Create report" }));
    expect(network.reports.write).toHaveBeenCalledWith(
      "/api/homeowner-reports",
      expect.objectContaining({ action: "create" }),
    );
  });
  it("keeps snapshot editing and sharing while valuation setup is unavailable", async () => {
    workspace = liveWorkspace(workspace.properties, { valuationConnected: false });
    render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
    expect(await screen.findByText("Valuations are unavailable for this workspace")).toBeVisible();
    expect(screen.getByRole("button", { name: "Update loan details" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Share report" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh value" })).toBeDisabled();
    expect(document.querySelector('a[href="/settings/connections"]')).toBeNull();
  });
  it("explains viewer access without offering report creation or changes", async () => {
    workspace = liveWorkspace(workspace.properties, { canWrite: false });
    render(<HomeownerWorkspace />);
    expect(await screen.findByText("You have read-only report access")).toBeVisible();
    expect(screen.queryByRole("link", { name: /Create.*report/u })).toBeNull();
    cleanup();
    render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
    await screen.findByRole("heading", { name: property.address.street, level: 1 });
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Update loan details" })).toBeNull();
  });
  it("lets a writer pause an existing monthly schedule when fresh allowance is exhausted", async () => {
    workspace = liveWorkspace(
      workspace.properties.map((item) => ({
        ...item,
        enrollment: {
          ...item.enrollment,
          cadence: "monthly",
          paused: false,
          nextRefreshAt: new Date().toISOString(),
        },
      })),
      { monthlyLookupLimit: 1, lookupsThisMonth: 1 },
    );
    const user = userEvent.setup();
    render(<HomeownerWorkspace view="detail" propertyId={property.id} />);
    await screen.findByRole("heading", { name: property.address.street, level: 1 });
    await user.click(screen.getByRole("button", { name: "Monthly updates" }));
    expect(screen.getByRole("button", { name: "Save update preferences" })).toBeDisabled();
    await user.click(screen.getByLabelText("Pause scheduled updates"));
    expect(screen.getByRole("button", { name: "Save update preferences" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Save update preferences" }));
    expect(network.reports.write).toHaveBeenCalledWith(
      "/api/homeowner-reports",
      expect.objectContaining({
        action: "enrollment",
        cadence: "monthly",
        paused: true,
        deliverUpdates: false,
      }),
    );
  });
  it("preserves loaded snapshots on a failed recheck, marks capability unknown, and recovers", async () => {
    const { result } = renderHook(() => useHomeWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));
    network.reports.read.mockRejectedValueOnce(new Error("Temporary report failure"));
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.workspace.properties).toHaveLength(1);
    expect(result.current.workspace.readiness.storage).toBe("unknown");
    expect(result.current.workspace.canWrite).toBe(false);
    expect(result.current.error).toBe("Temporary report failure");
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.workspace.readiness.storage).toBe("ready");
    expect(result.current.workspace.canWrite).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
