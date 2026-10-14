# Webinar publisher reconcile, parity refusal and fixture cleanup handoff

Date: 2026-10-14. Author: `/root/publisher_database`, db-guardian. Baseline branch HEAD: `24f2550f67893a54a7cd21e045e6e5ac34b09c9e`. PostgreSQL target 17; unchanged postgres.js 3.4.9 driver and transaction pool contract. Parent authorized the existing reserved migration and PostgreSQL fixture, new unit regression and this report, then explicitly extended ownership to the internal observation state enum only. Parent separately assigned terminal parity refusal and exact fixture cleanup. Worker ownership remains with `/root/publisher_worker`; parent owns Git, ledger, independent Security then Quality and canonical CI.

## Result and retained qualification limits

The existing checkpoint API now supports verified recovery of a retained partial draft and an explicit verified parity refusal. No new method, field, application contract revision, migration identifier, role/grant, deadline, provider call or dependency was introduced. Twenty-five new PostgreSQL cases extend the previous twenty-two to **47 passing cases** on a complete twenty-migration PostgreSQL 17.5 WASM stack with actual postgres.js wire traffic. Two new strict admission unit cases pass. After those cases, zero fixture locations remain active and the unchanged review seeder succeeds, including its idempotency check.

The diagnostic still limits each pool to one connection because the reused socket wrapper has one active backend. It executes the Promise.all reservation case but does **not** replace independent-backend concurrency, native server locks, Supabase services, pgTAP, credential setup or browser qualification. The previous canonical run independently passed the older twenty-two publisher cases and the actual multi-connection reservation race. Fresh canonical CI must qualify these current source pins.

## Draft reconciliation

The former checkpoint transition allowed reconcile only toward delivery progress or completion. A truthful readback of a retained draft could not continue the next creation stage. The internal admission enum also rejected `drafting` and `draft_ready` despite those being existing application states.

The parent-approved enum extension adds only those two observation states in `packages/db/src/webinar-publisher-repository.ts:82`. The strict normalized shape, unknown-key refusal, nullable metrics/Facebook identities, live-ID refinement and required trusted verifier boundary remain unchanged. It does not make a client-shaped response into an admitted provider artifact.

`supabase/migrations/20261014050000_webinar_publisher.sql` adds a draft-only reconcile path with this mapping:

| Exact retained native identities | Allowed next checkpoint |
| --- | --- |
| Campaign only | `adset / drafting` |
| Campaign and adset | `ad / drafting` |
| Campaign, adset and ad | `parity / drafting` |

The path requires the current active action to be draft, exact equality with all retained identities, a retained latest creation attempt matching the highest known identity, no other unresolved attempt and an attempt generation no newer than the current fenced lease. The checkpoint must supply that attempt's exact original request hash. The worker confirmed it can regenerate that hash from the fixed transport descriptor and exact original DTO without tokens; changed media/body inputs correctly fail equality. Readback time must follow the attempt, its retained observation and the operation's retained observation.

Current spend/entitlement authority, approved campaign/version/manifest/preflight/approval, destination standing and admitted qualification are rechecked. A separately admitted drafting observation must match projection hash, exact identities, readback hash and timestamp, be unrevoked and unexpired, and have a current receipt observation time. Existing sole-owner, session, installation, cancellation-generation, active-operation, worker, lease-generation, stage, lease expiry and immutable deadline checks run before the new path.

After every guard passes, the retained attempt is confirmed with the verified readback hash/time in the same transaction as advancing the operation and lineage. Its original request hash and generation are preserved. A later claim therefore continues the remaining stage instead of falling back into reconcile, and the unique previous-stage attempt still prevents duplicate creation. Missing identities for the interrupted stage, adding or replacing an identity, another unresolved stage, wrong action/stage/hash, stale observation or withdrawn current authority do not enable recovery. All-three-identity recovery still goes through the ordinary parity stage before draft-ready completion; it does not gain publish authority.

## Verified terminal parity refusal

The parent and worker agreed to use existing checkpoint fields: `expectedStage=parity`, `stage=complete`, `state=failed`, exact retained identities, current worker/generation, and the independently admitted actual linked failed observation with its exact digest/time. No new failure field or repository primitive was necessary. The worker limits this to a verified linked field/cardinality/parent mismatch; unavailable, malformed or transient readback is not a fabricated failed observation.

SQL requires action draft, all three already retained identities unchanged, the latest ad creation attempt already confirmed, no unresolved attempt, fresh observation and the same current source/qualification checks. On success it atomically sets `lastSafeFailure=PARITY_MISMATCH`, preserves every remote identity, advances the row version, ends the lease, makes the operation inactive and marks its outbox item processed. It never calls the mismatch draft-ready, live or remotely rolled back. Publish remains refused by the existing readiness guard. A separately qualified owned pause remains available for the retained campaign.

