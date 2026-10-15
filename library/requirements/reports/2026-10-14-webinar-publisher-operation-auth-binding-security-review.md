# Security review: operation-aware publisher authentication bindings

Date: 2026-10-14. Independent reviewer: security-guardian. Worktree: webinar-publisher. Scope: the four frozen runtime/binding source and unit files, their handoff, and necessary frozen authentication/repository dependencies. Ownership: this report only.

## Executive summary

HOLD for concrete binding integration. One Medium availability finding remains: the new separate-pool authentication recheck requests row locks held by the still-open worker repository transaction. The source trace establishes conflicting connection ordering even for readWorker. The resolver's bounded lock timeout causes refusal and rollback instead of completing valid work. No new native composition probe was run; existing unit SQL mocks and the independently qualified standalone authentication suite do not exercise this combined lock ordering.

No Critical, High or Low finding detected in the assigned packet. The operation identity, immutable principal equality, per-execution closures, separate capabilities, post-asynchronous rechecks and default-off production boundary otherwise pass source review. All 57 existing assigned cases and task/tooling types pass independently, but they do not clear the Medium finding.

The managed Security Weapon and integrated authorization/PII procedures apply. Its CVE intelligence last refreshed 2026-04-24 remains beyond 120 days and needs a separate refresh. No dependency delta exists. Existing defensive tests/static checks and current official PostgreSQL lock documentation were used. No new payload/probe, actual native composition, secret read, browser/application startup, provider effect, source repair, Git mutation or ledger edit occurred. This new packet has not yet received Quality. A coordinated repair requires a new freeze, fresh Security and then Quality before concrete integration is approved.

## Finding detail

### S-PUB-OPAUTH-01: cross-connection recheck waits on its own repository locks

Severity: Medium. Category: availability / transaction-boundary integration. State: source-confirmed unresolved finding; native combined reproduction not executed in this read-only scope. This is fail-closed source availability in an unbound runtime, not a proven deployed authorization bypass, PII exposure or provider financial effect.

Evidence:

1. New runtime.ts:167-173 implements repository currentPrincipal through checked, which invokes current at lines 116-126 before and after the supplied authority work. current calls the concrete operation authentication lookup on the separate authentication pool constructed by bindings.ts:226-238.
2. Existing webinar-publisher-repository.ts:444-465 opens its tenant transaction, executes work and calls authority.currentPrincipal again before the transaction returns/commits. readWorker at lines 485-487 uses this scoped path and readRecord invokes the actual worker SQL.
3. Unchanged 20261014050000_webinar_publisher.sql:397-405 locks the owned launch and operation FOR UPDATE before returning even a read result. Those row locks remain held by the request repository transaction when its final currentPrincipal runs.
4. Frozen 20261014130000_webinar_publisher_auth.sql:152-158 requests FOR SHARE of the same launch and operation on the separate resolver transaction. Authentication repository.ts:132-139 sets its three-second lock timeout; errors become the existing authentication refusal.

PostgreSQL documents that another transaction's SELECT FOR SHARE waits for a FOR UPDATE holder until that holder ends. [PostgreSQL 17 explicit locking](https://www.postgresql.org/docs/17/explicit-locking.html). Here the repository transaction awaits the resolver before it can end, while the resolver awaits the repository locks. Distinct configured pools enforce that these are separate transaction contexts. After the timeout, authentication refuses and the repository rolls back. Claim, dispatch and checkpoint paths also use scoped and retain similar locks; the initial read is already sufficient to expose the issue.

Required resolution: coordinate the runtime/database owners on a transaction-compatible current-authentication seam and a native combined regression. Preserve original-session/expiry/current-standing validation, operation ownership, separate capability authority, SQL fencing, pre-effect/post-asynchronous checks and rollback semantics. Do not resolve this by caching permission, accepting a newer login, extending timeouts, suppressing rejection or removing checks without review. No source repair was attempted because the parent explicitly assigned read-only ownership and the dependency has another owner.

The 57 controlled cases pass because their SQL transport returns rows without actual PostgreSQL lock ownership. The standalone authentication fifteen-case native suite qualifies that private capability in isolation; it does not invoke the new runtime's nested separate-pool rechecks while a worker transaction holds those rows. This source finding does not invalidate the standalone capability's recorded pass or invent a new native failure log.

