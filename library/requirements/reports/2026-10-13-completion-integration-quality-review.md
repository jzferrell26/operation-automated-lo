# QA Report: Completion integration

**Plan document:** `COMPLETION_INTEGRATION_LEDGER.md`, the explicitly assigned combined integration plan. Its component criteria are the bounded rows in `COMPLETION_LEDGER.md`, `FINANCING_PHOTOS_LEDGER.md`, `RUNTIME_DIAGNOSIS_LEDGER.md`, `HOMEOWNER_READINESS_LEDGER.md` and `WEBINAR_LAUNCH_LEDGER.md`.
**Audit date:** October 13, 2026, America/Chicago.
**Base branch:** `origin/main`, frozen at `728d5f0eb463bbf6abfe2519470fa536c022fa15`.
**Head:** `codex/completion-integration` at `c625cff10ab569477859f5fd1adaf1b4d13d16eb`.
**Auditor:** Independent quality-guardian.

## Summary

PASS with the existing nonblocking WQ-02 suggestion for the bounded combined implementation source. No new Critical or Warning was detected; all 45 consequential Security source pins, four union-conflict pins, six incoming ancestors and 24 final accepted Library image blobs match, and independent serial checks passed 215 unit cases and 74 interaction cases. Actual combined PostgreSQL/browser CI, final-head mergeability and release review remain the orchestrator's gates; this report does not certify complete PRDs, hosted recovery, licensed valuations, lender approval or paid advertising.

The parent assigned one combined integration report, rather than reopening the five existing feature audits. Their scoped source requirements and latest corrective appendices supply the component criteria below. Accepted engineering agreements CTR-001 revision 1 and CTR-002 revision 2 and the single-LO owner direction govern their shared boundaries. Historical failed checkpoints remain historical and are not counted as overall CI successes.

Security ran immediately before this review, at this exact source head, with no unresolved finding or subsequent source remediation. The independently read Security report has SHA-256 `e112d923ca987eaf140abbfd0ed662c98251cdd6f24e236b12106548e1b64e13`. The entry working tree contained only that new untracked report. Quality owns only this new report and ignored evidence under `test-results/quality-integration/`; no source, test, image, configuration, ledger, commit, push, deployment, database or provider mutation was performed.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | ✅ | All assigned combined source criteria traced; component PR/release gates and full customer outcomes explicitly remain open. |
| Correctness | ✅ | Strict additive manifests, deterministic saved evidence, current decision/replay checks, media lifecycle and single-LO capabilities survive integration. |
| Alignment | ✅ | Four conflict resolutions preserve both sides; accepted contracts, module boundaries and existing authentication remain intact. |
| Gaps | ✅ | Refusal, uncertain retry, explicit empty media, unknown readiness and removal races remain covered. Combined external execution is not inferred from local tests. |
| Detrimental | ✅ | No new reproducible regression or new detrimental pattern found. WQ-02 remains an attributed nonblocking internal-summary suggestion. |

## Critical Issues (must fix)

None detected in this bounded combined source review.

## Warnings (should fix)

None detected in this bounded combined source review. Pending combined CI and hosted/product outcomes are qualification limits, not source findings disguised as resolved requirements.

## Suggestions (consider improving)

- [ ] **Inherited WQ-02: Apply summary refusal to the version whose current evidence was checked.** `apps/web/src/server/campaign-page-data.ts:278-283`.

  When displaying a historical webinar version, the shown version's current availability is also applied to the latest version's internal summary. A withdrawn historical destination can therefore label an otherwise eligible latest summary `preflight_failed`. The existing UI presents version links, dates and actual decisions, while current approval controls use the shown/latest guard separately at `:289-292`, so this does not establish a visible core-flow or approval defect in the assigned increment. Preserve per-version availability in that summary in a future bounded change. This is the prior webinar Quality suggestion, not a new integration finding.

  ```ts
  versions: versions.map((summary) =>
    summary.isLatest && !review.current.available && summary.decision === undefined
      ? { ...summary, standing: "preflight_failed" as const }
      : summary,
  ),
  ```

## Plan Item Traceability

Status `Pass` refers to the bounded source, preserved component evidence and independently selected tests at the frozen integration head. `Open gate` is not a pass and requires the orchestrator's separately executed current-head proof. Whole PRD acceptance is outside this integration assignment.

