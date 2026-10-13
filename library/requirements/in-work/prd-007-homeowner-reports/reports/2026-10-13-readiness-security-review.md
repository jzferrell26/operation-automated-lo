# Homeowner readiness security review

Date: October 13, 2026. Auditor: security-guardian. Branch: `codex/homeowner-readiness`, base `728d5f0`. Source plan: `HOMEOWNER_READINESS_LEDGER.md`.

## Executive summary

No Critical, High, Medium or Low findings detected in the scoped readiness implementation. Cleared to proceed to fresh Quality. Authentication, tenant ownership, paid-lookup reservation and delivery consent remain server-enforced; the new readiness statuses grant no authority.

Coverage includes all modified homeowner runtime/client/contract files and tests, new readiness modules and final browser spec, immediate authentication/tenant/cache/service neighbors, and the copied Next.js dependency patch. This is a scoped source review with independent unit/integration and deterministic scans. Actual signed-in browser and PostgreSQL route execution remain pending CI because the local Docker engine is unavailable. No hosted, provider or complete PRD-007 outcome is certified.

Security ran before fresh Quality for this increment. No current readiness Quality report existed on entry. The already-read native Guardian and paired Weapon procedures were reused. Weapon CVE intelligence dates to April 24, 2026, 172 days old; fresh registry audit and the same-day official advisory checks from the preceding dependency review supplement that stale catalog. Canonical Weapon refresh remains separate work.

## Surface coverage checklist

### Next.js, React and client recovery

None detected. `HomeReadinessSchema` at `packages/contracts/src/homeowner-reports.ts:192` is strict and contains only four enum fields. Missing readiness in older workspace payloads defaults to explicit unknown states, not inferred permission or allowance. The new client helpers do not authorize commands.

On a failed recheck, `apps/web/src/features/homeowners/use-home-workspace.ts:133` preserves reports already received in the current page's memory, clears `canWrite` and resets readiness to unknown. Successful recovery replaces that state from the parsed server response. No new persistent browser cache, storage write, telemetry or external request is added. Existing HTTP reads remain same-origin, `no-store` and redirect-refusing. Static notice strings render as React text.

The final new browser test uses all four shared viewport frames, both themes, full shared axe checks, overflow checks and the unavailable-setup transition. It aborts/counts mutation requests and guards against external requests. Its report API responses are synthetic fixtures inside a signed-in shell; it is not evidence of an actual licensed valuation or provider handoff.

### Authentication, authorization and tenancy

None detected. `handleHomeWorkspace` still invokes `homeRuntime` before any workspace read or action parse. `apps/web/src/server/homeowners/runtime.ts:71` independently resolves the authenticated read or mutation principal; the latter retains the existing session/CSRF gate. Platform support remains refused, and only location administrators/campaign creators can write at `:73`. Readiness is projected only after authorized usage and property reads succeed at `apps/web/src/server/homeowners/http.ts:168`.

The unchanged repository binds reads and writes to its principal-bound tenant transaction. Snapshot reads filter both location and id at `packages/db/src/homeowner-repository.ts:78`; property, usage and cached valuation queries likewise scope the location. Revision resolves the prior report through that scoped repository and binds the reused snapshot to its property. The new DTO accepts no credentials, setting names, provider key, location identifier or browser-selected authority.

Unit tests verify viewer reads and rejection of viewer writes before storage/provider work. Added PostgreSQL tests assert read-only projection, foreign-workspace isolation and saved-report availability without a valuation adapter; these database tests were inspected but not run by this reviewer.

### Paid lookup and cache boundaries

None detected. Ready/zero/exhausted UI states are presentation snapshots, not a quota reservation. All commands retain strict discriminated input schemas and recompute dependencies from server configuration.

The unchanged reservation code at `packages/db/src/homeowner-repository.ts:203` takes the location lock, checks request idempotency, verifies property/contact/address binding, resolves an eligible cache or exact saved report, and checks usage against the server limit at `:270` before an uncached lookup. Cached creation and exact snapshot revision can therefore remain available at zero fresh allowance without granting a fresh provider call. Unit tests explicitly assert no valuation call or contact call for the property-only cached/revised scenario.

