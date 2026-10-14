# QA Report: public financing runtime, native admission and absolute retention

**Plan document:** `library/knowledge/private/contracts/CTR-004-public-financing-release.md`, accepted revision 1, and `library/requirements/in-work/prd-010-campaign-recovery/payment-flyers-and-co-branded-sites.md`.
**Audit date:** 2026-10-14
**Base branch:** `origin/main`, retained base `728d5f0eb463bbf6abfe2519470fa536c022fa15`
**Head:** `5f48bb2408d4c11f215d9194cd2fc036ae16e4a7` plus the explicitly frozen working-tree packet below
**Auditor:** quality-guardian, independent, report-only ownership
**Security prerequisite:** `2026-10-14-financing-native-timezone-security-review.md`, SHA-256 `6c63b7cc28185a9432f1ef13f9e748449029a21d72a5d83759b7788b075ab799`

## Summary

Scoped PASS for the frozen public runtime, durable admission and timezone repair; no Critical, Warning or Suggestion found in the assigned source packet. Independent verification passes 270 source units, 14 privilege contracts, 23 compiled adapter checks and all 34 native PostgreSQL cases, preserves all 43 original artifacts, and completes the 16-task production build. This permits the parent to continue current-head CI and repository closeout, but does not certify completion or production release of CTR-004: public inquiry binding, owner preparation/review UI, identity assets, hosted serving and HighLevel delivery remain open.

The latest repair supersedes only the old additive SQL pin. The preceding combined Security report `d950081dd54e1a1fa9f2ef8f3f4cac969c86dee11c2f765e56120a2d32c6e2fb`, earlier handoffs, original native 18-pass/nine-failure result and controlled three-pass/four-failure regression remain historical evidence. Standalone Vercel-client and seven-file review-session packets are excluded from this grading; a reviewed resolver module existing separately does not mean the inquiry route is bound.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | Assigned runtime/admission/time repair is implemented; full accepted-contract work remains explicitly outside this increment. |
| Correctness | ✅ | Exact public capability, sealed bytes, quota/replay and encrypted lifecycle pass; 720-hour retention works across caller timezones. |
| Alignment | ✅ | Separate `/p` namespace, sole-LO model, private artifacts, server-owned identities and additive protected SQL match CTR-004. |
| Gaps | ✅ | Assigned failure paths refuse with sanitized responses; unresolved product and hosting work is recorded below without marking it done. |
| Detrimental | ✅ | No source/permission cache, capture bypass, weakened assertion, original artifact change or adjacent nonce-policy regression found. |

## Critical Issues (must fix)

None in the assigned packet. This is not a whole-contract ship verdict.

## Warnings (should fix)

None in the assigned packet. The following retained engineering/release dependencies are outside this source increment and must remain open:

- **Public POST composition:** `apps/web/src/server/financing-release-public-runtime.ts:392-405` intentionally contains `if (resource === "/inquiry") unavailable();`. The default exported POST remains 503 before allocating a public pool or reading the visitor body. A qualified trusted-client profile and native admission must actually be bound, then tested through the configured exported handler. The separately reviewed Vercel module is not that binding.
- **Public identity assets:** runtime `:286-287` refuses unless both identities are explicitly saved as text-only. `resolvePublicPropertyMedia` at `:152-183` supports only the actual private property-media convention. An authorized identity upload/admission/locator path remains engineering work; no image or identity substitution is accepted.
- **Owner preparation/review/publication UI and commands:** the new Next adapters expose anonymous GET/HEAD and inquiry POST only, for example `apps/web/src/app/p/[publicationId]/route.ts:1-13` and `inquiry/route.ts:1-12`. They do not implement the contract's authenticated preparation, complete-artifact review, approval, publication or revocation journey. Existing lower-layer transitions do not establish a usable customer journey.
- **HighLevel delivery and attribution:** `apps/web/src/server/financing-release-public-http.ts:329-340` reports distinct pending, in-progress, delivered, failed, uncertain and blocked states. Native encrypted acceptance is verified, but this packet supplies no qualified HighLevel dispatch/readback adapter or verified routing-profile setup. Do not infer delivered contacts from 202 capture responses.
- **Hosted qualification:** `CTR-004:137-139,145-152` requires actual configured rights/evidence, primary/custom origin, storage, Chromium and hosted read/capture/readback evidence. Local native SQL, controlled R2 transport, default-off routes and static HTML diagnostics do not establish that outcome. Optional HighLevel QR scanning/supplement, copied current URL UX and public custom-host qualification also remain separate.

