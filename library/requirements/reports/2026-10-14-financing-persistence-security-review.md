# Public financing persistence Security review

Date: 2026-10-14. Reviewer: `/root/publisher_command_security`, security-guardian. Worktree: `codex/property-marketing-release`. Base HEAD: `185337fb634e61b49636753f16837e3ea8675062`. Governing agreement: accepted CTR-004 revision 1, SHA-256 `59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa`.

## Executive summary

**HOLD for H-FIN-PERSIST-01: the anonymous SQL role's selected-release scope is bypassable through mutable custom settings.** One High finding requires original-owner remediation and fresh Security before Quality. No Critical, Medium or Low finding is reported. The current TypeScript anonymous adapter rejects private operations and extra references, and no HTTP SQL exposure is implemented. This finding concerns the new database capability boundary, not a demonstrated visitor/browser attack or observed production disclosure.

Independent executions passed 21 compiled adapter/crypto tests, 26 source adapter/SQL checks, 99 financing foundation unit cases and 16 foundation contract cases. Types, source audits, lint, formatting and exact hashes pass. Sixteen actual PostgreSQL cases and 36 pgTAP assertions remain locally unrun; their presence is not runtime proof. The managed CVE watchlist remains dated 2026-04-24, more than 120 days old; refresh through the Guild owner. A fresh registry audit found zero production advisories. This packet has no persistence-specific Quality report at entry; earlier foundation reviews cover their unchanged six-file packet only.

## Scope and immutable inputs

Reviewed the ten pinned database/test files, complete assigned migration and pgTAP source, accepted agreement, root-transcribed handoff, prior foundation Security/Quality, existing verified transaction context and webinar authority predicate, and consumed foundation source at trust boundaries. Handoff SHA-256 independently matches `b062abbec47e0278b502ea281ad48b6d9c31ace1a223434f2ec4efa37a69df5c`. All ten new packet pins and all six preceding foundation pins match their reports. No foundation, source, test, migration, root ledger or project-map edit was performed by this reviewer.

The seven-table packet implements server persistence and crypto. Trusted lender/permission/host verification producing genuine admission provenance, real storage/render extraction, public HTTP body/origin/throttle and host composition, scheduled cleanup wiring and durable HighLevel delivery remain required next consumers. No provider operation, production login/grant change, hosted migration, customer collection, deployment or live qualification occurred.

## Scorecard

| Category                                 | Disposition                                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Financial/private record confidentiality | HOLD: H-FIN-PERSIST-01, database role scope can escape the selected public release                                                       |
| PII at-rest handling                     | No additional finding detected; actual AES-GCM, independent configured HMAC key, AAD, rotation and sanitized tombstones inspected/tested |
| Principal/session/tenant authority       | Native private authority and current locked SQL checks inspected; anonymous role scope finding remains open                              |
| Injection and secret disclosure          | No new SQL interpolation or raw provider/token/error disclosure detected                                                                 |
| Dependencies and configuration           | Unchanged dependencies; fresh production registry audit has zero advisories                                                              |
| Database transaction/replay/retention    | Source inspected and connectionless tests pass; actual SQL/RLS/locking/concurrency qualification pending                                 |
| HTTP/provider completeness               | Not implemented by this packet; no qualification or waiver inferred                                                                      |

## Critical findings

None detected in the assigned packet.

## High finding: H-FIN-PERSIST-01

**Status: OPEN, NEEDS HUMAN REVIEW and actual PostgreSQL negative confirmation. Source-qualified privilege-boundary defect; not a reproduced database or browser exploit.**

Coordinates:

- `supabase/migrations/20261014051000_financing_release.sql:189`: `financing_release_guard(allow_public)` trusts `app.financing_authorized` and detects public mode only through nonempty `app.financing_public_release`.
- `:284`: `financing_release_source` restricts the source to the selected published release only when that same setting is nonempty.
- `:328`: `financing_release_load` rejects a different release only when that setting is nonempty; otherwise it returns any owner-scoped private record, including prepared/rejected/revoked history.
- `:402`: legitimate `financing_release_public_context` sets the owner and the mutable authorization/release settings.
- `:486`: the narrow `financing_public_runtime` role receives execute on source/load/current/capture as well as public context/publication.

