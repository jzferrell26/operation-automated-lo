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

## Single loan officer direction source review

Security reopened before fresh Quality for the eight-file source/test delta from `d0a8bc539470f7edfc13babf10f6d4fd1954120c` and the new accepted owner-direction record. Prior Quality entries qualify earlier cycles only. No current-cycle Quality report existed on entry; no `library/qa` report was found. The reviewer loaded the native Guardian, paired Weapon, principles, integrated authorization/tenancy guide, current source and exact diff. This appendix is a focused re-evaluation of the newly changed behavior, not a second full application audit.

**No Critical, High, Medium or Low finding detected in this delta.** Account, setup and support wording replaces team-role instructions. The sole new control condition hides the failed-first-lookup creation link when existing `canWrite` is false at `apps/web/src/features/homeowners/workspace.tsx:441`. That condition strengthens presentation; it does not grant server authority. The only server changes are the two refusal message literals in `apps/web/src/server/homeowners/runtime.ts:77,93`. Status codes, authentication, mutation authorization, provider setup and quotas are unchanged.

### Authentication, single-account access and contact scope

None detected. `runtime.ts:68-73` still resolves a current authenticated principal through the separate read/mutation gates before repository creation, refuses platform support, and requires the existing internal write capability for mutations. The unchanged mutation resolver checks origin and CSRF in `apps/web/src/server/authenticated-principal.ts:293-302`. Removing customer-facing role administration does not turn these internal capabilities into onboarding roles or authorize foreign-account reads.

The account connection is selected with the authenticated location key, then checked against the repository's HighLevel location at `runtime.ts:130-133`. The paid-provider allowlist and flags remain at `runtime.ts:142-149`. HighLevel contact search sends that verified location at `apps/web/src/server/homeowners/highlevel.ts:161`; every returned contact passes `project`, which rejects a different location at `:115`. There is no per-user contact-owner or team visibility filter. This supports searching the connected account's contacts, within the existing query/page limits and provider authorization. It does not imply that every contact is fetched into one response.

Repository report reads bind location and report ID at `packages/db/src/homeowner-repository.ts:80,163`. Creation receives `principal.locationId` in the unchanged HTTP service dependencies. Removal uses both authenticated location and property ID at `:508-518`. No client location, balance-access toggle, role override, credential or arbitrary URL is introduced by this delta. Current source retains the signed-in LO's permitted access and the legacy internal refusal cases.

### Removal, sharing, scheduling and retained usage

None detected in the revised wording. Both removal dialogs retain an explicit confirmation checkbox; the server delete schema requires literal `confirmed: true` at `apps/web/src/server/homeowners/http.ts:79-85`, and the mutation gate runs before parsing or removal. The unchanged repository deletes only the scoped property. Existing foreign keys in `supabase/migrations/20260924010000_homeowner_reports.sql:57,76,101,114,131` cascade report history, unfinished requests, shares, events and delivery records. Schedule data lives on the deleted property, so it is removed from subsequent scheduler selection. Existing lookup usage events at `:84-90` do not depend on that property and remain recorded.

The new text at `workspace.tsx:456,800` correctly says the account's property/report history/share links are removed and its schedule stops; it expressly preserves the HighLevel contact and lookup usage and says downloaded copies cannot be recalled. No new HighLevel delete request, purge task, retention interval, provider call or live deletion was added. This source check does not establish cancellation of an already-running provider request or erase copies previously obtained by a recipient. The owner record correctly leaves automatic retention and broader L-15 qualification unresolved.

### Remaining security categories

- Secrets, PII and financial exposure: none detected in the scoped diff. Static React text adds no balance fields, log, public identifier, persistent cache or raw error detail. Fresh repository secret audit passed.
- Injection, transport and configuration: none detected. No executable HTML, SQL, path, URL, session configuration, provider flag or environment value changed.
- Dependencies and supply chain: no dependency or lockfile change. Fresh production registry audit returned zero advisories at all severities. The Weapon's April 24 watchlist remains stale, as recorded in the preceding reviews; this focused cycle neither refreshes it nor claims a full current-CVE intelligence review.

### Independent verification

