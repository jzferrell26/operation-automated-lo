import { publishFinancingTestSource } from "./financing-publication-fixture.mjs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  requiredTestDatabaseUrl,
  testPool,
  tenantFixture,
  principalFixture,
  seedTenant,
  withMigrationOwnerTransaction,
  request,
} from "./campaign-integration-support.mjs";
import { financingSourceFixture } from "./financing-release-fixture.mjs";

const url = requiredTestDatabaseUrl();
if (!/^\/oalo_test_[a-z0-9_]{1,40}$/u.test(new URL(url).pathname))
  throw Error("Timezone proof requires a disposable oalo_test_ database");
const signature = "(text,uuid,text,text,uuid,timestamptz,timestamptz)";
// Database time/privilege qualification only. This shape is never decrypted or
// represented as an authenticated output, delivered contact or encryption proof.
const cipher = "v1.key1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAA";

async function fixture() {
  const pool = testPool(url);
  const tenant = tenantFixture("fintz", randomUUID().replaceAll("-", "").slice(0, 10));
  const displayName = "Synthetic financing timezone fixture";
  let seeded = false;
  const admin = (text, values = []) =>
    withMigrationOwnerTransaction(pool, (c) =>
      c.execute(request("test.financing-timezone-owner", text, values)),
    );
  async function close() {
    try {
      if (seeded) {
        await admin(
          "update platform.locations set status='deleted' where id=$1::uuid and display_name=$2::text",
          [tenant.locationId, displayName],
        );
        await admin(
          "update platform.app_users set status='deleted' where id=$1::uuid and safe_display_name=$2::text",
          [tenant.actorId, displayName],
        );
        await admin(
          "update platform.role_bindings set revoked_at=coalesce(revoked_at,clock_timestamp()) where location_id=$1::uuid and user_id=$2::uuid and role='location_admin'",
          [tenant.locationId, tenant.actorId],
        );
      }
    } finally {
      await pool.close();
    }
  }
  try {
    await seedTenant(pool, tenant, displayName);
    seeded = true;
    const role = await admin(
      "select platform.current_role_version($1::uuid,$2::uuid,'location_admin') as version",
      [tenant.locationId, tenant.actorId],
    );
    const principal = {
      ...principalFixture(tenant, "location_admin"),
      roleVersion: Number(role.rows[0].version),
    };
    const source = financingSourceFixture(principal);
    const { record } = await publishFinancingTestSource({ pool, tenant, principal, source });
    return { pool, tenant, record, admin, close };
  } catch (error) {
    await close();
    throw error;
  }
}

