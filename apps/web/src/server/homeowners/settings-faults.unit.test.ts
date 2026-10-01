import { beforeEach, describe, expect, it, vi } from "vitest";
import { findVocabularyHits } from "../../copy/forbidden-vocabulary.js";
import { loadWorkspacePageData } from "../workspace-page-data.js";
import { handleHomeWorkspace } from "./http.js";

/**
 * A homeowner setting that is mistyped, seen by the people who are signed in.
 *
 * The paid-lookup allowlist and the monthly allowance are edited by an operator each time a workspace
 * is approved. The independent security review (M-2) fixed what one mistyped entry did to the public
 * report link. The same coupling was still there for the people who are signed in: every workspace
 * page asked the whole homeowner schema to parse before it could render, so one typo stopped sixteen
 * destinations, and the report routes answered "check the required report fields" with the name of
 * the setting, to a loan officer who typed nothing wrong and cannot change a deployment setting.
 * A setting that cannot be read now means the connection is unavailable, which the pages already
 * know how to say.
 */

const mocks = vi.hoisted(() => ({
  repository: { summaries: vi.fn(), usage: vi.fn(), list: vi.fn(), ghlLocation: vi.fn() },
}));
const PRINCIPAL = {
  role: "location_admin",
  locationId: "00000000-0000-4000-8000-000000000011",
  actorId: "00000000-0000-4000-8000-000000000012",
};
vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  createPrincipalBoundTenantContextAuthority: () => ({}),
  PostgresHomeownerRepository: class {
    summaries = mocks.repository.summaries;
    usage = mocks.repository.usage;
    list = mocks.repository.list;
    ghlLocation = mocks.repository.ghlLocation;
  },
}));
vi.mock("../authenticated-workspace-data.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../authenticated-workspace-data.js")>()),
  authenticatedWorkspaceMode: () => "review",
}));
vi.mock("../authenticated-principal.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../authenticated-principal.js")>()),
  resolveAuthenticatedPrincipal: async () => PRINCIPAL,
  resolveAuthenticatedReadPrincipal: async () => PRINCIPAL,
}));
vi.mock("../runtime-authentication.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../runtime-authentication.js")>()),
  resolveRuntimeCampaignCommandPorts: () => ({}),
  resolveRuntimeShellSession: async () => ({
    authenticated: true,
    session: {
      user: { displayName: "Fixture Loan Officer", roleLabel: "Owner" },
      location: { displayName: "Fixture Lending" },
    },
  }),
}));
vi.mock("../campaign-persistence-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => ({}),
  workspaceCorrelationReferenceFor: () => "workspace-reference",
}));
vi.mock("../workspace-preferences.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../workspace-preferences.js")>()),
  workspacePrincipal: async () => PRINCIPAL,
  readWorkspacePreferences: async () => ({ brand: null, partners: null, messages: {} }),
}));
vi.mock("../campaign-workspace-reads.js", () => ({ listWorkspaceCampaigns: async () => [] }));
vi.mock("../setup-preferences.js", () => ({ readSetupPreferences: async () => undefined }));

const WELL_FORMED = {
  OALO_HOMEOWNER_REPORTS: "enabled",
  OALO_HOMEOWNER_LIVE_DATA: "enabled",
  OALO_HOMEOWNER_ALLOWED_LOCATION_IDS: PRINCIPAL.locationId,
  OALO_RENTCAST_API_KEY: "fixture-key",
  OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT: "25",
};
const MISTYPED = [
  ["an entry in the paid-lookup allowlist", { OALO_HOMEOWNER_ALLOWED_LOCATION_IDS: "not-an-id" }],
  ["the monthly allowance", { OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT: "unlimited" }],
] as const;

const request = () => new Request("https://app.example.test/homeowners");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.repository.summaries.mockResolvedValue([]);
  mocks.repository.usage.mockResolvedValue(3);
  mocks.repository.list.mockResolvedValue([]);
  mocks.repository.ghlLocation.mockResolvedValue(null);
});

describe("a workspace page, while a homeowner setting is mistyped", () => {
  it("still opens, and says the valuation and HighLevel connections are not there", async () => {
    const intact = await loadWorkspacePageData(request(), "automations", WELL_FORMED);
    expect(intact).toMatchObject({
      reportsEnabled: true,
      valuationConfigured: true,
      lookupLimit: 25,
      lookupsUsed: 3,
    });
    for (const [, change] of MISTYPED) {
      const page = await loadWorkspacePageData(request(), "automations", {
        ...WELL_FORMED,
        ...change,
      });
      expect(page).toMatchObject({
        view: "automations",
        reportsEnabled: true,
        valuationConfigured: false,
        contactConfigured: false,
        deliveryEnabled: false,
        lookupLimit: 0,
      });
    }
  });

  it("does not say reports are on when they are switched off, whatever else is mistyped", async () => {
    const page = await loadWorkspacePageData(request(), "automations", {
      OALO_HOMEOWNER_REPORTS: "off",
      OALO_HOMEOWNER_ALLOWED_LOCATION_IDS: "not-an-id",
    });
    expect(page).toMatchObject({ reportsEnabled: false, valuationConfigured: false });
  });
});

describe("the report workspace, while a homeowner setting is mistyped", () => {
  it.each(MISTYPED)(
    "answers that reports are unavailable, with no field and no setting named, for %s",
    async (_name, change) => {
      const response = await handleHomeWorkspace(request(), { ...WELL_FORMED, ...change });
      expect(response.status).toBe(503);
      const answer = (await response.json()) as Record<string, unknown>;
      expect(answer).toMatchObject({ error: "REPORTS_UNAVAILABLE" });
      expect(answer).not.toHaveProperty("fields");
      expect(JSON.stringify(answer)).not.toMatch(/OALO_|required report fields/u);
      expect(findVocabularyHits(String(answer.message))).toEqual([]);
    },
  );

  it("still answers a workspace whose settings are well formed", async () => {
    const response = await handleHomeWorkspace(request(), WELL_FORMED);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      mode: "live",
      valuationConnected: true,
      monthlyLookupLimit: 25,
      lookupsThisMonth: 3,
    });
  });
});
