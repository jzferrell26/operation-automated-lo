# QA self-review: campaign package generation

Date: October 5, 2026. Reviewer: Chief, direct sequential self-review after [security review](2026-10-05-package-security-self-review.md). No independent agent review is claimed. Base: `0b47805e`. Branch: `chief/campaign-package-2026-10-05`. Governing plan: [Batch B](../batch-b-campaign-package.md).

## Outcome and scope

The implemented flow creates a complete private package from one saved property campaign: a property-page HTML preview, printable PDF flyer, SVG QR, and social/email/SMS draft copy. The saved package is reopened rather than regenerated on retries, and actual tenant-bound PostgreSQL behavior has been exercised. Public approval, public lead capture, HighLevel delivery, Meta publication, and mortgage outcomes remain later recovery work.

## Scorecard

| Axis | Assessment |
| --- | --- |
| Completeness | All four Batch B outputs and the generation/readback UI are implemented. This is not completion of every PRD-010 batch. |
| Correctness | Exact saved-source checks, atomic package storage, byte-hash readback, retry handling, and database tenant/role boundaries are covered. The preparation concurrency defect discovered during this batch is fixed. |
| Alignment | The property and Realtor relationship are the package's inputs; the existing ad library, light navigation, lender-only paid ads, and HighLevel-as-CRM boundary remain unchanged. |
| Gaps | Hosted migration/application, owner visual approval, the canonical hosted/review release matrix, distributed creation quotas, and inherited customer-data lifecycle requirements remain explicit release work. |
| Detrimental patterns | No external dependency upgrade, new browser-rendering service, public token, live-provider request, customer message, synthetic photo, or invented output-success state. |

## Defects corrected and regressions checked

The real-PostgreSQL preparation tests initially found two failures: exact simultaneous saves could report version 1 and version 2 for one stored version, and different details with the same key produced 503 rather than 409. The existing campaign allocation lock is now acquired before the version lookup, and the handler responds from the persisted record. The new typed conflict preserves the original record. Existing library-ad, approval, campaign-page, and preference database tests pass alongside these cases.

The initial package RLS relied on application authorization to exclude viewer INSERTs. The final policy verifies the active creator/admin binding independently. A direct SQL viewer insertion now fails, while a viewer can read an existing same-workspace package. Another workspace sees no package row and receives 404 through the output API.

The final layout keeps a long flyer's permissions, disclosure, and QR section together. Unsupported font characters refuse generation without deleting the source or saving partial files. The HTML renderer escapes literal markup; the QR SVG labels both missing permissions rather than implying consent. Output readback rejects modified bytes and a commit for a mismatched source version.

## Acceptance traceability

| Criterion | Evidence |
| --- | --- |
| PKG-001, verified source and strict command | `property-package-http.ts:54-83`, `property-package-service.ts:105-125`, strict `PropertyPackageRequestSchema`, and forged-authority/stale-source tests. Browser input supplies no output, branding, approval, or routing authority. |
| PKG-002, one saved identity and honest notices | `property-package-content.ts`, `property-package-html.ts`, `property-package-pdf.ts`, and `property-package-render.ts`; actual saved brand/partner data is read through exported routes in PostgreSQL tests, with private contact fields excluded. |
| PKG-003, usable rendered output | Actual PDF files are opened, rasterized, and inspected. ZXing decodes both the printed flyer QR and the standalone SVG raster to the expected private page URL. Text extraction proves a long description is preserved across two pages. |
| PKG-004, private access | Forced-RLS migration, private/no-store/noindex/no-referrer headers, authenticated GET handler, cross-tenant read/write denials, and viewer read-only tests. |
| PKG-005, complete and idempotent package | All four files are rendered before commit; first committer wins. Sequential and simultaneous generation return the same package. Renderer failure, unsupported glyphs, corrupt output, store failure, and busy limits are covered without false ready states. |
| PKG-006, real database proof | Ten package/preparation cases plus five existing regression files, 109 tests in total, passed against freshly migrated isolated PostgreSQL 17.6. This is not a filesystem mock or hosted-database claim. |
| PKG-007, generation and review UX | Nine panel integration cases cover loading, duplicate-click prevention, failures, viewer permissions, unavailable storage, and a response for another source. Browser coverage spans four widths and both themes, using the real local server and store. |
| PKG-008, preserve existing product | Existing contract/source guards remain active, including no publication and no duplicated CRM. The complete configured offline gate passed; exact results and scope are recorded below. |

