# Security review: webinar publisher bindings and relay

Date: 2026-10-14. Independent reviewer: security-guardian. Worktree: webinar-publisher. Scope: the three new frozen sources and their handoff below. Ownership: this report only.

## Executive summary

Scoped source PASS, cleared to proceed to fresh Quality for this increment. No Critical, High, Medium or Low finding detected in the three new files. The factory composes existing HMAC, repository, native transport and worker boundaries using mandatory trusted services; the bounded relay signs one exact persisted task and leaves terminal completion to the worker/repository.

The new factory is not a configured deployment. Original-command authentication provenance, neutral current source/raster service, persisted provider media lease, actual durable native capture and independent admission verification remain unbuilt capabilities. The existing production task defaults to RUNTIME_UNBOUND. No production launch authority, App Test PASS, real provider capture or spending qualification follows from these source seams.

Earlier preflight Quality remains HOLD at SHA-256 3f30bc1af0f06c322af9e5b76cfdb12e4c1e11c1f84c6b428de41009828f9277. Q-PUB-PREFLIGHT-01, the two 104-pass/one-failure diagnostics, later unchanged 105-pass repetitions and the inconclusive cause remain separate verification history. This report neither clears that Warning nor overrides the prior thirteen-file packet. Fresh Quality for the new files must follow this report.

This was a read-only defensive pass using existing released tests, static source and relevant unchanged supporting interfaces. No new payload, probe, native PostgreSQL run, browser, provider request, credential access, source edit, Git operation or ledger change occurred. The managed Security Weapon and integrated procedures apply; its 2026-04-24 CVE intelligence remains older than 120 days. No latest-advisory or online dependency-audit assertion is made. Broad scanner writes/external work are outside this assigned brief; supported existing tests and local audits were used instead.

## Surface coverage checklist

### Application and configuration

None detected. webinar-publisher-runtime-bindings.ts:34-87 validates a strict server signing configuration and all required capabilities before composition. There is no permissive identity, verifier, in-memory store or automatic environment activation. Missing configuration produces a fixed error without returning its contents. Request and admission pools must be different objects; this catches accidental object reuse only. It does not prove different database logins, role membership or least privilege. Deployed admission authority still requires the existing protected SQL grant and separately configured capability login.

### Authentication and tenancy

None detected in this source increment. At runtime-bindings.ts:88-107 current authentication receives only actor/location UUIDs. The returned principal is frozen and checked for exact IDs and their canonical references, non-synthetic authentication and current location_admin authority. Signing configuration, serialized roles and supplied session fields are not forwarded into the authentication bootstrap.

The database-authority wrapper at lines 117-134 compares full canonical principal hashes after current authentication and database authorization, and adds the existing preflight/source checks before its mandatory database evidence authority. Media at lines 136-153 checks current principal and current operation authority both before and after awaited retrieval. Existing native/compiler/repository/worker checks remain additional barriers, not waived by these wrappers.

The currently required authentication.current(actorId, locationId) service is not an implemented original-command authentication resolver. An arbitrary newer session for the same actor cannot substitute for the command's immutable originating session/installation. The handoff explicitly requires a per-command closure or a reviewed interface carrying operation identity plus persisted server-verified provenance and exact revocation/expiry revalidation before deployed wiring. The relay's scanner principal must not become the spending command principal. This missing concrete boundary is not qualified by mandatory function presence or unit mocks.

### Secrets and environment

None detected. Signing key format is strict server-only configuration and is not forwarded to principal lookup, emitted in task payloads or logged by the new files. Principal/service configuration failures use a fixed code/message. The secret audit passes across six source roots and the public environment boundary. No environment, credential, deployment flag or task index was changed by this packet.

### Media, third-party intake and independent provenance

None detected. The required readMediaBytes service supplies actual bytes and persisted lease metadata; the wrapper does not upload or fetch a caller URL. Existing verifyWebinarPublisherMedia validates PNG structure, exact approved digest/length, 1080-square dimensions, finite file identity, provider URL and delivery through the approved end date. The provider origins supplied by the wrapper are fixed storage.googleapis.com and files.leadconnectorhq.com. Existing native compiler checks bind the resulting media receipt to the operation's original projection/ref/asset/digest before a provider request. A valid receipt shape is not proof a real media lease exists.

At runtime-bindings.ts:155-194 response mapping accepts only linked reads, parses the existing DTO and recomputes its normalized hash. It requires exact current observation/state/projection/readback/native identity binding, actual linked Facebook identities, null unknown metrics, nonfuture observation and unexpired candidate. Invented zero metrics refuse rather than implying observed performance.

The mapper does not establish verified_provider provenance. The unchanged real runtime first calls required verifyResponse, then constructs the candidate and invokes createWebinarPublisherAdmissionService, whose independently provisioned verifier must validate the durable artifact before the separate admission login persists it. These actual capture/verifier implementations remain absent. The test's synthetic normalized verified_provider metadata is explicitly a mapping fixture, not a verified provider record or App Test evidence.

### Relay authority, dispatch and recovery

None detected in the new relay source. webinar-publisher-relay.ts:32-77 strictly validates server-owned scope and required capabilities, then validates the current canonical principal. Each run scans only one oldest pending task using the actual repository interfaces and current tenant authority. At lines 99-111 the task and worker record must match operation, owner location, action, projection, correlation, actor and role version. Completed work returns idle; active lease, exhausted deadline or cancellation prevents invocation. Current principal is rechecked before signing.

