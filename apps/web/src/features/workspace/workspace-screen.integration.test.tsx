import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceScreen } from "./workspace-screen.js";
import type { WorkspacePageData, WorkspaceView } from "./model.js";

/**
 * PRD-008c 008C-AC-007, finding W1 of the 2026-10-01 writing review.
 *
 * The valuation card on the "Follow-up routing" and "Automations" pages used to promise that "you
 * confirm each one before it runs". That is true of a lookup the loan officer starts: the new
 * report form asks for the confirmation, and so does "Request a fresh valuation?". It is not true
 * of a monthly update. Once someone saves "Monthly valuation refresh" for a property, the
 * scheduled refresh (`apps/web/src/server/homeowners/scheduler.ts`) makes a fresh valuation lookup
 * against the same monthly allowance with nobody there to confirm it, and the schedule dialog says
 * as much ("Each fresh valuation counts toward your monthly lookup allowance"). A card that is
 * read by the same person must not promise the opposite.
 */

vi.mock("next/navigation.js", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const BRAND = {
  name: "Casey Rivera",
  company: "Evergreen Example Lending",
  email: "casey@example.test",
  phone: "555-0100",
  nmls: "123456",
  companyNmls: "234567",
  tagline: "",
};

function workspaceData(
  view: WorkspaceView,
  overrides: Partial<WorkspacePageData> = {},
): WorkspacePageData {
  return {
    view,
    identity: {
      name: "Casey Rivera",
      company: "Evergreen Example Lending",
      role: "Workspace owner",
    },
    canEdit: true,
    preferences: { brand: null, partners: null, messages: {} },
    defaultBrand: BRAND,
    campaigns: [],
    properties: [],
    reportsEnabled: true,
    valuationConfigured: true,
    contactConfigured: false,
    deliveryEnabled: false,
    lookupsUsed: 0,
    lookupLimit: 50,
    ...overrides,
  };
}

const CONNECTED_SENTENCE =
  "Your valuation connection is set up for this workspace. Each new lookup counts against your monthly allowance. You confirm the ones you start, and monthly updates, if you turn them on, run without asking each time.";

const NOT_CONNECTED_SENTENCE =
  "A valuation connection and an approved workspace allowance are needed before requesting live values.";

describe.each(["routing", "automations"] as const)("the valuation card on the %s page", (view) => {
  it("says what is true about confirming a lookup once the connection is set up", () => {
    render(<WorkspaceScreen data={workspaceData(view)} />);

    expect(screen.getByText(CONNECTED_SENTENCE)).toBeInTheDocument();
  });

  it("no longer promises that every lookup is confirmed first", () => {
    render(<WorkspaceScreen data={workspaceData(view)} />);

    expect(screen.queryByText(/you confirm each one/iu)).toBeNull();
    expect(screen.queryByText(/before it runs/iu)).toBeNull();
  });

  it("keeps the not-connected sentence for a workspace with no valuation connection", () => {
    render(<WorkspaceScreen data={workspaceData(view, { valuationConfigured: false })} />);

    expect(screen.getByText(NOT_CONNECTED_SENTENCE)).toBeInTheDocument();
    expect(screen.queryByText(CONNECTED_SENTENCE)).toBeNull();
  });
});
