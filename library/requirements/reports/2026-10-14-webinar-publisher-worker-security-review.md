# Security review: native webinar worker and database recovery

Date: 2026-10-14. Auditor: `/root/publisher_alias_security`, security-guardian. Branch: `codex/webinar-publisher`, baseline HEAD `24f2550f67893a54a7cd21e045e6e5ac34b09c9e`. Scope: frozen worker/runtime/native-pause packet and the combined database reconcile, terminal parity-refusal and exact test-fixture cleanup packet. Accepted CTR-003 revision 1 remains authoritative.

## Executive summary

**Scoped combined-source PASS.** No new Critical, High, Medium or Low vulnerability was detected. The bounded worker consumes persisted command identity and effect fences. Recovery requires exact retained draft identities, original write hash and a fresh independently admitted observation. Terminal draft parity refusal preserves remote IDs, records the safe failure and prevents publication. Owned pause uses its own current qualification and remains available after creative expiry.

Independently reran the existing twenty-migration PostgreSQL 17.5 WASM diagnostic: **47 passed, zero failed, zero skipped**, zero active fixture locations afterwards, and unchanged seeder success with ten inserted rows followed by zero on idempotent rerun. This single-backend diagnostic does not qualify independent-backend races, native PostgreSQL locks, pgTAP, authenticated browser execution, deployed runtime or provider behavior. Fresh canonical CI is required.

The managed Weapon CVE watchlist remains dated 2026-04-24, 173 days old. Its refresh belongs to the Guild owner. No dependency changed in this packet. No external advisory query or provider request was made in this review, per the assigned defensive scope; this report does not establish a fresh per-CVE matrix or close deployed-main exposure.

## Scope and ordering

Used the previously loaded managed security-guardian configuration and security-weapon, principles, catalog, integrated tenancy/AI-code guidance and report format. Read current repository AGENTS, both current handoffs, actual worker/runtime/task/native transport, SQL/repository delta, HMAC delivery authority, positive and negative regressions and existing diagnostic runner. Applied the actual Next.js/Postgres host conventions. This is a bounded source review rather than a new whole-branch audit.

Prior Security and Quality reports remain evidence of their earlier pins. The earlier alias review does not approve these new stages or worker. This fresh Security review follows the final repaired packet and precedes fresh Quality. Reviewer ownership is this report only. No production source, regression, earlier report, handoff, dependency, flag, timeout, grant or credential was changed.

## Scorecard

| Category | Result | Findings |
| --- | --- | --- |
| Financial actions | Exact confirmed command, current authority and recorded effect fences | None detected in scope |
| PII and secrets | No raw provider response/token logging; token-free effect hashes | None detected |
| Authentication and authorization | Signed scope plus current principal and SQL owner/session/install checks | None detected |
| Injection | Existing fixed parameterized query and allowlisted native route contracts retained | None detected |
| Dependencies | No dependency-file delta; no new package or external advisory request | None detected in delta |
| Configuration and transport | Default task refuses unbound runtime; bounded requests and no automatic write retry | None detected |
| Data integrity | Exact retained identities, admitted readback and fenced recovery/checkpoint | None detected |

## Authorization and delivery evidence

- `apps/tasks/src/core/webinar-publisher-runtime.ts:26` and `:41` strictly parse the envelope and bind delivery kind, location and correlation to the task. At `:83`, the existing delivery authority runs before current principal or repository access. `apps/tasks/src/core/production-runtime-composition.ts:268` verifies exact delivery, canonical request hash, expiry and timing-safe HMAC before creating its asynchronous authority context. Current principal is still resolved from mandatory trusted bindings rather than serialized role claims.
- `apps/tasks/src/core/webinar-publisher-worker.ts:84` binds persisted summary/projection, task, owner, internal role version, action, correlation, original spending confirmation and command request hash. Current authority is checked on replay and each iteration at `:188` and `:199`. Synthetic authentication is refused. `packages/db/src/webinar-publisher-repository.ts` retains its current-principal comparisons, SERIALIZABLE tenant context, strict normalization, fixed `::text::jsonb` parameters and locked SQL authority checks.
- `apps/tasks/src/tasks/webinar-publisher-command.ts:9` defaults to the typed unbound runtime. The installed task uses a sixty-second duration and one attempt; it has no default in-memory store, permissive verifier or hidden environment activation. Safe task errors suppress raw payload/provider errors. Success logging contains only disposition, state, stage and opaque operation reference. A concrete deployed accessor remains future composition work.
- Mandatory runtime dependencies include separate admission pool/verifier, current database/source authority, location token resolution, current media proof and independent actual-response verification. At runtime `:121`, actual response verification precedes observation admission; current principal is checked again before checkpoint. Schema-valid `app_test` JSON alone does not confer provenance. The fixture uses synthetic dependencies and is explicitly not production binding evidence.