Negative actual SQL cases cover wrong identities, missing observation, source withdrawal, proof revocation, stale generation and wrong action. The wrong-action case uses a deliberately inconsistent workflow pointer under the already sanctioned disposable owner fixture to exercise the independent SQL action guard; it does not describe a browser capability or relax runtime grants. Failed validation leaves the operation and identities unchanged and does not persist `PARITY_MISMATCH`.

## Exact fixture cleanup and the later CI failure

The complete raw log of [canonical run 38544478613](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38544478613) shows all twenty pgTAP files and all **36 package PostgreSQL cases passing**, including the twenty-two publisher cases. The job then failed at review seeding because **23 active publisher fixture locations** remained. This was a cleanup dependency, not an alias SQL failure. The original fixture deleted its new publisher tables but retained active foundation identities because immutable campaign evidence references them.

The real PostgreSQL fixture now retires only the exact location, actor, installation and binding it created, inside its existing disposable migration-owner transaction. Location ID is paired with its fixture GHL identity; actor ID is paired with its fixture display marker; installation ID is paired with its exact location; binding revocation is paired with exact location and actor. Each retirement checks the returned identity/row count. It sets location and actor to their existing deleted states, revokes the installation and binding, and keeps immutable source evidence until the canonical disposable database is dropped. Cleanup is idempotent for these owned identities. It does not enumerate and retire other tenants, disable append-only triggers, relax the seeder or change production cleanup behavior.

The new shared-pool cleanup case proves one fixture is retired while the other remains active, then proves both exact principals/installations/bindings are retired and both immutable source versions remain. Runtime authorization rejects the retired principal. The final complete diagnostic reports **POST_SUITE_ACTIVE_LOCATIONS 0**. Running the unchanged review seeder against that throwaway instance then inserts **10 rows** and exits successfully; its second `--expect-unchanged` run inserts **0 rows** and exits successfully. Credentials and browser verification were not run by this diagnostic.

## Test-first execution and compatibility

- Before the stage repair, all four selected actual draft-recovery cases failed with `PUBLISHER_STAGE_INVALID`; both new admission cases failed because their truthful draft states were excluded. They pass with the repair.
- Before the parity/cleanup additions, the actual parity case failed with `PUBLISHER_STAGE_INVALID`, and the cleanup case observed `active` instead of deleted. They pass with the repairs.
- The final complete stack reports **47 passed, 0 failed, 0 skipped**: the original twenty-two cases plus twenty-five reconcile, parity-refusal and cleanup cases. It includes atomic attempt resolution followed by a permitted next-stage dispatch, no-repeat unknown-ID refusal, canceled/wrong-action refusal, wrong stage/IDs/hash, expired/revoked proof and observation, stale generation/readback, source withdrawal, retained immutable identity/hash fields and owned pause after parity refusal. All earlier confirmed-ACK/deadline uncertainty cases remain intact.
- Selected source compatibility: **230 unit cases passed across five files**, including the two new admission cases. Connectionless discovery/identity/admission: **3 passed**. DB/auth dependency builds, DB/tooling typechecks, targeted lint, final formatting, Node syntax and diff checks passed.
- Retained author diagnostics: the first new SQL draft CASE expressions needed parentheses for PL/pgSQL IF parsing; the full migration execution caught that syntax error before any source release. The new cleanup authorization assertion initially expected only the publisher error, but the unchanged upstream tenant-context guard refused the deleted actor first. The assertion now accepts that concrete refusal as well. An initial formatting check caught the longer observation enum, which was formatted and rechecked. None of those failed attempts is reported as a pass or fixed by weakening a production guard.

