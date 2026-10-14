# Webinar saved preparation and review: Security review

Audit date: October 13, 2026. Auditor: independent security-guardian. Branch: `codex/webinar-launch-readiness`, uncommitted wave above PR #90 (`5eb7fef`). Agreement: CTR-002 revision 2, SHA256 `47dba3f41499d50141c2bfc5a3a7f67468524d4a3f39a1f96a8506b8ac957f28`.

## Executive summary

One Medium historical-evidence availability defect was reproduced and fixed with root-coordinated ownership of three files. The original regeneration path required an active registry entry, making saved PNGs unreadable after source withdrawal even when the frozen source files remained. Historical regeneration now checks frozen source and output digests independently; preparation and approval retain current registry checks. No Critical, High or unresolved Medium security finding was detected in the reviewed change after re-evaluation.

This is a bounded source Security clearance before fresh Quality, not product acceptance or hosted qualification. The non-security historical replay response mismatch was subsequently corrected by root and passed the focused Security addendum below. Database authorization was reviewed in source and repository adapter tests; the new real PostgreSQL migration, pgTAP and seeded browser suites have not run locally. No live provider action, customer data operation, migration or deployment occurred.

## Scope and ordering

Reviewed the additive campaign manifest, dedicated preflight and approval snapshot, current evidence port and approval replay; publication functions/repository; save/retry/stale-edit and interrupted-preflight handling; historical reads and private images; fixed-font native rendering and contained file access; retained browser retry and review controls; all modified campaign/Home consumers; runtime tracing and the two synthetic-picture CI retention additions. No new Quality report existed for this wave on entry. Prior parent-batch reviews are outside this increment. Fresh Quality and orchestrator repository/PR checks follow this report.

The Next.js/React/TypeScript and SQL host has full local catalog coverage. Imported SvelteKit/WorkOS examples supplied tenancy, input and transport principles only; no unrelated framework acceptance is claimed. The full reviewed source hash list follows this report. Root-owned ledgers and independent reports may evolve without altering that source snapshot.

## Scorecard

| Category | Result | Evidence |
| --- | --- | --- |
| Financial/payment | Clear | Provider is literal false; no provider call, card field or charge operation added. Budget/targeting values are bounded and frozen. |
| PII and secrets | Clear | No gated webinar access URL, inquiry or credential enters the review DTO or retry store. Secret audit passed. |
| Authentication/authorization | Clear in source; actual PG pending | Native session and current binding precede commands; tenant/version/publisher/creator checks remain; reviewer lookup cannot accept arbitrary publication or publisher. |
| Injection and filesystem | Clear | Strict schemas, bound SQL arguments, JSX text escaping, escaped native text, fixed contained paths, junction/symlink and digest checks. |
| Dependencies | Clear production query | Production audit reports zero vulnerabilities; no dependency or lockfile change in this wave. Weapon intelligence freshness qualification below. |
| Configuration/headers | Clear | Existing nonce CSP and security headers retained. Private JSON/PNG no-store and nosniff, PNG sandbox; bounded, pinned CI artifact retention. |
| Integrity/data handling | One Medium fixed | Historical source standing separated from frozen bytes; approval still freshly refuses changed source/destination/output, including replay. |
| Exceptional conditions/resource use | Clear in scope | 8 KiB body, 1 MiB source/font, 32 KiB glyph map, exact bounded dimensions, two fail-fast render slots and 2 MiB final PNG; no invented save success. |

## Critical findings

None detected.

## High findings

None detected.

## Medium finding, fixed

- [x] **WS-001, historical evidence lifecycle.** Before remediation, `apps/web/src/server/webinar-ad-raster.ts:80` called current preparation from historical regeneration, which called the registry-dependent `apps/web/src/server/webinar-ad-art.ts:54`. A removed/replaced registry identity caused `WEBINAR_ART_INVALID` for a saved version even with valid frozen source files. This violated CTR-002 section 5.6 and impaired inspection of immutable audit evidence. Root explicitly coordinated a larger-than-five-line scoped repair. `loadFrozenWebinarArt` at `webinar-ad-art.ts:73` verifies internally derived source paths and frozen PNG hashes without current catalog membership. Historical regeneration at `webinar-ad-raster.ts:88` uses that loader and still checks exact frozen output evidence. New preparation at `webinar-ad-raster.ts:42` and current decision evidence at `webinar-ad-evidence.ts:25` retain the current catalog check. There is no public input or new authorization path into the historical loader.

