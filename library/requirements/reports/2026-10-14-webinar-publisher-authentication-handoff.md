# Original webinar command authentication persistence

October 14, 2026. Owner: db-guardian. Parent owns Git, scaffold inventory, deployed bindings and independent Security then Quality. This increment adds one migration, one repository module, its export group and three dedicated test files. All thirteen held publisher source pins and their report history remain unchanged. It does not resolve their separately recorded Quality hold or qualify production activation.

## Source-derived trust seam

Accepted CTR-003 revision 1 sections 4, 5 and 6 require the authenticated sole owner, atomic operation/outbox reservation and current authority before effects. `platform.first_party_sessions` already records immutable session, tenant, actor, exact role binding, installation, role version, original issue time and expiry; operational revocation remains mutable (`20260919120000_first_party_sessions.sql:34,97,167,352,393`). The existing embedded verifier validates Ed25519, configured issuer/audience, original 300-second signed lifetime, active backing session and current role (`packages/auth/src/inbound-session.ts:23`, `embedded-session.ts:267`). No new customer roles or authentication protocol were invented.

The held publisher identity normalization preserves first-party session UUID but drops embedded session identity (`packages/db/src/webinar-publisher-repository.ts:264`). The held runtime binding resolves only actor/location (`apps/tasks/src/core/webinar-publisher-runtime-bindings.ts:36`). Neither selecting an arbitrary active session nor storing a caller-supplied principal would establish which session authorized an operation. Those existing source files are untouched.

The new producer requires an independent server authentication verifier. Its `verify({operationRef, authenticationEvidence})` must verify the actual original cookie or signed token through the existing authentication services and complete the browser mutation gate for that exact request. It returns a normalized canonical principal, original signed issue/expiry for embedded mode and a durable verification-event digest. A supplied digest, shaped claims, accepted JSON or an `app_test` fixture is not verification. There is no default implementation, accepting fallback, cookie reader, token signer or deployed credential configuration in this packet. The verifier must return stable original verification metadata on read-only rechecks and must not touch or extend sessions while SQL locks are held.

`assertCommandCurrent` must independently load the owned persisted summary and check exact final confirmation, original approval, source/lender/publication and current qualification. It executes before and inside reservation. This is a required integration capability, not an accepting production implementation supplied by these tests.

## Durable invariants and API

`campaign.webinar_publisher_authentications` has one immutable record per exact tenant/operation. It retains original actor, session UUID, installation, binding UUID, role version, mode, original lifetime, verification-event hash and server capture time. It stores no cookie, bearer token, claim nonce, email, raw request or credential. A delete/update trigger rejects all mutation, including owner mutation. No runtime has direct table access.

The new SQL producer calls the unchanged native reservation router and inserts provenance in the same transaction. A post-reservation verifier refusal rolls back operation, outbox and authentication together. The producer compares canonical request hash, server-verified principal identity and decoded operation identity, then repeats the same local idempotent reservation after asynchronous verification to recheck current session/claim expiry before commit. This repeat causes no provider effect. The original command action/evidence/proof/lease semantics are preserved inside the existing SQL router.

Exact retries retain the original authentication row. A retry cannot change its session, installation, binding, mode or original expiry. A historical operation without an authentication record cannot be adopted retrospectively. First-party expiry comes from the actual immutable session row. Embedded expiry is the original signed expiry, with exactly 300 seconds from the original integral issue timestamp, bounded by the actual UUID-backed `embedded_exchange` session. Synthetic named sessions and `local_synthetic` mode cannot acquire this capability. Expired original claims deny work even if a newer token or login exists.

The private resolver takes mandatory `{operationRef,actorId,locationId}`. It finds only that immutable authentication record and rechecks current location/actor, installation status, exact original binding and version, session ownership/revocation/expiry, captured original expiry and matching operation/launch ownership. It never selects a newer session. The application principal contains the original canonical references. `revalidate(operationRef, originalPrincipal)` rejects any changed principal, including a later login of the same person.

Exports:

- `PostgresWebinarPublisherCommandAuthenticationRepository(pool, verifier).reserve({reservation, authenticationEvidence})` returns the exact reserved operation. `reservation` contains the existing operation/task, projectionRef, expectedRowVersion and expectedState. Required verifier ports are described above.
- `PostgresWebinarPublisherAuthenticationResolver(pool).current({operationRef, actorId, locationId})` returns the original current authenticated principal.
- `resolver.revalidate(operationRef, originalPrincipal)` checks exact principal equality.
- Refusals are sanitized `WebinarPublisherAuthenticationError`, code `PUBLISHER_AUTHENTICATION_UNAVAILABLE`. No raw driver or verifier failure becomes product copy.

## Private capability and migration protocol

PostgreSQL target: 17. Existing raw-SQL/postgres.js 3.4.9 pooled transaction pattern remains. Serialized JSON strings bind through `::text::jsonb`, preserving actual wire object semantics. The producer uses serializable transactions, fixed role selection and three-second lock / ten-second statement limits. There is no new package dependency or lockfile edit.

