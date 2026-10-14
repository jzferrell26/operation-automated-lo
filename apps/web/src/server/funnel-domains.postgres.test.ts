import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FUNNELS } from "../features/funnels/catalog.js";
import { DomainStateSchema } from "../features/domains/model.js";
import { SAVED_TEST_BRAND } from "./campaign-command-test-support.js";
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
import { resetCampaignDatabasePoolForTests } from "./campaign-persistence-runtime.js";
import {
  newDomainClaim,
  postgresFunnelDomainStore,
  checkFunnelDomain,
  type FunnelDomainStore,
} from "./funnel-domain-store.js";
import { handleFunnelDomains } from "./funnel-domain-http.js";
import { handleVisitor, publicSnapshot } from "./funnel-public-http.js";
import { publicationStore } from "./funnel-public-store.js";
import { readCurrentDomainBinding } from "./funnel-domain-routing.js";
const environment = routeEnvironment({
  OALO_FUNNEL_PUBLICATION: "enabled",
  OALO_FUNNEL_DATA_KEY: randomBytes(32).toString("base64url"),
  OALO_FUNNEL_DOMAINS: "enabled",
});
const pool = createRouteTestPool();
let restore: () => void,
  owner: IssuedSession,
  foreign: IssuedSession,
  viewer: IssuedSession,
  a: FunnelDomainStore,
  b: FunnelDomainStore;
