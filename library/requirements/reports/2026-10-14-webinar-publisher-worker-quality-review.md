# QA Report: Native webinar publisher worker and database recovery

**Plan documents:** Accepted `library/knowledge/private/contracts/CTR-003-webinar-highlevel-publisher.md` revision 1, `WEBINAR_PUBLISHER_LEDGER.md`, worker handoff and reconcile-stage handoff below.
**Audit date:** 2026-10-14.
**Base branch:** `origin/main`; assigned packet baseline HEAD `24f2550f67893a54a7cd21e045e6e5ac34b09c9e`.
**Head:** `codex/webinar-publisher`, baseline HEAD plus the frozen thirteen source/test files below.
**Auditor:** `/root/publisher_alias_quality`, quality-guardian.

## Summary

**BLOCKED: one Critical plan gap, Q-PUB-WORK-01.** The publish-stage consumer sends its publication request before obtaining a fresh provider draft readback, then compares parity on the publication response; CTR-003 section 5.6 requires fresh draft parity before that request. The bounded recovery, refusal and cleanup paths pass the scoped checks, but repair this publish ordering and obtain fresh Security then Quality before treating the combined packet as complete.

Security preceded this audit: the combined Security report SHA-256 is `14b3d307307288c7e4b82706e09350a3c040dd21c101d873439ef53c0274e90d`, with all thirteen source pins verified. This is a plan-relative worker/database audit, not a whole-PRD, production or provider acceptance. The installed Quality persona/Weapon, v2 procedure, relevant guides/template and repository instructions were applied. The reviewer owns this new report only, and made no production, test, Git or provider changes.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ❌ | Fresh pre-publish linked draft parity required by CTR-003 section 5.6 is missing in the concrete consumer. |
| Correctness | ❌ | Publish parity is checked after the effect, too late to prevent publishing a drifted draft. Recovery and parity-refusal checks otherwise pass. |
| Alignment | ✅ | Concrete repository/native transport composition, signed envelope, reserved migration and strict separate pause qualification match the assigned boundaries. |
| Gaps | ⚠️ | A pre-publish ordering/refusal regression is needed. Current canonical CI, independent-backend races and final deployed bindings remain unqualified. |
| Detrimental | ✅ | No dependency, timeout, grant or activation widening detected in the assigned packet; source/current-authority fences and safe logging retained. |

## Critical Issues (must fix)

- [ ] **Q-PUB-WORK-01: Publish occurs before fresh draft parity**: `apps/tasks/src/core/webinar-publisher-worker.ts:432-480`, `:522-536`; `tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts:426-433`.

  Accepted CTR-003 section 5.6 requires the explicit publish consumer to obtain fresh provider draft parity before sending one publish request. The worker's linked-read branch runs only for `parity`, `progress` and `reconcile` (`:246`), so an operation at `publish` goes directly to `beginDispatch` and native publication. Its `compareWebinarPublisherReadBack` call for this action runs against the POST response after the effect. A remote draft can change after the earlier draft-ready observation; this order can publish the changed draft before detecting the mismatch.

  ```ts
  const dispatched = await ports.repository.beginDispatch(principal, {
    ...fence(record, workerRef),
    requestHash: hash,
  });
  // After the fence check, transport.execute sends operation === "publish".
  ```

  The command's `actionReady` checks saved `draft_ready` plus retained ad identity (`packages/application/src/webinar-publisher-command.ts:486-502`); its capability checks cover qualification, budget, schedule and ownership rather than fetching current linked entities. The mandatory `assertCurrent` and `assertDispatch` interfaces are current-authority requirements, but this packet supplies no concrete fresh pre-publish parity implementation through them. The existing publish test passes with exactly three HTTP requests: publish POST, progress GET, linked GET. Passing that test does not establish the required order.

  Suggested repair: before recording or sending the publish effect, obtain a bounded typed linked read of the exact retained campaign, verify the actual normalized digest, owned location/account/parent IDs, full compiled parity and any required independently verified capture, then recheck current authority/fences. A changed, unavailable, malformed, incomplete or unverified draft must refuse before publish. Add an injected transport regression asserting readback precedes POST and parity drift produces zero publish requests; retain the existing acknowledgement, uncertainty, live-standing and deadline tests. No new probe or payload was authored in this audit.

