# QA Report: private financing photographs

**Plan document:** `FINANCING_PHOTOS_LEDGER.md`, with Accepted CTR-001 revision 1 and its PRD-010 PAY subset pointers
**Audit date:** 2026-10-13
**Base branch:** `origin/main`, reviewed base `728d5f0eb463bbf6abfe2519470fa536c022fa15`
**Head:** `codex/financing-photos`, uncommitted implementation at the same HEAD
**Auditor:** fresh independent quality-guardian, report-only ownership

## Summary

Conditional review: bounded source clearance is withheld for FP-QA-01, the connected-account text-only v2 read dependency described below. The inspected private media/snapshot/photo-output implementation and 100 independently executed focused tests support the other bounded behavior, but actual PostgreSQL and PR/CI gates remain open. The orchestrator accepted FP-QA-01 as a blocking bounded fix; fresh Security followed by Quality must review that fix before closing the increment.

The exact accepted contract hash is `18e074952d88c069675ceda1e9f12e0fa4737a3cd268f564861c303b477a572e`, independently verified. Its engineering acceptance is distinct from runtime conformance, owner visual acceptance, lender approval and public release. The host AGENTS, terrain map, product map, PRD-010 index, financing increment, PAY requirements and contract pointer were read. The sibling canonical Weapon was absent in this worktree; the installed native Weapon and host snapshot were read. Read-only virtual memory recall was unavailable; no memory was written.

Ordering was correct at entry: the final independent Security report and input/test addendum reported no unresolved Medium-or-higher issue, and independent UX cleared its bounded final input/report/site/PDF presentation. Source pins for media service/runtime, PDF, CSS and final input/messages/output tests matched Security at entry. The subsequently assigned FP-QA-01 repair is outside this snapshot and cannot inherit that clearance automatically. No implementation, test, CSS, baseline, ledger or another reviewer report was edited by this reviewer.

## Scorecard

| Category     | Status | Notes                                                                                                                            |
| ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Completeness | ⚠️     | Private photograph path is implemented; zero-photo connected reads need repair and PG/CI execution remains open.                 |
| Correctness  | ⚠️     | Normalized bytes, ordered snapshots, saved arithmetic and legacy hashes passed; FP-QA-01 is a concrete configuration dependency. |
| Alignment    | ✅     | Frozen versioned contract, existing persistence/storage/UI boundaries and private-only scope retained.                           |
| Gaps         | ⚠️     | PostgreSQL/pgTAP and current PR/CI/mergeability proof are pending.                                                               |
| Detrimental  | ⚠️     | No tested financial or legacy-byte regression; all new UI saves are v2, making FP-QA-01 relevant to text-only users.             |

## Critical Issues (must fix)

None classified Critical in this snapshot. The orchestrator explicitly treats Warning FP-QA-01 as blocking this increment's source clearance.

## Warnings (should fix)

- [ ] **FP-QA-01: empty-gallery v2 reads eagerly require R2 media configuration**. `apps/web/src/server/financing-output.ts:29-34`, `:51-56`; `apps/web/src/server/campaign-workspace-reads.ts:244-249`; `apps/web/src/server/financing-media-runtime.ts:48-55`; `packages/storage/src/r2-object-store-client.ts:45-57`, `:461`.

  A v2 save with `propertyMedia: []` intentionally skips media composition at `financing-save.ts:142-143`, while both output variants and the authenticated report page create it for every v2 manifest. For a connected account, that composition eagerly validates mandatory R2 account/key/private/public configuration even when there are no bytes to resolve. Thus a text-only saved v2 report has an avoidable storage prerequisite, although CTR-001:148 allows an explicit zero-photo choice. This is source-backed behavior, not a claim that a live deployment failed. The orchestrator adopted a bounded repair: skip media composition only for a verified explicit empty v2 array, supply the exact empty renderer bundle, retain nonempty-media refusal, and add connected-account/no-R2 read regressions. The repair and fresh Security/Quality verification are pending.

  ```ts
  const runtime =
    report.manifest.schemaVersion === 2
      ? createFinancingMediaRuntime(principal, environment)
      : undefined;
  ```

