import { timingSafeEqual } from "node:crypto";
import {
  claimDueHomeProperties,
  PostgresHomeownerRepository,
  type TenantContextAuthority,
} from "@oalo/db";
import { nextMonthlyRefresh } from "@oalo/application/homeowner-reports";
import type { HomeMortgage, HomeProperty } from "@oalo/contracts";
import { authenticatedWorkspaceMode } from "../authenticated-workspace-data.js";
import { campaignDatabasePool } from "../campaign-persistence-runtime.js";
import { HomeownerError } from "./errors.js";
import { homeError, homeJson } from "./http.js";
import {
  homeConnectionsFor,
  HomeEnvironmentSchema,
  homeHash,
  type HomeEnvironment,
} from "./runtime.js";
import { generateHomeReport, handoffHomeReport } from "./service.js";

export function scheduledRequestId(propertyId: string, dueAt: string): string {
  const hex = homeHash(`homeowner-monthly:${propertyId}:${dueAt}`);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function scheduledMortgage(mortgage: HomeMortgage, now: Date): HomeMortgage {
  if (mortgage.source !== "unknown" && now.getTime() - Date.parse(mortgage.asOf) > 35 * 86_400_000)
    return {
      source: "unknown",
      firstBalanceMinor: null,
      otherBalanceMinor: null,
      allLiensConfirmed: false,
      asOf: now.toISOString().slice(0, 10),
      loan: null,
    };
  return mortgage;
}
export function authorizedHomeCron(request: Request, config: HomeEnvironment): boolean {
  const secret = config.OALO_HOMEOWNER_CRON_SECRET ?? config.CRON_SECRET;
  const supplied = request.headers.get("authorization");
  if (!secret || secret.length < 32 || secret.length > 512 || !supplied || supplied.length > 600)
    return false;
  const actual = Buffer.from(supplied),
    expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function refreshScheduledProperty(
  property: HomeProperty,
  repository: PostgresHomeownerRepository,
  locationId: string,
  config: HomeEnvironment,
  now: Date,
): Promise<"updated" | "paused"> {
  const due = property.enrollment.nextRefreshAt;
  const prior = property.reports[0];
  if (!due || !prior) return "paused";
  try {
    const connections = await homeConnectionsFor(locationId, repository, config);
    const propertyOnly = prior.input.association === "property_only";
    if (!connections.valuation || (!propertyOnly && !connections.contacts))
      throw new HomeownerError(
        "CONNECTION_REQUIRED",
        503,
        "Monthly report connections are unavailable.",
      );
    const contact = propertyOnly ? null : await connections.contacts!.get(property.contactId);
    if (!propertyOnly && !contact?.communicationAllowed)
      throw new HomeownerError(
        "CONTACT_COMMUNICATION_BLOCKED",
        409,
        "Monthly reports are paused while communication permission is unconfirmed.",
      );
    const report = await generateHomeReport(
      {
        ...prior.input,
        propertyId: property.id,
        requestId: scheduledRequestId(property.id, due),
        mortgage: scheduledMortgage(prior.input.mortgage, now),
      },
      {
        repository,
        ...connections,
        locationId,
        monthlyLimit: config.OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT,
        now: () => now,
      },
      { refresh: true },
    );
    const latest = (await repository.list()).find((item) => item.id === property.id);
    if (
      latest?.enrollment.cadence === "monthly" &&
      !latest.enrollment.paused &&
      latest.enrollment.deliverUpdates &&
      !propertyOnly
    )
      await handoffHomeReport(repository, connections.contacts, report.id, config);
    await repository.advanceSchedule(
      property.id,
      due,
      nextMonthlyRefresh(now, new Date(due).getUTCDate()),
      null,
    );
    return "updated";
  } catch (error) {
    await repository.advanceSchedule(
      property.id,
      due,
      null,
      error instanceof HomeownerError ? error.code : "SCHEDULE_NEEDS_REVIEW",
    );
    return "paused";
  }
}

export async function handleHomeSchedule(
  request: Request,
  environment: unknown = process.env,
): Promise<Response> {
  try {
    const config = HomeEnvironmentSchema.parse(environment);
    if (!authorizedHomeCron(request, config)) return homeJson({ error: "UNAUTHORIZED" }, 401);
    if (
      config.OALO_HOMEOWNER_REPORTS !== "enabled" ||
      config.OALO_HOMEOWNER_LIVE_DATA !== "enabled" ||
      authenticatedWorkspaceMode(environment) !== "review"
    )
      return homeJson({ enabled: false, updated: 0, paused: 0 });
    const pool = campaignDatabasePool(environment);
    const started = Date.now();
    let updated = 0,
      paused = 0,
      claimed = 0;
    // A daily, bounded drain works on all hosting tiers; an authorized scheduler can call it more often.
    while (claimed < 200 && Date.now() - started < 180_000) {
      const batch = await claimDueHomeProperties(pool);
      if (!batch.length) break;
      claimed += batch.length;
      const results = await Promise.all(
        batch.map(async (item) => {
          const authority: TenantContextAuthority = {
            async resolveTenantDatabaseContext() {
              return {
                locationId: item.locationId,
                actorId: item.actorId,
                correlationId: `home_schedule_${homeHash(`${item.locationId}:${item.propertyId}`).slice(0, 32)}`,
              };
            },
          };
          const repository = new PostgresHomeownerRepository(pool, authority);
          const property = (await repository.list()).find(
            (candidate) => candidate.id === item.propertyId,
          );
          if (
            !property ||
            property.enrollment.paused ||
            property.enrollment.cadence !== "monthly" ||
            !property.enrollment.nextRefreshAt ||
            Date.parse(property.enrollment.nextRefreshAt) > Date.now()
          )
            return "paused";
          return refreshScheduledProperty(
            property,
            repository,
            item.locationId,
            config,
            new Date(),
          );
        }),
      );
      updated += results.filter((result) => result === "updated").length;
      paused += results.filter((result) => result === "paused").length;
    }
    return homeJson({ enabled: true, claimed, updated, paused });
  } catch (error) {
    return homeError(error);
  }
}