These entries preserve the parent's accepted increment scope; they are not waived acceptance criteria or newly invented credential blockers.

## Suggestions (consider improving)

None.

## Plan Item Traceability

Statuses describe this assigned increment. “Deferred” identifies accepted contract work outside its ownership, not completed work.

| # | Plan Requirement | Status | Implementation Location | Notes |
| --- | --- | --- | --- | --- |
| PUB-01 | Exact server-selected publication, canonical HTTPS origin, dedicated configuration | ✅ | `financing-release-public-runtime.ts:36-111,123-149` | Explicit activation, finite unique UUID list, independent keys; no request-selected tenant/origin. |
| PUB-02 | Namespace `/p/{publicationId}`, PDF and same-publication media | ✅ | Four adapters under `apps/web/src/app/p/`; `financing-release-public-http.ts:197-208` | Node runtime, dynamic handlers, finite methods/resources, exact path and no query. |
| PUB-03 | Exact host and unsupported/foreign request refusal | ✅ | Runtime `:123-149`; HTTP `:151-161` | Only internal loopback URL reconstruction after exact configured raw Host. Forwarded headers do not choose ownership. Custom hosts remain Deferred. |
| PUB-04 | Current protected publication and independently admitted source | ✅ | Runtime `:248-286`; `packages/db/src/financing-release-repository.ts:655-744` | Exact source/manifest/evidence owner binding, current native context and reserved transaction. |
| PUB-05 | Expiry, revocation, entitlement/evidence withdrawal checked on every access | ✅ | HTTP `:162-195`; runtime `:327-356` | Rechecks before/after read, verification and final transaction; unknown authority refuses. Native withdrawal/expiry cases pass. |
| PUB-06 | Explicit allowlisted projection, no private data/storage URLs | ✅ | HTTP `:213-281`; existing HTML `:47-132,268-279` | Strict public source/presentation, exact inert output; no raw evidence/storage redirect in response. |
| PUB-07 | Same sealed financial/site/PDF bytes and normalized property media | ✅ | HTTP `:218-263`; runtime `:152-183,288-326` | Length/hash/parity and exact source authority checked. Actual native renderer runs over controlled SQL/R2 unit seams. |
| PUB-08 | No generation/write/owner capability in anonymous runtime | ✅ | Runtime `:300-326`; native repository `:655-744` | `newReleaseRef`, publication generation, authorization, render and putOutput refuse; source stages limited to read/capture. Native private entry/raw access tests pass. |
| PUB-09 | No stale shared caching or private fallback | ✅ | HTTP `:19-24,65-70`; runtime `:408-432` | No-store, neutral unavailable text, no financing values or form in denial. HEAD has no bytes. |
| PUB-10 | Sealed script-free CSP, no-referrer/noindex/nosniff | ✅ | HTTP `:79-85,250-281`; proxy `:35-45,81-93` | Exact eligible handler response CSP delegated; fresh request nonce/stripping retained on all paths. Private/invalid/old funnel policies preserved. |
| PUB-11 | Pinned renderer/font and bounded immutable verification cache | ✅ | Renderer `:166-177`; runtime `:114-119,327-356`; Next config tracing | At most 32 SHA-256 metadata keys for 60 monotonic seconds. Full render input, kind, bytes and renderer/font included. No bytes, PII, authority or failed/in-flight promises cached. |
| PUB-12 | Current authority remains mandatory on cache hits | ✅ | Runtime `:327-356`; unit `:210-447` | Changed stored bytes, source drift, evidence withdrawal, expiration and failed verification retry checked independently. |
| CAP-01 | Server request identity, same-origin consent, finite fields/body | ✅ | HTTP `:26-41,87-119,129-157,285-320` | Signed server UUID cookie, 900 seconds, Secure/HttpOnly/SameSite Strict/path scope, exact five fields, streamed 5,000-byte bound, honeypot and explicit consent. |
| CAP-02 | Qualified client identity and keyed publication bucket | ✅ at native boundary | Runtime `:194-230`; admission repository `:6-17,52-106` | Independent required 32-byte HMAC key, copied; canonical UUID; raw client bytes/secret never enter SQL. Resolver must be supplied. Default HTTP binding Deferred. |
| CAP-03 | Durable quotas, exact replay and changed-client conflict | ✅ | Additive SQL `:33-70`; admission repository `:73-106` | Publication lock before scope/count/insert; 20 per client/10 minutes and 5,000 per rolling 24 hours. Exact request retry consumes no new slot. |
| CAP-04 | Native concurrent last-slot and same-request behavior | ✅ | `financing-public-inquiry-admission-repository.integration.test.mjs:211-272` | Original independent postgres.js connections/reservations used in fresh native run. Serialization errors refuse rather than oversubscribe or blindly retry. |
| CAP-05 | Public capture cannot bypass durable admission | ✅ | Additive SQL `:76-112`; native admission tests `:154-172,291-346,370-400` | Original capture renamed privately, direct execute revoked, same-signature wrapper requires current protected admitted row and locks it. |
| CAP-06 | Preserve original guarded body and owner capability | ✅ | Additive SQL `:77-105`; timezone test `:117-149` | Native catalog prosrc equals unchanged original migration; empty search_path, privilege/context/freshness rules retained. |
| CAP-07 | Atomic encrypted inquiry, consent/attribution and delivery operation | ✅ at native boundary | Existing application `:618-676`; DB repository `:288-324`; existing integration suite | Actual encrypted capture/replay, changed-content conflict, ciphertext tampering and atomic operation behavior pass. No real contact/provider fixture. |
| CAP-08 | Distinguish accepted capture from provider delivery | ✅ | HTTP `:329-340`; native capture tests | Six states retained. Qualified HighLevel adapter/readback/DND/provider uncertainty work Deferred. |
| CAP-09 | Sanitized statuses and bounded real quota Retry-After | ✅ | HTTP `:309-322,341-359`; admission repository `:88-109` | Refusals contain no visitor/config/storage/evidence/SQL detail. Daily delay permits 1..86,400 seconds; nonce remains 900. |
| LIFE-01 | Absolute thirty-day temporary contact access | ✅ | Application `:649,666`; additive SQL `:77-85`; timezone test `:151-307` | Exactly 720 hours. UTC local to both protected functions, caller setting restored after success and refusal; cluster unchanged. |
| LIFE-02 | DST constraints, freshness and rolling-day quotas | ✅ | Additive SQL `:64-66`; timezone tests `:151-207,211-360` | Chicago/New York/Auckland/UTC; spring/fall 719/721 rejected and 720 accepted; future/six-minute-old acceptance refused; quota fixed to 24 hours. Historical constraint fixtures are timing evidence only. |
| LIFE-03 | Unexpired owner export, removal, expiry and bounded purge | ✅ at retained native boundary | Existing integration suite; DB repository `:611-626`; prior retention implementation | Latest 1,000 export, revoke access, sanitized tombstones, expiry before deletion and 5,000-row SQL purge pass. Existing combined 25,000 schedule policy unchanged. No production purge performed. |
| DB-01 | Forced RLS, restricted entry and indexed relational references | ✅ | Additive SQL `:9-30`; native admission tests `:370-400`; scaffold | One new empty tenant table; three indexed FK paths, no app/public raw grants, no new role/customer administration. Exact 40-table/31-plan scaffold retained. |
| DB-02 | Additive migration, bounded locks, no original data/body rewrite | ✅ | Additive SQL `:1-7,76-112`; original SQL pin below | Five-second lock timeout; protected function configuration only for repair; three 24-hour expressions. Original capture prosrc and original migration unchanged. |
| ROLL-01 | Disabled/unqualified reads/capture refuse truthfully | ✅ | Runtime `:392-432`; exported route unit `:12-67` | Default reads 404, POST 503 without visitor-body consumption. No production flag or configured runtime activated. |
| ROLL-02 | Preserve source versions, exact calculator and old private reports | ✅ at compatibility scope | Render-only font diff; original migration/body and artifacts | No v1/v2 reinterpretation, APR computation, inferred source authority or five-funnel change. |
| ROLL-03 | Controlled source tests and real SQL evidence before full release | ✅ locally, hosted Deferred | Independent checks below; `CTR-004:141-152` | Native independent connections now qualify local race behavior; canonical pgTAP/Linux CI and current-main/PR closeout still required. |
| DEFER-01 | Full envelope reference/evidence preparation, immutable presets and all supplied quote/disclosure rights | Deferred | `CTR-004:45-74`; prior foundation/persistence source | Retained strict source foundation is consumed here. This packet does not deliver owner setup, verified lender inputs or preset catalog. |
| DEFER-02 | Complete actual artifact review, owner approval/publication/revocation commands and lost-response UI | Deferred | `CTR-004:76-90`; new anonymous adapters | Existing application/SQL transitions remain; authenticated route/UI consumer is outside this increment. |
| DEFER-03 | Saved permitted logos/headshots and partner switch | Deferred | `CTR-004:74`; runtime `:286-287` | Only explicitly authorized text-only identities are supported by concrete runtime. |
| DEFER-04 | Verified custom-host ownership/TLS/readiness and old-link isolation | Deferred | `CTR-004:100`; runtime canonical primary-origin path | Does not reuse an unqualified host binding or imply domain onboarding completion. |
| DEFER-05 | HighLevel Website QR guidance, actual image decode/HTTPS chain, separately sealed flyer supplement | Deferred | `CTR-004:102-110` | No QR manager, undocumented API or perpetual guarantee added. Plain sealed canonical link remains. |
| DEFER-06 | Full hosted capture/delivery, verified profile, DND and uncertain side-effect reconciliation | Deferred | `CTR-004:112-122,137-139` | Native encrypted boundary alone does not satisfy live HighLevel acceptance. |
| PAY-001/002 | Few-action saved property/partner/preset preparation and standalone financing campaign | Deferred/retained baseline | Brief `:132-133` | Owner UI not delivered by anonymous runtime; existing campaign capability preserved. |
| PAY-003/004 | One-to-five fixed-purchase scenarios, exact cent-level accounting and unknown handling | ✅ retained source boundary | Existing calculator/source application and output fixture units | No new calculations or defaults introduced; 223 checks include application compatibility. |
| PAY-005/006/007 | Current lender inputs, permitted identities and safe property media | Partial overall | Runtime `:152-183,248-287`; current native scope | Current evidence and property media refuse unsafe use. Identity/preset/lender setup remains Deferred. |
| PAY-008/009 | Same sealed values and readable site/PDF layouts | ✅ retained artifact boundary | Exact 43 originals; real renderer unit; prior visual evidence | Font lookup-only delta. No new visual approval or hosted output claim. |
| PAY-010/012 | Actual base bytes/retries plus optional qualified QR/canonical URL handoff | Partial overall | Current sealed byte checks; `CTR-004:102-110` | Base bytes retained, optional supplement/scan and copied URL UX Deferred. |
| PAY-011/014 | Expiry/revocation, tenant isolation and entitlement | ✅ at native/source boundary | Current locked checks and native withdrawal/foreign/scope tests | Full release journey remains Deferred. |
| PAY-013 | Correct HighLevel contact/attribution/consent and deduplicated handoff | Deferred | `CTR-004:118-122` | No provider delivery performed or qualified. |
| PAY-015 | No restricted reference/customer material | ✅ within delta | Scoped source/artifact reads and secret audit | Synthetic test inputs, no new source-client assets or contact data. |
| PAY-016 | Appropriate checks and honest remaining release gates | ✅ for assigned scope | Independent verification and limitations below | No completion statement for whole contract or deployed feature. |
| NG-01 | Sole-LO product, internal tenant authority, five funnel kinds retained | ✅ | Scoped inventory and strict repository boundaries | No customer roles, sixth funnel kind or synthetic owner session. |
| NG-02 | No live activation, provider effects, purchases, messages or hosted migration | ✅ | Review actions and default-off source | No provider calls, configured app startup, deploy, Git mutation or production cleanup. |
| NG-03 | Preserve failed histories, old receipts and other authors' work | ✅ | Scope/pins and original logs | Only this report authored. Standalone client/session changes are excluded; earlier reports not rewritten. |