- [ ] **FP-QA-02: PostgreSQL and PR qualification are not executed proof yet**. `FINANCING_PHOTOS_LEDGER.md:12-15`; `supabase/tests/financing_media.pgtap.sql:2`; `apps/web/src/server/financing-media.postgres.test.ts:128-200`; `apps/web/src/server/financing.postgres.test.ts:149-262`; `.github/workflows/ci.yml:154`.

  The new 18-assertion pgTAP suite and real-PostgreSQL repository/session/route/save tests are authored and reviewed, but were not executed locally because the Linux Docker engine was unavailable. Byte storage in the PostgreSQL route tests is substituted; those tests, even once passed, do not prove live R2. Required green CI, actual migration/RLS/concurrency/revocation execution, current-main conflict checks and MERGEABLE PR evidence remain the orchestrator's completion gates. Keep FP-REGRESSION and FP-PR open until those exact gates pass; a unit suite or synthetic browser run is insufficient.

  ```sql
  select plan(18);
  ```

## Suggestions (consider improving)

None additional. Production retention/erasure/garbage collection/distributed quota, real rights and live storage are explicit release qualifications, not silently invented requirements or newly completed behavior.

## Plan Item Traceability

Status means verified at this review's stated scope. Partial is not full-product completion; deferred means the ledger expressly excludes it.

