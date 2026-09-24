import { randomUUID } from "node:crypto";
import {
  HomeBrandSchema,
  HomeMortgageSchema,
  HomePropertyIdSchema,
  HomeReportIdSchema,
  HomeReportInputSchema,
} from "@oalo/contracts";
import { HomeownerStoreError, recordSharedHomeEvent, readSharedHomeReport } from "@oalo/db";
import { nextMonthlyRefresh } from "@oalo/application/homeowner-reports";
import { z } from "zod";
import { campaignCommandAuthErrorResponse } from "../campaign-command-http.js";
import { campaignDatabasePool } from "../campaign-persistence-runtime.js";
import { HOME_REPORT_HEADERS, HomeownerError, readBoundedJson } from "./errors.js";
import { canWriteHomeReports, homeHash, homeRuntime, HomeEnvironmentSchema } from "./runtime.js";
import { generateHomeReport, handoffHomeReport, shareHomeReport } from "./service.js";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), input: HomeReportInputSchema }).strict(),
  z
    .object({
      action: z.literal("revise"),
      reportId: HomeReportIdSchema,
      requestId: z.uuid(),
      mortgage: HomeMortgageSchema,
      brand: HomeBrandSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("refresh"),
      propertyId: HomePropertyIdSchema,
      requestId: z.uuid(),
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("enrollment"),
      propertyId: HomePropertyIdSchema,
      cadence: z.enum(["off", "monthly"]),
      paused: z.boolean(),
      deliverUpdates: z.boolean(),
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("share"),
      reportId: HomeReportIdSchema,
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("deliver"),
      reportId: HomeReportIdSchema,
      confirmed: z.literal(true),
    })
    .strict(),
  z.object({ action: z.literal("revoke"), propertyId: HomePropertyIdSchema }).strict(),
  z.object({ action: z.literal("resolve-review"), propertyId: HomePropertyIdSchema }).strict(),
  z
    .object({
      action: z.literal("recover-lookup"),
      propertyId: HomePropertyIdSchema,
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("resolve-delivery"),
      reportId: HomeReportIdSchema,
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("delete"),
      propertyId: HomePropertyIdSchema,
      confirmed: z.literal(true),
    })
    .strict(),
]);
export function homeJson(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: HOME_REPORT_HEADERS });
}
export function homeError(error: unknown): Response {
  if (error instanceof HomeownerError)
    return homeJson({ error: error.code, message: error.message }, error.status);
  if (error instanceof HomeownerStoreError) {
    const messages: Record<string, string> = {
      LOOKUP_LIMIT:
        "Your monthly valuation allowance has been reached. Existing reports are still available.",
      PROPERTY_LIMIT: "This workspace has reached its tracked-property limit.",
      LOOKUP_STILL_ACTIVE:
        "This lookup may still be running. Wait at least five minutes before closing it.",
      LOOKUP_ALREADY_ATTEMPTED:
        "This request was already attempted. Start a new request only after reviewing the lookup status.",
      DELIVERY_STILL_ACTIVE:
        "The HighLevel handoff may still be running. Wait at least five minutes and check HighLevel before clearing its hold.",
      LOOKUP_PENDING:
        "A lookup is already in progress for this property. Check its status before starting another.",
      IDEMPOTENCY_CONFLICT:
        "This saved request was already used with different details. Start a new report request.",
      PROPERTY_CONFLICT:
        "The property or contact differs from the saved record. Start a separate property report.",
      NOT_FOUND: "This report or property is not available in your workspace.",
    };
    return homeJson(
      {
        error: error.code,
        message: messages[error.code] ?? "The report could not be saved. Please try again.",
      },
      error.code === "NOT_FOUND" ? 404 : 409,
    );
  }
  if (error instanceof z.ZodError)
    return homeJson(
      {
        error: "INVALID_REPORT_DETAILS",
        message: "Check the required report fields and their values.",
        fields: error.issues.map((issue) => issue.path.join(".")),
      },
      400,
    );
  const auth = campaignCommandAuthErrorResponse(error);
  if (auth)
    return homeJson(
      {
        error: "REPORT_ACCESS_UNAVAILABLE",
        message: "Sign in with an account that has access to this workspace.",
      },
      auth.status,
    );
  // Do not return SQL, addresses, credentials, or external response bodies.
  return homeJson(
    {
      error: "REPORTS_UNAVAILABLE",
      message:
        "Homeowner reports are unavailable right now. Your existing data has not been replaced.",
    },
    503,
  );
}
async function body(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw new HomeownerError("JSON_REQUIRED", 415, "This action requires a valid report request.");
  return readBoundedJson(request);
}
export async function handleHomeWorkspace(
  request: Request,
  environment: unknown = process.env,
): Promise<Response> {
  try {
    const runtime = await homeRuntime(request, request.method !== "GET", environment);
    const { repository, config, contacts, valuation, principal } = runtime;
    if (request.method === "GET")
      return homeJson({
        mode: "live",
        canWrite: canWriteHomeReports(principal),
        valuationConnected: valuation !== null,
        ghlConnected: contacts !== null,
        deliveryEnabled: config.OALO_HOMEOWNER_DELIVERY_ENABLED === "enabled",
        monthlyLookupLimit: config.OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT,
        lookupsThisMonth: await repository.usage(),
        properties: await repository.list(),
      });
    const action = ActionSchema.parse(await body(request));
    const dependencies = {
      repository,
      contacts,
      valuation,
      locationId: principal.locationId,
      monthlyLimit: config.OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT,
    };
    if (action.action === "create")
      return homeJson({ report: await generateHomeReport(action.input, dependencies) });
    if (action.action === "revise") {
      const prior = await repository.getReport(action.reportId);
      if (!prior) throw new HomeownerError("NOT_FOUND", 404, "This report is not available.");
      return homeJson({
        report: await generateHomeReport(
          {
            ...prior.input,
            propertyId: prior.propertyId,
            requestId: action.requestId,
            mortgage: action.mortgage,
            brand: action.brand,
          },
          dependencies,
          { reuseReportId: prior.id },
        ),
      });
    }
    if (action.action === "refresh") {
      const property = (await repository.list()).find((item) => item.id === action.propertyId);
      const prior = property?.reports[0];
      if (!prior)
        throw new HomeownerError(
          "NOT_FOUND",
          404,
          "Create the first report before refreshing this property.",
        );
      return homeJson({
        report: await generateHomeReport(
          { ...prior.input, propertyId: prior.propertyId, requestId: action.requestId },
          dependencies,
          { refresh: true },
        ),
      });
    }
    if (action.action === "share")
      return homeJson(await shareHomeReport(repository, action.reportId, config));
    if (action.action === "deliver") {
      await handoffHomeReport(repository, contacts, action.reportId, config);
      return homeJson({
        message:
          "The report was handed to your HighLevel workflow. Check HighLevel for delivery status.",
      });
    }
    if (action.action === "enrollment") {
      // Only a new explicit enrollment can resume a paused monthly refresh.
      const property = (await repository.list()).find((item) => item.id === action.propertyId);
      if (!property?.reports[0])
        throw new HomeownerError(
          "NOT_FOUND",
          404,
          "Create a report before changing its update schedule.",
        );
      if (
        action.cadence === "monthly" &&
        !action.paused &&
        (!valuation || (property.reports[0].input.association !== "property_only" && !contacts))
      )
        throw new HomeownerError(
          "CONNECTION_REQUIRED",
          409,
          "Connect valuation data before enabling monthly updates. Homeowner reports also need their HighLevel connection.",
        );
      if (action.deliverUpdates && action.cadence === "monthly" && !action.paused) {
        if (property.reports[0].input.association === "property_only")
          throw new HomeownerError(
            "CONTACT_CONNECTION_REQUIRED",
            409,
            "Property-only valuations cannot be delivered to a HighLevel workflow. Create a report for a verified homeowner contact first.",
          );
        if (config.OALO_HOMEOWNER_DELIVERY_ENABLED !== "enabled")
          throw new HomeownerError(
            "DELIVERY_NOT_CONFIGURED",
            409,
            "Enable the HighLevel delivery connection before scheduling report delivery.",
          );
        if (!contacts || (await contacts.get(property.contactId)).communicationAllowed !== true)
          throw new HomeownerError(
            "CONTACT_COMMUNICATION_BLOCKED",
            409,
            "Confirm communication permissions in HighLevel before scheduling delivery.",
          );
      }
      await repository.enrollment(action.propertyId, {
        cadence: action.cadence,
        paused: action.paused,
        deliverUpdates: action.deliverUpdates,
        nextRefreshAt:
          action.cadence === "monthly" && !action.paused ? nextMonthlyRefresh(new Date()) : null,
      });
      return homeJson({
        message:
          action.cadence === "monthly" && !action.paused
            ? "Monthly update preferences saved."
            : "Automatic report updates are paused.",
      });
    }
    if (action.action === "revoke") await repository.revokeShares(action.propertyId);
    if (action.action === "recover-lookup") {
      const count = await repository.closeInterruptedLookup(action.propertyId);
      return homeJson({
        message: count
          ? "The unfinished lookup was closed as uncertain. No new valuation was requested. A new lookup requires your confirmation."
          : "No unfinished lookup needs to be closed.",
      });
    }
    if (action.action === "resolve-delivery") {
      await repository.acknowledgeDeliveryHold(action.reportId);
      return homeJson({
        message:
          "Your delivery review was recorded. This report will not be resent; a later handoff requires a new report and explicit confirmation.",
      });
    }
    if (action.action === "resolve-review") await repository.resolveReview(action.propertyId);
    if (action.action === "delete") await repository.remove(action.propertyId);
    return homeJson({
      message:
        action.action === "revoke"
          ? "All share links for this property were revoked."
          : action.action === "delete"
            ? "The property, report history and share links were removed."
            : "The review request was marked complete.",
    });
  } catch (error) {
    return homeError(error);
  }
}
export async function handleHomeContactSearch(request: Request): Promise<Response> {
  try {
    const runtime = await homeRuntime(request, true);
    const query = z
      .object({ query: z.string().trim().min(2).max(100) })
      .strict()
      .parse(await body(request));
    if (!runtime.contacts)
      throw new HomeownerError(
        "CONTACT_CONNECTION_REQUIRED",
        503,
        "Connect HighLevel to search existing contacts.",
      );
    return homeJson({ contacts: await runtime.contacts.search(query.query) });
  } catch (error) {
    return homeError(error);
  }
}
export async function handleHomeReportDetail(request: Request, id: string): Promise<Response> {
  try {
    HomeReportIdSchema.parse(id);
    const { repository } = await homeRuntime(request);
    const report = await repository.getReport(id);
    if (!report) throw new HomeownerError("NOT_FOUND", 404, "This report is not available.");
    return homeJson({
      report,
      shares: await repository.shares(id),
      delivery: await repository.delivery(id),
    });
  } catch (error) {
    return homeError(error);
  }
}
export async function handleSharedHomeReport(
  request: Request,
  secret: string,
  environment: unknown = process.env,
): Promise<Response> {
  try {
    if (!/^[a-f0-9]{64}$/u.test(secret))
      return homeJson({ message: "This report link is unavailable or expired." }, 404);
    if (HomeEnvironmentSchema.parse(environment).OALO_HOMEOWNER_REPORTS !== "enabled")
      return homeJson({ message: "This report link is unavailable or expired." }, 404);
    const pool = campaignDatabasePool(environment);
    const report = await readSharedHomeReport(pool, homeHash(secret));
    if (!report) return homeJson({ message: "This report link is unavailable or expired." }, 404);
    if (request.method === "GET") return homeJson({ report });
    const origin = request.headers.get("origin");
    const host = request.headers.get("host") ?? new URL(request.url).host;
    if (
      !origin ||
      new URL(origin).host !== host ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HomeownerError(
        "ORIGIN_NOT_ALLOWED",
        403,
        "Open the report page to request a review.",
      );
    const event = z
      .object({
        event: z.enum(["viewed", "review_requested"]),
        eventKey: z.uuid().default(() => randomUUID()),
      })
      .strict()
      .parse(await body(request));
    const accepted = await recordSharedHomeEvent(
      pool,
      homeHash(secret),
      event.event,
      event.eventKey,
    );
    return accepted
      ? homeJson({
          message:
            event.event === "review_requested"
              ? "Your loan officer can now see your request for a report review."
              : "Viewed",
        })
      : homeJson({ message: "This report link is unavailable or expired." }, 404);
  } catch (error) {
    return homeError(error);
  }
}
