# Webinar publisher worker source handoff

Date: October 14, 2026 UTC. Owner: durable-workflows-guardian. Branch: codex/webinar-publisher. Accepted engineering boundary: CTR-003 revision 1, SHA-256 dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23.

This packet implements a bounded native webinar stage consumer, signed delivery envelope and concrete Postgres/native-transport composition. It is released for independent Security, then fresh Quality. It does not claim deployed task registration, actual provider qualification, a live campaign, or project completion.

## Delivery and effects

The engine remains the installed Trigger.dev SDK 4.6.4. Delivery is at least once; the database lease, generation, cancellation fence, persisted attempt and immutable command identity prevent duplicate effects. The outbox is also at least once. The task has maxDuration 60 seconds and maxAttempts 1. No automatic write retry is enabled. A later trusted relay must deliver persisted pending operations again after the lease, preserving these fences.

The consumer checks exact task/operation/location/actor/role version, canonical projection and summary, original confirmation and request hashes, then current authority. It claims a 55-second lease and performs at most six bounded stage iterations. The concrete native transport has a 5-second request timeout; the core stops beginning new iterations at 40 seconds or with less than 10 seconds of lease remaining. Abort prevents new work. Database deadlines and fencing remain authoritative.

Ordinary draft work is campaign, adset, ad, then linked parity. Each create records the exact token-free native request hash before dispatch. Decoded responses must preserve the approved account, parent IDs, words, media, budget, targeting and destination. The immutable native IDs advance only through a fenced checkpoint. Draft completion never sends publish.

Publish requires its separately persisted confirmed command. Its acknowledgement checkpoints publish_queued, then one bounded progress read plus a fresh linked read determines actual standing. Live requires complete progress, full linked parity, every retained native ID and all actual Facebook IDs, with all three linked entities PUBLISHED. Unknown data remains uncertain rather than zero or live. Linked observation carries its actual decoded digest and observation time through an independent verifier and SQL admission before lifecycle checkpoint. No reporting values are invented.

An ambiguous write or failed acknowledgement is recorded uncertain. Replacement delivery never blindly reissues creation or publication. A lost campaign identity stays uncertain without name search or guessed IDs. Known partial draft identities may reconcile exact linked cardinality and fields: campaign to adset/drafting, campaign plus adset to ad/drafting, all three to parity/drafting. The reconcile checkpoint includes the deterministic original creation request hash. The separately owned SQL repair requires an independently admitted current drafting observation and atomically confirms the retained attempt before continuation. An unrecorded ID present in a provider response is refused.

Cancellation and delayed responses cannot advance a stale generation. Local cancellation remains the existing command's responsibility. A cancellation with possible provider effects remains uncertain until an owned readback supports a stopped outcome. No delete, campaign search, integration change or ad-account switch is added.

## Independent pause correction

Root explicitly extended ownership to the native transport and only the existing pause fixtures/assertions. The original transport parsed a full launch qualification even for pause, so a fresh independently owned pause receipt could not stop an expired creative. New regression evidence: one failure and ten passes before repair; all eleven pass after repair.

Pause now parses only WebinarPublisherPauseQualificationSchema, requires app_test provenance subject to the existing trusted authority, current proof lifetime, exact campaign/location/account/projection/wire mapping and location token binding. It preserves the native route and version allowlist. It does not require a creative media lease or expired full launch qualification. Draft, upload, publish and resume retain their full qualification and expiry checks. Existing positive pause fixtures now supply the strict independent receipt. The former expired-pause-proof assertion now explicitly refuses that stale stop proof, renews the independent receipt and succeeds; expired resume remains refused.

Pause acknowledgement is not paused delivery. Its subsequent owned linked read independently checks retained campaign/account/location/parents, and may confirm PAUSED without reading expired creative media. A still-PUBLISHED campaign is uncertain. This keeps the stop action available independently of old source while preserving ownership and current pause proof.

## Concrete composition and remaining bindings

createWebinarPublisherWorkerRuntime constructs PostgresWebinarPublisherRepository, the existing native allowlisted transport and the separately privileged admission service. No production in-memory state store or permissive verifier is supplied. The signed envelope reuses the existing HMAC delivery authority. Its exact request, tenant, actor, expiration and signature are verified before principal or database access. A trusted resolver must then read the current authenticated principal, session, installation and internal owner authority. A historic envelope cannot replace that resolver.