| #               | Plan requirement                                                                       | Status                           | Implementation location                                                                                                             | Notes                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| FP-CONTRACT     | Freeze the ownership/media/snapshot/v1/v2 agreement                                    | ✅                               | `library/knowledge/private/contracts/CTR-001-financing-property-media.md:1-13`; companion pointer `financing-media-contract.md:3-7` | Accepted revision/hash independently checked.                                                                   |
| FP-MEDIA        | Authenticated bounded JPEG/PNG, normalization, rights, private opaque references       | ✅ source/local                  | `financing-media-http.ts:68-160`; `financing-media-service.ts:35-220`; `financing-media-storage.ts:13-192`                          | Actual decoding and private filesystem/readback/retry tests passed; real PG/R2 qualification pending.           |
| FP-PERSIST      | Freeze confirmed facts and ordered resolved metadata; preserve v1/retry/draft behavior | ✅ source/local                  | `financing-save.ts:43-60`, `:141-165`; `campaign-foundation.ts:461-513`; `form.tsx:64-100`                                          | v1 values and exact HTML/PDF hashes preserved; changed content conflicts; uncertainties retain inputs.          |
| FP-OUTPUT       | All private outputs use identical saved source and real verified image bytes           | ⚠️                               | `financing-output-media.ts:11-30`; `financing-output.ts:24-60`; `campaign-workspace-reads.ts:244-249`                               | Photo path verified; zero-photo connected-account path is FP-QA-01.                                             |
| FP-LAYOUT       | Portrait through three, explicit extended four/five, responsive gallery and all rows   | ✅ bounded                       | `financing-pdf.ts:30-34`, `:154-220`, `:280-301`; `report.tsx:34-89`, `:171-189`; `financing-html.ts:108-159`                       | UX approved the final bounded projection and 32 PNG/eight PDF artifacts. Full D9/owner acceptance remains open. |
| FP-REGRESSION   | Existing campaign/accounting/scenario and actual database/image/browser proof          | ⚠️                               | `financing-v2.unit.test.ts:55-186`; `financing-output-layout.unit.test.ts:124-332`; PG suites cited in FP-QA-02                     | Local tests pass, actual PostgreSQL pending.                                                                    |
| FP-SECURITY     | Final implementation Security, no Medium-or-higher unresolved findings                 | ✅ entry snapshot                | `reports/2026-10-13-financing-photos-security-review.md:7`, `:92-117`                                                               | Repair requires a new Security recheck.                                                                         |
| FP-QUALITY      | Fresh ordered exact-subset review with complete-product limits                         | ⚠️                               | This report                                                                                                                         | Finding/repair recheck remains open.                                                                            |
| FP-PR           | Reviewable commit/PR, required CI, current-main, MERGEABLE                             | ⚠️                               | `FINANCING_PHOTOS_LEDGER.md:15`                                                                                                     | Uncommitted at entry; no shippable branch claim.                                                                |
| CTR-STRUCTURE   | Strict rights/record/snapshot/facts; opaque refs, hashes, nullable bounds              | ✅                               | `packages/contracts/src/financing-media.ts:12-110`; `packages/application/src/financing-media.ts:1-44`                              | No browser-supplied resolved authority.                                                                         |
| CTR-INTAKE      | Authenticate/role/CSRF before consuming; raw JPEG/PNG; 2 MiB bounded stream            | ✅                               | `financing-media-http.ts:68-134`; upload route `media/route.ts:1-5`                                                                 | Missing/wrong Content-Length overflow and canceled streams tested.                                              |
| CTR-DECODE      | 400-6000 dimensions, 12 MP, one frame, MIME match, stripped metadata                   | ✅                               | `financing-media-service.ts:35-70`, `:163-180`                                                                                      | JPEG/PNG decoded, APNG rejected, normalized bytes inspected and hashed.                                         |
| CTR-BOUNDS      | Two normalizations/429; zero-six unique ordered placements, 12 MiB aggregate           | ✅ except empty read             | `financing-media-service.ts:160-185`; `financing-media.ts:102-106`; `media-input.tsx:178-192`                                       | Process guard is not a distributed quota; FP-QA-01 affects zero-photo reading.                                  |
| CTR-PRIVATE     | Internally derived private key; confined immutable FS/R2; no public URL                | ✅ source/local                  | `financing-media-storage.ts:13-106`; `r2-object-store-client.ts:574-630`; `financing-media-runtime.ts:36-69`                        | R2 transport doubles are not live R2; synthetic-only filesystem mode enforced.                                  |
| CTR-RETRY       | Tenant/actor/request identity, changed content 409, original attestation replay        | ✅                               | `financing-media-service.ts:145-159`, `:187-219`; `financing-media-repository.ts:75-103`                                            | Exact/concurrent local convergence and changed rights tested.                                                   |
| CTR-READY       | Immutable write and exact readback before ready metadata                               | ✅ source/local                  | `financing-media-service.ts:212-219`; `financing-media-repository.ts:98-102`                                                        | Failed readback has no ready record; private orphan retention explicit.                                         |
| CTR-READ-REVOKE | Private verified reads; missing/foreign 404; revoked 410; idempotent append            | ✅ source/local                  | `financing-media-service.ts:221-232`; `financing-media-http.ts:162-190`; repository `:104-119`                                      | Current revocation rechecked; actual RLS awaiting PG.                                                           |
| CTR-ERROR       | Stable sanitized errors, private headers, nine UI sentence pairs                       | ✅                               | `financing-media-http.ts:35-65`; `features/http/user-messages.ts:90-128`; `media-input.tsx:125-165`                                 | Governed TextField labels and affected-field errors covered.                                                    |
| CTR-VERSION     | Exact v1 values/template retained; explicit strict v2, outer/calculation remain v1     | ✅                               | `campaign-foundation.ts:461-513`; `financing-verification.ts:27-39`; `financing-v2.unit.test.ts:55-68`                              | No inserted parse defaults or campaign-photo byte column.                                                       |
| CTR-SAVE        | Server resolves ordered refs, facts separate, retry conflict includes facts/order/alt  | ✅                               | `financing-save.ts:43-60`, `:141-165`; `features/financing/model.ts:42-58`                                                          | Unknown facts stay null; list and illustrated purchase price distinct.                                          |
| CTR-REUSE       | Reset quote/cost/permission/facts confirmation, preserve quote instants/media rights   | ✅                               | `financing-context.ts:95-124`, `:162-190`; `form-model.ts:191-227`; `form.tsx:180-189`                                              | Revoked old candidate unavailable; new creation still available.                                                |
| CTR-BUNDLE      | Ordered resolved bytes match snapshot/right/hash/MIME/size/dimensions exactly          | ✅ photo path                    | `financing-media-service.ts:256-279`; `financing-output-media.ts:11-30`                                                             | Missing/corrupt/reordered bundles refuse success.                                                               |
| CTR-RENDER      | Actual embedJpg/embedPng, inert data-image HTML, all facts/rows/quotes/captions        | ✅ photo path                    | `financing-pdf.ts:154-220`, `:223-301`; `financing-html.ts:108-159`                                                                 | JPEG bytes and decoded PNG pixels checked; one-five options and six photos exercised in units.                  |
| CTR-LIMIT       | 20 MiB outputs, sequential media, PDF concurrency/deterministic metadata               | ✅                               | `financing-html.ts:160-161`; `financing-pdf.ts:300-326`; `financing-output.ts:42-65`                                                | Overflow refuses partial output; concurrency release tested.                                                    |
| CTR-RETENTION   | Append-only revocation; retained versions; compatible reader rollback                  | ✅ source, release policies open | Migration `:58-62`; contract `:164`, `:194-199`                                                                                     | No TTL or destructive rollback introduced.                                                                      |
| NG-MEDIA        | No remote imports, stock substitution, identity headshots/logos or licensed catalog    | ✅                               | Contract `:21-23`; media HTTP `:113-118`; report `:82-86`                                                                           | Only original fictional fixture inputs and raw JPEG/PNG supported.                                              |
| NG-PUBLIC       | No public projection/approval, QR/domain/preset/GHL/live-provider claim                | ✅                               | `financing-html.ts:99`; ledger `:17`; manifest `campaign-foundation.ts:479-487`                                                     | Private source/output only; complete product remains open.                                                      |