## Files Changed

This is a frozen working-tree audit, so the full branch contains previously reviewed increments and unrelated active work. `git status`, the branch diff and scoped hunks were inventoried; the list below is the exact assigned source packet. No source was edited by Quality.

| File | Change and verified SHA-256 |
| --- | --- |
| `apps/web/next.config.ts` (M) | Four exact public font tracing entries; `5466fd534b1ac899646b00cb445415cb08b270cc59b47a3086bd7ac653906ff5` |
| `apps/web/src/app/p/[publicationId]/route.ts` (A) | Dynamic Node GET/HEAD site; `fbff12f36c0f06d5eb92b159a87bd430f90adcbc85789ec4a2778735c072e4f0` |
| `apps/web/src/app/p/[publicationId]/inquiry/route.ts` (A) | POST with explicit unbound default refusal; `295eb4549f3ce34fdb1954a5fb15b4ac2764b693c96bcacc36b555f3473df0c7` |
| `apps/web/src/app/p/[publicationId]/media/[assetRef]/route.ts` (A) | Exact media GET/HEAD; `55196986ae91a97117023f8ad35948eef3b3545dee2e866dd9674d2d0c6908be` |
| `apps/web/src/app/p/[publicationId]/report.pdf/route.ts` (A) | Exact PDF GET/HEAD; `6c6e0893ce5cad6415046240278d75f1ce73fdbc6c9e26c4d73471459d580697` |
| `apps/web/src/app/p/public-routes.unit.test.ts` (A) | Real exported default-off handlers; `4f12f5c51abd75cb2a0d6691abf815d987a3b75e34612407eb9c57aed953817d` |
| `apps/web/src/proxy.ts` (M) | Narrow sealed-response CSP delegation and `/p` token headers; `d58a5bea6c49690ba102f26a4179077daa64ce7cfe3c1c4a0394093fdbf28142` |
| `apps/web/src/proxy.unit.test.ts` (M) | Preserved nonce, private/invalid policy and exact delegation; `97ceb6603f15fd425ea628656f219cd87d7e245dfb38286783f3a1dfaa61af3f` |
| `apps/web/src/server/financing-release-public-http.ts` (M) | Daily native Retry-After bound; existing exact bytes/nonce/capture retained; `771b0d8a6c38da824fac8e57589454cdfe9daa00a6a041f61dd9c3d93fbcc9b7` |
| `apps/web/src/server/financing-release-public-http.unit.test.ts` (M) | Daily bound and unchanged HTTP refusals/replay; `2e6a297dffe542e2935102c64827c2c0f81b6f47934356e71266a6534512ca48` |
| `apps/web/src/server/financing-release-public-runtime.ts` (A) | Concrete private read capability and explicit native admission factory; `73682e199e765c23e2c6d9e53d5b0127ca4c5389498e2edf62b9f94e19848bad` |
| `apps/web/src/server/financing-release-public-runtime.unit.test.ts` (A) | Current SQL/R2 composition, real parity and cache guards; `986d805bca842db25293648576a0c7c52bbacf759d43c5ed901e21ceff700c79` |
| `apps/web/src/server/financing-release-render.ts` (M) | Only two statically scoped existing font reads; `1105629082bd10c2eaf8907987275804592b88c4f63bf0f5edf3efb5542d75c1` |
| `packages/config/src/public-env-guard.ts` (M) | Dedicated database/crypto names remain server-only; `662e9e2fb877d095e0f95fd2e6239ad510a9d0deef6c5a129cec0eb8e68bf709` |
| `packages/db/src/financing-public-inquiry-admission-repository.ts` (A) | Strict HMAC/native serializable admission; `d0073e0961b6a5e05de6e54d08662b27ad52e7bc97db892cc0a0fbeb795453c5` |
| `packages/db/src/index.ts` (M) | Narrow repository/two-type export; `4d025f4c96e1728f70ac972d7a3b378e40825fa58b32c681c8a0a3fae342d4b4` |
| `packages/db/test/financing-native-timezone.integration.test.mjs` (A) | Native seven-case absolute-duration regression; `f91fe7102eb897a37f9ebf79d1b560e1ac11c28f5376a5f800cc693995a8a0f8` |
| `packages/db/test/financing-public-inquiry-admission-repository.integration.test.mjs` (A) | Native eight-case quota/replay/authority boundary; `184c65d6eaa61bb373a6b57db7556f91d7f14fb5c5ccf4b9d3434b2f4971bfc3` |
| `packages/db/test/financing-public-inquiry-admission-repository.test.mjs` (A) | Configuration and canonical-discovery checks; `74a9d6d21891a69ec0902b8f2f87d914b681e187d170489414c4405482bd82d0` |
| `packages/db/test/financing-release-repository.integration.test.mjs` (M) | Unadmitted denial before legitimate native admission, previous assertions preserved; `f6b4c8227457940e3ff935a028821ed30394ff3f74fd3250a72bc7ec79924ecf` |
| `supabase/migrations/20261014120000_financing_public_http.sql` (A) | One restricted admission table, preserved private capture/wrapper, UTC and fixed-day repair; `923ef0874551a65fcd2342d27a5d1ce0455124c5cc70bc953936a0dfc51d4afa` |
| `supabase/tests/phase0_scaffold.pgtap.sql` (M) | Exact 40-table inventory/31-plan assertion, generic RLS/FK guards unchanged; `7754d5ca562951bd413fe7a6b7477f811d5ebb8fc873ca4aaaa06e775df659e2` |
| `tooling/tests/unit/financing-public-inquiry-admission.test.ts` (A) | Controlled native adapter parameter/HMAC/result tests; `b776fbf10a79144d4762a6aabc20122174743b847c2ec981a9028579e6bf587e` |

