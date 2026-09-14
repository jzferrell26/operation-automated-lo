import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { appendCampaignTransition, type CampaignEventPort } from "@oalo/application";
import {
  CampaignEventSchema,
  CampaignStateSchema,
  CampaignVersionSchema,
  PreflightResultSchema,
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
}>;

const storePath = join(process.cwd(), ".oalo", "local-campaign-store.json");
let writeChain: Promise<void> = Promise.resolve();

async function readStore() {
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

async function writeStore(store: z.infer<typeof LocalCampaignStoreSchema>) {
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
    const store = await readStore();
    const existing = store.campaigns[version.campaignRef];
    if (existing !== undefined) {
      if (existing.version.campaignVersionRef !== version.campaignVersionRef) {
        throw new Error("Local campaign reference already points to a different immutable version");
      }
      persisted = existing;
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
    });
    store.campaigns[version.campaignRef] = record;
    await writeStore(store);
    persisted = record;
  });
  return Object.freeze(persisted);
}

export async function loadLocalCampaign(
  campaignRef: string,
  environment: unknown = process.env,
): Promise<LocalCampaignRecord | undefined> {
  authenticatedWorkspaceMode(environment);
  const store = await readStore();
  const record = store.campaigns[campaignRef];
  return record === undefined ? undefined : Object.freeze(record);
}