Locations without a prefix in the table refer to `apps/web/src/server/`, `apps/web/src/features/financing/`, or the named package as indicated by each row's context.

Full PAY requirement disposition is deliberately separate from bounded source verification:

| #       | Complete-product requirement                                                    | Status                   | Evidence/location                                                               | Remaining scope                                                                         |
| ------- | ------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| PAY-001 | Three-action saved property/partner/current-preset package                      | Deferred                 | Parent `payment-flyers-and-co-branded-sites.md:128`                             | Presets/setup and measured interaction promise open.                                    |
| PAY-002 | Financing without event/paid-ad setup; preserve old campaigns                   | ✅ local subset          | `financing-save.ts:79-139`; legacy browser journeys                             | New output read repair/PG qualification still applies.                                  |
| PAY-003 | One-five scenarios, same-program variants, all three groups                     | ✅ local subset          | `financing-output-layout.unit.test.ts:160-193`; `financingGroups` consumers     | Full product release not inferred.                                                      |
| PAY-004 | Deterministic classified cent-level monthly/cash arithmetic                     | ✅ retained local subset | Quiet global unit log; `financing-v2.unit.test.ts:103-106`                      | Photo facts do not change calculation engine.                                           |
| PAY-005 | Block unverified/expired public rate/APR/disclosure approval                    | Partial                  | Manifest private barriers; parent `:132`                                        | Lender/public approval workflow open.                                                   |
| PAY-006 | Versioned both identities/logos/headshots/contact/consent                       | Partial                  | `financing-save.ts:116-139`; parent `:133`                                      | Saved text identity retained; identity images/full licensing open.                      |
| PAY-007 | Authorized safe tenant photo upload/import/storage                              | Partial                  | Media source/test rows above; parent `:134`                                     | Raw upload implemented; authorized imports, real rights/R2 open.                        |
| PAY-008 | Same saved result/version/validity across outputs, immutable approved artifacts | Partial                  | Output tests; parent `:135`                                                     | Private shared-source photo output verified; FP-QA-01 and sealed artifacts remain open. |
| PAY-009 | Complete responsive/photo/print variants and disclosures                        | Partial                  | Final UX report; parent `:136`                                                  | Bounded final matrix approved; owner/lender/full D9 remains open.                       |
| PAY-010 | Real page/PDF/QR bytes, approval-bound output hashes and generation retries     | Partial                  | PDF/HTML tests; parent `:137`                                                   | Private bytes verified; sealed package/QR approval open.                                |
| PAY-011 | Approval invalidation, expiry/revocation safeguards                             | Partial                  | Current media revocation tests; parent `:138`                                   | No complete public financing approval lifecycle.                                        |
| PAY-012 | Approved public QR/site without workspace login/private credentials             | Deferred                 | Parent `:139`; private site notice                                              | Public route/domain/QR not delivered here.                                              |
| PAY-013 | Authorized attributed tenant-correct HighLevel lead, safe retries               | Deferred                 | Parent `:140`; private site notice                                              | Live handoff remains open.                                                              |
| PAY-014 | Tenant IDs never grant access; template entitlement enforcement                 | Partial                  | Media tenant source/local tests; parent `:141`                                  | PG execution and licensed-template product proof open.                                  |
| PAY-015 | No restricted client artwork/source correspondence/identifying fixtures         | ✅ delta                 | `tests/browser/financing-photos.spec.ts:25-36`, `:132-186`; inspected inventory | Original fictional inputs; no restricted assets in reviewed delta.                      |
| PAY-016 | Full implemented-scope types/PG/browser/image/PDF/deployment proof              | Partial                  | Verification below; parent `:143`                                               | PG/CI/PR/hosted/storage/rights/lender/release gates remain open.                        |