describe(
  "native financing absolute retention and rolling-day timezone",
  { concurrency: false },
  () => {
    it("pins both protected capture entries to UTC while preserving the original private body", async () => {
      const pool = testPool(url);
      try {
        await withMigrationOwnerTransaction(pool, async (c) => {
          const rows = await c.execute(
            request(
              "test.financing-timezone-config",
              "select proname,proconfig,prosrc from pg_proc where oid in ($1::regprocedure,$2::regprocedure) order by proname",
              [
                "campaign.financing_release_capture" + signature,
                "campaign.financing_release_capture_private" + signature,
              ],
            ),
          );
          assert.equal(rows.rows.length, 2);
          for (const row of rows.rows) assert.ok(row.proconfig.includes("TimeZone=UTC"));
          const original = await readFile(
            new URL(
              "../../../supabase/migrations/20261014051000_financing_release.sql",
              import.meta.url,
            ),
            "utf8",
          );
          const body = original.match(
            /create function campaign\.financing_release_capture\([\s\S]*?as \$f\$([\s\S]*?)\$f\$;/u,
          );
          assert.ok(body);
          assert.equal(rows.rows.find((row) => row.proname.endsWith("_private")).prosrc, body[1]);
        });
      } finally {
        await pool.close();
      }
    });

    it("demonstrates spring/fall calendar divergence and exact absolute retention/quota arithmetic", async () => {
      const pool = testPool(url);
      try {
        await withMigrationOwnerTransaction(pool, async (c) => {
          await c.execute(
            request("test.financing-timezone-chicago", "set local TimeZone='America/Chicago'"),
          );
          const result = await c.execute(
            request(
              "test.financing-timezone-dst",
              `
          select label,extract(epoch from ((accepted+interval '30 days')-accepted))/3600 as calendar_hours,
           extract(epoch from ((accepted+interval '720 hours')-accepted))/3600 as absolute_hours,
           extract(epoch from ((boundary+interval '1 day')-boundary))/3600 as calendar_day_hours,
           extract(epoch from ((boundary+interval '24 hours')-boundary))/3600 as rolling_hours
          from (values ('fall',timestamptz '2026-10-14 12:00:00+00',timestamptz '2026-11-01 00:00:00+00'),
           ('spring',timestamptz '2026-02-20 12:00:00+00',timestamptz '2026-03-08 00:00:00+00')) cases(label,accepted,boundary) order by label`,
            ),
          );
          assert.deepEqual(
            result.rows.map((row) =>
              Object.fromEntries(
                Object.entries(row).map(([key, value]) => [
                  key,
                  key === "label" ? value : Number(value),
                ]),
              ),
            ),
            [
              {
                label: "fall",
                calendar_hours: 721,
                absolute_hours: 720,
                calendar_day_hours: 25,
                rolling_hours: 24,
              },
              {
                label: "spring",
                calendar_hours: 719,
                absolute_hours: 720,
                calendar_day_hours: 23,
                rolling_hours: 24,
              },
            ],
          );
          const quota = await c.execute(
            request(
              "test.financing-timezone-quota-source",
              "select prosrc from pg_proc where oid='campaign.financing_public_inquiry_admit(uuid,text,uuid,text)'::regprocedure",
            ),
          );
          assert.ok(!quota.rows[0].prosrc.includes("interval '1 day'"));
          assert.equal(quota.rows[0].prosrc.match(/interval '24 hours'/gu).length, 3);
        });
      } finally {
        await pool.close();
      }
    });

    for (const zone of ["America/Chicago", "America/New_York", "Pacific/Auckland", "UTC"]) {
      it(`captures exactly 720 hours under caller SET LOCAL ${zone}, restoring its setting`, async () => {
        const f = await fixture();
        const connection = await f.pool.connect();
        const execute = (text, values = []) =>
          connection.execute(request("test.financing-timezone-public", text, values));
        try {
          await execute("begin");
          const baseline = (await execute("select current_setting('TimeZone') as value")).rows[0]
            .value;
          await execute("select set_config('TimeZone',$1::text,true)", [zone]);
          await execute("set local role financing_public_runtime");
          const snapshot = f.record.snapshot;
          const requestId = randomUUID();
          const admitted = await execute(
            "select campaign.financing_public_inquiry_admit($1::uuid,$2::text,$3::uuid,$4::text) as value",
            [
              snapshot.publicationId,
              snapshot.authority.origin.canonicalOrigin,
              requestId,
              "a".repeat(64),
            ],
          );
          assert.equal(admitted.rows[0].value.allowed, true);
          const accepted = (
            await execute(
              "select to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as value",
            )
          ).rows[0].value;
          const expiry = new Date(Date.parse(accepted) + 30 * 86_400_000).toISOString();
          const call =
            "select campaign.financing_release_capture($1::text,$2::uuid,$3::text,$4::text,$5::uuid,$6::timestamptz,$7::timestamptz) as value";
          const values = [
            snapshot.releaseRef,
            requestId,
            "b".repeat(64),
            cipher,
            randomUUID(),
            accepted,
            expiry,
          ];
          const receipt = (await execute(call, values)).rows[0].value;
          assert.equal(
            Date.parse(receipt.expiresAt) - Date.parse(receipt.acceptedAt),
            720 * 3_600_000,
          );
          assert.equal(
            (await execute("select current_setting('TimeZone') as value")).rows[0].value,
            zone,
          );
          assert.deepEqual((await execute(call, values)).rows[0].value, receipt);
          // Fresh requests remain subject to exact expiry and five-minute acceptance.
          for (const [offset, age] of [
            [-3_600_000, 0],
            [3_600_000, 0],
            [0, -360_000],
            [0, 60_000],
          ]) {
            const invalidId = randomUUID();
            await execute(
              "select campaign.financing_public_inquiry_admit($1::uuid,$2::text,$3::uuid,$4::text)",
              [
                snapshot.publicationId,
                snapshot.authority.origin.canonicalOrigin,
                invalidId,
                "a".repeat(64),
              ],
            );
            await execute("savepoint invalid_time");
            const invalidAccepted = new Date(Date.parse(accepted) + age).toISOString();
            await assert.rejects(
              execute(call, [
                snapshot.releaseRef,
                invalidId,
                "b".repeat(64),
                cipher,
                randomUUID(),
                invalidAccepted,
                new Date(Date.parse(invalidAccepted) + 30 * 86_400_000 + offset).toISOString(),
              ]),
              { code: "P0001", message: "Financing capture time invalid" },
            );
            await execute("rollback to savepoint invalid_time");
            assert.equal(
              (await execute("select current_setting('TimeZone') as value")).rows[0].value,
              zone,
            );
          }
          await execute("commit");
          assert.equal(
            (await execute("select current_setting('TimeZone') as value")).rows[0].value,
            baseline,
          );
        } finally {
          await execute("rollback");
          await connection.release();
          await f.close();
        }
      });
    }

    it("evaluates the unchanged real table constraint at spring/fall boundaries in the protected UTC setting", async () => {
      const f = await fixture();
      try {
        await withMigrationOwnerTransaction(f.pool, async (c) => {
          const execute = (text, values = []) =>
            c.execute(request("test.financing-timezone-constraint", text, values));
          // Historical values qualify the real table constraint only. The capture
          // entry's freshness check is separately exercised above without any clock hook.
          await execute("set local TimeZone='UTC'");
          const snapshot = f.record.snapshot;
          const insert = `insert into campaign.financing_release_inquiries(location_id,inquiry_id,release_ref,publication_id,request_id,request_hash,consent_hash,consent_version_ref,routing_profile_version_ref,highlevel_location_ref,payload_cipher,accepted_at,expires_at)
         values($1::uuid,$2::uuid,$3::text,$4::uuid,$5::uuid,$6::text,$7::text,$8::text,$9::text,$10::text,$11::text,$12::timestamptz,$13::timestamptz)`;
          for (const accepted of ["2026-10-14T12:00:00.000Z", "2026-02-20T12:00:00.000Z"]) {
            const values = [
              f.tenant.locationId,
              randomUUID(),
              snapshot.releaseRef,
              snapshot.publicationId,
              randomUUID(),
              "b".repeat(64),
              snapshot.authority.consentHash,
              snapshot.consentVersionRef,
              snapshot.routingProfileVersionRef,
              snapshot.authority.highlevelLocationRef,
              cipher,
              accepted,
              new Date(Date.parse(accepted) + 30 * 86_400_000).toISOString(),
            ];
            await execute(insert, values);
            for (const hours of [719, 721]) {
              await execute("savepoint invalid_expiry");
              await assert.rejects(
                execute(insert, [
                  ...values.slice(0, 1),
                  randomUUID(),
                  ...values.slice(2, 4),
                  randomUUID(),
                  ...values.slice(5, 12),
                  new Date(Date.parse(accepted) + hours * 3_600_000).toISOString(),
                ]),
                { code: "23514" },
              );
              await execute("rollback to savepoint invalid_expiry");
            }
          }
          const count = await execute(
            "select count(*)::integer as total from campaign.financing_release_inquiries where location_id=$1::uuid",
            [f.tenant.locationId],
          );
          assert.equal(count.rows[0].total, 2);
        });
      } finally {
        await f.close();
      }
    });
  },
);
