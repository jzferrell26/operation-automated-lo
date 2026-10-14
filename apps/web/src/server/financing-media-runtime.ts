import "server-only";
import { dirname, join } from "node:path";
import { FinancingMediaError, type AuthenticatedPrincipal } from "@oalo/application";
import {
  createPrincipalBoundTenantContextAuthority,
  PostgresFinancingMediaRepository,
} from "@oalo/db";
import { createFilesystemFinancingMediaStore, createR2ObjectStoreClient } from "@oalo/storage";
import { z } from "zod";
import { campaignPersistenceKind } from "./authenticated-workspace-data.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import type { FinancingMediaRuntime } from "./financing-media-service.js";

export function createFinancingMediaRuntime(
  principal: AuthenticatedPrincipal,
  environment: unknown = process.env,
): FinancingMediaRuntime {
  // Native process.env is not a plain record in Node. Parse the owned keys
  // through an object schema, matching the existing runtime configuration spine.
  const parsed = z
    .object({
      OALO_LOCAL_CAMPAIGN_STORE: z.string().min(1).max(4096).optional(),
      OALO_R2_ACCOUNT_ID: z.string().optional(),
      OALO_R2_ACCESS_KEY_ID: z.string().optional(),
      OALO_R2_SECRET_ACCESS_KEY: z.string().optional(),
      OALO_R2_PRIVATE_BUCKET: z.string().optional(),
      OALO_R2_PUBLIC_BUCKET: z.string().optional(),
      OALO_R2_PUBLIC_BASE_URL: z.string().optional(),
    })
    .safeParse(environment);
  if (!parsed.success) throw new FinancingMediaError("FINANCING_MEDIA_UNAVAILABLE", 503);
  const env = parsed.data;
  if (campaignPersistenceKind(environment) === "filesystem") {
    if (principal.authenticationMode !== "local_synthetic")
      throw new FinancingMediaError("FINANCING_MEDIA_UNAVAILABLE", 503);
    const root =
      typeof env.OALO_LOCAL_CAMPAIGN_STORE === "string"
        ? join(dirname(env.OALO_LOCAL_CAMPAIGN_STORE), "financing-media")
        : join(process.cwd(), ".oalo", "financing-media");
    const store = createFilesystemFinancingMediaStore(root, {
      locationRef: principal.locationRef,
      actorRef: principal.actorRef,
    });
    return { repository: store, bytes: store };
  }
  const r2 = createR2ObjectStoreClient({
    accountId: env.OALO_R2_ACCOUNT_ID,
    accessKeyId: env.OALO_R2_ACCESS_KEY_ID,
    secretAccessKey: env.OALO_R2_SECRET_ACCESS_KEY,
    privateBucket: env.OALO_R2_PRIVATE_BUCKET,
    publicBucket: env.OALO_R2_PUBLIC_BUCKET,
    publicBaseUrl: env.OALO_R2_PUBLIC_BASE_URL,
  });
  const repository = new PostgresFinancingMediaRepository(
    campaignDatabasePool(environment),
    createPrincipalBoundTenantContextAuthority(
      principal,
      workspaceCorrelationReferenceFor(principal),
    ),
    principal,
  );
  return {
    repository,
    bytes: {
      putImmutable: (record, bytes) => r2.putPrivateMedia(record, bytes),
      read: (record) => r2.readPrivateMedia(record),
    },
  };
}
