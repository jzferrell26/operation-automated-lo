import { z } from "zod";
import {
  canonicalCampaignHash,
  freezeAuthenticatedPrincipal,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import {
  parseActorRef,
  parseLocationRef,
  OpaqueReferenceSchema,
  WebinarPublisherTaskSchema,
} from "@oalo/contracts";
import {
  PostgresWebinarPublisherRepository,
  type DatabasePool,
  type WebinarPublisherDatabaseAuthority,
} from "@oalo/db";
import { createProductionTaskAuthorityProof } from "./production-runtime-composition.js";
import {
  WebinarPublisherWorkerRequestSchema,
  type WebinarPublisherWorkerRuntime,
} from "./webinar-publisher-runtime.js";
import { WebinarPublisherBindingError } from "./webinar-publisher-runtime-bindings.js";

const Configuration = z
  .object({
    taskAuthorityHmacKey: z.string().regex(/^[a-f0-9]{64}$/u),
    actorId: z.uuid(),
    locationId: z.uuid(),
    locationRef: OpaqueReferenceSchema,
    correlationRef: OpaqueReferenceSchema,
  })
  .strict();
export interface WebinarPublisherRelayDependencies {
  pool: DatabasePool;
  databaseAuthority: WebinarPublisherDatabaseAuthority;
  /** Current immutable server auth provenance, no serialized/browser principal. */
  currentPrincipal(
    input: Readonly<{ actorId: string; locationId: string }>,
  ): Promise<AuthenticatedPrincipal>;
  runtime: WebinarPublisherWorkerRuntime;
  now(): Date;
}
/** One at-least-once delivery per bounded scan. No broker ACK or relay completion is persisted.
 * Existing worker claim/lease/attempt CAS owns possible-write recovery and outbox completion. */
export function createWebinarPublisherRelay(
  configuration: unknown,
  dependencies: WebinarPublisherRelayDependencies,
) {
  const parsed = Configuration.safeParse(configuration);
  if (
    !parsed.success ||
    !dependencies ||
    typeof dependencies.currentPrincipal !== "function" ||
    typeof dependencies.runtime?.execute !== "function" ||
    typeof dependencies.pool?.connect !== "function" ||
    typeof dependencies.now !== "function" ||
    typeof dependencies.databaseAuthority?.currentPrincipal !== "function" ||
    typeof dependencies.databaseAuthority.assertEvidenceCurrent !== "function" ||
    typeof dependencies.databaseAuthority.assertDispatch !== "function" ||
    typeof dependencies.databaseAuthority.assertCheckpoint !== "function"
  )
    throw new WebinarPublisherBindingError();
  const scope = parsed.data;
  const current = async () => {
    const principal = freezeAuthenticatedPrincipal(
      await dependencies.currentPrincipal({ actorId: scope.actorId, locationId: scope.locationId }),
    );
    if (
      principal.authenticationMode === "local_synthetic" ||
      principal.role !== "location_admin" ||
      principal.actorId !== scope.actorId ||
      principal.locationId !== scope.locationId ||
      principal.locationRef !== scope.locationRef ||
      parseActorRef(principal.actorRef) !== principal.actorId ||
      parseLocationRef(principal.locationRef) !== principal.locationId
    )
      throw new WebinarPublisherBindingError();
    return principal;
  };
  return {
    async run(signal?: AbortSignal) {
      if (signal?.aborted) return { disposition: "pending" as const };
      const boundedSignal = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(50_000)])
        : AbortSignal.timeout(50_000);
      const principal = await current();
      const repository = new PostgresWebinarPublisherRepository(
        dependencies.pool,
        dependencies.databaseAuthority,
        scope.correlationRef,
      );
      // A single oldest pending item is attempted. A scheduled caller owns later scans;
      // this relay performs no sleeps, write retries, completion marks or global auth enumeration.
      const tasks = await repository.pendingTasks(principal, 1);
      if (tasks.length === 0) return { disposition: "idle" as const };
      const task = WebinarPublisherTaskSchema.parse(tasks[0]);
      const record = await repository.readWorker(principal, task.operationRef);
      if (
        task.operationRef !== record.operation.operationRef ||
        task.locationRef !== principal.locationRef ||
        task.locationRef !== record.operation.locationRef ||
        task.action !== record.operation.action ||
        task.projectionHash !== record.operation.projectionHash ||
        task.correlationRef !== record.operation.correlationRef ||
        record.operation.actorRef !== principal.actorRef ||
        record.operation.actorRoleVersion !== principal.roleVersion
      )
        throw new WebinarPublisherBindingError();
      if (record.operation.stage === "complete") return { disposition: "idle" as const };
      const now = dependencies.now().getTime();
      if (
        boundedSignal.aborted ||
        Date.parse(record.deadlineAt) <= now + 10_000 ||
        (record.leaseExpiresAt !== null && Date.parse(record.leaseExpiresAt) > now)
      )
        return { disposition: "pending" as const };
      if (canonicalCampaignHash(await current()) !== canonicalCampaignHash(principal))
        throw new WebinarPublisherBindingError();
      const expiresAt = new Date(
        Math.min(dependencies.now().getTime() + 60_000, Date.parse(record.deadlineAt)),
      ).toISOString();
      const taskHash = canonicalCampaignHash(task);
      const request = WebinarPublisherWorkerRequestSchema.parse({
        schemaVersion: 1,
        task,
        delivery: {
          schemaVersion: 1,
          deliveryKind: "task",
          deliveryRef: `delivery_webinar_${taskHash.slice(0, 40)}`,
          businessOutcomeKey: taskHash,
          locationRef: task.locationRef,
          correlationId: task.correlationRef,
        },
      });
      const authority = createProductionTaskAuthorityProof({
        delivery: request.delivery,
        request,
        locationId: principal.locationId,
        actorId: principal.actorId,
        expiresAt,
        hmacKey: scope.taskAuthorityHmacKey,
      });
      if (boundedSignal.aborted) return { disposition: "pending" as const };
      // A crash before invoke leaves the outbox pending. A crash after possible send is
      // reconciled by the consumer's retained attempt on the next valid delivery.
      return dependencies.runtime.execute({ schemaVersion: 1, request, authority }, boundedSignal);
    },
  };
}