### Monthly refresh, sharing and delivery

None detected. UI fresh-refresh and resume controls require current readiness; a writer can still pause a saved schedule or turn off a delivery preference while setup/allowance is unavailable. Read-only UI does not offer creation/edit actions. Server mutation authority remains decisive, including for a previously open dialog or modified browser state.

No enrollment, sharing or delivery command enforcement was relaxed. Source freshness checks, revocable sharing, verified contact requirements, configured delivery flag, communication consent and uncertain-write/idempotency holds remain in the existing service/HTTP paths. This increment neither enables a provider nor changes L-5 contact scope, L-15 retention/export/removal or L-16 financial-snapshot read roles.

### Secrets, PII, errors and logging

None detected in the diff. New readiness refusals expose safe enum states. `storage: unavailable` specifically denotes the report surface being switched off; it does not establish missing storage schema or migrations. Unexpected storage failures return generic errors and unknown capability, not the raw exception. Unit tests prove internal database details, setting names, fixture keys and identifiers do not leak through the new projection.

No new credential, environment value, customer fixture from production, raw mortgage data log, persistent financial-data cache or public URL parameter is introduced. The existing response headers in `errors.ts` remain private/no-store, no-referrer and noindex. Previously authorized saved snapshots remain readable/downloadable in the page; no additional financial fields are fetched by the readiness change.

### Injection, paths, configuration and transport

None detected. The readiness diff adds no raw HTML, SQL/command string interpolation, arbitrary URL fetch, filesystem path or provider transport. Existing bounded JSON body parsing, strict action validation, fixed internal routes and safe report responses remain intact. Global headers/auth configuration and database migrations are unchanged; this review does not re-certify the whole inherited application configuration.

### Dependencies and supply chain

None unresolved. Root carried the exact minimal Next.js 16.3.6 to 16.3.8 patch from PR #90 into this branch's package declaration and lockfile. Independently confirmed installed 16.3.8, matching declaration/lockfile family changes, and no new ignore/configuration exception. React/React DOM remain 19.3.0.

Production registry metadata reports zero advisories at every severity. Full audit exits zero and retains only the existing owner-accepted development-tool `braces` exception, documented in `pnpm-workspace.yaml`; this review creates no exception. The fresh secret and rules-file Unicode scans passed.

## Findings detail

None detected. No remediation or policy decision was required from this reviewer.

## Remediation summary

| Severity | New findings | Fixed by reviewer | Unresolved |
| -------- | ------------ | ----------------- | ---------- |
| Critical | 0            | 0                 | 0          |
| High     | 0            | 0                 | 0          |
| Medium   | 0            | 0                 | 0          |
| Low      | 0            | 0                 | 0          |

This reviewer wrote only this assigned report in the homeowner worktree. The copied dependency patch is root-owned. Primary and financing files were untouched.

## Verification and re-evaluation

| Independently executed check                                     | Result                                                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Readiness, settings-faults and service unit tests                | 27 passed                                                                                                   |
| Readiness, refusal-messages and report-actions integration tests | 25 passed                                                                                                   |
| Weapon `scan.ts`, with scratch output outside the worktree       | Completed; production registry metadata all zero; rules Unicode clean; no new scoped vulnerable-pattern hit |
| `pnpm audit --audit-level=high`                                  | Exit 0; existing accepted development-tool exception only                                                   |
| `node tooling/scripts/audit-secrets.mjs`                         | Passed across six source roots and public environment boundary                                              |
| Installed Next.js query                                          | 16.3.8                                                                                                      |
| `git diff --check`, including final four-width browser spec      | Passed                                                                                                      |

The implementation owner separately reports 33 unit, 47 integration and six demo browser tests, build/type/audit checks passing. Those broader results are attributed to the owner and not represented as independently rerun here. The new signed-in readiness spec and real PostgreSQL routes require actual CI execution. Full final scope rechecked after the browser-only extension; no runtime change or Medium-or-higher remediation occurred during this audit.