Source-only roles `publisher_authentication_runtime` and `publisher_authentication_resolver` are NOLOGIN, NOINHERIT and have no elevated attributes. This migration gives neither role to any login or existing application role. Each can execute only its own public capability function; the locking session helper remains private to the security-definer owner. Existing app/admission/support grants remain unchanged. Authentication depends on independently provisioned capability authority and actual persisted records, never caller-settable `app.*` GUCs. The ordinary runtime with forged tenant/actor GUCs still cannot resolve or reserve through these functions.

The new table enables and forces RLS with only an owner policy. Each FK has an index: tenant and composite operation use the primary-key prefix; actor, session, installation and binding have explicit indexes. Real SQL checks cover all FK index prefixes and RLS/grant state. Parent scaffold owner must add exactly this one tenant table and derive the resulting branch inventory; this packet changes no existing inventory gate.

DDL is additive. New empty table creation/ALTER uses ACCESS EXCLUSIVE, ordinary CREATE INDEX takes SHARE on the new table, foreign keys briefly take SHARE ROW EXCLUSIVE on referenced tables, and function/role creation takes catalog locks. Five-second lock_timeout bounds migration waits. No existing rows, policies, function bodies or grants are rewritten. After durable use, rollback is a later forward migration, not deleting historical authentication. These choices follow db-weapon `guides/01-schema-design.md` (constraints/audit), `02-indexing.md` (FK indexes) and `03-migrations.md` (lock classes/expand), alongside the foundation/session migration patterns.

## Required reviewed wiring before admission

The current runtime interface must change from `current({actorId,locationId})` to include `operationRef`, propagated through relay, worker authentication, media/current checks and a per-operation database-authority closure. Existing `currentPrincipal(original)` authority ports have no operation field, so a reviewed closure bound to the immutable operation or a separately reviewed signature change is required. No default operation, person-only lookup or newer-session fallback is safe.

The authenticated producer must use the new atomic producer before admitting worker activity. `reserve()` owns its complete private transaction. Calling it from the held repository's existing `tx.reserveCommand` while that older transaction already holds the launch lock would self-contend across pools. Future integration must route the complete command through this producer seam outside that older reservation transaction, or explicitly review a same-connection private capability integration. It must preserve all existing application final-confirmation/evidence checks. No existing held producer, binding, runtime, task index or delivery authority was edited or activated here.

Provision and review the real verifier and separate capability logins, wire exact operation authentication before any worker admission, then qualify native multi-connection behavior in canonical CI. Source/schema completion is not deployed authentication or release completion. Credentials, provider capture, external wire qualification, purchases and launches remain separate deliberate steps.

## Verification and limits

The old twenty-migration stack failed the new original-session reservation regression because no persistence/resolver capability existed (`authentication-red.log`, one failure). This is a feature-absence RED, not a reproduced browser exploit. The initial new DDL also failed PostgreSQL 42501 role creation under migration_owner; following the existing reset-role/create-capability/set-owner pattern corrected it. No runtime role attributes were broadened.

A meaningful producer regression caught a changed canonical request hash being accepted: `authentication-hash-red.log` records one expected rejection missing, eight passes. The corrected source passes all nine connectionless Node cases. The new Vitest seam suite passes five cases using source aliases, without requiring a prior compiled package for those tests. Database build/typecheck, tooling types, scoped lint/formatting, boundaries with negative fixture, product-type audit and secret audit pass.

Final actual-wire diagnostic uses the exact twenty old migrations plus this new migration, PostgreSQL 17.5 compiled with Emscripten (existing disposable PGlite 0.3.15 tooling), postgres.js 3.4.9 and the actual compiled repository/tests. Fourteen SQL cases pass. They cover original identity/exact replay/newer-session refusal, original embedded and first-party expiry, session revocation, installation/binding/actor/tenant withdrawal, same-version replacement-binding refusal, foreign actor/location/operation, invalid embedded issuer/lifetime/linkage, missing legacy provenance, operation/outbox/provenance rollback, immutable rows, private grants, forced RLS, FK indexes and mutable-GUC denial.

One native concurrency test is authored and explicitly unqualified here. The first attempt to acquire independent connections on the one-backend WASM harness failed its normal 30-second acquisition deadline; that log is retained. The test now recognizes the actual Emscripten server version before opening parallel connections. On native PostgreSQL it must prove two distinct backend PIDs and exactly one competing session wins the immutable operation. It does not skip a native backend failure. Final diagnostic is fourteen passes, one explicit Emscripten skip, zero failures. No timeout or production guard changed.

The ignored single-connection diagnostic hook and one WASM backend cannot qualify multi-connection locks, SSI or native PostgreSQL behavior. The final diagnostic leaves zero active fixture tenants; the unchanged review seeder inserts ten rows, then zero on exact replay. Fixture retirement targets only generated tenant/actor/installation and tracked binding IDs, retaining immutable evidence. Tests use explicitly synthetic independent-verifier outputs, not production cryptographic or provider provenance. No old publisher clock stress, held-source modification, Docker setting change, dependency installation, provider request, Git mutation or production migration occurred. Parent's separate native twenty-migration qualification must exclude this new migration until this packet receives its own review.

