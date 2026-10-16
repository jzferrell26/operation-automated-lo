# Session availability Security self-review

## Summary

Author review, performed inline before Quality on the bounded session-availability increment. No independent review is claimed. No unresolved Critical, High, Medium or Low security finding was detected in this delta. This is source acceptance, not hosted outage recovery or whole-product release approval.

## Scope and trust boundary

The governing plan is [session availability](2026-10-15-session-availability-plan.md). Reviewed the runtime classification, authenticated layout, new SessionUnavailable component, runtime/layout regressions and the two explicit review fixtures. Existing session verification, tenant-bound read ports, command guards, cookie issuance, CSRF generation and role/capability authority are unchanged.

`apps/web/src/server/runtime-authentication.ts:634` refuses failed composition before principal projection. At line645, only the existing four authentication-policy error classes retain the confirmed unsigned presentation. Every other mandatory principal-read exception returns unavailable with authenticated false, undefined identity and undefined CSRF. The error message, failed configuration variable, cookie and previous principal are not serialized. Existing internal authority remains; no customer-role feature is added.

`apps/web/src/app/(authenticated)/layout.tsx:95` returns the unavailable view before account chrome, CSRF metadata, mutation forms and protected children. This layout is presentation protection, not a substitute for each unchanged page/command's own authorization. Other shell consumers still receive authenticated false during failure.

`apps/web/src/features/auth/components/session-unavailable.tsx:10` uses the current router only. Its explicit button requests a server read through refresh inside a transition. It accepts no URL, identity, credential or provider input, creates no session, writes no cookie/storage, and runs no automatic retry. Pending state disables repeated activation. Copy describes the failed check without asserting that the session remains valid or that sign-out occurred.

## Category checks

| Category | Scoped result |
| --- | --- |
| Authentication, authorization and tenancy | Mandatory verification stays closed during failure; no cached identity fallback. Confirmed refusals remain unsigned. |
| PII, financial data and error serialization | No protected identity, account details, raw exception, cookie or CSRF reaches the unavailable view. |
| Injection and unsafe sinks | Fixed React text and existing UI primitives only; no HTML, SQL, shell or destination input. |
| Session, CSRF and storage | No change to verification, issuance, mutation gates, token generation, revocation or persistence. |
| Network, provider effects and dependencies | Current-page read refresh only; no new provider call, dependency, schema or configuration. |
| Logging and secrets | No new logging. Secret audit passes across six roots and public environment boundary. |
| Test authority | Explicit confirmed-unsigned and signed-in reset fixtures are test-only. Runtime classification is separately exercised through the real principal resolver and failing session lookup. |

## Verification

41 runtime tests pass. The added real-port regression at `runtime-authentication.unit.test.ts:429` first projects a verified principal, then restores the real principal resolver and makes getActive fail with DB_ACQUISITION_TIMEOUT. It asserts unavailable, no prior identity/token and no display read. Four policy-error cases and the existing actual no-cookie case retain unsigned behavior. Missing composition and generic backend failures are covered.

47 related layout/Home/notice tests pass. The actual layout test at `top-bar-menu.integration.test.tsx:87` asserts no account button, protected child, CSRF metadata or form, no signed-out claim, no automatic refresh, and one refresh after the click. The full integration attempt passed959 tests with one skipped and failed only the four reset-fixture cases; the corrected fixture and all related cases subsequently pass. This is not represented as a fresh full-suite pass.

Web and tooling types, production web build, lint, touched-source formatting, secret/boundary audits and the unchanged zero-clone gate pass. No dependency or waiver changed. The previously documented accepted braces advisory remains outside this delta; this report does not claim all dependencies are vulnerability-free. No local whole-app fixture server was restarted after the earlier policy rejection.

## Source pins

SHA256, before Quality:

- runtime authentication: cf4109a952f1c8056a4b64af1e8ca12bb3b7abb96770a5d66437f08174acb147
- runtime regression: 0eef5b5f08425e98339287ffbec781317edff73d71d5c19be6eae1f2827e21c3
- authenticated layout: b14f4b135635bf246a4505da1e721124caef94cff65b25894efa475322f1740e
- layout regression: 73d90e6456fec914d84552d39c48e8d9fd8e76a6cd2e9cbd2ff9dea2bd400ba4
- unavailable component: b5cde34f210b043ad239cc754fb6ea705248290151359eeda6315055148aa73c

## Remaining evidence

Fresh exact-head canonical CI, hosted visual verification after any future approved release, and investigation of the underlying intermittent database acquisition timeout remain open. No production deployment, data migration, live qualification, purchase or ad launch occurred in this increment.
