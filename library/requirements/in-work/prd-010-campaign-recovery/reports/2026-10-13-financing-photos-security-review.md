# Financing property photographs security review

Date: 2026-10-13. Reviewer: fresh `security-guardian` context, independent of implementation. Branch: `codex/financing-photos`; base `728d5f0`; uncommitted working changes.

## Executive summary

PASS for the bounded private financing photograph implementation review. No new Critical, High, Medium or Low security finding was detected in the reviewed delta. Fresh Quality may follow this review, but shipping remains conditional on actual database/CI qualification and the other open ledger gates. This report does not credit unexecuted PostgreSQL tests or authorize hosted, lender, provider or public release.

The installed Weapon watchlist was last refreshed on 2026-04-24, 172 days before this review. Its static version matrix is stale. This pass supplemented it with a fresh registry audit, installed/locked version inspection and primary Next.js/React advisory sources. Refreshing the shared Weapon remains a maintenance follow-up outside this product branch.

## Scope and ordering

The scope is `FINANCING_PHOTOS_LEDGER.md` and Accepted CTR-001 revision 1, SHA-256 `18e074952d88c069675ceda1e9f12e0fa4737a3cd268f564861c303b477a572e`, verified against the file. The reviewer read the complete new media schemas, application ports, tenant repository, reserved migration and pgTAP suite, HTTP/service/runtime composition, filesystem/R2 extensions, v1/v2 persistence and verification, form/upload/reuse behavior, report/HTML/PDF consumers and their tests. Related auth, transaction, normalization, private-header and CI foundations were inspected at the consumed boundaries.

The final output-owner changes were included: v2 paragraph/caption reservations and scoped report typography. Existing PRD QA documents concern earlier work; no fresh Quality report for this photograph delta existed at entry. Security precedes the new Quality pass. This reviewer changed only this assigned report, with no runtime fixes, commits, pushes or live effects.

## Scorecard

| Category                           | Result                                                                         | New findings |
| ---------------------------------- | ------------------------------------------------------------------------------ | ------------ |
| Financial/payment security         | No exposed charging/card boundary; saved calculations remain verified          | 0            |
| PII and private media exposure     | Tenant-private reads; no secret, source-image metadata or storage-key response | 0            |
| Authentication and authorization   | Session, current role, Origin/CSRF and tenant boundaries retained              | 0            |
| Injection and untrusted URLs       | Strict schemas, parameterized SQL, escaped text, confined keys                 | 0            |
| Dependencies                       | Production audit clean; one unchanged accepted development advisory            | 0            |
| Configuration and headers          | Private no-store, nosniff, same-origin and inert HTML policy retained          | 0            |
| Data integrity and resource bounds | Normalized hashes, immutable snapshots, revocation and size/concurrency bounds | 0            |

Critical findings: None detected. High findings: None detected. Medium findings: None detected. Low findings: None detected. The inherited accepted advisory below is recorded separately and has not been silently reclassified or removed.

## Reviewed controls and evidence