## Other surface coverage

### Signed operation identity and immutable per-execution principal

No additional finding. runtime.ts:30-51 strictly validates the delivery/task envelope. Its existing deliveryAuthority verifies the canonical request hash, signature, expiry and actor/location scope before the callback. At lines 92-107 the exact parsed signed task operation becomes a frozen identity; no browser role or guessed operation is used. Missing/tampered operation tests refuse before auth/persistence access.

Lines 107-127 capture the original full canonical principal and reject any re-resolved change to session, mode, installation, actor, tenant, role or version. Each execute invocation creates its own closures and native transport. There is no mutable shared last-operation/principal variable. The reverse-order overlap case keeps B's and A's separate original session UUIDs and operation values; it is a controlled concurrency model, not native transaction qualification.

### Native transport, media and response admission

No additional finding. runtime.ts:129-163 wraps fetch, token resolution, native authority, admission acquisition, verifier and execution with before/after current checks. Admission acquisition releases its connection on authority refusal. Existing independent capture/admission verification remains mandatory. Token/authority withdrawal tests record no fetch; current identity is not inferred from a shaped capture candidate.

Repository dispatch/checkpoint wrappers at lines 181-189, worker current/media at lines 203-211 and response capture at lines 214-222 require the same operation record and original principal. Foreign operation refuses before media access. Capture verification, candidate mapping, independent admission and final current checks are separate; metrics stay unknown rather than fabricated zero. Existing native transport allowlists, bounded timeout and sanitized errors remain unchanged. A previously accepted external request cannot be recalled by a later local recheck.

bindings.ts:152-173 independently rechecks exact operation/principal around awaited stored-media retrieval and retains current source/lease checks plus exact PNG/delivery validation. Lines 175-205 preserve normalized linked digest, identities, state, timestamps, expiry and null metrics. Neither URL comparison nor DTO shape becomes proof of actual native capture or deployed media availability.

### Concrete resolver and capability separation

No additional confidentiality/authorization finding. bindings.ts:42-44 strictly validates operationRef/actor/location. Lines 95-117 pass only those fields to the trusted operation resolver and validate canonical principal identities, supported real mode and sole-owner role. The new concrete factory constructs the unchanged private Postgres resolver and requires its pool distinct from request and admission pools. Tests exercise its actual parameterized SQL query/role/commit contract through controlled rows and reject missing/aliased pools. Those checks do not provision actual login grants or solve S-PUB-OPAUTH-01.

The immutable authentication repository pin e8bd7a50 remains matched to Security 74fa1c3c and Quality bcd9ca10. Its exact operation lookup, original binding/session/lifetime, current standing and no-newer-login rules remain intact. Native fifteen-case dependency evidence is retained for that standalone scope, not attributed to new runtime execution.

### Pending and relay authority

No additional finding. Pending scans have no operationRef and retain a separately mandatory current authenticated-owner read capability. bindings.ts:129-144 compares full canonical returned identity to supplied original and refuses synthetic/foreign authority. It neither guesses an operation nor asks the command resolver to choose an arbitrary active session. Pending bootstrap and unchanged relay bootstrap remain concrete engineering gaps. A mandatory function signature or unit mock does not complete them.

### PII, financial effects, dependencies and default-off boundary

No additional finding. This delta adds no token storage, raw response logging, customer data export, provider endpoint, package/lockfile, role/grant, web producer, task index or activation flag. Original spend confirmation, source/lender/media/native qualification and actual capture remain independent required services. The default task still throws RUNTIME_UNBOUND. No provider request, charge, purchase or customer message occurred.

The author reported four broad duplication failures outside this packet and a zero-clone scoped scan. A separate worker/test duplication repair is now frozen but not graded here. Its stable worker hash is recorded only as the imported test dependency. This report does not clear that packet, broad duplication, canonical CI or a full branch gate.

## Findings and remediation summary

| Severity | Count | Fixed by reviewer | Outstanding |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 1 | 0 | 1 |
| Low | 0 | 0 | 0 |

