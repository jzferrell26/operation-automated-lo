# QA Report: domain browser fixture and Settings baselines

**Plan documents:** `2026-10-14-domain-browser-signin-budget-handoff.md`, `2026-10-14-domain-settings-inventory-handoff.md`, `2026-10-14-domain-settings-baseline-review.md`, under `library/requirements/reports/`; `library/knowledge/private/ux-ui/04-screens/domain-setup.md`; root `DOMAIN_COMPLETION_LEDGER.md`.
**Audit date:** 2026-10-14
**Base/head:** `4209bbfeea4ce97b2693741afb85e72b6839434e`, `codex/domain-completion`, plus the frozen six harness files, one inventory test and eight Settings PNGs.
**Auditor:** quality-guardian, `/root/domain_final_quality`
**Preceding Security:** `2026-10-14-domain-browser-fixture-security-review.md`, SHA-256 `d7f679576270f13e2bb670e004a9e1da009e4e60cf743ab0cc06ebcf7c7e34b5`.

## Summary

**Scoped PASS; canonical integration qualification HOLD.** The legitimate-session fixture, exact Settings directory inventory and eight adopted image bytes match the assigned plan, with no new Critical, Warning or Suggestion found. This review preserves the failed workflows, actual sign-in 429, inherited Settings wrapper-policy debt and the requirement for current-head database/browser CI; it does not qualify complete FUN behavior or release.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | All scoped fixture, inventory and exact-image requirements traced. |
| Correctness | ✅ | Existing controlled fixture/filesystem, identity, integration and contrast checks pass. |
| Alignment | ✅ | Actual authentication policy, seeded actors, origin, artifact boundaries and exact inventory retained; inherited source-policy distinction disclosed. |
| Gaps | ✅ | Stale/mismatched/revoked candidate fallback and bounded lifecycle covered at controlled seams. |
| Detrimental | ✅ | No production authority, counter, header, dependency or timeout delta; prior eight production source pins remain unchanged. |

## Critical Issues (must fix)

None newly found in this assigned increment. Actual cross-worker/browser authentication remains unqualified until canonical CI passes.

## Warnings (should fix)