A SQL caller with that dedicated public service role can first establish a legitimate eligible publication context, then clear `app.financing_public_release` using `pg_catalog.set_config`. The guard no longer treats the caller as public. Its existing authorized owner context remains. A subsequent `financing_release_load` for another known private release reference of that owner is no longer rejected by the public-release predicate; the owner-filtered record query is permitted under its security definer. Replacing the setting or forging the generic tenant/actor/authorization settings also requires negative coverage. Merely omitting a grant to `platform.set_app_context` does not make ordinary custom settings immutable.

PostgreSQL documents arbitrary two-part custom options and transaction-local setting mutation. Its role privileges also include grants to PUBLIC. This conclusion is an inference from those primary semantics and the actual guards/grants, not a claim that the unavailable disposable database was executed. Sources: [PostgreSQL 17 custom options](https://www.postgresql.org/docs/17/runtime-config-custom.html), [configuration functions](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADMIN-SET), [role grants](https://www.postgresql.org/docs/17/sql-grant.html).

Illustrative sequence, deliberately **not run**:

```sql
begin;
set local role financing_public_runtime;
select campaign.financing_release_public_context(:eligible_publication, :its_origin);
select pg_catalog.set_config('app.financing_public_release', '', true);
select campaign.financing_release_load(:different_private_release_of_that_owner);
rollback;
```

The application class at `packages/db/src/financing-release-repository.ts:716` separately refuses extra release references and admin operations. No browser path accepts arbitrary SQL, no production public-role login is provisioned here, and no inquiry export or private publication-command grant exists for this role. These mitigate present exposure; they do not establish the advertised independent SQL capability restriction. A reused public-role pool by another consumer, accidental fixed query composition or SQL injection in a future caller would lose that intended containment. Private financial snapshots and verification/source metadata motivate High severity under the Weapon's financial exposure rubric, rather than treating this as generic hygiene.

Required repair: have the original database owner make public-versus-private capability enforcement independent of caller-editable scope flags. Ensure calls made with the public role cannot downgrade into private owner behavior; validate the requested load/source/current/capture against an eligible published scope and exact authoritative owner/origin at the function boundary. Role-aware checks alone must also account for changing a nonempty scope and generic context values. Do not weaken the strict TypeScript adapter, reuse a fabricated session, grant private/export capabilities, or certify a forged hash as protected provenance.

Add real PostgreSQL negative tests that use the actual dedicated public role after valid context establishment, clear or replace the public-release setting, and attempt access to a second prepared/revoked record, foreign source and forged tenant/actor context. The expected result is safe refusal, while legitimate public read/capture and private authenticated export/revoke remain usable. The existing anonymous test checks only TypeScript port refusals and selected grant presence; it does not exercise these raw SQL changes. Original owner remediation is required, then fresh Security and Quality on the resulting exact pins. No fix or waiver was made by this reviewer because source ownership remains with that author.

## Medium findings

None detected beyond the separately classified High capability finding.

## Low findings

None detected in the assigned packet.

## Other reviewed controls

### Trusted verification and current authority

`packages/db/src/financing-release-repository.ts:47` parses strict kind/evidence/provenance admission and requires lender, public-permission or platform record methods according to evidence kind. `:588` assumes only the separately privileged verifier role for admission. This is a concrete restricted persistence operation, not actual validation of a lender document, license or host; the trusted verifier consumer must perform that validation before calling it. Schema fields and a receipt hash alone do not qualify a record. The migration gives no membership to app_runtime/application login and no runtime execute grant for admission.

The private repository freezes its native principal, refuses synthetic mode, reuses verified tenant context and begins SERIALIZABLE before context queries. Current owner role version and first-party session are checked at entry and completion. SQL authority locks current location, actor, binding and applicable session, and rechecks session expiry using server time. Internal role predicates introduce no customer role management or second reviewer. Generic context alone does not legitimately authorize the private command adapter.

The migration binds admitted proof kind, exact immutable proof body, tenant, revision, site/PDF channels, issue/verification/expiry and withdrawal. It binds source data to the actual saved campaign version, manifest/hash, input versions, creator and creation time, rather than accepting a detached source. Evidence rows are immutable except a single sanctioned withdrawal/supersession transition; history remains. Ordered SHARE locks conflict with withdrawal/supersession, and server-clock evidence checks are repeated after awaited application work. Actual row-lock/race semantics remain unrun here.

### Command transaction, replay and public composition

Finite parameterized SQL contracts provide source save/read, reserve, owner load, CAS save, current evidence, completion, capture, export/removal, withdrawal and finite service capabilities. No user-selected SQL text/identifier, table name, role or provider call exists. The dynamic DDL/grant statements operate over fixed migration-owned enumerations and safely formatted catalog signatures, not browser inputs.

Command identity is tenant/command/request UUID plus normalized content hash. A changed retry conflicts; completed retry returns the original release reference and application eligibility remains mandatory. Row version, immutable snapshot and state transition checks prevent silent material edits. The adapter does not automatically retry SERIALIZABLE uncertainty or rendering/provider work. Error classification is sanitized; rollback/release failures do not expose raw SQL detail through the public adapter. The application reports no false success after a CAS refusal.

Anonymous composition resolves actual owner from eligible UUID/origin and does not fabricate an authenticated principal. Its transaction omits reserve/save/complete/export/removal/admission and constrains owner release in TypeScript. Nested source calls reuse the locked connection. These positive controls do not close H-FIN-PERSIST-01 in the independently granted database functions. Private function results must still remain behind the existing application's public presentation allowlist and output/current eligibility checks.

### Inquiry encryption, retention and purge

The adapter requires named 32-byte server encryption keys and a separately configured stable 32-byte request-hash key, with no environment/default mutation. AES-256-GCM uses fresh 12-byte nonces and authenticated tenant/publication/request namespace AAD. The encrypted strict payload retains minimal normalized inquiry, exact consent version/text/hash/time and immutable source/property/partner/routing attribution. HMAC dedupe does not persist the raw contact-derived content hash. Key rotation retains old named decryption keys and the stable dedupe key; tampering, changed publication identity or missing old key refuses with a sanitized unavailable result. Actual key management and independently generated production secrets remain activation work.

Capture revalidates snapshot and normalized content identity, enforces the exact 30-day interval and atomically writes ciphertext, receipt and sanitized pending delivery operation. SQL checks actual server clock and publication/current eligibility before capture/retry. Pending is not delivered. Existing ciphertext expires out of export immediately; owner removal physically deletes it, blocks pending delivery and retains a non-PII tombstone so retry cannot resurrect the request. Export is deterministically capped at the latest 1,000 current rows, even after release revocation. The worker must still recheck consent/current routing/release and removal/expiry immediately before dispatch; this packet contains no dispatch or fencing implementation.

The fixed scheduler hook performs five alternating maximum-5,000-row batches, at most 25,000 deletions per invocation across both inquiry families. It is not wired to the actual scheduled task here. Replacing the old full-budget loop, rather than running both, remains the scheduler consumer's obligation. No homeowner retention interval is altered.

## Independent verification

| Check                                                                       | Observed result                                                                                     |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `node --test packages/db/test/financing-release-repository.test.mjs`        | 21 compiled adapter/crypto cases passed, 0 skipped, about 465 ms                                    |
| Source database adapter/SQL and financing foundation units                  | 125 passed across 2 files, 2.87 seconds: 26 new source checks and 99 unchanged foundation cases     |
| Financing foundation contracts                                              | 16 passed, 834 ms                                                                                   |
| DB package and tooling typechecks                                           | Passed                                                                                              |
| Secret, package-boundary and product-type audits                            | Passed; negative fixture rejected both prohibited edges                                             |
| `pnpm audit --prod --json`                                                  | Empty advisory object; zero vulnerabilities at every severity, 153 production/optional dependencies |
| Managed deterministic scanner                                               | Completed; hidden rules Unicode clean                                                               |
| Explicit packet source/test Oxlint and eight-file Prettier                  | Passed                                                                                              |
| Ten new pins, accepted agreement, handoff and six unchanged foundation pins | Exact matches                                                                                       |
| `git diff --check`                                                          | Passed                                                                                              |
| Actual PostgreSQL, pgTAP and raw public-role capability sequence            | Not executed locally; required next gate, no runtime pass inferred                                  |

Source command: `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts tooling/tests/unit/financing-release.test.ts`. Contracts command: `pnpm exec vitest run --project contracts tooling/tests/contracts/financing-release.test.ts`.

The compiled and source adapter suites share injected pool cases. They execute real compiled/source crypto and application orchestration, but return synthetic SQL rows. The five SQL cases inspect source strings and do not parse/execute the migration, grants, locks or PL/pgSQL functions. Real database tests contain 16 unskipped disposable-database cases and pgTAP declares 36 assertions, both inspected but not credited as passing execution. The original author's coverage/build/missing-database guard results remain attributed in the handoff; no full coverage or production build was repeated here. Broad scanner matches outside this frozen packet do not establish a new whole-repository audit.

The locked framework remains inherited Next.js 16.3.8 and React/React DOM 19.3.0, with no package/lock changes. The fresh registry audit supplements stale managed intelligence; this packet does not repeat a full framework advisory matrix review. No live database, provider or hosted credential was queried.

## Frozen source pins

| File                                                                 | SHA-256                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/db/src/financing-release-repository.ts`                    | `5d10d107c4bcc0b51ee7a1c4dcea90d711974a05e55632ff34c46e2581748948` |
| `packages/db/src/index.ts`                                           | `eb8d358b8f85b26878a606e0067dfb9e19bd71ce23306d65b0f187ea80fd7f2c` |
| `packages/db/test/financing-release-fixture.mjs`                     | `057bba6e70dba4f09d70a9c88fc58131e021a33fd2fe1b3bb7a086a1f6b066c4` |
| `packages/db/test/financing-release-repository.test.mjs`             | `dc11d443a26978b967c6e9bbd7607279c45edf034965fc3adcfb7f838df61350` |
| `packages/db/test/financing-release-repository.integration.test.mjs` | `7b133bba02e6974e50345ecc936133f9e6a5ffbca087bda1fa297e649a83e418` |
| `packages/db/test/financing-release-repository.unit-cases.mjs`       | `8df4dd526caa735cf9c09f361e9959828bc4d53821bff8dcdd86bdeb0ce62fc6` |
| `packages/db/test/financing-release-repository.unit-cases.d.mts`     | `cf1857255eece16d35871d6a5e1467658f79539b1fe3b6c13a52767d6f99685f` |
| `supabase/migrations/20261014051000_financing_release.sql`           | `03770142b41f6602af7f23673a4c8dd20bd5cee07a03e67753b9028f7536854e` |
| `supabase/tests/financing_release.pgtap.sql`                         | `e2001ea073c958aa9aead8ca4cf4953c7f0b434f658163a4ce6c4d4bbc9fb7e6` |
| `tooling/tests/unit/financing-release-database.test.ts`              | `0d9c6eae09105b16e5582116f7b6dc32c24936b45a111e904926206d18868734` |

## Files changed and handoff

Only this report and ignored scanner scratch were authored. No source remediation, new numbered migration, baseline, contract, ledger/map, commit/push or hosted effect occurred. Source remains frozen at the ten pins above. H-FIN-PERSIST-01 is not waived and this report does not authorize fresh Quality or shipping. Root should hand the narrow repair to the original database author, then request Security re-evaluation and fresh Quality on repaired bytes. Root retains repository-health review before commit/push, fresh-main/MERGEABLE and actual CI gates.

## Parent triage and released ownership

Root independently accepted High classification and the source HOLD after reviewing the reported capability sequence. This is a routine authorized engineering correction, with no additional product policy or user approval required. The initial report SHA-256 was `c694413caaafc5a7f594d6e9419e648083456d6db6af90fd4908f732081c2169`; that initial report body and all ten old source pins are retained above. The provisional human-review label records the original static-versus-runtime qualification concern, not a new permission gate or reason to delay the assigned repair.

The original database author may now repair the finite capability guard and add direct PostgreSQL negatives for clearing/replacing scope and forging generic context. Security report/source ownership is released. Fresh Security must preserve this original finding and re-evaluate the repaired bytes before Quality; actual database execution remains a separate required CI qualification.
