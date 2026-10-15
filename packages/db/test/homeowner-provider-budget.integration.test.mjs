import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, it } from "node:test";
import { HomeReportInputSchema } from "@oalo/contracts";
import { buildHomeReport } from "@oalo/application/homeowner-reports";
import { PostgresHomeownerRepository } from "../dist/index.js";
import {
  request,
  requiredTestDatabaseUrl,
  testPool,
  withMigrationOwnerTransaction,
} from "./campaign-integration-support.mjs";

const url = requiredTestDatabaseUrl();
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname))
  throw new Error("Provider budget tests require a disposable loopback database");
const pool = testPool(url);
const identities = Array.from({ length: 2 }, () => ({
  location: randomUUID(),
  actor: randomUUID(),
}));
const repositories = identities.map(
  ({ location, actor }) =>
    new PostgresHomeownerRepository(pool, {
      async resolveTenantDatabaseContext() {
        return {
          locationId: location,
          actorId: actor,
          correlationId: `correlation_budget_${randomUUID().replaceAll("-", "")}`,
        };
      },
    }),
);
const admin = (sql, values = []) =>
  withMigrationOwnerTransaction(
    pool,
    async (connection) =>
      (await connection.execute(request("test.provider-budget", sql, values))).rows,
  );
const count = async () =>
  (
    await admin(
      "select reserved_attempts as count from homeowner.provider_account_budgets where provider_key='rentcast'",
    )
  )[0]?.count;
async function budget(limit = 1, start = -3600, end = 3600, enabled = true) {
  await admin(
    "insert into homeowner.provider_account_budgets(provider_key,billing_period_start,billing_period_end,lookup_limit,enabled) values('rentcast',clock_timestamp()+make_interval(secs=>$2::integer),clock_timestamp()+make_interval(secs=>$3::integer),$1::integer,$4::boolean) on conflict(provider_key) do update set billing_period_start=excluded.billing_period_start,billing_period_end=excluded.billing_period_end,lookup_limit=excluded.lookup_limit,reserved_attempts=0,enabled=excluded.enabled",
    [limit, start, end, enabled],
  );
}
function options() {
  const input = HomeReportInputSchema.parse({
    requestId: randomUUID(),
    contactId: `fixture-${randomUUID()}`,
    contactName: "Budget fixture",
    address: { street: "214 Cedar Street", city: "Dallas", state: "TX", postalCode: "75201" },
    mortgage: {
      source: "unknown",
      firstBalanceMinor: null,
      otherBalanceMinor: null,
      allLiensConfirmed: false,
      asOf: new Date().toISOString().slice(0, 10),
      loan: null,
    },
    brand: {
      name: "Fixture Loan Officer",
      company: "Fixture Lending",
      email: "officer@example.test",
      phone: "",
      nmls: "123456",
      companyNmls: "",
      tagline: "A clear next step.",
    },
    communicationBasis: "requested_report",
    confirmedProperty: true,
  });
  return {
    input,
    propertyId: `home_${randomUUID().replaceAll("-", "")}`,
    requestHash: "b".repeat(64),
    addressHash: randomUUID().replaceAll("-", "").repeat(2),
    monthlyLimit: 100,
    refresh: true,
  };
}
const valuation = () => ({
  source: "rentcast",
  retrievedAt: new Date().toISOString(),
  valueMinor: 48000000,
  lowMinor: 46000000,
  highMinor: 50000000,
  matchedAddress: "214 Cedar Street, Dallas, TX 75201",
  propertyType: null,
  bedrooms: null,
  bathrooms: null,
  squareFeet: null,
  yearBuilt: null,
  comparables: [],
});
async function asRuntime(sql, values = [], identity = identities[0]) {
  const connection = await pool.connect();
  try {
    await connection.execute(request("test.budget-begin", "begin"));
    await connection.execute(request("test.budget-runtime", "set local role app_runtime"));
    await connection.execute(
      request(
        "test.budget-context",
        "select platform.set_app_context($1::uuid,$2::uuid,'budget_test')",
        [identity.location, identity.actor],
      ),
    );
    const result = await connection.execute(request("test.budget-query", sql, values));
    await connection.execute(request("test.budget-commit", "commit"));
    return result.rows;
  } catch (error) {
    await connection.execute(request("test.budget-rollback", "rollback"));
    throw error;
  } finally {
    await connection.release();
  }
}
before(async () => {
  assert.equal(await count(), undefined, "migration must not seed a paid allowance");
  for (const { location, actor } of identities) {
    await admin(
      "insert into platform.locations(id,display_name,status) values($1::uuid,'Budget fixture','active')",
      [location],
    );
    await admin(
      "insert into platform.app_users(id,safe_display_name) values($1::uuid,'Budget fixture')",
      [actor],
    );
    await admin(
      "insert into platform.role_bindings(location_id,user_id,role) values($1::uuid,$2::uuid,'location_admin')",
      [location, actor],
    );
  }
});
after(async () => {
  try {
    for (const { location, actor } of identities) {
      await admin("delete from homeowner.properties where location_id=$1::uuid", [location]);
      await admin("delete from homeowner.usage_events where location_id=$1::uuid", [location]);
      await admin("delete from platform.role_bindings where location_id=$1::uuid", [location]);
      await admin("delete from platform.locations where id=$1::uuid", [location]);
      await admin("delete from platform.app_users where id=$1::uuid", [actor]);
    }
    await admin("delete from homeowner.provider_account_budgets where provider_key='rentcast'");
  } finally {
    await pool.close();
  }
});