### Final test-artifact and CI recheck

Security reopened before fresh Quality for the final test/CI-only delta. The new browser spec writes screenshots to the constant `test-results/product-review-frames/homeowner-readiness` directory using filenames derived solely from trusted viewport numbers and literal theme names. The setup-unavailable frame is captured after its readiness, saved-output, axe and overflow assertions. No path component or capture content is supplied by a customer. The test retains its fixture report responses, seeded local-account shell, external-request guard and mutation counter. No runtime behavior changed.

The added database-job artifact step uses the identical pinned `actions/upload-artifact` SHA already present in this workflow. Its path is confined to `test-results/product-review-frames`, retention is seven days, absent files are ignored, and `always()` preserves available evidence after failure. No event, permission, secret, provider credential or pass/fail gate changed. Only successful assertion-point screenshots are produced by this spec; credentials and session tokens are not added to the screenshot path or metadata by these changes.

No new security finding detected. Independently reviewed both final deltas and passed `git diff --check`; tooling type/format checks are parent-reported. No actual new screenshots or successful database/browser run are claimed before CI executes. The separate DevOps review and fresh Quality remain required. Security clearance remains valid for this final delta.

### Readiness notice and handoff source-fix cycle

Security reopened before fresh Quality for the frozen three-file delta following PR #91 head `7a434df`: `homeowners.module.css`, `workspace.tsx` and `readiness.integration.test.tsx`. Earlier Quality evidence remains historical; this source correction requires its own subsequent Quality pass.

None detected. The new CSS selector adjusts only readiness-notice paragraphs to the existing `--text-secondary-size` token. The HighLevel handoff button now additionally requires connected contacts, confirmed ready storage and allowed write capability. Existing `canWrite`, delivery-enabled, busy and property-only guards remain. This strengthens presentation checks without granting authority or relaxing the existing server handoff verification. The adjacent messages render as plain text and explain unknown capability, read-only access, missing contact connection or disabled delivery. The schedule action name is chosen from existing validated enrollment state, not a supplied URL or executable value.

The available-writer path still opens a deliberate confirmation dialog without dispatching a request. Unknown/read-only/disconnected paths cannot open it or send a handoff. Saved PDF access remains intact. An existing delivery preference can still be turned off through the schedule controls, and existing pause/on-demand behavior is preserved. No provider flag, quota, role, consent requirement, migration, financial data policy or L-5/L-15/L-16 decision changed. Server authority remains decisive for forged or stale client state.

Independently ran the final readiness interaction test file: fourteen tests passed, including the new unavailable-role/connection/unknown cases, configured-writer dialog behavior and turning off an existing preference. `git diff --check` passed. The owner separately reports fifty-four integration tests and types/lint/format/duplication checks passing; those broader results are attributed to the owner. Parent-reported CI run `38473357552` covers the earlier head, not this final CSS/control delta. Final new CI and twelve-frame inspection remain pending and are not inferred from older captures.

Zero unresolved Medium-or-higher security findings. Cleared for fresh Quality on this source-fix cycle. No production service, shared port or unrelated worktree was touched by this reviewer.

### Signed-in theme-control test repair

Security reopened before fresh Quality for the final browser-test-only correction. The homeowner spec replaces the nonexistent demo-shell `Appearance` locator with the existing `chooseThemeFromTheHeader` helper. That helper uses the real signed-in account control, selects Light/Dark, verifies theme resolution, closes the dialog and checks focus return. Added `settleForScreenshot` waits for applied styles/fonts/transitions and idle network; `warmFullPageCapture` takes one discarded screenshot before retaining the final frame. Neither helper authorizes a report action or changes its data.

None detected. The local-origin/external-request guard, seeded fixture account and synthetic report API answers, mutation counter/abort, saved-output/control assertions, full axe/overflow checks and constant retained evidence directory/filenames remain unchanged. No runtime, CI permission, provider setting or policy delta is included in this repair. `git diff --check` passed; root reports tooling type/format checks passing. Actual repaired signed-in execution remains pending, rather than being inferred from source review.

