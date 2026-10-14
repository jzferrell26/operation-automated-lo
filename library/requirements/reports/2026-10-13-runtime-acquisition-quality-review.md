# QA Report: Bounded authenticated runtime acquisition and timing

**Plan document:** `RUNTIME_DIAGNOSIS_LEDGER.md`, with the root's bounded review assignment.
**Audit date:** 2026-10-13, America/Chicago.
**Base branch:** `codex/completion-reconciliation`, pinned at `5eb7fef829e6e17eaf147256f564704e46a23a7b`.
**Head:** `codex/authenticated-runtime-diagnosis`, uncommitted increment on that parent.
**Auditor:** independent quality-guardian.

## Summary

PASS for the bounded source increment after Security's shutdown-rejection correction, with no Critical, Warning or Suggestion findings. All eleven final Security source hashes match, and independent verification passed 97 focused cases plus 19 existing offline database cases. This clears the source handoff; actual PostgreSQL, current-head full CI, repository mergeability and hosted diagnosis/recovery remain open.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Acquisition, cleanup and diagnostic criteria trace to executable source and meaningful failure-path tests. |
| Correctness | ✅ | Public pool deadlines, eventual release, original failure propagation and healthy paths pass independent checks. |
| Alignment | ✅ | Existing validated timeout configuration and mandatory authentication are retained; no migration, dependency or hosted setting is changed. |
| Gaps | ✅ | Pending acquisition, late rejection, cache-close rejection, diagnostic sink failure and optional-read fallback paths are covered in this source scope. |
| Detrimental | ✅ | No new caller-controlled authorization, unhandled background rejection or raw exception logging was found. |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| ID | Plan Requirement | Status | Implementation Location | Notes |
| --- | --- | --- | --- | --- |
| RT-DEADLINE | Bound runtime connection acquisition with strict configuration and unchanged healthy behavior. | ✅ | `packages/db/src/postgres-adapter.ts:77-173`, `packages/db/src/postgres-adapter.ts:277-283`; `tooling/tests/unit/postgres-acquisition.test.ts:38-60`, `:93-112`, `:214-222` | Reuses the existing integer connection budget, default ten seconds and range one through thirty. The public `connect()` rejects with `DB_ACQUISITION_TIMEOUT`; the driver startup budget remains configured separately. |
| RT-DEADLINE-AUTH | Preserve mandatory authentication and tenant boundaries. | ✅ | `apps/web/src/server/authenticated-principal.ts:353-439`; `apps/web/src/server/runtime-authentication.ts:623-639`; `tooling/tests/unit/postgres-acquisition.test.ts:114-149` | The actual read-principal resolver receives the real public pool in the regression. Timeout rejects before binding or identity reads. Cookie/bearer ambiguity, current binding, identity, mutation/CSRF and synthetic-mode restrictions remain unchanged. |
| RT-CLEANUP | Reject timed-out or closed callers, release late reservations and handle late rejection. | ✅ | `packages/db/src/postgres-adapter.ts:120-181`; `tooling/tests/unit/postgres-acquisition.test.ts:48-91`, `:151-212` | Settlement clears the timer and pending callback. Close rejects every pending acquisition before awaiting driver shutdown. Both driver continuations remain attached, and eventual release occurs once. |
| RT-CLEANUP-OBSERVER | Diagnostic observer failure must not alter acquisition or cleanup. | ✅ | `packages/db/src/postgres-adapter.ts:106-118`, `:151-160`; `tooling/tests/unit/postgres-acquisition.test.ts:174-212` | Throwing callbacks cannot replace the caller's timeout or prevent eventual release. Late cleanup failure exposes only the fixed outcome. |
| RT-CLEANUP-CACHE | Handle the asynchronous shutdown rejection introduced into the reviewed cache replacement lifecycle. | ✅ | `apps/web/src/server/campaign-persistence-runtime.ts:105-111`; `apps/web/src/server/campaign-persistence-runtime.unit.test.ts:120-147` | Security's fixed Medium finding is independently verified. Replacement remains usable; `.catch()` consumes old-pool failure and emits a sanitized fixed marker. Direct awaited pool shutdown still retains its own rejection behavior. |
| RT-TIMING | Observe actual acquisition, principal, optional shell and saved-brand boundaries. | ✅ | `apps/web/src/server/runtime-authentication.ts:330-350`, `:581-584`, `:612-618`; `apps/web/src/server/authenticated-principal.ts:396-412`; `apps/web/src/server/ad-brand-read.ts:71-73` | These wrap the existing real operations. Required principal and saved-brand errors propagate; optional display/verification retain their previous neutral fallback only after authentication. |
| RT-TIMING-PRIVACY | Emit only bounded allowlisted stage/outcome/elapsed evidence under exact opt-in. | ✅ | `apps/web/src/server/runtime-timing.ts:5-73`; `apps/web/src/server/runtime-timing.unit.test.ts:8-74` | Only exact `OALO_RUNTIME_TIMING_DIAGNOSTICS=true` enables output. The emitter reconstructs and validates its DTO. Runtime extra fields, invalid outcome/timing, results and raw exceptions are excluded; sink failures preserve results and original errors. |
| RT-TIMING-CACHE | Preserve cached diagnostic mode according to the exact enable condition. | ✅ | `apps/web/src/server/campaign-persistence-runtime.ts:98-108`; `apps/web/src/server/runtime-authentication.ts:423-434`; `apps/web/src/server/campaign-persistence-runtime.unit.test.ts:100-118` | Exact true changes the fingerprint; uppercase input remains silent and reuses the silent campaign pool. Authentication composition passes its existing validated environment, whose passthrough preserves the optional flag. |
| RT-SECURITY | Independent Security must precede fresh Quality. | ✅ | `library/requirements/reports/2026-10-13-runtime-acquisition-security-review.md` | Final PASS consumed after remediation, including eleven matching frozen pins. No unresolved Security finding is waived. |
| RT-QUALITY | Fresh Quality checks final source, healthy paths and diagnostic limits. | ✅ | This report; ignored `test-results/quality-runtime/focused-green.log` and `db-offline-green.log` | 97 focused cases and 19 offline database cases passed independently after Security. |
| RT-PR | Reconcile current main, obtain green required CI and confirm MERGEABLE. | 🟦 | Root-owned `RUNTIME_DIAGNOSIS_LEDGER.md` | Still OPEN, belongs to the later repository/PR gate. This uncommitted source audit is not a branch ship declaration. |
| RT-LIVE | Establish the hosted stalled stage and verify recovery after an authorized deployment. | 🟦 | `library/requirements/reports/2026-10-13-live-library-timeout-review.md` | Still OPEN. Matched 300-second production failures establish the symptom, not its cause or recovery. No hosted diagnostic activation or deployment was performed. |
| NG-QUEUE | Do not claim driver queue cancellation or a whole-request deadline. | ✅ | `packages/db/src/postgres-adapter.ts:144-150`; implementation handoff, Reservation lifecycle | The installed Postgres.js reservation API has no queue cancellation method. A timed-out queue entry can persist until the driver resolves, rejects or closes. |
| NG-AUTH | Do not replace mandatory identity with optional-data fallback. | ✅ | `apps/web/src/server/runtime-authentication.ts:633-639`, `:590-592`, `:618-620`; `apps/web/src/server/ad-brand-read.ts:71-73` | Principal failure produces an unauthenticated shell. Optional failures cannot create identity or verified-email claims. Saved-brand failure is rethrown rather than converted into saved data. |
| NG-EFFECTS | No migrations, dependencies, provider activation, hosted changes or customer mutations in this increment. | ✅ | Combined tracked/untracked inventory against `5eb7fef`; eleven source files pinned below | Reviewed changes stay within runtime source/tests and local evidence reports. |

