# QA Report: Webinar publisher fresh pre-effect parity

**Plan document:** Accepted `library/knowledge/private/contracts/CTR-003-webinar-highlevel-publisher.md`, revision 1.
**Audit date:** 2026-10-14.
**Base branch:** `origin/main`; assigned packet baseline HEAD `24f2550f67893a54a7cd21e045e6e5ac34b09c9e`.
**Head:** `codex/webinar-publisher`, baseline plus the thirteen frozen source/test files below.
**Auditor:** `/root/publisher_preflight_quality`, quality-guardian.

## Summary

**HOLD for verification: one Warning, Q-PUB-PREFLIGHT-01, and no new Critical source finding.** The exact reviewed source closes Q-PUB-WORK-01: publish and resume obtain independently verified complete linked parity before effect reservation and POST, with current authority, qualification, lease, cancellation and identity guards. Two independent executions of the existing complete PostgreSQL diagnostic each fail one admission fixture before its target assertion, so a clean final QA gate requires author diagnosis and repair followed by fresh Security and Quality.

Security preceded this audit. Its exact report SHA-256 is `ff7613aaa769957649584702ca6924a1bfbe85f02ea6c7c170688c155824608b`; every one of its thirteen source pins matches. The accepted contract SHA-256 is `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`. Worker and database append-only handoffs match `5a28b7c65a9531a075a159dade2dae35708551d63e0e9c8a0e126a4738b5e0db` and `62b55990ad64e5230019d13e491ebcf6e978e88d67378f9d1802b88e09cbffd6`. The retained blocked Quality report remains unchanged at `2336f0f754190b7475f3ec4e5a0f20acf692e36e24d9cd6f52666e62d3b67c38`.

This is an assigned worker/database preflight repair audit, not approval of the entire publisher PRD, branch, deployed runtime, provider or UI. The managed Quality Weapon, integrated procedure, guides and report template were applied. Only this report was authored. Existing tests produced ignored disposable diagnostic logs; no source, test, grant, timeout, dependency, Git, provider, credential or production mutation occurred.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Assigned fresh publish/resume read, standing, admission, current checks and atomic pre-attempt refusal are present. Broader product obligations remain explicitly open. |
| Correctness | ✅ | Source order is linked GET, verify/admit, current checks, reserve, current checks, POST. Existing unit and contract checks pass; no provider qualification is inferred. |
| Alignment | ✅ | Accepted CTR-003 revision, separate pause capability, immutable projection/decision, native allowlist and mandatory provenance ports are preserved. |
| Gaps | ⚠️ | Q-PUB-PREFLIGHT-01 prevents clean actual-database verification on this packet. Independent-backend races, canonical CI and deployed consumers remain unqualified. |
| Detrimental | ✅ | No weakened guard, fixture assertion, activation default, grant, retry, coverage threshold or dependency change detected in the assigned repair. |

## Critical Issues (must fix)

None newly identified in this assigned repair. **Q-PUB-WORK-01 is closed at these source pins**, not deleted from history: worker `apps/tasks/src/core/webinar-publisher-worker.ts:479-528` performs typed linked read and independent admission before `:575-599` reserves and sends publish or resume. Full compiler comparison is at `packages/ghl/src/webinar-publisher-compiler.ts:192-260`. Tests at `tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts:319-421` require zero publication dispatch on drift, unavailable/malformed response, unverified capture, cancellation and proof expiry. Resume equivalents at `:422-617` require fresh paused standing, real Facebook identities, healthy children and the correct GET/POST/progress/GET order.

## Warnings (should fix)