## Warnings (should fix)

None in addition to the Critical above. Explicitly pending runtime/provider composition and canonical CI are qualification limits, not newly discovered implementation claims.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Plan requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| WORK-01 | Bind exact task, principal, summary, projection, action and original spending decision. | ✅ | `apps/tasks/src/core/webinar-publisher-worker.ts:84-125`, `:188-201` | Canonical hashes and current role/session/source checks retained; complete replay rechecks current authority. |
| WORK-02 | Signed delivery precedes current principal and database access. | ✅ | `apps/tasks/src/core/webinar-publisher-runtime.ts:26-108` | Strict envelope and existing HMAC authority; mandatory current resolver rejects synthetic mode and mismatched tenant. |
| WORK-03 | Concrete persistence/transport; no memory default or permissive verifier. | ✅ | Runtime `:67-151`; task `:9-29` | Concrete repository/admission service/native transport; default task deliberately throws `RUNTIME_UNBOUND`. Trusted deployment bindings remain open. |
| WORK-04 | Persist effects before send, fence retries/cancellation and bound one delivery. | ✅ | Worker `:192-210`, `:456-479`, `:560-569`; task `:16-20` | 55-second lease, six iterations, 40-second start budget, ten-second lease margin, concrete five-second transport timeout, one SDK attempt. No instantaneous remote recall guarantee. |
| WORK-05 | Campaign, adset, ad then actual linked parity; draft never auto-publishes. | ✅ | Worker `:246-340`, `:432-438`, `:489-520`; worker test `:373-385` | Distinct native identities, parent/hash and compiler parity assertions; explicit publication remains a separate command. |
| WORK-06 | Fresh linked draft parity before publication. | ❌ | Worker `:432-480`, `:522-536` | Q-PUB-WORK-01; current parity comparison occurs after publish. |
| WORK-07 | Queued acknowledgement is not live; observed complete standing and real IDs required. | ✅ | Worker `:254-273`, `:375-404`, `:522-555`; tests `:426-451` | Linked status/parents/cardinality/IDs, actual digest and independent admission checked. Missing data remains uncertain/null. |
| WORK-08 | Lost responses and unknown identities never cause blind recreation. | ✅ | Worker `:215-217`, `:560-569`; tests `:401-425`, `:505-527` | Unknown campaign stays uncertain, no name search or response-only identity adoption. |
| WORK-09 | Known partial draft recovery uses exact cumulative identities/original hash and admitted readback. | ✅ | Worker `:334-365`, `:410-423`; SQL `:487-551`; PG tests `:532-753` | Current action/source/proof, latest retained attempt, no other unresolved stage, observation freshness and fencing are required. All-three-ID recovery still passes parity. |
| WORK-10 | Persist verified terminal parity refusal and retain IDs without publish/remote rollback claim. | ✅ | Worker `:299-329`; SQL `:473-485`, `:542-569`; tests `:315-347`; PG `:377-530` | Independent failed observation, current proof and confirmed retained ad attempt; local `failed/PARITY_MISMATCH`, operation/outbox complete. |
| WORK-11 | Independently qualified owned pause can stop expired creative; resume remains qualified. | ✅ | `packages/ghl/src/webinar-publisher-transport.ts:172-196`; worker `:219-244`, `:381-383`; pause tests `:60-115` | Fresh pause proof bound to campaign/location/account; legacy full launch receipt refused as stop proof. Acknowledgement alone is not paused standing. |
| DB-01 | Add truthful drafting/draft-ready admission states without relaxing strict proof. | ✅ | `packages/db/src/webinar-publisher-repository.ts:82-121`; reconcile-admission test | Two new states only; unknown keys/live IDs/trusted verifier retained. |
| DB-02 | Preserve original authority, RLS, grants, deadline, aliases and text-to-JSONB repairs. | ✅ | Migration `:128-165`, `:225-232`, `:395-470`; repository `:223-239`, `:431-445` | Diff inspection shows new guarded checkpoint paths, no catalog/capability/parameter-binding changes. |
| DB-03 | Retire only owned disposable fixture identities; preserve other fixtures and immutable evidence. | ✅ | PG fixture `:207-257`, cleanup test `:335-375` | Returned IDs/counts checked; retired principal refused. Full diagnostic leaves zero active fixture locations; unchanged seeder inserts ten then zero. |
| VERIFY-01 | Current focused worker/database/contract compatibility and typechecks. | ✅ | Tests and independent verification below | Actual current checks passed; no final full-suite claim inferred from earlier candidate coverage. |
| VERIFY-02 | Current canonical native PostgreSQL, pgTAP, independent-backend locks and browsers. | ⚠️ | Canonical workflow and database gate | Previous CI is older source. Fresh canonical run remains required after repair and fresh reviews. |
| NG-01 | No direct Meta stack, deletion, customer roles, credential fallback, purchase or automatic spending activation. | ✅ | Complete scoped diff, worker/runtime/task and native transport | Existing HighLevel allowlist and single-LO internal authority retained; no such operational action performed. |
| NEXT-01 | Trusted deployed bindings/admission login, outbox signer/relay, withdrawal-pause scheduling. | 🟦 | Runtime mandatory dependencies and unbound task; handoff remaining bindings | Actual source composition still open, not a credential-only blocker or successful deployed consumer. |
| NEXT-02 | Authenticated HTTP/customer summary, draft/publish/status/pause/resume journey and real provider qualification. | 🟦 | CTR-003 sections 4-6 and verification obligations; ledger | Outside assigned packet and incomplete. No provider App Test or live launch established. |