The actual native regression at `tooling/tests/unit/webinar-ads/webinar-raster.test.ts:163` first failed on the original loader. After remediation it proves registry withdrawal still rejects new preparation, historical output digests remain identical, and altered frozen source hashes still refuse output. Versioned files must remain shipped after withdrawal; the loader documents this retention obligation. Actual renderer/runtime/font drift intentionally fails closed, as required by CTR-002 section 5.4.

## Low findings

None detected in this wave.

## Security boundary evidence

- `webinar-ad-http.ts:85` authenticates and authorizes mutation before parsing or preparing; strict JSON content type and streamed body limits apply. Browser tenant, actor, URL, brand, approval or artifact overrides are rejected by the strict request schema. Real mode rejects synthetic principals.
- `webinar-ad-prepare.ts` derives opaque refs from tenant, actor and request UUID; resolves authoritative owner publication/Brand; renders actual bytes before append; checks digest and byte length; rejects invalid prospective preflight; holds the existing repository aggregate lock for stale edits. Interrupted preflight returns 503 with authenticated reserved references; retry recovers the original version, and incomplete versions cannot approve. No transaction spanning both existing persistence operations is claimed.
- `20261013230000_webinar_ad_destination.sql` uses fixed search paths, native session/current role checks and current tenant context. Current lookup proves publisher equals version creator and current public availability. Historical labels are version-anchored and restricted to creator/admin/approver within the tenant. Full trusted snapshots remain server-side; only headline, description and frozen hash are returned. All four functions revoke PUBLIC; only the three intended lookup capabilities grant app_runtime. Existing owner listing/export/revoke policy and anonymous capability grants are unchanged.
- `campaign-approval-command.ts:351` retains role denial before current evidence or decision replay. Webinar decisions require exact version, manifest, preflight and row hints; `assertWebinarAdEvidenceCurrent` and passing immutable preflight run before replay success/write. The handler composes the mandatory authoritative port; no missing port silently passes. Current publication withdrawal, expiry/start/end, source or output drift suppress actions and refuse current decisions while historical records remain.
- Retained browser retry is one schema-checked entry bounded to 8 KiB, containing only the normalized transport request. Current owned-publication context is verified before retained words display or POST. Failed storage prevents first POST; invalid/foreign content is not replayed. An uncertain 409 keeps the original request rather than inventing new save identity.
- Source and output use no browser file path or external fetch. Fixed repository font/glyph hashes, runtime versions, escaped visible text and supported glyph checks precede bounded native encoding. Final PNGs contain pixel chunks only. Private GET independently authenticates, validates the stored manifest hash and tenant scope, and derives safe attachment filenames.
- Runtime trace additions include only fixed renderer assets plus the existing cwd marker. CI additions use the previously pinned upload action, seven-day retention and explicit synthetic PNG paths; events, permissions, test gates and prior commands remain unchanged. These are test artifacts, not live borrower captures.

## Verification executed by this reviewer

| Check | Actual result | Local evidence |
| --- | --- | --- |
| Managed deterministic scan.ts, output directory adapted only to ignored scratch | Completed; production audit zero; hidden Unicode clean; regex hits manually triaged | `test-results/webinar-security/scan.log`, `scan-output/` |
| Historical withdrawal regression on original code | RED, one failed native test | `retirement-red.log` |
| Focused native raster, preparation/read/evidence, destination, foundation and tracing | 101 passed across 7 files | `focused-green.log` |
| Existing approval command/foundation/handler/name/rules compatibility | 84 passed across 5 files | `legacy-unit.log` |
| Retained retry validation | 11 passed | Initial unit run, command output retained in session |
| Preparation/review/shared approval UI integration | 79 passed, 1 existing skip across 3 files | `ui-integration.log` |
| Fixed-query publication repository adapter, not real PG | 4 passed | `db-adapter.log` |
| Web and tooling type checks | Passed | `web-types.log`, `tooling-types.log` |
| Secret/boundary audits | Passed, 16 packages and two deliberately rejected fixture edges | `secrets.log`, `boundaries.log` |
| Scoped lint/format and git diff check | Passed | Command output retained in session |
| Duplication gate | 734 files, zero clones | `dup.log` |

