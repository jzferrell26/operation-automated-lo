import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import {
  createPostgresPool,
  PostgresHomeownerRepository,
  readSharedHomeReport,
  recordSharedHomeEvent,
  claimDueHomeProperties,
  type SqlScalar,
} from "@oalo/db";
import { buildHomeReport } from "@oalo/application/homeowner-reports";
import { homeownerInput, homeownerValuation, rentCastFixture } from "./homeowner-fixtures.js";
import { homeHash } from "./runtime.js";
import { canonicalAddress, createRentCastValuationPort } from "./rentcast.js";
import { generateHomeReport } from "./service.js";
import { withMigrationOwnerTransaction } from "../../../../../packages/db/test/route-seeding-bridge.js";
const databaseUrl = process.env.OALO_TEST_DATABASE_URL;
if (
  !databaseUrl ||
  !new URL(databaseUrl).pathname.startsWith("/oalo_test_") ||
  !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
)
  throw new Error("Homeowner PostgreSQL tests require a disposable local oalo_test_ database");
const pool = createPostgresPool({
  applicationName: "homeowner-tests",
  connectionString: databaseUrl,
  deploymentEnvironment: "test",
  maxConnections: 6,
  poolingMode: "transaction",
  preparedStatements: false,
  sslMode: "disable",
});
const locationA = randomUUID(),
  locationB = randomUUID(),
  actorA = randomUUID(),
  actorB = randomUUID(),
  analyst = randomUUID();
