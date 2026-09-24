import { randomUUID } from "node:crypto";
import type { AuthenticatedPrincipal } from "@oalo/application";
import { HomeBrandSchema } from "@oalo/contracts";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
  type DatabasePool,
} from "@oalo/db";
import { z, ZodError } from "zod";
import {
  emptyWorkspacePreferences,
  MessageSchema,
  PartnersSchema,
  PreferenceKeySchema,
  WorkspacePreferenceCommandSchema,
  versioned,
  type PreferenceKey,
  type WorkspacePreferenceCommand,
  type WorkspacePreferences,
} from "../features/workspace/model.js";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
} from "./authenticated-principal.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import { HOME_REPORT_HEADERS, HomeownerError, readBoundedJson } from "./homeowners/errors.js";

const RowSchema = z.object({ key: z.string(), value: z.unknown() });
const readContract = defineSqlContract({
  name: "workspace-preferences.read",
  access: "read",
  text: "select key,value from platform.user_preferences where location_id=$1::uuid and user_id=$2::uuid and key=any(string_to_array($3,','))",
  decode: (row) => RowSchema.parse(row),
});
const lockContract = defineSqlContract({
  name: "workspace-preferences.lock",
  access: "write",
  text: "select pg_advisory_xact_lock(hashtextextended($1,0)) as locked",
  decode: () => ({ locked: true }),
});
const writeContract = defineSqlContract({
  name: "workspace-preferences.write",
  access: "write",
  text: "insert into platform.user_preferences(location_id,user_id,key,value) values($1::uuid,$2::uuid,$3,$4::text::jsonb) on conflict(location_id,user_id,key) do update set value=excluded.value,updated_at=now() returning key",
  decode: (row) => z.object({ key: z.string() }).parse(row),
});
const storedKey = (key: PreferenceKey) => `workspace.${key}.v1`;
const keys = PreferenceKeySchema.options.map(storedKey).join(",");
const authority = (principal: Readonly<AuthenticatedPrincipal>) =>
  createPrincipalBoundTenantContextAuthority(
    principal,
    workspaceCorrelationReferenceFor(principal),
  );
export class WorkspacePreferenceError extends Error {
  constructor(
    public readonly code:
      | "WORKSPACE_ACCESS_DENIED"
      | "WORKSPACE_WRITE_CONFLICT"
      | "WORKSPACE_PREFERENCE_TOO_LARGE"
      | "WORKSPACE_PREFERENCES_UNAVAILABLE",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "WorkspacePreferenceError";
  }
}
export const canEditWorkspacePreferences = (principal: Readonly<AuthenticatedPrincipal>) =>
  principal.role === "location_admin" || principal.role === "campaign_creator";
function assertReader(principal: Readonly<AuthenticatedPrincipal>) {
  if (principal.role === "platform_support")
    throw new WorkspacePreferenceError(
      "WORKSPACE_ACCESS_DENIED",
      403,
      "This account cannot open personal workspace settings.",
    );
}
function parseRow(key: PreferenceKey, value: unknown) {
  return key === "brand"
    ? parseStoredPreference(versioned(HomeBrandSchema), value)
    : key === "partners"
      ? parseStoredPreference(versioned(PartnersSchema), value)
      : parseStoredPreference(versioned(MessageSchema), value);
}
function parseStoredPreference<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new WorkspacePreferenceError(
      "WORKSPACE_PREFERENCES_UNAVAILABLE",
      503,
      "Some saved settings could not be read. They have not been replaced. Ask your workspace owner to review the saved record.",
    );
  return parsed.data;
}