Paths without a prefix above are under `apps/web/src/server/`.

## Rendered-file inspection

The ordinary synthetic property creates a one-page Letter PDF. A 32-repeat long-description fixture creates a two-page PDF; extracted text contains all 32 copies, and every page has an internal-review footer. The latest second page was visually inspected after grouping the review section, with no clipped text or detached disclosure. The SVG QR and the QR printed on the PDF were decoded with the installed ZXing decoder, not inferred from SVG source text. Both match the expected private route exactly.

These checks use the installed local PyMuPDF renderer and ZXing decoder. They are separate local inspection evidence, not a claim that CI performs QR decoding or that the PDF meets PDF/UA. Ephemeral files are in `test-results/property-package-proof/`; `inspection.json` records the checks. No font, screenshot, local database credential, or generated customer-data artifact is committed.

## Visual and interaction review

The applicable references are the Batch B design decision, the existing campaign form/card specifications, and `library/knowledge/private/ux-ui/06-review-rubric.md` sections 1 through 4. The new materials panel reuses the existing Surface, Button, Link, Badge, focus, spacing, and color primitives. The separately rendered document is an explicitly light print/review artifact, not another application theme.

The browser matrix covers 1440, 1180, 768, and 390 pixels in Light and Dark. It checks actual save/generation/reload, the QR image, all four output actions, axe results, horizontal overflow, and page errors. The private preview popup is explicitly resized to the tested width; a popup's default desktop viewport is not counted as mobile coverage. Full-page captures reset scroll position so the sticky header is not misleadingly captured across the title after the QR crop scrolls the viewport.

This local review does not re-sign PRD-009's Linux reference-image table or claim owner visual approval of the final recovered product. No committed reference image was changed. The broader all-state scored baseline and authenticated-review-browser release sign-off remain release qualification rather than an invented 3/3 score.

## Verification record

Pinned toolchain: Node 24.18.0 and pnpm 11.15.1. The frozen-lockfile check passed. The only lockfile delta is the local workspace link to the rendering package; no external package version changed.

| Check | Result |
| --- | --- |
| Unit tests with existing coverage requirements | 2,736 passed |
| Integration tests | 837 passed; one existing skip retained |
| Contract/security tests | 112 passed |
| Component tests | 77 passed |
| Visual-contract tests | 8 passed |
| Preview-contract test | 1 passed |
| Full synthetic browser suite | 204 passed; 22 existing skips retained |
| Dashboard-preview browser suite | 16 passed |
| Selected actual PostgreSQL regression suite | 109 passed across six files, including ten new package/preparation cases |
| Production dependency audit | No known vulnerabilities reported |
| Full dependency audit | One existing owner-accepted development-only high advisory, unchanged |
| Render and QR inspection | One-page and two-page PDFs inspected; both independent QR decode checks passed |
| Boundary, product-type, and secret audits | Passed |
| Duplication check | Passed; no detected clones |
| Production build and sample-ad output scan | Passed; no sample-ad trace in the production build |

**Aggregate result: `pnpm verify:offline` passed, exit 0, with `VITEST_MAX_WORKERS=4`.** Two earlier unconstrained local gate attempts hit 5-second timeouts in unrelated existing tests: the homeowner dialog-language sweep and the migration-compatibility subprocess check. The homeowner suite passed all 22 cases when rerun unchanged, with the timed-out case completing in 1,136 ms. The successful gate uses the installed Vitest runtime's supported worker setting to bound local contention. No timeout, assertion, coverage threshold, or skipped-test policy was relaxed. The complete offline command ran all its original stages.

The interrupted continuation subsequently included a UI transport correction, so the earlier aggregate result was not treated as proof of the final tree. `property-package-panel.tsx` now supplies its verified generation response to the parent campaign screen instead of starting a redundant server refresh. Both the materials panel and the campaign journey update from that confirmed response. The screen is keyed by campaign version, and an explicit reload independently proves database readback. The unavailable-state recovery control performs a deliberate read-only page reload.

**Final continuation result: the complete `pnpm verify:offline` command passed again, exit 0, on the final application tree with `VITEST_MAX_WORKERS=4`.** All counts in the table above were reproduced, including all eight new property-package viewport/theme journeys, 204 active synthetic browser cases and 16 dashboard-preview cases. The final server log has no recurrence of `The destination stream closed early` and no `[WebServer]` error entry. No error filter, assertion, timeout, coverage threshold or skip policy was relaxed to obtain that result. Normal runtime warnings remain visible in the log.