| Boundary                               | Evidence and disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw intake and mutation authorization  | `apps/web/src/server/financing-media-http.ts:107` resolves the authenticated mutation principal before reading bytes, then checks permitted roles. Existing `authenticated-principal.ts` performs session/current-role and Origin/CSRF checks. Intake accepts only exact JPEG/PNG MIME and enumerated confirmed rights; its `:68` bounded reader enforces 2 MiB without trusting Content-Length and cancels rejected streams. Revoke repeats mutation authorization at `:170`.                                                                                                                                              |
| Actual decoded image safety            | `financing-media-service.ts:31` inspects bounded native Buffer bytes, rejects APNG animation chunks, mismatched type, multiple pages, invalid dimensions and more than 12 million pixels. The existing normalizer orients and reencodes. Normalized bytes are decoded again, checked for retained metadata, sized and hashed. `:160` caps in-flight normalizations at two and releases its counter in `finally`.                                                                                                                                                                                                            |
| Retry, rights and readiness            | `financing-media-service.ts:145` derives media identity from server tenant/actor and request UUID. Changed original bytes/MIME/rights conflict; exact retry preserves the original attestation. At `:212`, immutable byte write and verified readback precede ready metadata commit. Public upload metadata is explicitly selected at `:101`, excluding keys, source hash and request hash.                                                                                                                                                                                                                                 |
| Tenant persistence and immutability    | `packages/db/src/financing-media-repository.ts:28` filters by transaction tenant and binds the opaque reference as a SQL parameter. All operations use principal-bound tenant transactions. `supabase/migrations/20261013210000_financing_media.sql:41` and `:43` force RLS; `:48` and `:53` require matching tenant/current actor and active creator/admin roles. `:58` and `:60` enforce append-only records, while `:62` grants only select/insert. Actual enforcement is still awaiting CI execution.                                                                                                                   |
| Private storage and path/URL isolation | `packages/storage/src/financing-media-storage.ts:13` derives keys solely from validated server metadata. `:38` confines resolved paths and checks real directories/symlinks; `:78` uses no-follow where supported plus opened-file identity/size checks. `financing-media-runtime.ts:35` limits filesystem composition to explicit local synthetic mode. R2 `putPrivateMedia`/`readPrivateMedia` at `r2-object-store-client.ts:574` and `:598` use the configured private bucket, immutable conditional PUT, HEAD metadata validation and exact bounded/hash-verified GET. No browser URL or bucket becomes a fetch target. |
| Saved facts, hash and legacy boundary  | `financing-save.ts:43` authorizes the principal and strictly parses input. Browser placements contain reference/alt text only; resolved rights/hash/dimensions come from verified storage at `:154`. Reuse resets confirmations and retries recheck media. `financing-verification.ts:25` checks supported manifest shape, canonical manifest hash and recalculated result hash. v1 receives no v2 defaults; exact legacy HTML/PDF hash tests pass.                                                                                                                                                                         |
| Revocation and output bytes            | `financing-media-service.ts:222` checks revocation before reading and rechecks at `:228`; snapshot resolution compares complete current metadata/rights to frozen snapshots. Saved pages, retry, reuse, site and PDF consume these checks. `financing-output-media.ts:12` requires the exact ordered bundle and verifies its normalized byte size/hash. Missing, reordered, corrupt and revoked media fail instead of producing partial success. Already downloaded files cannot be recalled.                                                                                                                               |
| HTML/PDF and XSS                       | HTML uses the shared text escaper and embeds only verified JPEG/PNG data images. `financing-output.ts:74` adds only `img-src data:` to the existing hashed-style, script-free sandbox. No external/signed image URL, script or lead form is introduced. HTML/PDF limits are 20 MiB; overflow returns the stable 422 error. PDF concurrency remains two at `:42`; all selected images are embedded from verified bytes, with sequential loading. Final v2 pagination changes preserve the v1 branch.                                                                                                                         |
| UI and CI disclosure                   | The UI records explicit rights and fact confirmation, uses original alt text, preserves file/draft on failure, and explains remove versus revoke. It keeps private notices and false publication authorization. CI adds only pinned, seven-day uploads of the fixed synthetic/review frame directory; no credentials, privileged event, broader permission or disabled gate is added. The separate DevOps report confirms producer/job alignment.                                                                                                                                                                           |

## Verification performed by this reviewer

| Command/check                                                                                                     | Result                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installed `security-weapon/scripts/scan.ts`, with only output destination relocated to the OS temporary directory | Completed deterministic audit, version, Unicode, pattern, environment-key and header sweeps. Nested app headers were inspected manually. No new confirmed vulnerable-pattern hit. |
| Focused unit run: media, v2 snapshots, output layout, R2 and form-model files                                     | 5 files, 49 tests passed.                                                                                                                                                         |
| Focused integration run: financing form and media input                                                           | 2 files, 17 tests passed.                                                                                                                                                         |
| Accepted-advisory guard                                                                                           | 1 file, 22 tests passed; only the existing dated exception is allowed.                                                                                                            |
| Final-delta unit rerun: output layout, financing handler, calculation and security scan                           | 4 files, 63 tests passed, including exact v1 HTML/PDF hash tests. Counts overlap prior runs and are not cumulative coverage totals.                                               |
| `pnpm typecheck`                                                                                                  | 16 workspace package tasks and tooling TypeScript check passed.                                                                                                                   |
| `pnpm audit:secrets`, `pnpm audit:boundaries`, `git diff --check`                                                 | Passed. Boundary negative fixture rejected both prohibited edges.                                                                                                                 |
| `pnpm audit --prod --audit-level=high --json`                                                                     | 0 production vulnerabilities; 153 total production/optional dependencies in scan output.                                                                                          |
| `pnpm audit --audit-level=high`                                                                                   | Exit 0; one High, one ignored, as described below.                                                                                                                                |
| Installed resolution and lockfile review                                                                          | Next.js 16.3.8, React/React DOM 19.3.0, direct Sharp 0.35.5. Sharp was already the existing pinned transitive package. No unplanned package/version expansion.                    |

