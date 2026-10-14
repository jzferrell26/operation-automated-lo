# QA Report: webinar publisher bindings and relay

**Plan:** Accepted CTR-003 revision 1 and `2026-10-14-webinar-publisher-bindings-relay-handoff.md`.
**Audit date:** 2026-10-14
**Base/head:** `24f2550f67893a54a7cd21e045e6e5ac34b09c9e`, branch `codex/webinar-publisher`, plus only the three frozen new files below.
**Auditor:** quality-guardian, `/root/domain_final_quality`
**Preceding Security:** `2026-10-14-webinar-publisher-bindings-relay-security-review.md`, SHA-256 `67d9883d11109eb57432fb6d09ed58c9b1b802a4303e5373f06384e32db611ff`.

## Summary

**New-file plumbing packet PASS; existing preflight Quality HOLD remains.** The mandatory-capability composition, defensive media/observation mapping and one-item in-process relay match their bounded handoff, with no new Critical, Warning or Suggestion found in these three files. This packet supplies neither original-command authentication provenance nor concrete source/raster, persisted media lease or durable native-capture verification; it cannot qualify runtime activation, real provider evidence, spending or whole CTR-003 completion.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Assigned composition/relay seams implemented; concrete missing services explicitly excluded and tracked. |
| Correctness | ✅ | Existing new-seam and worker/runtime/native/command tests pass; controlled concurrency remains distinct from real SQL fencing. |
| Alignment | ✅ | Existing HMAC, native, repository, worker and independently privileged admission boundaries retained. |
| Gaps | ✅ | Mandatory capability checks and current rechecks present within this packet; broader verification HOLD is not cleared. |
| Detrimental | ✅ | No provider dispatch, fabricated ACK/completion, fallback identity, new DDL or activation added by these files. |

## Critical Issues (must fix)

None newly found in this assigned three-file increment. No production command authentication or provider qualification is inferred from mandatory function presence.

## Warnings (should fix)