The six-file real-PostgreSQL regression suite was also rerun and passed all 109 tests. The existing dedicated container and its loopback binding were verified before access; no migration or shared stack was replayed or reset. It was stopped after testing, retaining its disposable data. PDF inspection was rerun against the generated proof files: the one-page and two-page outputs passed text-preservation and per-page draft checks, and both printed and standalone QR symbols decoded to the expected private page. The rendered pages and final mobile package/preview captures were visually inspected.

Final logs are retained in ignored `tmp/package-closeout-verify.log`, `tmp/package-closeout-postgres.log`, and `test-results/property-package-proof/inspection.json`. Earlier diagnostic and verification logs remain available under `tmp/package-*.log`. No application code changed after the final passing run; closeout edits update evidence and PR documentation only. The full `pnpm verify` wrapper, hosted migration and hosted deployment are not claimed as passed or completed.

## Release disposition

The finished Batch B code is intended for a review PR, with [deployment notes](../deployment.md) explicitly requiring the new migration before hosted generation. Keep public/provider activation off. The next product milestone is approval bound to the actual output package, not another ad-library redesign or a claim that the private QR is ready for customer lead capture.

## PR #78 check repair

GitHub run `37347399492` failed in both Application verification and Real PostgreSQL migrations and pgTAP. These failures were not covered by the earlier Windows offline result and selected database tests. The Linux image comparisons and the full pgTAP scaffold assertion exposed two separate harness defects:

1. `supabase/tests/phase0_scaffold.pgtap.sql` still expected 25 tenant tables after Batch B introduced the 26th. The exact expected count is now 26, and a new assertion requires that the added table is `campaign.property_campaign_packages`. All ownership, forced-RLS, privilege, and index assertions remain. The test plan increases from 20 to 21, rather than dropping a check or using an open-ended minimum.
2. The date mask hid schedule glyphs, but a rolling weekday still changed their width. The CI artifact showed 1,586 changed pixels around the 390px header: `Mon, Oct 19, 2026` pushed the unmasked word `in` onto the next line compared with the baseline's `Fri, Oct 16, 2026`. The shared screenshot helper now temporarily uses that canonical display label only for the already-masked library-campaign header dates. It restores the actual text after the capture, including failure paths. Source data, datetime attributes, application clocks, and surrounding words are untouched. Accessibility, target-size, typography and overflow checks continue to run on the actual date before screenshot normalization.

The fix adds three real-browser regression cases: changed weekdays/months/years yield the same captured fixture, a real typography change still changes the image, and success/failure restore the original label. Unexpected nested header markup is refused rather than erased. The existing Linux baselines, 0.001 pixel-ratio threshold, retries, timeouts, and production application code are unchanged.

Direct sequential security review of this test-only delta found no new production access path, credential, schema mutation, dependency change, or relaxed permission boundary. Quality review then verified the two original failure logs against the repair and added regression checks. Local evidence: all 21 scaffold pgTAP assertions pass after all 14 migrations on a newly created, network-isolated PostgreSQL container; all five focused browser cases pass; type checking, lint (zero warnings/errors), and the three shared-date-mask source guards pass. These local browser results are not represented as Linux baseline proof. The replacement GitHub run remains the final confirmation for the full application and database jobs.

Ephemeral evidence: `tmp/pr78-failed-checks.log`, `tmp/pr78-ci-artifacts/`, `tmp/pr78-fix-browser.log`, `tmp/pr78-fix-types.log`, `tmp/pr78-fix-unit.log`, and `tmp/pr78-pgtap-proof.log`. No hosted database or shared local stack was modified.

The full isolated pgTAP run subsequently passed all 746 assertions across 15 files (`tmp/pr78-all-pgtap.log`). Replacement GitHub run `37353834747` exposed a separate randomized test false positive before reaching the application screenshots: the package test rejected a perfectly valid opaque hexadecimal ID containing `615`, because those digits are also the fictional property's street number. The repair keeps the exact expected URL assertion, adds an anchored path-shape check with only the two hexadecimal identifiers, and explicitly requires empty username/password/query/fragment fields. The test now uses a deterministic request key whose generated ID contains `615`, preserving the failure case without altering the production ID algorithm or weakening the no-PII/no-token requirement. This follow-up changes only that test and this record; security review confirms no production access/data change before quality re-verification.