Reused existing ignored PGlite **0.3.15** and pglite-socket **0.0.20** read-only. Engine: **PostgreSQL 17.5**, compiled to WASM by emcc. The new ignored runner applies all twenty complete migration files in sorted order and records their hashes; it uses the actual compiled repository/driver and current test source. Its temporary one-connection hook only changes diagnostic harness pool capacity; canonical source remains at four connections. No schema fragments, authorization stubs, catalog substitutions, production verifier or live provider proof are claimed. See the [official socket API](https://pglite.dev/docs/pglite-socket) and db-weapon `guides/00-principles.md` for engine/evidence qualification; existing migration catalog-lock discipline remains as documented in `guides/03-migrations.md`.

## Frozen pins and next owner

| File | SHA-256 |
| --- | --- |
| `supabase/migrations/20261014050000_webinar_publisher.sql` | `9b5f000cb0312c5867b3a691b7e8ca63db9f2fa88e9244cebcf72ac2c42c955d` |
| `packages/db/src/webinar-publisher-repository.ts` | `533a5ffe9e407af3ecb35e2920156e3ca46793f9e1e94b2ebcb2a11af899be44` |
| `packages/db/test/webinar-publisher.integration.test.mjs` | `5551269b7692bc4596855266105d5dbd66cceba9b71f1039cdf4559e1adbe1f4` |
| `tooling/tests/unit/webinar-publisher/reconcile-admission.test.ts` | `09610a5324b4cf215b0b263ffeb193839bccac55fa801bb4b589917fa6d45527` |
| `tmp/publisher-deadline-probe/reconcile-red.log` | `6c6e98c9ede6d2d78682572df179c73aea1fd801224216920ed0cdb6f7ca6267` |
| `tmp/publisher-deadline-probe/cleanup-parity-red.log` | `dcbbc41cda93bbc817beb115472011abb36b79b6dd0fc393b226947fad812d9e` |
| `tmp/publisher-deadline-probe/reconcile-seeder-final-green.log` | `a76ab4b672e4b3c43631dc40447e241ec5f3bab6b470954dd3652a7c7d95a2ae` |
| New ignored `reconcile-stack.mjs` | `28103108648f69bb6112271057af4b1c999676b39f4af714f84693439b82a50b` |
| Unchanged ignored `single-connection.mjs` | `2ec95a7cc36137e74e2e4042d012ffefaad23ca1bfd7dacd8ad93ec39ea9da3c` |
| Unchanged production `tooling/scripts/database/seed-review-location.mjs` | `cbd8e26e329ec609b5c5e2c66ce6db157a62eaedd910f13666147c4ff99e7e4a` |

Every earlier report/handoff remains historical and untouched. The SQL alias fix, first JSON binding repair, original deadlines and RLS/capabilities are preserved. Worker files, native adapter and root ledger were not edited by this author. The agreed existing checkpoint API was released to the worker before this report; its focused consumer regression is the worker's separate evidence.

These owned files are released to the parent for fresh independent Security then Quality on the combined worker/DB packet, followed by a new canonical PostgreSQL CI run. No Git mutation, dependency installation, provider request, live spend, production credential change or deployment was performed by this author.

## Q-PUB-WORK-01 continuation: atomic publish and resume preflight

The preserved worker Quality report, SHA-256 2336f0f754190b7475f3ec4e5a0f20acf692e36e24d9cd6f52666e62d3b67c38, correctly blocked publication before fresh linked parity. The separate worker ordering repair was read at source b52ee07b5b36ee00d8a5fe86121b042291059c5b7c1d028dcda51fb89f5ca9ba and test eb5d31ca680d1364f2e4708293908a06bfa6815f18757ffab750fa7cc69cef89 before this continuation. The parent then explicitly extended the database assignment to require equivalent pre-effect parity for resume under CTR-003 section 6. Every earlier report, blocked finding and pin above remains historical and unchanged.

The existing beginDispatch and checkpoint APIs retain their signatures and contract revision. The new dispatch guard applies to publish and resume and requires action and current stage to agree. Publish requires an independently admitted draft_ready linked observation; resume requires an independently admitted paused linked observation. It binds the current projection and all three retained native IDs. It selects the latest observation for this owned projection, including a later failed, uncertain, expired or revoked record, so an earlier success cannot silently replace that newer standing.

Both receipt and normalized observation times must agree, be strictly newer than both immutable operation.createdAt and server operation row creation, be no later than server time, and fall within the existing maximum sixty-second lease horizon. The admission itself must be current, unrevoked and unexpired, with a full SHA-256 readback digest. The existing sole-owner, role/session/installation, current full source, lender/release standing, spending entitlement, qualification, current lease/worker/generation, cancellation and deadline predicates still apply. Dispatch now also explicitly compares the current manifest hash, in addition to version, preflight and approval. Observation payloads retain their existing strict shape; no provider account, token, body or additional contract field is introduced. Account/location correspondence remains bound by current qualification and the mandatory independent actual linked-capture verifier.

Verified preflight mismatch has a second narrowly guarded existing-checkpoint path: action and expectedStage publish or resume, next complete/failed, requestHash null, exact retained IDs, and the latest independently admitted failed observation with the exact readBackHash/providerObservedAt. There must be zero dispatch attempts for this operation. Full current source/qualification and all fences apply before commit. Success records PARITY_MISMATCH internally, retains all remote identities, increments the row version, ends the lease, marks the operation inactive and completes its outbox. It neither confirms a provider write nor claims remote rejection or rollback. After any recorded attempt this pre-effect refusal is forbidden; the prior possible-write uncertainty/reconciliation behavior remains authoritative. Unavailable, malformed or unverified reads cannot manufacture a failed observation.

The admission schema also rejects an observation whose normalized time differs from its verified receipt time. This is a stricter provenance binding, with no new state, field, permission or fallback. The PostgreSQL synthetic observation fixture now stamps its receipt with the same supplied normalized observation time. Its existing expiry refusal fixture expires after that actual observation rather than attempting to violate the admission table's expires-after-observed constraint. Canonical database timeouts, lease duration, pool capacity and concurrency configuration are unchanged.

### Actual test-first proof

Four new real SQL core cases were RED against the prior guard: both publish and resume accepted dispatch without fresh observation, and both complete/failed preflight transitions raised PUBLISHER_STAGE_INVALID. They are GREEN with this repair. Both admission-time mismatch cases were also RED before the stricter schema and now pass.

The complete twenty-migration PostgreSQL 17.5 WASM diagnostic using actual postgres.js 3.4.9 and freshly built repository passes **105 cases, zero fail/skip**. These are the prior 47 cases plus 58 new actual SQL cases. Resume fixture setup uses real draft creation/checkpoints and an independently qualified pause dispatch plus observed paused completion before reserving resume. Tested transitions include valid publish/resume effect reservation after fresh standing, valid publish/resume preflight terminal refusal before attempts, and refusal for missing/stale observation, wrong IDs/state/hash/receipt time, revoked/expired observation, a later failed or successful contradictory observation, withdrawn source, revoked full qualification, stale generation, cancellation, wrong action/stage, unknown ID and an already recorded attempt. Terminal-refusal negatives retain native IDs and an unprocessed outbox; successful refusal has zero attempts, an inactive operation and processed outbox. All original confirmed-ACK/deadline uncertainty, partial recovery, unknown-ID no-repeat, rights, independent owned pause and fixture isolation assertions continue to pass.

The diagnostic leaves **zero active fixture locations**. The unchanged review seeder inserts **ten rows**, then **zero**, both exit 0. Its existing ignored one-connection hook changes only diagnostic pool capacity. No property raw-reservation instrumentation is used here. This result does not qualify independent native PostgreSQL backends, lock races, pgTAP, hosted/provider behavior or whole-project release; fresh canonical CI is required.

Current focused source checks pass **230 units across five files**, **three connectionless repository cases**, DB build/typecheck, targeted lint/format, Node syntax and diff whitespace checks. An initial Vitest command passed a PowerShell wildcard literally and selected no files; the corrected directory-plus-foundation invocation ran all 230. Retained failed SQL iterations include 26 passes/two failures where new expiry fixture dates violated the existing admission constraint, then 102 passes/three failures where wrong-action fixture mutation was correctly blocked by immutability and the older expiry fixture had the same date problem. Those fixtures now use a real pause operation with a deliberately inconsistent stage to test the action guard, and expiration after the actual observation. No guard or immutable field was relaxed. These failed runs remain recorded as failures.

### Replacement source pins and handoff

| File | Q-PUB-WORK-01 database SHA-256 |
| --- | --- |
| supabase/migrations/20261014050000_webinar_publisher.sql | 9c463e5cac288a7d4d3f29e155fd19d3cad2e2e476f8a02c4a941f1b020654f3 |
| packages/db/src/webinar-publisher-repository.ts | 7a1f8603cb519d9954e4272cf7ce8521cc112d20530bf894502f6dbd27ce5ab2 |
| packages/db/test/webinar-publisher.integration.test.mjs | a91101b2c8030c9ce38a6ff2fc2b3057af2288b6d6839d02b881f9a7fdd2beb0 |
| tooling/tests/unit/webinar-publisher/reconcile-admission.test.ts | 469a276bb724ed787802330bdb9d5cb8815d464452f3e8685cbe714b29b4c346 |
| tmp/publisher-deadline-probe/preflight-red.log | b73dee0e7348f6b47446a5198205ab7902391aa18da1392353eb0a7c89c16740 |
| tmp/publisher-deadline-probe/preflight-focused-green.log, failed | 03edc0b1f793357c5ddd412a5fcd31816a4b2f76347114b9f50284ceec9ca641 |
| tmp/publisher-deadline-probe/preflight-complete-green.log, failed | 46fbae21530d77cab9e1b4139dc0e199babde0250c59dfc60f9e6e67d9dbaf31 |
| tmp/publisher-deadline-probe/preflight-complete-final-green.log | 2cad3db45333c0316457e0614375552246ef1f0141363a95e44ebb4e0c55d3b1 |

Only the assigned migration, repository admission binding, owned SQL/admission regressions and this appended handoff were edited. The prior alias, text-to-JSONB, deadline, RLS/grant, cancellation, partial recovery and independently owned pause repairs remain. The API was released directly to the worker owner after all 105 actual cases passed. At this freeze, the separately owned resume consumer change is still being implemented; the older frozen worker had publish preflight only. The database now deliberately refuses that older resume dispatch until the consumer supplies fresh paused parity. Combined fresh independent Security then Quality and canonical CI remain required after that owner releases its matching worker pins. No Git or live provider action occurred.