The ledger's OPEN states are root-owned and were not modified by this reviewer. Source criteria are verified here; the root decides how to record that evidence without closing the separate PR and live criteria.

### Independent verification and limits

The root explicitly released its machine regression runner before these checks started. The focused command was:

```powershell
pnpm exec vitest run --project unit tooling/tests/unit/postgres-acquisition.test.ts apps/web/src/server/runtime-timing.unit.test.ts apps/web/src/server/authenticated-principal.unit.test.ts apps/web/src/server/runtime-authentication.unit.test.ts apps/web/src/server/campaign-persistence-runtime.unit.test.ts tooling/tests/unit/runtime-authentication/runtime-function-query.test.ts tooling/tests/unit/runtime-authentication/role-binding-map.test.ts --reporter=dot
```

All seven files and 97 cases passed, with no unhandled rejection report. This is this reviewer's actual selected suite; Security's separate 105-case run is not relabeled as independent Quality evidence. The meaningful public-seam tests control the third-party driver and clock, while exercising the implemented pool and actual principal resolver. The inherited principal/composition and runtime-function cases verify adjacent authorization and allowed SQL behavior.

The independent offline Node command selected `postgres-adapter.test.mjs`, `transaction-context.test.mjs`, `foundation-contracts.test.mjs` and `campaign-repository.test.mjs` under `packages/db/test/`. All nineteen cases passed using the dependency build already completed by Security against these unchanged pins. These cover strict configuration, tenant context setup/verification, transaction lifetime and existing SQL DTO contracts. They do not execute PostgreSQL. No production build or broad suite was run by this reviewer. `git diff --check` passed.

