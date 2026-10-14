# QA Report: public financing HTTP factory

**Plan:** Accepted CTR-004 revision 1 and `2026-10-14-financing-public-http-handoff.md`.
**Audit date:** 2026-10-14
**Auditor:** quality-guardian, `/root/domain_final_quality`
**Source base:** `87480c429848b7108aefa011c4c89aa0304bf07a`; current checkout HEAD `768c4073143f1f6343cf339cef0fd6b21fae735c`.
**Scope:** Two frozen uncommitted HTTP factory/test files below. Cleanup commit 768c407 and its CI are a separate packet.
**Preceding Security:** `2026-10-14-financing-public-http-security-review.md`, SHA-256 `ad218d3d2133a2137ded4daefdb3622fb3ed34be8c1cc28b4b552d654e292acf`.

## Summary

**Scoped factory PASS; runtime and release qualification HOLD.** The factory's current-release reads, exact seals, return-boundary checks, signed server inquiry identity, strict form admission and honest receipt state match the assigned handoff, with no Critical, Warning or Suggestion found in these two sources. Mandatory host/source/storage/limiter ports have no concrete configured default here; their implementation, Next route composition and actual database/browser qualification remain engineering work before public functionality or full CTR-004 completion.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | All requirements of this explicitly bounded factory packet traced; concrete consumers are open. |
| Correctness | ✅ | Actual Request/Response controlled-seam cases pass, including current expiry, evidence and retry handling. |
| Alignment | ✅ | Existing application eligibility/capture service, immutable release envelope and required native ports retained. |
| Gaps | ✅ | Read refusal, strict capability/input, unavailable admission and conflict outcomes are explicit. |
| Detrimental | ✅ | No dependency, SQL, route activation, provider side effect or sealed HTML rewrite introduced. |

## Critical Issues (must fix)

None in the assigned factory packet. This does not approve an unimplemented public runtime.

## Warnings (should fix)

None in the assigned packet. Concrete body time limits, hosting semantics and durable rate enforcement remain runtime qualification obligations rather than supplied factory defaults.

## Suggestions (consider improving)

None.

## Plan Item Traceability

| # | Assigned requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| HTTP-01 | Mandatory independently resolved host/publication runtime, no guessed tenant authority | ✅ | `apps/web/src/server/financing-release-public-http.ts:40-52,153-160` | Exact approved HTTPS origin/path, UUID and no query/hash; resolver implementation remains required. |
| HTTP-02 | Load current publication then current record under owner transaction | ✅ | `financing-release-public-http.ts:162-191` | Uses existing eligible read service and exact publication/canonical URL bindings. Controlled transaction is not actual locking proof. |
| HTTP-03 | Revalidate current evidence before and after response work | ✅ | `financing-release-public-http.ts:190-194` | Existing tests reject withdrawal at return boundary. Concrete repository must preserve locks and commit-boundary enforcement. |
| HTTP-04 | Check current clock after awaited artifact reads | ✅ | `financing-release-public-http.ts:192-194`; `.unit.test.ts:406-417` | Expiry during reading refuses before response return. |
| HTTP-05 | Only site, PDF and same-publication finite media projections | ✅ | `financing-release-public-http.ts:197-208,213-241` | No storage redirect or caller-provided media URL. Exact source authority, manifest and derived media ref checked. |
| HTTP-06 | Exact byte size/hash and required normalized-media assertion | ✅ | `financing-release-public-http.ts:232-249` | Altered bytes, missing asset and failed normalization refuse. Concrete storage/normalizer still required. |
| HTTP-07 | Preserve actual sealed HTML bytes; style-hash CSP and script denial | ✅ | `financing-release-public-http.ts:79-84,247-279`; `.unit.test.ts:197-207` | Exactly one style block; no injection of visitor fields or changed output seal. |
| HTTP-08 | PDF attachment and byte-free HEAD, no visitor capability on PDF/media/HEAD | ✅ | `financing-release-public-http.ts:247-280`; `.unit.test.ts:208-230` | MIME comes from validated seal/asset; HEAD reports sealed length. |
| HTTP-09 | Uniform eligibility-sensitive no-store and neutral anonymous denial | ✅ | `financing-release-public-http.ts:19-24,62-66,280-281` | No financing values/form/private evidence in unavailable response; no shared-cache bypass. |
| NONCE-01 | Separate exact 32-byte server key, copied privately | ✅ | `financing-release-public-http.ts:125-129` | Synthetic key only in tests; no configured production key or client disclosure introduced. |
| NONCE-02 | Signed strict capability binds publication/origin/server UUID/time | ✅ | `financing-release-public-http.ts:30-39,130-152,253-272` | Fixed-length timing-safe HMAC verification; future/expired/duplicate/altered capability refused for submission. |
| NONCE-03 | Fifteen-minute Secure/HttpOnly/Strict path cookie only on eligible site GET | ✅ | `financing-release-public-http.ts:253-272` | Contains no contact, private record, principal credential or storage key. Actual browser enforcement unrun. |
| NONCE-04 | Eligible reload and response-loss retry preserve original identity | ✅ | `financing-release-public-http.ts:255-266`; `.unit.test.ts:296-305` | One controlled captured record; changed content returns 409 instead of replacing request ID. |
| INQ-01 | Exact same-origin POST and form content type | ✅ | `financing-release-public-http.ts:282-299` | Wrong origin/cookie/method/content type refuses before native capture. |
| INQ-02 | Streamed 5000-byte bound, exact single field occurrences and explicit consent | ✅ | `financing-release-public-http.ts:86-121,301-310` | Existing schema additionally enforces bounded name/email/intent and empty honeypot; visitor tenant/request fields refused. |
| INQ-03 | Mandatory durable native admission before every capture | ✅ | `financing-release-public-http.ts:311-330` | Denial 429 with bounded retry-after; malformed/unavailable admission sanitized 503. No memory/no-op limiter is supplied by factory. |
| INQ-04 | Existing atomic capture service resolves current release and original receipt | ✅ | `financing-release-public-http.ts:330-334`; `packages/application/src/financing-release.ts:618-674` | Application binds consent/attribution, exact retry and 30-day receipt expiry. Concrete encryption/outbox/PG behavior not established by stub. |
| INQ-05 | Delivery copy reflects actual finite receipt state | ✅ | `financing-release-public-http.ts:336-346`; `.unit.test.ts:307-333` | Saved capture is not called delivered. No provider call added. |
| ERR-01 | Conflict and unavailable outcomes remain typed and sanitized | ✅ | `financing-release-public-http.ts:348-370`; `.unit.test.ts:442-459` | Changed retry 409; temporary dependency/quota 503; eligibility denial neutral 404. |
| NG-01 | No configured runtime/default authority, Next activation, source admission or provider behavior | ✅ | `PublicFinancingHttpDependencies`; factory comment `:123-124`; scope inventory | Required ports, not a customer-usable deployed route. |
| NG-02 | Preserve all prior actual renderer artifacts and earlier failed evidence | ✅ | Original manifest and existing reports | All 43 hash/size matches; controlled HTTP bytes do not inherit real-image/PDF qualification. |
| HOLD-01 | Concrete host/runtime/private storage/current source-media admission and durable limiter | 🟦 | Handoff final paragraph; accepted CTR-004 | Unfinished engineering, not merely missing credentials. |
| HOLD-02 | Next route exports, owner preparation/review/customer UI and new-inquiry initiation | 🟦 | Handoff final paragraph | Changed retry currently explains need for a new request; its explicit customer initiation flow remains unimplemented. |
| HOLD-03 | Actual encrypted DB/concurrency/browser/CSP/cookie and hosted serving proof | 🟦 | Accepted CTR-004 verification obligations | Required after concrete composition and fresh Security/Quality; unit transaction does not prove locks. |
| HOLD-04 | HighLevel delivery/readback, rights/consent/origin activation, QR/flyer and production purge | 🟦 | Accepted CTR-004 and parent release ledger | Separate source and hosted qualifications remain open. |