### Independent verification

| Check | Result |
| --- | --- |
| Seven runtime/HTTP/exported route/proxy/admission/application/database unit files | 223 passed, zero failures |
| Existing public environment guard file | 47 passed; combined source units 270 |
| Existing database privilege boundary contracts | 14 passed |
| Compiled admission/release adapter checks | 23 passed, overlap with source wrapper cases, not added to unit total |
| DB build; web, DB and tooling TypeScript | Passed |
| Full production build | 16 successful tasks, ten cached; actual Next 16.3.8 Turbopack build and all four `/p` routes, 52.911 seconds |
| Full lint, boundary, secret and product-type audits; diff whitespace | Passed; 16 packages and two rejected prohibited edges |
| Current source pins | All 23 match; repaired SQL is the latest pin |
| Native PostgreSQL 17.11, original independent pools/reservations | 34 passed, zero failed/cancelled/skipped, 44.489 seconds |
| Native active fixture locations after all tests | Zero |
| Caller/cluster timezone | Caller restoration checked by tests; cluster America/Chicago unchanged |
| Original private capture body and protected UTC function configuration | Native catalog equality/configuration cases pass |
| All 43 original PDF/HTML/PNG/JSON artifacts | Exact byte size/hash; zero mismatches; none regenerated |
| Four current route tracing inventories | 385 entries each, one unique pinned font path listed twice, both resolve to the exact font bytes; zero library/tmp/AGENTS/env paths |