No production build was overlapped or rerun by Security. Independent runtime packaging had already produced the real build/trace/relocation evidence before this historical-only correction; the pixel recipe and assets did not change. No new PG, hosted function or seeded saved-campaign browser result is inferred from unit fixtures or that earlier build.

## Dependency audit and intelligence qualification

Installed manifest and lockfile: Next.js 16.3.8, React/React DOM 19.3.0. The fresh `pnpm audit --prod --audit-level=high --json` query reports info 0, low 0, moderate 0, high 0, critical 0 (153 total production/optional dependencies). This wave changes no dependency versions. Prior parent dependency disposition remains separate.

The managed watchlist says Last refreshed April 24, 2026, more than 120 days before this audit. Its historical middleware/RSC/DoS/source-exposure thresholds cannot establish a complete current advisory matrix. Refresh the Weapon's CVE research through its owning workflow. No Guild file was modified. Fresh registry audit, exact resolved versions and direct auth/origin/tenant enforcement are the current evidence here; they do not certify undisclosed vulnerabilities or replace that research refresh.

## Files changed by Security

| File | Security repair |
| --- | --- |
| `apps/web/src/server/webinar-ad-art.ts` | Separate contained frozen-art verification from active catalog eligibility. |
| `apps/web/src/server/webinar-ad-raster.ts` | Share verified-asset rendering; historical regeneration uses frozen art and retains exact output verification. |
| `tooling/tests/unit/webinar-ads/webinar-raster.test.ts` | Actual native withdrawal/readability/drift regression, RED then GREEN. |

Diff reviewed after remediation. Other agents' source was preserved. This report is the only additional maintained file owned by Security.

## Open correctness and qualification items

1. **Replay response mismatch, closed by the addendum:** the original `preparation-model.ts` accepted only the latest `/marketing/campaigns/{campaignRef}` response link, but the producer returns `/versions/{versionNo}` when an original exact retry resolves after a newer version exists. Root corrected the exact response schema and the focused Security recheck below passed. Fresh Quality still verifies the end-to-end recovery outcome. This was a recovery correctness defect, not evidence of an authorization bypass.
2. Apply the reserved additive migration and run the authored pgTAP, route/PostgreSQL, and seeded actual save/read/approval/download browser suites in CI. Unit and fixed-query adapter checks cannot establish real SQL grants/RLS execution.
3. Retain withdrawn versioned PNG sources and the pinned renderer/font for historical reads. Qualify actual deployed trace/native execution and final browser artifacts before hosted acceptance.
4. Preparation/app approval does not supply creative owner/lender review, licensed valuation, custom-domain, public conversion or Meta launch/spend authorization. The new provider path remains disabled.

## Reviewed source SHA256 snapshot

The following exact-byte pins cover changed implementation, tests, migration, fixed font assets and CI workflow, plus the accepted contract. Fresh Quality and any follow-up review must reconcile source changes against these pins.