## Files Changed

- `apps/web/src/server/financing-release-public-http.ts` (A): server-only read/inquiry factory with required trusted ports, current eligibility checks, exact byte seals, signed inquiry identity and truthful finite outcomes.
- `apps/web/src/server/financing-release-public-http.unit.test.ts` (A): 35 actual Request/Response controlled-seam cases using real application preparation/transition/capture services.

Only this new report was written. No production source, test, prior report, artifact, baseline, root ledger, Git state, secret, provider or deployed configuration was changed. Cleanup commit `768c407` and CI `38558009103` do not include or qualify these uncommitted HTTP sources.

## Independent verification

| Executed check | Result |
| --- | --- |
| Existing public HTTP unit suite | 35 passed, one file, exit 0 |
| Web TypeScript | Passed |
| Focused Oxlint and Prettier | Passed |
| Workspace boundaries plus deliberately rejected reverse-dependency fixture | Passed for 16 packages; 2 prohibited edges rejected |
| Product types and secret audits | Passed |
| Diff whitespace | Passed |
| Two source, handoff, preceding Security and accepted CTR-004 hashes | Matched |
| Prior actual PDF/HTML/PNG/JSON originals | All 43 hashes and sizes matched, zero mismatches |

No new negative payload, mutation, server/database/browser probe or provider request was created or executed. No actual credentials were read. Existing test cases invoke actual Request/Response and application services, with controlled runtime/transaction/storage/normalization/parity/admission ports. PDF bytes are explicitly a synthetic marker, and media is four arbitrary bytes. These tests qualify handler decisions at those seams; they do not prove actual PDF validity, media normalization, encrypted persistence, durable quota, cookie browser enforcement or held database locks. Earlier 43 actual renderer originals were rehashed only, not combined with this fixture as hosted-flow evidence. Author jscpd zero-clone result and test-first corrections remain attributed evidence rather than newly repeated checks.

## Frozen provenance and remaining qualification

| File | SHA-256 |
| --- | --- |
| apps/web/src/server/financing-release-public-http.ts | 3cb7d73ff57b68fccb857b659a06484522a9ace4ba9c5a091e0fcf1498aaaca5 |
| apps/web/src/server/financing-release-public-http.unit.test.ts | ba5520fad8114d26e2121668136a8dfd2b23b4055dcafe240da38b9766167e99 |
| library/requirements/reports/2026-10-14-financing-public-http-handoff.md | 89b6254842e332780d04292f2abe762f06cbf433caf76b2d2cf208e4f9ae9f77 |
| library/requirements/reports/2026-10-14-financing-public-http-security-review.md | ad218d3d2133a2137ded4daefdb3622fb3ed34be8c1cc28b4b552d654e292acf |
| library/knowledge/private/contracts/CTR-004-public-financing-release.md | 59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa |
| Original artifact manifest | 58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663 |

Root must integrate concrete native bindings, obtain ordered reviews for those new sources and run current-head canonical CI. Earlier reduced PostgreSQL diagnostics and historical failed output/import/seeder/browser workflows remain preserved and do not become successful qualification through these 35 cases. Source admission, exact host capability, runtime transactions, native limiter, actual private artifacts, customer controls, inquiry initiation, delivery, QR and controlled hosted proof remain work to complete. This factory PASS does not authorize customer publication, production inquiry collection, merge, deployment, paid/provider effects or whole CTR-004/FUN release.