None newly found in this increment. **Existing Q-PUB-PREFLIGHT-01 remains open in its original thirteen-file audit**, `2026-10-14-webinar-publisher-preflight-quality-review.md`, SHA-256 `3f30bc1af0f06c322af9e5b76cfdb12e4c1e11c1f84c6b428de41009828f9277`. This report does not supersede or resolve it.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Assigned requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| BIND-01 | Strict server signing config and mandatory capabilities before composition | ✅ | `apps/tasks/src/core/webinar-publisher-runtime-bindings.ts:34-87` | Missing bindings fail with fixed error, no fallback identity/verifier/storage or activation. |
| BIND-02 | Distinct request/admission pool objects and existing admission boundary | ✅ | `runtime-bindings.ts:65-68`; existing runtime admission service | Object inequality detects accidental reuse only; actual separate login/least privilege still requires deployed qualification. |
| AUTH-01 | Bootstrap forwards only actor/location UUIDs and checks canonical current principal | ✅ | `runtime-bindings.ts:88-107` | Freeze, non-synthetic location_admin and canonical refs; no serialized roles or signing config forwarded. |
| AUTH-02 | Full principal consistency through current DB authority | ✅ | `runtime-bindings.ts:117-134` | Canonical hashes must equal; original session/installation provenance resolver itself remains absent. |
| SRC-01 | Preserve current preflight/source checks before required DB evidence authority | ✅ | `runtime-bindings.ts:129-134` | Uses existing application preflight and evidence helper; neutral production implementation of sourceEvidence is required. |
| MEDIA-01 | Obtain actual bytes/lease from required port and recheck authority after await | ✅ | `runtime-bindings.ts:136-153` | Principal and operation authority before/after retrieval; no upload or caller URL fetch. |
| MEDIA-02 | Existing verifier binds PNG/digest/length/1080 geometry/provider origin/end-date lease | ✅ | `runtime-bindings.ts:147-153`; existing media verifier and new seam tests | Generated actual PNG is checked in units; persisted provider lease provenance is not supplied by those bytes. |
| OBS-01 | Linked DTO, normalized hash, state/projection/IDs/time and null unknown metrics | ✅ | `runtime-bindings.ts:155-194`; new mapping cases | Rejects changed state/hash/IDs/Facebook IDs, invented zero metrics, future or expired candidate. |
| OBS-02 | Preserve independent durable response verification and admission verifier | ✅ | Required binding ports and existing `webinar-publisher-runtime.ts:122-124` | Strict mapper is normalization, not verified_provider provenance or App Test standing. |
| RELAY-01 | Strict server-owned scope and canonical current scanner principal | ✅ | `apps/tasks/src/core/webinar-publisher-relay.ts:25-77` | No global session enumeration or browser/serialized principal. |
| RELAY-02 | Scan one oldest pending item and read actual repository worker record | ✅ | `relay.ts:80-100` | Uses existing pendingTasks/readWorker contracts under tenant authority. |
| RELAY-03 | Bind operation, location, action, projection, correlation, actor and role version | ✅ | `relay.ts:99-111` | Immutable drift refuses before signing/invocation. |
| RELAY-04 | Completed/empty idle; active lease, near deadline and aborted work pending | ✅ | `relay.ts:82-85,96,111-121,154` | Current principal rechecked before proof. |
| RELAY-05 | Exact server-built request/delivery with existing HMAC and finite expiry | ✅ | `relay.ts:122-153` | Hash-bound request, actor/location; expiry no later than sixty seconds or operation deadline. No signing key in principal lookup/payload. |
| RELAY-06 | Fifty-second abort signal and no hidden relay retry/ACK/completion | ✅ | `relay.ts:82-85,92-94,154-158` | Existing worker/SQL owns attempts, lease/CAS, uncertainty/reconciliation and terminal outbox completion. This signal alone does not bound every awaited bootstrap/scan service. |
| RELAY-07 | Crash-before-invoke recovery and overlapping deliveries delegate fencing | ✅ | `tooling/tests/unit/task-workers/webinar-publisher-bindings-relay.test.ts:127-159` | Controlled models verify no relay completion; independent SQL concurrency not executed. |
| NG-01 | No shared source/DDL/dependency/task index/schedule or live effects in this packet | ✅ | New-file inventory and handoff | Existing other-owner changes observed and excluded; task stays RUNTIME_UNBOUND by default. |
| HOLD-01 | Preserve original preflight verification Warning and all failed/successful diagnostics | 🟦 | Original preflight Quality report | Two 104-pass/one-failure diagnostics, later unchanged 105-pass repetitions and inconclusive cause remain separate. |
| OPEN-01 | Original-command session/installation/role/version provenance and revalidation | 🟦 | Handoff missing-interface item 1 | Per-command closure or reviewed operation-aware interface required; scanner identity must not become spending identity. A newer session for same actor is insufficient. |
| OPEN-02 | Neutral current source/destination/registry/raster implementation | 🟦 | Handoff item 2 | Must preserve ownership, CTR-002/lender standing, rights, contained assets, pinned font and deterministic raster. |
| OPEN-03 | Persisted tenant/projection media bytes and actual provider file/URL/expiry lease | 🟦 | Handoff item 3 | Mandatory readMediaBytes is not an implemented media repository/upload/capture service. |
| OPEN-04 | Durable actual native artifact and separately authorized independent admission verifier | 🟦 | Handoff item 4 | Actual bytes/request/response/time/identity/qualification must be durably bound; shaped app_test/verified_provider records insufficient. |
| OPEN-05 | Reviewed runtime wiring, separate admission login, schedules/fairness and canonical proof | 🟦 | Handoff item 5 and relay policy | One unresolved oldest item may hold later work; no periodic scheduler or fairness policy supplied. No provider launch authorized. |

## Files Changed