| Check | Result |
| --- | --- |
| Readiness, refusal-message and report-action integration files | 32 tests passed, including explicit removal confirmation and no creation/removal control when account write access is unavailable |
| Adapter, refusal-message and readiness unit files | 31 tests passed, including foreign HighLevel contact refusal and safe error projection |
| Runtime/settings fault unit file | 10 tests passed, including permitted account reads and denied writes before storage/provider work |
| Authenticated principal unit file | 5 tests passed |
| Production dependency audit | Exit zero; all severity counts zero |
| Repository secret audit and `git diff --check` | Passed |

Ignored evidence: `test-results/single-lo-security-{integration,unit,authority,principal}.log` and `single-lo-security-audit.json`. Actual PostgreSQL isolation/deletion tests were inspected, not independently rerun locally. Independently read GitHub run `38485526367`: overall success at `d0a8bc5`, Application verification, real PostgreSQL migration/pgTAP and release/recovery jobs succeeded; Preview smoke was skipped. That older head does not qualify this new wording/control delta. New twelve-frame review, canonical baselines and complete new CI remain pending.

### Frozen source pins

Paths in the first six rows are under `apps/web/src/features/homeowners/`.

| Reviewed file | SHA-256 |
| --- | --- |
| builder.tsx | 2ff6c3f4d426f16ed9d594e136d7434fb51e99f06e0fa44c1b133d1b0a17f341 |
| readiness.integration.test.tsx | 60e0c5f469dfe34b847fa06c8317798789951daa95abc2451be6df01dcd53dcc |
| readiness.ts | 0085fb811ab3d78e6396901311a3fb0a89fdbf079f80bb01bab6ddab737ebab8 |
| refusal-messages.integration.test.tsx | 9d37b4b8ad1d2b55a5af5b5891640613678877d59d108cb240c787530ba0c0e3 |
| report-actions.integration.test.tsx | 0471747b4d9031d19689d392d651ec9410a5c686cf7026805f366ba2cc0db942 |
| workspace.tsx | 58c8b70e7502e12c035c298d112b28a9d0ff58341c5a3489198726439c6f1f82 |
| apps/web/src/server/homeowners/runtime.ts | 5ba28a71c875bad136e34c0eb55c5cb02b67a440e74f7af829b36ebfb224fa6f |
| tests/browser/review/homeowner-readiness.spec.ts | 5f8a93b69273e098435115192a1410a29bda66e215cb5163e16289fd5eea2f76 |
| single-lo-owner-direction-2026-10-13.md | 24b335dd36675180a4d78b6fc691e77e59869356902dca5ffc98a69dd1a8aa6c |

Cleared for fresh Quality with zero unresolved Medium-or-higher security findings. No source, baseline or provider modification was made by this reviewer. Only this assigned report was appended. The orchestrator retains fresh visual/CI and repository-health checks before release qualification.

## Single-LO final baseline integrity cycle, October 14 UTC

**PASS. No Critical, High, Medium or Low finding detected in this bounded image/report delta. Cleared for fresh Quality.** This cycle follows source Security and source Quality at `64954db7061554bed1494aed3068a0c04c17ac4b`; those historical source passes do not qualify the new screenshot bytes. Fresh image Quality is required after this review. `library/qa` is absent. No source remediation was required or performed.

Scope is exactly eight whole empty-account baseline PNG replacements and the independently authored UX qualification appendix. Earlier source Security pins remain unchanged for all nine pinned implementation/test/owner-direction files. The readiness CSS pin also agrees with the current UX/source review. No additional baseline, runtime, test, permission, database, workflow, dependency, provider configuration or ledger change was present on entry. This reviewer appends only this report and writes ignored integrity evidence.

### Independent provenance and exact image verification

Queried GitHub directly: Screen baselines run `38491866451` completed successfully in both Synthetic screens and Account screens jobs at exactly the source head above. Its unexpired `screen-baselines-review` artifact is ID `11863506507`, digest `sha256:64cd5ab7757ea5bb60533339298fee09e3f54c36db64b4e65b328ee8b6a47116`. Independently downloaded the artifact into `test-results/homeowner-final-security-canonical`, separate from the root and UX copies.

