# QA Report: native PostgreSQL publisher preflight verification

**Plan:** Accepted CTR-003 revision 1, exact original thirteen-file preflight packet.
**Audit date:** 2026-10-14
**Auditor:** quality-guardian, `/root/domain_final_quality`
**Baseline:** `24f2550f67893a54a7cd21e045e6e5ac34b09c9e`, branch `codex/webinar-publisher`, plus thirteen frozen source/test files below.
**Preceding matching Security:** `2026-10-14-webinar-publisher-preflight-security-review.md`, SHA-256 `ff7613aaa769957649584702ca6924a1bfbe85f02ea6c7c170688c155824608b`.
**Original retained Quality HOLD:** `2026-10-14-webinar-publisher-preflight-quality-review.md`, SHA-256 `3f30bc1af0f06c322af9e5b76cfdb12e4c1e11c1f84c6b428de41009828f9277`.

## Summary

**PASS for the exact packet's scoped native preflight verification gate.** An independent unchanged native PostgreSQL 17.11 run passed all 105 actual-wire cases using the original independent connections, resolving Q-PUB-PREFLIGHT-01 as a blocker to that scoped gate without repairing source or determining the earlier WASM failure predicate. Canonical Supabase/Linux CI, pgTAP, configured runtime, customer browser and provider qualification remain open; two additional broad static-contract timeout attempts remain failures despite the unchanged targeted inventory case subsequently passing in isolation.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Fresh publish/resume linked parity, admission, current checks and pre-attempt refusal traced to unchanged source. Broader product obligations remain open. |
| Correctness | ✅ | 105 native actual-wire cases and 276 source-unit cases pass; source pre-effect ordering and SQL fences re-read. |
| Alignment | ✅ | Accepted projection, exact spending decision, native allowlist, separate stop capability and provenance ports retained. |
| Gaps | ✅ | Native actual-database verification now succeeds at exact held pins. Canonical/platform/service obligations remain distinct. |
| Detrimental | ✅ | No source/assertion/grant/clock allowance/threshold/pool reservation change used to obtain native result. |

## Critical Issues (must fix)

None newly found in the exact packet. Prior Q-PUB-WORK-01 source closure remains as documented: publish/resume linked GET and independent admission precede spending reservation and POST (`apps/tasks/src/core/webinar-publisher-worker.ts:479-599`).

## Warnings (should fix)

No newly established source defect. Historical Q-PUB-PREFLIGHT-01 is **resolved only as a blocker to the native verification gate at these thirteen pins**. Its original report and two failed WASM runs remain untouched; their specific admission predicate/root cause is unresolved, and this report does not assert clock skew or platform causation.

The additional existing broad inventory check at `tests/security/phase0-boundary.test.ts:83-100` timed out at its unchanged five-second test limit in two combined contract invocations, while the other 25 cases passed each time. Its existing traversal reads shipped source and checks a closed outbound list:

```ts
it("limits outbound transport code to the required production adapters", async () => {
  const files = [
    ...(await sourceFiles(resolve("apps"))),
    ...(await sourceFiles(resolve("packages"))),
  ];
```

The one final authorized isolation used the same case with `--maxWorkers=1` and its exact test-name pattern. It passed in 413 ms, with the other five cases intentionally unselected. No source/guard/limit changed; the two combined failures are not relabeled passing runs, and no scheduler-pressure cause is established. Current-head full CI remains necessary for overall closeout.

## Suggestions (consider improving)

None.

## Plan Item Traceability

This is a native re-evaluation of the original packet, not a review of later authentication or bindings source. Current original pins match Security and the retained Quality traceability. Source parity/SQL reservation/refusal paths were re-read, and unchanged unit/actual native cases execute the assigned behavior.

