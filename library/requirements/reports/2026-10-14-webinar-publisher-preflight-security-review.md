# Security audit: webinar publisher publish and resume preflight

Date: 2026-10-14. Auditor: `/root/publisher_parity_security`, security-guardian. Branch: `codex/webinar-publisher`, baseline HEAD `24f2550f67893a54a7cd21e045e6e5ac34b09c9e`. Authoritative agreement: accepted CTR-003 revision 1, SHA-256 `dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23`.

## Executive summary

**Scoped combined-source PASS, cleared for fresh Quality on the exact pins below.** Findings: zero Critical, High, Medium or Low vulnerabilities detected in this assigned repair. Publish and resume now require fresh complete linked parity before effect reservation. The SQL reservation independently requires the latest exact admitted observation, current authority and source, and the active lease and cancellation fences. A verified mismatch before any attempt can finish locally as failed while retaining the remote identities; an unknown read cannot manufacture that standing.

Coverage is a defensive source and existing-regression review of the frozen consumer/database packet, not a full branch, deployed runtime or provider audit. No source remediation, new attack payload, new probe, provider request, credential access or Git mutation occurred. Earlier Security and the blocked Quality report remain historical. In particular, Quality SHA-256 `2336f0f754190b7475f3ec4e5a0f20acf692e36e24d9cd6f52666e62d3b67c38` identifies the earlier ordering defect; it does not approve these replacement bytes. Fresh Quality follows this review.

Independent checks include 276 publisher/worker/database unit cases, 130 task-worker/foundation cases with overlap, 26 contract/security cases and three connectionless cases. The existing complete-stack PostgreSQL 17.5 WASM actual-wire diagnostic passes 105 cases, zero failed/skipped, leaves zero active fixture locations, and permits unchanged review seeding with ten inserted rows followed by zero. This single-backend diagnostic does not establish independent-backend race correctness, native locks, pgTAP, authenticated browser execution or hosted qualification. Canonical CI remains required.

## Surface coverage checklist

### Framework attack surface

None detected in scope. This host is Next.js/TypeScript/Postgres. The scoped change adds no HTTP route, Server Action, HTML sink, browser state or framework configuration. No Svelte-specific conformance is claimed. Future authenticated HTTP and customer launch UI remain unimplemented consumers.

### Authorization and tenancy

None detected. `apps/tasks/src/core/webinar-publisher-worker.ts:84` binds the persisted summary/projection, owner, internal authority version, task action, correlation, exact action confirmation and original command hash. Synthetic authentication is refused. Current spending authority is checked on initial load, replay, every iteration and both sides of effect reservation. `packages/db/src/webinar-publisher-repository.ts:526` strictly parses dispatch input, reads the current record inside its principal-bound transaction, invokes mandatory dispatch authority and calls the fixed parameterized SQL function. Checkpoint has an independent mandatory authority at `:550`.

SQL `supabase/migrations/20261014050000_webinar_publisher.sql:395` authorizes and locks the owned launch lineage before its operation. Active operation, cancellation, immutable deadline, worker, lease generation, exact stage and lease expiry are checked before dispatch or checkpoint. Existing forced RLS, separate NOLOGIN admission capability, ordinary table revocations and narrow function grants are preserved. There is no new permissive membership, role or capability fallback.

### Secrets and environment

None detected. No new environment or dependency configuration was added. Native effect hashes contain the fixed descriptor, URL and normalized request body, not tokens. The project secret audit passes across its six source roots and public environment boundary. Reviewed files contain no new raw provider, credential or customer logging sink.

### Webhooks and third-party intake

None detected. The strict envelope and existing signed delivery authority remain in `apps/tasks/src/core/webinar-publisher-runtime.ts:26` and `:83`. Current principal is resolved through mandatory trusted bindings, not serialized customer authority. At runtime `:121`, independent response verification precedes linked observation admission. Its separately configured admission pool and verifier remain mandatory. `packages/db/src/webinar-publisher-repository.ts:588` validates both current principal and independently verified strict receipt before the fixed admission statement. Schema-valid synthetic `app_test` JSON does not supply real provenance.

### Dependencies and supply chain