| # | Plan requirement | Status | Implementation location | Notes |
| --- | --- | --- | --- | --- |
| INT-BASE | Isolate integration from current main without modifying source branches | Pass | `COMPLETION_INTEGRATION_LEDGER.md:5-21`; Git ancestry | Frozen main is an ancestor; six incoming source/evidence heads independently verified. |
| INT-PROVENANCE | Preserve all five reviewed increments and final webinar evidence | Pass | `COMPLETION_INTEGRATION_LEDGER.md:13-21`, `:62-79` | No source rewrite follows the final image/report merge. |
| INT-CI-UNION | Retain general and webinar-specific artifact uploads | Pass | `.github/workflows/ci.yml:85-106`, `:179-199` | Both uploads keep original paths, pinned action, conditions, retention and missing-file handling. Existing verification jobs/gates retained. |
| INT-MESSAGE-UNION | Preserve financing and webinar refusal assertions | Pass | `apps/web/src/features/http/user-messages.unit.test.ts:103-147` | Independent unit selection executed the combined assertion file. |
| INT-READ-UNION | Preserve financing media and webinar evidence imports and read branches | Pass | `apps/web/src/server/campaign-workspace-reads.ts:27-31`, `:249-274` | Access projection precedes current webinar evidence; verified nonempty financing media still requires storage. |
| INT-MANIFEST-UNION | Preserve financing v1/v2 and webinar alternatives without widening old schemas | Pass | `packages/contracts/src/campaign-foundation.ts:595-647` | Old library/open-house shapes remain strict; v1 financing and outer campaign version remain unchanged. |
| INT-REGRESSION | Combined broad regression and unchanged-threshold coverage | Pass, attributed execution | `COMPLETION_INTEGRATION_LEDGER.md:45-54`; retained logs | Independently inspected 4,220-pass/one-skip and 3,100-pass coverage log summaries. This reviewer did not execute those broad commands. |
| INT-SECURITY | Independent combined Security precedes fresh Quality | Pass | `library/requirements/reports/2026-10-13-completion-integration-security-review.md:5-17` | Exact report hash and all 45 source pins matched before audit. No outstanding source Security remediation. |
| INT-QUALITY | Fresh traceability and relevant serial combined seam checks | Pass | This report; `test-results/quality-integration/` | 289 independent cases across 21 files and three gates passed. Counts overlap prior/broad evidence and are not added to it. |
| INT-REAL-CI | Qualify actual combined database/browser execution at final integration head | Open gate | `COMPLETION_INTEGRATION_LEDGER.md:82-95`; canonical workflow | Feature successes cannot replace combined actual PostgreSQL and browser CI. Root owns this execution. |
| INT-PR | Final main reconciliation, review and MERGEABLE PR | Open gate | `COMPLETION_INTEGRATION_LEDGER.md:57-60`; root release gate | No final PR/mergeability or hosted ship declaration is made by Quality. |
| REVIEW-INVENTORY | Source-linked librarian review and unresolved customer outcomes | Pass, document scope | `library/knowledge/private/product/completion-review-2026-10-13.md`; `COMPLETION_LEDGER.md:25-38` | Review preserves broader unfinished work. Historical external state is not assumed current. |
| WEBINAR-PACK-CONTENT | Exactly fifteen original variants, three per learning goal | Pass | `apps/web/src/features/webinar-ads/model.ts:4-61`; `catalog.ts:1-4` | Original pending registry remains separate from catalog approval. |
| WEBINAR-PACK-ART | Two contained verified source rasters per variant | Pass | `apps/web/src/server/webinar-ad-art.ts:28`; `tooling/tests/unit/webinar-ads/webinar-raster.test.ts` | Native raster tests independently executed; existing source art is not overwritten by the lender footer. |
| WEBINAR-PACK-PREPARATION | Discover, select, edit, inspect, copy and download | Pass | `apps/web/src/features/webinar-ads/pack.tsx`; `preparation.tsx:394`; `review.tsx:76-136` | The original pack's no-write interface and later explicit save interface retain their respective truthful behavior. |
| WEBINAR-PACK-BOUNDARY | Pending source does not manufacture approved global catalog entries or launch | Pass | `model.ts:34`; `packages/contracts/src/campaign-foundation.ts:557`; `review.tsx:246` | Later tenant app approval is an actual human decision, separate from source catalog approval and spend. |
| WEBINAR-PACK-VERIFICATION | Appropriate source/art/interaction checks | Pass, bounded | Independent unit/native renderer and integration selections | Component browser/visual evidence remains attributed to its existing reviewers; no new exhaustive screenshot inspection claimed. |
| REPORT-DISCOVERY | Campaigns clearly exposes property, financing and funnel tools | Pass | `apps/web/src/features/campaigns/components/campaign-list.tsx`; associated interaction tests | Existing ad path remains; discoverability does not complete public reports or funnels. |
| DEPENDENCY-PATCH | Preserve reviewed Next patch and dependency policy | Pass, Security evidence | `apps/web/package.json`; `pnpm-lock.yaml`; Security dependency section | Exact source pins retained; Next 16.3.8 remains. Zero production advisories is attributed to independent Security's fresh registry audit. |
| BATCH-SECURITY | Original bounded first batch Security | Pass, inherited | `library/requirements/reports/2026-10-13-completion-batch-security-review.md` | Combined Security separately reviewed this union. |
| BATCH-QUALITY | Original bounded first batch Quality | Pass, inherited | `library/requirements/reports/2026-10-13-completion-batch-quality-review.md` | Does not substitute for this fresh combined review. |
| BATCH-REVIEW-PR | Parent batch current-head CI/PR | Component success, combined gate open | Run 38479866248 at 5eb7fef, as recorded in combined Security | Historical ledger pending wording is not a combined readiness claim. |
| FP-CONTRACT | Freeze CTR-001 revision 1 and preserve legacy v1 | Pass | `library/knowledge/private/contracts/CTR-001-financing-property-media.md`; campaign manifest `:595-647` | Existing calculations and stored v1 hashes stay unchanged. |
| FP-MEDIA | Bounded private JPEG/PNG, normalized hashes, explicit rights and isolation | Pass | `apps/web/src/server/financing-media-http.ts:107`; `financing-media-service.ts:145`; `packages/contracts/src/financing-media.ts` | Rights actor/time derive from server; no public or caller-selected key/URL. |
| FP-PERSIST | Freeze property facts and exact ordered media with saved v2 comparison | Pass | `apps/web/src/server/financing-save.ts`; `financing-verification.ts:25`; campaign manifest `:624-638` | Exact replay and conflicting writes preserve original evidence. |
| FP-OUTPUT | Report, private HTML and actual PDF share saved values and bytes | Pass | `apps/web/src/server/financing-output.ts:26-79`; `financing-output-media.ts:21-37` | Independent real native output/layout tests executed; byte/digest/order mismatch refuses output. |
| FP-LAYOUT | Photo-led responsive layout, long content and four/five scenarios | Pass, bounded | `apps/web/src/server/financing-pdf.ts`; `financing-html.ts`; `financing-output-layout.unit.test.ts` | Independent layout tests passed; prior original PNG/PDF UX inspection remains attributed. No owner visual acceptance invented. |
| FP-REGRESSION | Deterministic accounting, text-only output and mixed-photo history | Pass in source/component CI; combined actual gate open | `financing-context.ts:142-193`; `financing-output-media.ts:12-17`; `financing-v2.unit.test.ts` | Only known media/configuration failures mark that previous photo candidate unavailable. Unexpected exceptions propagate; no synthetic photo substitution. |
| FP-SECURITY | Preserve reviewed media security boundaries | Pass | Combined Security, media/RLS sections | Final financing correction remains in all reviewed pins. |
| FP-QUALITY | Fresh Quality after Security | Pass | This report, strict union/output/history rows | Private subsets qualify; full PAY promises are not inferred. |
| FP-PR | Financing CI and final combined PR qualification | Component success, combined gate open | Run 38485495420 at 6628a10; combined ledger | No merge or hosted R2 qualification by this report. |
| RT-DEADLINE | Bound acquisition while preserving mandatory authentication | Pass | `packages/db/src/postgres-adapter.ts:83-175`; `authenticated-principal.ts:398` | Independent healthy/timeout/close tests passed. Existing 1-30 second configuration bounds retained. |
| RT-CLEANUP | Release late reservation and isolate observer/shutdown failures | Pass | `postgres-adapter.ts:146-177`; `campaign-persistence-runtime.ts`; acquisition/cache tests | Pending callers cancel before driver shutdown. Driver queue cancellation is not claimed. |
| RT-TIMING | Opt-in allowlisted elapsed stages without data/error disclosure | Pass | `apps/web/src/server/runtime-timing.ts:5-82`; authentication/home read wrappers | Exact true opt-in; immutable stage/outcome/elapsed evidence; sink failure cannot change the operation. |
| RT-SECURITY | Preserve privacy and fail-closed principal resolution | Pass | Combined Security; all runtime pins | Earlier shutdown rejection correction retained. |
| RT-QUALITY | Verify source and diagnostic limits after Security | Pass | Independent runtime tests and this report | Connection deadline is not a total request deadline or production root-cause proof. |
| RT-PR | Runtime current-head CI and combined release qualification | Component success, combined gate open | Run 38499455661 at 8e039dc; combined ledger | Corrected terminal returns remain and product-type audit passes independently. |
| RT-LIVE | Hosted signed-in timing and recovered navigation | Open, deliberately unverified | `RUNTIME_DIAGNOSIS_LEDGER.md:16`; live timeout report | No diagnostic setting activated or hosted recovery inferred. |
| HR-STATE | Authenticated enum readiness distinguishes storage/write/valuation/allowance | Pass | `apps/web/src/server/homeowners/readiness.ts:3-35`; `homeowners/http.ts:166` | Unknown state is explicit; no setting identifier or credential in DTO. |
| HR-ACTIONS | Accurate next actions without changing provider/consent/allowance | Pass | `features/homeowners/readiness.ts:3-74`; `workspace.tsx:562-645`, `:717-783` | Cached create remains distinct from a fresh lookup. Saved edits and permitted stopping of schedules stay available. |
| HR-READS | Read saved snapshots/PDF/sharing when new valuation unavailable | Pass | `workspace.tsx:497-506`; `use-home-workspace.ts:285-310`; server read gates | Selected source/UI tests passed; sharing still verifies source dates. |
| HR-DESTINATION | Valuation setup notice offers correct support action | Pass | `features/homeowners/readiness.ts:38-44` | Does not redirect valuation setup to unrelated Meta/HighLevel settings. |
| HR-PROOF | Readiness permutations, recovery, removal and relevant browser proof | Pass locally/component CI; combined gate open | Unit/integration selections; `homeowners/repository.postgres.test.ts:255-429` | Actual six removal races are component-CI evidence, not a local DB execution by Quality. |
| HR-SECURITY | Internal account isolation retained | Pass | Combined Security, homeowner section | Customer role administration removal does not broaden cross-account authority. |
| HR-QUALITY | Owner direction and saved-read safety verified after Security | Pass | This report; `single-lo-owner-direction-2026-10-13.md` | No automatic retention interval or second customer role added. |
| HR-PR | Homeowner current-head CI and combined release qualification | Component success, combined gate open | Run 38501022852 at 4b53122; combined ledger | Prior canonical eight empty-account images retained exactly through integration. |
| LO-CONTACTS | All connected-account contacts, no per-user team matrix | Pass, existing boundary preserved | `apps/web/src/server/homeowners/http.ts`; contact adapter; owner direction | Existing connection/account validation retained; hosted HighLevel visibility not independently exercised here. |
| LO-OWNER | One loan officer can view own balances and add/remove; no second customer role | Pass | `password-authentication-handler.ts:1018-1025`; `campaign-command-context.ts:14-22`; homeowner mutation boundary | Normal signup's location_admin permits both save and approval; separate test actors do not define customer onboarding. |
| LO-ISOLATION | Preserve authentication/connection/budget/consent/revocation | Pass | Principal and transaction context; homeowner service/repository | Internal legacy security test roles remain valid security fixtures. |
| LO-LANGUAGE | Account/support language, no customer team role setup | Pass | `features/homeowners/readiness.ts`; `features/webinar-ads/review.tsx:220`; selected interaction tests | The UI does not require administrator assignment or a different human reviewer. |
| LO-REMOVAL | Confirm report/history/share/schedule removal honestly | Pass | `features/homeowners/workspace.tsx:800`; `homeowners/repository.postgres.test.ts:295-429`; scheduler `:160`, `:244` | Retains usage evidence; cannot recall already started external calls or downloaded copies. |
| LO-EXPORT | Preserve per-report PDF and manual removal, no invented bulk retention policy | Pass | `use-home-workspace.ts:285-310`; owner direction removal/export section | Wider regulatory/audit retention acceptance remains outside this engineering clarification. |
| WA-CONTRACT | Freeze accepted CTR-002 revision 2 and exact evidence seams | Pass | CTR-002; `campaign-foundation.ts:537-592`; application evidence interface | Engineering acceptance grants no creative/lender/provider endorsement. |
| WA-SAVE | Save selected pack, confirmed brand, words, shape and own published destination | Pass | `webinar-ad-prepare.ts:133-319`; `webinar-ad-http.ts:91`; destination adapter | Strict real-workspace request; server-derived actors, brand, source and URL; no browser-provided authority. |
| WA-ART | Two final branded exact rasters with existing disclosures | Pass | `packages/rendering/src/webinar-ad-raster.ts`; server raster wrapper; private art read | Native tests passed; fixed source/fonts/recipe, two bounded shapes. Edited placement words remain distinct from unchanged illustrated lettering. |
| WA-REVIEW | Exact human decision and fresh source/publication/raster checks before replay | Pass | `campaign-approval-command.ts:334-395`; `webinar-ad-evidence.ts:21-71`; server evidence | Decisions cannot reuse stale hashes, incomplete preflight, removed publication or expired schedule. Historical frozen art remains inspectable. |
| WA-JOURNEY | Choose/bind/save/return/review/download and truthful launch state | Pass in source/component proof; combined actual gate open | `tests/browser/review/webinar-ads.spec.ts:119-224`; selected integration tests | At component source, eight actual account-backed journeys and 40 saved screens/downloads are attributed evidence. Launch remains disabled. |
| WA-SECURITY | No unresolved Medium+ in this bounded source | Pass | Exact combined Security report and source pins | Independent source clearance does not certify lender/provider availability. |
| WA-QUALITY | Fresh Quality against contract/criteria after Security | Pass with WQ-02 | This report and independent checks | WQ-01 popup landmark correction remains in shared Select. |
| WA-PR | Final current-head green CI, main reconciliation and MERGEABLE | Open combined gate | Combined ledger and root CI/PR qualification | Canonical workflow writes are not full CI comparison proof; final component CI was pending in consumed Security packet. |
| CTR1-BOUNDS | Two MiB input/output, one frame, 400-6000 dimensions, twelve MP, six ordered photos | Pass | Financing media contract schemas/service; exact bundle verifier | Browser references never imply ownership; decode/normalize/readback integrity retained. |
| CTR1-LIFECYCLE | Exact retry provenance, private bytes, revocation and zero-photo legacy fallback | Pass | Media repository/service; `financing-context.ts:142-193`; `financing-output.ts:20-23` | Metadata attestation is not verified photo ownership. Unavailable nonempty galleries fail honestly. |
| CTR2-PUBLICATION | Narrow creator save/reviewer version proof and immutable destination hash | Pass | `supabase/migrations/20261013230000_webinar_ad_destination.sql`; `webinar-destination.ts`; evidence port | No free-standing other-publisher list/export/revoke right; active older publication does not silently retarget after republish. |
| CTR2-SCHEDULE | Exact UTC effective end, earliest publication/event bound, constrained spend/places | Pass | `webinar-ad-prepare.ts:185-196`, `:246-263`; strict request/manifest | Preparing budget is not paid authorization. Native source remains default-off. |
| CTR2-RETRY | Acyclic deterministic refs/hashes and immutable exact retry/expected-version conflict | Pass | `webinar-ad-prepare.ts:52-130`, `:207-319`; `pending-save.ts:23-57`; preparation component | One bounded request survives uncertainty; 409 retains original request until explicit new-version choice. |
| CTR2-INCOMPLETE | Honest failure after separate preflight transaction, no false readiness | Pass | `webinar-ad-prepare.ts:302-316`; `webinar-ad-read.ts:85-97`; strict read models | Private 503 exposes confirmed opaque references only; exact retry may finish original version. Generic campaign projection does not call orphan metadata ready. |
| CTR2-HISTORICAL | Frozen historical output remains readable; current approval refuses drift | Pass | `webinar-ad-read.ts:123-180`; historical raster loader; current evidence `:25-35` | Current registry check stays on preparation/approval; historical download checks retained frozen assets/digests. |
| CTR2-PACKAGING | Fixed-font/assets and native renderer reachable in server traces | Pass, packaging scope | `apps/web/next.config.ts:41-68`; `runtime-packaging.test.ts` | Independent 13-case packaging selection executed. Hosted function execution is a separate qualification. |
| NG-PROVIDER | No live activation, ad spend, customer messages or manufactured read-back | Pass | Strict webinar meta enabled false; disabled launch control; provider-default-off tests | Future provider consumer remains unfinished and must honor current material checks immediately before requests. |
| NG-PUBLIC | No completed public co-branded property page/QR/domain/sealed approval claim | Pass | CTR-001 scope; private output routes; completion outcome table | Private photo reports are bounded PAY subsets, not the finished ListReports-style outcome. |
| NG-VALUATIONS | No licensed AVM/monthly/HighLevel hosted success claim | Pass | Readiness enum/notices and component ledgers | Configuration/readiness is not a successful real valuation or delivery. |
| NG-OWNER | No owner/lender creative acceptance or actual media rights inferred from fixtures | Pass | Both accepted contract scope sections; current review copy | Synthetic images/account journeys prove implementation only. |
| NG-LEGACY | Do not reopen historical gates or reinterpret rejected funnel designs as approved | Pass, preserved | Existing PRD-010 owner correction; unchanged old readers and release records | Integration touches only the assigned increments. |
| NG-RETENTION | No role-management product, bulk export or automatic retention interval invented | Pass | Single-LO owner direction; homeowner controls | Authentication and tenant isolation remain enforced. |