| # | CTR-003 requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Distinct exact pinned projection, no property fallback | Scoped Pass | Worker`:85-118`; compiler`:192-260` | Existing strict action/projection binding retained. |
| 1.2 | Current principal, tenant/installation authority, synthetic refusal | Scoped Pass | Worker`:98-103`; runtime`:83-108`; SQL`:395-404` | Mandatory concrete resolver still requires implementation/qualification. |
| 1.3 | Sole owner and separate exact spending decision | Scoped Pass | Worker`:103-118` | Customer confirmation UI remains open. |
| 1.4 | Current authority/evidence before effect and replay | Scoped Pass | Worker`:174-223,528-599`; SQL`:453-482,553-562` | Native tests pass without weakened time/proof checks. |
| 1.5 | No silent material asset/budget/version replacement | Scoped Pass | Worker`:85-118,154-190`; compiler`:203-260` | Immutable projection and native identities retained. |
| 2 | Strict exact money/media/geography/end and unknown revision refusal | Scoped Pass | Worker`:208,231-263,548-566`; compiler`:192-260` | No revised compiler assumptions or caps introduced. |
| 3 | Qualified fixed native operations, exact media/account and actual IO parsing | Scoped Pass | Worker`:154-172,491-526`; transport`:172-196`; runtime`:121-136` | Actual deployed media/native provenance remains open. |
| 4 | Authenticated commands/status/UI and final confirmation | Open | Task`:9-29`; worker`:104-118` | Source plumbing is not finished customer launch flow. |
| 5.1 | Atomic unique command, durable outbox, one active lineage | Native Pass | SQL`:395-404,484-486,601-608`; PG test`:1658-1786` | Native independent-request case passes, unlike single-backend concurrency evidence. Canonical CI still required. |
| 5.2 | Persisted lease/deadline/current fences before mutation | Native/Scoped Pass | Worker`:174-230,568-599`; SQL`:411-450` | Original stage/lease margins and transport limits unchanged. |
| 5.3 | Operation/provider states distinct; truthful draft completion | Scoped Pass | Worker`:394-454,605-672` | Queued/pending not live. |
| 5.4 | Three persisted draft IDs and linked parity, no implicit publish | Scoped Pass | Worker`:265-353,461-477,613-637` | Existing recovery and exact IDs preserved. |
| 5.5 | Complete field/cardinality/account/parent parity | Scoped Pass | Worker`:154-171,491-512`; compiler`:192-260` | Real normalized response compared, not reconstructed expected state. |
| 5.6 | Fresh full draft parity before publish; ACK queued and bounded progress | Native/Scoped Pass | Worker`:479-599,638-672`; tests`:319-421,729-742` | Q-PUB-WORK-01 remains source-closed. |
| 5.7 | Uncertain lost write retains IDs, no blind repeat | Native/Scoped Pass | Worker`:234-236,354-398,679-687`; SQL`:487-491,533-552` | Actual persisted recovery cases execute unchanged. |
| 5.8 | Live requires linked published standing and Facebook IDs | Scoped Pass | Worker`:409-434`; tests`:743-788` | No impressions/CRM delivery fabricated. |
| 5.9 | Cancellation fences future dispatch, no remote recall guarantee | Native/Scoped Pass | Worker`:181-195,585-599`; SQL`:411-450` | Original generation and retained-attempt fences remain. |
| 6-pause | Owned stop independent of expired creative | Native/Scoped Pass | Worker`:238-264`; pause test`:59-115`; PG test`:1482-1534` | Exact separately admitted stop proof required. |
| 6-resume | Fresh complete paused parity/current evidence/dates/decision | Native/Scoped Pass | Worker`:479-599`; tests`:422-617`; SQL`:464-482` | Actual linked IDs and healthy child standing; no paused unpublished draft acceptance. |
| PREFLIGHT-DB | Latest exact admitted standing newer than operation, fresh/unrevoked | Native Pass | SQL`:464-482`; PG test`:564-695` | Both timestamps, native IDs and sixty-second horizon remain unchanged. |
| PREFLIGHT-REFUSAL | Atomic verified mismatch before attempt, retain owned IDs | Native Pass | Worker`:518-546`; SQL`:494-518,553-608`; PG test`:432-617` | Formerly failing wrong-stage and refusal fixtures pass natively; no unknown read fabricates failure evidence. |
| 6-withdrawal | Independent bounded best-effort pause schedule | Open | Worker`:212-223`; task`:9-29`; runtime`:141-151` | Current refusal exists; independent safety service/schedule remains unfinished. |
| 6-reporting | Fresh actual observation/null metrics/distinct delivery | Stored-state Pass; UI Open | Worker`:394-434`; repository`:121-169` | No customer reporting completion implied. |
| 6-audit | Safe exact hashes/actors/IDs and sanitized logging | Scoped Pass | Worker`:141-148,574-672`; task`:29-43` | No provider/token logs added. |
| Rollout | Unknown revision refusal and unbound/default-disabled runtime | Scoped Pass; wiring Open | Runtime`:26-67,155-157`; task`:9-29` | No activation by this audit. |
| Verification | Unit/source and native DB, then canonical/browser/provider proof | Native scoped Pass; remainder Open | Evidence below | Windows native evidence is not Supabase/Linux pgTAP or hosted proof. |
| NG-1 | No property QR/bulk messaging/customer-role scope | Pass | Thirteen-file packet | None introduced. |
| NG-2 | No direct Meta OAuth/deletion/automatic optimization | Pass | Native transport/worker branches | Fixed operation boundary unchanged. |
| NG-3 | No actual launch/spend/provider activation/deployment from acceptance | Pass | Audit activity and task default | No operational effect exercised. |