const authority = (locationId: string, actorId: string) => ({
  async resolveTenantDatabaseContext() {
    return { locationId, actorId, correlationId: `home_test_${randomUUID().replaceAll("-", "")}` };
  },
});
const repoA = new PostgresHomeownerRepository(pool, authority(locationA, actorA));
const repoB = new PostgresHomeownerRepository(pool, authority(locationB, actorB));
async function admin(text: string, values: readonly SqlScalar[] = []) {
  return withMigrationOwnerTransaction(
    pool,
    async (connection) =>
      (
        await connection.execute({
          statementName: "homeowner.test",
          text,
          values,
          preparedStatementMode: "unnamed",
        })
      ).rows,
  );
}
const seed = async (repo: PostgresHomeownerRepository, contactId: string, limit = 100) => {
  const input = { ...homeownerInput(), requestId: randomUUID(), contactId };
  const propertyId = `home_${randomUUID().replaceAll("-", "")}`;
  const requestHash = homeHash(JSON.stringify(input));
  const options = {
    input,
    propertyId,
    requestHash,
    addressHash: homeHash(canonicalAddress(input.address)),
    monthlyLimit: limit,
    refresh: false,
  };
  const reservation = await repo.reserve(options);
  const report = buildHomeReport(
    input,
    reservation.cached ?? homeownerValuation(),
    `hreport_${randomUUID().replaceAll("-", "")}`,
    propertyId,
    new Date(),
  );
  await repo.complete(report);
  return { input, propertyId, options, report };
};
beforeAll(async () => {
  await admin(
    "insert into platform.locations(id,display_name,status,ghl_location_id) values($1::uuid,'Home report test A','active',$3),($2::uuid,'Home report test B','active',$4)",
    [locationA, locationB, `ghl-${locationA}`, `ghl-${locationB}`],
  );
  await admin(
    "insert into platform.app_users(id,safe_display_name) values($1::uuid,'Home report owner A'),($2::uuid,'Home report owner B'),($3::uuid,'Home report analyst')",
    [actorA, actorB, analyst],
  );
  await admin(
    "insert into platform.role_bindings(location_id,user_id,role) values($1::uuid,$2::uuid,'location_admin'),($3::uuid,$4::uuid,'location_admin'),($1::uuid,$5::uuid,'analyst')",
    [locationA, actorA, locationB, actorB, analyst],
  );
});
afterAll(async () => {
  try {
    await admin("delete from homeowner.properties where location_id in ($1::uuid,$2::uuid)", [
      locationA,
      locationB,
    ]);
    await admin("delete from homeowner.usage_events where location_id in ($1::uuid,$2::uuid)", [
      locationA,
      locationB,
    ]);
    await admin("delete from platform.role_bindings where location_id in ($1::uuid,$2::uuid)", [
      locationA,
      locationB,
    ]);
    await admin("delete from platform.locations where id in ($1::uuid,$2::uuid)", [
      locationA,
      locationB,
    ]);
    await admin("delete from platform.app_users where id in ($1::uuid,$2::uuid,$3::uuid)", [
      actorA,
      actorB,
      analyst,
    ]);
  } finally {
    await pool.close();
  }
});
describe.sequential("real homeowner persistence", () => {
  it("returns tenant-scoped navigation summaries without loading borrower details or financial snapshots", async () => {
    const item = await seed(repoA, "summary-contact");
    const summary = (await repoA.summaries()).find((property) => property.id === item.propertyId);
    expect(summary).toEqual({
      id: item.propertyId,
      address: item.input.address,
      updatedAt: expect.any(String),
      reportCount: 1,
      monthly: false,
      paused: false,
    });
    expect((await repoB.summaries()).some((property) => property.id === item.propertyId)).toBe(
      false,
    );
    await repoA.enrollment(item.propertyId, {
      cadence: "monthly",
      paused: true,
      nextRefreshAt: null,
      deliverUpdates: false,
    });
    expect(
      (await repoA.summaries()).find((property) => property.id === item.propertyId),
    ).toMatchObject({ reportCount: 1, monthly: true, paused: true });
    await repoA.remove(item.propertyId);
    expect((await repoA.summaries()).some((property) => property.id === item.propertyId)).toBe(
      false,
    );
  });
  it("runs address-only AVM through the HTTP adapter and real persistence with one lookup across retries", async () => {
    const fixture = rentCastFixture();
    fixture.subjectProperty.addressLine1 = "260 Cedar St";
    fixture.subjectProperty.formattedAddress = "260 Cedar St, Dallas, TX 75201";
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(fixture));
    const input = {
      ...homeownerInput(),
      requestId: randomUUID(),
      association: "property_only" as const,
      contactId: "property-only",
      contactName: "Property valuation",
      address: { ...homeownerInput().address, street: "260 Cedar Street" },
    };
    const dependencies = {
      repository: repoB,
      contacts: null,
      valuation: createRentCastValuationPort("fixture-key", fetcher),
      locationId: locationB,
      monthlyLimit: 10,
    };
    const before = await repoB.usage();
    const report = await generateHomeReport(input, dependencies);
    expect(report.valuation.source).toBe("rentcast");
    expect(report.valuation.valueMinor).toBe(48_500_000);
    expect(report.valuation.comparables[0]?.priceKind).toBe("listing");
    expect(await repoB.getReport(report.id)).toEqual(report);
    expect(await repoA.getReport(report.id)).toBeNull();
    expect(await generateHomeReport(input, dependencies)).toEqual(report);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(await repoB.usage()).toBe(before + 1);
    const cached = await generateHomeReport({ ...input, requestId: randomUUID() }, dependencies);
    expect(cached.valuation).toEqual(report.valuation);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(await repoB.usage()).toBe(before + 1);
  });
  it("persists a snapshot, replays its request, rejects changed inputs and isolates tenants", async () => {
    const item = await seed(repoA, "contact-one");
    expect(await repoA.getReport(item.report.id)).toEqual(item.report);
    expect(await repoB.getReport(item.report.id)).toBeNull();
    expect((await repoA.reserve(item.options)).report).toEqual(item.report);
    await expect(
      repoA.reserve({ ...item.options, requestHash: homeHash("changed") }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    const reader = new PostgresHomeownerRepository(pool, authority(locationA, analyst));
    expect(await reader.getReport(item.report.id)).toEqual(item.report);
    await expect(
      reader.enrollment(item.propertyId, {
        cadence: "monthly",
        paused: false,
        deliverUpdates: false,
        nextRefreshAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    ).rejects.toThrow();
  });
  it("serializes concurrent lookups and keeps lookup usage after deletion", async () => {
    const input = {
      ...homeownerInput(),
      requestId: randomUUID(),
      contactId: "concurrent",
      address: { ...homeownerInput().address, street: "220 Cedar Street" },
    };
    const propertyId = `home_${randomUUID().replaceAll("-", "")}`;
    const options = {
      input,
      propertyId,
      requestHash: homeHash("concurrent"),
      addressHash: homeHash(canonicalAddress(input.address)),
      monthlyLimit: 100,
      refresh: true,
    };
    const usageBefore = await repoA.usage();
    const results = await Promise.all([repoA.reserve(options), repoA.reserve(options)]);
    expect(results.map((result) => result.kind).sort()).toEqual(["existing", "reserved"]);
    expect(await repoA.usage()).toBe(usageBefore + 1);
    await repoA.fail(input.requestId, propertyId, "VALUATION_UNCERTAIN", true);
    expect((await repoA.reserve(options)).status).toBe("uncertain");
    await repoA.remove(propertyId);
    expect(await repoA.usage()).toBe(usageBefore + 1);
    await expect(repoA.reserve(options)).rejects.toMatchObject({
      code: "LOOKUP_ALREADY_ATTEMPTED",
    });
    await expect(
      repoA.reserve({ ...options, input: { ...input, requestId: randomUUID() }, monthlyLimit: 0 }),
    ).rejects.toMatchObject({ code: "LOOKUP_LIMIT" });
  });
  it("reuses a fresh valuation without reserving another lookup", async () => {
    const before = await repoA.usage();
    const item = await seed(repoA, "contact-two");
    expect(await repoA.usage()).toBe(before);
    expect(item.report.valuation.valueMinor).toBe(48_500_000);
    const revised = { ...item.input, propertyId: item.propertyId, requestId: randomUUID() };
    const reuse = await repoA.reserve({
      ...item.options,
      input: revised,
      requestHash: homeHash(JSON.stringify(revised)),
      reuseReportId: item.report.id,
      monthlyLimit: 0,
    });
    expect(reuse.cached).toEqual(item.report.valuation);
    await repoA.fail(revised.requestId, item.propertyId, "FIXTURE_END", false);
  });
  it("keeps only one concurrent replacement link active and revokes every issued link without a lookup", async () => {
    const item = await seed(repoA, "concurrent-shares");
    const before = await repoA.usage();
    const hashes = Array.from({ length: 6 }, () => homeHash(randomUUID()));
    const expiry = new Date(Date.now() + 86400000).toISOString();
    await Promise.all(hashes.map((hash) => repoA.createShare(item.report.id, hash, expiry)));
    const shares = await repoA.shares(item.report.id);
    expect(shares).toHaveLength(hashes.length);
    expect(shares.filter((share) => !share.revoked)).toHaveLength(1);
    const readable = await Promise.all(hashes.map((hash) => readSharedHomeReport(pool, hash)));
    expect(readable.filter((report) => report !== null)).toHaveLength(1);
    await expect(
      repoB.createShare(item.report.id, homeHash(randomUUID()), expiry),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await repoA.revokeShares(item.propertyId);
    expect(await Promise.all(hashes.map((hash) => readSharedHomeReport(pool, hash)))).toEqual(
      hashes.map(() => null),
    );
    expect(await repoA.usage()).toBe(before);
  });
  it("retains the existing link when a replacement cannot commit", async () => {
    const item = await seed(repoA, "share-rollback");
    const hash = homeHash(randomUUID());
    const expiry = new Date(Date.now() + 86400000).toISOString();
    await repoA.createShare(item.report.id, hash, expiry);
    await expect(repoA.createShare(item.report.id, hash, expiry)).rejects.toThrow();
    expect((await readSharedHomeReport(pool, hash))?.id).toBe(item.report.id);
    expect((await repoA.shares(item.report.id)).filter((share) => !share.revoked)).toHaveLength(1);
  });
  it("honors expiring links, current author access, revocation and explicit-event deduplication", async () => {
    const item = await seed(repoA, "shared-contact"),
      secret = homeHash(randomUUID()),
      expiry = new Date(Date.now() + 86400000).toISOString();
    await repoA.createShare(item.report.id, homeHash(secret), expiry);
    const shared = await readSharedHomeReport(pool, homeHash(secret));
    expect(shared?.input.contactId).toBe("shared");
    expect(shared?.financials.equityMinor).toBe(14_000_000);
    expect(await readSharedHomeReport(pool, homeHash("wrong"))).toBeNull();
    expect(
      await recordSharedHomeEvent(pool, homeHash(secret), "review_requested", randomUUID()),
    ).toBe(true);
    expect(
      await recordSharedHomeEvent(pool, homeHash(secret), "review_requested", randomUUID()),
    ).toBe(true);
    expect(
      await admin(
        "select count(*)::int as count from homeowner.events where location_id=$1::uuid and report_id=$2 and event_kind='review_requested'",
        [locationA, item.report.id],
      ),
    ).toEqual([{ count: 1 }]);
    expect(
      (await repoA.list()).find((property) => property.id === item.propertyId)?.reviewRequestedAt,
    ).not.toBeNull();
    await repoA.revokeShares(item.propertyId);
    expect(await readSharedHomeReport(pool, homeHash(secret))).toBeNull();
    await repoA.createShare(item.report.id, homeHash(secret + "new"), expiry);
    await admin(
      "update platform.role_bindings set revoked_at=now() where location_id=$1::uuid and user_id=$2::uuid",
      [locationA, actorA],
    );
    expect(await readSharedHomeReport(pool, homeHash(secret + "new"))).toBeNull();
    await admin(
      "update platform.role_bindings set revoked_at=null where location_id=$1::uuid and user_id=$2::uuid",
      [locationA, actorA],
    );
    await admin(
      "update homeowner.shares set expires_at=now()-interval '1 second',created_at=now()-interval '2 days' where location_id=$1::uuid and report_id=$2",
      [locationA, item.report.id],
    );
    expect(await readSharedHomeReport(pool, homeHash(secret + "new"))).toBeNull();
  });
  it("leases monthly work and blocks duplicate delivery while preserving explicit pause", async () => {
    const item = await seed(repoA, "monthly-contact");
    const due = new Date(Date.now() - 60000).toISOString();
    await repoA.enrollment(item.propertyId, {
      cadence: "monthly",
      paused: false,
      deliverUpdates: false,
      nextRefreshAt: due,
    });
    const claimed = (await claimDueHomeProperties(pool)).filter(
      (entry) => entry.locationId === locationA,
    );
    expect(claimed.some((entry) => entry.propertyId === item.propertyId)).toBe(true);
    expect(
      (await claimDueHomeProperties(pool)).some((entry) => entry.propertyId === item.propertyId),
    ).toBe(false);
    expect(await repoA.reserveDelivery(item.report.id)).toBe(true);
    expect(await repoA.reserveDelivery(item.report.id)).toBe(false);
    await repoA.finishDelivery(item.report.id, "uncertain", "TEST_UNCERTAIN", null);
    expect((await repoA.delivery(item.report.id))?.status).toBe("uncertain");
    await repoA.enrollment(item.propertyId, {
      cadence: "monthly",
      paused: true,
      deliverUpdates: false,
      nextRefreshAt: null,
    });
    await repoA.advanceSchedule(
      item.propertyId,
      due,
      new Date(Date.now() + 86400000).toISOString(),
      null,
    );
    expect(
      (await repoA.list()).find((property) => property.id === item.propertyId)?.enrollment.paused,
    ).toBe(true);
  });
  it("forces RLS on every new table and denies broad public function execution", async () => {
    const tables = await admin(
      "select relname,relrowsecurity,relforcerowsecurity from pg_class join pg_namespace on pg_namespace.oid=relnamespace where nspname='homeowner' and relkind='r' order by relname",
    );
    expect(tables).toHaveLength(7);
    for (const table of tables)
      expect(table).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true });
    expect(
      await admin(
        "select has_function_privilege('anon','homeowner.read_shared_report(text)','execute') as allowed",
      ),
    ).toEqual([{ allowed: false }]);
    expect(
      await admin(
        "select has_table_privilege('app_runtime','homeowner.reports','update') as allowed",
      ),
    ).toEqual([{ allowed: false }]);
  });
  it("closes only old unfinished work and never clears its usage evidence", async () => {
    const input = {
      ...homeownerInput(),
      requestId: randomUUID(),
      contactId: "interrupted-contact",
      address: { ...homeownerInput().address, street: "230 Cedar Street" },
    };
    const propertyId = `home_${randomUUID().replaceAll("-", "")}`;
    const options = {
      input,
      propertyId,
      requestHash: homeHash("interrupted"),
      addressHash: homeHash(canonicalAddress(input.address)),
      monthlyLimit: 100,
      refresh: true,
    };
    await repoA.reserve(options);
    await expect(repoA.closeInterruptedLookup(propertyId)).rejects.toMatchObject({
      code: "LOOKUP_STILL_ACTIVE",
    });
    await admin(
      "update homeowner.lookup_requests set created_at=now()-interval '10 minutes' where location_id=$1::uuid and request_id=$2::uuid",
      [locationA, input.requestId],
    );
    const before = await repoA.usage();
    expect(await repoA.closeInterruptedLookup(propertyId)).toBe(1);
    expect((await repoA.reserve(options)).status).toBe("uncertain");
    expect(await repoA.usage()).toBe(before);
    const item = await seed(repoA, "delivery-recovery");
    await repoA.reserveDelivery(item.report.id);
    await expect(repoA.acknowledgeDeliveryHold(item.report.id)).rejects.toMatchObject({
      code: "DELIVERY_STILL_ACTIVE",
    });
    await repoA.finishDelivery(item.report.id, "uncertain", "UNCERTAIN", null);
    await repoA.acknowledgeDeliveryHold(item.report.id);
    expect((await repoA.delivery(item.report.id))?.status).toBe("blocked");
    expect(await repoA.reserveDelivery(item.report.id)).toBe(false);
  });
});
