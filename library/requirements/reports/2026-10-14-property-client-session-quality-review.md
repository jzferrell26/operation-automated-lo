# QA Report: property client resolver and review-session transplant

**Plans:** `2026-10-14-financing-vercel-client-handoff.md` and `2026-10-14-property-review-session-handoff.md`; accepted CTR-004 public/inquiry boundary retained.
**Audit date:** 2026-10-14
**Baseline/head:** `5f48bb2408d4c11f215d9194cd2fc036ae16e4a7`, `codex/property-marketing-release`, plus only the frozen two-file client and seven-file session packets.
**Auditor:** quality-guardian, `/root/domain_final_quality`
**Client preceding Security:** `2026-10-14-financing-vercel-client-security-review.md`, SHA-256 `8b47f34574c9b686f16ec6ba051d04503142058fb96f6f84ad77df416f9b7a89`.
**Session preceding Security:** `2026-10-14-property-review-session-security-review.md`, SHA-256 `10b2c7db93281ffed9485ae34705afb6f08b720e99850f2ee386e499360820e9`.

## Summary

**Scoped source PASS for both frozen packets.** The standalone direct-Vercel resolver and exact legitimate-session transplant match their respective handoffs, with no Critical, Warning or Suggestion found. Default inquiry remains unavailable 503, actual Vercel direct-ingress/header behavior is unqualified, and property current-head canonical integration is still required; neither packet clears the active runtime/timezone database work or whole public release.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Assigned resolver/configuration/address behavior and exact seven-file transplant requirements traced. |
| Correctness | ✅ | Fifty resolver and twenty-two session cases pass; committed-source byte identity verified independently. |
| Alignment | ✅ | Server-owned profile, keyed-admission input boundary, actual sign-in and existing sole-LO product retained. |
| Gaps | ✅ | Unsupported ingress/configuration, malformed identities and session mismatch refuse within these scopes. |
| Detrimental | ✅ | No production auth limit, role UI, runtime wiring, provider operation, baseline or dependency change. |

## Critical Issues (must fix)

None in the assigned nine source/test files. The default inquiry 503 and missing ingress/integration qualification are explicit scope limits, not completed capabilities.

## Warnings (should fix)