The inspected, unchanged `tmp/native-financing-timezone-run.mjs` creates only its exact `oalo_test_fintz_native_<12 hex>` database on root-owned loopback 127.0.0.1:55438, applies all 21 migration files and runs the three unmodified suites with standard postgres.js 3.4.9. It drops only that database in finally and leaves the parent server running. No clock/loader hook, one-backend reservation rewrite, activated product runtime, provider transport or hosted migration was used. Earlier membership notices/nested migration transaction warnings are retained unchanged; native tests completed with exit 0. Canonical Linux/Supabase CI and pgTAP remain the parent's required gate, not claimed from this runner.

The runtime unit uses real financial HTML/PDF and protected repository interfaces over controlled SQL/R2 boundaries. The author-attributed default-off whole-app 12-case header record and isolated static HTML 200/PublicInter-loaded record were read and retained, not newly executed by Quality. The isolated static proof retains the browser's meta-CSP frame-ancestors warning; its actual HTTP header still enforces that directive. Those diagnostics cannot qualify configured native capture or hosted serving.

Reviewer setup failures were corrected without source changes: an initial env-test filter referenced an absent file and ran no tests; the discovered existing test passed all 47. The first tracing assertion expected one array entry, but the actual tracer lists the identical font path twice; checking unique resolved path and both byte hashes succeeds. These setup assertions do not count as source failures or relax the pinned-font requirement.

