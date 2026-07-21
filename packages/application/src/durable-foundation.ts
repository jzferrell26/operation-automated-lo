import {
  AuthoritySnapshotSchema,
  CommandEnvelopeSchema,
  DeliveryReferenceSchema,
  OutboxEventSchema,
  ProviderOperationSchema,
  type AuthoritySnapshot,
  type CommandEnvelope,
  type DeliveryReference,
  type OutboxEvent,
  type ProviderOperation,
} from "@oalo/contracts";
import type { ProviderWriteResult, ReconciliationResult } from "@oalo/domain";

export interface CommittedCommand {
  readonly commandId: string;
  readonly status: "committed" | "completed";
  readonly resourceVersion: number;
}

export interface CommandTransaction {
  findByIdempotencyKey(command: CommandEnvelope): Promise<CommittedCommand | undefined>;
  recordAccepted(command: CommandEnvelope): Promise<void>;
  applyBusinessState(command: CommandEnvelope): Promise<number>;
  appendAudit(command: CommandEnvelope, resourceVersion: number): Promise<void>;
  appendOutbox(command: CommandEnvelope, event: OutboxEvent): Promise<void>;
  markCommitted(command: CommandEnvelope, resourceVersion: number): Promise<CommittedCommand>;
}

export interface TransactionPort {
  run<T>(work: (transaction: CommandTransaction) => Promise<T>): Promise<T>;
}

export interface CommandAuthorityPort {
  assertAuthorized(command: CommandEnvelope): Promise<void>;
}

export type ExecuteCommandResult =
  | Readonly<{ kind: "committed"; command: CommittedCommand }>
  | Readonly<{ kind: "duplicate"; command: CommittedCommand }>;

export async function executeCommand(
  untrustedCommand: unknown,
  untrustedEvent: unknown,
  ports: Readonly<{ transaction: TransactionPort; authority: CommandAuthorityPort }>,
): Promise<ExecuteCommandResult> {
  const command = CommandEnvelopeSchema.parse(untrustedCommand);
  const event = OutboxEventSchema.parse(untrustedEvent);
  if (
    event.commandRef !== command.commandId ||
    event.locationRef !== command.locationRef ||
    event.correlationId !== command.correlationId
  ) {
    throw new Error("Command and outbox event references do not match");
  }

  return ports.transaction.run(async (transaction) => {
    const existing = await transaction.findByIdempotencyKey(command);
    if (existing !== undefined) return { kind: "duplicate", command: existing };

    await ports.authority.assertAuthorized(command);
    await transaction.recordAccepted(command);
    const resourceVersion = await transaction.applyBusinessState(command);
    await transaction.appendAudit(command, resourceVersion);
    await transaction.appendOutbox(command, event);
    const committed = await transaction.markCommitted(command, resourceVersion);
    return { kind: "committed", command: committed };
  });
}

export interface OutboxLease extends OutboxEvent {
  readonly leaseOwner: string;
}

export interface OutboxPort {
  leaseAvailable(
    input: Readonly<{ leaseOwner: string; limit: number; leaseUntil: Date }>,
  ): Promise<readonly OutboxLease[]>;
  markDispatched(eventId: string): Promise<void>;
  releaseAfterFailure(eventId: string, problemCode: string): Promise<void>;
}

export interface OutboxDispatcher {
  dispatch(event: OutboxLease): Promise<void>;
}

export interface SweepResult {
  readonly leased: number;
  readonly dispatched: number;
  readonly released: number;
}