Required dependencies are intentionally mandatory: current database/source/dispatch/checkpoint authority, location token resolver, current exact media proof, actual transport-capture verifier, normalized linked-observation admission builder and independent provenance verifier. Mutation/control acknowledgements are independently verified captures; they are not fabricated lifecycle observation receipts. Only the actual linked parity/progress/reconcile observations use SQL observation admission.

The exported task currently refuses RUNTIME_UNBOUND by default. This is a safe source registration boundary, not an activated deployment. The subsequent runtime owner must compose those real dependencies, wire the deployed task accessor, reserve a distinct publisher-admission login with the existing restricted capability, and build the bounded outbox signer/relay. Pending messages already come from the concrete repository. The relay must never mark a message processed simply because Trigger accepted it; SQL completion owns that field.

Source obligations still open outside this assigned packet:

- Actual trusted discovery, immutable media delivery and controlled native provider capture qualification. An app_test-shaped object is not evidence.
- Deployed principal/source/provider capture bindings and task accessor, signed outbox relay and runtime configuration validation.
- Scheduler and independent invalid-destination safety-pause consumer, using the current owned pause proof and honest best-effort outcomes.
- Authenticated HTTP/customer UI and explicit human launch/spend confirmation journey.
- Persisted parity refusal audit: ordinary parity checkpoint currently allows only complete/draft_ready. A mismatched readback throws the safe PARITY_MISMATCH error, never publishes, and preserves active parity/outbox. A separate reviewed atomic refusal primitive is needed to persist blocked/failed plus that safe failure code. No invented checkpoint transition was used.
- Actual PostgreSQL independent-backend worker races, canonical full CI, live no-spend App Test and production qualification.

## Verification

All cases here are synthetic source/transport or SQL-contract tests, not provider qualification.

| Check | Result |
| --- | --- |
| Focused worker/runtime/pause plus original native and command compatibility | 209 cases pass in five files |
| All task-worker tests plus exact security outbound inventory | 75 cases pass in eight files |
| Full parallel unit coverage | 3,358 pass; one unchanged financing long-content case exceeds its existing 5,000 ms timeout |
| Same unchanged financing file in isolation | All 16 pass, 3.01 seconds test time |
| Final full unit coverage with maxWorkers=1 | All 3,359 cases in 215 files pass, 159.69 seconds; assertions and thresholds unchanged |
| Full coverage totals | Statements 89.35%, branches 86.15%, functions 91.96%, lines 90.45%; all existing thresholds pass |
| New worker coverage | Statements 88.23%, branches 88.55%, functions 100%, lines 90.39% |
| Task and HighLevel typechecks, tooling TypeScript | Pass |
| Dependent task builds | All ten workspace builds pass |
| Packet formatting, lint, boundary positive/negative fixture, product types, secrets | Pass |
| Duplication scan | Zero clones across 773 files |

The isolated financing retry retains the initial timeout finding. No timeout, test assertion, coverage threshold, dependency version, activation flag or unrelated fixture was changed. No Git commit, push, provider call, deployment, database migration on a hosted service, purchase, spend or customer message was performed.

## Frozen source pins

| File | SHA-256 |
| --- | --- |
| apps/tasks/src/core/webinar-publisher-worker.ts | 89a19e921aa6b78c82ed727f30958586690ea32dfeb6c7682d69a725e5f7c99e |
| apps/tasks/src/core/webinar-publisher-runtime.ts | c18ec773df9fe4d574aaa0932289bf0c817cc956a736dfd1730e4ff1540f19ec |
| apps/tasks/src/tasks/webinar-publisher-command.ts | c1b5470b754a03908ba12102e51d13634aa0a06accec2f061bd5114184605970 |
| apps/tasks/src/index.ts | 05e9f4ccc1a1e812d2972ab4f82708a2091e0676e1519fe68607e118563299b0 |
| packages/ghl/src/webinar-publisher-transport.ts | 872bc060d7386b4af1491a57db45e153ce0ceb21df8f9ab8d81f1535a21d4de6 |
| tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts | 06b751dc0dbe6b41a5bfe80bddf21fb2eaa4cc8d0ca7b415df0807ac1a4609d6 |
| tooling/tests/unit/task-workers/webinar-publisher-runtime.test.ts | f3e735b47e31e21c0e207a6b175e2d37eee86236751b6519a337568335afe81b |
| tooling/tests/unit/task-workers/webinar-publisher-pause.test.ts | 1e10b2771bc1f03cac1afea89bc4ad00e1c739399510b49ee4ecf2fc8584668d |
| tooling/tests/unit/webinar-publisher/native-adapter.test.ts | daf21ef9c8ffe8d003f7d19acd728d78b90db48493763243bdf0b9021b76fb0b |