None detected in the dependency delta. Root package, lockfile and web package have no changes in this packet. Declared host versions remain Next.js 16.3.8 and React/react-dom 19.3.0. This bounded review did not run the generic Weapon scan script: that script sends a package audit request and writes a broad scan outside the explicitly assigned existing-test/static-only scope. The host secret and boundary audits were used instead. No new external dependency or CVE query is claimed.

The managed CVE watchlist last refreshed on 2026-04-24 is 173 days old. Refresh belongs to the Guild owner. This report does not claim fresh per-CVE clearance or close exposure in unmerged deployed main.

### Headers and transport

None detected in scope. The native fixed host, per-operation route/version/method/body allowlist, redirect refusal, token/location authority and bounded transport are unchanged. Native transport checks current full qualification for publish and resume. Pause retains its distinct current owned qualification and can stop an expired creative without depending on a fresh launch/media proof. No provider request was made by this reviewer.

### AI-generated code patterns and financial actions

None detected in the final repair. The previous post-publish parity ordering defect is repaired at `apps/tasks/src/core/webinar-publisher-worker.ts:479`: a bounded linked GET runs before either `beginDispatch` or the publish/resume POST. Typed actual readback, normalized response hash, exact account/location/retained IDs/parent/cardinality and complete compiler parity are checked. `packages/ghl/src/webinar-publisher-compiler.ts:192` compares the materialized approved campaign, adset and ad fields, including budget/schedule, targeting, page, media, copy, destination, CTA, objective and category.

Worker `:503` requires all publish entities to be DRAFT. Resume requires a PAUSED campaign, actual Facebook identities and healthy PAUSED or PUBLISHED children. Paused unpublished drafts cannot bypass publication through resume. At `:518`, successful exact standing or a truthful linked mismatch is independently verified/admitted before the reservation. Unavailable, malformed, mismatched-digest or unverified reads throw without recording a failed provider observation or sending a mutation.

Worker `:174` reloads current ownership, stage, lease/cancellation generation and native IDs, checks lease/deadline and asserts current source authority after the asynchronous read/admission. At `:548`, current full qualification is reloaded and compiler parity repeated before effect reservation. At `:575`, the token-free exact write hash is persisted before send; at `:585`, the current leased record and authority are rechecked immediately before POST. Transport supplies its existing independent current proof/token check. An already accepted remote request cannot be recalled by these local fences.

### PII, logging and data integrity

None detected. Mutation ACKs remain queued or pending rather than live. Unknown or unverifiable mutation responses retain the existing uncertainty/reconciliation behavior at worker `:679`, without blind creation or control replay. Progress and live standing still require independently admitted actual linked evidence and real native/Facebook IDs. Independent pause, immutable deadlines, unknown-ID refusal and partial draft reconciliation are preserved.

The installed task at `apps/tasks/src/tasks/webinar-publisher-command.ts:9` remains `RUNTIME_UNBOUND` by default. It has one attempt and bounded duration, sanitized abort errors and limited status logging. Constructor injection and synthetic tests are not evidence of a deployed trusted accessor or real provider qualification.

## Findings detail

Critical: None detected in assigned scope. High: None detected. Medium: None detected. Low: None detected.

### Atomic pre-effect observation evidence

At SQL `:464`, both action and stage must agree for publish/resume and all retained native identities must exist. SQL `:469` selects the latest observation for this owned location, actor, installation and projection, without filtering out later failed, uncertain, expired or revoked observations to reuse an earlier success. At `:474`, the selected receipt must be current and unrevoked; both times must agree, be strictly newer than immutable operation time and server row creation, not be in the future and be within the existing sixty-second horizon. Exact retained identities and draft-ready/paused action standing plus a SHA-256 digest are required before inserting the attempt.

Current spend entitlement, manifest/version/preflight/approval and full qualification are independently revalidated before that selection at SQL `:453`. The new manifest comparison preserves the exact approved source. Account/location provenance stays bound by mandatory actual-capture verification and current qualification; the SQL normalized observation is not itself a new account resolver.

At SQL `:494`, a publish/resume complete/failed checkpoint requires matching action/stage, exact retained IDs, null request hash and zero dispatch attempts for that operation. The latest independently admitted failed observation must exactly match the checkpoint digest/time with the same freshness and expiry requirements. Full source/proof and all lease/cancellation guards still apply. Successful refusal records internal `PARITY_MISMATCH`, preserves identities, ends the lease, deactivates the operation and processes its outbox atomically. It neither confirms a provider write nor claims provider rejection or remote rollback. Any recorded attempt forbids this pre-effect terminal path.