export async function sweepOutbox(
  ports: Readonly<{ outbox: OutboxPort; dispatcher: OutboxDispatcher }>,
  input: Readonly<{ leaseOwner: string; limit: number; leaseUntil: Date }>,
): Promise<SweepResult> {
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) {
    throw new Error("Outbox sweep limit must be an integer from 1 through 100");
  }
  const leased = await ports.outbox.leaseAvailable(input);
  let dispatched = 0;
  let released = 0;
  for (const event of leased) {
    const eventContract = {
      schemaVersion: event.schemaVersion,
      eventId: event.eventId,
      eventName: event.eventName,
      locationRef: event.locationRef,
      aggregateType: event.aggregateType,
      aggregateRef: event.aggregateRef,
      aggregateVersion: event.aggregateVersion,
      commandRef: event.commandRef,
      correlationId: event.correlationId,
      availableAt: event.availableAt,
    } satisfies OutboxEvent;
    OutboxEventSchema.parse(eventContract);
    try {
      await ports.dispatcher.dispatch(event);
      await ports.outbox.markDispatched(event.eventId);
      dispatched += 1;
    } catch (error: unknown) {
      const problemCode =
        error instanceof Error ? "OUTBOX_DISPATCH_FAILED" : "OUTBOX_UNKNOWN_FAILURE";
      await ports.outbox.releaseAfterFailure(event.eventId, problemCode);
      released += 1;
    }
  }
  return { leased: leased.length, dispatched, released };
}

export interface DeliveryGuardPort {
  claim(delivery: DeliveryReference): Promise<boolean>;
  complete(delivery: DeliveryReference): Promise<void>;
  release(delivery: DeliveryReference): Promise<void>;
  markCompletionUncertain(
    delivery: DeliveryReference,
    problemCode: "DELIVERY_COMPLETION_UNCERTAIN",
  ): Promise<void>;
}

export class DeliveryCompletionUncertainError extends Error {
  public readonly problemCode = "DELIVERY_COMPLETION_UNCERTAIN" as const;
  public override readonly cause: unknown;

  public constructor(cause: unknown) {
    super("Delivery side effect succeeded, but durable completion could not be confirmed.");
    this.name = "DeliveryCompletionUncertainError";
    this.cause = cause;
  }
}

export async function processDelivery<T>(
  untrustedDelivery: unknown,
  guard: DeliveryGuardPort,
  handler: (delivery: DeliveryReference) => Promise<T>,
): Promise<Readonly<{ kind: "processed"; value: T }> | Readonly<{ kind: "duplicate" }>> {
  const delivery = DeliveryReferenceSchema.parse(untrustedDelivery);
  if (!(await guard.claim(delivery))) return { kind: "duplicate" };
  let value: T;
  try {
    value = await handler(delivery);
  } catch (error: unknown) {
    await guard.release(delivery);
    throw error;
  }

  try {
    await guard.complete(delivery);
  } catch (completionError: unknown) {
    try {
      await guard.markCompletionUncertain(delivery, "DELIVERY_COMPLETION_UNCERTAIN");
    } catch (reconciliationError: unknown) {
      throw new AggregateError(
        [completionError, reconciliationError],
        "Delivery completion failed and durable reconciliation could not be recorded.",
      );
    }
    throw new DeliveryCompletionUncertainError(completionError);
  }
  return { kind: "processed", value };
}

export type QueueClass = "provider" | "renderer" | "ai";

export interface QueueConstraint {
  readonly queueKey: string;
  readonly perLocationLimit: number;
  readonly globalLimit: number;
}

const queueLimits: Readonly<Record<QueueClass, number>> = Object.freeze({
  provider: 1,
  renderer: 2,
  ai: 2,
});

export function queueConstraint(locationRef: string, queueClass: QueueClass): QueueConstraint {
  const location = zodLocationRef(locationRef);
  return Object.freeze({
    queueKey: `location:${location}:${queueClass}`,
    perLocationLimit: queueLimits[queueClass],
    globalLimit: 32,
  });
}

function zodLocationRef(value: unknown): string {
  return CommandEnvelopeSchema.shape.locationRef.parse(value);
}