### Independent verification

All commands ran serially with two workers where appropriate. No assertion, timeout, test configuration, coverage threshold or baseline was relaxed.

| Check | Result | Retained ignored evidence |
| --- | --- | --- |
| Consequential source hash comparison | 45 of 45 exact Security SHA-256 values match | `test-results/quality-integration/source-pins.json` |
| Incoming source/evidence ancestry | All six heads are ancestors of frozen integration head | Reproduced `git merge-base --is-ancestor` checks; heads in integration ledger |
| Final Library original provenance | Exactly 24 accepted integration working blobs match d050 Git objects | `test-results/quality-integration/canonical-provenance.json` |
| Combined unit seams | 14 files, 215 cases, 22.58 seconds, exit 0 | `focused-unit.log` |
| Combined customer interactions | Seven files, 74 cases, 56.13 seconds, exit 0 | `focused-integration.log` |
| Package boundaries and negative fixture | 16 packages; fixture rejects both forbidden edges, exit 0 | `boundaries.log` |
| Product types | No explicit any, CommonJS require or swallowed catch, exit 0 | `product-types.log` |
| Web TypeScript | Passed, exit 0 | `web-typecheck.log` |
| Diff hygiene | `git diff --check` passed; no unmerged paths or source mutation | Git checks at entry and release |

