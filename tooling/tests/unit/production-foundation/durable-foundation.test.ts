import { describe, expect, it, vi } from "vitest";

import {
  executeCommand,
  executeProviderOperation,
  processDelivery,
  queueConstraint,
  sweepOutbox,
  type CommandTransaction,
  type DeliveryGuardPort,
  type OutboxLease,
  type ProviderOperationPort,
  type TransactionPort,
} from "@oalo/application";
import type {
  AuthoritySnapshot,
  CommandEnvelope,
  DeliveryReference,
  OutboxEvent,
  ProviderOperation,
} from "@oalo/contracts";
import { isRetryableProviderFailure, requiresReconciliation } from "@oalo/domain";

const sha = (character: string) => character.repeat(64);

const command: CommandEnvelope = {
  schemaVersion: 1,
  commandId: "cmd_01JFoundation",
  commandName: "campaign.render",
  locationRef: "loc_01TenantA",
  actorRef: "usr_01Creator",
  aggregateType: "campaign",
  aggregateRef: "cmp_01Campaign",
  expectedVersion: 2,
  idempotencyKey: sha("a"),
  inputHash: sha("b"),
  correlationId: "corr_01Foundation",
};

const event: OutboxEvent = {
  schemaVersion: 1,
  eventId: "evt_01Render",
  eventName: "campaign.render-requested",
  locationRef: command.locationRef,
  aggregateType: "campaign",
  aggregateRef: command.aggregateRef,
  aggregateVersion: 3,
  commandRef: command.commandId,
  correlationId: command.correlationId,
  availableAt: "2026-07-21T12:00:00.000Z",
};

function commandHarness(options?: Readonly<{ failState?: boolean }>) {
  const state = {
    commands: new Map<
      string,
      { commandId: string; status: "committed"; resourceVersion: number }
    >(),
    businessVersions: [] as number[],
    audits: [] as string[],
    outbox: [] as string[],
  };
  const authority = { assertAuthorized: vi.fn(async () => undefined) };
  const transaction: TransactionPort = {
    async run<T>(work: (transaction: CommandTransaction) => Promise<T>): Promise<T> {
      const snapshot = structuredClone({
        commands: [...state.commands],
        businessVersions: state.businessVersions,
        audits: state.audits,
        outbox: state.outbox,
      });
      const tx: CommandTransaction = {
        findByIdempotencyKey: async (input) => state.commands.get(input.idempotencyKey),
        recordAccepted: async () => undefined,
        applyBusinessState: async () => {
          if (options?.failState === true) throw new Error("state failed");
          state.businessVersions.push(3);
          return 3;
        },
        appendAudit: async (input) => {
          state.audits.push(input.commandId);
        },
        appendOutbox: async (_input, outboxEvent) => {
          state.outbox.push(outboxEvent.eventId);
        },
        markCommitted: async (input, resourceVersion) => {
          const committed = {
            commandId: input.commandId,
            status: "committed" as const,
            resourceVersion,
          };
          state.commands.set(input.idempotencyKey, committed);
          return committed;
        },
      };
      try {
        return await work(tx);
      } catch (error: unknown) {
        state.commands = new Map(snapshot.commands);
        state.businessVersions = snapshot.businessVersions;
        state.audits = snapshot.audits;
        state.outbox = snapshot.outbox;
        throw error;
      }
    },
  };
  return { state, authority, transaction };
}

const healthyAuthority: AuthoritySnapshot = {
  installationActive: true,
  entitlementActive: true,
  actorAuthorized: true,
  tokenHealth: "healthy",
};

const operation: ProviderOperation = {
  schemaVersion: 1,
  operationRef: "op_01Publish",
  operation: "ghl.meta.publish",
  locationRef: command.locationRef,
  aggregateRef: command.aggregateRef,
  commandRef: command.commandId,
  idempotencyKey: sha("c"),
  safeRequestHash: sha("d"),
  correlationId: command.correlationId,
};