| File | SHA256 |
| --- | --- |
| `.github/workflows/ci.yml` | `71da6f3875b01cf80cc8ba8480b01cb5c79fb862ac0a6281baf5888cc640490f` |
| `apps/web/next.config.ts` | `2c4100c4b390cb54cbedcfe3e62a9567841a4c204a59a01a9fbc78e37a70ce98` |
| `apps/web/public/fonts/webinar/AutomatedLOWebinarInter.ttf` | `f8051d65db9b84447725125371871f36c382b14be90bf417771b059ea77e5947` |
| `apps/web/public/fonts/webinar/glyph-ranges.json` | `30678790e49b55a9e323cba9d40c184c14ff73449d2a77f288a310f546e9d996` |
| `apps/web/public/fonts/webinar/README.md` | `e5d115ae4ddeddee2d9f51f9e92004b9c6b53c1a2e6835501067c186dde2ad28` |
| `apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/campaign-route.tsx` | `fdfb59c05298de5d703165cc5be1e9d06c9d9a97d35eb6333d3720a6484f39ef` |
| `apps/web/src/app/(authenticated)/marketing/campaigns/webinar/error.tsx` | `62cee4b2312ff4fcc9bedbcef625ad89d7f1aef4dce5f0c31e34a6dbee585168` |
| `apps/web/src/app/(authenticated)/marketing/campaigns/webinar/loading.tsx` | `4705ceada078fe4ef06e2419207c2a67bd033543c7e7016d1049edcd0e590413` |
| `apps/web/src/app/(authenticated)/marketing/campaigns/webinar/page.tsx` | `53a91817bb390d98cce52a0742a02bc2a51ae354f1550157cc8fc9a030292db1` |
| `apps/web/src/app/api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]/[shape]/route.ts` | `8fc8f793297ecea20b11647081995dfd79c2b5e5ba4ae390aa4e4821e35e3ba0` |
| `apps/web/src/app/api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]/route.ts` | `1b3188360b9f535bdc1f5e7485fee605746f10904668918bfa76f6bda9da9cec` |
| `apps/web/src/app/api/campaigns/webinar-ads/context/route.ts` | `144109e6fd6bd70201ea9af84cf5b86556ca51ff74dcc1d3451270d71538fa7e` |
| `apps/web/src/app/api/campaigns/webinar-ads/route.ts` | `b9d153a3ef9d02cf46b4405bd347e8d7e31aeaa97795f2a812a063f118dd9950` |
| `apps/web/src/copy/launch-messages.ts` | `816621b4ee0b93743806af1eead892630242a78095521c5fb8371b6f6d3fa800` |
| `apps/web/src/features/campaigns/campaign-page-model.ts` | `f692fe78468d4ee16875e97878c41e448824a82014130aaba9d7c8bf1dc5bad7` |
| `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx` | `bffb1dde9f7c0b6750f93f6e9dc6fb18a0235dc15147358e86b8331b27083cd2` |
| `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx` | `b92c76031e1366b5ec90b7c3dd08ca2ad8925dd4d110b44d494db969a70ce372` |
| `apps/web/src/features/campaigns/launch-model.ts` | `29483aaf4675a1a21874cfd85aed0acb87fa34e4c47dbd14df1b10237bd7f128` |
| `apps/web/src/features/webinar-ads/pack.tsx` | `b6357ea6e5d1ecc402c4be553f3f83d7969b8027645ea36ebaa12b82cca6e4a4` |
| `apps/web/src/features/webinar-ads/pending-save.ts` | `f90a988e863d51ad80550b2b1a1ccc95e6401a067233cb6378ff3123997a4261` |
| `apps/web/src/features/webinar-ads/pending-save.unit.test.ts` | `3169a094282a4acea2e38fc1f817974875d51e36ea9b5ff460cf51d2a4b818de` |
| `apps/web/src/features/webinar-ads/preparation-model.ts` | `ab0d5c0d3392883c77599b34ea23752b62819e644d8c7a6ae382e11f54d82133` |
| `apps/web/src/features/webinar-ads/preparation.integration.test.tsx` | `ac305f8e0bff47165776559fa47f841e6dfda7ca621383546a2314879d66e4c9` |
| `apps/web/src/features/webinar-ads/preparation.module.css` | `fbc519c7c09891a9936847463f7f810adedbbd88f7302d81f73ae10d97002dad` |
| `apps/web/src/features/webinar-ads/preparation.test-support.ts` | `a2b9ecfa0f2201ffc8bdd4acbc19a778c120394211c7529b69552d95080ada14` |
| `apps/web/src/features/webinar-ads/preparation.tsx` | `f9c2846b738dfce12f60b471b7e2933fb9ae47d1129f77be8cbbcd239e009091` |
| `apps/web/src/features/webinar-ads/review.integration.test.tsx` | `ddc96f66e4d308ada8533daa4431dc5b705d692214fa25d9de044115fdec230a` |
| `apps/web/src/features/webinar-ads/review.test-support.ts` | `88a30d852d3980930aea510afa505b1f0ea6ba1ffac3cba612126d562c229e7f` |
| `apps/web/src/features/webinar-ads/review.tsx` | `0ba7711a7e021f306a040e9887aef4dde24ec13c4198047e721c0d370e0fcd6b` |
| `apps/web/src/server/campaign-approval-handler.ts` | `d3dc4d3971789811372ab31f71fdb31f95295e74acf9b396b3448e9b99d32b3c` |
| `apps/web/src/server/campaign-page-data.ts` | `f10e2099c4561267269523dc1953498f6411083b7d370d9725e5bc6d609cabfc` |
| `apps/web/src/server/campaign-workspace-reads.ts` | `312ebb30036ecc2cc470e84995faac94ea8cc854ebc9e6d2fa700cb12750d2a4` |
| `apps/web/src/server/home-reads.ts` | `5180a0dea4df197673d8c799693a76b47e439482a157ae7c7ee6dce4cdf08c8f` |
| `apps/web/src/server/webinar-ad-art.ts` | `2c3129682fe77e8b794090ceb9144c5d35ffccee4a679e98254f676d9d2fd7f0` |
| `apps/web/src/server/webinar-ad-evidence.ts` | `3a70c2e623b4e50aa96974c891fbc3c9de3548179aeed4c90c96cc0ca3cb4ec5` |
| `apps/web/src/server/webinar-ad-evidence.unit.test.ts` | `f1384c3423607927c7a27e0e09e7ceca47f3a0ca99de483c9df57adfa3f8ec2a` |
| `apps/web/src/server/webinar-ad-http.ts` | `eaf555c4dc2229e57a623e788e1941ce26fb9ed83258a06b738ba24f46449d00` |
| `apps/web/src/server/webinar-ad-prepare.postgres.test.ts` | `79208a506fcc764dff9c225e31f2389e183c033a593fbcf174e21b345740b0d1` |
| `apps/web/src/server/webinar-ad-prepare.ts` | `c65856b7c208789a3629fb67b57dc0958364238ad5c729a03874cef5b37e5682` |
| `apps/web/src/server/webinar-ad-prepare.unit.test.ts` | `452792f58cb4f9f88842f840eeff1e468b341d1209f7c3523c9c27922dac81b7` |
| `apps/web/src/server/webinar-ad-raster.ts` | `3c209a3c03dc25c3d4f4d03af492a5d84aa89a72b1028a964be426cf86746680` |
| `apps/web/src/server/webinar-ad-read.ts` | `ec07488359306fe09040297ca8e5a424d2297cff0ffb6def98b8a58cee1f7de4` |
| `apps/web/src/server/webinar-ad-read.unit.test.ts` | `903c2e5efb510109a2276de547ba515e366aeebc044710667a12d5319cc032fc` |
| `apps/web/src/server/webinar-ad.test-support.ts` | `765080a5310775fc1eda6c1885a1da05b4c1ab00ebb943c045e3a02dcf3197b7` |
| `apps/web/src/server/webinar-destination.postgres.test.ts` | `8e7bfffb76e3c5079009dd12ae84c4f750bd3db23682d9b6cd2fe3e6550d38ef` |
| `apps/web/src/server/webinar-destination.ts` | `a5876679221c77aa923c91c58d266e99bc382fab42731da20f35fe5d992942cc` |
| `apps/web/src/server/webinar-destination.unit.test.ts` | `3266d5f36ae1f5dd0b96c6469371ae46ee4be1cfbf84d6dfc94a5346c8cece3c` |
| `library/knowledge/private/contracts/CTR-002-webinar-ad-destination.md` | `47dba3f41499d50141c2bfc5a3a7f67468524d4a3f39a1f96a8506b8ac957f28` |
| `packages/application/src/campaign-approval-command.ts` | `5b6a53a57be5a763eb1252db27c9f1cf2adead290fa9576f4f066ec36300bfc8` |
| `packages/application/src/campaign-foundation.ts` | `25d38194203eea5f55d9261b41190296535df707ebd559adab09f8cfc7d00a34` |
| `packages/application/src/index.ts` | `a25afdd567f42c5453748ebaa82b163f631351271370d7c8ae569df45ac6ef8b` |
| `packages/application/src/webinar-ad-evidence.ts` | `83e52f4bddc889050e34b2d52467d4e9e1c21be7ae8d376512ccf9f1adbbbda7` |
| `packages/contracts/src/campaign-foundation.ts` | `a7065134850485e9a8dc6d8891613559b280aec05836fcbb52752d9180b46d3b` |
| `packages/contracts/src/index.ts` | `1434825860c6beb9583eca574d6de598646ceab9b8626dc3e7631ab5877c415e` |
| `packages/db/src/index.ts` | `e387f812f09512738601645d662b3ff8d4159d8bcd08bdfa5fd3c2b1c11303c5` |
| `packages/db/src/webinar-publication-repository.ts` | `dde8dc3c9c9be9e99dd126b85e84ede8990845010bdce2c5a367f82907ce81b8` |
| `packages/db/test/webinar-publication-repository.test.mjs` | `c6a241516a787d7c490c4f785d64e69be1d129acf528bfb1f0eb9e030c9d4101` |
| `packages/domain/src/campaign-foundation.ts` | `eb7fa12d28fbd32cf9cc96c3411a4a71f55c6404d483777b2684d9a2599172f7` |
| `packages/domain/src/index.ts` | `f05c2d663e99a4ba0cfd3fbd0e1d20fc739886d20657bd2a976e18cb3bf7e7e7` |
| `packages/domain/src/library-ad-ruleset.ts` | `e4dfef2d2f2e273cab7a548da9584b8387de3a20b4894b9874722e9282d502dc` |
| `packages/domain/src/webinar-ad-rule-codes.ts` | `99a20074d1cb730b52556f3d9f82cbde6a1fdd0f10de2c140d22f18336c08bd8` |
| `packages/domain/src/webinar-ad-ruleset.ts` | `33b3193e10da8be01d4e863c8eed003ad4cd563cdf858e5ed484559071b78864` |
| `packages/rendering/src/index.ts` | `80faa387746d074994d5b2e00ff50663c3a4d2171b738840af27fe44842d8c89` |
| `packages/rendering/src/webinar-ad-raster.ts` | `c7bd7d5b8bec71936094ab8a353668d9b0382d7ccc6a396c11d4ee454f111a5e` |
| `supabase/migrations/20261013230000_webinar_ad_destination.sql` | `8165cd4d7f27776d902a56ccf9f95818e1419239b972db9af7374f51059a3620` |
| `supabase/tests/webinar_ad_destination.pgtap.sql` | `d965ffbdebdb4d8e5706b340f422d29744aac7d519459f1d91aef0c0ec4f24e0` |
| `tests/browser/review/webinar-ads.spec.ts` | `67687a8d087905fc2148ac1dcdd00ea6a013a7939c69a5957cfea9b102a2bf02` |
| `tests/browser/webinar-preparation.spec.ts` | `5e4bdc48b824820660a45cae864bfac6b8e8786cf252c9048db5bc34755b068c` |
| `tooling/tests/unit/webinar-ads/runtime-packaging.test.ts` | `5be5d1921ed110c58eac761f3452de38b9d1182b862661563b5f84e29a8d0089` |
| `tooling/tests/unit/webinar-ads/webinar-foundation-fixtures.ts` | `c165cf635004bb74c94d5ccfe6a2a0be96a78808eef8e42f1b4425b46c772c50` |
| `tooling/tests/unit/webinar-ads/webinar-foundation.test.ts` | `a60c91212b11ee4aecc91372ea4d4999b7d507110c0309803bbf2e21a3cc3e9f` |
| `tooling/tests/unit/webinar-ads/webinar-raster.test.ts` | `51bb53d483beebb5e8e4600871eeaf346d20e753073c40d1b9cc026509460ed1` |

