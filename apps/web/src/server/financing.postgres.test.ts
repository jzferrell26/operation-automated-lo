import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { CSRF_REQUEST_HEADER } from "@oalo/auth";
import { POST as savePost } from "../app/api/campaigns/property/financing/route.js";
import { GET as outputGet } from "../app/api/campaigns/property/financing/[campaignRef]/[campaignVersionRef]/[output]/route.js";
import { POST as preferencesPost } from "../app/api/workspace/preferences/route.js";
import { FinancingSavedSchema } from "../features/financing/model.js";
import { SAVED_TEST_BRAND } from "./campaign-command-test-support.js";
import {
  createCampaignPersistenceAdapter,
  resetCampaignDatabasePoolForTests,
} from "./campaign-persistence-runtime.js";
import {
  applyRouteEnvironment,
  browserRequest,
  createRouteTestPool,
  csrfSecretFor,
  issueSession,
  principalForSession,
  routeEnvironment,
  seedActor,
  seedLocation,
  type IssuedSession,
} from "./campaign-route-postgres-support.js";
import { readWorkspacePreferences } from "./workspace-preferences.js";
import { readFinancingFormContext } from "./financing-context.js";
import { verifyFinancingVersion } from "./financing-save.js";
import { financingInput } from "./financing.test-support.js";

const environment = routeEnvironment(),
  pool = createRouteTestPool();
let restore: (() => void) | undefined, csrf: Uint8Array;
let owner: IssuedSession, viewer: IssuedSession, outsider: IssuedSession, unbranded: IssuedSession;
const partner = {
  id: randomUUID(),
  name: "Priya Finance",
  company: "Example Partner Realty",
  email: "priya@example.invalid",
  phone: "555-010-9999",
};
function request(session: IssuedSession, path: string, body: unknown) {
  return browserRequest({ path, body, session, csrfServerSecret: csrf });
}
async function preference(key: "brand" | "partners", value: unknown) {
  const current = await readWorkspacePreferences(
    await principalForSession(owner, environment),
    pool,
  );
  const response = await preferencesPost(
    request(owner, "/api/workspace/preferences", {
      key,
      value,
      expectedRevision: (key === "brand" ? current.brand : current.partners)?.revision ?? null,
    }),
  );
  expect(response.status).toBe(200);
}
const input = () => financingInput({ partnerId: partner.id });
const save = (body: unknown = input(), session = owner) =>
  savePost(request(session, "/api/campaigns/property/financing", body));
async function repository(session = owner) {
  return createCampaignPersistenceAdapter(
    await principalForSession(session, environment),
    environment,
  ).readRepository;
}
const output = (
  saved: { campaignRef: string; campaignVersionRef: string },
  type: "site" | "flyer",
  session = owner,
) =>
  outputGet(
    new Request(`${environment.OALO_APP_URL}/api/campaigns/property/financing/output`, {
      headers: { cookie: session.cookieHeader },
    }),
    {
      params: Promise.resolve({
        campaignRef: saved.campaignRef,
        campaignVersionRef: saved.campaignVersionRef,
        output: type,
      }),
    },
  );

beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  csrf = csrfSecretFor(environment);
  const local = await seedLocation(pool, "Financing report proof"),
    other = await seedLocation(pool, "Financing outsider");
  owner = await issueSession(
    pool,
    local,
    await seedActor(pool, local, {
      displayName: "Finance owner",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  viewer = await issueSession(
    pool,
    local,
    await seedActor(pool, local, {
      displayName: "Finance viewer",
      bindingRole: "analyst",
      sessionRole: "viewer",
    }),
  );
  outsider = await issueSession(
    pool,
    other,
    await seedActor(pool, other, {
      displayName: "Finance outsider",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  unbranded = await issueSession(
    pool,
    local,
    await seedActor(pool, local, {
      displayName: "Finance missing brand",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  await preference("brand", {
    ...SAVED_TEST_BRAND,
    phone: "555-010-0001",
    email: "lo@example.invalid",
  });
  await preference("partners", { items: [partner] });
});
afterAll(async () => {
  await resetCampaignDatabasePoolForTests();
  await pool.close();
  restore?.();
});

describe("financing comparison exported routes with real PostgreSQL", () => {
  it("saves current server identity and retrieves both outputs through the real session", async () => {
    const response = await save();
    expect(response.status).toBe(200);
    const saved = FinancingSavedSchema.parse(await response.json());
    const record = await (await repository()).getByCampaignRef(saved.campaignRef);
    if (!record) throw new Error("No database report");
    const manifest = verifyFinancingVersion(record.version);
    expect(manifest.identities.lender).toMatchObject({
      name: SAVED_TEST_BRAND.name,
      phone: "555-010-0001",
      email: "lo@example.invalid",
    });
    expect(manifest.identities.realtor).toMatchObject({
      name: partner.name,
      company: partner.company,
      email: partner.email,
      phone: partner.phone,
    });
    expect(manifest.calculated.scenarios[0]?.cashToCloseMinor).toBe(8450000);
    expect(record.preflight.blocking).toBe(true);
    const site = await output(saved, "site");
    expect(site.status).toBe(200);
    expect(await site.text()).toContain("$84,500.00");
    const pdf = await output(saved, "flyer");
    expect(pdf.status).toBe(200);
    expect((await PDFDocument.load(await pdf.arrayBuffer())).getPageCount()).toBeGreaterThanOrEqual(
      2,
    );
  });
  it("returns the exact same saved campaign for sequential and concurrent retries", async () => {
    const body = input();
    const responses = await Promise.all(Array.from({ length: 5 }, () => save(body)));
    expect(responses.map((item) => item.status)).toEqual([200, 200, 200, 200, 200]);
    const values = await Promise.all(responses.map((item) => item.json()));
    expect(values.every((value) => JSON.stringify(value) === JSON.stringify(values[0]))).toBe(true);
    const saved = FinancingSavedSchema.parse(values[0]);
    expect(await (await repository()).listVersionsOf(saved.campaignRef)).toHaveLength(1);
    expect(await (await save(body)).json()).toEqual(values[0]);
  });
  it("returns a conflict for altered replay, keeping the original calculation", async () => {
    const body = input(),
      first = FinancingSavedSchema.parse(await (await save(body)).json());
    const changed = structuredClone(body);
    changed.financing.purchasePriceMinor = 50_000_000;
    expect((await save(changed)).status).toBe(409);
    const record = await (await repository()).getByCampaignRef(first.campaignRef);
    if (!record) throw new Error("Missing report");
    expect(verifyFinancingVersion(record.version).financing.purchasePriceMinor).toBe(40_000_000);
  });
  it("does not change a saved report after workspace branding and contact edits", async () => {
    const body = input();
    const saved = FinancingSavedSchema.parse(await (await save(body)).json());
    const before = await (await output(saved, "flyer")).arrayBuffer();
    await preference("brand", {
      ...SAVED_TEST_BRAND,
      name: "Updated Finance Owner",
      phone: "555-010-8888",
      email: "changed@example.invalid",
    });
    const again = FinancingSavedSchema.parse(await (await save(body)).json());
    expect(again).toEqual(saved);
    expect(await (await output(saved, "flyer")).arrayBuffer()).toEqual(before);
    await preference("brand", {
      ...SAVED_TEST_BRAND,
      phone: "555-010-0001",
      email: "lo@example.invalid",
    });
  });
  it("allows the tenant viewer to read, but not to create or reuse private author settings", async () => {
    const saved = FinancingSavedSchema.parse(await (await save()).json());
    expect((await output(saved, "site", viewer)).status).toBe(200);
    expect((await save(input(), viewer)).status).toBe(403);
    expect(
      await readFinancingFormContext(await principalForSession(viewer, environment), environment),
    ).toMatchObject({ canSave: false, previous: [], partners: [] });
  });
  it("does not expose a report to another tenant even with exact identifiers", async () => {
    const saved = FinancingSavedSchema.parse(await (await save()).json());
    expect((await output(saved, "site", outsider)).status).toBe(404);
    expect((await output(saved, "flyer", outsider)).status).toBe(404);
    expect(await (await repository(outsider)).getByCampaignRef(saved.campaignRef)).toBeUndefined();
  });
  it("fails missing branding and partner setup instead of borrowing another user's settings", async () => {
    expect((await save(input(), unbranded)).status).toBe(400);
    expect((await save({ ...input(), partnerId: randomUUID() })).status).toBe(404);
  });
  it("refuses forged input authority, wrong origins and missing CSRF tokens", async () => {
    expect((await save({ ...input(), locationRef: "location_impostor001" })).status).toBe(400);
    expect(
      (
        await savePost(
          browserRequest({
            path: "/api/campaigns/property/financing",
            body: input(),
            session: owner,
            csrfServerSecret: csrf,
            overrides: { origin: "https://untrusted.example" },
          }),
        )
      ).status,
    ).toBeGreaterThanOrEqual(400);
    const missing = request(owner, "/api/campaigns/property/financing", input());
    missing.headers.delete(CSRF_REQUEST_HEADER);
    expect((await savePost(missing)).status).toBeGreaterThanOrEqual(400);
  });
  it("makes reusable own scenarios durable, clearing confirmations rather than changing quote age", async () => {
    const body = input();
    const saved = FinancingSavedSchema.parse(await (await save(body)).json());
    const own = await readFinancingFormContext(
      await principalForSession(owner, environment),
      environment,
    );
    const copy = own.previous.find((item) => item.campaignRef === saved.campaignRef);
    expect(copy?.input.financing.scenarios[0]?.quote.confirmed).toBe(false);
    expect(copy?.input.financing.scenarios[0]?.quote.expiresAt).toBe(
      body.financing.scenarios[0]?.quote.expiresAt,
    );
    expect(copy?.input.propertyPermissionConfirmed).toBe(false);
    const other = await readFinancingFormContext(
      await principalForSession(outsider, environment),
      environment,
    );
    expect(other.previous).toEqual([]);
  });
});
