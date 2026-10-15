# Security review: native financing timezone repair

Date: 2026-10-14. Independent reviewer: security-guardian. Worktree: property-marketing-release. Scope: the frozen timezone repair and latest combined public runtime/admission source inventory. Ownership: this report only.

## Executive summary

Scoped PASS, cleared for fresh independent Quality. No Critical, High, Medium or Low finding detected in the current packet. Independent native execution passes all 34 existing financing/admission/timezone cases with zero failures or skips, on actual Windows PostgreSQL 17.11 with the cluster remaining America/Chicago. The exact repaired migration preserves the original private capture body and permissions while making its established 720-hour retention policy independent of caller timezone. Rolling quotas use exactly 24 hours.

The prior d950081dd54e1a1fa9f2ef8f3f4cac969c86dee11c2f765e56120a2d32c6e2fb review remains historical for its old SQL pin. This new report covers the repaired migration with the fourteen unchanged public runtime pins, unchanged admission repository/tests/exports and unchanged scaffold. All 21 other pins in the prior combined source tables match. No old report or failed evidence is rewritten.

The managed Security Weapon and integrated authorization/PII procedures apply. Its CVE intelligence last refreshed 2026-04-24 remains beyond 120 days; refresh separately. No dependency delta exists. Existing defensive tests, static source comparisons and primary PostgreSQL documentation were used. No new payload/probe, secret read, browser/provider effect, application activation, configured startup, source repair, Git mutation or ledger edit occurred. Fresh Quality of this repaired packet follows this report; old Quality concerns a different freeze.

## Surface coverage checklist

### Absolute retention and caller configuration

None detected. Application financing-release.ts:649 and :666 require exactly 30 * 86,400,000 milliseconds. The original SQL's calendar-day expression diverged across daylight saving changes under America/Chicago. PostgreSQL documents that calendar-day and fixed-hour timestamp arithmetic can differ in DST zones. [PostgreSQL 17 date/time arithmetic](https://www.postgresql.org/docs/17/functions-datetime.html).

Repaired 20261014120000_financing_public_http.sql:77-85 pins only the private capture implementation and its public/app wrapper to function-local UTC. The original private prosrc is byte-identical, verified from the native catalog against the unchanged original migration. The table constraint is evaluated during the protected insert under UTC. Both functions retain empty search_path, security-definer ownership, exact signature, original five-minute freshness checks and current eligibility/removed-request refusals. No session/cluster setting, original source body, retention length, inquiry row or table constraint is rewritten.