## Focused recheck: historical replay response

Root changed only the strict saved-result href refinement and added its directly related unit test. At `apps/web/src/features/webinar-ads/preparation-model.ts:63`, the href must equal either the derived current campaign path or that same campaign's exact positive integer `versionNo` path. There is no arbitrary hostname, protocol-relative address, different campaign, alternate version, leading-zero variant, query, fragment or trailing slash acceptance. `preparation.tsx:282` still parses before clearing the pending retry or navigating; native destination ownership and server read authorization remain unchanged.

The reviewer independently reran 21 unit cases (10 result-path boundaries plus 11 retained-retry cases), all passed, and 24 preparation/review UI integration cases, all passed. Scoped lint/format and diff checks passed. Logs: `test-results/webinar-security/replay-schema-recheck.log` and `replay-ui-recheck.log`. Root retained its original RED/GREEN evidence separately; Security does not count that as its own run. Comparison of all 72 original source pins found exactly one changed prior file, the claimed preparation model, with one new related test. No raster, markup, workflow, manifest, approval or SQL source changed.

No security finding is introduced. The response mismatch is closed for the scoped schema correction. Source is released for fresh Quality; all prior actual-PG/hosted/provider qualifications remain open.

| File | Superseding/additional SHA256 |
| --- | --- |
| `apps/web/src/features/webinar-ads/preparation-model.ts` | `2874d71fad53c007d6b44f5fc85579300b26fb73c969c38bc9c280a30053fa3a` |
| `apps/web/src/features/webinar-ads/preparation-model.unit.test.ts` | `c0bbb5999b2ef3338340345d2931f858ef5a85da85fc8d6842d398f3b7491026` |