Independent scan scratch is `%TEMP%/oalo-financing-security-20261013/`. The reviewer inspected the implementation owner's production evidence, without claiming to have rerun it: `test-results/financing-photo-browser.log` ends in eight passed journeys at 1440/1180/768/390 in both themes; `test-results/financing-final-browser.log` records ten passed legacy-accounting/reuse and actual JPEG/PNG lifecycle cases alongside the earlier photograph test failure. The later corrected eight-journey run supersedes that photograph failure. The saved comparison in the photograph browser spec uses direct HTTP; it is not proof of a complete filled-form financing save journey.

Final synthetic evidence comprises 24 PNGs and eight PDFs under `test-results/product-review-frames/financing-photos`. The checks assert actual uploaded/normalized hashes in report and data-image HTML, PDF output, no external browser requests, zero axe findings, no horizontal overflow and host type steps. Visual acceptance remains the independent UX reviewer/owner's responsibility.

## Dependency audit and CVE disposition

The only full-tree advisory is inherited `braces@3.0.3`, GHSA-vfj7-8cjw-p6xm, through the `apps/tasks` development-only Trigger CLI. `pnpm why braces` confirms that chain. `pnpm-workspace.yaml:51` records the owner's October 3 acceptance and November 3 revisit date; the delta does not modify that exception. The [primary advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) still lists no patched version on this review date. Production audit remains clean.