### Frozen support and retained evidence

| Support | SHA-256 |
| --- | --- |
| Accepted CTR-004 revision 1 | `59d0b203159f5c6c440621437bcd244f664f7a64901924b9a8b952a6a4d70dfa` |
| Latest timezone Security prerequisite | `6c63b7cc28185a9432f1ef13f9e748449029a21d72a5d83759b7788b075ab799` |
| Runtime handoff | `86f2d425232e90c10408306cd9e48abc8d2cd0ed91e67c038614a852f578cd79` |
| Original admission handoff, historical old SQL pin retained | `13dd477b12c538dd1651dfe5dbb3a503803ba25a2994295e2493b46e24806717` |
| Timezone repair handoff | `52ed22da9c30dd2253ed28ae15e537e0b7ac072a31718aa0b61d953444bb9867` |
| Unchanged original financing SQL | `0b0bd282e4a12ef47ccc512d6ab63527210c93f80c1ef8282ad08ef81bb70104` |
| Unchanged originals manifest, 43 entries | `58df4b90c460e8c4e55bb597e3acd325ea0b2a6617eef3a8a9336f2db9375663` |
| Font bytes, both existing cwd choices | `f8051d65db9b84447725125371871f36c382b14be90bf417771b059ea77e5947` |
| Retained native original 18-pass/nine-failure log | `9b7df735110923bc6c9f4422e0b42aecdddc15e5644b386f380956b5e6dfa0a3` |
| Retained timezone regression three-pass/four-failure log | `de3a5854694a36c8cef854858a0f583cb3f0f7cb28cc1ea49bf20fd06dcf8fa3` |

The original failures have an independently demonstrated calendar-versus-absolute DST cause and a bounded repair. This property verdict does not reinterpret or clear any separate publisher review finding or its historical evidence. Only this report is authored; Git, PR mergeability, commit, push, canonical CI, deployment and server shutdown remain parent-owned.

Automatic approval review rejected the earlier configured whole-app startup using fixture DB/R2 hooks and an activation flag as “blocked by policy.” That action remains unrun and was neither repackaged nor retried by this reviewer.
