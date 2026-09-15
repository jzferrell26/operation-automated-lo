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

function correlationIdFor(principal: Readonly<AuthenticatedPrincipal>): string {
  return `correlation_workspace_${principal.sessionId}`;
}

export function createCampaignPersistenceAdapter(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown = process.env,
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
  const authority = createPrincipalBoundTenantContextAuthority(
    principal,
    correlationIdFor(principal),
  );
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
