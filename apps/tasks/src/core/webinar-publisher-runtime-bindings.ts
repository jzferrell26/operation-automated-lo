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
  type WebinarPublisherMediaReceipt,
} from "@oalo/contracts";
import { WebinarPublisherAdmissionSchema } from "@oalo/db";
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
export interface WebinarPublisherTrustedBindingPorts extends Omit<
  WebinarPublisherRuntimeDependencies,
  "deliveryAuthority" | "currentPrincipal" | "media" | "workerRef"
> {
  /** Server-owned immutable command authentication provenance and current session resolver.
   * A caller-supplied principal or role is never a bootstrap implementation. */
  authentication: {
    current(
      input: Readonly<{ actorId: string; locationId: string }>,
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
    identity,
  ) => {
    const current = freezeAuthenticatedPrincipal(
      await ports.authentication.current({
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
        const current = await currentPrincipal(supplied);
        const authorized = await ports.databaseAuthority.currentPrincipal(current);
        if (
          canonicalCampaignHash(current) !== canonicalCampaignHash(supplied) ||
          canonicalCampaignHash(authorized) !== canonicalCampaignHash(current)
        )
          throw new WebinarPublisherBindingError();
        return current;
      },
      assertEvidenceCurrent: async (evidence, principal) => {
        assertWebinarAdPreflightCurrent(evidence.version, evidence.preflight);
        await assertWebinarAdEvidenceCurrent(evidence.version, ports.now(), ports.sourceEvidence);
        await ports.databaseAuthority.assertEvidenceCurrent(evidence, principal);
      },
    },
    media: async (principal, record): Promise<WebinarPublisherMediaReceipt> => {
      const current = await currentPrincipal(principal);
      if (canonicalCampaignHash(current) !== canonicalCampaignHash(principal))
        throw new WebinarPublisherBindingError();
      await ports.assertCurrent(principal, record);
      const media = await ports.readMediaBytes(principal, record);
      if (
        canonicalCampaignHash(await currentPrincipal(principal)) !==
        canonicalCampaignHash(principal)
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
