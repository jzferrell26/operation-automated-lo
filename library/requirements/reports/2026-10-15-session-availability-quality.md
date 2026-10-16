# Session availability Quality self-review

## Summary

Source acceptance of the bounded [plan](2026-10-15-session-availability-plan.md), following [Security self-review](2026-10-15-session-availability-security.md) on identical executable bytes. The author performed both reviews inline under the owner's sequential recovery direction. No independent approval, fresh full-suite pass or deployed fix is claimed.

## Scorecard

| Axis | Status | Evidence |
| --- | --- | --- |
| Completeness | Source complete, release evidence open | Classification, unavailable view and regressions implemented. New exact-head canonical gate required. |
| Correctness | Scoped pass | 41 runtime and47 related UI cases pass, including a real failing session lookup after prior verification. |
| Alignment | Source pass | Existing unavailable mode, AuthPanel, AsyncState and Button reused. No session, customer-role, schema, dependency or provider expansion. |
| Gaps | Explicit | Hosted recovery and actual new-view visual approval unverified. Acquisition root cause remains open. |
| Detrimental patterns | None detected in delta | No cached principal, false sign-out claim, unsafe sink or automatic retry. Zero-clone scan passes across833 files. |

## Critical issues

None detected in this source delta. Canonical CI and hosted qualification cannot be inferred from targeted checks.

## Warnings

The view has source alignment and DOM behavior evidence, not browser screenshot or owner visual approval. Run38848820832 on f1d7810 was still running when this review was authored and predates this increment. The full local integration attempt passed959 tests, skipped one and failed four old reset-fixture cases. All four now pass in the47-case related selection; no fresh full local pass is claimed.

Displaying the effect of DB_ACQUISITION_TIMEOUT honestly does not resolve its hosted cause. This increment does not close that operational issue or the product-completion gaps.

## Suggestions

Inspect the view in a permitted representative browser during release verification and prove a fresh read restores the current verified shell when the backend is healthy. Do not simulate production evidence or reuse remembered identity.

## Plan item traceability

| Plan item | Implementation and evidence | Outcome |
| --- | --- | --- |
| Separate failure from confirmed denial | runtime-authentication.ts:634,645; runtime tests:429,471,493,509 and original no-cookie case | Pass |
| No previous identity or CSRF | Real resolver/getActive regression after a verified shell; exact unavailable-object assertion | Pass |
| No protected content/account/forms | layout.tsx:95; top-bar-menu.integration.test.tsx:87 | Pass |
| Explicit refresh, no automatic retry | session-unavailable.tsx:10; actual layout click test | Pass |
| Retain verified and confirmed unsigned behavior | Original runtime/layout cases, explicit review and reset-recipient fixtures | Pass |
| Types, lint, build and audits | Web/tooling types, web build, lint, formatting, secrets, boundaries, zero clones | Pass |
| UX alignment | Existing auth frame and async error contract; fixed copy, pending/disabled button, no new CSS | Source only |
| Security before Quality | Preceding report; executable source pins unchanged | Pass, same author |
| Main reconciliation, PR review, exact-head gate | Fetched origin/main; ancestry and diff whitespace checks pass. PR review below; new pushed-head run required | Canonical gate open |

Initial combined Vitest project selection rejected incompatible worker-group settings before testing. Serial runs produced the actual RED assertions. The Windows pnpm formatter shim rejected parenthesized paths, corrected with direct Node. Updating fixtures exposed hoisted-import cycles, corrected with the existing dynamic-import pattern. None of these corrections weakened assertions or configuration.

## Files changed

- runtime-authentication.ts and its unit test: failed composition/read classification, policy refusals and real-port no-cached-identity proof.
- authenticated/layout.tsx and top-bar-menu integration test: early unavailable return, protected-content absence and explicit refresh.
- session-unavailable.tsx: existing auth frame and read-only recovery action.
- overview review-surface test: explicit confirmed unsigned fixture, all honesty assertions retained.
- password-reset notice test: explicit signed-in recipient matching its existing page-read fixture; all notice assertions retained.
- Plan, ordered reports and completion ledger: scoped evidence and remaining work.

## PR self-review

Focus: the four policy error classes, empty identity/CSRF on unavailable, layout early return, explicit current-page refresh and honest fixture scope. No new destination, command bypass, dependency or migration. Keep PR100 draft until its exact current head clears canonical verification and remaining release obligations. Historical receipts and unrelated untracked completion notes are preserved. No merge or deployment occurred.