- `apps/tasks/src/core/webinar-publisher-runtime-bindings.ts` (A): mandatory trusted-capability composition and current-principal/media/observation validation wrappers.
- `apps/tasks/src/core/webinar-publisher-relay.ts` (A): one-item persisted in-process delivery with exact signed request and existing-worker recovery delegation.
- `tooling/tests/unit/task-workers/webinar-publisher-bindings-relay.test.ts` (A): 33 controlled dependency-seam, generated PNG, mapping, signing and relay cases.

Only this new report was written. Earlier thirteen-file worker/SQL/native packets, shared task index, reports, root ledger and active author files were not changed or requalified. No Git write, live/provider probe, credential access or whole-app activation occurred.

## Independent verification

| Executed existing check | Result |
| --- | --- |
| New bindings/relay and existing worker/runtime/pause/native/commands suites | 273 passed in six files, includes 33 new cases |
| Existing CTR-003 command/outbox contracts | 20 passed |
| Task and tooling TypeScript | Passed |
| Focused lint and formatting | Passed |
| Boundaries and deliberately rejected reverse-dependency fixture | Passed for 16 packages; 2 prohibited edges rejected |
| Product types, secret audit and diff whitespace | Passed |
| Three source/handoff/Security/CTR-003 pins | Matched |
| Original preflight Quality report hash | Exact HOLD report unchanged |

The 293 existing cases overlap author/Security checks and are not added to earlier totals. The new 33 exercise actual repository SQL request contracts, existing HMAC verifier and an actual generated PNG with controlled principal, capture, admission, transport and driver responses. Overlap/loss tests model worker delegation; they do not prove independent-backend SQL races, actual provider responses, durable artifact provenance, a real media lease or deployed authentication. No new payload, mutation or database/browser/native provider probe was created or executed. Earlier author ten-build and test-first evidence is attributed rather than newly repeated here.

## Frozen provenance and retained HOLD

| File | SHA-256 |
| --- | --- |
| apps/tasks/src/core/webinar-publisher-runtime-bindings.ts | 38d23c823bf6e281c834db879aceebd5972ff2572cc5f20532e1e9d1031cef8d |
| apps/tasks/src/core/webinar-publisher-relay.ts | 67b79e7a5c809561d84dd8a89920663e41dff96fd9c791861473ac5da4cb27c7 |
| tooling/tests/unit/task-workers/webinar-publisher-bindings-relay.test.ts | 488b46e28fd9c7ee198d3ee227f949fbb80c1034bfc838c4189c5632ea75fd9b |
| library/requirements/reports/2026-10-14-webinar-publisher-bindings-relay-handoff.md | 52459f065f68891915b69c8b68ba9d0259fe740c075516e5d0f4735de0249d38 |
| library/requirements/reports/2026-10-14-webinar-publisher-bindings-relay-security-review.md | 67d9883d11109eb57432fb6d09ed58c9b1b802a4303e5373f06384e32db611ff |
| Accepted CTR-003 revision 1 | dfc912bfa9f00892641936794ce0488adc1fdea3df6bdf7a997cb8f00a48fe23 |
| Earlier preflight Quality HOLD | 3f30bc1af0f06c322af9e5b76cfdb12e4c1e11c1f84c6b428de41009828f9277 |

Q-PUB-PREFLIGHT-01 is an existing Warning about intermittent actual-wire admission setup before the target assertion. Its source report retains two independent 105-case diagnostic runs with 104 passing and one failing PUBLISHER_ADMISSION_INVALID, later unchanged passing repetitions and no proven cause. This new-file audit neither executes that diagnostic nor clears its Warning, overrides its source snapshot or relabels a failure. Root must resolve its verification gate under the original ownership and ordered review process.

After concrete provenance/source/media/capture services exist, root must separately review the wiring, schedule and capability-login changes and obtain current-head canonical CI. Required runtime integration is engineering work, not a credential-only blocker. Existing unbound default and provider gates remain; no live launch, spend, actual native capture, authenticated runtime completion, merge, deployment or whole publisher/CTR-003 acceptance follows from this bounded PASS.
