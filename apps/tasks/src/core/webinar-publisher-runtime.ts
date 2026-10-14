import { z } from "zod";
import { canonicalCampaignHash, type AuthenticatedPrincipal } from "@oalo/application";
import { DeliveryReferenceSchema, WebinarPublisherTaskSchema } from "@oalo/contracts";
import {
  PostgresWebinarPublisherRepository,
  createWebinarPublisherAdmissionService,
  type DatabasePool,
  type WebinarPublisherDatabaseAuthority,
  type WebinarPublisherAdmissionVerifier,
  type WebinarPublisherWorkerRecord,
} from "@oalo/db";
import {
  createWebinarPublisherNativeTransport,
  type WebinarPublisherNativeTransportDependencies,
} from "@oalo/ghl";
import {
  ProductionTaskAuthorityProofSchema,
  type ProductionTaskDeliveryAuthority,
} from "./production-runtime-composition.js";
import {
  runWebinarPublisherWorker,
  WebinarPublisherWorkerError,
  type WebinarPublisherWorkerPorts,
} from "./webinar-publisher-worker.js";

export const WebinarPublisherWorkerRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    delivery: DeliveryReferenceSchema,
    task: WebinarPublisherTaskSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.delivery.deliveryKind !== "task" ||
      value.delivery.locationRef !== value.task.locationRef ||
      value.delivery.correlationId !== value.task.correlationRef
    )
      context.addIssue({ code: "custom", message: "Webinar task delivery differs." });
  });
export const WebinarPublisherWorkerEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    authority: ProductionTaskAuthorityProofSchema,
    request: WebinarPublisherWorkerRequestSchema,
  })
  .strict();
export interface WebinarPublisherRuntimeDependencies {
  pool: DatabasePool;
  admissionPool: DatabasePool;
  admissionVerifier: WebinarPublisherAdmissionVerifier;
  databaseAuthority: WebinarPublisherDatabaseAuthority;
  native: WebinarPublisherNativeTransportDependencies;
  deliveryAuthority: ProductionTaskDeliveryAuthority;
  /** Resolve from verified active delivery scope and current auth DB, not serialized role data. */
  currentPrincipal(
    input: Readonly<{ actorId: string; locationId: string }>,
  ): Promise<AuthenticatedPrincipal>;
  assertCurrent: WebinarPublisherWorkerPorts["assertCurrent"];
  media: WebinarPublisherWorkerPorts["media"];
  /** Trusted transport-capture verifier, also used by databaseAuthority.assertCheckpoint.
   * Creation/control ACK verification is distinct from an observed delivery-state admission. */
  verifyResponse(input: Parameters<WebinarPublisherWorkerPorts["admitResponse"]>[0]): Promise<void>;
  /** Build a candidate whose real transport artifact is independently verified by admissionVerifier.
   * Strict app_test-shaped JSON alone never establishes provenance. */
  responseAdmission(
    input: Parameters<WebinarPublisherWorkerPorts["admitResponse"]>[0],
  ): Promise<unknown>;
  workerRef(): string;
  now(): Date;
}

/** Concrete composition uses the existing Postgres repository and allowlisted native transport.
 * There is no process-global store, implicit environment activation, or permissive verifier. */
export function createWebinarPublisherWorkerRuntime(
  dependencies: WebinarPublisherRuntimeDependencies,
) {
  const native = createWebinarPublisherNativeTransport({
    ...dependencies.native,
    requestTimeoutMs: 5_000,
    now: () => dependencies.now().getTime(),
  });
  const admissions = createWebinarPublisherAdmissionService(
    dependencies.admissionPool,
    dependencies.admissionVerifier,
  );
  return {
    async execute(input: unknown, signal?: AbortSignal) {
      const envelope = WebinarPublisherWorkerEnvelopeSchema.parse(input);
      return dependencies.deliveryAuthority.withAuthority(
        envelope.authority,
        envelope.request.delivery,
        envelope.request,
        async () => {
          const principal = await dependencies.currentPrincipal({
            actorId: envelope.authority.actorId,
            locationId: envelope.authority.locationId,
          });
          if (
            principal.actorId !== envelope.authority.actorId ||
            principal.locationId !== envelope.authority.locationId ||
            principal.locationRef !== envelope.request.task.locationRef ||
            principal.authenticationMode === "local_synthetic"
          )
            throw new WebinarPublisherWorkerError("AUTHORITY_WITHDRAWN");
          const repository = new PostgresWebinarPublisherRepository(
            dependencies.pool,
            dependencies.databaseAuthority,
            envelope.request.task.correlationRef,
          );
          return runWebinarPublisherWorker(
            envelope.request.task,
            principal,
            dependencies.workerRef(),
            {
              repository,
              transport: native,
              assertCurrent: dependencies.assertCurrent,
              media: dependencies.media,
              now: dependencies.now,
              admitResponse: async (response) => {
                await dependencies.verifyResponse(response);
                if (response.operation === "linked") {
                  await admissions.admit(principal, await dependencies.responseAdmission(response));
                }
                // Recheck withdrawal after asynchronous verification/admission before SQL checkpoint.
                const current = await dependencies.currentPrincipal({
                  actorId: principal.actorId,
                  locationId: principal.locationId,
                });
                if (canonicalCampaignHash(current) !== canonicalCampaignHash(principal))
                  throw new WebinarPublisherWorkerError("AUTHORITY_WITHDRAWN");
              },
            },
            signal,
          );
        },
      );
    },
    async pending(principal: Readonly<AuthenticatedPrincipal>, correlationRef: string) {
      // Relay returns persisted messages; scheduling/signing is a separate trusted composition.
      return new PostgresWebinarPublisherRepository(
        dependencies.pool,
        dependencies.databaseAuthority,
        correlationRef,
      ).pendingTasks(principal, 25);
    },
  };
}
export type WebinarPublisherWorkerRuntime = ReturnType<typeof createWebinarPublisherWorkerRuntime>;
export type WebinarPublisherRuntimeRecord = WebinarPublisherWorkerRecord;
export function unboundWebinarPublisherRuntime(): WebinarPublisherWorkerRuntime {
  throw new WebinarPublisherWorkerError("RUNTIME_UNBOUND");
}