None newly found in these packets. Active native-timezone SQL/suite work is excluded and requires its own ordered reviews after freeze.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| CLIENT-01 | Select only explicit consistent server direct-Vercel profile/project/environment | ✅ | `apps/web/src/server/financing-release-vercel-client.ts:6-19,58-69` | Exact profile, bounded project, platform environment and VERCEL=1; inconsistent/local/dev/test setup refuses. Matching variables are not cryptographic attestation. |
| CLIENT-02 | Configuration snapshot cannot mutate after construction | ✅ | `financing-release-vercel-client.ts:58-61`; existing unit cases | Existing schema makes a copied configuration; no client header/URL can set its project. |
| CLIENT-03 | Only one bounded numeric x-vercel-forwarded-for value | ✅ | `financing-release-vercel-client.ts:71-78` | Forty-five-character bound, lexical numeric form and Node isIP. No ordinary forwarded/real-IP, cookie, URL, deployment-header or generated-ID fallback. |
| CLIENT-04 | Refuse duplicates, malformed syntax, scopes, brackets, explicit IPv4 ports and CIDR | ✅ | Resolver unit suite and `:74-78` | Fetch normalization can strip outer whitespace; raw HTTP field inventory is not claimed. Numeric unbracketed IPv6 final group remains legitimate address syntax. |
| CLIENT-05 | Canonical version/family-tagged IPv4/IPv6 network-order bytes | ✅ | `financing-release-vercel-client.ts:25-50,77-84` | Equivalent IPv6 forms normalize; IPv4-mapped folds to IPv4, compatible IPv6 retains family. Each output array is independent. |
| CLIENT-06 | Return admission input only, no identity permission/key/log/persistence | ✅ | Resolver complete two-file delta | Raw address exists transiently in memory; adapter adds no HMAC key, auth principal, telemetry or provider request. |
| CLIENT-07 | Fixed sanitized failure without project/address detail | ✅ | `financing-release-vercel-client.ts:21-23`; existing error tests | Existing UNAVAILABLE503, no raw exception/metadata exposure. |
| SESSION-01 | Exact committed domain c5e454 seven-file copy | ✅ | Seven paths/pins below | Independently compared worktree bytes with raw git-show bytes, not normalized text or prior review claim alone. |
| SESSION-02 | Capture only actual successful password POST200 and workspace selection | ✅ | `tests/browser/review/helpers/guided-setup-journey.ts:221-244` | Existing actual sign-in response assertion remains. |
| SESSION-03 | Only webinar/top-bar preparation consumes reviewed reuse with original fallback | ✅ | `tests/browser/review/webinar-ads.spec.ts:64-73`; `top-bar.spec.ts:92-98` | Auth acceptance journeys stay actual sign-in. Existing role/layout/accessibility/external request assertions unchanged. |
| SESSION-04 | Fresh current server identity/token/role/workspace before every reuse | ✅ | `tests/browser/review/helpers/signin-session.ts:47-89,185-234` | Exact fixed origin/200, actor and HMAC; invalid/revoked/stale/mismatch clears and falls back exactly once; incorrect fresh proof refuses. |
| SESSION-05 | Exact cookie attributes/lifetime/clone and actor/run isolation | ✅ | `signin-session.ts:14-60,81,92-150` | Actual issued host-only Secure/HttpOnly/Lax cookie; no manufactured session, counter reset or higher attempt allowance. |
| SESSION-06 | Private bounded temporary cache and checked cleanup | ✅ | `signin-session.ts:92-181`; `tooling/scripts/database/review-browser-run.mjs:39-65,445-460` | Cookie/token/actor/origin/time only; no password/email/storageState/artifact copy. Realpath/owned-registry/symlink/type guards retained. POSIX modes do not assert a Windows ACL; finally is not crash-proof. |
| SESSION-07 | Runner declarations and existing tests preserved | ✅ | `review-browser-run.d.mts`; `tooling/tests/unit/browser-signin-session.test.ts` | Tooling typecheck and actual existing 22-case fixture pass. |
| NG-01 | No new customer roles/auth limit/counter/header override/timeout/image/dependency change | ✅ | Scoped inventories and exact copied bytes | Internal current session authority preserved; no role management UI. |
| NG-02 | No public runtime or active native-timezone SQL approval | ✅ | Protected runtime pin and assigned exclusion | Only default inquiry refusal read; entire 14-file runtime/additive SQL/new PG suite excluded. |
| HOLD-01 | Actual Vercel project/environment/direct ingress and anti-spoof overwrite qualification | 🟦 | Client handoff deployment qualification | Standalone source is not wired; arbitrary external proxy requires separate reviewed profile. |
| HOLD-02 | Property current-head real database/browser/CI | 🟦 | Session handoff and parent canonical gate | Domain source's passing CI is attributed provenance, not a property-branch pass. |
| HOLD-03 | Concrete client/native admission integration and full public release | 🟦 | CTR-004 and separate runtime packet | Default inquiry remains503 until reviewed future wiring; body/capture/retention/delivery/hosted proof still required. |

## Files Changed

- `apps/web/src/server/financing-release-vercel-client.ts` (A): standalone strict server-profile resolver to canonical numeric address bytes.
- `apps/web/src/server/financing-release-vercel-client.unit.test.ts` (A): fifty controlled Request/configuration/address cases.
- `tests/browser/review/helpers/guided-setup-journey.ts` (M): passive capture after actual successful sign-in.
- `tests/browser/review/helpers/signin-session.ts` (A): exact committed current-proof reuse/private-cache helper.
- `tests/browser/review/top-bar.spec.ts` (M): original actual-sign-in fallback through preparation reader.
- `tests/browser/review/webinar-ads.spec.ts` (M): creator/approver preparation reader with original fallback.
- `tooling/scripts/database/review-browser-run.d.mts` (M): exact lifecycle declarations.
- `tooling/scripts/database/review-browser-run.mjs` (M): exact run-owned private directory lifecycle.
- `tooling/tests/unit/browser-signin-session.test.ts` (A): existing twenty-two controlled identity/budget/filesystem cases.

Only this report was written. Other active source, SQL/new PG suite/handoffs, runtime/routes, images, earlier reports, root ledger and Git state were untouched. No configured fixture startup, live browser/database/provider call or credential read was performed.

## Independent verification

