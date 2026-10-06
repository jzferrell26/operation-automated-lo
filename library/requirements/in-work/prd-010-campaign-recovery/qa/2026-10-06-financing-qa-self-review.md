# QA self-review: financing report increment

Date: October 6, 2026. Reviewer: Chief, direct sequential self-review after the [security review](2026-10-06-financing-security-self-review.md). This is not independent-agent review.
Base: `0d2187a5`. Branch: `chief/financing-report-2026-10-06`.

## PR #81 conflict-resolution addendum

After PR #80 merged, PR #81 was rebased from `72aa7fd7` onto `main` at `4afdda8a`. The original feature commit is preserved at `backup/pr81-before-rebase-20261006-0543`. All three explicit conflicts were additive documentation sections; both the studio and financing entries were retained and their merge status corrected. The property form and tests combine the live summary with the financing entry rather than replacing either. Main's exact lockfile, scoped dependency patches, Home source, design tokens and committed screenshot references are retained.

Validation after the scoped security review: frozen installation, full workspace type checks, lint, zero-duplication and package-boundary/product-type/secret audits passed. All **30 selected browser tests passed**, covering the studio and local summary, financing save/PDF/reuse, property-package generation, and screenshot-date helpers. The new cross-feature regression follows Home to property preparation and then to financing at all four widths in both themes without an unintended save. The resulting mobile form capture was inspected.

Two combined six-project test runs each reported 3,859 passing tests, one existing skip and one 5-second timeout in an existing source-scan guard. The failing guards were different between runs. Both then passed in isolated one-worker reruns with their original timeouts unchanged: six transport/security tests and seven client-import boundary tests. No assertion, test timeout, screenshot tolerance, skip policy or source-scan scope was weakened. This is not represented as a single fully green aggregate run; the fresh PR CI must qualify the rebased tree independently.

The financing implementation itself is byte-identical to the original feature commit. No formula, database schema, authentication boundary, provider setting or hosted data changed. This addendum records the conflict repair, not new public-product or production-release approval; the original implementation review and restrictions follow.

## Outcome

The implemented slice is a working private financing report, not a finished consumer flyer product. A saved comparison contains one-to-five scenarios and both professional identities. Monthly housing and cash-to-close values are calculated on the server, persisted in the campaign version and reused across the report, private HTML site and PDF. The author can reopen the campaign and reuse its prior settings without designing a layout or reconstructing cost items.

The final photo-led flyer, complete media profiles, reviewed preset library, exact-output approval, public link/QR, domain onboarding and HighLevel lead handoff remain later increments. No full PAY-001 or five-funnel completion claim follows from this work.

## Local verification

| Check | Current evidence |
| --- | --- |
| Type checks | Passed across workspace and tooling. |
| Lint | Passed with no errors or warnings. |
| Unit tests with existing coverage gates | 2,803 passed. |
| Integration, contract/security, component and visual-contract tests | 1,046 passed and one existing skip retained. The configured projects were run together; this is not a preview-browser count. |
| Real PostgreSQL | 66 passed across eight selected suites, including all nine new financing-route cases, property packages, campaign creation/read/approval and version reuse. |
| Complete synthetic browser suite | 215 passed, 22 existing skips retained, exit 0. Includes all eight financing journeys at 1440, 1180, 768 and 390 in both light/dark themes. |
| Dashboard-preview browser suite | All 16 passed, exit 0. |
| Preview contract | One passed in the explicit `e2e-preview` project. |
| Production workspace builds and sample-ad scan | Passed, exit 0; no sample ad traces in production build output. |
| Rendered PDF | All three pages of a representative generated report were rendered and inspected; totals matched text extraction. Unit tests parse PDF bytes, compare exact repeat bytes and exercise five-option landscape and unsupported characters. |
| Duplication | Passed, zero clones. Shared Select and signed-session fixtures replaced duplicate test setup. |
| Dependency audit | Production audit clean. Full audit passes under the pre-existing one development-only high advisory exception; two newly identified transitive advisories were patched, not ignored. |
| Package boundaries / secret boundary / product type checks | Passed. No forbidden dependency edges, leaked public secret or explicit `any`/CommonJS/catch swallowing introduced. |

All configured offline verification components passed on the final implementation. The synthetic browser suite used the isolated equivalent configuration at port 3136 because the canonical port was shared by another active workflow. The literal aggregate `pnpm verify:offline` command is therefore not claimed as a completed run; its component results, including the final full browser, preview, audit and build results, are individually observed. Full seeded database/pgTAP and Linux screenshot qualification remain CI work.