export interface ProviderOperationPort {
  load(
    operation: ProviderOperation,
  ): Promise<
    | Readonly<{ status: "new" }>
    | Readonly<{ status: "confirmed"; normalizedResultRef: string }>
    | Readonly<{ status: "uncertain" }>
  >;
  currentAuthority(operation: ProviderOperation): Promise<AuthoritySnapshot>;
  reserve(operation: ProviderOperation): Promise<void>;
  write(operation: ProviderOperation): Promise<ProviderWriteResult>;
  reconcile(operation: ProviderOperation): Promise<ReconciliationResult>;
  markConfirmed(operation: ProviderOperation, normalizedResultRef: string): Promise<void>;
  markUncertain(operation: ProviderOperation): Promise<void>;
  markFailed(operation: ProviderOperation, failureClass: string): Promise<void>;
}

export type ProviderOperationOutcome =
  | Readonly<{
      kind: "confirmed";
      normalizedResultRef: string;
      source: "prior" | "write" | "reconciliation";
    }>
  | Readonly<{ kind: "blocked"; reason: "AUTHORITY_REVOKED" | "READINESS_REQUIRED" }>
  | Readonly<{ kind: "failed"; failureClass: string }>
  | Readonly<{ kind: "uncertain" }>;

const readinessRequiredOperations = new Set<ProviderOperation["operation"]>([
  "ghl.meta.publish",
  "ghl.meta.resume",
  "ghl.contact.upsert",
  "ghl.opportunity.upsert",
  "ghl.workflow.enroll",
]);

function providerOperationBlockReason(
  snapshot: AuthoritySnapshot,
  operation: ProviderOperation,
): "AUTHORITY_REVOKED" | "READINESS_REQUIRED" | undefined {
  const authority = AuthoritySnapshotSchema.parse(snapshot);
  if (
    !authority.installationActive ||
    !authority.entitlementActive ||
    !authority.actorAuthorized ||
    authority.tokenHealth !== "healthy"
  ) {
    return "AUTHORITY_REVOKED";
  }
  if (
    readinessRequiredOperations.has(operation.operation) &&
    authority.readinessState !== "launch_ready"
  ) {
    return "READINESS_REQUIRED";
  }
  return undefined;
}

export async function executeProviderOperation(
  untrustedOperation: unknown,
  port: ProviderOperationPort,
): Promise<ProviderOperationOutcome> {
  const operation = ProviderOperationSchema.parse(untrustedOperation);
  const existing = await port.load(operation);
  if (existing.status === "confirmed") {
    return {
      kind: "confirmed",
      normalizedResultRef: existing.normalizedResultRef,
      source: "prior",
    };
  }

  const initialBlock = providerOperationBlockReason(
    await port.currentAuthority(operation),
    operation,
  );
  if (initialBlock !== undefined) return { kind: "blocked", reason: initialBlock };

  if (existing.status === "uncertain") {
    const reconciliation = await port.reconcile(operation);
    if (reconciliation.kind === "confirmed") {
      await port.markConfirmed(operation, reconciliation.normalizedResultRef);
      return {
        kind: "confirmed",
        normalizedResultRef: reconciliation.normalizedResultRef,
        source: "reconciliation",
      };
    }
    if (reconciliation.kind === "unresolved") return { kind: "uncertain" };
  }

  await port.reserve(operation);
  const sideEffectBlock = providerOperationBlockReason(
    await port.currentAuthority(operation),
    operation,
  );
  if (sideEffectBlock !== undefined) return { kind: "blocked", reason: sideEffectBlock };

  const result = await port.write(operation);
  if (result.kind === "confirmed") {
    await port.markConfirmed(operation, result.normalizedResultRef);
    return { kind: "confirmed", normalizedResultRef: result.normalizedResultRef, source: "write" };
  }
  if (result.kind === "uncertain") {
    await port.markUncertain(operation);
    return { kind: "uncertain" };
  }
  await port.markFailed(operation, result.failureClass);
  return { kind: "failed", failureClass: result.failureClass };
}