Security's actual source inspection and passing typecheck/build/gate evidence were read separately. Its test-first old-cache failure and the implementer's four acquisition RED probes remain attributed to those reviewers, rather than claimed as tests performed here. Current production audit zero is likewise Security evidence.

The deadline controls acquisition waiting only. Driver queue lifetime, statement timeout, shutdown duration, event-loop starvation and total request time remain distinct. Concurrent diagnostic logs have no application correlation identifier and can interleave; the zero-millisecond cache cleanup marker is not measured shutdown duration. Optional reads have their existing catches, not a new universal request deadline. The source change therefore cannot establish the live root cause or repeated authenticated recovery. Actual PostgreSQL, full current-head CI, current-main reconciliation, MERGEABLE state and hosted verification remain required follow-up evidence.

### Final source pins

All eleven pins were recomputed after the independent checks and match the final Security review.

| File | SHA-256 |
| --- | --- |
| `packages/db/src/postgres-adapter.ts` | `2ca171f6507bce359f64d02bea2067aa454996d3568133d442c9fa394127d45f` |
| `packages/db/src/index.ts` | `bc9101eca17eeddfa9d43d7426e1963bf9b22f07955165e7de871b101d521ceb` |
| `tooling/tests/unit/postgres-acquisition.test.ts` | `01c07a48e0ed1f513a0c587548b903387de3af9e67617efb87f231e66ea6a199` |
| `apps/web/src/server/runtime-timing.ts` | `c4d4786d8ad294e8fb7e828f08a7dae6d98e66a02982b4ab9e099992c745a1da` |
| `apps/web/src/server/runtime-timing.unit.test.ts` | `0865c9fbe1fa682760c79d966900df10e95610de75e29966904b594e28550464` |
| `apps/web/src/server/authenticated-principal.ts` | `310794a3a7aed57810e112fd626463d430c720d70736990fcc89e1379cfe203a` |
| `apps/web/src/server/runtime-authentication.ts` | `da6be8a73e1bb61741edddd215a6588c6daca6260fc393b10ce9969f5ef1fce8` |
| `apps/web/src/server/runtime-authentication.unit.test.ts` | `4041cb1482b6a4f92879cec2a93cd0af5250432f8e930fdd33c7f21def5dc923` |
| `apps/web/src/server/campaign-persistence-runtime.ts` | `a7af324703dc559c6ef9aa3a08ede9268141776c6def29466c1274d44e00458f` |
| `apps/web/src/server/campaign-persistence-runtime.unit.test.ts` | `afc0132e51dbf58640dbc628687d739e06f6428983b712b87ea2e164075b6b17` |
| `apps/web/src/server/ad-brand-read.ts` | `2490dc198eeafc01d8b2e670e543efcc4c0357b8991f373ef1d2081213a2132b` |