None newly found in this increment. The existing Settings renderer discrepancy discussed below remains outside this scoped source approval and is not waived by image adoption.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Plan requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| FIX-01 | Actual password POST 200 remains the source of session capture | ✅ | `tests/browser/review/helpers/guided-setup-journey.ts:219-244` | Exact POST response assertion and workspace selection retained; capture is appended only after success. |
| FIX-02 | Only webinar preparation consumes reuse; auth journeys remain actual sign-in | ✅ | `tests/browser/review/webinar-ads.spec.ts:64-73`; `tests/browser/review/helpers/signin-session.ts:213-233` | Seeded creator and approver use separate contexts and actor files. |
| FIX-03 | Validate exact actual host-only Secure/HttpOnly/Lax cookie and bounded token | ✅ | `signin-session.ts:14-34,47-60` | No manufacture or signing-key access; cookie expiry and two-hour candidate age checked. |
| FIX-04 | Clone imported cookie to exclude shared mutable actor/context state | ✅ | `signin-session.ts:77-84`; `tooling/tests/unit/browser-signin-session.test.ts`, clone regression | Schema and explicit structured cloning both preserve separation. |
| FIX-05 | Fresh exact-origin overview and current server identity before every acceptance | ✅ | `signin-session.ts:185-210`; `apps/web/src/server/runtime-authentication.ts:623-669` | Status 200, single CSRF token, exact name/current role/workspace and HMAC equality required. Production principal resolution remains unchanged. |
| FIX-06 | Stale, invalid, revoked or mismatched candidate clears context and falls back once | ✅ | `signin-session.ts:47-89` | Current proof errors become refusal/fallback; wrong post-fallback identity refuses without looping. |
| FIX-07 | Worker restart retains valid run-scoped setup session without fresh password attempt | ✅ | `signin-session.ts:124-150,218-233`; controlled eight-acquisition budget test | Controlled seam proof only, not actual Playwright worker/database qualification. |
| FIX-08 | Preserve production 20-attempt/900-second sign-in policy | ✅ | `apps/web/src/server/password-authentication-handler.ts:120`; production diff inventory | Policy and counter untouched; no IP/header override or bypass. |
| CACHE-01 | Cache allowed only for owned sample-review pass and exact loopback origin | ✅ | `signin-session.ts:92-119` | Wrong flags, origin, directory or actor cannot import cache. |
| CACHE-02 | Random private per-pass OS-temp directory and 0700/0600 POSIX modes | ✅ | `tooling/scripts/database/review-browser-run.mjs:39-46,411-432`; `signin-session.ts:124-150` | Fixed actor files, 4096-byte load limit, owner/mode/type/symlink/run-age checks and exclusive temporary write plus atomic rename. Windows mode bits are not an ACL guarantee. |
| CACHE-03 | Store only cookie, session token, actor, origin and capture time | ✅ | `signin-session.ts:163-181` | No password, email, storageState, other cookie, log or repository artifact. |
| CACHE-04 | Cleanup exact owned path with realpath/parent/type/symlink checks | ✅ | `review-browser-run.mjs:48-65,445-460` | Controlled real filesystem checks preserve unrelated sentinel directory. |
| CACHE-05 | Cleanup failure remains visible without losing artifacts or teardown | ✅ | `review-browser-run.mjs:445-460` | Named failure retained; existing artifact consumer/server stop order unchanged. Abrupt process termination is outside finally guarantees. |
| CACHE-06 | Runner declaration mirrors new lifecycle exports | ✅ | `tooling/scripts/database/review-browser-run.d.mts:7-8` | Tooling TypeScript passes with existing root configuration. |
| SET-01 | Exact ordered Settings headings add Domains before existing three | ✅ | `apps/web/src/app/(authenticated)/[...workspacePath]/workspace-routes.integration.test.tsx:87-103` | Exact collection asserted; no broad count/selector relaxation. |
| SET-02 | Exact complete Settings link inventory adds only /settings/domains | ✅ | `workspace-routes.integration.test.tsx:104-115` | Account billing assertion retained. All 17 existing cases pass. |
| IMG-01 | Adopt only eight independently reviewed Settings default originals | ✅ | `tests/visual/screens/review/settings--default--{1440,1180,768,390}--{light,dark}.png` | All eight current hashes match UX table; no other baseline changed in this increment. |
| IMG-02 | Preserve corresponding prior originals and reject earlier unchanged artifact as new proof | ✅ | `tmp/settings-prior-before-adoption-4209/`; independent UX report | Eight prior hashes match. Earlier 38531604133 images remain excluded. |
| IMG-03 | Default Settings images scored separately from interaction/provider/full workflow | ✅ | `2026-10-14-domain-settings-baseline-review.md`, scored evidence and source-policy sections | Independent literal review of eight new plus eight prior originals; each applicable default composition 30/30. Not a new visual judgment by this QA reviewer. |
| NG-01 | No production authentication, SQL, counter, cookie fabrication, header or timeout change | ✅ | Scoped diff plus unchanged eight production pins | Tests and six harness sources only; actual authority continues through existing principal/session checks. |
| NG-02 | No purchase, deployment, provider effect or new credential-bearing evidence | ✅ | Scoped inventory and existing artifact selection | This reviewer ran no browser/server/SQL/provider probe and used no actual credentials. |
| HOLD-01 | Actual run-scoped cache/browser integration and current canonical CI | 🟦 | New current-head canonical database/browser run required | Unit tests do not establish actual cookie, role revocation or worker integration. |
| HOLD-02 | Autonomous rechecks, hostname-root routing and owned-host visitor proof | 🟦 | Root ledger and `custom-domain-onboarding.md` | Remaining complete-domain acceptance, outside this harness increment. |
| HOLD-03 | Runtime/provider qualification and whole FUN release | 🟦 | Root release ledger and controlled hosted proof | No failed workflow converted to successful qualification by a passing capture subset. |

## Files Changed

- `apps/web/src/app/(authenticated)/[...workspacePath]/workspace-routes.integration.test.tsx` (M): exact Domains heading/link added to retained complete inventory.
- `tests/browser/review/helpers/guided-setup-journey.ts` (M): capture after successful actual sign-in and workspace selection.
- `tests/browser/review/helpers/signin-session.ts` (A): strictly scoped candidate projection, storage, fresh identity verification and one fallback.
- `tests/browser/review/webinar-ads.spec.ts` (M): creator and approver preparation consume legitimate-session reuse.
- `tests/visual/screens/review/settings--default--1180--dark.png` (M): reviewed Domains entry.
- `tests/visual/screens/review/settings--default--1180--light.png` (M): reviewed Domains entry.
- `tests/visual/screens/review/settings--default--1440--dark.png` (M): reviewed Domains entry.
- `tests/visual/screens/review/settings--default--1440--light.png` (M): reviewed Domains entry.
- `tests/visual/screens/review/settings--default--390--dark.png` (M): reviewed four-entry mobile directory.
- `tests/visual/screens/review/settings--default--390--light.png` (M): reviewed four-entry mobile directory.
- `tests/visual/screens/review/settings--default--768--dark.png` (M): reviewed four-entry tablet directory.
- `tests/visual/screens/review/settings--default--768--light.png` (M): reviewed four-entry tablet directory.
- `tooling/scripts/database/review-browser-run.d.mts` (M): lifecycle export declarations.
- `tooling/scripts/database/review-browser-run.mjs` (M): per-pass private directory creation/passing/checked cleanup.
- `tooling/tests/unit/browser-signin-session.test.ts` (A): controlled budget, identity, isolation, invalid cache and real filesystem cleanup regressions.

