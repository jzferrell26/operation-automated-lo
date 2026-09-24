import { buildHomeReport, homeReportFreshness } from "@oalo/application";
import { HomeReportInputSchema, type HomeReport, type HomeReportInput } from "@oalo/contracts";
import type { PostgresHomeownerRepository } from "@oalo/db";
import { HomeownerError } from "./errors.js";
import type { HomeContactPort } from "./highlevel.js";
import { canonicalAddress, type HomeValuationPort } from "./rentcast.js";
import { homeHash, homeSecret, reportOrigin, type HomeEnvironment } from "./runtime.js";

export interface GenerateHomeDependencies {
  repository: Pick<PostgresHomeownerRepository, "reserve" | "complete" | "fail">;
  contacts: HomeContactPort | null;
  valuation: HomeValuationPort | null;
  locationId: string;
  monthlyLimit: number;
  now?: () => Date;
}

export async function generateHomeReport(
  raw: HomeReportInput,
  deps: GenerateHomeDependencies,
  options: { refresh?: boolean; reuseReportId?: string } = {},
): Promise<HomeReport> {
  const input = HomeReportInputSchema.parse(raw);
  const now = (deps.now ?? (() => new Date()))();
  if (input.mortgage.asOf > now.toISOString().slice(0, 10))
    throw new HomeownerError(
      "FUTURE_BALANCE_DATE",
      400,
      "The mortgage balance date cannot be in the future.",
    );
  const propertyOnly = input.association === "property_only";
  if (propertyOnly && input.contactId !== "property-only")
    throw new HomeownerError(
      "INVALID_REPORT_DETAILS",
      400,
      "A property valuation cannot use an unverified homeowner contact.",
    );
  if (!propertyOnly && !deps.contacts)
    throw new HomeownerError(
      "CONTACT_CONNECTION_REQUIRED",
      503,
      "Connect this workspace to HighLevel before creating a live report.",
    );
  if (!deps.valuation && !options.reuseReportId)
    throw new HomeownerError(
      "VALUATION_NOT_CONFIGURED",
      503,
      "Connect the valuation service before creating a live report.",
    );
  const contact = propertyOnly
    ? { id: "property-only", name: "Property valuation" }
    : await deps.contacts!.get(input.contactId);
  if (contact.id !== input.contactId)
    throw new HomeownerError(
      "CONTACT_NOT_ACCESSIBLE",
      404,
      "The selected contact could not be verified.",
    );
  const addressHash = homeHash(canonicalAddress(input.address));
  const propertyId =
    input.propertyId ??
    `home_${homeHash(`${deps.locationId}:${input.contactId}:${addressHash}`).slice(0, 32)}`;
  const requestHash = homeHash(
    JSON.stringify({
      input,
      refresh: options.refresh ?? false,
      reuseReportId: options.reuseReportId ?? null,
    }),
  );
  const reservation = await deps.repository.reserve({
    input,
    propertyId,
    requestHash,
    addressHash,
    monthlyLimit: deps.monthlyLimit,
    refresh: options.refresh ?? false,
    ...(options.reuseReportId ? { reuseReportId: options.reuseReportId } : {}),
  });
  if (reservation.kind === "existing") {
    if (reservation.report) return reservation.report;
    throw new HomeownerError(
      "LOOKUP_ALREADY_ATTEMPTED",
      409,
      reservation.status === "pending"
        ? "This report lookup is already in progress. Refresh the report list to check its result."
        : "This lookup was already attempted and will not be repeated. Start a new lookup only after reviewing its status.",
    );
  }
  try {
    const valuation = reservation.cached ?? (await deps.valuation!.estimate(input.address));
    if (valuation.source !== "rentcast")
      throw new HomeownerError(
        "INVALID_VALUATION_SOURCE",
        502,
        "A live report requires a verified valuation source.",
      );
    const report = buildHomeReport(
      { ...input, contactName: contact.name },
      valuation,
      `hreport_${homeHash(`${deps.locationId}:${input.requestId}`).slice(0, 32)}`,
      propertyId,
      now,
    );
    await deps.repository.complete(report);
    return report;
  } catch (error) {
    const code = error instanceof HomeownerError ? error.code : "REPORT_SAVE_UNCERTAIN";
    await deps.repository.fail(input.requestId, propertyId, code, code.includes("UNCERTAIN"));
    if (error instanceof HomeownerError) throw error;
    throw new HomeownerError(
      "REPORT_SAVE_UNCERTAIN",
      502,
      "The report could not be saved. The valuation request will not be repeated automatically.",
    );
  }
}