Independent verification at frozen pins:

- Eight current focused unit files: **276 passed**. These comprise worker/runtime/pause/native/command compatibility plus database/admission/foundation; the subsets overlap Security's 210 and 230 totals and are not added together.
- All task-worker unit files: **70 passed**. Exact outbound security inventory and publisher command contracts: **26 passed across two contracts files**. These overlap the focused units; no aggregate full-suite count is asserted.
- DB build, tasks/GHL/DB typechecks and three connectionless discovery/identity/admission cases passed. `git diff --check` passed.
- Inspected and reran the existing `reconcile-stack.mjs` and existing one-connection hook without modifying them. All twenty complete migrations were applied in sorted transactions to PostgreSQL **17.5 WASM**, using existing PGlite **0.3.15**, socket **0.0.20**, actual **postgres.js 3.4.9** and freshly compiled repository. **47 passed, zero failed/skipped**; **zero active fixture locations** remained. Unchanged seeder inserted **ten rows**, then **zero** on its idempotent rerun, both exit zero.
- This disposable loopback diagnostic changes only its harness pool capacity to one. It does not qualify independent-backend races, native locks, pgTAP, Supabase services, signed browser sessions, hosted migrations or provider behavior. No new diagnostic, adversarial payload, production assertion or external request was created.
- All thirteen combined source pins, both handoff hashes, Security hash and accepted contract hash independently verified. Handoff RED histories and final replacement worker/test pins were read. The author's 3,359-case coverage pass belongs to the earlier candidate before terminal parity-refusal continuation; no new full-suite pass is asserted for the final bytes.
- Minor read-path issues retained: a first search used the plural command filename and a PowerShell wildcard path unsupported by rg. Discovery located the singular existing file, which was read before classifying Q-PUB-WORK-01. No product file was affected.

Frozen combined source:

| File | SHA-256 |
| --- | --- |
| `apps/tasks/src/core/webinar-publisher-worker.ts` | `bb031a9fed7a77fcb6907d5e8b1f29159c08cb43cdb8d27e8b4eb5923c0d981e` |
| `apps/tasks/src/core/webinar-publisher-runtime.ts` | `c18ec773df9fe4d574aaa0932289bf0c817cc956a736dfd1730e4ff1540f19ec` |
| `apps/tasks/src/tasks/webinar-publisher-command.ts` | `c1b5470b754a03908ba12102e51d13634aa0a06accec2f061bd5114184605970` |
| `apps/tasks/src/index.ts` | `05e9f4ccc1a1e812d2972ab4f82708a2091e0676e1519fe68607e118563299b0` |
| `packages/ghl/src/webinar-publisher-transport.ts` | `872bc060d7386b4af1491a57db45e153ce0ceb21df8f9ab8d81f1535a21d4de6` |
| `tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts` | `8b83327c40c6718d3c2d58cb875c49a40b9239a96d3124d3d1c69b92885c3939` |
| `tooling/tests/unit/task-workers/webinar-publisher-runtime.test.ts` | `f3e735b47e31e21c0e207a6b175e2d37eee86236751b6519a337568335afe81b` |
| `tooling/tests/unit/task-workers/webinar-publisher-pause.test.ts` | `1e10b2771bc1f03cac1afea89bc4ad00e1c739399510b49ee4ecf2fc8584668d` |
| `tooling/tests/unit/webinar-publisher/native-adapter.test.ts` | `daf21ef9c8ffe8d003f7d19acd728d78b90db48493763243bdf0b9021b76fb0b` |
| `supabase/migrations/20261014050000_webinar_publisher.sql` | `9b5f000cb0312c5867b3a691b7e8ca63db9f2fa88e9244cebcf72ac2c42c955d` |
| `packages/db/src/webinar-publisher-repository.ts` | `533a5ffe9e407af3ecb35e2920156e3ca46793f9e1e94b2ebcb2a11af899be44` |
| `packages/db/test/webinar-publisher.integration.test.mjs` | `5551269b7692bc4596855266105d5dbd66cceba9b71f1039cdf4559e1adbe1f4` |
| `tooling/tests/unit/webinar-publisher/reconcile-admission.test.ts` | `09610a5324b4cf215b0b263ffeb193839bccac55fa801bb4b589917fa6d45527` |

Evidence pins: worker handoff `10c89e8d459127518aa09a88c89d8438112e9dd7d892811b53f302c8337135af`; DB handoff `c2dea42aaa3ba101aff6ac689194af5295700cc44b2bf73e569fa3950478f923`; accepted CTR-003 `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`; preceding combined Security `14b3d307307288c7e4b82706e09350a3c040dd21c101d873439ef53c0274e90d`.

## Files Changed

- `apps/tasks/src/core/webinar-publisher-runtime.ts` (A): concrete repository/native transport composition and strict signed envelope with required trusted dependencies.
- `apps/tasks/src/core/webinar-publisher-worker.ts` (A): bounded stage/effect consumer, uncertainty, draft recovery, terminal parity refusal and observed control standing; Critical pre-publish ordering gap above.
- `apps/tasks/src/index.ts` (M): exports worker/runtime/task APIs.
- `apps/tasks/src/tasks/webinar-publisher-command.ts` (A): bounded one-attempt SDK task and unbound default.
- `library/requirements/reports/2026-10-14-webinar-publisher-reconcile-stage-handoff.md` (A): database recovery/refusal/cleanup evidence.
- `library/requirements/reports/2026-10-14-webinar-publisher-worker-handoff.md` (A): worker scope, retained test history and final replacement pins.
- `library/requirements/reports/2026-10-14-webinar-publisher-worker-quality-review.md` (A): this report, the reviewer's only source change.
- `library/requirements/reports/2026-10-14-webinar-publisher-worker-security-review.md` (A): preceding combined Security review.
- `packages/db/src/webinar-publisher-repository.ts` (M): two strict observation states.
- `packages/db/test/webinar-publisher.integration.test.mjs` (M): twenty-five actual SQL recovery/refusal/cleanup cases and exact fixture retirement.
- `packages/ghl/src/webinar-publisher-transport.ts` (M): strict independently owned pause qualification.
- `supabase/migrations/20261014050000_webinar_publisher.sql` (M): guarded draft reconciliation and terminal parity refusal.
- `tooling/tests/unit/task-workers/webinar-publisher-pause.test.ts` (A): expired-creative owned stop and expired-resume checks.
- `tooling/tests/unit/task-workers/webinar-publisher-runtime.test.ts` (A): concrete composition, authority, strict envelope and unbound-runtime tests.
- `tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts` (A): lifecycle/fence/parity/uncertainty tests, missing pre-publish ordering assertion.
- `tooling/tests/unit/webinar-publisher/native-adapter.test.ts` (M): current independent pause proof fixtures/refusals.
- `tooling/tests/unit/webinar-publisher/reconcile-admission.test.ts` (A): strict truthful draft-state admissions.

The orchestrator was notified of Q-PUB-WORK-01 before report release. Preserve this blocked snapshot, repair within assigned ownership, run fresh Security then Quality and current canonical CI, and complete trusted consumer/HTTP/UI/provider qualification before a full release claim.