The concurrent database repair is owned and pinned separately. It is not modified or claimed by this worker packet. Root owns the ledger, Git, canonical CI and repository-health gate. Independent Security must precede fresh Quality on this combined repaired source before any commit or push.

## Parity refusal continuation and final replacement pins

Root assigned the bounded atomic parity refusal after the initial candidate above. The database owner explicitly released the existing checkpoint API with parity to complete/failed, current lease/worker/generation, exact retained IDs and a fresh independently admitted failed observation matching actual readback digest/time. SQL records PARITY_MISMATCH internally, clears the lease, completes the outbox and preserves every remote identity and the independent owned pause path.

The worker continuation uses this transition only for a verified, schema-valid linked mismatch at the parity stage. It submits the actual decoded mismatched response to the trusted verifier and observation admission, rechecks current authority, then checkpoints complete/failed. This describes a local draft parity refusal, not a claimed provider rejection or an advertisement that is live. Unavailable/malformed reads or a mismatched transport digest cannot manufacture a failed observation. No publish is dispatched.

Regression evidence: the new actual native readback test first failed because the candidate threw PARITY_MISMATCH without the persisted terminal result (one expected failure, 24 filtered skips). The repaired consumer then passed that regression with the exact retained IDs, independently admitted actual response hash, internal failure code and zero publish. Focused native/command/worker/runtime/pause compatibility now passes all 210 cases. All task-worker plus exact boundary cases now pass 76. Both package typechecks, tooling TypeScript, lint, format, boundary/product-type/secret audits and all ten dependent task builds pass after this continuation.

The full 3,359-case coverage run above belongs to the initial candidate before this narrow continuation. It is retained as that evidence, not presented as a new full-suite result on the final worker. Canonical CI and fresh independent Security then Quality remain required on the combined final tree.

These two final pins replace only their initial candidate pins above. The other seven source pins remain byte-identical:

| File | Final SHA-256 |
| --- | --- |
| apps/tasks/src/core/webinar-publisher-worker.ts | bb031a9fed7a77fcb6907d5e8b1f29159c08cb43cdb8d27e8b4eb5923c0d981e |
| tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts | 8b83327c40c6718d3c2d58cb875c49a40b9239a96d3124d3d1c69b92885c3939 |

The persisted parity-refusal gap listed above is now closed in this consumer and the separately owned SQL primitive. All other listed runtime/provenance/relay/safety-schedule/HTTP/UI/provider engineering obligations remain open. The packet is frozen and released to root for independent review; no deployment or complete production-consumer claim is made.

## Critical pre-publish ordering repair, Q-PUB-WORK-01

Fresh independent Quality blocked the previous candidate with Q-PUB-WORK-01. The preserved report is 2026-10-14-webinar-publisher-worker-quality-review.md, SHA-256 2336f0f754190b7475f3ec4e5a0f20acf692e36e24d9cd6f52666e62d3b67c38. It correctly found that the worker checked publish parity on the POST acknowledgement, after the effect, while accepted CTR-003 section 5.6 requires fresh linked draft parity before publication. The preceding Security and blocked Quality snapshots remain intact.

