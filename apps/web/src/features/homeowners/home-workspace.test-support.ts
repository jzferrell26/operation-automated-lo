import { vi } from "vitest";
import { buildHomeReport } from "@oalo/application/homeowner-reports";
import type { HomeProperty, HomeReport, HomeWorkspace } from "@oalo/contracts";
import { homeownerInput, homeownerValuation } from "../../server/homeowners/homeowner-fixtures.js";
import { storeSampleHomeReport } from "./model.js";

/**
 * What the homeowner report screens need around them to render in a test.
 *
 * Two suites render the real `HomeownerWorkspace` and the real shared report page with a stubbed
 * network: the refusal guard (`refusal-messages.integration.test.tsx`) and the review-surface sweep
 * (`apps/web/src/app/(authenticated)/homeowners/homeowners-review-surface.integration.test.tsx`).
 * They need the same saved report, the same workspace payload, and the same two layout stand-ins,
 * so they share them here instead of carrying two copies that could drift.
 *
 * Every name and word in the data is something a loan officer could really have saved, on purpose:
 * the sweep reads the whole rendered page against the user-language contract, and a test name like
 * "Fixture Homeowner" would be reported as a leak of the contract's own banned word.
 */

/** Inert stand-ins for the layout API jsdom lacks and the dialog and select primitives read. */
export class InertResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/** Call from `beforeEach`. Undone by `vi.restoreAllMocks()` and `vi.unstubAllGlobals()`. */
export function stubDialogLayout(): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(8, 80, 320, 48),
  );
  vi.stubGlobal("ResizeObserver", InertResizeObserver);
}

/** One saved report for a homeowner who is a HighLevel contact, valued today. */
export function sampleSavedReport(now = new Date()): HomeReport {
  const input = homeownerInput(now);
  return buildHomeReport(
    {
      ...input,
      contactName: "Pat Homeowner",
      brand: { ...input.brand, name: "Casey Example", company: "Example Lending" },
    },
    homeownerValuation(now),
    `hreport_${"e".repeat(32)}`,
    `home_${"d".repeat(32)}`,
    now,
  );
}

export function sampleSavedProperty(now = new Date()): HomeProperty {
  return storeSampleHomeReport([], sampleSavedReport(now))[0]!;
}

/** The workspace the server sends a loan officer who can save reports and has everything connected. */
export function liveWorkspace(
  properties: readonly HomeProperty[],
  overrides: Partial<HomeWorkspace> = {},
): HomeWorkspace {
  return {
    mode: "live",
    canWrite: true,
    valuationConnected: true,
    ghlConnected: true,
    deliveryEnabled: true,
    monthlyLookupLimit: 10,
    lookupsThisMonth: 1,
    properties: [...properties],
    ...overrides,
  };
}
