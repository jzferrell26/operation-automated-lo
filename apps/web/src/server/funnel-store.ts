import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  canonicalCampaignHash,
  assertMayExecuteCampaignMutation,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
  type DatabasePool,
} from "@oalo/db";
import { z } from "zod";
import { FunnelDraftSchema, type FunnelDraft, type FunnelKind } from "../features/funnels/model.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";

export class FunnelError extends Error {
  constructor(
    public readonly code:
      | "FUNNEL_CONFLICT"
      | "FUNNEL_INVALID"
      | "FUNNEL_UNAVAILABLE"
      | "FUNNEL_BRAND_REQUIRED"
      | "FUNNEL_PHOTO_INVALID",
    public readonly status: number,
  ) {
    super(code);
  }
}
export interface FunnelStore {
  list(): Promise<readonly FunnelDraft[]>;
  save(draft: FunnelDraft, expectedRevision: string | null): Promise<FunnelDraft>;
}
const read = defineSqlContract({
  name: "funnel-studio.read.v1",
  access: "read",
  text: "select draft from campaign.funnel_drafts where location_id=$1::uuid and user_id=$2::uuid",
  decode: (row) => z.object({ draft: FunnelDraftSchema }).parse(row).draft,
});
const lock = defineSqlContract({
  name: "funnel-studio.lock.v1",
  access: "write",
  text: "select pg_advisory_xact_lock(hashtextextended($1,0)) as locked",
  decode: () => true,
});
const write = defineSqlContract({
  name: "funnel-studio.write.v1",
  access: "write",
  text: "insert into campaign.funnel_drafts(location_id,user_id,kind,revision,draft) values($1::uuid,$2::uuid,$3,$4::uuid,$5::text::jsonb) on conflict(location_id,user_id,kind) do update set revision=excluded.revision,draft=excluded.draft,updated_at=now() returning draft",
  decode: (row) => z.object({ draft: FunnelDraftSchema }).parse(row).draft,
});
function chooseWrite(
  current: FunnelDraft | undefined,
  draft: FunnelDraft,
  expected: string | null,
) {
  if (current?.requestId === draft.requestId) {
    if (current.requestHash !== draft.requestHash) throw new FunnelError("FUNNEL_CONFLICT", 409);
    return current;
  }
  if ((current?.revision ?? null) !== expected) throw new FunnelError("FUNNEL_CONFLICT", 409);
  return draft;
}
export function postgresFunnelStore(
  principal: Readonly<AuthenticatedPrincipal>,
  pool: DatabasePool,
): FunnelStore {
  const authority = createPrincipalBoundTenantContextAuthority(
    principal,
    workspaceCorrelationReferenceFor(principal),
  );
  return {
    list: () =>
      withTenantTransaction(pool, authority, (tx) =>
        tx.read(read, [principal.locationId, principal.actorId]),
      ),
    save: async (raw, expected) => {
      assertMayExecuteCampaignMutation(principal);
      const draft = FunnelDraftSchema.parse(raw);
      return withTenantTransaction(pool, authority, async (tx) => {
        await tx.write(lock, [`funnel:${principal.locationId}:${principal.actorId}:${draft.kind}`]);
        const current = (await tx.read(read, [principal.locationId, principal.actorId])).find(
          (row) => row.kind === draft.kind,
        );
        const next = chooseWrite(current, draft, expected);
        if (next === current) return current;
        const saved = (
          await tx.write(write, [
            principal.locationId,
            principal.actorId,
            draft.kind,
            draft.revision,
            JSON.stringify(draft),
          ])
        )[0];
        if (!saved) throw new FunnelError("FUNNEL_UNAVAILABLE", 503);
        return saved;
      });
    },
  };
}
const localSchema = z.record(z.string(), FunnelDraftSchema);
let writes: Promise<unknown> = Promise.resolve();
export function createFunnelStore(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): FunnelStore {
  if (principal.role === "platform_support") throw new FunnelError("FUNNEL_UNAVAILABLE", 403);
  if (authenticatedWorkspaceMode(environment) !== "synthetic")
    return postgresFunnelStore(principal, campaignDatabasePool(environment));
  if (principal.authenticationMode !== "local_synthetic")
    throw new FunnelError("FUNNEL_UNAVAILABLE", 403);
  const parsed = z
    .object({ OALO_LOCAL_CAMPAIGN_STORE: z.string().optional() })
    .loose()
    .parse(environment);
  const file = resolve(
    `${parsed.OALO_LOCAL_CAMPAIGN_STORE ?? "test-results/local-campaigns.json"}.funnels.json`,
  );
  const prefix = `${principal.locationRef}:${principal.actorRef}:`;
  const load = async () => {
    try {
      return localSchema.parse(JSON.parse(await readFile(file, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  };
  return {
    list: async () =>
      Object.entries(await load()).flatMap(([key, value]) =>
        key.startsWith(prefix) ? [value] : [],
      ),
    save: (draft, expected) => {
      assertMayExecuteCampaignMutation(principal);
      const operation = writes.then(async () => {
        const all = await load();
        const key = prefix + draft.kind;
        const next = chooseWrite(all[key], draft, expected);
        all[key] = next;
        await mkdir(dirname(file), { recursive: true });
        const temp = `${file}.${randomUUID()}.tmp`;
        await writeFile(temp, JSON.stringify(all), { mode: 0o600 });
        await rename(temp, file);
        return next;
      });
      // Release the local queue after a refused write, without hiding rejection from its caller.
      writes = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
  };
}
export const funnelRequestHash = (kind: FunnelKind, fields: unknown) =>
  canonicalCampaignHash({ kind, fields });
