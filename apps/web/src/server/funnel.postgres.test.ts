import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
} from "@oalo/db";
import { POST as savePost, GET as draftsGet } from "../app/api/funnels/route.js";
import { POST as preferencePost } from "../app/api/workspace/preferences/route.js";
import { FUNNELS } from "../features/funnels/catalog.js";
import { FunnelSaveResponseSchema, type FunnelSave } from "../features/funnels/model.js";
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
import { SAVED_TEST_BRAND } from "./campaign-command-test-support.js";
import {
  resetCampaignDatabasePoolForTests,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import { readWorkspacePreferences } from "./workspace-preferences.js";

const environment = routeEnvironment(),
  pool = createRouteTestPool();
let restore: () => void, csrf: Uint8Array;
let owner: IssuedSession, peer: IssuedSession, outsider: IssuedSession, viewer: IssuedSession;
function input(
  kind: FunnelSave["kind"] = "buyer",
  expectedRevision: string | null = null,
): FunnelSave {
  return {
    kind,
    templateVersion: "1.0.0",
    fields: structuredClone(FUNNELS.find((item) => item.kind === kind)!.defaults),
    expectedRevision,
    requestId: randomUUID(),
  };
}
const write = (body: unknown, session = owner, overrides = {}) =>
  savePost(
    browserRequest({ path: "/api/funnels", body, session, csrfServerSecret: csrf, overrides }),
  );
const read = (session = owner) =>
  draftsGet(
    new Request(`${environment.OALO_APP_URL}/api/funnels`, {
      headers: { cookie: session.cookieHeader },
    }),
  );
async function saveBrand(session: IssuedSession, name: string) {
  const principal = await principalForSession(session, environment);
  const saved = await readWorkspacePreferences(principal, pool);
  const response = await preferencePost(
    browserRequest({
      path: "/api/workspace/preferences",
      body: {
        key: "brand",
        expectedRevision: saved.brand?.revision ?? null,
        value: { ...SAVED_TEST_BRAND, name },
      },
      session,
      csrfServerSecret: csrf,
    }),
  );
  expect(response.status).toBe(200);
}
beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  csrf = csrfSecretFor(environment);
  const own = await seedLocation(pool, "Funnel studio test"),
    other = await seedLocation(pool, "Funnel studio outsider");
  owner = await issueSession(
    pool,
    own,
    await seedActor(pool, own, {
      displayName: "Funnel owner",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  peer = await issueSession(
    pool,
    own,
    await seedActor(pool, own, {
      displayName: "Different funnel author",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    }),
  );
  outsider = await issueSession(
    pool,
    other,
    await seedActor(pool, other, {
      displayName: "Different workspace",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  viewer = await issueSession(
    pool,
    own,
    await seedActor(pool, own, {
      displayName: "Funnel viewer",
      bindingRole: "analyst",
      sessionRole: "viewer",
    }),
  );
  await saveBrand(owner, "Saved funnel author");
});
afterAll(async () => {
  await resetCampaignDatabasePoolForTests();
  await pool.close();
  restore?.();
});

describe("five-funnel routes against real PostgreSQL", () => {
  it("round-trips server-owned branding and field-only content", async () => {
    const response = await write(input());
    expect(response.status).toBe(200);
    const { draft } = FunnelSaveResponseSchema.parse(await response.json());
    expect(draft.brand.name).toBe("Saved funnel author");
    expect(draft.publicationAuthorized).toBe(false);
    expect(await (await read()).json()).toEqual({ drafts: [draft] });
  });
  it("keeps other authors, other workspaces and viewers from reading private drafts", async () => {
    for (const session of [peer, outsider, viewer])
      expect(await (await read(session)).json()).toEqual({ drafts: [] });
  });
  it("rejects unbranded writes, read-only roles, bad origins and absent CSRF", async () => {
    expect((await write(input(), peer)).status).toBe(400);
    expect((await write(input(), viewer)).status).toBe(403);
    expect((await write(input(), owner, { origin: "https://other.example" })).status).toBe(401);
    expect((await write(input(), owner, { csrfToken: null })).status).toBe(401);
  });
  it("serializes simultaneous first writes into one saved revision and refuses stale tabs", async () => {
    const command = input("on-demand");
    const results = await Promise.all(Array.from({ length: 4 }, () => write(command)));
    const drafts = await Promise.all(
      results.map(async (response) => {
        expect(response.status).toBe(200);
        return FunnelSaveResponseSchema.parse(await response.json()).draft;
      }),
    );
    expect(new Set(drafts.map((draft) => draft.revision)).size).toBe(1);
    expect(
      (
        await write({
          ...command,
          requestId: randomUUID(),
          fields: { ...command.fields, headline: "Stale overwrite" },
        })
      ).status,
    ).toBe(409);
    expect(
      (await write({ ...command, fields: { ...command.fields, headline: "Changed retry" } }))
        .status,
    ).toBe(409);
    const newInput = input("on-demand", drafts[0]!.revision);
    newInput.fields.headline = "A consciously saved update";
    const response = await write(newInput);
    expect(response.status).toBe(200);
    expect(FunnelSaveResponseSchema.parse(await response.json()).draft.fields.headline).toBe(
      newInput.fields.headline,
    );
  });
  it("does not retroactively rewrite saved brand identity", async () => {
    const before = await (await read()).json();
    await saveBrand(owner, "Updated owner name");
    const after = await (await read()).json();
    expect(after).toEqual(before);
  });
  it("forces author isolation even when an app query omits the author predicate", async () => {
    const principal = await principalForSession(peer, environment);
    const query = defineSqlContract({
      name: "test.funnel-rules.v1",
      access: "read",
      text: "select count(*)::int as count from campaign.funnel_drafts",
      decode: (value) => z.object({ count: z.number() }).parse(value).count,
    });
    const rows = await withTenantTransaction(
      pool,
      createPrincipalBoundTenantContextAuthority(
        principal,
        workspaceCorrelationReferenceFor(principal),
      ),
      (tx) => tx.read(query, []),
    );
    expect(rows).toEqual([0]);
  });
});