Reviewed `test-results/homeowner-readiness-first-db-ci.log`: run `38473357552` finished with failure, including four 120-second timeouts on the nonexistent `Appearance` button and two old screenshot baseline mismatches. Its twenty-two PostgreSQL route test files and 295 tests passed, as shown in the log; the parent also reports migration/pgTAP success. Those backend checks cover the unchanged backend at the prior head. The missing-control failures belong to the newly authored test, not an observed product authentication fault. The log records no retained product-review-frame artifact, so no twelve-frame evidence is credited here.

Zero unresolved Medium-or-higher security findings. Cleared for subsequent fresh Quality on this test-only correction, subject to the already-recorded runtime source-fix clearance. Stacking/shared capture changes, new baseline acceptance and the repaired canonical/full-CI result require their separate evidence; this appendix certifies none of those future results.

## Next step

Cleared for fresh Quality against HR-STATE through HR-PROOF and their stated evidence limits. Run the outstanding signed-in browser/PostgreSQL checks and required branch CI before claiming HR-PR complete. Reconcile current main and confirm PR mergeability separately. Licensed valuation, contact handoff, hosted configuration and owner policy decisions remain external evidence or later work, not closed by readiness presentation.

## Mobile notice and canonical baseline security cycle

Fresh Security runs before the requested fresh Quality pass for the uncommitted delta from `140a3e1636194c8d56fea8d2d7575b278292bfa5`. Earlier Quality results are historical and do not qualify this correction. No current-cycle Quality report existed on entry; `library/qa` is absent. Scope is the twelve changed files: readiness-only responsive CSS, its browser geometry assertions, eight canonical empty-account PNGs, the root ledger and UX appendix. No source remediation was required. This reviewer appended only this report and wrote ignored local verification evidence.

**No Critical, High, Medium or Low security finding detected in this delta.** `apps/web/src/features/homeowners/homeowners.module.css:819-830` changes only layout under the existing 760px media query. It gives readiness copy a full column and places its bounded button below that copy. No `display`, visibility, disabled-state, overlay, pointer-event, permission or role rule is altered. The legacy notice rule remains intact. The unchanged rendering at `workspace.tsx:895-903` still emits plain React text and the existing availability reload button, including its busy disablement. Server authentication, tenant filtering, quota reservation, financial snapshots, delivery consent and provider gates are unchanged.

`tests/browser/review/homeowner-readiness.spec.ts:25-51` measures boxes and padding in the existing local browser page, asserts a full copy column, action position and shared starting edge, and runs only for the trusted 390px frame. The helper does not mutate page content, hide controls, disable assertions, write data or grant authority. Existing local-origin guarding, synthetic responses, mutation abort/counter, axe and overflow checks, saved-output assertions and constant screenshot destinations remain. No route, database, dependency, CI permission, production setting or policy changed. The ledger and UX appendix explicitly preserve rejected original mobile detail captures and pending fresh twelve-frame qualification. No executable URL, credential or customer fixture was added.

### Independent canonical provenance and binary verification

Queried GitHub run `38479999828`: head is exactly `140a3e1636194c8d56fea8d2d7575b278292bfa5`, workflow is Screen baselines, and overall conclusion is failure. The actual review artifact is `screen-baselines-review`, artifact ID `11858817593`, digest `sha256:41b323fbe7bd8a5c92b1611902353119239f614d1d4708d449ccaf6fc6e8bccd`. Independently downloaded that artifact into `test-results/homeowner-mobile-security-canonical`. All eight replaced files are byte-for-byte identical both to that independent download and to the root's original downloaded canonical files. These are whole actual PNGs, with no image compositing.

All eight decode successfully with Sharp, retain their original dimensions, have valid chunk CRCs, contain only IHDR/IDAT/IEND chunks, and end exactly at IEND. No EXIF, text, XMP or other ancillary metadata, malformed chunk bounds or trailing payload was found. Independent raw RGBA comparison against `HEAD` reproduced every changed-pixel count and bound in the UX table. Changes remain inside the empty-state text/action region and resulting mobile card edge/shadow; no shell-header or incidental account-control pixel changed. A directly opened 390px Light and 1440px Dark image show the synthetic seeded shell and empty-state explanation, with no property values, credentials or session data. UX owns its separate all-eight visual acceptance.