| Check | Result |
| --- | --- |
| Existing client resolver suite | 50 passed |
| Existing session fixture suite | 22 passed |
| Web and tooling TypeScript | Passed |
| Focused lint and nine-file formatting | Passed |
| Runner Node syntax and diff whitespace | Passed |
| Boundary plus rejected reverse-dependency fixture | Sixteen packages pass; two prohibited edges rejected |
| Product types and secret audits | Passed |
| Playwright existing sample review discovery | 163 tests in 14 files; no execution |
| Seven raw committed domain comparisons | Exact byte equality |
| Nine source/two handoff/two preceding Security pins | Matched |
| Protected public runtime supporting hash | Unchanged 73682e pin; inquiry early refusal intact |

The 72 tests use synthetic project metadata, documentation addresses, controlled server-proof ports and disposable filesystem fixtures. Discovery starts no browser/database/server. No new payload, mutation, network/probe or external advisory call occurred. Author mutation RED/GREEN and duplication evidence remain attributed. Whole-workspace static checks include current files but do not grant source approval to excluded active runtime/database work.

## Frozen provenance

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/financing-release-vercel-client.ts | 0d6729835213ed15a2b9328c4d83d5be01e7604e3f81d603e8cc6c1b68cc695f |
| apps/web/src/server/financing-release-vercel-client.unit.test.ts | 4db545ca303162d1304207f6eb94242292baca83a3eb8b6229d8263eb1868222 |
| tests/browser/review/helpers/signin-session.ts | f672526e8f8ea700482038b34217178d0b6c5d558d12e0c5bf4419b845f79319 |
| tests/browser/review/helpers/guided-setup-journey.ts | 6e69bfcda55554d8dd6f5041312d9f1ffeeabfc9c15e9ff05ecb546341feb4a9 |
| tests/browser/review/webinar-ads.spec.ts | 6e2dd29c01bf3ccfaa9a0d836b5389b7d4e816c2b1baa91af58ef258a631e248 |
| tests/browser/review/top-bar.spec.ts | d79a556a0ef4de1e5fc0853c121501d4a7bc31277ad0312214b09a09442f8fdc |
| tooling/tests/unit/browser-signin-session.test.ts | 06169c60c27c0ffd060d6a9a2804a030d874459ae6599eb77d3056266706eee9 |
| tooling/scripts/database/review-browser-run.mjs | 5d64029a99d2135e456a3fc2886d99d1e1029ef7bcfb29c238ba7a7a6d4af1a4 |
| tooling/scripts/database/review-browser-run.d.mts | ce502817e94a3e36adaafd4387a5f2e2e2b8e221c3e2fe293e5b9c39d19109a5 |

- Client handoff: `3440661288ab5ff2afa2b9ab77b0fd6fdc80e8e28dd1f2c885d8b17cb764bc22`.
- Session handoff: `3d30362f5e18973a61f362c7afd5463e3f1f4794ec2d9e00b696dd1375a3fdc0`.
- Client Security: `8b47f34574c9b686f16ec6ba051d04503142058fb96f6f84ad77df416f9b7a89`.
- Session Security: `10b2c7db93281ffed9485ae34705afb6f08b720e99850f2ee386e499360820e9`.
- Protected runtime supporting boundary: `73682e199e765c23e2c6d9e53d5b0127ca4c5389498e2edf62b9f94e19848bad`.

## Integration and release limits

The seven session files match domain commit `c5e454051c258de28a2cc417673599073604ed58`. Root reports complete domain CI 38566055257 passing for that source. This is attributed native context/provenance; no property current-head workflow success is claimed. The earlier property CI 38560338247 remains failed, despite Application and 317 PG cases plus 154 browser passes, with actual top-bar/webinar preparation sign-in 429 and retries retained. This review does not relabel that run.

Default public inquiry remains refused before constructing its runtime or reading a body (`financing-release-public-runtime.ts:401`), preserving 503. Qualify the expected Vercel project/environment, direct ingress and actual platform header overwriting before integrating/enabling the new resolver. Actual raw HTTP/hosted anti-spoofing, keyed native admission, encrypted capture and property browser execution have not been exercised by these source tests. New native-timezone SQL/suite changes belong entirely to their active owner and need separate fresh Security/Quality after freeze.

The earlier configured whole-app fixture startup was rejected by automatic approval review as blocked by policy. It remains unrun; this reviewer did not repackage or retry it. Root owns future authorized wiring, combined reviews, current-head canonical CI and repository/PR/Git checks. No merge, deployment, paid/provider effect, product role change, public activation or whole CTR-004/FUN completion is cleared by this bounded PASS.
