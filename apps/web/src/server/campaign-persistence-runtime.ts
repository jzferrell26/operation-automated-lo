import { createHash } from "node:crypto";

import {
  type AuthenticatedPrincipal,
  type CampaignApprovalRepository,
  type CampaignPersistenceKind,
  type CampaignVersionRepository,
  type CampaignWorkspaceReadRecord,
  type CampaignWorkspaceReadRepository,
} from "@oalo/application";
import {
  CampaignVersionSchema,
  PreflightResultSchema,
  type CampaignVersion,
  type PreflightResult,
} from "@oalo/contracts";
import {
  createPostgresCampaignApprovalRepository,
  createPostgresCampaignReadRepository,
  createPostgresCampaignVersionRepository,
  createPostgresPool,
  createPrincipalBoundTenantContextAuthority,
  PostgresDatabasePool,
} from "@oalo/db";
import { z } from "zod";

import { campaignPersistenceKind } from "./authenticated-workspace-data.js";
import {
  createFilesystemCampaignReadRepository,
  createLocalCampaignApprovalRepository,
  localCampaignToReadRecord,
  persistLocalCampaign,
} from "./local-campaign-store.js";
import { createMemoryCampaignVersionRepository } from "./open-house-draft.js";

export class CampaignWorkspaceStoreUnavailableError extends Error {
  public constructor() {
    super("Campaign persistence is not configured for this authenticated workspace.");
    this.name = "CampaignWorkspaceStoreUnavailableError";
  }
}

const CampaignDatabaseEnvironmentSchema = z
  .object({
    OALO_ENVIRONMENT: z.enum(["local", "preview", "staging", "production"]).default("local"),
    OALO_DATABASE_URL: z.string().url().startsWith("postgres"),
    OALO_DATABASE_SSL_MODE: z.enum(["disable", "require", "verify-full"]).optional(),
  })
  .passthrough();

export interface CampaignPersistenceAdapter {
  readonly kind: CampaignPersistenceKind;
  readonly versionRepository: CampaignVersionRepository;
  readonly approvalRepository: CampaignApprovalRepository;
  readonly readRepository: CampaignWorkspaceReadRepository;
  persistDraft(
    version: CampaignVersion,
    preflight: PreflightResult,
  ): Promise<CampaignWorkspaceReadRecord>;
}

let cachedPool: PostgresDatabasePool | undefined;
let cachedFingerprint: string | undefined;

function sslModeFor(
  environment: "local" | "preview" | "staging" | "production",
  explicit: "disable" | "require" | "verify-full" | undefined,
): "disable" | "require" | "verify-full" {
  if (explicit !== undefined) return explicit;
  return environment === "local" ? "disable" : "require";
}

export function parseCampaignDatabasePoolConfiguration(input: unknown) {
  const parsed = CampaignDatabaseEnvironmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new CampaignWorkspaceStoreUnavailableError();
  }
  return Object.freeze({
    connectionString: parsed.data.OALO_DATABASE_URL,
    deploymentEnvironment: parsed.data.OALO_ENVIRONMENT,
    poolingMode: "transaction" as const,
    preparedStatements: false as const,
    sslMode: sslModeFor(parsed.data.OALO_ENVIRONMENT, parsed.data.OALO_DATABASE_SSL_MODE),
    applicationName: "oalo-campaign-runtime",
  });
}

export function campaignDatabasePool(input: unknown = process.env): PostgresDatabasePool {
  const configuration = parseCampaignDatabasePoolConfiguration(input);
  const fingerprint = `${configuration.deploymentEnvironment}:${configuration.sslMode}:${configuration.connectionString}`;
  if (cachedPool !== undefined && cachedFingerprint === fingerprint) {
    return cachedPool;
  }
  const previous = cachedPool;
  cachedPool = createPostgresPool(configuration);
  cachedFingerprint = fingerprint;
  void previous?.close();
  return cachedPool;
}

