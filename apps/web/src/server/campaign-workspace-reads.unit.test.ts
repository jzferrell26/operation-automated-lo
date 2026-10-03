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
  SAMPLE_LIBRARY_ENV,
  createTemporaryCampaignStore,
} from "./campaign-command-test-support.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import {
  listCampaignRows,
  listWorkspaceCampaigns,
  loadCampaignPage,
  loadOverviewCampaigns,
  loadWorkspaceCampaign,
  loadWorkspaceCampaignsForRequest,
  readWorkspaceCampaignForRequest,
  readWorkspaceCampaignsForRequest,
} from "./campaign-workspace-reads.js";
import { sampleEntry, saveLibraryAdDraft } from "./library-ad-test-support.js";
import { compileOpenHouseDraft } from "./open-house-draft.test-support.js";

const store = createTemporaryCampaignStore("oalo-workspace-reads-");

/** A deployment `authenticatedWorkspaceMode` refuses to classify: not local, not preview, not review. */
const UNCLASSIFIABLE_ENV = Object.freeze({
  OALO_ENVIRONMENT: "staging",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
});

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
      loadOverviewCampaigns(createLocalSyntheticPrincipal(), UNCLASSIFIABLE_ENV),
    ).rejects.toBeInstanceOf(AuthenticatedWorkspaceUnavailableError);
  });

  /**
   * The same rule at the two entry points a page actually calls. A host whose workspace mode
   * cannot be classified is a broken deployment, and the doc above `loadOverviewCampaigns` has
   * always said so; these two functions used to disagree with it by catching the error and
   * answering "not signed in", which sent an operator to a sign-in page to retype credentials
   * that were never the problem and hid the misconfiguration behind ordinary product behaviour.
   *
   * Propagating still fails closed: the principal is never resolved, so no tenant row is read and
   * none is rendered. The route error boundary is what the person sees.
   */
  it("propagates an unclassifiable workspace instead of rendering it as unauthenticated", async () => {
    const request = new Request("https://oalo.local/overview");

    await expect(
      readWorkspaceCampaignsForRequest(request, UNCLASSIFIABLE_ENV),
    ).rejects.toBeInstanceOf(AuthenticatedWorkspaceUnavailableError);
    await expect(
      readWorkspaceCampaignForRequest(request, "campaign_missingRef001", UNCLASSIFIABLE_ENV),
    ).rejects.toBeInstanceOf(AuthenticatedWorkspaceUnavailableError);
  });
});

/**
 * PRD-009e. The two pages' reads, under the local demo's own store: the Campaigns list's rows, and
 * the campaign page for the newest version or an older one. The demo's file keeps the newest version
 * of each campaign, so its history is that one version; the database's is proved in
 * `campaign-page-reads.postgres.test.ts`.
 */