Verification attribution:

- Independently executed by Quality, after final Security/UX entry clearance: `pnpm exec vitest run --project unit --maxWorkers=1` for media, v2, output-layout and R2 media tests, four files and 37 passed; `--project integration --maxWorkers=1` for media-input and financing form, two files and 18 passed; `--project unit --maxWorkers=1` for user-messages and form-model, two files and 45 passed. Total: eight files, 100 passed, no skips. No test/config/timeout waiver or reviewer-authored test. `git diff --check` passed at entry.
- Inspected orchestrator quiet logs `test-results/financing-final-{unit,integration,contracts,components,visual,e2e-preview}.log`: 275 files, 3980 passed and one existing integration skip (2913 unit; 869 integration plus skip; 112 contracts; 77 components; eight visual; one preview). These are owner runs, not independent Quality executions, and do not constitute the entire offline/DB/CI gate.
- Preserved `financing-final-unit-build-overlap.log` remains failed with five 5000 ms timeouts during concurrent build work. Quiet unit evidence supersedes that unit run only; no timeout/configuration waiver occurred.
- Inspected `financing-final-browser.log`: two JPEG/PNG lifecycle cases and eight inherited report/accounting/reuse journeys passed; eight earlier photo cases failed. The separate final `financing-input-final-browser.log` supersedes those photo cases with eight passed production-build synthetic journeys. `financing-input-final-build.log` records 16 successful build tasks. No full 18-case pass is invented from the earlier failed run.
- Final eight photo journeys cover 1440/1180/768/390 in Light/Dark; 1180 uses five landscape scenarios, others three portrait. Upload/rights/hero UI is exercised, then save occurs through actual HTTP, rather than a complete new form-submit journey. Report reload/image checksums, site embedded-byte checksums, actual PDF download, no page errors, scoped axe/overflow/type-step checks and zero observed off-origin page requests are asserted. The synthetic principal/filesystem fixture is not a production account, live storage or real photographic rights proof.
- Final artifact inventory: 32 PNGs and eight PDFs, including eight actual full-page photo-setup captures. Independent UX inspected final rendered PDFs and the full bounded success-state matrix, clearing corrected heading spacing/type, paragraph/caption pagination and governed input/error wiring. Quality relies on that specialist visual review and does not claim an independently inspected full D9 matrix.
- Inspected owner lint, boundary, product-type and secret logs passed; output dedup log records zero clones across 708 files. No test-only deduplication weakened a production guard or assertion. Actual PG/pgTAP, Linux pixel baselines, live R2/hosted/customer rights, full keyboard/zoom/reduced-motion/error-state matrix, production retention/quota, owner/lender acceptance, presets/identity assets, public sealed QR/domain and HighLevel remain open.

## Files Changed

Inventory at review entry combines `git diff origin/main...HEAD`, unstaged/staged diff and all untracked files. HEAD had no committed delta; the implementation was uncommitted. A means added/untracked, M means modified. This reviewer adds only its report; other active lanes retain their ownership.