export async function shareHomeReport(
  repository: Pick<PostgresHomeownerRepository, "getReport" | "createShare">,
  id: string,
  config: HomeEnvironment,
  now = new Date(),
): Promise<{ url: string; expiresAt: string; shareId: string }> {
  const report = await repository.getReport(id);
  if (!report) throw new HomeownerError("NOT_FOUND", 404, "This report is not available.");
  const freshness = homeReportFreshness(report, now);
  if (freshness.valuationStale || freshness.mortgageStale)
    throw new HomeownerError(
      "REPORT_STALE",
      409,
      "Refresh the value and confirm current loan balances before sharing this report.",
    );
  const origin = reportOrigin(config);
  const secret = homeSecret();
  const expiresAt = new Date(
    Math.min(
      now.getTime() + 30 * 86_400_000,
      Date.parse(report.valuation.retrievedAt) + 35 * 86_400_000,
      report.input.mortgage.source === "unknown"
        ? Number.POSITIVE_INFINITY
        : Date.parse(report.input.mortgage.asOf) + 35 * 86_400_000,
    ),
  ).toISOString();
  if (Date.parse(expiresAt) <= now.getTime())
    throw new HomeownerError(
      "REPORT_STALE",
      409,
      "Confirm current source dates before sharing this report.",
    );
  const shareId = await repository.createShare(id, homeHash(secret), expiresAt);
  return { url: `${origin}/home-report/${secret}`, expiresAt, shareId };
}

export async function handoffHomeReport(
  repository: PostgresHomeownerRepository,
  contacts: HomeContactPort | null,
  id: string,
  config: HomeEnvironment,
): Promise<void> {
  if (!contacts || config.OALO_HOMEOWNER_DELIVERY_ENABLED !== "enabled")
    throw new HomeownerError(
      "DELIVERY_NOT_CONFIGURED",
      503,
      "The HighLevel report-delivery workflow is not enabled yet.",
    );
  const report = await repository.getReport(id);
  if (!report) throw new HomeownerError("NOT_FOUND", 404, "This report is not available.");
  if (report.input.association === "property_only")
    throw new HomeownerError(
      "CONTACT_CONNECTION_REQUIRED",
      409,
      "Create a homeowner report with a verified HighLevel contact before requesting a workflow handoff.",
    );
  const contact = await contacts.get(report.input.contactId);
  if (!contact.communicationAllowed)
    throw new HomeownerError(
      "CONTACT_COMMUNICATION_BLOCKED",
      409,
      "Review this contact's communication permissions in HighLevel before delivery.",
    );
  const freshness = homeReportFreshness(report);
  if (freshness.valuationStale || freshness.mortgageStale)
    throw new HomeownerError(
      "REPORT_STALE",
      409,
      "Update the value and mortgage information before delivery.",
    );
  if (!(await repository.reserveDelivery(id)))
    throw new HomeownerError(
      "DELIVERY_ALREADY_ATTEMPTED",
      409,
      "A handoff was already attempted for this report. Check its status in HighLevel; it will not be sent again automatically.",
    );
  let shareId: string | null = null;
  try {
    const share = await shareHomeReport(repository, id, config);
    shareId = share.shareId;
    await contacts.handoff(report.input.contactId, share.url);
    await repository.finishDelivery(id, "sent", null, shareId);
  } catch (error) {
    const code = error instanceof HomeownerError ? error.code : "HANDOFF_UNCERTAIN";
    await repository.finishDelivery(id, shareId ? "uncertain" : "blocked", code, shareId);
    throw error;
  }
}