function providerPort(
  overrides: Partial<ProviderOperationPort> = {},
): ProviderOperationPort & Readonly<{ writes: ReturnType<typeof vi.fn> }> {
  const writes = vi.fn(async () => ({
    kind: "confirmed" as const,
    normalizedResultRef: "result_01",
  }));
  return {
    writes,
    load: vi.fn(async () => ({ status: "new" as const })),
    currentAuthority: vi.fn(async () => healthyAuthority),
    reserve: vi.fn(async () => undefined),
    write: writes,
    reconcile: vi.fn(async () => ({ kind: "absent" as const })),
    markConfirmed: vi.fn(async () => undefined),
    markUncertain: vi.fn(async () => undefined),
    markFailed: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("durable command foundation", () => {
  it("commits state, audit, and outbox together and deduplicates the command", async () => {
    const harness = commandHarness();
    const first = await executeCommand(command, event, harness);
    const second = await executeCommand(command, event, harness);

    expect(first).toEqual({
      kind: "committed",
      command: { commandId: command.commandId, status: "committed", resourceVersion: 3 },
    });
    expect(second.kind).toBe("duplicate");
    expect(harness.state.businessVersions).toEqual([3]);
    expect(harness.state.audits).toEqual([command.commandId]);
    expect(harness.state.outbox).toEqual([event.eventId]);
    expect(harness.authority.assertAuthorized).toHaveBeenCalledTimes(1);
  });

  it("rolls back all transaction-owned records when business state fails", async () => {
    const harness = commandHarness({ failState: true });
    await expect(executeCommand(command, event, harness)).rejects.toThrow("state failed");
    expect(harness.state.commands.size).toBe(0);
    expect(harness.state.businessVersions).toEqual([]);
    expect(harness.state.audits).toEqual([]);
    expect(harness.state.outbox).toEqual([]);
  });

  it.each([
    { commandRef: "cmd_02Mismatch" },
    { locationRef: "loc_02TenantB" },
    { correlationId: "corr_02Mismatch" },
  ])(
    "rejects an outbox event whose references differ: $commandRef$locationRef$correlationId",
    async (change) => {
      const harness = commandHarness();
      await expect(executeCommand(command, { ...event, ...change }, harness)).rejects.toThrow(
        "Command and outbox event references do not match",
      );
    },
  );
});

describe("outbox recovery and delivery deduplication", () => {
  it("dispatches successful leases and releases both Error and unknown failures", async () => {
    const leases: readonly OutboxLease[] = [
      { ...event, eventId: "evt_01Success", leaseOwner: "worker_01" },
      { ...event, eventId: "evt_02Error", leaseOwner: "worker_01" },
      { ...event, eventId: "evt_03Unknown", leaseOwner: "worker_01" },
    ];
    const marked: string[] = [];
    const released: string[] = [];
    const result = await sweepOutbox(
      {
        outbox: {
          leaseAvailable: async () => leases,
          markDispatched: async (eventId) => {
            marked.push(eventId);
          },
          releaseAfterFailure: async (eventId, code) => {
            released.push(`${eventId}:${code}`);
          },
        },
        dispatcher: {
          dispatch: async (leasedEvent) => {
            if (leasedEvent.eventId === "evt_02Error") throw new Error("network");
            if (leasedEvent.eventId === "evt_03Unknown") throw "unknown";
          },
        },
      },
      { leaseOwner: "worker_01", limit: 10, leaseUntil: new Date("2026-07-21T12:01:00Z") },
    );

    expect(result).toEqual({ leased: 3, dispatched: 1, released: 2 });
    expect(marked).toEqual(["evt_01Success"]);
    expect(released).toEqual([
      "evt_02Error:OUTBOX_DISPATCH_FAILED",
      "evt_03Unknown:OUTBOX_UNKNOWN_FAILURE",
    ]);
  });

  it.each([0, 101, 1.5])("rejects an invalid lease batch size: %s", async (limit) => {
    await expect(
      sweepOutbox(
        {
          outbox: {
            leaseAvailable: async () => [],
            markDispatched: async () => undefined,
            releaseAfterFailure: async () => undefined,
          },
          dispatcher: { dispatch: async () => undefined },
        },
        { leaseOwner: "worker_01", limit, leaseUntil: new Date() },
      ),
    ).rejects.toThrow("Outbox sweep limit");
  });

  it("produces one business outcome for duplicate delivery and releases a failed claim", async () => {
    const delivery: DeliveryReference = {
      schemaVersion: 1,
      deliveryKind: "webhook",
      deliveryRef: "webhook_01Event",
      businessOutcomeKey: sha("e"),
      locationRef: command.locationRef,
      correlationId: command.correlationId,
    };
    let claimed = false;
    let completed = 0;
    let released = 0;
    const guard: DeliveryGuardPort = {
      claim: async () => {
        if (claimed) return false;
        claimed = true;
        return true;
      },
      complete: async () => {
        completed += 1;
      },
      release: async () => {
        released += 1;
        claimed = false;
      },
    };
    const handler = vi.fn(async () => "one-outcome");
    await expect(processDelivery(delivery, guard, handler)).resolves.toEqual({
      kind: "processed",
      value: "one-outcome",
    });
    await expect(processDelivery(delivery, guard, handler)).resolves.toEqual({ kind: "duplicate" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(completed).toBe(1);

    const freshGuard: DeliveryGuardPort = {
      ...guard,
      claim: async () => true,
    };
    await expect(
      processDelivery(delivery, freshGuard, async () => {
        throw new Error("handler failed");
      }),
    ).rejects.toThrow("handler failed");
    expect(released).toBe(1);
  });
});

describe("tenant queues and provider reconciliation", () => {
  it("creates distinct bounded queue keys for provider, renderer, and AI work", () => {
    expect(queueConstraint(command.locationRef, "provider")).toEqual({
      queueKey: `location:${command.locationRef}:provider`,
      perLocationLimit: 1,
      globalLimit: 32,
    });
    expect(queueConstraint(command.locationRef, "renderer").perLocationLimit).toBe(2);
    expect(queueConstraint(command.locationRef, "ai").perLocationLimit).toBe(2);
    expect(() => queueConstraint("browser-selected-location", "provider")).toThrow();
  });

  it("returns a prior confirmed result without another provider write", async () => {
    const port = providerPort({
      load: vi.fn(async () => ({
        status: "confirmed" as const,
        normalizedResultRef: "result_prior",
      })),
    });
    await expect(executeProviderOperation(operation, port)).resolves.toEqual({
      kind: "confirmed",
      normalizedResultRef: "result_prior",
      source: "prior",
    });
    expect(port.writes).not.toHaveBeenCalled();
  });

  it.each([
    { ...healthyAuthority, installationActive: false },
    { ...healthyAuthority, entitlementActive: false },
    { ...healthyAuthority, actorAuthorized: false },
    { ...healthyAuthority, tokenHealth: "reconnect-required" as const },
  ])("blocks a provider write when current authority is lost", async (authority) => {
    const port = providerPort({ currentAuthority: vi.fn(async () => authority) });
    await expect(executeProviderOperation(operation, port)).resolves.toEqual({
      kind: "blocked",
      reason: "AUTHORITY_REVOKED",
    });
    expect(port.writes).not.toHaveBeenCalled();
  });

  it("reconciles an uncertain operation to confirmed without writing again", async () => {
    const port = providerPort({
      load: vi.fn(async () => ({ status: "uncertain" as const })),
      reconcile: vi.fn(async () => ({
        kind: "confirmed" as const,
        normalizedResultRef: "result_reconciled",
      })),
    });
    await expect(executeProviderOperation(operation, port)).resolves.toEqual({
      kind: "confirmed",
      normalizedResultRef: "result_reconciled",
      source: "reconciliation",
    });
    expect(port.writes).not.toHaveBeenCalled();
    expect(port.markConfirmed).toHaveBeenCalledWith(operation, "result_reconciled");
  });

  it("keeps an unresolved uncertain operation from issuing a blind retry", async () => {
    const port = providerPort({
      load: vi.fn(async () => ({ status: "uncertain" as const })),
      reconcile: vi.fn(async () => ({ kind: "unresolved" as const })),
    });
    await expect(executeProviderOperation(operation, port)).resolves.toEqual({ kind: "uncertain" });
    expect(port.writes).not.toHaveBeenCalled();
  });

  it("writes once after reconciliation proves an uncertain write absent", async () => {
    const port = providerPort({ load: vi.fn(async () => ({ status: "uncertain" as const })) });
    await expect(executeProviderOperation(operation, port)).resolves.toEqual({
      kind: "confirmed",
      normalizedResultRef: "result_01",
      source: "write",
    });
    expect(port.reconcile).toHaveBeenCalledTimes(1);
    expect(port.writes).toHaveBeenCalledTimes(1);
  });

  it("rechecks authority immediately before the side effect", async () => {
    const currentAuthority = vi
      .fn<() => Promise<AuthoritySnapshot>>()
      .mockResolvedValueOnce(healthyAuthority)
      .mockResolvedValueOnce({ ...healthyAuthority, entitlementActive: false });
    const port = providerPort({ currentAuthority });
    await expect(executeProviderOperation(operation, port)).resolves.toEqual({
      kind: "blocked",
      reason: "AUTHORITY_REVOKED",
    });
    expect(port.reserve).toHaveBeenCalledTimes(1);
    expect(port.writes).not.toHaveBeenCalled();
  });

  it("records uncertain and terminal provider outcomes without retrying", async () => {
    const uncertain = providerPort({
      write: vi.fn(async () => ({
        kind: "uncertain" as const,
        failureClass: "UNCERTAIN_WRITE" as const,
      })),
    });
    await expect(executeProviderOperation(operation, uncertain)).resolves.toEqual({
      kind: "uncertain",
    });
    expect(uncertain.markUncertain).toHaveBeenCalledTimes(1);

    const failed = providerPort({
      write: vi.fn(async () => ({
        kind: "failed" as const,
        failureClass: "POLICY_TERMINAL" as const,
      })),
    });
    await expect(executeProviderOperation(operation, failed)).resolves.toEqual({
      kind: "failed",
      failureClass: "POLICY_TERMINAL",
    });
    expect(failed.markFailed).toHaveBeenCalledWith(operation, "POLICY_TERMINAL");
  });

  it("classifies retryable failures without treating uncertain writes as retryable", () => {
    expect(isRetryableProviderFailure("AUTH_REFRESHABLE")).toBe(true);
    expect(isRetryableProviderFailure("RATE_LIMITED")).toBe(true);
    expect(isRetryableProviderFailure("TRANSIENT_PROVIDER")).toBe(true);
    expect(isRetryableProviderFailure("VALIDATION_TERMINAL")).toBe(false);
    expect(requiresReconciliation("UNCERTAIN_WRITE")).toBe(true);
    expect(requiresReconciliation("RATE_LIMITED")).toBe(false);
  });
});