## Effect, retry and pause evidence

- `apps/tasks/src/core/webinar-publisher-worker.ts:456` persists the token-free exact descriptor/URL/body write hash before native dispatch and checks returned lease/cancellation generation. At `:542`, current authority is checked again before checkpoint. A lost, malformed or unverifiable mutation response enters uncertainty at `:560`; replacement delivery does not blindly create again or adopt an unknown provider identity. SQL current owner, active lineage, lease generation, deadline and cancellation checks remain authoritative.
- Each delivery claims fifty-five seconds, performs at most six iterations and stops beginning iterations at forty seconds or with under ten seconds of lease remaining. Concrete native transport timeout is five seconds. Abort prevents new sends. These checks do not claim instantaneous remote recall or an end-to-end cancellation guarantee after a provider accepted a request.
- Linked ownership/cardinality/parent checks, compiler parity and actual response digests precede progress, reconciliation and terminal decisions. Publish acknowledgement is checkpointed as queued; live requires actual complete progress where applicable, linked parity, all native and Facebook IDs and every linked entity PUBLISHED. Unknown metrics/IDs remain nullable. A linked PAUSED observation can support the separate owned stop outcome without reading expired creative bytes.
- `packages/ghl/src/webinar-publisher-transport.ts:172` selects the strict independent pause qualification exclusively for pause. It checks current proof lifetime, projection/wire mapping, token-bound location, account and exact campaign parameter. Other mutations retain full launch qualification, schedule and budget/media controls. Legacy full proof is not accepted as pause proof. Native authority is checked before sending; route/query/version restrictions and redirect refusal remain unchanged. Pause acknowledgement alone is not observed paused delivery.

## Database recovery and refusal evidence

- `supabase/migrations/20261014050000_webinar_publisher.sql:395` retains current authorization, tenant/owner/install lineage locks, active-operation and cancellation checks before checkpoint. The original immutable deadline still preserves possible remote effects as uncertain/reconcile. The previous alias and text-to-jsonb repairs remain intact. Forced RLS, ordinary table revocation, separate NOLOGIN admission capability and exact EXECUTE grants have no delta.
- At SQL `:487`, draft recovery requires action draft, exact retained cumulative IDs and the matching next stage. It locks the latest creation attempt, requires its original write hash, compatible generation and observation no older than retained attempt/operation standing, and rejects another unresolved stage. At `:507`, current entitlement/source/version/manifest/preflight/approval and qualified provider proof are checked again. At `:542`, a separately admitted current observation must match owner/install/projection/IDs/state/digest/time and remain unrevoked/unexpired. Only then is the retained attempt confirmed atomically at `:550` with lineage advancement. Unknown or altered IDs remain refused; all-ID recovery still passes ordinary parity before draft-ready.
- At SQL `:473`, terminal parity refusal requires draft action, all three exact retained IDs, confirmed latest ad attempt, compatible current generation and no unresolved attempt. The current source/proof and independent failed observation are required as above. SQL `:556` records `PARITY_MISMATCH`, retains IDs, ends the lease, completes the operation/outbox and advances the row version. It does not describe remote rollback or provider rejection. Publish readiness remains unavailable, while independently qualified owned pause remains possible.
- `packages/db/src/webinar-publisher-repository.ts:82` adds only drafting and draft-ready observation states. Strict unknown-key refusal, nullable metrics/Facebook IDs, live-ID refinement and trusted verifier requirements remain intact.
- `packages/db/test/webinar-publisher.integration.test.mjs:207` retires only its exact seeded location, actor, installation and binding inside the existing guarded disposable owner transaction, with returned identity/count checks. Immutable source versions remain. The shared-pool regression proves other active fixtures survive the first cleanup and the retired principal is refused. It neither enumerates arbitrary tenants nor weakens the unchanged seeder, production cleanup, RLS, role grants or database guard.