The revised publish consumer now obtains a bounded linked GET before beginDispatch or POST. The actual typed response digest, exact owned account/location/IDs/parents/cardinality and full compiled words/media/destination/objective/category/budget/schedule/geography/placements must match; all linked entities must be DRAFT. An independent capture verifier admits draft_ready standing before any effect reservation. The worker re-reads current lease/stage/worker/generation/cancellation/retained IDs, rechecks current authority, re-loads qualified proof and repeats compiler parity before beginDispatch. It checks current lease and authority again immediately before the POST, while the existing native transport still performs its independent current authority and proof checks. Request and actual response hashes remain the audit boundary; raw bodies, tokens and image lease secrets are not logged.

Verified current draft drift requests the separate publish-stage complete/failed checkpoint with exact retained IDs and a fresh independently admitted failed readback. This is local refusal, not a claim that the provider rejected an advertisement. Unknown, unavailable, malformed or unverified GETs refuse before dispatch without fabricating failed provider standing. Already-published or contradictory draft statuses also refuse; a retry does not blindly repeat publication. Resume, pause, compiler, original spending confirmation, request schemas, provider allowlist and activation defaults are unchanged in this narrow repair.

Test-first evidence: eleven ordering/drift/unavailable/cancellation regressions failed against the old source (24 filtered skips). The revised worker passes all 37 worker cases and the complete focused five-file compatibility set of 222 cases. All task-worker plus exact boundary checks pass 88 cases. Task typecheck, tooling TypeScript, lint, boundary/product-type/secret audits and all ten dependent task builds pass. The queued-publication test now asserts GET linked, POST publish, GET progress and GET linked in that order. A live-standing fixture transitions to PUBLISHED only after the POST; the foreign acknowledgement regression injects the mismatch specifically on POST, preserving its uncertainty assertion after a valid initial GET.

Final worker source and test pins for this repair replace their two previous pins only:

| File | Q-PUB-WORK-01 repair SHA-256 |
| --- | --- |
| apps/tasks/src/core/webinar-publisher-worker.ts | b52ee07b5b36ee00d8a5fe86121b042291059c5b7c1d028dcda51fb89f5ca9ba |
| tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts | eb5d31ca680d1364f2e4708293908a06bfa6815f18757ffab750fa7cc69cef89 |

The consumer requests the agreed existing checkpoint shape, but the previous SQL primitive authorizes draft/parity refusal only. Root is assigning a separate guarded publish-preflight terminal path. It must authorize action publish at stage publish before any dispatch attempt, current owner/source/full qualification and lease/cancellation fence, exact immutable native IDs and a fresh verified failed observation matching digest/time. It must preserve IDs/owned pause, complete the local operation/outbox and persist PARITY_MISMATCH. It must not treat unavailable GETs or an unrelated action as that evidence. A successful fresh draft_ready observation must also be bound to the current publish dispatch, rather than an old draft-ready receipt. The worker does not assume the previous SQL accepts this transition; model tests are not actual PostgreSQL qualification.

Worker ownership is frozen and released to root pending that assigned database repair, combined actual SQL tests, fresh Security then Quality and canonical CI. This continuation supersedes the earlier consumer ordering claim, not the preserved report history. All deployed authority/provenance, outbox relay, withdrawal safety scheduling, HTTP/UI and actual provider qualification obligations remain active engineering work. The default task remains RUNTIME_UNBOUND. No Git or live operational changes occurred.

## Matched publish/resume pre-effect parity and final worker freeze

Root extended the ordering repair to resume under accepted CTR-003 section 6. Resume now shares the bounded fresh linked read, full compiled projection comparison and independent observation admission before beginDispatch with publish. It checks exact owned account/location/native IDs/parents/cardinality, approved words, media, destination, budget, objective, category, dates, geography and placements. Publish retains its requirement that all entities are DRAFT. Resume requires a PAUSED campaign, all actual Facebook identities and healthy PAUSED or PUBLISHED linked children. A paused unpublished draft cannot bypass explicit publication through resume. Unknown, malformed, unavailable or unverified reads refuse without manufacturing failed provider standing.

Successful resume parity is independently admitted as paused. Both spending actions reload the current leased record, verify worker/stage/lease/cancellation generations and immutable IDs, assert current authority, reload current full qualification and repeat compiler parity before reservation. The same leased-record/authority guard runs immediately before POST after reservation. The existing native transport retains its independent proof, token and current authority checks. A post-reservation cancellation fences the response path and causes no resume POST. Resume acknowledgement remains resume_pending, followed by bounded progress and linked reads; only actual qualified published standing supports live. Independent pause still does not depend on creative validity or full launch proof.