The unit selection executed native output/layout and deterministic renderer tests as well as webinar foundation and packaging, PostgreSQL acquisition/cache, campaign workspace reads, financing v2 history, homeowner readiness/scheduler/service/handoff, runtime diagnostics and both merged message assertion groups. The interaction selection executed webinar preparation/review, financing form/photo intake and homeowner readiness/report/refusal actions. The 289-case reviewer total overlaps the integration owner's broader suites and Security selections; it must not be added to the 4,220-case broad result.

The integration owner's retained broad run is 292 files with 4,220 passing cases and one pre-existing skip, 231.67 seconds. The sequential unit coverage run passed all 3,100 cases across 207 files with the existing thresholds unchanged: statements 88.87%, branches 85%, functions 91.59% and lines 89.85%. Quality independently inspected these retained summaries. Four earlier concurrent five-second timeouts remain in the original failed log; the serial retry passed those cases, without changing source or timeout settings. They are not erased or reclassified as an original pass.

The first reviewer provenance command used an incorrect baseline directory and returned zero candidates. It supplied no image clearance. The corrected explicit `tests/visual/screens/review` command required exactly 24 paths and verified each against d050 Git objects before credit. No image was modified. Fresh exhaustive visual inspection is not claimed; the independent feature UX, Security and Quality artifact inspections remain their attributed evidence.

Component CI successes cited in the consumed combined Security packet are parent run 38479866248 at 5eb7fef, financing 38485495420 at 6628a10, runtime 38499455661 at 8e039dc and homeowner 38501022852 at 4b53122. Canonical 38498933268 at 679ce978 passed both jobs. The prior webinar source run passed the 28 new pgTAP assertions, 306 PostgreSQL cases and eight saved journeys but failed other comparison/coverage stages; this remains a failed aggregate run. Final webinar 38504191342 at d050 was in progress in the consumed packet. These statuses are attributed, not new network inspections by this reviewer, and no component success certifies the combined actual database/browser gate.

### Released frozen pins and limitations

The source head remains c625cff; Security's exact report hash and all 45 raw source hashes still match at handoff. The four combined conflict hashes are unchanged: CI `90e889244ac6b10953a57bd954f82db8e9a7cf19e55f9b077458c9cf82bfd926`, message assertions `61d771d54c36af0570ab4b8acaadb5a414fd065ee157d5fb5751da9a715a62db`, workspace reads `8b0493190294d603ccb72decce51a6518433cd81bb2565f16b16b75639b4a135`, and campaign manifest union `77c33427c0f874a05f5ac98e4b8f106fb2f3ab779b7e54cf77cf98cabbb2d9b6`. A report-only commit can preserve this source clearance if the pinned bytes remain unchanged.

This reviewer did not run actual PostgreSQL, pgTAP or a new production browser server, inspect a real customer's report, activate diagnostics, apply migrations or qualify hosted private storage. No full-product completion, current-main fetch/mergeability, combined green CI, external delivery, photo rights, licensed data, custom-domain publication or live spend is asserted. The orchestrator owns the next concrete release gates and any resulting corrective review cycle.

## Files Changed

The only file authored by this Quality task is this report. The following complete frozen implementation inventory is generated from `git diff --name-status 728d5f0eb463bbf6abfe2519470fa536c022fa15...c625cff10ab569477859f5fd1adaf1b4d13d16eb`; it contains all 380 tracked paths, including the inherited approved baseline sets, exact original media, feature reports and bounded source/tests. The pre-existing untracked combined Security report is separately consumed as audit input and is not part of that committed diff.