## Focused recheck: shared Select popup landmark

The earlier Quality report recorded WQ-01 and stayed Open. Root corrected that finding through React and explicitly requested this new scoped Security pass before fresh Quality. That earlier Quality snapshot predates this one-line source correction; its finding and verdict require the fresh re-evaluation, not reuse as current acceptance. No Security remediation was applied after a clean Quality verdict.

At `packages/ui/src/components/Select.tsx:91`, the portal resolves the containing dialog/alertdialog first, then the nearest main/role-main landmark, then the existing themed shell/body fallbacks. Dialog ownership remains first, so an inner main cannot move popup content outside the modal. The fixed-position placement calculation, escaped option content, event handlers and page authority are unchanged. Review of the actual modal focus/Escape handling in `overlay.tsx` and the regression fixtures found no new focus-containment or confirmation-bypass issue.

Security independently executed all 11 shared Select integration cases, including actual modal Dialog and urgent AlertDialog with Tab/Shift-Tab wrap, popup Escape followed by modal Escape and opener restoration; both main variants; modal priority; shell/body fallbacks; disabled choices; typeahead and keyboard selection. All passed. Scoped source lint/format and `git diff --check` passed. Log: `test-results/webinar-security/select-portal-recheck.log`.

The real browser spec retains both editable form and open popup images in each viewport/theme, asserts selected/active option and trigger focus, viewport containment, Home/Enter/Escape behavior and exact-body recovery after actual reload. Every axe call uses the unchanged shared helper without exclusions or disabled rules; there is no filtered acceptance of the former region finding. The sole console filter remains the two explicit synthetic 503 fixtures and does not affect axe findings.

