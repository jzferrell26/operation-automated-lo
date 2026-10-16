import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  canonicalCampaignHash,
  freezeAuthenticatedPrincipal,
  assertWebinarAdEvidenceCurrent,
  assertWebinarAdPreflightCurrent,
  type AuthenticatedPrincipal,
  type WebinarAdEvidencePort,
} from "@oalo/application";
import {
  parseActorRef,
  parseLocationRef,
  OpaqueReferenceSchema,
  type WebinarPublisherMediaReceipt,
} from "@oalo/contracts";
import {
  WebinarPublisherAdmissionSchema,
  PostgresWebinarPublisherAuthenticationResolver,
  type DatabasePool,
} from "@oalo/db";
import {
  verifyWebinarPublisherMedia,
  WebinarPublisherResponseSchemas,
  hashWebinarPublisherValue,
} from "@oalo/ghl";
import { createTrustedProductionTaskDeliveryAuthority } from "./production-runtime-composition.js";
import {
  createWebinarPublisherWorkerRuntime,
  type WebinarPublisherRuntimeDependencies,
} from "./webinar-publisher-runtime.js";

export class WebinarPublisherBindingError extends Error {
  readonly code = "PUBLISHER_BINDINGS_UNAVAILABLE";
  constructor() {
    super("Current trusted publisher runtime bindings are unavailable.");
  }
}
const Configuration = z
  .object({ taskAuthorityHmacKey: z.string().regex(/^[a-f0-9]{64}$/u) })
  .strict();
const OperationIdentity = z
  .object({ operationRef: OpaqueReferenceSchema, actorId: z.uuid(), locationId: z.uuid() })
  .strict();
export interface WebinarPublisherTrustedBindingPorts extends Omit<
  WebinarPublisherRuntimeDependencies,
  "deliveryAuthority" | "currentPrincipal" | "media" | "workerRef"
> {
  /** Server-owned immutable command authentication provenance and current session resolver.
   * A caller-supplied principal or role is never a bootstrap implementation. */
  authentication: {
    current(
      input: Readonly<{ operationRef: string; actorId: string; locationId: string }>,
    ): Promise<AuthenticatedPrincipal>;
  };
  /** Neutral extraction of current registry, lender destination and regenerated raster checks. */
  sourceEvidence: WebinarAdEvidencePort;
  /** Read the actual persisted provider media lease and immutable PNG bytes. No upload occurs here. */
  readMediaBytes(
    principal: Readonly<AuthenticatedPrincipal>,
    record: Parameters<WebinarPublisherRuntimeDependencies["media"]>[1],
  ): Promise<Readonly<{ bytes: Uint8Array; fileId: string; url: string; expiresAt: string }>>;
}

/** Compose existing concrete persistence/native runtime with mandatory trusted capabilities.
 * This factory is not a deployed capability accessor; absent services refuse before any work. */
