import { randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { z } from "zod";
import { POST as savePost } from "../app/api/funnels/route.js";
import { POST as preferencePost } from "../app/api/workspace/preferences/route.js";
import { FUNNELS } from "../features/funnels/catalog.js";
import { FunnelSaveResponseSchema, type FunnelKind } from "../features/funnels/model.js";
import { PublishedFunnelSchema } from "../features/funnels/publication-model.js";
import { salesDefaults } from "../features/funnels/sales-content.js";
import { handlePublication, handleVisitor, publicSnapshot } from "./funnel-public-http.js";
import { PUBLIC_COOKIE } from "./funnel-public-delivery.js";
import { downloadFunnelInquiries } from "./funnel-submissions.js";
import { readWorkspacePreferences } from "./workspace-preferences.js";
import { createFunnelStore } from "./funnel-store.js";
import { SAVED_TEST_BRAND } from "./campaign-command-test-support.js";
import { resetCampaignDatabasePoolForTests } from "./campaign-persistence-runtime.js";
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

const environment = routeEnvironment({
  OALO_FUNNEL_PUBLICATION: "enabled",
  OALO_FUNNEL_DATA_KEY: process.env.OALO_FUNNEL_DATA_KEY || randomBytes(32).toString("base64url"),
});
const pool = createRouteTestPool();
let restore: () => void,
  csrf: Uint8Array,
  owner: IssuedSession,
  other: IssuedSession,
  viewer: IssuedSession;
const fixtures: { id: string; kind: FunnelKind }[] = [];
const privateRequest = (body: unknown, session = owner) =>
  browserRequest({ path: "/api/funnels/publication", body, session, csrfServerSecret: csrf });
const publicRequest = (body: unknown, origin = environment.OALO_APP_URL, ip = "192.0.2.10") =>
  new Request(`${environment.OALO_APP_URL}/api/funnel-public/test`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-real-ip": ip },
    body: JSON.stringify(body),
  });