export async function resetCampaignDatabasePoolForTests(): Promise<void> {
  const previous = cachedPool;
  cachedPool = undefined;
  cachedFingerprint = undefined;
  await previous?.close();
}

/**
 * The read-only fallback correlation reference, derived so that every session shape produces a
 * value `CorrelationReferenceSchema` accepts.
 *
 * Interpolating the session id was correct only by borrowing two invariants this module does not
 * own. `freezeAuthenticatedPrincipal` in `@oalo/application` refuses any session id that is not a
 * canonical opaque segment, which is what kept the interpolated value matching
 * `CorrelationReferenceSchema`'s pattern; nothing anywhere kept it inside that schema's
 * 128-character cap once twenty-two characters of prefix were added, so a session id above 106
 * characters derived a reference `createCampaignTenantContext` rejects with
 * `CampaignPrincipalInvalidError`, and the read failed on a session that was perfectly good.
 * Neither authentication mode reaches that length today, which makes it a latent fault rather
 * than a live one, and a fault that gets live the moment either bound moves.
 *
 * A digest fixes both at once for every session id: the output is always lowercase hex, so it is
 * always canonical, and always the same length, so it can never overrun the cap. It is stable, so
 * retries of the same session correlate, and unique per session, so two sessions never share a
 * reference. It also stops a session identifier being copied verbatim into a correlation column
 * and into the support reference a response header carries, which is the direction this value
 * should have been going anyway.
 *
 * What this is not: it is not what decides whether a session id shaped like a provider claim can
 * read a workspace. `freezeAuthenticatedPrincipal` refuses such a principal one layer earlier,
 * before any reference is derived, and that refusal is left exactly as it is.
 */
function defaultCorrelationIdFor(principal: Readonly<AuthenticatedPrincipal>): string {
  const digest = createHash("sha256").update(principal.sessionId).digest("hex").slice(0, 32);
  return `correlation_workspace_${digest}`;
}

/** Exposed for the proof that every session shape derives a reference the schema accepts. */
export function workspaceCorrelationReferenceFor(
  principal: Readonly<AuthenticatedPrincipal>,
): string {
  return defaultCorrelationIdFor(principal);
}

/**
 * Builds the persistence adapter for one authenticated request. `correlationRef` should be the
 * canonical reference this request's route boundary already derived (see
 * `correlation-boundary.ts`), so the same value reaches the transaction, the command, and the
 * event. Read-only callers that have no request-scoped correlation reference of their own may
 * omit it and fall back to a workspace-session-derived value.
 */
export function createCampaignPersistenceAdapter(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown = process.env,
  correlationRef: string = defaultCorrelationIdFor(principal),
): CampaignPersistenceAdapter {
  const kind = campaignPersistenceKind(environment);
  if (kind === "filesystem") {
    const readRepository = createFilesystemCampaignReadRepository(environment);
    return {
      kind,
      versionRepository: createMemoryCampaignVersionRepository(),
      approvalRepository: createLocalCampaignApprovalRepository(environment),
      readRepository,
      async persistDraft(version, preflight) {
        return localCampaignToReadRecord(
          await persistLocalCampaign(version, preflight, environment),
        );
      },
    };
  }

  const pool = campaignDatabasePool(environment);
  const authority = createPrincipalBoundTenantContextAuthority(principal, correlationRef);
  const versionRepository = createPostgresCampaignVersionRepository(pool, authority);
  const readRepository = createPostgresCampaignReadRepository(pool, authority);
  return {
    kind,
    versionRepository,
    approvalRepository: createPostgresCampaignApprovalRepository(pool, authority),
    readRepository,
    async persistDraft(versionInput, preflightInput) {
      const version = CampaignVersionSchema.parse(versionInput);
      const preflight = PreflightResultSchema.parse(preflightInput);
      await versionRepository.persistPreflight(preflight);
      const stored = await readRepository.getByCampaignRef(version.campaignRef);
      if (stored === undefined) {
        throw new CampaignWorkspaceStoreUnavailableError();
      }
      return stored;
    },
  };
}