- [ ] **Q-PUB-PREFLIGHT-01: Existing actual-wire admission setup fails intermittently before the intended assertion**: `packages/db/test/webinar-publisher.integration.test.mjs:159-170`, `:309-318`, `:385-386`, `:405-410`, `:450-456`, `:738-747`; admission guard `supabase/migrations/20261014050000_webinar_publisher.sql:336-341`.

  Both full unchanged twenty-migration PostgreSQL 17.5 WASM diagnostics execute 105 cases, with 104 passing and one failing. The first fails in `refuses resume preflight terminal failure with wrong-stage`; the second fails in `atomically persists a verified parity refusal without losing created native identities`. Each raises `PUBLISHER_ADMISSION_INVALID` at admission function line 8 before the intended checkpoint assertion. The existing exact-name repeat of the first case passes, leaves zero active fixture locations, and permits unchanged review seeding with ten inserted rows then zero.

  ```js
  const observation = {
    ...f.observation,
    state: "failed",
    observedAt: new Date().toISOString(),
    readBackHash: "f".repeat(64),
  };
  await f.admit("observation", observation);
  ```

  The guard rejects future observation time, expired receipt, inactive installation or absent current binding. The fixtures use host `new Date()` for fresh observations. **Exact timestamp skew or another specific failed predicate is not proven by the preserved logs**, so this report does not assert a root cause. Suggested: have the database owner diagnose the failing predicate and make the owned fixture establish valid observation timing against the database while preserving operation ordering, exact receipt/normalized timestamps, future-time refusal, the sixty-second horizon and every target assertion. Do not broaden production clock allowance, reset guards, remove cases or count the earlier Security diagnostic as overriding these failures. Fresh matching Security and Quality are required after any repair.

  Reproduction uses the existing runner, without added payloads or probes:

  ```powershell
  $env:PUBLISHER_PROBE_PG17='1'
  $env:PUBLISHER_PROBE_SINGLE='1'
  node tmp/publisher-deadline-probe/reconcile-stack.mjs
  node tmp/publisher-deadline-probe/reconcile-stack.mjs '--test-name-pattern=^refuses resume preflight terminal failure with wrong-stage$'
  ```

  This is a Warning about unstable verification setup, not an established production dispatch defect. It holds this audit's clean verification gate until diagnosed.

## Suggestions (consider improving)

None.

## Plan Item Traceability

All agreed CTR-003 sections are represented below. A scoped Pass verifies the assigned consumer/SQL behavior only. `Open, outside packet` identifies required engineering or qualification still outstanding and never counts as implemented or as product completion.