const provider = {
  owns: async () => true,
  attach: async () => ({ verified: true, configured: true, records: [] }),
  certificate: async () => true,
};
const hostname = () => `learn-${randomBytes(8).toString("hex")}.example.org`;
const create = (store: FunnelDomainStore, host: string) => {
  const claim = newDomainClaim({ hostname: host, apex: false, defaultKind: "buyer" });
  return store.command("connect", claim.id, null, claim);
};
beforeAll(async () => {
  restore = applyRouteEnvironment(environment);
  const location = await seedLocation(pool, "Domain owner"),
    other = await seedLocation(pool, "Other domain owner");
  owner = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Domain publisher",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  foreign = await issueSession(
    pool,
    other,
    await seedActor(pool, other, {
      displayName: "Other publisher",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    }),
  );
  viewer = await issueSession(
    pool,
    location,
    await seedActor(pool, location, {
      displayName: "Viewer",
      bindingRole: "analyst",
      sessionRole: "viewer",
    }),
  );
  a = postgresFunnelDomainStore(await principalForSession(owner, environment), pool);
  b = postgresFunnelDomainStore(await principalForSession(foreign, environment), pool);
});
afterAll(async () => {
  restore();
  await resetCampaignDatabasePoolForTests();
  await pool.close();
});
async function disconnect(store: FunnelDomainStore) {
  const current = (await store.list()).find((row) => row.status !== "disconnected");
  if (current) await store.command("disconnect", current.id, current.revision);
}
describe("real Postgres domain authority", () => {
  it("persists reloadable pending claims without globally reserving a hostname", async () => {
    const host = hostname(),
      one = await create(a, host),
      two = await create(b, host);
    expect(one.claimed).toBe(false);
    expect(two.claimed).toBe(false);
    expect((await a.list())[0]?.challenge).toBe(one.challenge);
    expect(await readCurrentDomainBinding(host, environment)).toBeNull();
    expect((await create(a, host)).id).toBe(one.id);
    await expect(b.command("disconnect", one.id, one.revision)).rejects.toThrow("DOMAIN_NOT_FOUND");
    await disconnect(a);
    await disconnect(b);
  });
  it("only admits one proved owner under a parallel claim race", async () => {
    const host = hostname(),
      one = await create(a, host),
      two = await create(b, host);
    const result = await Promise.allSettled([
      checkFunnelDomain(a, provider, one.id, one.revision),
      checkFunnelDomain(b, provider, two.id, two.revision),
    ]);
    expect(result.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    const binding = await readCurrentDomainBinding(host, environment);
    expect(binding).not.toBeNull();
    expect([one.id, two.id]).toContain(binding?.id);
    await disconnect(a);
    await disconnect(b);
  });
  it("disconnect immediately denies routing while provider configuration is absent, and rejects late CAS", async () => {
    const host = hostname(),
      claim = await create(a, host),
      ready = await checkFunnelDomain(a, provider, claim.id, claim.revision);
    expect(await readCurrentDomainBinding(host, environment)).not.toBeNull();
    const response = await handleFunnelDomains(
      browserRequest({
        path: "/api/funnel-domains",
        session: owner,
        csrfServerSecret: csrfSecretFor(environment),
        body: { action: "disconnect", id: ready.id, expectedRevision: ready.revision },
      }),
      { ...environment, OALO_FUNNEL_DOMAINS: "disabled" },
    );
    expect(response.status).toBe(200);
    expect(await readCurrentDomainBinding(host, environment)).toBeNull();
    await expect(
      a.command("finish", ready.id, ready.revision, { status: "ready", records: [] }),
    ).rejects.toThrow("DOMAIN_CONFLICT");
    expect((await create(a, host)).challenge).not.toBe(claim.challenge);
    await disconnect(a);
  });
  it("denies customer-role writes and ignores caller tenant selection", async () => {
    const request = (body: unknown, session = owner) =>
      browserRequest({
        path: "/api/funnel-domains",
        session,
        csrfServerSecret: csrfSecretFor(environment),
        body,
      });
    const configured = {
      ...environment,
      OALO_VERCEL_DOMAINS_TOKEN: "synthetic-token-not-live",
      OALO_VERCEL_PROJECT_ID: "prj_test",
      OALO_VERCEL_TEAM_ID: "team_test",
    };
    const command = {
      action: "connect",
      hostname: hostname(),
      apex: false,
      defaultKind: "buyer",
      confirmed: true,
    };
    expect((await handleFunnelDomains(request(command, viewer), configured)).status).toBe(403);
    expect(
      (await handleFunnelDomains(request({ ...command, locationId: randomUUID() }), configured))
        .status,
    ).toBe(400);
    const read = await handleFunnelDomains(
      new Request(`${environment.OALO_APP_URL}/api/funnel-domains`, {
        headers: { cookie: owner.cookieHeader },
      }),
      environment,
    );
    expect(read.status).toBe(200);
    expect(DomainStateSchema.parse(await read.json()).available).toBe(false);
  });
  it("refuses expired routing proof and prevents stale recheck replay", async () => {
    const host = hostname(),
      claim = await create(a, host),
      ready = await checkFunnelDomain(a, provider, claim.id, claim.revision);
    await expect(checkFunnelDomain(a, provider, ready.id, ready.revision)).rejects.toThrow(
      "DOMAIN_CONFLICT",
    );
    const connection = await pool.connect();
    try {
      await connection.execute({
        statementName: "domain-test.expire",
        text: "update campaign.funnel_domains set ownership_until=now()-interval '1 second',record=record||jsonb_build_object('readyUntil',now()-interval '1 second') where id=$1::uuid",
        values: [ready.id],
        preparedStatementMode: "unnamed",
      });
    } finally {
      await connection.release();
    }
    expect(await readCurrentDomainBinding(host, environment)).toBeNull();
    await disconnect(a);
  });
  it("binds public reads, same-origin capture and receipt to immutable exact publication owner", async () => {
    const host = hostname(),
      claim = await create(a, host),
      ready = await checkFunnelDomain(a, provider, claim.id, claim.revision);
    const own = await principalForSession(owner, environment),
      other = await principalForSession(foreign, environment);
    const snapshot = {
      kind: "buyer" as const,
      fields: structuredClone(FUNNELS.find((item) => item.kind === "buyer")!.defaults),
      brand: {
        name: SAVED_TEST_BRAND.name,
        company: SAVED_TEST_BRAND.company,
        nmls: SAVED_TEST_BRAND.nmls,
        companyNmls: SAVED_TEST_BRAND.companyNmls,
        disclosure: "Synthetic mortgage disclosure",
        colorPresetId: "navy",
      },
    };
    const published = await publicationStore(own, environment).publish(snapshot, randomUUID()),
      outside = await publicationStore(other, environment).publish(snapshot, randomUUID());
    expect(await publicSnapshot(published.id, "", environment, host)).not.toBeNull();
    expect(await publicSnapshot(outside.id, "", environment, host)).toBeNull();
    const visitor = {
      requestId: randomUUID(),
      firstName: "Synthetic Visitor",
      email: "visitor@example.org",
      phone: "",
      goal: "learn",
      consent: true,
      website: "",
    };
    const request = (id: string, origin = `https://${host}`) =>
      new Request(`https://${host}/api/funnel-public/${id}`, {
        method: "POST",
        headers: { host, "content-type": "application/json", origin },
        body: JSON.stringify(visitor),
      });
    expect((await handleVisitor(request(outside.id), outside.id, environment)).status).toBe(404);
    expect(
      (
        await handleVisitor(
          request(published.id, environment.OALO_APP_URL),
          published.id,
          environment,
        )
      ).status,
    ).toBe(403);
    const response = await handleVisitor(request(published.id), published.id, environment);
    expect(response.status).toBe(200);
    const receipt = response.headers.get("set-cookie")!.split(";")[0]!;
    expect((await publicSnapshot(published.id, receipt, environment, host))?.hasAccess).toBe(true);
    await a.command("disconnect", ready.id, ready.revision);
    const next = await create(b, host);
    await checkFunnelDomain(b, provider, next.id, next.revision);
    expect(await publicSnapshot(published.id, receipt, environment, host)).toBeNull();
    expect((await handleVisitor(request(published.id), published.id, environment)).status).toBe(
      404,
    );
    expect(await publicSnapshot(outside.id, "", environment, host)).not.toBeNull();
    await disconnect(b);
  });
});
