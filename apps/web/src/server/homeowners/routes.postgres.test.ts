import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { HomeReportSchema, HomeWorkspaceSchema } from "@oalo/contracts";
import { z } from "zod";
import {
  GET as workspaceGet,
  POST as workspacePost,
} from "../../app/api/homeowner-reports/route.js";
import { GET as detailGet } from "../../app/api/homeowner-reports/reports/[reportId]/route.js";
import {
  GET as sharedGet,
  POST as sharedPost,
} from "../../app/api/homeowner-reports/shared/[secret]/route.js";
import {
  applyRouteEnvironment,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  issueSession,
  revokeSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  REVIEW_HOST,
  REVIEW_ORIGIN,
  type IssuedSession,
  type BrowserRequestOverrides,
} from "../campaign-route-postgres-support.js";
import { resetCampaignDatabasePoolForTests } from "../campaign-persistence-runtime.js";
import { homeownerInput, rentCastFixture } from "./homeowner-fixtures.js";

const environment = routeEnvironment({
  OALO_HOMEOWNER_REPORTS: "enabled",
  OALO_HOMEOWNER_LIVE_DATA: "enabled",
  OALO_HOMEOWNER_ALLOWED_LOCATION_IDS: "",
  OALO_RENTCAST_API_KEY: "fixture-only-no-live-credential",
  OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT: "20",
  OALO_HOMEOWNER_GHL_CONNECTIONS_JSON: "",
  OALO_HOMEOWNER_DELIVERY_ENABLED: "",
});
const pool = createRouteTestPool();
let restoreEnvironment: () => void;
let ownerSession: IssuedSession;
let readerSession: IssuedSession;
let otherSession: IssuedSession;
let csrfServerSecret: Uint8Array;
const pathname = "/api/homeowner-reports";
const propertyInput = () => ({
  ...homeownerInput(),
  requestId: randomUUID(),
  association: "property_only" as const,
  contactId: "property-only",
  contactName: "Property valuation",
});
const reportEnvelope = z.object({ report: HomeReportSchema });
const read = (session: IssuedSession, path = pathname) =>
  new Request(`${REVIEW_ORIGIN}${path}`, {
    headers: { cookie: session.cookieHeader, host: REVIEW_HOST },
  });
const write = (body: unknown, session = ownerSession, overrides: BrowserRequestOverrides = {}) =>
  browserRequest({ path: pathname, body, session, csrfServerSecret, overrides });
function provider() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (target) => {
    if (!String(target).startsWith("https://api.rentcast.io/v1/avm/value?"))
      throw new Error("Unexpected external request in AVM test");
    return Response.json(rentCastFixture());
  });
}
async function create() {
  const response = await workspacePost(write({ action: "create", input: propertyInput() }));
  expect(response.status).toBe(200);
  return reportEnvelope.parse(await response.json()).report;
}

