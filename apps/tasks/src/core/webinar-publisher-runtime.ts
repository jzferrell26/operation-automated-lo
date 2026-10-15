import { z } from "zod";
import {
  canonicalCampaignHash,
  freezeAuthenticatedPrincipal,
  type AuthenticatedPrincipal,
} from "@oalo/application";
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
  /** Mandatory trusted current authenticated-owner read authority for pending scans.
   * Execute additionally closes its generic callbacks over the signed operation. */
  databaseAuthority: WebinarPublisherDatabaseAuthority;
  native: WebinarPublisherNativeTransportDependencies;
  deliveryAuthority: ProductionTaskDeliveryAuthority;
  /** Resolve from verified active delivery scope and current auth DB, not serialized role data. */
  currentPrincipal(
    input: Readonly<{ operationRef: string; actorId: string; locationId: string }>,
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
  return {
    async execute(input: unknown, signal?: AbortSignal) {
      const envelope = WebinarPublisherWorkerEnvelopeSchema.parse(input);
      return dependencies.deliveryAuthority.withAuthority(
        envelope.authority,
        envelope.request.delivery,
        envelope.request,
        async () => {
          const identity = Object.freeze({
            operationRef: envelope.request.task.operationRef,
            actorId: envelope.authority.actorId,
            locationId: envelope.authority.locationId,
          });
          const principal = freezeAuthenticatedPrincipal(
            await dependencies.currentPrincipal(identity),
          );
          if (
            principal.actorId !== envelope.authority.actorId ||
            principal.locationId !== envelope.authority.locationId ||
            principal.locationRef !== envelope.request.task.locationRef ||
            principal.authenticationMode === "local_synthetic"
          )
            throw new WebinarPublisherWorkerError("AUTHORITY_WITHDRAWN");
          const principalHash = canonicalCampaignHash(principal);
          const assertPrincipal = (supplied: Readonly<AuthenticatedPrincipal>) => {
            if (canonicalCampaignHash(supplied) !== principalHash)
              throw new WebinarPublisherWorkerError("AUTHORITY_WITHDRAWN");
          };
          const assertRecord = (record: WebinarPublisherWorkerRecord) => {
            if (record.operation.operationRef !== identity.operationRef)
              throw new WebinarPublisherWorkerError("TASK_MISMATCH");
          };
          const current = async () => {
            const resolved = await dependencies.currentPrincipal(identity);
            assertPrincipal(resolved);
            return principal;
          };
          // Each verified execution owns its immutable operation closure, including transport.
          // No actor/location lookup may retarget a newer session or another concurrent command.
          const checked = async <T>(work: () => Promise<T>): Promise<T> => {
            await current();
            const result = await work();
            await current();
            return result;
          };
          const native = createWebinarPublisherNativeTransport({
            ...dependencies.native,
            requestTimeoutMs: 5_000,
            now: () => dependencies.now().getTime(),
            fetch: (url, init) => checked(() => dependencies.native.fetch(url, init)),
            resolveLocationToken: (input) =>
              checked(() => dependencies.native.resolveLocationToken(input)),
            authority: {
              assertCurrent: (input) =>
                checked(() => dependencies.native.authority.assertCurrent(input)),
            },
          });
          const admissions = createWebinarPublisherAdmissionService(
            {
              connect: async () => {
                const connection = await dependencies.admissionPool.connect();
                try {
                  await current();
                } catch (error) {
                  await connection.release();
                  throw error;
                }
                return {
                  release: () => connection.release(),
                  execute: (query) => checked(() => connection.execute(query)),
                };
              },
            },
            {
              verify: (supplied, candidate) => {
                assertPrincipal(supplied);
                return checked(() => dependencies.admissionVerifier.verify(principal, candidate));
              },
            },
          );
          const repository = new PostgresWebinarPublisherRepository(
            dependencies.pool,
            {
              currentPrincipal: async (supplied) => {
                assertPrincipal(supplied);
                const resolved = await checked(() =>
                  dependencies.databaseAuthority.currentPrincipal(principal),
                );
                assertPrincipal(resolved);
                return principal;
              },
              assertEvidenceCurrent: (evidence, supplied) => {
                assertPrincipal(supplied);
                return checked(() =>
                  dependencies.databaseAuthority.assertEvidenceCurrent(evidence, principal),
                );
              },
              assertDispatch: (input) => {
                assertPrincipal(input.principal);
                assertRecord(input.record);
                return checked(() => dependencies.databaseAuthority.assertDispatch(input));
              },
              assertCheckpoint: (input) => {
                assertPrincipal(input.principal);
                assertRecord(input.record);
                return checked(() => dependencies.databaseAuthority.assertCheckpoint(input));
              },
            },
            envelope.request.task.correlationRef,
          );
          return runWebinarPublisherWorker(
            envelope.request.task,
            principal,
            dependencies.workerRef(),
            {
              repository,
              transport: {
                execute: (input, signal) => checked(() => native.execute(input, signal)),
              },
              assertCurrent: (supplied, record) => {
                assertPrincipal(supplied);
                assertRecord(record);
                return checked(() => dependencies.assertCurrent(principal, record));
              },
              media: (supplied, record) => {
                assertPrincipal(supplied);
                assertRecord(record);
                return checked(() => dependencies.media(principal, record));
              },
              now: dependencies.now,
              admitResponse: async (response) => {
                assertPrincipal(response.principal);
                assertRecord(response.record);
                await checked(() => dependencies.verifyResponse(response));
                if (response.operation === "linked") {
                  const candidate = await checked(() => dependencies.responseAdmission(response));
                  await checked(() => admissions.admit(principal, candidate));
                }
                await current();
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