Only this new report was written by this reviewer. No source, image, frozen report, cache value, Git state, environment configuration, provider or deployment was changed.

## Independent verification

| Existing executed check | Result |
| --- | --- |
| Session cache, browser artifact evidence and Playwright foundation; runtime authentication and principal units | 78 passed across five files |
| Exact Settings workspace-route inventory integration | 17 passed |
| Token contrast | 107 passed |
| Existing security header contract | 2 passed |
| Tooling TypeScript using `tsconfig.tooling.json` | Passed |
| Secret audit and diff whitespace | Passed |
| Six harness files and inventory pin | All seven matched |
| Security, author/inventory handoffs and independent UX report hashes | Matched |
| Eight final production UI/routing pins | Unchanged |
| Eight new Settings image hashes and corresponding eight previous backups | All matched |

The 204 checks above overlap author/Security/UX runs and must not be added to their totals. Existing controlled tests were reexecuted without new payloads, mutations, server probes or actual credentials. Author four executable guard-removal failures and 163-case discovery in 14 files remain attributed evidence; this reviewer did not recreate them or claim discovery was browser execution.

## Frozen provenance

| File | SHA-256 |
| --- | --- |
| tests/browser/review/helpers/signin-session.ts | 388465027e3576a381cb2e908364f8dc177ed924be87364ac66538d9b903cecd |
| tests/browser/review/helpers/guided-setup-journey.ts | 6e69bfcda55554d8dd6f5041312d9f1ffeeabfc9c15e9ff05ecb546341feb4a9 |
| tests/browser/review/webinar-ads.spec.ts | 6e2dd29c01bf3ccfaa9a0d836b5389b7d4e816c2b1baa91af58ef258a631e248 |
| tooling/tests/unit/browser-signin-session.test.ts | 06169c60c27c0ffd060d6a9a2804a030d874459ae6599eb77d3056266706eee9 |
| tooling/scripts/database/review-browser-run.mjs | 5d64029a99d2135e456a3fc2886d99d1e1029ef7bcfb29c238ba7a7a6d4af1a4 |
| tooling/scripts/database/review-browser-run.d.mts | ce502817e94a3e36adaafd4387a5f2e2e2b8e221c3e2fe293e5b9c39d19109a5 |
| apps/web/src/app/(authenticated)/[...workspacePath]/workspace-routes.integration.test.tsx | 3d9bbcfea6b5ca8d6f9be201206b8113086de5c4157b9abf2def281af372a6cc |

Browser handoff `4cec5471219e1f41ec03c15752d1bc3295ac8f7fe03deed853266eb5a0fdaccc`; inventory handoff `cd7df40da4db00bef7c22b8ac3f099ccd5f61b26c5e31fea3c4e6e8da6a809ed`; independent exact-image approval/table `c3c386bc5ccd0807db5ad070d97281f6e179a4394c8162c48616636ce845a8e0`; preceding Security `d7f679576270f13e2bb670e004a9e1da009e4e60cf743ab0cc06ebcf7c7e34b5`.

Prior final production source Security `02f709fb6902b769a89b1114cb4bbbd399d68fd0d51cc60639f623715b520508` and Quality `1424b607261995dce89f0fb10a79d04739c7b2a96697b9ee4f20fbc5df82233f` remain valid for their unchanged eight pins. They do not extend to actual qualification of this new harness.

## Preserved source-policy distinction and qualification limits

The independent UX report explicitly distinguishes default-image acceptance from source compliance. Existing `apps/web/src/features/workspace/workspace-screen.tsx:83-105` uses `<section className={styles.toolCard}>`; `workspace.module.css:132-155` retains hand-built border/radius/background and `--shadow-rest`. Generic `03-components/card-and-surface.md:13-16,26-29` requires Card/Surface and `--shadow-card`. This inherited discrepancy is also present in the previously approved images; adopting the new entry does not waive or fully clear it. The dated October 3 F-11 Settings section-title ruling governs the reviewed visual composition, not a blanket source-wrapper exception. No application Settings renderer or CSS was modified by this packet.

At base 4209, run `38544891984` passed all 323 actual PostgreSQL cases and 130 authenticated review-browser cases before the expected Settings mismatch and real webinar sign-in 429. The newly reviewed Settings capture cases passed in `38544884852`, whose overall account review failed later on webinar sign-in 429; it reports 154 passing browser cases, with failure preserved. Those are attributed completed-run facts, not current-candidate success. Local real browser/PG execution remains unavailable and was not attempted here. Root must obtain current-head canonical CI after commit and retain the complete failed-run evidence, then continue the open owned-host/autorecheck/root-default/provider qualification. This scoped PASS does not authorize merge, deployment, paid effects or whole-FUN completion.