Locations abbreviated Worker, runtime, SQL, compiler and tests refer respectively to `apps/tasks/src/core/webinar-publisher-worker.ts`, `apps/tasks/src/core/webinar-publisher-runtime.ts`, `supabase/migrations/20261014050000_webinar_publisher.sql`, `packages/ghl/src/webinar-publisher-compiler.ts` and `tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts`. PG test refers to `packages/db/test/webinar-publisher.integration.test.mjs`.

## Files Changed

No source was changed by this re-evaluation. Original packet inventory remains:

- `apps/tasks/src/core/webinar-publisher-runtime.ts` (A): signed delivery and mandatory current/provenance composition.
- `apps/tasks/src/core/webinar-publisher-worker.ts` (A): persisted worker with fresh pre-effect parity/refusal/recovery.
- `apps/tasks/src/index.ts` (M): additive task/runtime exports.
- `apps/tasks/src/tasks/webinar-publisher-command.ts` (A): bounded task and unbound default.
- `packages/db/src/webinar-publisher-repository.ts` (M): truthful admission and exact observation times.
- `packages/db/test/webinar-publisher.integration.test.mjs` (M): unchanged 105 actual-wire cases and owned fixture cleanup.
- `packages/ghl/src/webinar-publisher-transport.ts` (M): independent owned stop qualification.
- `supabase/migrations/20261014050000_webinar_publisher.sql` (M): original pre-effect observation and refusal fences.
- `tooling/tests/unit/task-workers/webinar-publisher-pause.test.ts` (A): independent stop proofs.
- `tooling/tests/unit/task-workers/webinar-publisher-runtime.test.ts` (A): authority/provenance/unbound checks.
- `tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts` (A): publish/resume ordering and refusal cases.
- `tooling/tests/unit/webinar-publisher/native-adapter.test.ts` (M): native compatibility.
- `tooling/tests/unit/webinar-publisher/reconcile-admission.test.ts` (A): truthful observation/time/schema cases.

Only this new report and a new ignored raw test log were authored. Existing reports/logs, source, grants, fixtures, limits, migration order, Git state and provider configuration remain untouched. The active author's new authentication repository, exports and `20261014130000_webinar_publisher_auth.sql` are excluded, and that migration was not applied by the frozen runner. Root owns cluster stop and Git.

## Independent verification

| Executed check | Result |
| --- | --- |
| Frozen native runner, twenty migrations and actual PostgreSQL wire suite | 105 passed, zero failed/skipped/canceled, exit 0; 22.64 seconds |
| Existing original publisher unit directory plus worker/runtime/pause | 276 passed in seven files |
| Command plus phase0 contracts, first complete invocation | 25 passed/one unchanged 5s inventory timeout |
| Same complete contract invocation, unchanged serial repeat | 25 passed/one unchanged 5s inventory timeout |
| Exact inventory-case final isolation, maxWorkers 1 | One passed, five intentionally unselected; 413 ms case time |
| Task, HighLevel, database and tooling TypeScript | Passed |
| Boundaries and deliberate reverse-dependency rejection | Sixteen packages pass; two prohibited edges rejected |
| Secret audit and diff whitespace | Passed |
| Thirteen source pins checked before and after native run | Exact match |
| Security, original HOLD, handoff, frozen runner and retained logs | Exact match |

Runner `tmp/native-pg17-root/native-stack.mjs` uses actual postgres.js 3.4.9, creates only its random `oalo_test_publisher_native_` database on 127.0.0.1:55437, applies twenty exact migration files and invokes the existing integration file directly with node --test. No test filter, WASM, pool/reservation/clock shim or changed assertions are used. Environment checks report no NODE_OPTIONS, loader/import hint or publisher probe-hook flags. Existing `campaign-integration-support.mjs:57` retains maxConnections 4. The runner exits 0 and its finally drops only the database it created; root's separate catalog query confirmed no owned-prefix database remained. This reviewer introduced no catalog probe or changed runner.

The official EDB 17.11-5 portable Windows engine reports PostgreSQL 17.11, x86_64-windows, msvc 19.44.35229. It is a separate native loopback cluster, not a hosted database, installed system service or Supabase/Linux environment. Root's first native run independently passed 105 cases in 24.14 seconds. The native concurrent independent-request case passes; this qualifies that actual case on this engine, not every distributed/production race.