- `.github/workflows/ci.yml` (M): synthetic and database review-artifact retention.
- `FINANCING_PHOTOS_LEDGER.md` (A): exact private-subset execution ledger.
- `apps/web/package.json` (M): direct Sharp dependency and Next patch.
- `apps/web/src/app/api/campaigns/property/financing/media/[mediaRef]/revoke/route.ts` (A): private revocation route.
- `apps/web/src/app/api/campaigns/property/financing/media/[mediaRef]/route.ts` (A): authenticated image read.
- `apps/web/src/app/api/campaigns/property/financing/media/route.ts` (A): raw photograph upload.
- `apps/web/src/copy/financing-messages.ts` (M): version-appropriate media notice.
- `apps/web/src/features/financing/financing.module.css` (M): bounded photo/facts and token projection.
- `apps/web/src/features/financing/form-model.ts` (M): facts/placements and reuse initialization.
- `apps/web/src/features/financing/form-model.unit.test.ts` (M): facts/reuse parsing checks.
- `apps/web/src/features/financing/form.integration.test.tsx` (M): retries, reuse and unavailable-photo interaction.
- `apps/web/src/features/financing/form.tsx` (M): v2 facts/media input and content retry identity.
- `apps/web/src/features/financing/media-input.integration.test.tsx` (A): rights/error/retry/reorder/cap checks.
- `apps/web/src/features/financing/media-input.tsx` (A): governed upload card and placements.
- `apps/web/src/features/financing/media-upload.ts` (A): validated same-origin raw client upload.
- `apps/web/src/features/financing/model.ts` (M): strict v1/v2 request and reuse types.
- `apps/web/src/features/financing/property-display.ts` (A): saved facts and media paths.
- `apps/web/src/features/financing/report.tsx` (M): actual hero/gallery and property facts.
- `apps/web/src/features/http/user-messages.ts` (M): nine sanitized media error pairs.
- `apps/web/src/features/http/user-messages.unit.test.ts` (M): exhaustive media message coverage.
- `apps/web/src/server/campaign-workspace-reads.ts` (M): current media verification for report pages.
- `apps/web/src/server/financing-context.ts` (M): v2 reuse and unavailable-photo handling.
- `apps/web/src/server/financing-html.ts` (M): v2 data-image/facts gallery and size cap.
- `apps/web/src/server/financing-http.ts` (M): sanitized media failure and principal handoff.
- `apps/web/src/server/financing-media-http.ts` (A): bounded authorized media handlers.
- `apps/web/src/server/financing-media-runtime.ts` (A): principal-bound PostgreSQL/R2 or explicit synthetic store.
- `apps/web/src/server/financing-media-service.ts` (A): normalization, readback, retry, rights and resolution.
- `apps/web/src/server/financing-media.postgres.test.ts` (A): authored real-session/repository/route tests.
- `apps/web/src/server/financing-media.unit.test.ts` (A): decoded media and boundary checks.
- `apps/web/src/server/financing-output-layout.unit.test.ts` (A): legacy hashes, real embeddings, limits and complete text.
- `apps/web/src/server/financing-output-media.ts` (A): exact ordered bundle/hash validation.
- `apps/web/src/server/financing-output.ts` (M): private verified photo output composition.
- `apps/web/src/server/financing-pdf.ts` (M): real photographs, versioned layouts and pagination.
- `apps/web/src/server/financing-save.ts` (M): server-resolved immutable facts/media snapshot.
- `apps/web/src/server/financing-v2.unit.test.ts` (A): version/source/retry/reuse verification.
- `apps/web/src/server/financing-verification.ts` (M): strict saved-manifest verification.
- `apps/web/src/server/financing.postgres.test.ts` (M): authored v2 facts/media/save integration.
- `library/knowledge/private/contracts/CTR-001-financing-property-media.md` (A): frozen Accepted agreement.
- `library/requirements/in-work/prd-010-campaign-recovery/financing-media-contract.md` (A): exact agreement pointer.
- `library/requirements/in-work/prd-010-campaign-recovery/financing-report-increment.md` (M): bounded additive scope pointer.
- `library/requirements/in-work/prd-010-campaign-recovery/payment-flyers-and-co-branded-sites.md` (M): exact private-subset pointer.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-financing-media-ci-review.md` (A): independent bounded CI review.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-financing-photos-quality-review.md` (A): this report only.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-financing-photos-security-review.md` (A): independent Security and final input recheck.
- `library/requirements/in-work/prd-010-campaign-recovery/reports/2026-10-13-financing-photos-ux-review.md` (A): independent bounded final UX review.
- `packages/application/src/financing-media.ts` (A): server media ports and errors.
- `packages/application/src/index.ts` (M): media export.
- `packages/contracts/src/campaign-foundation.ts` (M): exact legacy plus explicit v2 union.
- `packages/contracts/src/financing-media.ts` (A): strict media/rights/facts bounds.
- `packages/contracts/src/index.ts` (M): version/media exports.
- `packages/db/src/financing-media-repository.ts` (A): immutable principal-bound metadata/revocation.
- `packages/db/src/index.ts` (M): repository export.
- `packages/storage/src/financing-media-storage.ts` (A): confined immutable filesystem adapter/key.
- `packages/storage/src/index.ts` (M): media storage export.
- `packages/storage/src/r2-object-store-client.ts` (M): immutable private media PUT/GET.
- `pnpm-lock.yaml` (M): resolved dependency graph.
- `supabase/migrations/20261013210000_financing_media.sql` (A): reserved additive media/revocation RLS migration.
- `supabase/tests/financing_media.pgtap.sql` (A): 18 authored database assertions.
- `tests/browser/financing-media.spec.ts` (A): actual JPEG/PNG local HTTP lifecycle.
- `tests/browser/financing-photos.spec.ts` (A): final synthetic photo/facts/output matrix.
- `tests/browser/financing-report.spec.ts` (M): explicit v2 facts confirmation in existing journeys.
- `tooling/tests/unit/production-foundation/financing-media-r2.test.ts` (A): bounded immutable R2 transport checks.

## Final FP-QA-01 recheck, October 13

**Updated verdict: PASS WITH WARNINGS for the bounded private financing photograph source. FP-QA-01 is CLOSED.** This addendum supersedes the initial conditional verdict and the affected scorecard/traceability dispositions above. FP-QA-02 remains OPEN: actual PostgreSQL/18 pgTAP assertions, required CI, reviewable PR, current-main conflict checks and MERGEABLE evidence are still required before the branch is shippable. No complete PAY product, hosted deployment, owner/lender acceptance or public/provider release is certified.

Fresh reopened Security PASS preceded this recheck, as recorded in `reports/2026-10-13-financing-photos-security-review.md`, section "Reopened Security for FP-QA-01, October 13". I independently read the frozen four-file correction, source verification/authentication ordering and the new test seams, checked the exact Security pins, and ran the affected tests. No new code finding was detected.

The shared predicate at `apps/web/src/server/financing-output-media.ts:12-18` accepts only schema v2 with an actual array of length zero. Missing, null, non-array and nonempty values do not qualify. `apps/web/src/server/financing-output.ts:15-24` supplies an explicit empty resolved bundle for that verified choice and retains normal runtime/resolution for photographs. Both HTML and PDF consume this helper at `:40` and `:56`. `apps/web/src/server/campaign-workspace-reads.ts:245-254` uses the same predicate to avoid unnecessary storage construction for the authenticated text-only report page.

The bypass follows source verification. `apps/web/src/server/financing-http.ts:87-99` retains authenticated read-principal resolution, principal-bound saved reads, campaign access and strict manifest/canonical/calculation verification. `apps/web/src/server/campaign-page-data.ts:217-219`, `:258-260` retains principal-scoped projection and verification before the financing report reaches the page composition branch. The unchanged media resolver continues to verify nonempty photos, normalized byte hashes and current revocation. The fix neither weakens authentication nor treats malformed saved content as a zero-photo choice.

Quality independently executed:

```text
pnpm exec vitest run --project unit --maxWorkers=1 apps/web/src/server/financing-output-layout.unit.test.ts apps/web/src/server/financing-handler.unit.test.ts
Test Files: 2 passed
Tests: 39 passed
Exit: 0
```

The new regressions at `apps/web/src/server/financing-output-layout.unit.test.ts:315-424` exercise real signed embedded-session authentication, actual output handlers and actual page loading, while substituting the saved-read persistence adapter. They prove empty-v2 HTML/PDF/page success without any photo factory invocation; unauthenticated site refusal with 401; nonempty unavailable-storage refusal with three actual factory invocations; and missing-media refusal with 503 `FINANCING_INTEGRITY_FAILED` even after recomputing the saved hash. Strict-schema/source inspection establishes null/non-array refusal; those cases are not claimed as separately executed tests. This is a signed connected-mode boundary regression fixture, not a hosted account or actual PostgreSQL/R2 execution.

The same independent run also passed existing exact v1 HTML/PDF hashes, actual JPEG/PNG embeddings and decoded pixels, saved financial/validity text, one-to-five scenarios, six-photo/long-copy content, corrupt/reordered/revoked-media refusal, output limits and PDF concurrency/release. `git diff --check` passed. The owner and reopened Security each separately report 39 affected tests passed; their executions are not added to Quality's independent count. Owner evidence records zero duplication, affected type/lint/format/boundary/product-type/secret checks passed. No guard, timeout, skip, assertion or configuration waiver was added.

The earlier 275-file/3980-pass/one-existing-skip global suite predates this four-file correction. It remains prior broad regression evidence, not a post-fix complete-suite claim. This final delta is independently covered by the scoped 39-test run. HTML renderer, PDF renderer, CSS and Accepted CTR-001 hashes remain unchanged; therefore the earlier final eight synthetic photo journeys and 32 PNG/eight PDF visual artifacts remain representative of the unchanged photograph composition. No new browser/production build, Linux visual comparison or hosted exercise is claimed by this addendum.

| Category     | Final bounded status | Notes                                                                                                 |
| ------------ | -------------------- | ----------------------------------------------------------------------------------------------------- |
| Completeness | ⚠️                   | Source behavior complete for the reviewed private subset; actual PG/CI/PR qualification remains open. |
| Correctness  | ✅                   | FP-QA-01 repaired and independently verified; strict photograph/malformed/auth refusal retained.      |
| Alignment    | ✅                   | Exact frozen contract and private-only boundary preserved.                                            |
| Gaps         | ⚠️                   | FP-QA-02 remains open; no executed database or complete release proof.                                |
| Detrimental  | ✅ bounded source    | Legacy hashes, photos, financial projections and guards remain passing in the affected run.           |

| Ledger/contract row | Updated disposition               | Evidence                                                                                                      |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| FP-OUTPUT           | ✅ bounded source/local           | Empty and photograph-bearing HTML/PDF/page behavior verified by this recheck.                                 |
| FP-QUALITY          | ✅ bounded independent review     | Ordered reopened Security then this final Quality addendum.                                                   |
| CTR-BOUNDS          | ✅ bounded source/local           | Explicit zero-media choice now avoids unnecessary storage construction; six-photo/aggregate bounds unchanged. |
| FP-REGRESSION       | ⚠️ OPEN                           | Actual PG/pgTAP and required integrated CI evidence still pending.                                            |
| FP-PR               | ⚠️ OPEN                           | Current-main/PR/required CI/MERGEABLE proof remains the orchestrator's gate.                                  |
| PAY-008/PAY-016     | Partial complete-product criteria | Private output delta clears; sealed approval/full product/PG/hosted proof is not inferred.                    |

Exact rechecked SHA-256 pins:

| File                                                       | SHA-256                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/server/financing-output.ts`                  | `73c258b2de0b468d27507ec6cc675be8bac04e71b80ba98a8f7c26c930c6c5f1` |
| `apps/web/src/server/financing-output-media.ts`            | `7e2974e4497095b489eda813a7a70841934a7689e307e6c73dbe732cf5d9d9b7` |
| `apps/web/src/server/campaign-workspace-reads.ts`          | `feb3c07a079afff8d0cbcf58d185eaec98cdd6f906b78b178f2ff6c1f1fd0aee` |
| `apps/web/src/server/financing-output-layout.unit.test.ts` | `95f69136750c6138abac8ee28a04fc8ac595f09a5a6066b113694e4b3ad40a36` |

The four changed files already appear in the original inventory; the final changes add the shared predicate, route/page empty-media branching and the connected-mode regressions. This reviewer appended only this report. All other earlier scope limits remain: actual photograph rights, live storage, hosted sign-in, production retention/erasure/quota, reviewed presets, identity portraits/logos, full D9/error/keyboard/zoom/reduced-motion qualification, owner/lender visual acceptance, public sealed QR/domain and authorized HighLevel handoff remain open.