const visitor = () => ({
  requestId: randomUUID(),
  firstName: "Example Visitor",
  email: "visitor@example.org",
  phone: "",
  goal: "learn",
  consent: true,
  website: "",
});
async function publish(kind: FunnelKind = "live-webinar", expectedRevision: string | null = null) {
  const fields = structuredClone(FUNNELS.find((item) => item.kind === kind)!.defaults);
  fields.sales = {
    ...salesDefaults(kind),
    privacyUrl: "https://example.org/privacy",
    termsUrl: "https://example.org/terms",
  };
  fields.bookingUrl = "https://example.org/book";
  fields.webinarUrl = "https://example.org/private-join";
  fields.videoUrl = "https://www.youtube.com/watch?v=abcdefghijk";
  fields.resourceUrl = "https://example.org/private-guide.pdf";
  fields.eventStartsAt = "2030-10-12T20:00:00.000Z";
  const saved = await savePost(
    browserRequest({
      path: "/api/funnels",
      session: owner,
      csrfServerSecret: csrf,
      body: {
        kind,
        templateVersion: "1.0.0",
        fields,
        expectedRevision,
        requestId: randomUUID(),
      },
    }),
  );
  expect(saved.status).toBe(200);
  const draft = FunnelSaveResponseSchema.parse(await saved.json()).draft;
  const response = await handlePublication(
    privateRequest({ kind, expectedRevision: draft.revision, reviewed: true }),
    environment,
  );
  expect(response.status).toBe(200);
  return PublishedFunnelSchema.parse(
    z.object({ publication: PublishedFunnelSchema }).parse(await response.json()).publication,
  );
}
beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  csrf = csrfSecretFor(environment);
  const location = await seedLocation(pool, "Reference funnel tests"),
    outside = await seedLocation(pool, "Other reference workspace");
  owner = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Funnel publisher",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  other = await issueSession(
    pool,
    outside,
    await seedActor(pool, outside, {
      displayName: "Other publisher",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  viewer = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Funnel viewer",
      bindingRole: "analyst",
      sessionRole: "viewer",
    }),
  );
  const principal = await principalForSession(owner, environment),
    current = await readWorkspacePreferences(principal, pool);
  expect(
    (
      await preferencePost(
        browserRequest({
          path: "/api/workspace/preferences",
          session: owner,
          csrfServerSecret: csrf,
          body: {
            key: "brand",
            expectedRevision: current.brand?.revision ?? null,
            value: { ...SAVED_TEST_BRAND, name: "Alex Example" },
          },
        }),
      )
    ).status,
  ).toBe(200);
});
afterAll(async () => {
  if (process.env.OALO_FUNNEL_PUBLIC_FIXTURE_FILE)
    await writeFile(process.env.OALO_FUNNEL_PUBLIC_FIXTURE_FILE, JSON.stringify(fixtures));
  restore();
  await resetCampaignDatabasePoolForTests();
  await pool.close();
});
describe("actual public funnel publication, consent and delivery boundary", () => {
  it("publishes all five reviewed snapshots, not the mutable author draft", async () => {
    for (const kind of [
      "live-webinar",
      "on-demand",
      "buyer",
      "refinance",
      "lead-magnet",
    ] as const) {
      const publication = await publish(kind);
      fixtures.push({ id: publication.id, kind });
      const page = await publicSnapshot(publication.id, "", environment);
      expect(page?.hasAccess).toBe(false);
      expect(page?.snapshot.kind).toBe(kind);
      expect(page?.snapshot.fields.webinarUrl).toBe("");
      expect(page?.snapshot.fields.videoUrl).toBe("");
      expect(page?.snapshot.fields.resourceUrl).toBe("");
      expect(page?.snapshot.fields.bookingUrl).toBe("");
      const again = await handlePublication(
        privateRequest({ kind, expectedRevision: publication.sourceRevision, reviewed: true }),
        environment,
      );
      expect(again.status).toBe(200);
      expect((await again.json()).publication.id).toBe(publication.id);
    }
  });
  it("accepts one consented inquiry, unlocks details only with its HttpOnly receipt, and exports it to its owner", async () => {
    const id = fixtures[0]!.id,
      body = visitor();
    const response = await handleVisitor(publicRequest(body), id, environment);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: true });
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain(`Path=/f/${id}`);
    const unlocked = await publicSnapshot(id, cookie.split(";")[0]!, environment);
    expect(unlocked?.hasAccess).toBe(true);
    expect(unlocked?.snapshot.fields.webinarUrl).toBe("https://example.org/private-join");
    expect(
      (await publicSnapshot(id, `${PUBLIC_COOKIE}=${"f".repeat(64)}`, environment))?.hasAccess,
    ).toBe(false);
    const exportResponse = await downloadFunnelInquiries(
      new Request(`${environment.OALO_APP_URL}/api/funnels/submissions?publication=${id}`, {
        headers: { cookie: owner.cookieHeader },
      }),
      environment,
    );
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get("cache-control")).toContain("no-store");
    expect(await exportResponse.text()).toContain("visitor@example.org");
    const pausedExport = await downloadFunnelInquiries(
      new Request(`${environment.OALO_APP_URL}/api/funnels/submissions?publication=${id}`, {
        headers: { cookie: owner.cookieHeader },
      }),
      { ...environment, OALO_FUNNEL_PUBLICATION: "disabled" },
    );
    expect(pausedExport.status).toBe(200);
    expect(await pausedExport.text()).toContain("visitor@example.org");
  });
  it("parallel retries reuse a single request and altered retries cannot overwrite it", async () => {
    const id = fixtures[1]!.id,
      body = visitor();
    const results = await Promise.all(
      Array.from({ length: 4 }, () => handleVisitor(publicRequest(body), id, environment)),
    );
    expect(results.map((item) => item.status)).toEqual([200, 200, 200, 200]);
    expect(new Set(results.map((item) => item.headers.get("set-cookie"))).size).toBe(1);
    expect(
      (
        await handleVisitor(
          publicRequest({ ...body, email: "changed@example.org" }),
          id,
          environment,
        )
      ).status,
    ).toBe(409);
    const exported = await downloadFunnelInquiries(
      new Request(`${environment.OALO_APP_URL}/api/funnels/submissions?publication=${id}`, {
        headers: { cookie: owner.cookieHeader },
      }),
      environment,
    );
    const lines = (await exported.text()).split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).not.toContain("changed@example.org");
  });
  it("rejects missing consent, a filled honeypot, oversized input, hostile origins and caller-supplied tenant authority", async () => {
    const id = fixtures[2]!.id;
    for (const extra of [
      { consent: false },
      { website: "spam" },
      { locationId: randomUUID() },
      { firstName: "x".repeat(8000) },
    ]) {
      expect([400, 413]).toContain(
        (await handleVisitor(publicRequest({ ...visitor(), ...extra }), id, environment)).status,
      );
    }
    expect(
      (
        await handleVisitor(
          publicRequest(visitor(), "https://hostile.example.org"),
          id,
          environment,
        )
      ).status,
    ).toBe(403);
    expect((await handleVisitor(publicRequest(visitor()), randomUUID(), environment)).status).toBe(
      404,
    );
  });
  it("limits repeated requests in the database, not only a serverless process counter", async () => {
    const id = fixtures[3]!.id;
    for (let index = 0; index < 20; index++)
      expect(
        (
          await handleVisitor(
            publicRequest(visitor(), environment.OALO_APP_URL, "192.0.2.222"),
            id,
            environment,
          )
        ).status,
      ).toBe(200);
    expect(
      (
        await handleVisitor(
          publicRequest(visitor(), environment.OALO_APP_URL, "192.0.2.222"),
          id,
          environment,
        )
      ).status,
    ).toBe(429);
  });
  it("refuses other-workspace publication access and viewer writes", async () => {
    const id = fixtures[0]!.id;
    expect(
      (await handlePublication(privateRequest({ action: "revoke", id }, other), environment))
        .status,
    ).toBe(404);
    expect(
      (await handlePublication(privateRequest({ action: "revoke", id }, viewer), environment))
        .status,
    ).toBe(403);
    const request = new Request(
      `${environment.OALO_APP_URL}/api/funnels/submissions?publication=${id}`,
      { headers: { cookie: other.cookieHeader } },
    );
    expect((await downloadFunnelInquiries(request, environment)).status).toBe(404);
  });
  it("fails closed when publication is not enabled or the data key is missing", async () => {
    const id = fixtures[0]!.id;
    expect(
      (
        await handleVisitor(publicRequest(visitor()), id, {
          ...environment,
          OALO_FUNNEL_PUBLICATION: "disabled",
        })
      ).status,
    ).toBe(503);
    expect(
      (
        await handleVisitor(publicRequest(visitor()), id, {
          ...environment,
          OALO_FUNNEL_DATA_KEY: "",
        })
      ).status,
    ).toBe(503);
  });
  it("keeps owner inquiry links and revocation usable while new public collection is paused", async () => {
    const principal = await principalForSession(owner, environment);
    const previous = (await createFunnelStore(principal, environment).list()).find(
      (draft) => draft.kind === "lead-magnet",
    );
    if (!previous) throw new Error("Missing test draft");
    const { id } = await publish("lead-magnet", previous.revision);
    const paused = { ...environment, OALO_FUNNEL_PUBLICATION: "disabled" };
    const listed = await handlePublication(
      new Request(`${environment.OALO_APP_URL}/api/funnels/publication`, {
        headers: { cookie: owner.cookieHeader },
      }),
      paused,
    );
    expect(listed.status).toBe(200);
    const value = await listed.json();
    expect(value.available).toBe(false);
    expect(value.publications.some((item: { id: string }) => item.id === id)).toBe(true);
    expect((await handlePublication(privateRequest({ action: "revoke", id }), paused)).status).toBe(
      200,
    );
    expect(await publicSnapshot(id, "", environment)).toBeNull();
    expect((await handleVisitor(publicRequest(visitor()), id, environment)).status).toBe(404);
  });
});
