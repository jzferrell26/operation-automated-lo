import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPreviewScreen } from "../../../features/dashboard-preview/dashboard-screen.js";
import { DEFAULT_AD_BRAND } from "../../../features/workspace/ad-brand.js";
import type { WorkspacePageData } from "../../../features/workspace/model.js";
import { OALO_REVIEW_SURFACE_AUTHORIZED } from "../../../server/authenticated-workspace-data.js";
import BrandProfilePage from "./page.js";

/**
 * PRD-008b 008B-AC-007.
 *
 * `/brand` used to show the signed-in person's own saved branding only when the homeowner reports
 * flag was on. With the flag off it showed the workspace's demo-derived brand, which a signed-in
 * person read as their own details. The flag has nothing to do with whose branding this is, so the
 * page now shows the saved-branding editor in review mode either way, and demo values stay in
 * synthetic mode.
 *
 * The data loader is the one the settings page already uses and is mocked here, because what this
 * proves is which screen the page chooses and what that screen shows. Reading and writing that
 * branding for the right workspace is proven against a database in
 * `workspace-brand-reports-flag.postgres.test.ts`.
 */

const mocked = vi.hoisted(() => ({ workspacePageData: vi.fn() }));
vi.mock("../../../server/workspace-page-data.js", () => ({
  workspacePageData: mocked.workspacePageData,
}));
vi.mock("next/navigation.js", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const SAVED_BRAND = {
  name: "Casey Rivera",
  company: "Evergreen Example Lending",
  email: "casey@example.test",
  phone: "555-0100",
  nmls: "123456",
  companyNmls: "234567",
  tagline: "Saved by Casey, not a demo.",
};

const SAVED_PROFILE: WorkspacePageData = {
  view: "profile",
  identity: { name: "Casey Rivera", company: "Evergreen Example Lending", role: "Workspace owner" },
  canEdit: true,
  preferences: {
    brand: { revision: "3b1f6f5e-6c0e-4a39-9f0e-6d7f3c1a9b22", value: SAVED_BRAND },
    adBrand: null,
    partners: null,
    messages: {},
  },
  defaultBrand: SAVED_BRAND,
  defaultAdBrand: DEFAULT_AD_BRAND,
  reportsEnabled: false,
  valuationConfigured: false,
  contactConfigured: false,
  deliveryEnabled: false,
  lookupsUsed: 0,
  lookupLimit: 0,
};

/** What the synthetic brand fixture carries and a signed-in person must never read as their own. */
const DEMO_BRAND_VALUES = ["Alex Morgan", "Prairie Home Lending", "NMLS 0000000"];

function stubEnvironment(
  environment: string,
  reviewSurface: string | undefined,
  reports: string | undefined,
): void {
  vi.stubEnv("OALO_ENVIRONMENT", environment);
  vi.stubEnv("OALO_PROVIDER_MODE", "stub");
  vi.stubEnv("OALO_SYNTHETIC_DATA_ONLY", "true");
  vi.stubEnv("OALO_REVIEW_SURFACE", reviewSurface);
  vi.stubEnv("OALO_HOMEOWNER_REPORTS", reports);
  vi.stubEnv("OALO_DASHBOARD_PREVIEW", undefined);
}

beforeEach(() => {
  mocked.workspacePageData.mockReset();
  mocked.workspacePageData.mockResolvedValue(SAVED_PROFILE);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the brand page in review mode", () => {
  it.each([
    ["set", "enabled"],
    ["unset", undefined],
  ])(
    "shows the signed-in person's own saved branding editor with the reports flag %s",
    async (_state, reports) => {
      stubEnvironment("production", OALO_REVIEW_SURFACE_AUTHORIZED, reports);

      render(await BrandProfilePage());

      expect(mocked.workspacePageData).toHaveBeenCalledWith("profile");
      expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
      expect(screen.getByLabelText("Company name")).toHaveValue(SAVED_BRAND.company);
      expect(screen.getByLabelText("Brand tagline")).toHaveValue(SAVED_BRAND.tagline);
      expect(screen.getByRole("button", { name: "Save your details" })).toBeEnabled();
      for (const demo of DEMO_BRAND_VALUES) {
        expect(document.body.textContent).not.toContain(demo);
      }
    },
  );
});

describe("the brand page in synthetic mode", () => {
  it.each([
    ["set", "enabled"],
    ["unset", undefined],
  ])(
    "keeps the demo brand profile for local development with the reports flag %s",
    async (_state, reports) => {
      stubEnvironment("local", undefined, reports);

      render(await BrandProfilePage());

      expect(mocked.workspacePageData).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Alex Morgan");
      expect(screen.queryByRole("button", { name: "Save your details" })).toBeNull();
    },
  );

  it("still hands the dashboard preview its own screen first", async () => {
    stubEnvironment("local", undefined, undefined);
    vi.stubEnv("OALO_DASHBOARD_PREVIEW", "enabled");

    const page = await BrandProfilePage();

    expect(page.type).toBe(DashboardPreviewScreen);
    expect(mocked.workspacePageData).not.toHaveBeenCalled();
  });
});

/**
 * PRD-008b, the verifier's finding on the saved-branding editor. With the homeowner reports flag
 * unset the editor still said the branding gives "a consistent identity on every new homeowner
 * report" and is "used when you create a new homeowner report", and a workspace with reports off has
 * nowhere to create one. The branding is real and is saved either way, so the page says that, and
 * says what it is waiting for, in whichever state the workspace is in. The loader sets
 * `reportsEnabled` from the same flag, so each case feeds the page what the loader would.
 */
describe("what the brand page says about homeowner reports", () => {
  /** PRD-009d D3: Brand holds the ad brand too, so the page lead speaks for both and names no report. */
  const PAGE_LEAD = "Your name and NMLS number go on every ad automatically.";
  // Writing review pass 2, W-4: the card says what goes where, so the heading "Your details" is true.
  const ON_EDITOR =
    "Saved for your account in this workspace. Your name, company and NMLS numbers go on every ad, and all of it is used when you create a new homeowner report.";
  const OFF_EDITOR =
    "Saved for your account in this workspace. Your name, company and NMLS numbers go on every ad. All of it goes on new homeowner reports once those are turned on.";

  it("keeps saying what the branding does when homeowner reports are on", async () => {
    stubEnvironment("production", OALO_REVIEW_SURFACE_AUTHORIZED, "enabled");
    mocked.workspacePageData.mockResolvedValue({ ...SAVED_PROFILE, reportsEnabled: true });

    render(await BrandProfilePage());

    expect(screen.getByRole("heading", { level: 1, name: "Brand" })).toBeInTheDocument();
    expect(screen.getByText(PAGE_LEAD)).toBeInTheDocument();
    expect(screen.getByText(ON_EDITOR)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("aren't turned on");
    expect(document.body.textContent).not.toContain(OFF_EDITOR);
  });

  it("says homeowner reports are not turned on, and promises nothing, when they are off", async () => {
    stubEnvironment("production", OALO_REVIEW_SURFACE_AUTHORIZED, undefined);
    mocked.workspacePageData.mockResolvedValue({ ...SAVED_PROFILE, reportsEnabled: false });

    render(await BrandProfilePage());

    expect(screen.getByText(PAGE_LEAD)).toBeInTheDocument();
    expect(screen.getByText(OFF_EDITOR)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(ON_EDITOR);
    expect(document.body.textContent).not.toMatch(/on every new homeowner report/u);
    expect(document.body.textContent).not.toMatch(/used when you create a new homeowner report/u);
  });

  it("still lets the person save their branding when homeowner reports are off", async () => {
    stubEnvironment("production", OALO_REVIEW_SURFACE_AUTHORIZED, undefined);
    mocked.workspacePageData.mockResolvedValue({ ...SAVED_PROFILE, reportsEnabled: false });

    render(await BrandProfilePage());

    expect(screen.getByRole("button", { name: "Save your details" })).toBeEnabled();
  });
});