`packages/db/src/webinar-publisher-repository.ts:164` additionally binds normalized observation time to receipt time. Strict unknown-field refusal, live identity refinement and trusted verifier remain intact. Existing draft reconciliation and terminal draft-parity refusal remain separately constrained to their original action/stages.

## Remediation summary

| Severity | Count | Fixed by reviewer | Documented only |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

No production file was edited by this reviewer. Only this report was added; existing tests generated an ignored diagnostic log. Earlier source/report history and other agent work were preserved. Diff whitespace check passes.

## Re-evaluation and independent verification

No new Medium-or-above finding required a reviewer fix. Independently re-evaluated the final repair and its unchanged security boundaries after the worker owner's formal freeze.

| Check | Result |
| --- | --- |
| Frozen source and both final handoffs | All thirteen source pins and both handoff pins match |
| Publisher unit directory plus worker/runtime/pause | 276 passed across seven files, including 55 worker cases |
| Task-worker directory plus webinar foundation | 130 passed across eight files; overlaps preceding run |
| Exact outbound boundary and publisher command contracts | 26 passed across two files, including six outbound/security cases |
| Connectionless repository identity/admission | Three passed |
| Existing complete PostgreSQL diagnostic | 105 passed, zero failed/skipped; all twenty complete migrations |
| Fixture cleanup and unchanged seeder | Zero active locations; ten rows inserted then zero, both exit 0 |
| DB build and task/GHL/DB typechecks | Passed |
| Secret audit and package boundary audit | Passed; sixteen packages and rejection of two prohibited edges |
| Scoped static sinks, dependency delta and diff whitespace | Passed |

The first compatibility invocation included an absent optional file filter while still executing all seven existing selected files successfully. A subsequent guessed security contract path selected no tests and failed; the actual `tests/security/phase0-boundary.test.ts` and publisher command contract file were located and rerun successfully. Neither failed selection is counted as verification. No production assertion, timeout, budget or guard was weakened.

Reviewed existing RED evidence and current negative assertions for missing/stale/wrong-action/wrong-stage/foreign-identity/unknown-ID/digest/time/proof/source/cancellation cases, later contradictory observations and post-attempt terminal refusal. Current SQL tests explicitly require zero attempts when dispatch is refused and retained IDs/unprocessed outbox when a terminal checkpoint is refused. Worker tests require zero `beginDispatch` and zero publish/resume requests for verified drift or unknown/unverified preflight reads. The valid sequences are linked GET, control POST, progress GET, linked GET. Resume tests also retain child-health and post-reservation cancellation cases.

The existing ignored diagnostic runner and one-connection hook were inspected before reuse. They apply all complete migration bytes, use existing PGlite 0.3.15/socket 0.0.20 with PostgreSQL 17.5 and actual postgres.js 3.4.9 traffic. This reviewer reused existing regressions only, with disposable loopback traffic and no authorization substitution. Its single active backend serializes requests, so the Promise.all result does not replace native multi-backend concurrency qualification. Diagnostic log: `tmp/publisher-deadline-probe/preflight-security-existing-pg.log`, SHA-256 `cddee477e3a745d2bdfa1135db1c40d17ef448efe4f5d980880fcead4a786eac`.

## Frozen combined source pins

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
| Worker append-only handoff | `5a28b7c65a9531a075a159dade2dae35708551d63e0e9c8a0e126a4738b5e0db` |
| Database append-only handoff | `62b55990ad64e5230019d13e491ebcf6e978e88d67378f9d1802b88e09cbffd6` |

## Next step

Fresh independent Quality must review these exact source and report bytes, then the parent must run repository-health/Git closeout and canonical CI. This scoped PASS does not make the branch or product shippable.

Installed runtime remains unbound. Trusted deployed principal/source/media/capture/admission bindings and task accessor, separate least-privilege admission login, bounded signed outbox relay, independent withdrawal safety scheduling, authenticated HTTP/customer launch UI and actual provider qualification remain active engineering work. None is reduced to a credentials-only activation step. Preserve explicit action/spend confirmation, current authority, independently verified observations, qualified native budget/media semantics, uncertainty and stop-spend capability when composing them. No purchase, real draft, publication, live spending, pause/resume, migration deployment or production credential change occurred here.