it("fails closed without an approved period and for disabled, future, expired or zero budgets", async () => {
  assert.equal(await repositories[0].providerLookupAvailable(), false);
  await assert.rejects(repositories[0].reserve(options()), { code: "PROVIDER_LOOKUP_LIMIT" });
  for (const parameters of [[1, -3600, 3600, false], [1, 3600, 7200], [1, -7200, -3600], [0]]) {
    await budget(...parameters);
    assert.equal(await repositories[0].providerLookupAvailable(), false);
    await assert.rejects(repositories[0].reserve(options()), { code: "PROVIDER_LOOKUP_LIMIT" });
    assert.equal(await count(), 0);
  }
});
it("serializes the last shared slot across independent workspaces and keeps exact retry free", async () => {
  await budget();
  assert.equal(await repositories[0].providerLookupAvailable(), true);
  const inputs = identities.map(() => options());
  const outcomes = await Promise.allSettled(
    repositories.map((repository, index) => repository.reserve(inputs[index])),
  );
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const loser = outcomes.find((outcome) => outcome.status === "rejected");
  assert.equal(loser.reason.code, "PROVIDER_LOOKUP_LIMIT");
  const winner = outcomes.findIndex((outcome) => outcome.status === "fulfilled");
  assert.equal((await repositories[winner].reserve(inputs[winner])).kind, "existing");
  assert.equal(await count(), 1);
  assert.equal(await repositories[0].providerLookupAvailable(), false);
  await repositories[winner].fail(
    inputs[winner].input.requestId,
    inputs[winner].propertyId,
    "PROVIDER_UNAVAILABLE",
    false,
  );
  await repositories[winner].remove(inputs[winner].propertyId);
  assert.equal(await count(), 1, "failed or deleted reports do not refund attempted calls");
  await assert.rejects(repositories[1 - winner].reserve(options()), {
    code: "PROVIDER_LOOKUP_LIMIT",
  });
});
it("rolls back the global slot when a later local reservation write fails", async () => {
  await budget();
  const invalid = options();
  invalid.input.contactName = "";
  await assert.rejects(repositories[0].reserve(invalid), { code: "23514" });
  assert.equal(await count(), 0);
  assert.equal((await repositories[0].reserve(options())).kind, "reserved");
  assert.equal(await count(), 1);
});
it("preserves cached and explicitly reused reports and saved reads without a new provider slot", async () => {
  await budget();
  const original = options();
  await repositories[0].reserve(original);
  const report = buildHomeReport(
    original.input,
    valuation(),
    `hreport_${randomUUID().replaceAll("-", "")}`,
    original.propertyId,
    new Date(),
  );
  await repositories[0].complete(report);
  await budget(0);
  const cached = options();
  cached.addressHash = original.addressHash;
  cached.refresh = false;
  assert.equal((await repositories[0].reserve(cached)).cached.source, "rentcast");
  const reused = {
    ...original,
    input: { ...original.input, requestId: randomUUID(), propertyId: original.propertyId },
    reuseReportId: report.id,
  };
  assert.equal((await repositories[0].reserve(reused)).cached.source, "rentcast");
  assert.equal((await repositories[0].getReport(report.id)).id, report.id);
  assert.equal(await repositories[1].getReport(report.id), null);
  assert.equal(await count(), 0);
});
it("forces private RLS, denies runtime inspection/reset, and refuses revoked writers", async () => {
  await budget(2);
  const metadata = await admin(
    "select c.relrowsecurity,c.relforcerowsecurity from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='homeowner' and c.relname='provider_account_budgets'",
  );
  assert.deepEqual(metadata[0], { relrowsecurity: true, relforcerowsecurity: true });
  const grants = await admin(
    "select role_name,has_function_privilege(role_name,'homeowner.reserve_provider_lookup()','execute') as reserve,has_function_privilege(role_name,'homeowner.provider_lookup_available()','execute') as availability from unnest(array['scheduler_runtime','support_runtime','reporting_runtime','anon']) as roles(role_name) order by role_name",
  );
  for (const grant of grants)
    assert.deepEqual(grant, { role_name: grant.role_name, reserve: false, availability: false });
  await assert.rejects(
    asRuntime("select * from homeowner.provider_account_budgets"),
    /permission denied/u,
  );
  await assert.rejects(
    asRuntime("update homeowner.provider_account_budgets set reserved_attempts=0"),
    /permission denied/u,
  );
  const { location, actor } = identities[1];
  await admin(
    "update platform.role_bindings set role='analyst' where location_id=$1::uuid and user_id=$2::uuid",
    [location, actor],
  );
  assert.deepEqual(
    await asRuntime("select homeowner.reserve_provider_lookup() as allowed", [], identities[1]),
    [{ allowed: false }],
  );
  await admin(
    "update platform.role_bindings set revoked_at=clock_timestamp() where location_id=$1::uuid and user_id=$2::uuid",
    [location, actor],
  );
  await assert.rejects(repositories[1].reserve(options()), { code: "42501" });
  assert.equal(await count(), 0);
});