## Findings and remediation

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in assigned scope.

The reviewed implementation repairs known stage, parity-refusal, pause-proof and disposable-fixture cleanup defects. This reviewer made no source remediation. Future trusted runtime and provider composition are explicit incomplete work, not authorization silently supplied by these constructors.

## Independent verification

| Check rerun by this reviewer | Result |
| --- | --- |
| Frozen worker and database source pins | All thirteen match both current handoffs |
| Current worker/native/command/runtime/pause compatibility | 210 passed across five files |
| Additional DB/admission/foundation compatibility | 66 passed across three files |
| Complete persistence compatibility represented across those runs | 230 cases: database 34, command 86, native 78, foundation 30, admission 2; overlaps worker compatibility |
| All task-worker unit files | 70 passed across seven files |
| Exact security outbound inventory, contracts project | Six passed; together with task workers, 76 |
| Connectionless discovery/identity/admission | Three passed |
| Existing complete-stack PostgreSQL 17.5 WASM wire diagnostic | 47 passed, zero failed/skipped; all twenty complete migrations applied |
| Disposable fixture retirement and unchanged seeder | Zero active locations; ten rows inserted, then zero on idempotent rerun |
| DB dependency build, tasks/GHL/DB typechecks | Passed |
| Project secret audit, package boundaries and prohibited-edge fixture | Passed |
| Diff whitespace and scoped logging/dynamic-query/token sink review | Passed; no new sink detected |

Reviewed the existing author RED logs and frozen handoff evidence for stage-invalid recovery, parity refusal, cleanup and pause-proof regressions. The current tests contain concrete refusal assertions and state/ID/history checks. No new security payload, new probe, source mutation or external request was created in this defensive pass.

The diagnostic runner and one-connection hook were read before reuse. They use the already installed ignored PGlite 0.3.15/socket 0.0.20, actual postgres.js 3.4.9 and current compiled repository, and apply complete migration bytes without schema fragments or authorization substitutions. Only disposable loopback traffic was used. One active backend serializes independent requests; its passing Promise.all case does not establish native multi-backend race correctness. No hosted migration, pgTAP, credentials or browser qualification was executed by this reviewer.

Minor check-selection issue retained: the first all-task unit command included the contracts-only security file, so it ran seventy unit cases. The security file was subsequently executed in its actual contracts project, passing all six. No configuration, assertion or timeout changed.

## Frozen combined source pins

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
| Worker handoff | `10c89e8d459127518aa09a88c89d8438112e9dd7d892811b53f302c8337135af` |
| Database recovery/cleanup handoff | `c2dea42aaa3ba101aff6ac689194af5295700cc44b2bf73e569fa3950478f923` |

## Remaining qualification and next gate

The author inspected canonical run `38544478613` on the previous head: all thirty-six package PG cases, including twenty-two publisher cases, passed before strict review seeding refused twenty-three active fixtures. This review independently reproduced the current cleanup/seeder success in the disposable diagnostic, but did not refetch that CI run or claim fresh canonical success. Run fresh Quality on these exact pins, then repository-health closeout and fresh canonical CI for actual independent-backend races, pgTAP, full inventory and authenticated browsers.

Trusted deployed principal/source/media/provider-capture bindings, distinct admission login configuration, signed outbox relay, invalid-destination safety scheduling and authenticated HTTP/customer launch UI remain incomplete source composition. Preserve current exact authority, separate verifier, no automatic write retries and explicit spending confirmation when composing them. No purchase, provider qualification, live spend/publication/pause, credential change, deployment, Git commit or push occurred in this review.

## Reviewer changes

Only `library/requirements/reports/2026-10-14-webinar-publisher-worker-security-review.md` was added. Earlier reports, handoffs, active agent work and all frozen source files were preserved.