describe("the Campaigns pages' reads", () => {
  const FOREIGN = {
    ...createLocalSyntheticPrincipal(),
    locationRef: "location_otherTenant001",
    locationId: "00000000-0000-4000-8000-000000000899",
  };

  function libraryEnv() {
    return { ...store.env(), ...SAMPLE_LIBRARY_ENV };
  }

  async function saveLibraryCampaign(brandName?: string) {
    await store.enter();
    return saveLibraryAdDraft({
      principal: createLocalSyntheticPrincipal(),
      environment: libraryEnv(),
      entry: await sampleEntry("sample-first-home", 2),
      ...(brandName === undefined ? {} : { brandName }),
    });
  }

  it("lists a library ad's campaign under the ad's own name, and none of another location's", async () => {
    const saved = await saveLibraryCampaign();

    const rows = await listCampaignRows(createLocalSyntheticPrincipal(), libraryEnv());

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      campaignRef: saved.version.campaignRef,
      name: "Sample: First home, start here",
      topic: "first-time-buyers",
      earlierFlow: false,
      standing: "awaiting_approval",
    });
    expect(await listCampaignRows(FOREIGN, libraryEnv())).toEqual([]);
  });

  it("lists a campaign saved before PRD-009 under its saved headline", async () => {
    await store.enter();
    const principal = createLocalSyntheticPrincipal();
    const adapter = createCampaignPersistenceAdapter(principal, libraryEnv());
    const compiled = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      principal,
      libraryEnv(),
      adapter.versionRepository,
    );
    await adapter.persistDraft(compiled.version, compiled.preflight);

    const [row] = await listCampaignRows(principal, libraryEnv());

    expect(row).toMatchObject({ name: "Tour this home this weekend", earlierFlow: true });
    const loaded = await loadCampaignPage(
      principal,
      compiled.version.campaignRef,
      undefined,
      libraryEnv(),
    );
    expect(loaded?.kind === "page" && loaded.page.kind).toBe("earlier-flow");
  });

  it("builds the campaign page for the newest version, with its one version in the list", async () => {
    const saved = await saveLibraryCampaign();

    const loaded = await loadCampaignPage(
      createLocalSyntheticPrincipal(),
      saved.version.campaignRef,
      undefined,
      libraryEnv(),
    );

    expect(loaded?.kind).toBe("page");
    if (loaded?.kind !== "page") return;
    expect(loaded.page).toMatchObject({
      kind: "library-ad",
      versionNo: 1,
      isLatest: true,
      name: "Sample: First home, start here",
    });
    expect(loaded.page.versions).toHaveLength(1);
  });

  it("sends the newest version's number to the campaign's own address, and finds no other number", async () => {
    const saved = await saveLibraryCampaign();
    const principal = createLocalSyntheticPrincipal();

    expect(await loadCampaignPage(principal, saved.version.campaignRef, 1, libraryEnv())).toEqual({
      kind: "redirect",
      href: `/marketing/campaigns/${saved.version.campaignRef}`,
    });
    expect(
      await loadCampaignPage(principal, saved.version.campaignRef, 2, libraryEnv()),
    ).toBeUndefined();
  });

  it("answers a campaign in another location, and an unknown one, with nothing at all", async () => {
    const saved = await saveLibraryCampaign();

    for (const versionNo of [undefined, 1, 2]) {
      expect(
        await loadCampaignPage(FOREIGN, saved.version.campaignRef, versionNo, libraryEnv()),
        String(versionNo),
      ).toBeUndefined();
    }
    expect(
      await loadCampaignPage(
        createLocalSyntheticPrincipal(),
        "campaign_missingRef001",
        undefined,
        libraryEnv(),
      ),
    ).toBeUndefined();
  });

  /**
   * 009E-AC-006. Only the person who saved a version can say its Brand changed. The demo's saved
   * Brand is the repository's own sample identity, so a version saved with the same one has not
   * changed, and one saved under another name has.
   */
  it("says Brand changed to the person who saved a version under a different Brand, and only then", async () => {
    const principal = createLocalSyntheticPrincipal();
    const same = await saveLibraryCampaign();
    const unchanged = await loadCampaignPage(
      principal,
      same.version.campaignRef,
      undefined,
      libraryEnv(),
    );
    expect(
      unchanged?.kind === "page" && unchanged.page.kind === "library-ad" && unchanged.page.notices,
    ).toEqual([]);
    await store.restore();

    const earlier = await saveLibraryCampaign("Alex M. Morgan");
    const changed = await loadCampaignPage(
      principal,
      earlier.version.campaignRef,
      undefined,
      libraryEnv(),
    );
    expect(
      changed?.kind === "page" && changed.page.kind === "library-ad" && changed.page.notices,
    ).toEqual([{ kind: "brand-changed" }]);
    const other = await loadCampaignPage(
      { ...principal, actorRef: "principal_someoneElse001" },
      earlier.version.campaignRef,
      undefined,
      libraryEnv(),
    );
    expect(
      other?.kind === "page" && other.page.kind === "library-ad" && other.page.notices,
    ).toEqual([]);
  });

  it("reads the page of a campaign through a request, with an older version's number when it is given", async () => {
    const saved = await saveLibraryCampaign();
    const reviewEnv = {
      ...libraryEnv(),
      OALO_ENVIRONMENT: "local" as const,
    };

    const read = await readWorkspaceCampaignForRequest(
      new Request("https://oalo.local/marketing/campaigns"),
      saved.version.campaignRef,
      reviewEnv,
      1,
    );

    expect(read.authenticated).toBe(true);
    expect(read.campaign?.kind).toBe("redirect");
  });
});