Function settings apply on entry and restore prior configuration on exit; ALTER FUNCTION changes the assigned function-local setting. [PostgreSQL 17 CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html), [ALTER FUNCTION](https://www.postgresql.org/docs/17/sql-alterfunction.html). Existing native tests independently confirm successful and rejected capture/replay under Chicago, New York, Auckland and UTC, caller-setting restoration and exact 720-hour expiry. They reject 719/721 hours, future acceptance and acceptance six minutes old. Historical spring/fall direct inserts qualify the unchanged table constraint only, with a synthetic ciphertext shape; they are not decryption or delivery proof.

### Exact quotas and replay

None detected. SQL:64-66 changes precisely three one-day expressions to interval '24 hours', covering the publication count, oldest applicable admission and retry duration. Limits remain 20 per client/publication in ten minutes and 5,000 per publication in the preceding 24 hours, with the existing 86,400-second retry ceiling. Existing public advisory locking, current publication/origin scope, same-request replay before counts and changed-client conflict remain unchanged at SQL:36-70.

A byte comparison against the retained 6d4237 old additive migration verifies the entire delta is those three expressions plus the private UTC ALTER and wrapper UTC setting/comments. No additional SQL change was found. Native tests prove concurrent last-slot admission and same-request replay using actual standard reserved connections; no one-backend hook is used.

### Public admission, private capture and privilege boundaries

None detected. The admission table retains enabled/forced RLS, indexed restrictive tenant/release/publication FKs and exact public entry role. It stores the existing publication-separated keyed client digest and keyed capture digest, without IP/contact/provider payload. Capture at SQL:88-105 requires the admitted exact current public scope/request, rejects conflicting content and consumes the admission atomically with the unchanged protected capture. The private implementation remains revoked from PUBLIC, app_runtime and financing_public_runtime; the same public/app wrapper grants remain. Local UTC does not grant entry authority or bypass source, approval, publication, tombstone or tenant checks.

The unchanged admission repository retains independently keyed HMAC, validated fixed parameters, serializable reservation and sanitized result/error mapping. Existing fourteen privilege boundary contracts pass. Native current-source withdrawal, forged/cleared public context, foreign identity/origin, expiry, scope isolation, raw-table denial, RLS and indexed FK tests also pass.

### Current runtime and HTTP boundary

None detected in the retained combined source. All fourteen runtime pins match their prior review, including public HTTP, four exported routes, proxy, renderer, Next configuration and environment guard. Repeated existing units preserve exact origin/path/publication selection, nonce/cookie/preflight/body/CSRF validation, sanitized status refusal, current locked record/evidence/bytes checks, bounded parity-cache metadata and exact route/CSP delegation. They establish controlled source behavior, not hosted serving.

The native runtime factory still requires the trusted deployment client resolver. The default inquiry handler remains unbound and refuses 503 before constructing the write runtime or reading the body. The separately reviewed standalone direct Vercel resolver is not wired by this SQL repair. Current source qualification does not establish actual hosted ingress, capability/storage configuration, identity-media locator, public customer journey or inquiry delivery.

### PII, ciphertext, export and lifecycle

None detected. No new plaintext field, secret, log, provider payload or response export is added. Original ciphertext, atomic delivery row, exact receipt, expiry-before-access, bounded purge and sanitized tombstone semantics remain unchanged. The original encrypted repository suite passes actual encrypted capture, deterministic latest-1,000 export, revocation, response-loss replay, access expiry and 5,000-row purge boundaries. Native evidence withdrawal and expiration during transaction work prevent commitment.

Temporary retention remains the established absolute duration. UTC changes calculation context without widening duration, acceptance freshness, export scope or removal access. The dedicated time tests use synthetic ciphertext only for SQL timing/constraint qualification; original encryption tests provide the separate crypto-path evidence. Actual HighLevel delivery remains open.

### Dependencies, scaffold and operational scope

None detected. No package/lockfile, role, schema inventory, generic RLS/FK assertion, production flag, raster/font, original artifact or runtime source changes. Scaffold remains at its previously reviewed 40-table/31-plan pin. The repair introduces no additional table DDL, backfill or row rewrite; the containing additive migration retains bounded lock waits and its original lock notes. Root owns hosted migration, canonical CI and release operations. Managed CVE coverage is stale, not refreshed by this narrow source pass.

## Findings and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in the latest reviewed source scope. The prior native defect is repaired by the owning author before this freeze; Security made no source changes. Only this new report was authored. Existing DB build/test output and disposable database state are verification effects.

| Severity | Count | Fixed by reviewer |
| --- | --- | --- |
| Critical | 0 | 0 |
| High | 0 | 0 |
| Medium | 0 | 0 |
| Low | 0 | 0 |

## Independent verification

| Check | Result |
| --- | --- |
| Unchanged native runner, original 27 plus seven new cases | 34 passed, zero failed/skipped, exit 0 |
| Actual native private prosrc and function configuration | Original body exact; both UTC settings present |
| Caller settings and cluster timezone | Caller restored after success/refusal; cluster remains America/Chicago |
| Post-suite active fixture locations | Zero |
| Existing runtime/HTTP/routes/proxy/admission unit files | 95 passed across five files |
| Existing database privilege boundary contracts | 14 passed |
| DB build and web TypeScript | Passed |
| New regression syntax, oxlint and Prettier | Passed |
| Boundary and secret audits | Passed; 16 packages and two rejected prohibited edges |
| Current combined inventory excluding repaired SQL | All 21 previous source pins match |
| Exact SQL comparison | Only three 24-hour expressions and protected UTC settings/comments differ |
| Repair handoff/source and retained RED/GREEN evidence hashes | Match frozen values below |

The independent runner used root-owned loopback 127.0.0.1:55438, generated a fresh oalo_test_fintz_native_<12 hex> database, verified/applied all 21 migration bytes and invoked three unmodified integration suites with standard postgres.js 3.4.9 pools/reservations. No loader/source clock hook, reduced pooling, test-only capture implementation, cluster timezone change, activation flag or provider transport was supplied. It dropped only its guarded owned database in finally and left the parent server lifecycle unchanged.

Actual engine reported PostgreSQL 17.11 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit. Native tests completed in approximately 39.5 seconds. Existing historical migration membership notices and nested-transaction warnings remain unchanged. Canonical Supabase/Linux CI and pgTAP were not executed by this runner and remain required. The earlier WASM diagnostic does not qualify native concurrency. Reviewer source reads initially named an absent migration path and one inline comparison failed shell quoting; neither counts as verification. Exact discovery/comparison and all stated checks subsequently succeeded without source edits.

## Frozen inventory and retained evidence

| File | SHA-256 |
| --- | --- |
| supabase/migrations/20261014120000_financing_public_http.sql, repaired | 923ef0874551a65fcd2342d27a5d1ce0455124c5cc70bc953936a0dfc51d4afa |
| packages/db/test/financing-native-timezone.integration.test.mjs | f91fe7102eb897a37f9ebf79d1b560e1ac11c28f5376a5f800cc693995a8a0f8 |
| library/requirements/reports/2026-10-14-financing-native-timezone-repair-handoff.md | 52ed22da9c30dd2253ed28ae15e537e0b7ac072a31718aa0b61d953444bb9867 |
| supabase/migrations/20261014051000_financing_release.sql, unchanged original | 0b0bd282e4a12ef47ccc512d6ab63527210c93f80c1ef8282ad08ef81bb70104 |
| tmp/financing-public-http-before-timezone.sql, retained preceding migration | 6d4237ad9760401ed56946ea9e3aee98aa2c41a3ac9f82b3cbcd259ad76316c9 |
| tmp/native-financing-timezone-run.mjs, unchanged inspected runner | a5281fe3e90834bd52fc358102877d459b3ee68e27ba99f7fdcf00d073e74317 |
| tmp/native-property-root.log, original 18-pass/nine-failure evidence | 9b7df735110923bc6c9f4422e0b42aecdddc15e5644b386f380956b5e6dfa0a3 |
| tmp/native-financing-timezone-red.log, three-pass/four-failure repair regression | de3a5854694a36c8cef854858a0f583cb3f0f7cb28cc1ea49bf20fd06dcf8fa3 |
| tmp/native-financing-timezone-green.log, author native evidence | 9c4a21878dff2a9c98f32bc2f10d057aaa9d40bf763ded3aea45ae0047c300e8 |

The fourteen retained runtime pins and seven unchanged admission/scaffold pins are the exact tables in [the preceding combined Security review](2026-10-14-financing-public-runtime-admission-security-review.md), SHA-256 d950081dd54e1a1fa9f2ef8f3f4cac969c86dee11c2f765e56120a2d32c6e2fb. Only its old additive SQL pin is replaced by 923ef087 in this report; its old verdict is not silently rewritten.

## Handoff and remaining qualification

Proceed to fresh independent Quality at these exact latest pins, then canonical current-head CI and root Git/release closeout. This pass covers current source and native repair behavior. It does not establish configured production serving, hosted client identity, customer publication/review UX, actual provider/CRM delivery, purchase, ad launch, merge or deployment. Separate publisher historical/native review dispositions remain outside this property repair.

Automatic approval review rejected the prior configured whole-app startup with fixture DB/R2 hooks and an activation flag as "blocked by policy." It remains unrun and was not repackaged or retried. Standalone native database verification is separate from that application startup.