export async function readWorkspacePreferences(
  principal: Readonly<AuthenticatedPrincipal>,
  pool: DatabasePool,
): Promise<WorkspacePreferences> {
  assertReader(principal);
  const rows = await withTenantTransaction(pool, authority(principal), (tx) =>
    tx.read(readContract, [principal.locationId, principal.actorId, keys]),
  );
  return projectPreferences(rows);
}
function projectPreferences(rows: readonly z.infer<typeof RowSchema>[]): WorkspacePreferences {
  const result = emptyWorkspacePreferences();
  for (const row of rows) {
    const key = PreferenceKeySchema.parse(row.key.slice("workspace.".length, -".v1".length));
    if (key === "brand")
      result.brand = parseStoredPreference(versioned(HomeBrandSchema), row.value);
    else if (key === "partners")
      result.partners = parseStoredPreference(versioned(PartnersSchema), row.value);
    else result.messages[key] = parseStoredPreference(versioned(MessageSchema), row.value);
  }
  return result;
}
export async function saveWorkspacePreference(
  principal: Readonly<AuthenticatedPrincipal>,
  raw: WorkspacePreferenceCommand,
  pool: DatabasePool,
): Promise<WorkspacePreferences> {
  assertReader(principal);
  if (!canEditWorkspacePreferences(principal))
    throw new WorkspacePreferenceError(
      "WORKSPACE_ACCESS_DENIED",
      403,
      "Your role can read these settings but cannot change them.",
    );
  const command = WorkspacePreferenceCommandSchema.parse(raw);
  const next = { revision: randomUUID(), value: command.value };
  if (Buffer.byteLength(JSON.stringify(next), "utf8") > 14000)
    throw new WorkspacePreferenceError(
      "WORKSPACE_PREFERENCE_TOO_LARGE",
      413,
      "These details are too long to save. Shorten the text or remove unused partner entries.",
    );
  return withTenantTransaction(pool, authority(principal), async (tx) => {
    const key = storedKey(command.key);
    await tx.write(lockContract, [`${principal.locationId}:${principal.actorId}:${key}`]);
    const row = (await tx.read(readContract, [principal.locationId, principal.actorId, key]))[0];
    const current = row ? parseRow(command.key, row.value) : null;
    // An exact retry is already saved. A different stale write must not overwrite another tab.
    if (current && JSON.stringify(current.value) === JSON.stringify(command.value))
      return projectPreferences(
        await tx.read(readContract, [principal.locationId, principal.actorId, keys]),
      );
    if ((current?.revision ?? null) !== command.expectedRevision)
      throw new WorkspacePreferenceError(
        "WORKSPACE_WRITE_CONFLICT",
        409,
        "Another tab saved newer changes. Your edits are still here. Load the latest saved details before trying again.",
      );
    await tx.write(writeContract, [
      principal.locationId,
      principal.actorId,
      key,
      JSON.stringify(next),
    ]);
    // Return the revision actually committed by this request. A second tab cannot
    // slip another revision into this response between a write and a later read.
    return projectPreferences(
      await tx.read(readContract, [principal.locationId, principal.actorId, keys]),
    );
  });
}
export async function workspacePrincipal(
  request: Request,
  environment: unknown = process.env,
  mutation = false,
) {
  if (authenticatedWorkspaceMode(environment) !== "review")
    throw new WorkspacePreferenceError(
      "WORKSPACE_PREFERENCES_UNAVAILABLE",
      404,
      "Sign in to open your saved workspace settings.",
    );
  const principal = await (
    mutation ? resolveAuthenticatedPrincipal : resolveAuthenticatedReadPrincipal
  )(request, environment, resolveRuntimeCampaignCommandPorts(environment));
  assertReader(principal);
  return principal;
}
export async function handleWorkspacePreferences(
  request: Request,
  environment: unknown = process.env,
): Promise<Response> {
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: HOME_REPORT_HEADERS });
  try {
    const principal = await workspacePrincipal(request, environment, request.method !== "GET");
    const pool = campaignDatabasePool(environment);
    if (request.method === "POST") {
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
        return json(
          { error: "WORKSPACE_PREFERENCE_INVALID", message: "Use a valid settings request." },
          415,
        );
      const command = WorkspacePreferenceCommandSchema.parse(await readBoundedJson(request, 40000));
      return json({ preferences: await saveWorkspacePreference(principal, command, pool) });
    } else if (request.method !== "GET")
      return json({ message: "This request method is not supported." }, 405);
    return json({ preferences: await readWorkspacePreferences(principal, pool) });
  } catch (error) {
    if (error instanceof WorkspacePreferenceError || error instanceof HomeownerError)
      return json({ error: error.code, message: error.message }, error.status);
    if (error instanceof ZodError)
      return json(
        {
          error: "WORKSPACE_PREFERENCE_INVALID",
          message: "Check the required fields and try again.",
        },
        400,
      );
    const auth = campaignCommandAuthErrorResponse(error);
    if (auth)
      return json(
        {
          error: "WORKSPACE_ACCESS_DENIED",
          message: "Sign in to the account that owns these settings.",
        },
        auth.status,
      );
    return json(
      {
        error: "WORKSPACE_PREFERENCES_UNAVAILABLE",
        message:
          "Your settings could not be confirmed. Your edits have not been replaced. Check the saved details before trying again.",
      },
      503,
    );
  }
}