beforeAll(async () => {
  restoreEnvironment = applyRouteEnvironment(environment);
  csrfServerSecret = csrfSecretFor(environment);
  const location = await seedLocation(pool, "AVM route fixture");
  const other = await seedLocation(pool, "AVM isolated route fixture");
  process.env.OALO_HOMEOWNER_ALLOWED_LOCATION_IDS = location.locationId;
  ownerSession = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "AVM fixture owner",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  readerSession = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "AVM fixture analyst",
      bindingRole: "analyst",
      sessionRole: "viewer",
    }),
  );
  otherSession = await issueSession(
    pool,
    other,
    await seedActor(pool, other, {
      displayName: "AVM other owner",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(async () => {
  await resetCampaignDatabasePoolForTests();
  await pool.close();
  restoreEnvironment();
});

describe.sequential("authenticated AVM HTTP routes", () => {
  it("denies unauthenticated, foreign-origin, missing-CSRF and read-only writes before provider access", async () => {
    const fetcher = provider();
    const body = { action: "create", input: propertyInput() };
    expect((await workspaceGet(new Request(`${REVIEW_ORIGIN}${pathname}`))).status).toBe(401);
    expect((await workspacePost(write(body, ownerSession, { csrfToken: null }))).status).toBe(401);
    expect(
      (await workspacePost(write(body, ownerSession, { origin: "https://other.example.test" })))
        .status,
    ).toBe(401);
    expect((await workspacePost(write(body, readerSession))).status).toBe(403);
    expect((await workspacePost(write({ ...body, locationId: randomUUID() }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("generates an address-only report through real auth, provider normalization and Postgres, then replays without a second lookup", async () => {
    const fetcher = provider();
    const input = propertyInput();
    const response = await workspacePost(write({ action: "create", input }));
    expect(response.status).toBe(200);
    const report = reportEnvelope.parse(await response.json()).report;
    expect(report.valuation.valueMinor).toBe(48_500_000);
    expect(report.valuation.comparables[0]?.priceKind).toBe("listing");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const replay = await workspacePost(write({ action: "create", input }));
    expect(reportEnvelope.parse(await replay.json()).report.id).toBe(report.id);
    expect(fetcher).toHaveBeenCalledOnce();
    const workspace = HomeWorkspaceSchema.parse(
      await (await workspaceGet(read(ownerSession))).json(),
    );
    expect(workspace.mode).toBe("live");
    expect(workspace.ghlConnected).toBe(false);
    expect(workspace.properties.find((item) => item.id === report.propertyId)?.reports[0]?.id).toBe(
      report.id,
    );
    expect(workspace.lookupsThisMonth).toBe(1);
    expect(
      HomeWorkspaceSchema.parse(await (await workspaceGet(read(otherSession))).json()).properties,
    ).toEqual([]);
    expect(
      (await detailGet(read(otherSession), { params: Promise.resolve({ reportId: report.id }) }))
        .status,
    ).toBe(404);
    const revised = await workspacePost(
      write({
        action: "revise",
        reportId: report.id,
        requestId: randomUUID(),
        mortgage: { ...report.input.mortgage, firstBalanceMinor: 30_000_000 },
        brand: report.input.brand,
      }),
    );
    expect(revised.status).toBe(200);
    expect(reportEnvelope.parse(await revised.json()).report.financials.equityMinor).toBe(
      16_500_000,
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("keeps saved reports readable when the valuation credential is missing", async () => {
    const fetcher = provider();
    const previous = process.env.OALO_RENTCAST_API_KEY;
    process.env.OALO_RENTCAST_API_KEY = "";
    try {
      const response = await workspaceGet(read(ownerSession));
      expect(response.status).toBe(200);
      expect(HomeWorkspaceSchema.parse(await response.json()).properties.length).toBeGreaterThan(0);
      const unavailable = await workspacePost(write({ action: "create", input: propertyInput() }));
      expect(unavailable.status).toBe(503);
      expect(await unavailable.json()).toMatchObject({ error: "VALUATION_NOT_CONFIGURED" });
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      process.env.OALO_RENTCAST_API_KEY = previous;
    }
  });
  it("shares exactly the chosen report, records an explicit review, and revokes access without another valuation", async () => {
    const fetcher = provider();
    const report = await create();
    const shareResponse = await workspacePost(
      write({ action: "share", reportId: report.id, confirmed: true }),
    );
    expect(shareResponse.status).toBe(200);
    const shared = z.object({ url: z.url() }).parse(await shareResponse.json());
    const secret = new URL(shared.url).pathname.split("/").at(-1)!;
    const params = { params: Promise.resolve({ secret }) };
    const shown = await sharedGet(
      new Request(`${REVIEW_ORIGIN}/api/homeowner-reports/shared/${secret}`),
      params,
    );
    expect(shown.status).toBe(200);
    expect(reportEnvelope.parse(await shown.json()).report.input.contactId).toBe("shared");
    expect(shown.headers.get("Referrer-Policy")).toBe("no-referrer");
    const request = new Request(`${REVIEW_ORIGIN}/api/homeowner-reports/shared/${secret}`, {
      method: "POST",
      headers: { host: REVIEW_HOST, origin: REVIEW_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ event: "review_requested", eventKey: randomUUID() }),
    });
    expect((await sharedPost(request, params)).status).toBe(200);
    expect(
      (await workspacePost(write({ action: "revoke", propertyId: report.propertyId }))).status,
    ).toBe(200);
    expect((await sharedGet(new Request(shared.url), params)).status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled(); // Reused the already-stored valuation for this address.
  });
  it("refuses a revoked real session", async () => {
    const fetcher = provider();
    await revokeSession(pool, otherSession);
    expect((await workspaceGet(read(otherSession))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