| # | Plan requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Distinct pinned projection, no property fallback | Scoped Pass | Worker `:85-118`; `packages/ghl/src/webinar-publisher-compiler.ts:192-260` | Exact bound summary/projection/action; command schemas unchanged. |
| 1.2 | Current server principal, tenant, installation, internal authority; refuse synthetic mode | Scoped Pass | Worker `:98-103`; runtime `:83-108`; SQL `:395-404` | Mandatory current resolver and database authority, no synthetic production fallback. |
| 1.3 | Sole owner and separate exact spending decision | Scoped Pass | Worker `:103-118` | Self-review permitted internally; preparation approval cannot substitute for action confirmation. Customer UI is open. |
| 1.4 | Recheck current authority/evidence before effect and actionable replay | Scoped Pass | Worker `:210-223`, `:174-196`, `:528-586`; SQL `:453-482`, `:553-562` | Current source and qualification checked after async read and atomically at reservation. |
| 1.5 | No silent material version/asset/budget replacement | Scoped Pass | Worker `:85-118`, `:154-171`, `:189-190`; compiler `:203-260` | Immutable exact summary and retained identity binding preserved. |
| 2 | Strict projection, exact end/money/media/geography and unknown-revision refusal | Scoped Pass | Worker `:208`, `:231-263`, `:548-566`; compiler `:192-260` | Compiler/projection contracts unchanged; no truncation, end rollover or hard-cap promise. |
| 3 | Fixed qualified native operations, exact media and connected account; parse actual IO | Scoped Pass | Worker `:154-172`, `:491-526`; `packages/ghl/src/webinar-publisher-transport.ts:172-196`; runtime `:121-136` | Native route/version/token boundaries preserved. Deployed discovery/media/capture qualification remains open. |
| 4 | Summary and command HTTP/status/UI with exact final confirmation | Open, outside packet | Existing decision binding worker `:104-118`; task `:9-29` | Proposed authenticated HTTP/customer launch journey is not implemented by this packet. |
| 5.1 | Atomic unique command, durable outbox and one active lineage | Preserved, scoped diagnostic | SQL `:395-404`, `:484-486`, `:601-608`; PG test `:1658-1786` | Existing actual tests execute; native independent-backend concurrency remains for CI. |
| 5.2 | Fenced persisted lease, bounded deadline and current checks before external mutation | Scoped Pass | Worker `:174-196`, `:214-230`, `:568-599`; SQL `:411-450` | 55-second claim, six steps, 40-second delivery budget, ten-second lease margin, five-second composed transport timeout. |
| 5.3 | Separate operation/provider state and truthful draft completion | Scoped Pass | Worker `:394-454`, `:605-672` | Draft-ready and queued/pending are distinct from live. |
| 5.4 | Three persisted draft identities and linked parity, no implicit publish | Scoped Pass | Worker `:265-353`, `:461-477`, `:613-637`; worker test `:676-689` | Existing creation/recovery behavior retained. |
| 5.5 | Complete actual field/cardinality/account/parent parity | Scoped Pass | Worker `:154-171`, `:491-512`; compiler `:192-260` | Copy, media, destination, objective/category, page, geography/placement and budget/schedule compared, not reconstructed from request. |
| 5.6 | Fresh complete draft parity before publish; ACK queued, bounded progress | Scoped Pass | Worker `:479-599`, `:638-672`, `:274-301`; worker test `:319-421`, `:729-742` | Original Q-PUB-WORK-01 closed. Unknown/unverified read cannot reserve/send. |
| 5.7 | Unknown/lost write is uncertain, retain IDs and never blindly replay creation/control | Scoped Pass | Worker `:234-236`, `:354-398`, `:679-687`; SQL `:487-491`, `:533-552` | Known exact draft recovery retained; unknown identities are not guessed. |
| 5.8 | Live requires actual linked published standing and all Facebook IDs | Scoped Pass | Worker `:409-434`; worker test `:743-788` | Progress complete or HTTP ACK alone is insufficient. No impressions/CRM delivery claim. |
| 5.9 | Cancellation fences future dispatch; cannot recall a possible remote write | Scoped Pass | Worker `:181-195`, `:585-599`; SQL `:411-450`; worker test `:380-390`, `:485-497`, `:601-617` | No immediate remote recall guarantee. |
| 6-pause | Stop owned campaign independently of expired creative | Scoped Pass | Worker `:238-264`; transport `:172-196`; pause test `:59-115`; PG test `:1482-1534` | Separate exact owned stop proof remains mandatory; no budget/retarget operation. |
| 6-resume | Fresh complete paused parity, current evidence, dates and spending decision | Scoped Pass | Worker `:479-599`; worker test `:422-617`; SQL `:464-482` | Campaign PAUSED, actual Facebook IDs, healthy PAUSED/PUBLISHED children; paused unpublished drafts refused. |
| PREFLIGHT-DB | Latest exact admitted standing newer than operation, fresh and unrevoked before reserve | Scoped source Pass; verification Hold | SQL `:464-482`; PG test `:564-695` | Current operation action/stage, exact retained IDs, both timestamps, sixty-second horizon; later failed/uncertain standing prevents old success reuse. Q-PUB-PREFLIGHT-01 affects complete diagnostic reliability. |
| PREFLIGHT-REFUSAL | Atomically persist verified mismatch before any attempt, preserve owned IDs | Scoped source Pass; verification Hold | Worker `:518-546`; SQL `:494-518`, `:553-608`; PG test `:432-617` | Exact fresh failed digest/time, current source/proof, null request hash, zero prior attempts; internal PARITY_MISMATCH, lease/outbox completion. Unknown GET never fabricates failed standing. |
| 6-withdrawal | Immediate local refusal and bounded independent best-effort pause scheduling | Open, outside packet | Current refusal worker `:212-223`; task `:9-29`; runtime `:141-151` | Independent safety scheduler, authority and observation consumer remain active engineering work. Pending task accessor alone is not that scheduler. |
| 6-reporting | Actual observation freshness, null metrics, separate approval/publication/delivery | Scoped stored-state Pass; UI Open | Worker `:394-434`; repository `:121-169` | Strict normalized state/time and live-ID refinement preserved; customer reporting UI outside packet. |
| 6-audit | Exact safe hashes, action/stage/actor/IDs and sanitized logging | Scoped Pass | Worker `:141-148`, `:574-672`; task `:29-43` | No token/media secret/raw response log; detailed review of logging did not duplicate Security acceptance. |
| Rollout | Reject unknown revision; default-disabled/unbound; supported consumers before enablement | Scoped Pass; deployed composition Open | Runtime `:26-67`, `:155-157`; task `:9-29` | Installed default remains RUNTIME_UNBOUND. Concrete constructor injection is not deployed authority. |
| Verification | Unit/source plus actual PG, native concurrency, browser and provider obligations | Hold / Open | Checks below; task `:9-29` | Failed complete diagnostics preserved. Canonical CI, pgTAP, native races, customer browser and controlled App Test remain required. |
| NG-1 | Property collateral, QR manager, bulk messages and new customer roles outside CTR-003 | Pass | Scoped thirteen-file inventory below | None added. |
| NG-2 | No direct Meta OAuth/Graph token storage, deletion or automatic optimization | Pass | Fixed native transport and worker branches `:457-478` | No new route, integration/account switch or mutation kind. |
| NG-3 | No live spend, provider qualification, deployment or credential activation implied by contract | Pass | Task `:9-29`; complete audit activity | No operational action performed. |

