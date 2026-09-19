import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalSyntheticPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import {
  AuthenticatedWorkspaceUnavailableError,
  OALO_REVIEW_SURFACE_AUTHORIZED,
} from "./authenticated-workspace-data.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
  createTemporaryCampaignStore,
} from "./campaign-command-test-support.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import {
  listWorkspaceCampaigns,
  loadOverviewCampaigns,
  loadWorkspaceCampaign,
  loadWorkspaceCampaignsForRequest,
  readWorkspaceCampaignForRequest,
  readWorkspaceCampaignsForRequest,
} from "./campaign-workspace-reads.js";
import { compileOpenHouseDraft } from "./open-house-draft.js";

const store = createTemporaryCampaignStore("oalo-workspace-reads-");

afterEach(async () => {
  await store.restore();
});

describe("campaign workspace reads", () => {
  it("lists and loads only campaigns for the verified location", async () => {
    await store.enter();
    const principal = createLocalSyntheticPrincipal();
    const adapter = createCampaignPersistenceAdapter(principal, store.env());
    const compiled = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      principal,
      store.env(),
      adapter.versionRepository,
    );
    await adapter.persistDraft(compiled.version, compiled.preflight);

    const listed = await listWorkspaceCampaigns(principal, store.env());
    expect(listed).toHaveLength(1);
    expect(listed[0]?.detailHref).toBe(`/marketing/campaigns/${compiled.version.campaignRef}`);
    expect(listed[0]?.providerPublicationAuthorized).toBe(false);

    const loaded = await loadWorkspaceCampaign(
      principal,
      compiled.version.campaignRef,
      store.env(),
    );
    expect(loaded?.headline).toContain("Tour this home");

    const foreign = {
      ...principal,
      locationRef: "location_otherTenant001",
      locationId: "00000000-0000-4000-8000-000000000899",
    };
    expect(await listWorkspaceCampaigns(foreign, store.env())).toEqual([]);
    expect(
      await loadWorkspaceCampaign(foreign, compiled.version.campaignRef, store.env()),
    ).toBeUndefined();
    expect(await loadWorkspaceCampaign(principal, "campaign_missingRef001", store.env())).toBe(
      undefined,
    );
  });

  /**
   * PRD-005a 005A-AC-010. An empty array is a claim about a tenant, so it may only be the answer to
   * an authenticated read. An unauthenticated request reports itself as unauthenticated, and a
   * store that cannot serve the read raises instead of looking like an empty workspace.
   */
  it("reports an unauthenticated read instead of an empty campaign list", async () => {
    const reviewEnv = {
      ...LOCAL_SYNTHETIC_ENV,
      OALO_ENVIRONMENT: "preview" as const,
      OALO_REVIEW_SURFACE: OALO_REVIEW_SURFACE_AUTHORIZED,
    };
    const request = new Request("https://oalo.local/overview");

    const read = await readWorkspaceCampaignsForRequest(request, reviewEnv);
    expect(read.authenticated).toBe(false);
    expect(read.campaigns).toEqual([]);

    const detail = await readWorkspaceCampaignForRequest(
      request,
      "campaign_missingRef001",
      reviewEnv,
    );
    expect(detail.authenticated).toBe(false);
    expect(detail.campaign).toBeUndefined();

    await expect(loadWorkspaceCampaignsForRequest(request, reviewEnv)).rejects.toBeInstanceOf(
      UnauthenticatedPrincipalError,
    );
  });

  it("surfaces an unavailable workspace rather than reporting no campaigns", async () => {
    await expect(
      loadOverviewCampaigns(createLocalSyntheticPrincipal(), {
        OALO_ENVIRONMENT: "staging",
        OALO_PROVIDER_MODE: "stub",
        OALO_SYNTHETIC_DATA_ONLY: "true",
      }),
    ).rejects.toBeInstanceOf(AuthenticatedWorkspaceUnavailableError);
  });
});