Security read React's `test-results/webinar-select-landmark/inventory.json` and independently verified all three source hashes and all 40 original PNG hashes, with zero mismatches. React's retained run states eight actual local production browser cases passed in 48.1 seconds following 16 successful build tasks. Security did not rerun that browser/build work and does not convert synthetic refusals into database or hosted evidence. Independent UX and fresh Quality own final presentation acceptance.

No new security finding detected. Focused runner and source ownership are released for fresh Quality and root's complete regression; no further build/test process runs under this Security task.

| File | Superseding/additional SHA256 |
| --- | --- |
| `packages/ui/src/components/Select.tsx` | `7dd5422cf5e56a6301fff09efa830c7d8b3d3cefc266d169554497644e0e21e8` |
| `apps/web/src/features/dashboard-preview/shared-select.integration.test.tsx` | `b8237ac401e45dcd96453d51f5131797160ad36260f8b2a935e6f62991a278f9` |
| `tests/browser/webinar-preparation.spec.ts` | `65ccf6c58b715fabd0bf3827e10846c4f2d7475ca3bf2132640004c4184709b5` |

## Focused recheck: full-regression corrections

The prior six-project verification exposed six failures and kept the wave Open. Root assigned a new Security cycle over the ten exact files in `2026-10-13-webinar-regression-corrections.md` before fresh Quality. That correction record SHA256 is `adc1098215d1f441a9ec8f129073d7129c51e29a6ffeb619ec7c6d728f863d39`; all ten source pins were independently reconciled with zero mismatches. Earlier clean scoped reviews do not erase the failed full-wave evidence or establish current full-regression completion.

Security inspected each correction and found no weakened production authorization, privacy, historical/current evidence boundary or disabled provider behavior:

- The exact directory assertion at `tests/security/provider-side-effect-default-off.test.ts:544` adds only the existing bounded webinar preparation/read namespace. Actual Meta Graph/SDK/pixel, outbound launch/publish, provider-publication marker, every campaign-state next action and launch-state plants remain enforced. It does not introduce a production launch/publish allowance.
- Confirmation and preparation/review/domain changes are plain displayed strings. The existing role/provenance command, uncertain request identity retention, current-refusal action suppression, historical two-image read and disabled provider button remain. No schema, persistence, raster, publication lookup, migration or workflow behavior changed.
- Five central error mappings give concrete correction/retry advice; none return a raw exception, secret, gated URL or borrower data. Conflict guidance requires inspecting the latest version, while uncertain save guidance retains the original request. Exact names and fix targets must still equal the union of all current registered preflight codes, including webinar codes.
- The image-summary guard at `apps/web/src/copy/campaign-image-messages.unit.test.ts:49` distinguishes CSS class selection from data reads and excludes only the exact typed webinar review's two-picture map plus the first picture field in its schema-parsed synthetic helper. It does not skip a source file or directory. Typed page/review/manifest bindings must exist; other reads in those same files remain scanned. The existing honest empty-property-photo control and silent legacy consumer plant are retained. No unused empty-photo import was added to production review or helper.
- New falsifiable cases at that guard's `:131` prove same-file legacy image count/length/property reads remain detected, removal of the webinar type or use of another filename restores failure, and a legacy read in the schema helper is detected. Empty, one-picture, three-picture, reversed and unknown-shape webinar manifests all fail the actual strict tuple contract. These are bounded source-regression checks, not a general AST or runtime-data classifier.

Independent executed verification: 111 cases passed across seven files in `test-results/webinar-security/regression-corrections-recheck.log`, then 16 vocabulary cases passed in the eighth file in `regression-vocabulary-recheck.log`. Total 127 across sequential unit/contracts/integration commands, both with the two-worker bound. The first command included a nonexistent vocabulary pathname and therefore selected seven actual files; the correct vocabulary file was then explicitly run. No test exclusion, assertion or timeout was changed. These counts overlap implementation/future full-suite counts and must not be added to them.

Security inspected the current browser inventory `test-results/webinar-final-preparation-capture/inventory.json`, SHA256 `dba3b56373017c3cca0b39686a883322154cb12e7d23b2f03d9e1f3a587fbc4c`. All 14 listed correction/support source hashes and all 40 original PNG hashes independently match. The retained producer evidence states 16 successful build tasks (10 cached, current Next app compiled), BuildID `XdH5zlzvUTXy-B1DVM91e`, and eight actual browser cases passed in 50.7 seconds. Security did not rerun that build/browser work or infer actual saved database/RSC review from synthetic context and two deliberate 503 fixtures. Independent UX and Quality retain their own presentation/evidence responsibilities.

No new Critical, High, Medium or Low security finding detected; no Security source repair needed. Focused runner is released for root's complete six-project regression and fresh Quality. Actual PostgreSQL, current-head CI/mergeability, hosted execution and provider qualification remain open.

| File | Superseding/additional SHA256 |
| --- | --- |
| `apps/web/src/features/webinar-ads/preparation.tsx` | `7dfc24bc7ac509e3271c06bbbf68e13cb6d76f6f6219a5d5c67ebb1034a31507` |
| `apps/web/src/features/webinar-ads/review.tsx` | `07491245c68938ca1f5993cea13f83626e6dab9018674b1d06891ae2a9c7e3ec` |
| `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx` | `ea4268376542c733209b43aefec99dba03b1ea2b8a5fc10eb36c4775f8d40bff` |
| `apps/web/src/features/webinar-ads/review.integration.test.tsx` | `7fc99fd8ffa61affda5f9c68e0018648f7734d684e19bc4497042f9520a014ec` |
| `packages/domain/src/webinar-ad-ruleset.ts` | `baf788e4fd9c1718614c2297f578f16119a76bcb8450be426f2b92a8e5ccaf4a` |
| `tests/security/provider-side-effect-default-off.test.ts` | `435dd8282b4999e657932dfbf45d80bf2585e6727108628daf509883b41f7911` |
| `apps/web/src/features/campaigns/launch-model.unit.test.ts` | `3d123a4c3e6b7e98c0a3de6434e120a0b5edd601732a5014fbda9dc3ed6bcad9` |
| `apps/web/src/features/http/user-messages.ts` | `5962b8a5aa7af638c6a4fa9a89ecdc1fb0035685e8400190c33f2d3ee9af4824` |
| `apps/web/src/features/http/user-messages.unit.test.ts` | `da70aa666dce2ce4a5bc913a8fed704d204f2e0cd613c10d1e0159a02e75676c` |
| `apps/web/src/copy/campaign-image-messages.unit.test.ts` | `962c5e4578ef4c94e46728c035adbad8a2b83b2ffc5ba180eaecd3771738b559` |
