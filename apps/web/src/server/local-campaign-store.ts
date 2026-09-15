import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  appendCampaignTransition,
  CampaignApprovalStaleError,
  CampaignResourceNotAccessibleError,
  type CampaignApprovalRepository,
  type CampaignApprovalTransaction,
  type CampaignEventPort,
  type CampaignWorkspaceReadRecord,
  type CampaignWorkspaceReadRepository,
} from "@oalo/application";
import {
  ApprovalDecisionSchema,
  CampaignEventSchema,
  CampaignStateSchema,
  CampaignVersionSchema,
  PreflightResultSchema,
  type ApprovalDecision,
  type CampaignEvent,
  type CampaignState,
  type CampaignVersion,
  type PreflightResult,
} from "@oalo/contracts";
import { z } from "zod";

import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";

const LocalCampaignRecordSchema = z
  .object({
    version: CampaignVersionSchema,
    preflight: PreflightResultSchema,
    state: CampaignStateSchema,
    events: z.array(CampaignEventSchema),
    updatedAt: z.iso.datetime({ offset: true }),
    rowVersion: z.number().int().positive().default(1),
    approval: ApprovalDecisionSchema.optional(),
  })
  .strict();

const LocalCampaignStoreSchema = z
  .object({
    schemaVersion: z.literal(1),
    campaigns: z.record(z.string(), LocalCampaignRecordSchema),
  })
  .strict();

export type LocalCampaignRecord = Readonly<{
  version: CampaignVersion;
  preflight: PreflightResult;
  state: CampaignState;
  events: readonly CampaignEvent[];
  updatedAt: string;
  rowVersion: number;
  approval?: ApprovalDecision | undefined;
}>;

function freezeLocalCampaign(
  record: z.infer<typeof LocalCampaignRecordSchema>,
): LocalCampaignRecord {
  return Object.freeze({
    version: record.version,
    preflight: record.preflight,
    state: record.state,
    events: record.events,
    updatedAt: record.updatedAt,
    rowVersion: record.rowVersion,
    ...(record.approval === undefined ? {} : { approval: record.approval }),
  });
}

function resolveStorePath(environment: unknown): string {
  if (
    typeof environment === "object" &&
    environment !== null &&
    "OALO_LOCAL_CAMPAIGN_STORE" in environment &&
    typeof environment.OALO_LOCAL_CAMPAIGN_STORE === "string" &&
    environment.OALO_LOCAL_CAMPAIGN_STORE.length > 0
  ) {
    return environment.OALO_LOCAL_CAMPAIGN_STORE;
  }
  return join(process.cwd(), ".oalo", "local-campaign-store.json");
}

let writeChain: Promise<void> = Promise.resolve();

async function readStore(storePath: string) {
  try {
    const raw = await readFile(storePath, "utf8");
    return LocalCampaignStoreSchema.parse(JSON.parse(raw));
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return { schemaVersion: 1 as const, campaigns: {} };
    }
    throw error;
  }
}

async function writeStore(storePath: string, store: z.infer<typeof LocalCampaignStoreSchema>) {
  await mkdir(dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temporaryPath, storePath);
}

function queueWrite(work: () => Promise<void>): Promise<void> {
  const next = writeChain.then(work, work);
  writeChain = next.catch(() => undefined);
  return next;
}

export async function persistLocalCampaign(
  versionInput: unknown,
  preflightInput: unknown,
  environment: unknown = process.env,
): Promise<LocalCampaignRecord> {
  authenticatedWorkspaceMode(environment);
  const storePath = resolveStorePath(environment);
  const version = CampaignVersionSchema.parse(versionInput);
  const preflight = PreflightResultSchema.parse(preflightInput);
  if (
    preflight.campaignRef !== version.campaignRef ||
    preflight.campaignVersionRef !== version.campaignVersionRef ||
    preflight.manifestHash !== version.manifestHash
  ) {
    throw new Error(
      "Campaign persistence requires preflight evidence for the exact frozen version",
    );
  }

  let persisted!: LocalCampaignRecord;
  await queueWrite(async () => {
    const store = await readStore(storePath);
    const existing = store.campaigns[version.campaignRef];
    if (existing !== undefined) {
      if (existing.version.campaignVersionRef !== version.campaignVersionRef) {
        throw new Error("Local campaign reference already points to a different immutable version");
      }
      persisted = freezeLocalCampaign(existing);
      return;
    }

    let state: CampaignState = "draft";
    const events: CampaignEvent[] = [];
    const eventPort: CampaignEventPort = {
      async currentState() {
        return state;
      },
      async append(event) {
        events.push(event);
        state = event.toState;
      },
    };
    const occurredAt = new Date().toISOString();
    const suffix = version.campaignRef.slice(-12);
    await appendCampaignTransition(
      {
        schemaVersion: 1,
        eventRef: `event_generated_${suffix}`,
        locationRef: version.locationRef,
        campaignRef: version.campaignRef,
        campaignVersionRef: version.campaignVersionRef,
        fromState: "draft",
        toState: "generated",
        actorRef: version.createdBy,
        occurredAt,
        correlationRef: `correlation_preflight_${suffix}`,
      },
      eventPort,
    );
    await appendCampaignTransition(
      {
        schemaVersion: 1,
        eventRef: `event_preflight_${suffix}`,
        locationRef: version.locationRef,
        campaignRef: version.campaignRef,
        campaignVersionRef: version.campaignVersionRef,
        fromState: "generated",
        toState: preflight.blocking ? "preflight_failed" : "awaiting_approval",
        actorRef: version.createdBy,
        occurredAt,
        correlationRef: `correlation_preflight_${suffix}`,
      },
      eventPort,
    );

    const record = LocalCampaignRecordSchema.parse({
      version,
      preflight,
      state,
      events,
      updatedAt: occurredAt,
      rowVersion: 1,
    });
    store.campaigns[version.campaignRef] = record;
    await writeStore(storePath, store);
    persisted = freezeLocalCampaign(record);
  });
  return Object.freeze(persisted);
}

