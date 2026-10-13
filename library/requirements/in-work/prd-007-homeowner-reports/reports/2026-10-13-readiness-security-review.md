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
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

This reviewer wrote only this assigned report in the homeowner worktree. The copied dependency patch is root-owned. Primary and financing files were untouched.

## Verification and re-evaluation

| Independently executed check | Result |
| --- | --- |
| Readiness, settings-faults and service unit tests | 27 passed |
| Readiness, refusal-messages and report-actions integration tests | 25 passed |
| Weapon `scan.ts`, with scratch output outside the worktree | Completed; production registry metadata all zero; rules Unicode clean; no new scoped vulnerable-pattern hit |
| `pnpm audit --audit-level=high` | Exit 0; existing accepted development-tool exception only |
| `node tooling/scripts/audit-secrets.mjs` | Passed across six source roots and public environment boundary |
| Installed Next.js query | 16.3.8 |
| `git diff --check`, including final four-width browser spec | Passed |

The implementation owner separately reports 33 unit, 47 integration and six demo browser tests, build/type/audit checks passing. Those broader results are attributed to the owner and not represented as independently rerun here. The new signed-in readiness spec and real PostgreSQL routes require actual CI execution. Full final scope rechecked after the browser-only extension; no runtime change or Medium-or-higher remediation occurred during this audit.

### Final test-artifact and CI recheck

Security reopened before fresh Quality for the final test/CI-only delta. The new browser spec writes screenshots to the constant `test-results/product-review-frames/homeowner-readiness` directory using filenames derived solely from trusted viewport numbers and literal theme names. The setup-unavailable frame is captured after its readiness, saved-output, axe and overflow assertions. No path component or capture content is supplied by a customer. The test retains its fixture report responses, seeded local-account shell, external-request guard and mutation counter. No runtime behavior changed.

The added database-job artifact step uses the identical pinned `actions/upload-artifact` SHA already present in this workflow. Its path is confined to `test-results/product-review-frames`, retention is seven days, absent files are ignored, and `always()` preserves available evidence after failure. No event, permission, secret, provider credential or pass/fail gate changed. Only successful assertion-point screenshots are produced by this spec; credentials and session tokens are not added to the screenshot path or metadata by these changes.

No new security finding detected. Independently reviewed both final deltas and passed `git diff --check`; tooling type/format checks are parent-reported. No actual new screenshots or successful database/browser run are claimed before CI executes. The separate DevOps review and fresh Quality remain required. Security clearance remains valid for this final delta.

## Next step

Cleared for fresh Quality against HR-STATE through HR-PROOF and their stated evidence limits. Run the outstanding signed-in browser/PostgreSQL checks and required branch CI before claiming HR-PR complete. Reconcile current main and confirm PR mergeability separately. Licensed valuation, contact handoff, hosted configuration and owner policy decisions remain external evidence or later work, not closed by readiness presentation.