Evidence files are under ignored `tmp/financing-*` and `test-results/financing-browser/`, especially `financing-browser-final.log`, `financing-dashboard-final.log`, `financing-build-final.log` and `financing-postgres-qualified.log`. None contain a live customer or actual lender quote. Final formatter, type, lint, duplicate, package-boundary, secret, product-type and dependency checks passed. The disposable task-labelled PostgreSQL container was stopped after the qualified run; no other workflow's process or database was stopped.

## Functional acceptance

The independent amortization fixture for a fictional 320,000 loan, 6% fixed note rate and 360 payments yields 1,918.56 in principal and interest. Adding the supplied monthly housing components produces 2,568.56. The separate supplied costs, credits and deposit produce 84,500.00 due at closing. Both values are asserted through the actual save/read/output handlers. Browser tests use a distinct 4,000-cost/no-credit fixture with 84,000.00 cash, so the report is not merely a hardcoded expected example.

The suite covers zero note rate, half-cent down-payment rounding, financed versus cash-paid program fees, prior-paid costs/deposit subtraction, unknown versus zero, excess credits, unsupported cash-back, duplicate costs/scenarios and one-to-five program variants. Unsupported structures and explicit browser authority fields are rejected by strict schemas. No APR is derived from the note rate and no program-fee percentage is guessed.

Uncertain save responses retain inputs and their retry key. A changed replay returns 409 instead of overwriting the report. Simultaneous PostgreSQL saves return one version, not duplicate campaigns. Later workspace identity changes leave existing report/PDF contents unchanged. Reuse now preserves an exact intraday quote expiry; the security review's defect was fixed and has a regression test.

## Visual and interaction review

The builder and report use the existing light/dark design tokens and shared form controls. Main groups, number alignment and scenario hierarchy are readable. On mobile, the comparison becomes stacked scenario sections without omitting financial rows. The private site is an original responsive HTML layout, not an embedded PDF. It uses a fixed light reading surface, no remote resources and no public lead-capture control.

The generated print report has measured wrapping, repeated private-draft labels and a separate quote/cost appendix. A single-scenario example currently uses three pages. That is acceptable as an internal detailed report, not as final sign-off for the compact photo flyer. The visual treatment is not represented as the owner's approved production design. Existing Linux screenshot references are not updated by this feature.

| Review axis | Finding |
| --- | --- |
| Information hierarchy | The property and two financial totals lead, followed by the complete assumptions, cash and housing groups. |
| Data consistency | UI, site and PDF share `financingGroups` over the saved result; renderers do not independently calculate totals. |
| Responsive/readability | New-flow browser checks assert no horizontal overflow and axe-clean screens/site across four frames and both app themes. |
| Honest state | Private notices, missing/expired quote warnings and unavailable media are visible. No approval, publication or successful provider claim is fabricated. |
| Print completeness | No silent text truncation; oversized or unsupported-font documents fail explicitly and retain the saved report. |
| Final photo/product sign-off | Still open. This report is not the completed co-branded photography/template system. |

## Verification incidents and what they mean

Initial full browser attempts on an isolated port failed because inherited security guards in several specs hardcoded port 3100, and an empty-workspace helper swapped the default runner's file instead of the isolated runner's file. None of these failures was hidden or waived. A shared helper now derives the actual project origin, and the optional store override is restricted to this checkout's test-results directory. The complete final 215-test passing run verifies the correction without allowing off-origin traffic or changing the default runner behavior.

A direct attempt to run every PostgreSQL file without the canonical gate's credential seeding exceeded the local container's reserved connection budget and failed inherited authentication-seed expectations. That attempt is not a successful full database gate. The 66 qualified cases above ran with one worker against the dedicated disposable database. Full seeded PostgreSQL/pgTAP/authenticated-review qualification remains for CI; there was no hosted reset or migration.

The initial duplicate-code check found copied test setup, and the privilege-boundary scan flagged a prohibited role name inside a new negative-test pattern. Both were fixed without relaxing the scans: setup moved to shared test helpers, and the new pattern forbids any role-changing statement. The actual private save/render implementation did not gain privileged SQL.

PR #79's inherited CI screenshot difference is separately known. It must not be counted as fixed by these local text-report checks or replaced with unrelated branch evidence. The new PR's Linux/seeded checks are the release evidence for the merged base and this change.

## Release disposition

Keep the PR draft until the configured CI, authenticated review-runtime evidence and feature review are complete. No new database migration is required; the host needs the already-existing campaign schema. This increment does not authorize real customer data while the inherited retention/export/deletion policy remains unresolved, and the distributed creation/rate-limit follow-up remains a release hold. No pricing, DNS, hosted environment, ads, messages, provider activation or billing was changed.

Once financing versions have been saved, rollback builds must retain support for that manifest variant. No migration does not mean that a pre-financing binary can parse newly stored records. Roll forward or disable creation in a compatible build rather than deleting data or reverting the reader.