| Canonical file suffix | SHA-256 |
| --- | --- |
| 1440--light | fdfdd2c11be4211258e9d8128ab7f6758a2a7364921e703dbcdffd65eb915c62 |
| 1440--dark | d484b2dcc97121e05fa55890f42c51bf02fae607ac2d2614c68b0c17d9f870ec |
| 1180--light | 410994023490bffcf19d0e7356e393e9111a2941a829e478e2d0cf460fd60ab4 |
| 1180--dark | 0a579ae3fad21526931c723177ab5a0d85135691cf0c7d2f6082b5dbc99debdc |
| 768--light | 0ec60d8192b81df2de4be38def0fc09f12b4f9a1ed9286336f21e6afed7d3eaf |
| 768--dark | 4aa069d6b8f819eb22bc3c8777339f0d143aacf4c84c83690a2e2e61a1be6f90 |
| 390--light | 86ca230618558dad3b0fc1b32065f8055740c16db251c184cdf895e517fb8f65 |
| 390--dark | 4a872fb681fd0f515cb8f40276e0aa020f3dea68d492c0d294dea425ee666ad9 |

The paths share `tests/visual/screens/review/homeowners--empty-account--` and `.png`. Machine evidence with dimensions, counts, bounds and chunk lists is retained in ignored `test-results/homeowner-mobile-security-png-verification.json`.

### Independently executed checks and source pins

- Readiness integration: one file, fourteen tests passed. Preserved reader/unknown/disconnected/delivery refusals, configured-writer dialog behavior and turning off an existing preference remain covered. Log: `test-results/homeowner-mobile-security-integration.log`.
- Fresh production registry audit: zero advisories at every severity, exit zero. Installed package query from the application resolves Next.js 16.3.8 and React 19.3.0. No dependency or exception changed. The Weapon's April 24 watchlist remains stale; the preceding same-day official-advisory review and this fresh registry check supplement it without refreshing the Weapon itself.
- Fresh repository secret audit passed across six source roots and the public environment boundary. The prior full deterministic Weapon scan remains the historical broader audit; this narrowly scoped cycle does not represent a second full application scan.
- `git diff --check` passed. Diff confirms no new change to workspace rendering/authority, server, contract, application, database, workflow or lockfile paths.

| Reviewed source | SHA-256 |
| --- | --- |
| homeowners.module.css | 3dd2f7b1fee53d4df95ba628fb0c17422fec8eab890f19f560f9fdd73b6d67ff |
| homeowner-readiness.spec.ts | 31df42ef40a583e8fe87e3a9aa9c9c79c420280ffd6ac019191711e1bad0e455 |
| HOMEOWNER_READINESS_LEDGER.md | dc6c6768812a99c884dc18f4b02d6f25d4497ea6468ac5041f69184a2fd1a6e4 |
| readiness-ux-review.md | 23576a5b842ad04c0ed3f64f7cc251271c751bd3948435555531e3b4ac26b319 |

GitHub run `38480000153` independently reports overall failure at the same old head. The parent attributes its successful migration/pgTAP, 22 PostgreSQL files and 295 route tests plus four new browser cases to that run; those component results are not independently rerun here. The original twelve detail pictures include the two UX-rejected zero-allowance mobile states. The isolated old-CSS RED4/new-CSS GREEN4 probe is diagnostic evidence only. Neither those old pictures nor the canonical empty-account images qualify fresh full-product detail rendering after this CSS change. HR-PROOF, final CI, hosted/provider behavior, customer approval and L-5/L-15/L-16 remain open as already recorded.

Cleared for fresh Quality on this frozen delta, with zero unresolved Medium-or-higher security findings. The orchestrator should perform its repository-health/release checks before commit or push and retain the pending fresh browser and CI evidence limits.