## Frozen source and diagnostic pins

| File | SHA-256 |
| --- | --- |
| supabase/migrations/20261014130000_webinar_publisher_auth.sql | 5077017e0b8da49e7c6f96262d5a1d32c9bf3bcc87f9cf6dd5f4c801a92bcc55 |
| packages/db/src/webinar-publisher-authentication-repository.ts | e8bd7a50b5da15494a164ccffae2b1494354d751a0ea470f25326936f9e79d98 |
| packages/db/src/index.ts | 130974c2d152845e22996ce604fb88820f15ef4202b375ac2b204ecaed509a67 |
| packages/db/test/webinar-publisher-authentication-repository.test.mjs | 9bbb1344b79b84979eb0d94fcfc329fe2f1b840216b5206ec9cae19d6c6d3764 |
| packages/db/test/webinar-publisher-authentication.integration.test.mjs | dc8e1e93f0d4f6e3d882c0be2a1b9badac02c71eb1552e9b437d003db83ebac6 |
| tooling/tests/unit/webinar-publisher/authentication.test.ts | 3296fe5f2864371c57e34435de873c782f054f02533434f49c419ad07698ba40 |
| tmp/publisher-deadline-probe/authentication-stack.mjs | d1a989d064f92861b477ec31548a807cc09c7d9117b6009e1bf93bb264d2e24f |
| tmp/publisher-deadline-probe/single-connection.mjs (existing unchanged) | 2ec95a7cc36137e74e2e4042d012ffefaad23ca1bfd7dacd8ad93ec39ea9da3c |
| tmp/publisher-deadline-probe/authentication-red.log | 5a55d3a4701dc1d944f2001bef44d4518212f5dce314df37a6091ad608ad9650 |
| tmp/publisher-deadline-probe/authentication-hash-red.log | f14e00437e33c862f8edded1452491d5a868cfb6eb697967123e1831970067ac |
| tmp/publisher-deadline-probe/authentication-freeze-green.log (unsupported parallel acquisition failure) | 4445bee5ec6e202931f308f474bdcf83dd2daba295d9625c1225767393ef40ce |
| tmp/publisher-deadline-probe/authentication-release-green.log | bfe1b19adbfedae538159a76049cc607421454771560e0004d11b8001a4425be |

Preserved held SQL SHA-256: `9c463e5cac288a7d4d3f29e155fd19d3cad2e2e476f8a02c4a941f1b020654f3`. Preserved held repository SHA-256: `7a1f8603cb519d9954e4272cf7ce8521cc112d20530bf894502f6dbd27ce5ab2`. Earlier Security/Quality reports remain unchanged and qualify only their own historical pins. Released to parent for fresh Security, then Quality of this new increment and required native CI before producer/consumer wiring.

## Native PostgreSQL qualification appendix

After the source freeze above, parent authorized a separate native qualification on its isolated loopback PostgreSQL backend. The new ignored runner copies the parent's baseline runner without editing it. It creates a random `oalo_test_publisher_auth_native_` database, applies the exact twenty historical migrations plus `20261014130000_webinar_publisher_auth.sql`, preserves the frozen old publisher SQL hash, and invokes the dedicated authentication integration test file without any loader hook, pooling substitution or test filter. It validates the exact generated database prefix and hex suffix before dropping only that database. Parent retains ownership of the server lifecycle and its separate old-source baseline qualification.

Actual engine: `PostgreSQL 17.11 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit`. Actual driver: existing postgres.js 3.4.9 and unchanged standard integration pool. All fifteen dedicated PostgreSQL cases pass, zero failures and zero skips. The competing-session case verifies two distinct actual backend PIDs, concurrently reserves through separate pools, observes exactly one accepted session and one immutable authentication/outbox row, and resolves exactly the winning original session. Native expiry, revocation, rollback, linkage, immutable-row, forced-RLS, privilege and FK-index assertions also pass. This closes the one-backend race qualification limit for this specific new suite. It does not constitute independent Security/Quality or deployed producer/consumer wiring.

The earlier WASM skip/failure remains historical diagnostic evidence; it is not presented as a native failure or erased. No tracked source byte changed after the freeze to obtain these native results. This appendix supersedes only the earlier statement that this new suite's native concurrency was unqualified. Fresh Security then Quality and canonical project CI still belong to parent before integration or release.

| Native artifact | SHA-256 |
| --- | --- |
| tmp/native-pg17-root/authentication-stack.mjs | ac2c060f727e57d5dae099e2a8a6e804fe6d631523255160d3b12163d5da63a9 |
| tmp/native-pg17-root/authentication-native.log | 542b09a93664981eb8630926f5c9e5c08bc1ca31a1c98cfbd49d235e7ce0df02 |
