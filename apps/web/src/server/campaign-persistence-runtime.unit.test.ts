import { afterEach, describe, expect, it } from "vitest";

import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import { OALO_REVIEW_SURFACE_AUTHORIZED } from "./authenticated-workspace-data.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
  createTemporaryCampaignStore,
} from "./campaign-command-test-support.js";
import {
  CampaignWorkspaceStoreUnavailableError,
  campaignDatabasePool,
  createCampaignPersistenceAdapter,
  parseCampaignDatabasePoolConfiguration,
  resetCampaignDatabasePoolForTests,
} from "./campaign-persistence-runtime.js";
import { compileOpenHouseDraft } from "./open-house-draft.js";

const store = createTemporaryCampaignStore("oalo-persist-runtime-");

afterEach(async () => {
  await resetCampaignDatabasePoolForTests();
  await store.restore();
});

describe("campaign persistence adapter selection", () => {
  it("uses the filesystem adapter in synthetic mode and never postgres", async () => {
    await store.enter();
    const principal = createLocalSyntheticPrincipal();
    const adapter = createCampaignPersistenceAdapter(principal, store.env());
    expect(adapter.kind).toBe("filesystem");
    const compiled = await compileOpenHouseDraft(
      OPEN_HOUSE_DRAFT_INPUT,
      principal,
      store.env(),
      adapter.versionRepository,
    );
    const persisted = await adapter.persistDraft(compiled.version, compiled.preflight);
    expect(persisted.state).toBe("awaiting_approval");
    const loaded = await adapter.readRepository.getByCampaignRef(compiled.version.campaignRef);
    expect(loaded?.version.campaignRef).toBe(compiled.version.campaignRef);
    const listed = await adapter.readRepository.listForLocation();
    expect(
      listed.some((record) => record.version.campaignRef === compiled.version.campaignRef),
    ).toBe(true);
  });

  it("fails closed in review mode when the database URL is absent", () => {
    const environment = {
      ...LOCAL_SYNTHETIC_ENV,
      OALO_ENVIRONMENT: "production",
      OALO_REVIEW_SURFACE: OALO_REVIEW_SURFACE_AUTHORIZED,
    };
    expect(() => parseCampaignDatabasePoolConfiguration(environment)).toThrow(
      CampaignWorkspaceStoreUnavailableError,
    );
    expect(() =>
      createCampaignPersistenceAdapter(createLocalSyntheticPrincipal(), environment),
    ).toThrow(CampaignWorkspaceStoreUnavailableError);
  });

  it("requires SSL for non-local postgres campaign pools", () => {
    const configuration = parseCampaignDatabasePoolConfiguration({
      OALO_ENVIRONMENT: "preview",
      OALO_DATABASE_URL: "postgresql://runtime:secret@db.example.test/oalo",
    });
    expect(configuration.sslMode).toBe("require");
    expect(
      parseCampaignDatabasePoolConfiguration({
        OALO_ENVIRONMENT: "local",
        OALO_DATABASE_URL: "postgresql://runtime:secret@127.0.0.1:5432/oalo",
        OALO_DATABASE_SSL_MODE: "disable",
      }).sslMode,
    ).toBe("disable");
  });

  it("reuses a campaign pool for the same configuration fingerprint", async () => {
    const environment = {
      OALO_ENVIRONMENT: "local",
      OALO_DATABASE_URL: "postgresql://runtime:secret@127.0.0.1:5432/oalo",
      OALO_DATABASE_SSL_MODE: "disable",
    };
    const first = campaignDatabasePool(environment);
    expect(campaignDatabasePool(environment)).toBe(first);
  });
});