Every destination under `tests/visual/screens/review/` is byte-for-byte identical to the corresponding independent artifact PNG and the UX-approved SHA-256. The UX report itself matches the assigned frozen hash `590c5071ee0982471c5d1bab0a542df5829c343c3be10cf6b15aec33b0fcc991`. Exactly eight PNGs were changed; no other baseline was copied. All eight decode successfully, retain their original dimensions, have valid PNG chunk bounds and CRCs, contain only IHDR/IDAT/IEND chunks, and terminate exactly at IEND. No ancillary EXIF, text, XMP, metadata or appended payload was found.

Independent raw RGBA comparisons against the tracked HEAD images reproduce every changed-pixel count and bound in the UX table: 12821/12730 at 1180 and 1440, 26566/26000 at 390 and 36209/35300 at 768 (Dark/Light). Every comparison reports zero changed header pixels. Changed regions stay within the intended account subtitle and setup explanation/card layout. Opened the independently downloaded 390 Light and 1440 Dark originals; both show the seeded synthetic empty account, with no property financial figures, credentials, tokens or real customer record. UX retains ownership of all-eight visual acceptance and the separate twelve-frame detail/refusal acceptance.

| Exact replacement filename | SHA-256 |
| --- | --- |
| homeowners--empty-account--1180--dark.png | 49e758097b6026fffc8bd98c3dac303e195ddf37ffca4402f32ab4e34290c271 |
| homeowners--empty-account--1180--light.png | 910271c010532c5e71e28cc569f84c1679fb5012f767754543e8fe1ea2d976dd |
| homeowners--empty-account--1440--dark.png | 1f245abbae88d41b2a8d717cb1538763257a865a5bcdca18aa8a01bdc640c7a2 |
| homeowners--empty-account--1440--light.png | e39067ed33ff4d09ca18e7e5f3f716c38bae8a9517d6f4dcc1f0747657306914 |
| homeowners--empty-account--390--dark.png | bf9a3e687bdae837466cd696acfd8a463a01e81e913f2a43127fb41996d7e187 |
| homeowners--empty-account--390--light.png | 715b8f404d7e57871d8714623dfdd47ca10aaa094d1442d74adc6743986a8e71 |
| homeowners--empty-account--768--dark.png | f7d16da1d1493b279848c1e18d4e830d4792c8d7d28c920ac47194e5d63a1b6a |
| homeowners--empty-account--768--light.png | 1d3d5234f3af69d34f5dc3f2cc134d982b0182824101c0f582d2ec4c6fb11bff |

### Security categories and execution limits

- Authentication, authorization, tenant isolation and financial/PII exposure: none detected in the scoped delta. Prior reviewed source hashes are unchanged. PNGs carry no executable or ancillary payload; the inspected seeded empty-account views expose no report balance or customer record.
- Injection, secrets, transport, storage and provider configuration: none detected in this delta. No executable source or configuration changed. No new data access, persistent cache, consent authority or paid-provider request is introduced by baseline replacement.
- Dependencies and supply chain: no dependency or lockfile change. Provenance is the current-head GitHub workflow and its independently downloaded artifact; this cycle does not repeat or extend the earlier application dependency/CVE audit.
- Remediation/re-evaluation: none required. `git diff --check` passed, source pins matched and the exact changed-file scope was checked before appending this report. No broad test or build was run for this image-only cycle.

Independently read CI run `38491869012`: overall failure at the same source head; Application verification and Release and recovery contract passed, Preview smoke was skipped, and the combined PostgreSQL/browser job failed. The parent and UX log inspection attribute the successful pgTAP/295 PostgreSQL routes and four readiness browser cases to that job and its failure to the stale empty-account comparisons. Those component executions were not rerun here, and this pre-replacement aggregate is not described as green.

Machine evidence is retained in ignored `test-results/homeowner-final-security-png-verification.json` with all eight dimensions, hashes, chunks, exact pixel counts/bounds and nine source pins. Actual provider behavior, live customer data, production report setup, customer acceptance, deletion/export/retention qualification and whole-project completion remain outside this image integrity clearance. The orchestrator retains fresh Quality, current-head CI and repository-health/mergeability checks before release qualification.