### Verification evidence and limits

| Independent check on current pins | Result |
| --- | --- |
| Frozen source pins, accepted contract, latest Security, both append-only handoffs and retained blocked report | All match |
| Existing publisher unit directory plus worker/runtime/pause | 276 pass across seven files |
| Existing command contracts and outbound/security boundary | 26 pass across two files |
| Existing connectionless repository identity/admission | Three pass |
| Task, HighLevel, database and tooling TypeScript | Pass |
| Boundary audit | Sixteen packages pass; two prohibited fixture edges rejected |
| Secret audit | Six source roots and public environment boundary pass |
| Existing full PostgreSQL 17.5 WASM actual-wire diagnostic, first execution | 104 pass / one fail / zero skipped, all twenty exact migrations |
| Existing exact-name wrong-stage repeat | One pass; zero active locations; unchanged seeder ten rows then zero, both exit 0 |
| Existing full PostgreSQL 17.5 WASM actual-wire diagnostic, second execution | 104 pass / one fail / zero skipped, all twenty exact migrations |
| Compiler, command schema, root package and lockfile repair delta | Unchanged |
| Diff whitespace | Pass before report creation |

The inspected existing diagnostic uses PGlite 0.3.15/socket 0.0.20, PostgreSQL 17.5 and actual postgres.js 3.4.9 traffic on a disposable loopback socket. The existing hook limits the campaign harness to one backend while keeping SQL and assertions unchanged. Thus even its passing concurrent request case does not establish native independent-backend locking. No new diagnostic code, payload or probe was introduced. Canonical CI and actual hosted/provider qualification cannot be replaced by these results.

| Preserved QA log | SHA-256 |
| --- | --- |
| `tmp/publisher-deadline-probe/preflight-quality-existing-pg.log` | `40c09fbdc0d80920cd50178390250933a582fc68d29d9ee770869890825f2cf5` |
| `tmp/publisher-deadline-probe/preflight-quality-existing-pg-repeat.log` | `a740ecef46ecf1a8986c778b54cfd8c0f3cebefe8cd4ddec2bb93925ce8760cb` |
| `tmp/publisher-deadline-probe/preflight-quality-wrong-stage-repeat.log` | `d19daceefe314c8d0db7d9c54314612ef27ab80f87f3261b80d04e64e9cce64f` |

The earlier Security 105-pass diagnostic, owner RED evidence, earlier admission-constraint setup failures, previous full-unit timeout history and blocked Q-PUB-WORK-01 report remain historical. None was rewritten or silently replaced with this attempt. The owner's earlier full-unit coverage figures do not establish coverage of these final replacement bytes. Trusted deployed principal/source/media/capture/admission bindings, task accessor, least-privilege admission login, signed outbox relay, independent withdrawal safety scheduler, authenticated HTTP/customer UI and actual provider qualification remain engineering obligations. Root owns repository-health, Git, canonical CI and further implementation.

## Files Changed

Inventory uses `git status`, uncommitted diff, and `git diff origin/main...HEAD`. The branch also contains previously reviewed integration/readiness work; this report covers only the assigned thirteen-file packet and its frozen handoffs. Status below is against packet baseline HEAD; no listed source file was modified by this reviewer.