export async function loadLocalCampaign(
  campaignRef: string,
  environment: unknown = process.env,
): Promise<LocalCampaignRecord | undefined> {
  authenticatedWorkspaceMode(environment);
  const store = await readStore(resolveStorePath(environment));
  const record = store.campaigns[campaignRef];
  return record === undefined ? undefined : freezeLocalCampaign(record);
}

export async function listLocalCampaigns(
  environment: unknown = process.env,
): Promise<readonly LocalCampaignRecord[]> {
  authenticatedWorkspaceMode(environment);
  const store = await readStore(resolveStorePath(environment));
  return Object.freeze(Object.values(store.campaigns).map((record) => freezeLocalCampaign(record)));
}

export function localCampaignToReadRecord(
  record: LocalCampaignRecord,
): CampaignWorkspaceReadRecord {
  return Object.freeze({
    version: record.version,
    preflight: record.preflight,
    state: record.state,
    rowVersion: record.rowVersion,
    updatedAt: record.updatedAt,
    ...(record.approval === undefined ? {} : { approval: record.approval }),
  });
}

export function createFilesystemCampaignReadRepository(
  environment: unknown = process.env,
): CampaignWorkspaceReadRepository {
  authenticatedWorkspaceMode(environment);
  return {
    async listForLocation() {
      const records = await listLocalCampaigns(environment);
      return Object.freeze(records.map((record) => localCampaignToReadRecord(record)));
    },
    async getByCampaignRef(campaignRef) {
      const record = await loadLocalCampaign(campaignRef, environment);
      return record === undefined ? undefined : localCampaignToReadRecord(record);
    },
  };
}

export function createLocalCampaignApprovalRepository(
  environment: unknown = process.env,
): CampaignApprovalRepository {
  authenticatedWorkspaceMode(environment);
  return {
    async run<T>(work: (transaction: CampaignApprovalTransaction) => Promise<T>): Promise<T> {
      authenticatedWorkspaceMode(environment);
      return work({
        async loadCurrentEvidence(campaignRef) {
          const record = await loadLocalCampaign(campaignRef, environment);
          if (record === undefined) return undefined;
          return Object.freeze({
            version: record.version,
            preflight: record.preflight,
            state: record.state,
            rowVersion: record.rowVersion,
            ...(record.approval === undefined ? {} : { existingApproval: record.approval }),
          });
        },
        async commitApproval(input) {
          let committed!: {
            decision: typeof input.decision;
            state: typeof input.toState;
            rowVersion: number;
            duplicate: boolean;
          };
          await queueWrite(async () => {
            const storePath = resolveStorePath(environment);
            const store = await readStore(storePath);
            const existing = store.campaigns[input.decision.campaignRef];
            if (existing === undefined) {
              throw new CampaignResourceNotAccessibleError();
            }
            if (
              existing.approval !== undefined &&
              existing.approval.approvalRef === input.decision.approvalRef
            ) {
              committed = {
                decision: existing.approval,
                state: existing.state,
                rowVersion: existing.rowVersion,
                duplicate: true,
              };
              return;
            }
            if (
              existing.rowVersion !== input.expectedRowVersion ||
              existing.state !== input.fromState
            ) {
              throw new CampaignApprovalStaleError();
            }
            const events = [...existing.events];
            if (input.event !== undefined) events.push(input.event);
            const record = LocalCampaignRecordSchema.parse({
              version: existing.version,
              preflight: existing.preflight,
              state: input.toState,
              events,
              updatedAt: input.decision.decidedAt,
              rowVersion: existing.rowVersion + 1,
              approval: input.decision,
            });
            store.campaigns[input.decision.campaignRef] = record;
            await writeStore(storePath, store);
            committed = {
              decision: input.decision,
              state: record.state,
              rowVersion: record.rowVersion,
              duplicate: false,
            };
          });
          return Object.freeze(committed);
        },
        async recordDeniedAttempt() {
          return undefined;
        },
      });
    },
  };
}
