import { createHash, randomBytes } from "node:crypto";
import type { AuthenticatedPrincipal } from "@oalo/application";
import { PostgresHomeownerRepository, createPrincipalBoundTenantContextAuthority } from "@oalo/db";
import { z } from "zod";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
} from "../authenticated-principal.js";
import { authenticatedWorkspaceMode } from "../authenticated-workspace-data.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "../campaign-persistence-runtime.js";
import { resolveRuntimeCampaignCommandPorts } from "../runtime-authentication.js";
import { HomeownerError } from "./errors.js";
import { createHomeHighLevelPort, HomeGhlConnectionSchema } from "./highlevel.js";
import { createRentCastValuationPort } from "./rentcast.js";

export const HomeEnvironmentSchema = z
  .object({
    OALO_HOMEOWNER_REPORTS: z.string().optional(),
    OALO_HOMEOWNER_LIVE_DATA: z.string().optional(),
    OALO_HOMEOWNER_ALLOWED_LOCATION_IDS: z
      .string()
      .max(8000)
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.uuid()).max(200)),
    OALO_RENTCAST_API_KEY: z.string().optional(),
    OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT: z.coerce.number().int().min(0).max(10000).default(0),
    OALO_HOMEOWNER_GHL_CONNECTIONS_JSON: z.string().optional(),
    OALO_HOMEOWNER_CRON_SECRET: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    OALO_HOMEOWNER_DELIVERY_ENABLED: z.string().optional(),
    OALO_APP_URL: z.string().optional(),
  })
  .passthrough();
export type HomeEnvironment = z.infer<typeof HomeEnvironmentSchema>;
/**
 * Whether homeowner reports are switched on, read without validating any other homeowner setting.
 *
 * The public report routes answer anyone and need only this one answer. Reading it through the full
 * schema meant one mistyped operator setting, such as an entry in the paid-lookup allowlist, made every
 * shared link fail, and the failure named the setting to whoever asked (independent review, M-2).
 */
export function homeReportsEnabled(environment: unknown): boolean {
  const parsed = z.object({ OALO_HOMEOWNER_REPORTS: z.string().optional() }).safeParse(environment);
  return parsed.success && parsed.data.OALO_HOMEOWNER_REPORTS === "enabled";
}
export const homeHash = (value: string) => createHash("sha256").update(value).digest("hex");
export const homeSecret = () => randomBytes(32).toString("hex");
export function canWriteHomeReports(principal: Readonly<AuthenticatedPrincipal>): boolean {
  return principal.role === "location_admin" || principal.role === "campaign_creator";
}

export async function homeRuntime(
  request: Request,
  mutation = false,
  environment: unknown = process.env,
) {
  // The unauthenticated demo never obtains database, contact, or valuation capabilities.
  if (authenticatedWorkspaceMode(environment) !== "review")
    throw new HomeownerError("SIGN_IN_REQUIRED", 401, "Sign in to use live homeowner reports.");
  const ports = resolveRuntimeCampaignCommandPorts(environment);
  const principal = await (
    mutation ? resolveAuthenticatedPrincipal : resolveAuthenticatedReadPrincipal
  )(request, environment, ports);
  if (principal.role === "platform_support" || (mutation && !canWriteHomeReports(principal)))
    throw new HomeownerError(
      "REPORT_ACCESS_DENIED",
      403,
      "Your role cannot perform this report action. Ask your workspace owner.",
    );
  const config = HomeEnvironmentSchema.parse(environment);
  if (config.OALO_HOMEOWNER_REPORTS !== "enabled")
    throw new HomeownerError(
      "REPORTS_NOT_CONFIGURED",
      503,
      "Homeowner reports need to be enabled for this workspace.",
    );
  const pool = campaignDatabasePool(environment);
  const authority = createPrincipalBoundTenantContextAuthority(
    principal,
    workspaceCorrelationReferenceFor(principal),
  );
  const repository = new PostgresHomeownerRepository(pool, authority);
  return {
    principal,
    config,
    pool,
    repository,
    ...(await homeConnectionsFor(principal.locationId, repository, config)),
  };
}

export async function homeConnectionsFor(
  locationId: string,
  repository: Pick<PostgresHomeownerRepository, "ghlLocation">,
  config: HomeEnvironment,
) {
  let connection: null | z.infer<typeof HomeGhlConnectionSchema> = null;
  let connectionIssue: string | null = null;
  if (config.OALO_HOMEOWNER_GHL_CONNECTIONS_JSON) {
    let raw: unknown;
    try {
      raw = JSON.parse(config.OALO_HOMEOWNER_GHL_CONNECTIONS_JSON);
    } catch {
      connectionIssue =
        "HighLevel connection settings need attention. Property valuations remain available.";
    }
    const bindings = z.record(z.uuid(), HomeGhlConnectionSchema).safeParse(raw);
    if (!bindings.success)
      connectionIssue =
        "HighLevel connection settings need attention. Property valuations remain available.";
    else {
      const bound = bindings.data[locationId];
      if (bound) {
        const ghlLocation = await repository.ghlLocation();
        if (bound.ghlLocationId === ghlLocation) connection = bound;
        else
          connectionIssue =
            "The HighLevel location does not match this workspace. Property valuations remain available.";
      }
    }
  }
  // A public sign-up must not acquire paid provider access merely by creating a
  // new workspace. Each live location is explicitly enabled by the operator.
  const live =
    config.OALO_HOMEOWNER_LIVE_DATA === "enabled" &&
    config.OALO_HOMEOWNER_ALLOWED_LOCATION_IDS.includes(locationId);
  return {
    connectionIssue,
    contacts: live && connection ? createHomeHighLevelPort(connection) : null,
    valuation:
      live && config.OALO_RENTCAST_API_KEY
        ? createRentCastValuationPort(config.OALO_RENTCAST_API_KEY)
        : null,
  };
}
/**
 * The web address every report link starts with, from the deployment's own settings.
 *
 * Both refusals below say the same thing to the person who asked for the link: it cannot be made
 * yet, and support can fix it. Neither tells a loan officer to set anything. The address is a
 * deployment setting that whoever runs the product controls, and an instruction the reader has no
 * control to follow is not a next step (PRD-008c, 008C-AC-003).
 */
export function reportOrigin(config: HomeEnvironment): string {
  const parsed = z.url().safeParse(config.OALO_APP_URL);
  if (!parsed.success)
    throw new HomeownerError(
      "REPORT_URL_NOT_CONFIGURED",
      503,
      "We can't create a report link yet because its web address isn't set up. Contact support so we can finish the setup.",
    );
  const url = new URL(parsed.data);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new HomeownerError(
      "REPORT_URL_NOT_CONFIGURED",
      503,
      "We can't create a report link yet because its web address isn't set up correctly. Contact support so we can fix it.",
    );
  return url.origin;
}