At lines 126-157 the relay derives an exact delivery/request from the validated persisted task and signs it with the existing HMAC authority, binding request hash, delivery, actor/location and expiry no later than sixty seconds or the operation deadline. The real authority verifier retains constant-time signature verification and expired/mismatched request refusal. The relay passes a fifty-second abort signal to the existing runtime and checks cancellation before invocation. This is not proof every external bootstrap/scan dependency completes within fifty seconds; their concrete time bounds remain composition requirements.

The relay performs no provider entity creation, broker submission, guessed-ID search, blind write retry, acknowledgement fabrication or outbox processed update. Existing worker claim/lease/generation/cancellation/attempt CAS and SQL terminal completion own recovery and completion. The new overlap/crash cases model that delegation with controlled ports; they do not establish actual concurrent PostgreSQL fencing or provider outcomes. The oldest-item strategy may hold later work behind an unresolved operation. Fairness, schedules, wiring and reconciliation operations remain open engineering, not a hidden retry loop.

### Dependencies and supply chain

None detected in the delta. No dependency, lockfile, loader, configuration, shared source or migration was edited by this increment. Earlier dependency audit evidence retains its own scope; no registry request occurred.

### Headers and transport

None detected in the delta. No HTTP handler, request URL, provider route allowlist, token transport or public header policy change. Existing runtime/native transport and compiler are required supporting boundaries. This report does not requalify every old shared transport line or clear prior database warnings.

### AI-generated code and guard preservation

None detected. Required capabilities and stable refusal replace neither immutable source authority nor actual provenance. The runtime remains unbound by default and no schedule/task export was added. The relay's output does not claim publish success merely because a signed task was invoked. The existing worker/native/command compatibility tests pass against this composition increment without weakened assertions, timeouts or thresholds.

### PII, financial data and logging

None detected in this delta. New files contain no log, client storage or customer-data export path. The signed task retains opaque operation/location/projection/correlation identity rather than raw native responses, tokens, source/financial records or principal secrets. Original spend confirmation and immutable projection remain downstream worker/repository obligations. No actual provider charge, launch or contact action was executed in this review.

## Findings detail

Critical: None detected. High: None detected. Medium: None detected. Low: None detected in the assigned three-file increment. Missing concrete trusted services and existing Quality HOLD are explicit engineering/verification limits, not cleared by this report.

## Remediation summary

| Severity | Count | Fixed by reviewer | Documented source findings |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

Only this report was authored. No existing source, SQL, test, report, ledger, artifact, configuration or Git state was modified by the reviewer.

## Independent verification

| Check | Result |
| --- | --- |
| New binding/relay plus existing worker/runtime/pause/native/commands units | 273 passed in six files, including the 33 new cases |
| Existing CTR-003 command/outbox contract cases | 20 passed in one file |
| Task and tooling TypeScript | Passed |
| Focused lint and formatting | Passed |
| Boundary audit | Passed for 16 packages |
| Secrets and product-type audits | Passed |
| Diff whitespace | Passed |
| Three source pins and handoff | Exact raw hashes match |
| Prior preflight Quality | Exact 3f30bc1a... report hash retained |

Commands used the existing unit project for webinar-publisher-bindings-relay, worker, runtime, pause, native-adapter and commands files, plus the contracts project for tooling/tests/contracts/webinar-publisher-command.test.ts. The new seam tests use real repository request contracts, HMAC verifier and a real generated PNG with synthetic authority/runtime/driver rows. No real provider capture, database concurrency, native dispatch or hosted credential qualification follows. No new negative test input was authored by Security.

A supporting read initially named a nonexistent guessed authenticated-principal.ts and a Windows-incompatible shell file wildcard. Discovery located campaign-command-context.ts and the exact existing media/compiler files; subsequent source review uses those actual files. No verification was claimed from failed reads and no file was affected.

## Frozen scope

| File | SHA-256 |
| --- | --- |
| apps/tasks/src/core/webinar-publisher-runtime-bindings.ts | 38d23c823bf6e281c834db879aceebd5972ff2572cc5f20532e1e9d1031cef8d |
| apps/tasks/src/core/webinar-publisher-relay.ts | 67b79e7a5c809561d84dd8a89920663e41dff96fd9c791861473ac5da4cb27c7 |
| tooling/tests/unit/task-workers/webinar-publisher-bindings-relay.test.ts | 488b46e28fd9c7ee198d3ee227f949fbb80c1034bfc838c4189c5632ea75fd9b |
| library/requirements/reports/2026-10-14-webinar-publisher-bindings-relay-handoff.md | 52459f065f68891915b69c8b68ba9d0259fe740c075516e5d0f4735de0249d38 |

## Re-evaluation

No Medium-or-above source finding required fixes. The final frozen sources and existing supporting interfaces were read, existing defensive tests passed, and raw source/handoff hashes matched. No source finding blocks this increment from fresh Quality; the earlier separate verification HOLD remains.

## Next step

Fresh quality-guardian should review these exact new files and handoff. Root retains repository-health, PR review, exact Git receipts and current-head canonical CI. Implement and separately review immutable original-command authentication, neutral source/raster extraction, persisted media lease and durable actual capture/admission capabilities, then explicitly wire the runtime and bounded relay/safety schedules. Resolve the earlier Quality Warning without rewriting failed evidence or asserting an unproven root cause. No purchase, live provider effect, launch, merge, deployment or whole-publisher completion was performed or cleared here.