## Files Changed

- `RUNTIME_DIAGNOSIS_LEDGER.md` (A, root-owned): bounded requirements and open source/PR/live evidence states.
- `apps/web/src/server/ad-brand-read.ts` (M): observe the actual saved-brand preference read without changing its failure direction.
- `apps/web/src/server/authenticated-principal.ts` (M): observe both existing principal resolution entry points.
- `apps/web/src/server/campaign-persistence-runtime.ts` (M): fingerprint diagnostic mode, attach pool observations and handle replaced-pool close rejection.
- `apps/web/src/server/campaign-persistence-runtime.unit.test.ts` (M): diagnostic fingerprint and rejected-shutdown regressions.
- `apps/web/src/server/runtime-authentication.ts` (M): authentication pool observations, cache fingerprint and optional shell-read timing.
- `apps/web/src/server/runtime-authentication.unit.test.ts` (M): failed-display observation while preserving the neutral fallback.
- `apps/web/src/server/runtime-timing.ts` (A): optional strict diagnostic DTO and operation/observer wrappers.
- `apps/web/src/server/runtime-timing.unit.test.ts` (A): exact opt-in, privacy, validation and sink isolation cases.
- `library/requirements/reports/2026-10-13-live-library-timeout-review.md` (A): separately attributed read-only production symptom evidence and unresolved cause.
- `library/requirements/reports/2026-10-13-runtime-acquisition-implementation.md` (A): implementation scope, test-first evidence and diagnostic limits.
- `library/requirements/reports/2026-10-13-runtime-acquisition-quality-review.md` (A): this independent final source review.
- `library/requirements/reports/2026-10-13-runtime-acquisition-security-review.md` (A): prior Security assessment, fixed Medium finding and final pins.
- `packages/db/src/index.ts` (M): export the optional typed acquisition observer contract.
- `packages/db/src/postgres-adapter.ts` (M): bounded acquisition, pending-close rejection and eventual reservation cleanup.
- `tooling/tests/unit/postgres-acquisition.test.ts` (A): lifecycle and real-principal failure-path regression suite.

Only this report was authored by Quality. Source, other reports, root ledger, hosted state and other worktrees were not modified. No commit, push or deployment was performed.

## CI correction Quality re-review: explicit diagnostic returns

### Summary

PASS for the two-line source correction against `e6c8b10`, after independent Security re-review. Both changes explicitly return from diagnostic-only catches that previously reached the same function's end; no findings were detected. Independent verification passed 65 cases in four files and the actual product-type audit; full corrected-head CI remains open.

The parent reported PR93 run `38496430954` passed actual PostgreSQL and release checks but failed the application product-type audit at the two empty catches. That earlier head's passing jobs are historical evidence. This review independently reproduced the corrected product-type audit locally, without treating the prior jobs as corrected-head or hosted verification.

### Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Both reported diagnostic catches now contain the explicit terminal return. |
| Correctness | ✅ | Sink and observer isolation, deadlines, close and late release pass the selected existing regressions. |
| Alignment | ✅ | Two lines added within the existing diagnostic scope; no policy, deadline, payload or authority change. |
| Gaps | ✅ | The product-type gate passes without relaxing its scanner or replacing the intended isolation behavior. |
| Detrimental | ✅ | Original operation errors still propagate, and private diagnostic exceptions remain excluded. |

### Critical Issues (must fix)

None.

### Warnings (should fix)

None.

### Suggestions (consider improving)

None.

### Plan Item Traceability