A verified pre-resume mismatch uses the released existing complete/failed checkpoint with exact retained IDs, actual admitted failed readback hash/time and requestHash null before any attempt. The SQL implementation persists PARITY_MISMATCH and completes the local operation/outbox while retaining owned remote identities. This is local refusal, not remote provider rejection. The earlier publish SQL dependency listed above is now closed by the separately frozen database packet, which guards both publish and resume without changing API fields or revision. It requires latest independently admitted exact draft_ready or paused standing newer than both immutable operation time and server row creation, identical receipt/normalized time, current expiry and a maximum sixty-second horizon. Newer failed/uncertain standing supersedes earlier success. Attempts already recorded cannot use the pre-effect terminal-refusal path.

Test-first evidence: all fourteen added resume ordering, drift, unavailable/malformed-read, cancellation, unverified-capture, proof-expiry, published-identity and successful-order regressions failed against the previous worker. They pass after the repair. Four additional cases exercise unhealthy child standing and cancellation immediately after reservation. Final worker tests pass all 55 cases; the complete five-file native/command/worker/runtime/pause compatibility set passes 240. All task-worker and exact security boundary cases pass 106. Tooling TypeScript, task and HighLevel typechecks, lint, boundary positive/negative fixture, product-type and secret audits, formatting and all ten dependent task builds pass. An initial test assertion indexed a zero-argument mock call tuple; tooling TypeScript caught it, and the assertion now uses the typed invocation matcher. No assertion was removed or relaxed. Full-unit coverage figures above belong to the earlier candidate and are not repeated as proof of these final bytes.

The database owner's frozen handoff is 2026-10-14-webinar-publisher-reconcile-stage-handoff.md, SHA-256 62b55990ad64e5230019d13e491ebcf6e978e88d67378f9d1802b88e09cbffd6. Its complete twenty-migration PostgreSQL 17.5 actual-wire WASM diagnostic passes 105 cases and preserves exact fixture cleanup and unchanged review seeding. This remains a single-backend diagnostic, with independent-backend concurrency and pgTAP qualification reserved for canonical CI. That owner's four released dependency pins are recorded here without claiming ownership:

| Dependency | SHA-256 |
| --- | --- |
| supabase/migrations/20261014050000_webinar_publisher.sql | 9c463e5cac288a7d4d3f29e155fd19d3cad2e2e476f8a02c4a941f1b020654f3 |
| packages/db/src/webinar-publisher-repository.ts | 7a1f8603cb519d9954e4272cf7ce8521cc112d20530bf894502f6dbd27ce5ab2 |
| packages/db/test/webinar-publisher.integration.test.mjs | a91101b2c8030c9ce38a6ff2fc2b3057af2288b6d6839d02b881f9a7fdd2beb0 |
| tooling/tests/unit/webinar-publisher/reconcile-admission.test.ts | 469a276bb724ed787802330bdb9d5cb8815d464452f3e8685cbe714b29b4c346 |

Only the worker, its unit file and this append-only handoff changed in this continuation. The original seven companion source pins remain byte-identical. Final replacement pins for the two changed source files:

| File | Final publish/resume SHA-256 |
| --- | --- |
| apps/tasks/src/core/webinar-publisher-worker.ts | d32035ca66a1e53de6473326054cc47d239998c3db3933c037ad81d1ec986cf7 |
| tooling/tests/unit/task-workers/webinar-publisher-worker.test.ts | e533f57a01fb5c09ef4dce2f255c753e0f378d7b22013a9f061c4142110f5284 |

The packet is frozen and released for combined independent Security, then fresh Quality and canonical CI. The exported default task still refuses RUNTIME_UNBOUND. Real deployed principal/source/media/provenance/capture/admission bindings and task accessor, bounded signed outbox relay, independent withdrawal safety scheduling, authenticated HTTP/UI and real provider qualification remain active engineering obligations. They are not reduced to credentials or claimed complete. No command/compiler/contract/native pause/schema change, retry, dependency, Git mutation, provider call, live spend or deployment was made by this worker continuation.
