# Financing PostgreSQL fixture cleanup handoff

Date: 2026-10-14. Author: db-guardian. Worktree: property-marketing-release. Starting HEAD: 2738a5f4ebb1350a5f93a211f43b2c9dc509e9cf. The parent owns Git, canonical CI and fresh independent Security followed by Quality. This packet changes one integration test file and this report.

## Observed failure and repair

[CI run 38550545827](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38550545827) passed all 18 financing PostgreSQL cases, all 32 package PostgreSQL cases and all 20 pgTAP files, including 42 financing assertions. The later unchanged review seeder refused 20 active locations outside its ownership. The retained raw log, tmp/financing-output-ci-38550545827.log, records the refusal at line 2168; its SHA-256 is 8ee4009170a72f591b37781b521f2d91227cd8cc4458d247141af70b5fcb7535. This was fixture lifecycle debt after successful database tests. The separate output import and INVALID message repairs are owned by another author.

The original fixture seeded a location, actor and role binding through seedTenant, then finally closed only its connection pool. The repaired fixture records those exact generated identities and the binding ID, and close retires that location and actor and revokes that binding in one existing owner transaction. Each UPDATE requires the exact ID, the original synthetic display marker where available, and exactly one returned matching ID. No installation is created by seedTenant, so none is enumerated or changed. Source versions, admitted evidence, releases, captures, delivery records and audit evidence remain in the disposable database. No trigger is disabled and no grant, role, policy or production function changes.

An explicit oalo_test_ lowercase database-name guard runs before setup or connection acquisition. Successful seeding registers the owned close callback before subsequent source assertions, so setup failures and afterEach cleanup still retire registered identities. Cleanup failures fail the test. All original finalizers invoke close. Shared-pool fixtures retire themselves without closing another fixture's pool; both existing foreign-tenant cases now use the same pool while retaining their distinct actual tenant identities and all refusal assertions.

The new real PostgreSQL regression at packages/db/test/financing-release-repository.integration.test.mjs:242 publishes an actual release, closes only its fixture, checks that the second tenant remains active, verifies the first source/admission/release evidence is retained, verifies deleted actor and revoked binding, and refuses a repository transaction for that retired principal. It then closes the second tenant, asserts zero active rows for those exact two IDs, and exercises idempotent finalizers. This is an ownership and lifecycle test rather than a lexical assertion about teardown code. The old public-scope, crypto, withdrawal, retention, concurrency, latest-1000 and bounded-purge assertions remain.

## Verification and limitations

- The new actual regression was RED before retirement: the location remained active when deleted was required. After scoped retirement it is GREEN, including preservation of the second active tenant and immutable evidence.
- Focused unit verification passes all 128 cases in tooling/tests/unit/financing-release.test.ts and financing-release-database.test.ts. All 21 connectionless repository cases pass. Formatting, targeted lint, Node syntax and diff whitespace checks pass. Missing database URL and malformed disposable database name both refuse before setup.
- A disposable PostgreSQL 17.5 WASM engine applies all 20 current migration files byte for byte, then executes the actual postgres.js 3.4.9 wire driver and all 19 financing integration cases. All 19 pass, zero fail, zero skip. Afterward the database has zero active fixture locations. The unchanged review seeder inserts 10 rows, and its --expect-unchanged rerun inserts zero. Both seeder invocations exit 0.
- This uses already installed, ignored PGlite 0.3.15 and pglite-socket 0.0.20 tooling. No install, dependency, lockfile or canonical test configuration changes. The diagnostic loader reduces the local pool to one connection because that socket supports one active backend. Only in this ignored diagnostic, the raw anonymous helper releases its reserved connection after its existing actual COMMIT and reacquires before the next statement, allowing the intervening owner query to run. Every SQL statement and assertion remains unchanged. The tracked raw helper retains its original reservation semantics and canonical maxConnections remains 4. The one-backend result does not qualify independent races, lock waiting or the canonical same-reservation scope proof; current-head canonical CI remains required.
- Earlier diagnostic logs remain as failures: the first complete attempt has 17 passes and two connection acquisition failures; sharing the second foreign tenant pool produces 18 passes and one reservation-limit failure. The final explicitly instrumented diagnostic has all 19 passes. None of those failures is relabeled a pass.
- A focused existing contract check has three passes and one baseline inventory false positive. tests/security/database-privilege-escalation-boundary.test.ts treats any migration_owner literal as role assumption, including the preexisting read-only pg_has_role scheduler membership denial assertion in this integration test, now line 996. That assertion is present at the starting HEAD and this packet adds no such literal. The parent was notified; this author does not weaken the guard or change the existing denial assertion. The exact read-only inventory issue requires separate ownership before canonical contracts can pass.

The observed teardown and pool behavior follows db-weapon guides/00-principles.md rules 1, 6 and 10: inspect the existing schema/driver, preserve transaction-scoped pooling, and hand verification to the independent reviewers. The retirement statuses are the existing foundation constraints in supabase/migrations/20260721010000_platform_foundation.sql; the unchanged review ownership refusal is tooling/scripts/database/seed-review-location.mjs:226.

## Frozen pins

| File | SHA-256 |
| --- | --- |
| packages/db/test/financing-release-repository.integration.test.mjs | 0830011cd2afe5490d5a4ff0c8d00bb07c7e9f3c0f8005728d66b6f3e896050c |
| packages/db/test/financing-release-fixture.mjs, unchanged | 4a4238d57ed3719549a493370593c7e11b524509639a3c7e4db04c8ae020ba46 |
| packages/db/test/campaign-integration-support.mjs, unchanged | 996c8c443d8dafd807064a682884bd31de8836bbc0874991ec00e485af567ce4 |
| supabase/migrations/20261014051000_financing_release.sql, unchanged | 0b0bd282e4a12ef47ccc512d6ab63527210c93f80c1ef8282ad08ef81bb70104 |
| tooling/scripts/database/seed-review-location.mjs, unchanged | cbd8e26e329ec609b5c5e2c66ce6db157a62eaedd910f13666147c4ff99e7e4a |
| tmp/financing-pg-diagnostic/cleanup-red.log | dd445ed17b9aaf6009318072e62bc5a41ef5992e87e197546474705240a4cf0e |
| tmp/financing-pg-diagnostic/cleanup-focused-green.log | 44b7837d4826aaa4eb121bf1428f58c5366431d5f208dc0b3278b1175ecbb55f |
| tmp/financing-pg-diagnostic/cleanup-complete-green.log, failed | 8cec5eb5bf20041b1f634f8c692f2f805307a9ba1df1a4cadc380093395436f4 |
| tmp/financing-pg-diagnostic/cleanup-all-compatible-green.log, failed | 7e4eb739af1ba433baa4e4f1c01824d7184b43b1726d4523b59815d7de50c872 |
| tmp/financing-pg-diagnostic/cleanup-complete-final-green.log | 3dd2fe5adf70a5bb7374bfa2c1526f71891f67b2ea9178e6d693beecc4e114c5 |
| tmp/financing-pg-diagnostic/cleanup-stack.mjs | 1dea43f1392a9ee2f1abd745a163d750fae3136f665d28a9d0618e20c476866a |
| tmp/financing-pg-diagnostic/cleanup-single-connection.mjs | f833ef7c45f0ebf72d160c1baa0883631c3be95471d848b6fc0c479a487f5b04 |

No financing repository implementation, migration, runtime API, application contract, source qualification, grant, role, production seeder, timeout, dependency, unrelated author file, historic report, Git state or provider action changes. Fresh Security, Quality and canonical CI are still required. The queued publisher pre-publish parity repair has not been started in this property worktree.
