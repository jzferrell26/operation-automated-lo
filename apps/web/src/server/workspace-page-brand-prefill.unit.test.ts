import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadWorkspacePageData } from "./workspace-page-data.js";

/**
 * PRD-009b 009B-AC-012. The saved setup profile survives the walkthrough so the Brand form can start
 * from it: when a person has a profile but no saved brand, the form is prefilled from `displayName`,
 * `company`, `nmlsNumber`, and `phone`.
 *
 * It is read through the real workspace page loader, with the stores answered, because that loader
 * is what hands the Brand page its starting values. A saved brand always wins over the profile, and a
 * person with neither starts from the names their session carries, which is the honest default:
 * the product knows what it was told at sign-up and nothing more. Lane 009d owns the Brand page's own
 * fields (009D-AC-003); this pins the half that D4 keeps.
 */

const mocks = vi.hoisted(() => ({
  preferences: vi.fn(),
  setup: vi.fn(),
}));
const PRINCIPAL = {
  role: "location_admin",
  locationId: "00000000-0000-4000-8000-000000000401",
  actorId: "00000000-0000-4000-8000-000000000402",
};

// The loader builds a homeowner repository for every page and uses it only for report pages, so a
// bare constructor is all a Brand page needs.
vi.mock("@oalo/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@oalo/db")>();
  return {
    ...actual,
    createPrincipalBoundTenantContextAuthority: vi.fn(() => ({})),
    PostgresHomeownerRepository: vi.fn(),
  };
});
vi.mock("./authenticated-workspace-data.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authenticated-workspace-data.js")>()),
  authenticatedWorkspaceMode: () => "review",
}));
vi.mock("./authenticated-principal.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authenticated-principal.js")>()),
  resolveAuthenticatedPrincipal: async () => PRINCIPAL,
  resolveAuthenticatedReadPrincipal: async () => PRINCIPAL,
}));
vi.mock("./runtime-authentication.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./runtime-authentication.js")>()),
  resolveRuntimeCampaignCommandPorts: () => ({}),
  resolveRuntimeShellSession: async () => ({
    authenticated: true,
    session: {
      user: { displayName: "Session Name", roleLabel: "Workspace owner" },
      location: { displayName: "Session Lending" },
    },
  }),
}));
vi.mock("./campaign-persistence-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => ({}),
  workspaceCorrelationReferenceFor: () => "workspace-reference",
}));
vi.mock("./workspace-preferences.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./workspace-preferences.js")>()),
  workspacePrincipal: async () => PRINCIPAL,
  readWorkspacePreferences: () => mocks.preferences(),
}));
vi.mock("./setup-preferences.js", () => ({ readSetupPreferences: () => mocks.setup() }));

const request = () => new Request("https://app.example.test/brand");
const NO_SAVED_BRAND = { brand: null, partners: null, messages: {} };

beforeEach(() => {
  mocks.preferences.mockReset();
  mocks.setup.mockReset();
  mocks.preferences.mockResolvedValue(NO_SAVED_BRAND);
});

describe("the Brand form's starting values (009B-AC-012)", () => {
  it("come from the saved profile when there is a profile and no saved brand", async () => {
    mocks.setup.mockResolvedValue({
      profile: {
        displayName: "Dana Reyes",
        company: "Northgate Lending",
        nmlsNumber: "1234567",
        phone: "555 0100",
        // The Realtor fields are kept in storage and read by nothing.
        realtorName: "Priya Nadeem",
      },
    });

    const page = await loadWorkspacePageData(request(), "profile", {});

    expect(page.defaultBrand).toMatchObject({
      name: "Dana Reyes",
      company: "Northgate Lending",
      nmls: "1234567",
      phone: "555 0100",
    });
    expect(JSON.stringify(page.defaultBrand)).not.toMatch(/priya|realtor/iu);
  });

  it("keep only the digits of an NMLS number the person typed with words around it", async () => {
    mocks.setup.mockResolvedValue({
      profile: {
        displayName: "Dana Reyes",
        company: "Northgate Lending",
        nmlsNumber: "NMLS #1234567",
      },
    });

    const page = await loadWorkspacePageData(request(), "profile", {});

    expect(page.defaultBrand.nmls).toBe("1234567");
  });

  it("start from the session's own names when the person has neither a profile nor a brand", async () => {
    mocks.setup.mockResolvedValue({ profile: undefined });

    const page = await loadWorkspacePageData(request(), "profile", {});

    expect(page.defaultBrand).toMatchObject({
      name: "Session Name",
      company: "Session Lending",
      phone: "",
      nmls: "",
    });
  });

  it("are the saved brand, never the profile, once a brand is saved", async () => {
    mocks.setup.mockResolvedValue({
      profile: { displayName: "Dana Reyes", company: "Northgate Lending", nmlsNumber: "1234567" },
    });
    const saved = {
      name: "Alex Morgan",
      company: "Prairie Home Lending",
      email: "",
      phone: "",
      nmls: "7654321",
      companyNmls: "",
      tagline: "",
    };
    mocks.preferences.mockResolvedValue({
      brand: { revision: "0b6f4d7a-3f7e-4a9c-8d2c-5d7a1c1f9e01", value: saved },
      partners: null,
      messages: {},
    });

    const page = await loadWorkspacePageData(request(), "profile", {});

    expect(page.defaultBrand).toEqual(saved);
  });
});