New raw log: `tmp/native-pg17-root/native-frozen-quality-independent.log`, SHA-256 `cacf25a3a2ddfb0fb3f9b9ca47be430eb44e607661673ddcf9793bb2a9a2760b`. It records the engine, all 20 migration hashes, every case and the exit. The previously failing resume wrong-stage and verified-refusal cases pass (`:137,155`); independent requests allow one active lineage (`:195`).

## Frozen source pins

| File | SHA-256 |
| --- | --- |
| apps/tasks/src/core/webinar-publisher-worker.ts | d32035ca66a1e53de6473326054cc47d239998c3db3933c037ad81d1ec986cf7 |
| apps/tasks/src/core/webinar-publisher-runtime.ts | c18ec773df9fe4d574aaa0932289bf0c817cc956a736dfd1730e4ff1540f19ec |
| apps/tasks/src/tasks/webinar-publisher-command.ts | c1b5470b754a03908ba12102e51d13634aa0a06accec2f061bd5114184605970 |
| apps/tasks/src/index.ts | 05e9f4ccc1a1e812d2972ab4f82708a2091e0676e1519fe68607e118563299b0 |
| packages/ghl/src/webinar-publisher-transport.ts | 872bc060d7386b4af1491a57db45e153ce0ceb21df8f9ab8d81f1535a21d4de6 |
| tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts | e533f57a01fb5c09ef4dce2f255c753e0f378d7b22013a9f061c4142110f5284 |
| tooling/tests/unit/task-workers/webinar-publisher-runtime.test.ts | f3e735b47e31e21c0e207a6b175e2d37eee86236751b6519a337568335afe81b |
| tooling/tests/unit/task-workers/webinar-publisher-pause.test.ts | 1e10b2771bc1f03cac1afea89bc4ad00e1c739399510b49ee4ecf2fc8584668d |
| tooling/tests/unit/webinar-publisher/native-adapter.test.ts | daf21ef9c8ffe8d003f7d19acd728d78b90db48493763243bdf0b9021b76fb0b |
| supabase/migrations/20261014050000_webinar_publisher.sql | 9c463e5cac288a7d4d3f29e155fd19d3cad2e2e476f8a02c4a941f1b020654f3 |
| packages/db/src/webinar-publisher-repository.ts | 7a1f8603cb519d9954e4272cf7ce8521cc112d20530bf894502f6dbd27ce5ab2 |
| packages/db/test/webinar-publisher.integration.test.mjs | a91101b2c8030c9ce38a6ff2fc2b3057af2288b6d6839d02b881f9a7fdd2beb0 |
| tooling/tests/unit/webinar-publisher/reconcile-admission.test.ts | 469a276bb724ed787802330bdb9d5cb8815d464452f3e8685cbe714b29b4c346 |

## Retained provenance and release limits

| Evidence | SHA-256 |
| --- | --- |
| Native handoff | 8c4c344868dd403feb76815eba6575889785e5c7ed36b9ca60a829c161c83f3f |
| Frozen native runner | e1b91e3587ccf520724409e5eb0b019a2cd3b181fb0feb64173b2d831d48d10d |
| Root native log | 348b4bddee66f6f4faac77940197a6e00543063d44c513e38882bdc777af94d5 |
| Matching preceding Security | ff7613aaa769957649584702ca6924a1bfbe85f02ea6c7c170688c155824608b |
| Original unmodified Quality HOLD | 3f30bc1af0f06c322af9e5b76cfdb12e4c1e11c1f84c6b428de41009828f9277 |
| First 104/105 WASM Quality log | 40c09fbdc0d80920cd50178390250933a582fc68d29d9ee770869890825f2cf5 |
| Second 104/105 WASM Quality log | a740ecef46ecf1a8986c778b54cfd8c0f3cebefe8cd4ddec2bb93925ce8760cb |
| Earlier wrong-stage isolated WASM pass | d19daceefe314c8d0db7d9c54314612ef27ab80f87f3261b80d04e64e9cce64f |

The two 104/105 failures remain genuine recorded observations before different target assertions. Later unchanged 105-pass WASM repetitions and precision diagnostics did not prove the failure predicate, and this native success does not either. No temporal allowance or authority guard is waived. Native clean execution now supplies the missing scoped verification evidence at matching Security/source pins; it does not rewrite old reports, call their failed runs successful or qualify a different source packet.

Root still needs current-main/PR qualification and complete canonical Supabase/Linux CI including pgTAP/browser. Resolve any persistent broad static timeout through assigned diagnosis without suppression. Implement and review immutable original-command authentication, neutral source/raster, persisted media leases, durable actual native captures/independent admission, runtime wiring, safety scheduling and customer UI, then obtain controlled provider qualification. No deployment, paid launch, provider probe, whole-app activation or full publisher completion was performed or authorized by this re-evaluation.