The pinned [Next.js 16.3.8 release](https://github.com/vercel/next.js/releases/tag/v16.3.8) explicitly contains the September 30 security fixes, including the [image-optimization SSRF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4). This increment uses authenticated plain image reads and data images, without remote optimizer inputs. Historical RSC RCE/DoS/source-exposure checks used the [React advisory](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components) and [Next.js update](https://nextjs.org/blog/security-update-2025-12-11), together with current registry auditing and actual lockfile resolution. No affected version was detected; this is not a guarantee against unpublished advisories.

## Remediation and final source pins

No reviewer runtime remediation was necessary. Earlier implementation fixes for native `process.env` parsing and cross-realm Sharp byte inspection were read and independently exercised by regression tests. Final PDF/CSS fixes requested by UX were also re-reviewed.

| Final reviewed file                                      | SHA-256                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/server/financing-media-service.ts`         | `ffdc1d51f78a72661205c077010095423d76a1cfc35b911c767b0a08e96b3581` |
| `apps/web/src/server/financing-media-runtime.ts`         | `ca9c537e21085bd7608f03169e4daa452425c3d912043633f757943017aa8e4f` |
| `apps/web/src/server/financing-pdf.ts`                   | `36cc75f1534af755bec4f1fcdfe2c7425fe1af939d4b2bf5af587e1b0f952a6d` |
| `apps/web/src/features/financing/financing.module.css`   | `e79301ffe4841e246b6209dc8251e3189f9d57d0c465f93b16f6dbccc475cf2f` |
| `supabase/migrations/20261013210000_financing_media.sql` | `63a525c6970166fa76391a69772c99fa51ba93ffed1780dee04f9b901146c77c` |

## Explicit limits and remaining gates

Actual PostgreSQL/pgTAP execution was unavailable locally. The 18 new pgTAP assertions and real exported-route PostgreSQL suites were reviewed as authored checks only. Required CI must prove migration application, RLS/role/foreign-reference denial, immutable records, concurrent retries, saved v2 metadata and revocation. No full canonical green CI or successful hosted artifact delivery is asserted here.

Live R2 credentials/storage, real client photo rights, hosted authentication, production retention/erasure/quota/garbage collection, lender/public release and owner visual acceptance remain open qualifications. The two per-process guards are not distributed quotas. No complete PAY product, preset catalog, identity images, public domain/QR, HighLevel delivery or customer conversion result is certified.

The read-only memory recall attempt could not access the required virtual Bash filesystem on this host; no memory was written. This did not replace the explicit task ledger, contract, source and test evidence.

Fresh Quality must evaluate the exact ledger subsets and preserve all these execution/release limits. The orchestrator retains the current-main, required-CI and MERGEABLE PR gates before declaring the branch shippable.

## Final input and test delta recheck, October 13

Fresh Security clearance remains PASS, with no new security findings, after the frozen input correction and output-test deduplication. Quality may follow this recheck once the independent UX review is clear. The original database, CI, provider, public-release and full-product limits above remain in force.

`apps/web/src/features/financing/media-input.tsx:125` now uses the existing governed `TextField` for file selection. Inspection of `packages/ui/src/components/text-inputs.tsx:41` confirms that `type="file"`, ref, accept, disabled state and event handlers reach the same native input. MIME/size and alt-text errors are fixed strings rendered through JSX and connected through the established ARIA field wrapper. This does not introduce an HTML sink, external upload target, file persistence, weaker rights confirmation or changed request/retry identity. The general uncertain-upload alert and retained selected file remain covered.

`apps/web/src/features/http/user-messages.ts:90` adds all nine media refusals as fixed sentence pairs. The new typed exhaustive list in `user-messages.unit.test.ts:70` covers dynamically forwarded codes, including missing/foreign references, withdrawal, integrity failure and unavailable upload. Messages do not disclose source hashes, storage keys, buckets or tenant ownership details.

The local `readPdfText` and `deferredSignal` helpers in `financing-output-layout.unit.test.ts:23` and `:40` retain actual PDF-stream extraction, exact image/legacy hashes, overflow/refusal assertions and the two-render concurrency/release check. No production guard, assertion timeout, configuration or suppression changed in this test refactor. The media service/runtime, HTML/output bundle, PDF, CSS and Accepted CTR-001 source hashes still match this review's original pins.

Verification attributable to this reviewer:

- `pnpm exec vitest run --project unit --maxWorkers=1 apps/web/src/features/http/user-messages.unit.test.ts`: 33 tests passed.
- `pnpm exec vitest run --project integration --maxWorkers=1 apps/web/src/features/financing/media-input.integration.test.tsx`: four tests passed, including connected field errors, rights refusal, unchanged uncertain-upload retries and six-photo/removal behavior.
- `pnpm exec vitest run --project unit --maxWorkers=1 apps/web/src/server/financing-output-layout.unit.test.ts`: 13 tests passed, including exact v1 bytes, actual JPEG/PNG embedding and concurrency release after the helper extraction.
- `git diff --check` and direct final source-hash comparison passed.

Implementation-owner evidence was separately read: `financing-input-final-build.log` records 16 successful build tasks; `financing-input-final-browser.log` records eight passed production-mode synthetic photo journeys with the new field/card checks and setup captures. The artifact directory now contains 32 PNGs, including eight photograph-setup frames, and eight PDFs. `financing-output-unit-dedup.log` records 36 passed focused tests; `financing-output-dedup-gate.log` records zero clones across 708 files. These are inspected owner logs, not additional independently executed runs.

The earlier orchestrator run in `financing-final-unit-build-overlap.log` remains a failed run: five 5000 ms timeouts occurred during concurrent build work. None is waived or counted as a pass. At this recheck, the later quiet orchestrator log `financing-final-unit.log` records 194 files and 2913 tests passed; it supersedes the failed run for unit evidence only. The other full verification projects and required CI remain the orchestrator's gates. No change to the timeout configuration or unsupported full-suite claim follows from this Security clearance.

| Final delta file                                           | SHA-256                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/features/financing/media-input.tsx`          | `9721b662f89848826cfb7fde1b8258d5d7ca196aa3d5b28a37ebfdea42ff0df3` |
| `apps/web/src/features/http/user-messages.ts`              | `04f251799453a62f016d19240cc68bf932431b5e7636d036fa277b4570371c69` |
| `apps/web/src/server/financing-output-layout.unit.test.ts` | `edc4372dd260c73e54f0c1f79031afe375c22cb75a79dd098f4ff9804e6b0645` |

## Reopened Security for FP-QA-01, October 13

PASS after independent review of the four-file zero-photo correction. No new Critical, High, Medium or Low security findings were detected. Quality identified the connected-account text-only availability issue after the preceding Security pass; its prior result is preliminary for this changed code. The orchestrator explicitly reopened Security, and fresh Quality must now re-evaluate FP-QA-01 against this final delta.

The shared predicate at `apps/web/src/server/financing-output-media.ts:12` requires schema v2, `Array.isArray(property.media)` and length exactly zero. It does not treat missing, null, non-array or nonempty media as an empty choice. This predicate is an optimization after verified-source loading, not a substitute for validation.

For site/PDF reads, `financing-output.ts:17` returns an explicit empty resolved bundle only after `readFinancingOutput` has independently authenticated the request, scoped the saved campaign, checked campaign access and verified its supported manifest, canonical hash and calculated result. `financing-http.ts:87` preserves that ordering. Required media shape remains enforced by the strict v2 manifest schema before the predicate. The renderer still checks the exact resolved bundle; private headers, HTML CSP, overflow errors and PDF concurrency remain in place.

For application page reads, `campaign-workspace-reads.ts:245` skips photo runtime construction only for that same explicit text-only predicate. `campaign-page-data.ts:217` retains principal-scoped projection, and `:260` verifies the financing source before returning its report to this branch. Nonempty reports still call the unchanged media runtime/resolver, including tenant isolation, exact normalized bytes and revocation. Missing or malformed media cannot successfully reach the storage-free return path.

Independent verification: `pnpm exec vitest run --project unit --maxWorkers=1 apps/web/src/server/financing-output-layout.unit.test.ts apps/web/src/server/financing-handler.unit.test.ts` passed 39 tests across two files. New signed embedded-session cases exercise the real authentication, handlers and page loader with only the saved-read persistence adapter substituted. They prove successful empty-v2 HTML/PDF/page reads without touching a fail-fast photo factory, unauthenticated refusal (401), three actual factory attempts and refusal for a nonempty report without R2 configuration, and missing-media refusal (503 `FINANCING_INTEGRITY_FAILED`) even after recomputing the saved hash. The malformed non-array case is established by strict-schema/source inspection; it is not claimed as a separate executed test. Existing exact v1, real image embedding, corruption/revocation, overflow and concurrency checks still pass.

`git diff --check` passed. PDF renderer, HTML renderer, CSS and Accepted CTR-001 hashes remain unchanged. This reviewer changed only this report. Owner logs `financing-zero-media-unit.log` and `financing-zero-media-dup.log` were also inspected, recording 39 passed focused tests and zero clones across 708 files. Prior 32-PNG/eight-PDF visual evidence remains representative because composition did not change, but no new browser run or full 3980-test run after this four-file fix is credited by this addendum. The scoped run validates this delta; actual PostgreSQL, required CI and PR qualification remain open.

These pins supersede earlier pins for the four changed files:

| FP-QA-01 reviewed file                                     | SHA-256                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/server/financing-output.ts`                  | `73c258b2de0b468d27507ec6cc675be8bac04e71b80ba98a8f7c26c930c6c5f1` |
| `apps/web/src/server/financing-output-media.ts`            | `7e2974e4497095b489eda813a7a70841934a7689e307e6c73dbe732cf5d9d9b7` |
| `apps/web/src/server/campaign-workspace-reads.ts`          | `feb3c07a079afff8d0cbcf58d185eaec98cdd6f906b78b178f2ff6c1f1fd0aee` |
| `apps/web/src/server/financing-output-layout.unit.test.ts` | `95f69136750c6138abac8ee28a04fc8ac595f09a5a6066b113694e4b3ad40a36` |

## Reopened Security after first PostgreSQL CI failure, October 13

PASS for the three-file corrective delta, with no new security findings. This is a source and focused-test clearance for fresh Quality; it is not a green PostgreSQL/CI or merge clearance. The reviewed base is PR #92 commit `bab5819c810efa1ba0c9e760985bb2e3c8e774bc`. The actual modified regression file is `apps/web/src/server/financing-v2.unit.test.ts`, not the nonexistent `financing-context.unit.test.ts` named in the initial shorthand brief.

The reviewer read `test-results/financing-first-ci-pg-failure.log` from run `38483753309`. At lines 2666-2668, scaffold assertion 11 reports actual 31 versus expected 29. At lines 2895 onward, two of 300 real PostgreSQL tests fail when mixed author history triggers media runtime construction without R2 configuration. The run ends with one failed pgTAP file and one failed integration step. This actual failed CI evidence is preserved and is not counted as a pass.

`apps/web/src/server/financing-context.ts:173` now accepts only the specific `R2ObjectStoreConfigurationError` in addition to the existing `FinancingMediaError` cases. The class originates from the storage client's strict configuration parser at `packages/storage/src/r2-object-store-client.ts:194`. Unknown exceptions are still rethrown. Saved sources are still verified before this catch, candidates still come from principal-bound reads and filter to the author, and creator/admin eligibility is unchanged. A candidate with unavailable photo storage is removed from usable `previous` and explicitly placed in `unavailablePrevious`; it is not converted to a text-only snapshot, reattested, marked ready or silently stripped of photographs. The immutable saved record remains unchanged. Output/save/current-rights checks are untouched by this correction.

The new tests in `financing-v2.unit.test.ts:60` exercise legacy and facts-only reuse with a fail-fast media factory, mixed history with either absent configuration or corrupt photo bytes, the explicit unavailable-candidate label, an unchanged saved photo record and propagation of the exact unexpected exception. The saved-read source and private filesystem fixtures remain real; factory failure is deliberately injected to reproduce this boundary. The recorded first RED in `financing-context-ci-red.log` fails on the named configuration exception, and the subsequent owner GREEN in `financing-context-ci-green.log` records 63 passed focused tests.

`supabase/tests/phase0_scaffold.pgtap.sql:94` changes only the exact inventory expectation from 29 to 31 and names the two additive financing media tables. The query, `plan(22)`, transaction rollback, exact equality assertion and all role/ownership, enabled/forced RLS, foreign-key-index and privilege assertions remain unchanged. No assertion is removed, skipped, relaxed to an inequality or suppressed. Both new tables are tenant-scoped in the reserved migration already reviewed above. Local pgTAP execution is still unavailable, so the corrected assertion remains awaiting the next real CI run.

Independent verification: `pnpm exec vitest run --project unit --maxWorkers=1 apps/web/src/server/financing-v2.unit.test.ts apps/web/src/server/financing-handler.unit.test.ts apps/web/src/server/financing-output-layout.unit.test.ts apps/web/src/server/financing-media.unit.test.ts` passed all 63 tests across four files. This includes the new error classification cases and existing legacy hash, actual image, revocation, permission and resource-bound checks. `git diff --check` passed. The reviewer edited only this report; no local database, provider, source/test mutation, build, commit or push was performed.

Fresh Quality must evaluate these exact source pins and the CI correction before the orchestrator sends the updated branch through required CI. Earlier full-suite and visual evidence concerns the prior base and is not silently promoted to post-fix full-run evidence.

| PostgreSQL CI correction file | SHA-256 |
| --- | --- |
| `apps/web/src/server/financing-context.ts` | `98275cf57418a816d06f304c13c123565d3021f177ee87d6e61fa6771c9182c3` |
| `apps/web/src/server/financing-v2.unit.test.ts` | `43925ba2d407d4e339afb93b09bb6a5df2a43d7a7f9e34f4ca51909e494c51f1` |
| `supabase/tests/phase0_scaffold.pgtap.sql` | `45e89acf5c3a96a1aa21bf9c0d4bb2ea1ff9853ae1148a1ebc66d26216e935c1` |