export function createWebinarPublisherRuntimeBindings(
  configuration: unknown,
  ports: WebinarPublisherTrustedBindingPorts,
) {
  const parsed = Configuration.safeParse(configuration);
  if (
    !parsed.success ||
    !ports ||
    ports.pool === ports.admissionPool ||
    typeof ports.pool?.connect !== "function" ||
    typeof ports.admissionPool?.connect !== "function" ||
    typeof ports.authentication?.current !== "function" ||
    typeof ports.sourceEvidence?.assertCurrent !== "function" ||
    typeof ports.readMediaBytes !== "function" ||
    typeof ports.verifyResponse !== "function" ||
    typeof ports.responseAdmission !== "function" ||
    typeof ports.admissionVerifier?.verify !== "function" ||
    typeof ports.assertCurrent !== "function" ||
    typeof ports.now !== "function" ||
    typeof ports.databaseAuthority?.currentPrincipal !== "function" ||
    typeof ports.databaseAuthority.assertEvidenceCurrent !== "function" ||
    typeof ports.databaseAuthority.assertDispatch !== "function" ||
    typeof ports.databaseAuthority.assertCheckpoint !== "function" ||
    typeof ports.native?.fetch !== "function" ||
    typeof ports.native.resolveLocationToken !== "function" ||
    typeof ports.native.authority?.assertCurrent !== "function"
  )
    throw new WebinarPublisherBindingError();
  const currentPrincipal: WebinarPublisherRuntimeDependencies["currentPrincipal"] = async (
    input,
  ) => {
    const parsedIdentity = OperationIdentity.safeParse(input);
    if (!parsedIdentity.success) throw new WebinarPublisherBindingError();
    const identity = parsedIdentity.data;
    const current = freezeAuthenticatedPrincipal(
      await ports.authentication.current({
        operationRef: identity.operationRef,
        actorId: identity.actorId,
        locationId: identity.locationId,
      }),
    );
    if (
      current.authenticationMode === "local_synthetic" ||
      current.role !== "location_admin" ||
      current.actorId !== identity.actorId ||
      current.locationId !== identity.locationId ||
      parseActorRef(current.actorRef) !== current.actorId ||
      parseLocationRef(current.locationRef) !== current.locationId
    )
      throw new WebinarPublisherBindingError();
    return current;
  };
  return createWebinarPublisherWorkerRuntime({
    ...ports,
    currentPrincipal,
    deliveryAuthority: createTrustedProductionTaskDeliveryAuthority(
      parsed.data.taskAuthorityHmacKey,
      ports.now,
    ),
    workerRef: () => `worker_${randomUUID().replaceAll("-", "")}`,
    databaseAuthority: {
      ...ports.databaseAuthority,
      currentPrincipal: async (supplied) => {
        // Pending/relay reads have no command operation. This separate mandatory trusted
        // read-only current-owner capability must resolve actual current authentication.
        // Execute wraps it again with its immutable operation-scoped resolver.
        const authorized = freezeAuthenticatedPrincipal(
          await ports.databaseAuthority.currentPrincipal(supplied),
        );
        if (
          authorized.authenticationMode === "local_synthetic" ||
          authorized.role !== "location_admin" ||
          parseActorRef(authorized.actorRef) !== authorized.actorId ||
          parseLocationRef(authorized.locationRef) !== authorized.locationId ||
          canonicalCampaignHash(authorized) !== canonicalCampaignHash(supplied)
        )
          throw new WebinarPublisherBindingError();
        return authorized;
      },
      assertEvidenceCurrent: async (evidence, principal) => {
        assertWebinarAdPreflightCurrent(evidence.version, evidence.preflight);
        await assertWebinarAdEvidenceCurrent(evidence.version, ports.now(), ports.sourceEvidence);
        await ports.databaseAuthority.assertEvidenceCurrent(evidence, principal);
      },
    },
    media: async (principal, record): Promise<WebinarPublisherMediaReceipt> => {
      const identity = {
        operationRef: record.operation.operationRef,
        actorId: principal.actorId,
        locationId: principal.locationId,
      };
      const current = await currentPrincipal(identity);
      if (canonicalCampaignHash(current) !== canonicalCampaignHash(principal))
        throw new WebinarPublisherBindingError();
      await ports.assertCurrent(principal, record);
      const media = await ports.readMediaBytes(principal, record);
      if (
        canonicalCampaignHash(await currentPrincipal(identity)) !== canonicalCampaignHash(principal)
      )
        throw new WebinarPublisherBindingError();
      await ports.assertCurrent(principal, record);
      return verifyWebinarPublisherMedia({
        projection: record.launch.summary.projection,
        ...media,
        allowedOrigins: ["https://storage.googleapis.com", "https://files.leadconnectorhq.com"],
        now: ports.now().toISOString(),
      });
    },
    responseAdmission: async (response) => {
      if (response.operation !== "linked") throw new WebinarPublisherBindingError();
      const linked = WebinarPublisherResponseSchemas.linked.parse(response.normalized);
      if (hashWebinarPublisherValue(linked) !== response.readBackHash)
        throw new WebinarPublisherBindingError();
      // The durable artifact/provenance service builds metadata; independent admissionVerifier
      // still verifies it before the separately privileged admission login can persist it.
      const candidate = WebinarPublisherAdmissionSchema.parse(
        await ports.responseAdmission(response),
      );
      if (
        candidate.kind !== "observation" ||
        candidate.observedAt !== response.observedAt ||
        candidate.normalized.observedAt !== response.observedAt ||
        candidate.normalized.state !== response.state ||
        candidate.normalized.projectionHash !== response.record.operation.projectionHash ||
        candidate.normalized.readBackHash !== response.readBackHash ||
        canonicalCampaignHash(candidate.normalized.nativeIds) !==
          canonicalCampaignHash(response.nativeIds) ||
        canonicalCampaignHash(candidate.normalized.facebookIds) !==
          canonicalCampaignHash({
            campaignId: linked.fbCampaignId ?? null,
            adsetId: linked.adsets[0]?.fbAdSetId ?? null,
            adId: linked.adsets[0]?.ads[0]?.fbAdId ?? null,
          }) ||
        Object.values(candidate.normalized.metrics).some((metric) => metric !== null) ||
        Date.parse(candidate.expiresAt) <= ports.now().getTime() ||
        Date.parse(candidate.observedAt) > ports.now().getTime()
      )
        throw new WebinarPublisherBindingError();
      return candidate;
    },
  });
}

export interface WebinarPublisherPostgresBindingPorts extends Omit<
  WebinarPublisherTrustedBindingPorts,
  "authentication"
> {
  /** Dedicated private publisher_authentication_resolver capability login.
   * This is separate from request persistence and provider admission logins. */
  authenticationResolverPool: DatabasePool;
}

/** Concrete original-command authentication lookup. All other trusted source/native,
 * media/capture/admission and current-owner read capabilities remain mandatory.
 * This source composition neither provisions logins nor completes the web producer. */
export function createPostgresWebinarPublisherRuntimeBindings(
  configuration: unknown,
  ports: WebinarPublisherPostgresBindingPorts,
) {
  if (
    !ports ||
    typeof ports.authenticationResolverPool?.connect !== "function" ||
    ports.authenticationResolverPool === ports.pool ||
    ports.authenticationResolverPool === ports.admissionPool
  )
    throw new WebinarPublisherBindingError();
  const resolver = new PostgresWebinarPublisherAuthenticationResolver(
    ports.authenticationResolverPool,
  );
  return createWebinarPublisherRuntimeBindings(configuration, {
    ...ports,
    authentication: { current: (identity) => resolver.current(identity) },
  });
}