- `.github/workflows/ci.yml` (M): Retain general and webinar evidence artifacts while preserving CI verification gates.
- `COMPLETION_INTEGRATION_LEDGER.md` (A): Scoped requirements, engineering agreement or attributed verification record: COMPLETION INTEGRATION LEDGER.
- `COMPLETION_LEDGER.md` (A): Scoped requirements, engineering agreement or attributed verification record: COMPLETION LEDGER.
- `FINANCING_PHOTOS_LEDGER.md` (A): Scoped requirements, engineering agreement or attributed verification record: FINANCING PHOTOS LEDGER.
- `HOMEOWNER_READINESS_LEDGER.md` (A): Scoped requirements, engineering agreement or attributed verification record: HOMEOWNER READINESS LEDGER.
- `RUNTIME_DIAGNOSIS_LEDGER.md` (A): Scoped requirements, engineering agreement or attributed verification record: RUNTIME DIAGNOSIS LEDGER.
- `WEBINAR_LAUNCH_LEDGER.md` (A): Scoped requirements, engineering agreement or attributed verification record: WEBINAR LAUNCH LEDGER.
- `apps/web/next.config.ts` (M): Bounded reviewed implementation integration for next config.
- `apps/web/package.json` (M): Reviewed framework patch or existing pinned native-renderer dependency declaration.
- `apps/web/public/fonts/webinar/AutomatedLOWebinarInter.ttf` (A): Pinned native raster font, glyph inventory or preserved font license.
- `apps/web/public/fonts/webinar/README.md` (A): Pinned native raster font, glyph inventory or preserved font license.
- `apps/web/public/fonts/webinar/derive-font.py` (A): Pinned native raster font, glyph inventory or preserved font license.
- `apps/web/public/fonts/webinar/glyph-ranges.json` (A): Pinned native raster font, glyph inventory or preserved font license.
- `apps/web/public/webinar-ads/webinar-before-home-search/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-before-home-search/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-budget-beyond-price/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-budget-beyond-price/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-budget-your-life/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-budget-your-life/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-cash-to-close/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-cash-to-close/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-closing-checklist/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-closing-checklist/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-credit-next-step/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-credit-next-step/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-credit-preparation/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-credit-preparation/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-credit-questions/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-credit-questions/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-first-home-plan/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-first-home-plan/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-offer-to-keys/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-offer-to-keys/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-paperwork-path/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-paperwork-path/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-path-to-closing/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-path-to-closing/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-preapproval-explained/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-preapproval-explained/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-questions-first/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-questions-first/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/public/webinar-ads/webinar-renting-next-chapter/v1/square.png` (A): Bounded reviewed implementation integration for square.
- `apps/web/public/webinar-ads/webinar-renting-next-chapter/v1/tall.png` (A): Bounded reviewed implementation integration for tall.
- `apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/campaign-route.tsx` (M): Feature page or authenticated HTTP route integration: campaign route.
- `apps/web/src/app/(authenticated)/marketing/campaigns/campaigns-list.integration.test.tsx` (M): Behavioral regression or artifact qualification for campaigns list integration test.
- `apps/web/src/app/(authenticated)/marketing/campaigns/library/ads-library-page.integration.test.tsx` (M): Behavioral regression or artifact qualification for ads library page integration test.
- `apps/web/src/app/(authenticated)/marketing/campaigns/library/ads-library-screen.tsx` (M): Feature page or authenticated HTTP route integration: ads library screen.
- `apps/web/src/app/(authenticated)/marketing/campaigns/webinar/error.tsx` (A): Feature page or authenticated HTTP route integration: error.
- `apps/web/src/app/(authenticated)/marketing/campaigns/webinar/loading.tsx` (A): Feature page or authenticated HTTP route integration: loading.
- `apps/web/src/app/(authenticated)/marketing/campaigns/webinar/page.tsx` (A): Feature page or authenticated HTTP route integration: page.
- `apps/web/src/app/api/campaigns/property/financing/media/[mediaRef]/revoke/route.ts` (A): Feature page or authenticated HTTP route integration: route.
- `apps/web/src/app/api/campaigns/property/financing/media/[mediaRef]/route.ts` (A): Feature page or authenticated HTTP route integration: route.
- `apps/web/src/app/api/campaigns/property/financing/media/route.ts` (A): Feature page or authenticated HTTP route integration: route.
- `apps/web/src/app/api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]/[shape]/route.ts` (A): Feature page or authenticated HTTP route integration: route.
- `apps/web/src/app/api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]/route.ts` (A): Feature page or authenticated HTTP route integration: route.
- `apps/web/src/app/api/campaigns/webinar-ads/context/route.ts` (A): Feature page or authenticated HTTP route integration: route.
- `apps/web/src/app/api/campaigns/webinar-ads/route.ts` (A): Feature page or authenticated HTTP route integration: route.
- `apps/web/src/copy/campaign-image-messages.unit.test.ts` (M): Behavioral regression or artifact qualification for campaign image messages unit test.
- `apps/web/src/copy/financing-messages.ts` (M): Bounded reviewed implementation integration for financing messages.
- `apps/web/src/copy/launch-messages.ts` (M): Bounded reviewed implementation integration for launch messages.
- `apps/web/src/features/campaigns/campaign-page-model.ts` (M): Customer preparation, frozen review, report input or capability presentation: campaign page model.
- `apps/web/src/features/campaigns/components/ad-creative.module.css` (M): Governed responsive layout and disclosure styling for ad creative module.
- `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx` (M): Customer preparation, frozen review, report input or capability presentation: campaign approval controls.
- `apps/web/src/features/campaigns/components/campaign-list.module.css` (M): Governed responsive layout and disclosure styling for campaign list module.
- `apps/web/src/features/campaigns/components/campaign-list.tsx` (M): Customer preparation, frozen review, report input or capability presentation: campaign list.
- `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx` (M): Customer preparation, frozen review, report input or capability presentation: persisted campaign screen.
- `apps/web/src/features/campaigns/launch-model.ts` (M): Customer preparation, frozen review, report input or capability presentation: launch model.
- `apps/web/src/features/campaigns/launch-model.unit.test.ts` (M): Behavioral regression or artifact qualification for launch model unit test.
- `apps/web/src/features/dashboard-preview/shared-select.integration.test.tsx` (M): Behavioral regression or artifact qualification for shared select integration test.
- `apps/web/src/features/financing/financing.module.css` (M): Governed responsive layout and disclosure styling for financing module.
- `apps/web/src/features/financing/form-model.ts` (M): Customer preparation, frozen review, report input or capability presentation: form model.
- `apps/web/src/features/financing/form-model.unit.test.ts` (M): Behavioral regression or artifact qualification for form model unit test.
- `apps/web/src/features/financing/form.integration.test.tsx` (M): Behavioral regression or artifact qualification for form integration test.
- `apps/web/src/features/financing/form.tsx` (M): Customer preparation, frozen review, report input or capability presentation: form.
- `apps/web/src/features/financing/media-input.integration.test.tsx` (A): Behavioral regression or artifact qualification for media input integration test.
- `apps/web/src/features/financing/media-input.tsx` (A): Customer preparation, frozen review, report input or capability presentation: media input.
- `apps/web/src/features/financing/media-upload.ts` (A): Customer preparation, frozen review, report input or capability presentation: media upload.
- `apps/web/src/features/financing/model.ts` (M): Customer preparation, frozen review, report input or capability presentation: model.
- `apps/web/src/features/financing/property-display.ts` (A): Customer preparation, frozen review, report input or capability presentation: property display.
- `apps/web/src/features/financing/report.tsx` (M): Customer preparation, frozen review, report input or capability presentation: report.
- `apps/web/src/features/homeowners/builder.tsx` (M): Customer preparation, frozen review, report input or capability presentation: builder.
- `apps/web/src/features/homeowners/home-workspace.test-support.ts` (M): Customer preparation, frozen review, report input or capability presentation: home workspace test support.
- `apps/web/src/features/homeowners/homeowners.module.css` (M): Governed responsive layout and disclosure styling for homeowners module.
- `apps/web/src/features/homeowners/readiness.integration.test.tsx` (A): Behavioral regression or artifact qualification for readiness integration test.
- `apps/web/src/features/homeowners/readiness.ts` (A): Customer preparation, frozen review, report input or capability presentation: readiness.
- `apps/web/src/features/homeowners/refusal-messages.integration.test.tsx` (M): Behavioral regression or artifact qualification for refusal messages integration test.
- `apps/web/src/features/homeowners/report-actions.integration.test.tsx` (M): Behavioral regression or artifact qualification for report actions integration test.
- `apps/web/src/features/homeowners/use-home-workspace.ts` (M): Customer preparation, frozen review, report input or capability presentation: use home workspace.
- `apps/web/src/features/homeowners/workspace.tsx` (M): Customer preparation, frozen review, report input or capability presentation: workspace.
- `apps/web/src/features/http/user-messages.ts` (M): Customer preparation, frozen review, report input or capability presentation: user messages.
- `apps/web/src/features/http/user-messages.unit.test.ts` (M): Behavioral regression or artifact qualification for user messages unit test.
- `apps/web/src/features/webinar-ads/README.md` (A): Scoped requirements, engineering agreement or attributed verification record: README.
- `apps/web/src/features/webinar-ads/catalog.json` (A): Customer preparation, frozen review, report input or capability presentation: catalog.
- `apps/web/src/features/webinar-ads/catalog.ts` (A): Customer preparation, frozen review, report input or capability presentation: catalog.
- `apps/web/src/features/webinar-ads/creative-briefs.json` (A): Customer preparation, frozen review, report input or capability presentation: creative briefs.
- `apps/web/src/features/webinar-ads/model.ts` (A): Customer preparation, frozen review, report input or capability presentation: model.
- `apps/web/src/features/webinar-ads/model.unit.test.ts` (A): Behavioral regression or artifact qualification for model unit test.
- `apps/web/src/features/webinar-ads/pack.integration.test.tsx` (A): Behavioral regression or artifact qualification for pack integration test.
- `apps/web/src/features/webinar-ads/pack.module.css` (A): Governed responsive layout and disclosure styling for pack module.
- `apps/web/src/features/webinar-ads/pack.tsx` (A): Customer preparation, frozen review, report input or capability presentation: pack.
- `apps/web/src/features/webinar-ads/pending-save.ts` (A): Customer preparation, frozen review, report input or capability presentation: pending save.
- `apps/web/src/features/webinar-ads/pending-save.unit.test.ts` (A): Behavioral regression or artifact qualification for pending save unit test.
- `apps/web/src/features/webinar-ads/preparation-model.ts` (A): Customer preparation, frozen review, report input or capability presentation: preparation model.
- `apps/web/src/features/webinar-ads/preparation-model.unit.test.ts` (A): Behavioral regression or artifact qualification for preparation model unit test.
- `apps/web/src/features/webinar-ads/preparation.integration.test.tsx` (A): Behavioral regression or artifact qualification for preparation integration test.
- `apps/web/src/features/webinar-ads/preparation.module.css` (A): Governed responsive layout and disclosure styling for preparation module.
- `apps/web/src/features/webinar-ads/preparation.test-support.ts` (A): Customer preparation, frozen review, report input or capability presentation: preparation test support.
- `apps/web/src/features/webinar-ads/preparation.tsx` (A): Customer preparation, frozen review, report input or capability presentation: preparation.
- `apps/web/src/features/webinar-ads/review.integration.test.tsx` (A): Behavioral regression or artifact qualification for review integration test.
- `apps/web/src/features/webinar-ads/review.test-support.ts` (A): Customer preparation, frozen review, report input or capability presentation: review test support.
- `apps/web/src/features/webinar-ads/review.tsx` (A): Customer preparation, frozen review, report input or capability presentation: review.
- `apps/web/src/server/ad-brand-read.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: ad brand read.
- `apps/web/src/server/authenticated-principal.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: authenticated principal.
- `apps/web/src/server/campaign-approval-handler.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: campaign approval handler.
- `apps/web/src/server/campaign-page-data.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: campaign page data.
- `apps/web/src/server/campaign-persistence-runtime.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: campaign persistence runtime.
- `apps/web/src/server/campaign-persistence-runtime.unit.test.ts` (M): Behavioral regression or artifact qualification for campaign persistence runtime unit test.
- `apps/web/src/server/campaign-workspace-reads.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: campaign workspace reads.
- `apps/web/src/server/financing-context.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: financing context.
- `apps/web/src/server/financing-html.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: financing html.
- `apps/web/src/server/financing-http.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: financing http.
- `apps/web/src/server/financing-media-http.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: financing media http.
- `apps/web/src/server/financing-media-runtime.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: financing media runtime.
- `apps/web/src/server/financing-media-service.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: financing media service.
- `apps/web/src/server/financing-media.postgres.test.ts` (A): Behavioral regression or artifact qualification for financing media postgres test.
- `apps/web/src/server/financing-media.unit.test.ts` (A): Behavioral regression or artifact qualification for financing media unit test.
- `apps/web/src/server/financing-output-layout.unit.test.ts` (A): Behavioral regression or artifact qualification for financing output layout unit test.
- `apps/web/src/server/financing-output-media.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: financing output media.
- `apps/web/src/server/financing-output.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: financing output.
- `apps/web/src/server/financing-pdf.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: financing pdf.
- `apps/web/src/server/financing-save.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: financing save.
- `apps/web/src/server/financing-v2.unit.test.ts` (A): Behavioral regression or artifact qualification for financing v2 unit test.
- `apps/web/src/server/financing-verification.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: financing verification.
- `apps/web/src/server/financing.postgres.test.ts` (M): Behavioral regression or artifact qualification for financing postgres test.
- `apps/web/src/server/home-reads.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: home reads.
- `apps/web/src/server/homeowners/http.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: http.
- `apps/web/src/server/homeowners/readiness.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: readiness.
- `apps/web/src/server/homeowners/readiness.unit.test.ts` (A): Behavioral regression or artifact qualification for readiness unit test.
- `apps/web/src/server/homeowners/repository.postgres.test.ts` (M): Behavioral regression or artifact qualification for repository postgres test.
- `apps/web/src/server/homeowners/routes.postgres.test.ts` (M): Behavioral regression or artifact qualification for routes postgres test.
- `apps/web/src/server/homeowners/runtime.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: runtime.
- `apps/web/src/server/homeowners/scheduler.unit.test.ts` (M): Behavioral regression or artifact qualification for scheduler unit test.
- `apps/web/src/server/homeowners/service.unit.test.ts` (M): Behavioral regression or artifact qualification for service unit test.
- `apps/web/src/server/homeowners/settings-faults.unit.test.ts` (M): Behavioral regression or artifact qualification for settings faults unit test.
- `apps/web/src/server/runtime-authentication.ts` (M): Authenticated feature composition, exact read/output or readiness boundary: runtime authentication.
- `apps/web/src/server/runtime-authentication.unit.test.ts` (M): Behavioral regression or artifact qualification for runtime authentication unit test.
- `apps/web/src/server/runtime-timing.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: runtime timing.
- `apps/web/src/server/runtime-timing.unit.test.ts` (A): Behavioral regression or artifact qualification for runtime timing unit test.
- `apps/web/src/server/webinar-ad-art.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: webinar ad art.
- `apps/web/src/server/webinar-ad-evidence.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: webinar ad evidence.
- `apps/web/src/server/webinar-ad-evidence.unit.test.ts` (A): Behavioral regression or artifact qualification for webinar ad evidence unit test.
- `apps/web/src/server/webinar-ad-http.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: webinar ad http.
- `apps/web/src/server/webinar-ad-prepare.postgres.test.ts` (A): Behavioral regression or artifact qualification for webinar ad prepare postgres test.
- `apps/web/src/server/webinar-ad-prepare.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: webinar ad prepare.
- `apps/web/src/server/webinar-ad-prepare.unit.test.ts` (A): Behavioral regression or artifact qualification for webinar ad prepare unit test.
- `apps/web/src/server/webinar-ad-raster.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: webinar ad raster.
- `apps/web/src/server/webinar-ad-read.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: webinar ad read.
- `apps/web/src/server/webinar-ad-read.unit.test.ts` (A): Behavioral regression or artifact qualification for webinar ad read unit test.
- `apps/web/src/server/webinar-ad.test-support.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: webinar ad test support.
- `apps/web/src/server/webinar-destination.postgres.test.ts` (A): Behavioral regression or artifact qualification for webinar destination postgres test.
- `apps/web/src/server/webinar-destination.ts` (A): Authenticated feature composition, exact read/output or readiness boundary: webinar destination.
- `apps/web/src/server/webinar-destination.unit.test.ts` (A): Behavioral regression or artifact qualification for webinar destination unit test.
- `library/README.md` (M): Scoped requirements, engineering agreement or attributed verification record: README.
- `library/knowledge/private/contracts/CTR-001-financing-property-media.md` (A): Scoped requirements, engineering agreement or attributed verification record: CTR 001 financing property media.
- `library/knowledge/private/contracts/CTR-002-webinar-ad-destination.md` (A): Scoped requirements, engineering agreement or attributed verification record: CTR 002 webinar ad destination.
- `library/knowledge/private/product/completion-next-waves-2026-10-13.md` (A): Scoped requirements, engineering agreement or attributed verification record: completion next waves 2026 10 13.
- `library/knowledge/private/product/completion-review-2026-10-13.md` (A): Scoped requirements, engineering agreement or attributed verification record: completion review 2026 10 13.
- `library/knowledge/private/product/project-map.md` (M): Scoped requirements, engineering agreement or attributed verification record: project map.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-quality-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 readiness quality review.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-security-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 readiness security review.
- `library/requirements/in-work/prd-007-homeowner-reports/reports/2026-10-13-readiness-ux-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 readiness ux review.
- `library/requirements/in-work/prd-007-homeowner-reports/single-lo-owner-direction-2026-10-13.md` (A): Scoped requirements, engineering agreement or attributed verification record: single lo owner direction 2026 10 13.
- `library/requirements/in-work/prd-010-campaign-recovery/financing-media-contract.md` (A): Scoped requirements, engineering agreement or attributed verification record: financing media contract.
- `library/requirements/in-work/prd-010-campaign-recovery/financing-report-increment.md` (M): Scoped requirements, engineering agreement or attributed verification record: financing report increment.
- `library/requirements/in-work/prd-010-campaign-recovery/payment-flyers-and-co-branded-sites.md` (M): Scoped requirements, engineering agreement or attributed verification record: payment flyers and co branded sites.
- `library/requirements/in-work/prd-010-campaign-recovery/prd-010-campaign-recovery-index.md` (M): Scoped requirements, engineering agreement or attributed verification record: prd 010 campaign recovery index.
- `library/requirements/in-work/prd-010-campaign-recovery/reference-funnel-release.md` (M): Scoped requirements, engineering agreement or attributed verification record: reference funnel release.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-financing-media-ci-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 financing media ci review.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-financing-photos-quality-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 financing photos quality review.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-financing-photos-security-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 financing photos security review.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-financing-photos-ux-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 financing photos ux review.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-webinar-canonical-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 webinar canonical review.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-webinar-launch-quality-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 webinar launch quality review.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-webinar-launch-security-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 webinar launch security review.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-webinar-launch-ux-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 webinar launch ux review.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-webinar-regression-corrections.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 webinar regression corrections.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-webinar-runtime-packaging-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 webinar runtime packaging review.
- `library/requirements/reports/2026-10-13-completion-batch-dependency-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 completion batch dependency review.
- `library/requirements/reports/2026-10-13-completion-batch-quality-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 completion batch quality review.
- `library/requirements/reports/2026-10-13-completion-batch-security-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 completion batch security review.
- `library/requirements/reports/2026-10-13-completion-batch-ux-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 completion batch ux review.
- `library/requirements/reports/2026-10-13-live-library-timeout-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 live library timeout review.
- `library/requirements/reports/2026-10-13-runtime-acquisition-implementation.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 runtime acquisition implementation.
- `library/requirements/reports/2026-10-13-runtime-acquisition-quality-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 runtime acquisition quality review.
- `library/requirements/reports/2026-10-13-runtime-acquisition-security-review.md` (A): Scoped requirements, engineering agreement or attributed verification record: 2026 10 13 runtime acquisition security review.
- `packages/application/src/campaign-approval-command.ts` (M): Version, material evidence, preflight or human decision rules: campaign approval command.
- `packages/application/src/campaign-foundation.ts` (M): Version, material evidence, preflight or human decision rules: campaign foundation.
- `packages/application/src/financing-media.ts` (A): Version, material evidence, preflight or human decision rules: financing media.
- `packages/application/src/index.ts` (M): Version, material evidence, preflight or human decision rules: index.
- `packages/application/src/webinar-ad-evidence.ts` (A): Version, material evidence, preflight or human decision rules: webinar ad evidence.
- `packages/contracts/src/campaign-foundation.ts` (M): Strict additive transport or immutable snapshot boundary: campaign foundation.
- `packages/contracts/src/financing-media.ts` (A): Strict additive transport or immutable snapshot boundary: financing media.
- `packages/contracts/src/homeowner-reports.ts` (M): Strict additive transport or immutable snapshot boundary: homeowner reports.
- `packages/contracts/src/index.ts` (M): Strict additive transport or immutable snapshot boundary: index.
- `packages/db/src/financing-media-repository.ts` (A): Principal-bound persistence, publication capability or reservation cleanup: financing media repository.
- `packages/db/src/index.ts` (M): Principal-bound persistence, publication capability or reservation cleanup: index.
- `packages/db/src/postgres-adapter.ts` (M): Principal-bound persistence, publication capability or reservation cleanup: postgres adapter.
- `packages/db/src/webinar-publication-repository.ts` (A): Principal-bound persistence, publication capability or reservation cleanup: webinar publication repository.
- `packages/db/test/webinar-publication-repository.test.mjs` (A): Behavioral regression or artifact qualification for webinar publication repository test.
- `packages/domain/src/campaign-foundation.ts` (M): Version, material evidence, preflight or human decision rules: campaign foundation.
- `packages/domain/src/index.ts` (M): Version, material evidence, preflight or human decision rules: index.
- `packages/domain/src/library-ad-ruleset.ts` (M): Version, material evidence, preflight or human decision rules: library ad ruleset.
- `packages/domain/src/webinar-ad-rule-codes.ts` (A): Version, material evidence, preflight or human decision rules: webinar ad rule codes.
- `packages/domain/src/webinar-ad-ruleset.ts` (A): Version, material evidence, preflight or human decision rules: webinar ad ruleset.
- `packages/rendering/src/index.ts` (M): Deterministic fixed-font branded PNG renderer or export: index.
- `packages/rendering/src/webinar-ad-raster.ts` (A): Deterministic fixed-font branded PNG renderer or export: webinar ad raster.
- `packages/storage/src/financing-media-storage.ts` (A): Private bounded immutable photo bytes or export: financing media storage.
- `packages/storage/src/index.ts` (M): Private bounded immutable photo bytes or export: index.
- `packages/storage/src/r2-object-store-client.ts` (M): Private bounded immutable photo bytes or export: r2 object store client.
- `packages/ui/src/components/Select.tsx` (M): Bounded reviewed implementation integration for Select.
- `pnpm-lock.yaml` (M): Reviewed framework patch or existing pinned native-renderer dependency declaration.
- `supabase/migrations/20261013210000_financing_media.sql` (A): Reserved additive private media or version-scoped publication capability.
- `supabase/migrations/20261013230000_webinar_ad_destination.sql` (A): Reserved additive private media or version-scoped publication capability.
- `supabase/tests/financing_media.pgtap.sql` (A): Actual database authorization or schema assertions for financing media pgtap.
- `supabase/tests/phase0_scaffold.pgtap.sql` (M): Actual database authorization or schema assertions for phase0 scaffold pgtap.
- `supabase/tests/webinar_ad_destination.pgtap.sql` (A): Actual database authorization or schema assertions for webinar ad destination pgtap.
- `tests/browser/ads-library.spec.ts` (M): Behavioral regression or artifact qualification for ads library spec.
- `tests/browser/financing-media.spec.ts` (A): Behavioral regression or artifact qualification for financing media spec.
- `tests/browser/financing-photos.spec.ts` (A): Behavioral regression or artifact qualification for financing photos spec.
- `tests/browser/financing-report.spec.ts` (M): Behavioral regression or artifact qualification for financing report spec.
- `tests/browser/helpers/design-quality.ts` (M): Bounded reviewed implementation integration for design quality.
- `tests/browser/review/homeowner-readiness.spec.ts` (A): Behavioral regression or artifact qualification for homeowner readiness spec.
- `tests/browser/review/webinar-ads.spec.ts` (A): Behavioral regression or artifact qualification for webinar ads spec.
- `tests/browser/screenshot-date-stability.spec.ts` (M): Behavioral regression or artifact qualification for screenshot date stability spec.
- `tests/browser/webinar-ads.spec.ts` (A): Behavioral regression or artifact qualification for webinar ads spec.
- `tests/browser/webinar-preparation.spec.ts` (A): Behavioral regression or artifact qualification for webinar preparation spec.
- `tests/security/provider-side-effect-default-off.test.ts` (M): Behavioral regression or artifact qualification for provider side effect default off test.
- `tests/visual/screens/chromium/campaign-detail--permission-restricted--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaign-detail--permission-restricted--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaign-detail--permission-restricted--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaign-detail--permission-restricted--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaign-detail--permission-restricted--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaign-detail--permission-restricted--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaign-detail--permission-restricted--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaign-detail--permission-restricted--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--empty--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--empty--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--empty--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--empty--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--empty--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--empty--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--empty--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--empty--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--populated--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--populated--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--populated--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--populated--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--populated--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--populated--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--populated--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/chromium/campaigns--populated--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--all--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--all--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--all--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--all--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--all--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--all--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--all--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--all--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--one-topic--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--one-topic--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--one-topic--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--one-topic--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--one-topic--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--one-topic--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--one-topic--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--one-topic--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--real-catalog--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--real-catalog--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--real-catalog--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--real-catalog--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--real-catalog--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--real-catalog--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--real-catalog--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/ads-library--real-catalog--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--already-decided--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--already-decided--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--already-decided--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--already-decided--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--already-decided--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--already-decided--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--already-decided--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--already-decided--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--approved--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--approved--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--approved--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--approved--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--approved--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--approved--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--approved--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--approved--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--ready--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--ready--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--ready--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--ready--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--ready--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--ready--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--ready--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-detail--ready--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--ad-retired--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--ad-retired--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--ad-retired--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--ad-retired--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--ad-retired--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--ad-retired--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--ad-retired--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--ad-retired--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--approved--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--approved--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--approved--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--approved--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--approved--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--approved--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--approved--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--approved--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--library-notice--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--library-notice--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--library-notice--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--library-notice--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--library-notice--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--library-notice--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--library-notice--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--library-notice--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--newer-version--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--newer-version--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--newer-version--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--newer-version--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--newer-version--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--newer-version--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--newer-version--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--newer-version--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--sent-back--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--sent-back--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--sent-back--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--sent-back--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--sent-back--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--sent-back--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--sent-back--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaign-page--sent-back--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--all-states--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--all-states--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--all-states--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--all-states--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--all-states--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--all-states--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--all-states--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--all-states--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--empty-account--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--empty-account--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--empty-account--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--empty-account--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--empty-account--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--empty-account--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--empty-account--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/campaigns--empty-account--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/homeowners--empty-account--1180--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/homeowners--empty-account--1180--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/homeowners--empty-account--1440--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/homeowners--empty-account--1440--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/homeowners--empty-account--390--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/homeowners--empty-account--390--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/homeowners--empty-account--768--dark.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tests/visual/screens/review/homeowners--empty-account--768--light.png` (M): Exact reviewed whole canonical capture for the named state, size and theme.
- `tooling/scripts/ads-library/generate-webinar-art.mjs` (A): Bounded reviewed implementation integration for generate webinar art.
- `tooling/tests/unit/postgres-acquisition.test.ts` (A): Behavioral regression or artifact qualification for postgres acquisition test.
- `tooling/tests/unit/production-foundation/financing-media-r2.test.ts` (A): Behavioral regression or artifact qualification for financing media r2 test.
- `tooling/tests/unit/webinar-ads/runtime-packaging.test.ts` (A): Behavioral regression or artifact qualification for runtime packaging test.
- `tooling/tests/unit/webinar-ads/webinar-foundation-fixtures.ts` (A): Bounded reviewed implementation integration for webinar foundation fixtures.
- `tooling/tests/unit/webinar-ads/webinar-foundation.test.ts` (A): Behavioral regression or artifact qualification for webinar foundation test.
- `tooling/tests/unit/webinar-ads/webinar-raster.test.ts` (A): Behavioral regression or artifact qualification for webinar raster test.