- `apps/tasks/src/core/webinar-publisher-runtime.ts` (A): strict signed delivery, mandatory current principal/provenance ports, concrete repository and transport composition.
- `apps/tasks/src/core/webinar-publisher-worker.ts` (A): persisted stage consumer with fresh publish/resume parity, current guards, refusal and uncertainty.
- `apps/tasks/src/index.ts` (M): exports the additive worker/runtime/task surface.
- `apps/tasks/src/tasks/webinar-publisher-command.ts` (A): bounded one-attempt task with unbound default and sanitized errors.
- `packages/db/src/webinar-publisher-repository.ts` (M): strict truthful observation admission and receipt/normalized time binding.
- `packages/db/test/webinar-publisher.integration.test.mjs` (M): actual-wire recovery, pre-effect observation/refusal and exact fixture retirement regressions; intermittent admission setup finding above.
- `packages/ghl/src/webinar-publisher-transport.ts` (M): independent exact owned pause qualification; current launch transport remains separately qualified.
- `supabase/migrations/20261014050000_webinar_publisher.sql` (M): retained recovery plus latest fresh pre-effect observation, guarded local failed terminal checkpoint and original safety fences.
- `tooling/tests/unit/task-workers/webinar-publisher-pause.test.ts` (A): expired-creative stop proof and exact independent identity tests.
- `tooling/tests/unit/task-workers/webinar-publisher-runtime.test.ts` (A): signed authority, tenant/provenance and unbound-default cases.
- `tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts` (A): fresh publish/resume ordering, drift, unknown read, cancellation, proof and standing cases.
- `tooling/tests/unit/webinar-publisher/native-adapter.test.ts` (M): native pause and allowlist compatibility assertions.
- `tooling/tests/unit/webinar-publisher/reconcile-admission.test.ts` (A): strict truthful observation states, same receipt time and unknown-field/live-ID refusal.

### Frozen packet pins

| File | SHA-256 |
| --- | --- |
| `apps/tasks/src/core/webinar-publisher-worker.ts` | `d32035ca66a1e53de6473326054cc47d239998c3db3933c037ad81d1ec986cf7` |
| `apps/tasks/src/core/webinar-publisher-runtime.ts` | `c18ec773df9fe4d574aaa0932289bf0c817cc956a736dfd1730e4ff1540f19ec` |
| `apps/tasks/src/tasks/webinar-publisher-command.ts` | `c1b5470b754a03908ba12102e51d13634aa0a06accec2f061bd5114184605970` |
| `apps/tasks/src/index.ts` | `05e9f4ccc1a1e812d2972ab4f82708a2091e0676e1519fe68607e118563299b0` |
| `packages/ghl/src/webinar-publisher-transport.ts` | `872bc060d7386b4af1491a57db45e153ce0ceb21df8f9ab8d81f1535a21d4de6` |
| `tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts` | `e533f57a01fb5c09ef4dce2f255c753e0f378d7b22013a9f061c4142110f5284` |
| `tooling/tests/unit/task-workers/webinar-publisher-runtime.test.ts` | `f3e735b47e31e21c0e207a6b175e2d37eee86236751b6519a337568335afe81b` |
| `tooling/tests/unit/task-workers/webinar-publisher-pause.test.ts` | `1e10b2771bc1f03cac1afea89bc4ad00e1c739399510b49ee4ecf2fc8584668d` |
| `tooling/tests/unit/webinar-publisher/native-adapter.test.ts` | `daf21ef9c8ffe8d003f7d19acd728d78b90db48493763243bdf0b9021b76fb0b` |
| `supabase/migrations/20261014050000_webinar_publisher.sql` | `9c463e5cac288a7d4d3f29e155fd19d3cad2e2e476f8a02c4a941f1b020654f3` |
| `packages/db/src/webinar-publisher-repository.ts` | `7a1f8603cb519d9954e4272cf7ce8521cc112d20530bf894502f6dbd27ce5ab2` |
| `packages/db/test/webinar-publisher.integration.test.mjs` | `a91101b2c8030c9ce38a6ff2fc2b3057af2288b6d6839d02b881f9a7fdd2beb0` |
| `tooling/tests/unit/webinar-publisher/reconcile-admission.test.ts` | `469a276bb724ed787802330bdb9d5cb8815d464452f3e8685cbe714b29b4c346` |

**Gate:** Hold clean verification on Q-PUB-PREFLIGHT-01. Original Q-PUB-WORK-01 source defect is closed at these pins. No full publisher completion, CI success, native concurrency, runtime binding, deployment or live provider approval is granted.