| ID | Requirement | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| RT-TIMING-PRIVACY | A diagnostic sink failure cannot alter successful operations or their original errors. | ✅ | `apps/web/src/server/runtime-timing.ts:32-47`, `:58-74`; `runtime-timing.unit.test.ts:61-74` | The new return exits only `emit()`. The operation wrapper's rethrow is unchanged. |
| RT-CLEANUP-OBSERVER | Throwing observer callbacks cannot abort acquisition or eventual cleanup. | ✅ | `packages/db/src/postgres-adapter.ts:106-118`, `:145-182`; `tooling/tests/unit/postgres-acquisition.test.ts:174-212` | The new return exits only the nested `observe` function. Timeout, reservation continuations, late release and close remain outside it. |
| RT-DEADLINE / RT-CLEANUP | Preserve public-pool deadline, pending-close rejection and late release. | ✅ | `tooling/tests/unit/postgres-acquisition.test.ts:38-172` | Default/configured budgets, healthy execution, eventual release, all pending callers, late rejection and original driver errors passed. |
| RT-DEADLINE-AUTH | Preserve mandatory authentication and optional neutral fallback. | ✅ | Acquisition test at `:114-149`; `runtime-authentication.unit.test.ts:421-577` | The actual principal timeout path, shell and failed-display cases passed. |
| RT-SECURITY / RT-QUALITY | Fresh independent Quality follows Security on exact corrected pins. | ✅ | Security report's explicit-return appendix; independently recomputed pins below | This appendix covers the new delta rather than reusing the initial source pass. |
| CI-PRODUCT-TYPES | Correct the reported gate failure without weakening the audit. | ✅ | `test-results/quality-runtime/explicit-return-product-types.log` | Actual `pnpm audit:product-types` passed. No scanner/configuration change. |
| RT-PR / RT-LIVE | Corrected-head full CI and hosted recovery require separate evidence. | 🟦 | Root-owned ledger and live diagnosis | Still open; no deployment, diagnostic activation or live operation performed here. |

### Verification and source pins

Independent command: `pnpm exec vitest run --project unit tooling/tests/unit/postgres-acquisition.test.ts apps/web/src/server/runtime-timing.unit.test.ts apps/web/src/server/runtime-authentication.unit.test.ts apps/web/src/server/campaign-persistence-runtime.unit.test.ts --reporter=dot`. All four files and 65 tests passed with no unhandled rejection report. Evidence: ignored `test-results/quality-runtime/explicit-return-focused-green.log`.

`pnpm audit:product-types` passed independently, reporting no explicit any, CommonJS require or swallowed catch. `git diff --check` passed. Scoped source lint and report/source formatting checks passed. No production build, broad suite or local PostgreSQL execution was performed. The source scope is precisely two added `return;` statements; both complete surrounding implementations and the parent diff were inspected.

These two independently recomputed hashes match Security's corrected pins and supersede the corresponding initial entries above. The remaining original nine source/test pins still match.

| File | SHA-256 |
| --- | --- |
| `apps/web/src/server/runtime-timing.ts` | `102f793d6c1ee6859734700d3af9f698c63d61650db7a37f06d1d4b914d3f58d` |
| `packages/db/src/postgres-adapter.ts` | `a7461870b39157e72e3339f83d420727f1113bee45d836921b1fefa8af4e3196` |

### Files Changed

- `apps/web/src/server/runtime-timing.ts` (M): explicit terminal return in the diagnostic emitter catch.
- `packages/db/src/postgres-adapter.ts` (M): explicit terminal return in the nested acquisition observer catch.
- `library/requirements/reports/2026-10-13-runtime-acquisition-security-review.md` (M, Security-owned): prior independent review of this correction.
- `library/requirements/reports/2026-10-13-runtime-acquisition-quality-review.md` (M): this fresh bounded review appendix.

Only the Quality report append was authored here. Source and other owners' files remain untouched. Ownership is released to the root for corrected-head CI and PR verification; no commit, push or deployment occurred.
