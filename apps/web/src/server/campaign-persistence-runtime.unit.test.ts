import { createCampaignTenantContext, type AuthenticatedPrincipal } from "@oalo/application";
import { CorrelationReferenceSchema, formatSessionRef } from "@oalo/contracts";
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
  workspaceCorrelationReferenceFor,
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
        OALO_ENVIRONMENT: "preview",
        OALO_DATABASE_URL: "postgresql://runtime:secret@db.example.test/oalo",
        OALO_DATABASE_SSL_MODE: "verify-full",
        OALO_DATABASE_CA_CERT_PEM: "public-root-certificate",
      }).caCertificatePem,
    ).toBe("public-root-certificate");
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

/**
 * The fallback correlation reference the two-argument read callers derive.
 *
 * It used to interpolate the session id, which was correct only for as long as every session id
 * reaching it happened to be a canonical opaque segment short enough to survive the
 * 128-character cap once twenty-two characters of prefix were added. The first half is enforced
 * two packages away, in `freezeAuthenticatedPrincipal`; the second is enforced nowhere at all, so
 * a session id above 106 characters derived a reference `createCampaignTenantContext` rejects,
 * and the read failed on a session that was perfectly good.
 *
 * Deriving a digest makes the reference canonical whatever the session id is, which is the one
 * property this module can own, and stops a session identifier being copied verbatim into a
 * correlation column and into the support reference a response header carries.
 */
describe("the workspace correlation reference the read callers derive", () => {
  const LONGEST_EMBEDDED_CLAIM = `s${"a1b2c3d4e5".repeat(9)}abcde`;

  function principalWithSession(sessionId: string): AuthenticatedPrincipal {
    return { ...createLocalSyntheticPrincipal(), sessionId };
  }

  it("is canonical for every session id shape, including ones the derivation cannot control", () => {
    expect(LONGEST_EMBEDDED_CLAIM).toHaveLength(96);
    const sessionIds = [
      formatSessionRef("00000000-0000-4000-8000-0000000004c1"),
      LONGEST_EMBEDDED_CLAIM,
      "session-from-a-provider-claim",
      "sessionwithoutanyunderscore",
    ];

    for (const sessionId of sessionIds) {
      const reference = workspaceCorrelationReferenceFor(principalWithSession(sessionId));

      expect(CorrelationReferenceSchema.safeParse(reference).success).toBe(true);
      expect(workspaceCorrelationReferenceFor(principalWithSession(sessionId))).toBe(reference);
      // The session id is never copied into the reference a correlation column and a support
      // header both carry.
      expect(reference).not.toContain(sessionId);
    }
  });

  it("gives two sessions two different references", () => {
    const first = workspaceCorrelationReferenceFor(principalWithSession("session_aaaa1111"));
    const second = workspaceCorrelationReferenceFor(principalWithSession("session_bbbb2222"));

    expect(first).not.toBe(second);
  });

  /**
   * What actually happens to a session id the principal contract refuses, recorded because a
   * reader could otherwise take the case above as a claim that such a session reads its
   * workspace. It does not, and not because of this derivation: `freezeAuthenticatedPrincipal`
   * refuses the principal itself, one layer earlier, before any reference is derived. That path
   * fails closed and is left exactly as it is; widening it would let a provider claim shape into
   * the runtime that PRD-005a D1 does not admit.
   */
  it("is not what decides a session id the principal contract already refuses", () => {
    const hyphenated = principalWithSession("session-from-a-provider-claim");
    const reference = workspaceCorrelationReferenceFor(hyphenated);

    expect(CorrelationReferenceSchema.safeParse(reference).success).toBe(true);
    expect(() => createCampaignTenantContext(hyphenated, reference)).toThrow(
      /principal is not valid/iu,
    );
    // And a session id the contract does admit is accepted with the derived reference.
    const canonical = principalWithSession(
      formatSessionRef("00000000-0000-4000-8000-0000000004c2"),
    );
    expect(
      createCampaignTenantContext(canonical, workspaceCorrelationReferenceFor(canonical))
        .correlationId,
    ).toBe(workspaceCorrelationReferenceFor(canonical));
  });
});