No source was edited. The parent received S-PUB-OPAUTH-01 with coordinates before this report. The worker duplication owner supplied a frozen dependency before existing test/type verification; no active worker source was reviewed or modified as part of that separate repair. Only this report was authored.

## Independent verification and limits

| Check | Result |
| --- | --- |
| Two assigned runtime/binding unit files | 57 passed: 22 runtime, 35 binding/relay |
| Task and tooling TypeScript | Passed |
| Focused configured oxlint and Prettier | Passed |
| Boundary audit | 16 packages passed; two prohibited fixture edges rejected |
| Product-type and secret audits | Passed |
| Four source pins and handoff | Match assigned freeze before and after tests |
| Authentication source and preceding Security/Quality | Exact dependency pins match |
| Imported worker dependency after owner freeze | 598c81f9 pin matched before and after tests |
| Combined native separate-pool runtime | Not executed; source lock-order finding remains unresolved |

The author-reported 337 compatibility cases, mutation RED/GREEN and scoped duplication evidence are attributed rather than independently rerun. No new native payload, test, probe, server or provider call was added. Test models use synthetic signed envelopes/PNG/token/proof data and controlled SQL callbacks. Their success does not qualify authentic web producer reservation, deployed capability connections, native integrated locks, real media/native capture or operational safety scheduling.

## Frozen packet and supporting pins

| File | SHA-256 |
| --- | --- |
| apps/tasks/src/core/webinar-publisher-runtime.ts | 46c804195f3be7fb0f083d1570001c189b600157b9a6e315a0b2f2e51a14e396 |
| apps/tasks/src/core/webinar-publisher-runtime-bindings.ts | 502495da541fa8522884138efdd2876bf05af086cf83eca76e69cd47ab9b3fd2 |
| tooling/tests/unit/task-workers/webinar-publisher-runtime.test.ts | 06ebbce1adf850efa26e17510473b165cb2d280ebfbad526a2139d27e9ab63d6 |
| tooling/tests/unit/task-workers/webinar-publisher-bindings-relay.test.ts | 8e7f9fa2b51e1bba7c17fa7e421443b863a5a901651ee6a5cc834f267fc640d6 |
| library/requirements/reports/2026-10-14-webinar-publisher-operation-auth-binding-handoff.md | dc98dfb9ed463036a1d875fba988e398f39c24fbd60748fe749ff76183820c39 |
| packages/db/src/webinar-publisher-authentication-repository.ts, standalone dependency | e8bd7a50b5da15494a164ccffae2b1494354d751a0ea470f25326936f9e79d98 |
| supabase/migrations/20261014130000_webinar_publisher_auth.sql, standalone dependency | 5077017e0b8da49e7c6f96262d5a1d32c9bf3bcc87f9cf6dd5f4c801a92bcc55 |
| packages/db/src/webinar-publisher-repository.ts, supporting transaction seam | 7a1f8603cb519d9954e4272cf7ce8521cc112d20530bf894502f6dbd27ce5ab2 |
| supabase/migrations/20261014050000_webinar_publisher.sql, supporting lock seam | 9c463e5cac288a7d4d3f29e155fd19d3cad2e2e476f8a02c4a941f1b020654f3 |
| apps/tasks/src/core/webinar-publisher-worker.ts, separately frozen imported dependency only | 598c81f902da1497bdcd82dea596464249a291dce1ec9844e6c4186c3babebe7 |

## Handoff

Resolve S-PUB-OPAUTH-01 through the coordinated owners, freeze the repair and run fresh Security then Quality before approving concrete binding integration. Preserve this report as the current finding/evidence record. Root owns further native combined qualification, canonical current-head CI, Git/PR closeout and deployment. Actual verifier/current-command web producer, capability logins, owner-read/relay bootstrap, neutral current source, media lease, durable native capture and safety wiring remain required.

Earlier original-worker HOLD/native scoped resolution and failure histories retain their separate dispositions. No full branch, deployed publisher, actual provider result or overall product completion is cleared by this review.

Automatic approval review previously rejected configured whole-app startup with fixture DB/R2 hooks and an activation flag as "blocked by policy." That action remains unrun and was not repackaged or retried.
