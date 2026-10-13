# Security audit: October 13 completion batch

## Executive summary

- Branch: `codex/completion-reconciliation`, base `728d5f0`.
- Plan: `COMPLETION_LEDGER.md`, current execution batch only.
- Coverage: scoped Next.js/React/TypeScript source and dependency review, including immediate authentication and saved-brand authorization neighbors. This is not an audit of the entire legacy application or a hosted release qualification.
- Findings: zero Critical, one High dependency gate finding remediated, zero new Medium or Low findings. No unresolved Medium-or-higher finding remains in the assigned batch.
- Gate: cleared to proceed to Quality. Security ran before Quality; no current-batch QA report was present on entry.

The dependency scan identified the inherited Next.js 16.3.6 advisory gate, and the assigned dependency agent upgraded it to 16.3.8. Independent re-evaluation confirmed a clean production dependency audit and intact preparation, authentication, text-rendering and public-art boundaries. The fifteen creatives remain pending review; real launch, listing/homeowner outcomes and the authenticated hosted walkthrough remain open.

The Weapon watchlist was last refreshed April 24, 2026, 172 days before this review, beyond its 120-day freshness threshold. Fresh registry audit and official Next.js/React advisory sources supplemented it. Refresh the canonical Weapon intelligence separately; no Guild source was edited here.

## Surface coverage checklist

### Next.js and React application surface

None detected in the batch. Reviewed `features/webinar-ads/**`, its Ads library insertion, Campaigns discovery edits, generator, thirty public PNGs, unit/integration/browser test additions, librarian review, ledger, final project-map update and library index corrections. Excluded generated `apps/web/AGENTS.md`, `CLAUDE.md` and `next-env.d.ts` as assigned. No new handler, Server Action, form submission, approval control or provider dependency exists in the preparation component.

The new client input renders as React text children at `apps/web/src/features/webinar-ads/pack.tsx:298` and `:326`. There is no raw HTML sink, URL construction from entered words, execution sink, browser storage write or telemetry call. The final UX changes add static classes, wrapping and a persistent announcement region without changing authorization or data flow.

### Authorization and tenancy

None detected. The existing page checks its principal and redirects an unauthenticated request at `apps/web/src/app/(authenticated)/marketing/campaigns/library/page.tsx:43`. Its preview path remains constrained by the existing synthetic-demo guard. The new component receives the existing display-only advertiser band. The underlying preferences read uses both `location_id` and `user_id` at `apps/web/src/server/workspace-preferences.ts:40`, inside its tenant transaction; the batch changes neither query nor authority.

The strict preparation schema at `apps/web/src/features/webinar-ads/model.ts:30` requires `pending-review` and rejects extra approval fields. All fifteen records fail the approved-library schema, are absent from its production lookup, and receive the actual application refusal of `missing`. Existing approved/sample library controls are retained.

### Secrets and environment

None detected in the assigned changes. The repository secret audit passed across six source roots and the public environment boundary. The deterministic rules-file scan found no hidden Unicode. No environment variable, credential, deployment configuration or sensitive document was added to the new feature or public artwork.

### Webhooks, payments and third-party intake

None detected; no new surface. The pack has no campaign write, approval, spend, HighLevel, Meta or Stripe call. Copy writes text to the clipboard only after the user's action at `apps/web/src/features/webinar-ads/pack.tsx:55`, with a generic failure message and pending-review/destination notes. It never reads the clipboard. Navigation targets are fixed internal editor/discovery routes.

### Dependencies and supply chain

One inherited High registry gate finding resolved, detailed below. Final declared, lockfile and installed Next.js versions agree at 16.3.8; React/React DOM remain 19.3.0. The lockfile diff replaces only the Next.js/env/SWC family, with matching package declaration and integrity changes. No new advisory ignore or lifecycle script was introduced.

The full audit exits zero with only the pre-existing owner-accepted development-tool `braces` exception, `GHSA-vfj7-8cjw-p6xm`. This is recorded in `pnpm-workspace.yaml` and protected by existing accepted-advisories tests. It is not a new batch exception. Production audit reports zero advisories at every severity.

### Headers and transport

None introduced by this batch. Existing security headers and routing configuration were not changed. New image/download URLs use same-origin PNG paths, not remote images or new transports. Existing application-wide CSP/deployment policy is outside this scoped diff clearance; no full legacy configuration certification is asserted.

### AI-generated code patterns, injection and file paths

None detected. Catalog records are strictly validated, unique and limited to fifteen. Paths must match the exact creative id and shape at `apps/web/src/features/webinar-ads/model.ts:24` and `:43`; digests require 64 lowercase hexadecimal characters. Traversal, remote paths, another creative's path, active status and approval fields are rejected by negative tests.

The generator reads repository-authored briefs only. It validates ids before file creation, uses fixed output roots/dimensions, escapes SVG text, writes PNGs with a 1 MiB limit and records byte SHA-256. It performs no fetch, shell execution or customer-data read. This generator is a local authoring tool, not an untrusted upload endpoint.

### PII, logging and data handling

None detected. Public artwork contains original educational text/illustrations, not saved customer identity or borrower records. All thirty files are regular files within the public pack root, with inspected PNG format/dimensions, no metadata and matching recorded digests. Artwork downloads use these validated paths and derived filenames at `apps/web/src/features/webinar-ads/pack.tsx:273`.

Local drafts remain in component state. Text controls have limits of 60/300 characters; entered words are not submitted, persisted or appended to URLs. The saved advertiser band is rendered for its existing authorized viewer and is not incorporated into the generic downloadable PNGs.

## Findings detail

### HIGH: inherited Next.js dependency advisory gate

- Location: `apps/web/package.json:22`; matching Next.js importer/package/snapshot entries in `pnpm-lock.yaml`.
- Original evidence: `"next": "16.3.6"`; live `pnpm audit` reported `GHSA-cjq9-62q9-8jv4` / `CVE-2026-94483`, affected `>=16.0.0 <16.3.8`, patched `>=16.3.8`.
- Surface: dependency security, Image Optimization SSRF advisory.
- Exposure qualification: the [maintainer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) states that the described exploit requires configured remote image patterns. Current `next.config.ts` has none, and this pack uses plain local images. No exploitable SSRF was reproduced. The inherited vulnerable-version registry gate was still resolved rather than suppressed.
- Remediation: the dependency owner changed Next.js to 16.3.8 and updated only its lockfile family. This reviewer independently checked the final diff, installed version and audit result.
- Status: fixed in this session. No runtime security code edit was necessary.

No Critical findings. No new Medium findings. No new Low findings.

## Remediation summary

| Severity | Count             | Fixed this session | Unresolved in batch |
| -------- | ----------------- | ------------------ | ------------------- |
| Critical | 0                 | 0                  | 0                   |
| High     | 1 dependency gate | 1                  | 0                   |
| Medium   | 0                 | 0                  | 0                   |
| Low      | 0                 | 0                  | 0                   |

The reviewer wrote only this report. Dependency and UX changes were made by their assigned owners.

## Re-evaluation

Completed a fresh pass of the assigned final source, authorization neighbors, generator/art boundaries, dependency diff and final narrow UX changes after remediation. Verification:

| Check                                                                  | Result                                                                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Weapon `scan.ts`, scratch destination outside repository               | Re-run after patch; production dependency metadata all zero; no rules Unicode; no scoped vulnerable-pattern hits |
| `pnpm audit --audit-level=high`                                        | Exit 0; only existing accepted development-tool exception                                                        |
| `pnpm audit --prod --audit-level=high`                                 | Exit 0, no known vulnerabilities                                                                                 |
| Installed Next.js query                                                | 16.3.8                                                                                                           |
| `node tooling/scripts/audit-secrets.mjs`                               | Passed                                                                                                           |
| Webinar model plus accepted-advisories unit tests                      | 28 passed, including six pack schema/art/approval-boundary tests                                                 |
| Pack plus Ads library page integration tests, repeated on final source | 25 passed                                                                                                        |
| `git diff --check`                                                     | Passed                                                                                                           |

The model tests verify every artwork digest, bounds, dimensions, file containment and metadata. Integration tests verify no fetch while choosing/editing/reviewing/copying/downloading, and retain the production unsigned-user redirect and existing library behavior. Browser test source was reviewed, including final long-string/multiline additions; full browser/build/type verification is owned by the parent and is not claimed as independently executed by this reviewer.

### Final disclosure CSS recheck

The parent reported that its eight-case browser matrix found disclosure contrast of 2.01 on the fixed white square-art brand band in dark theme. Before Quality finalized, the assigned ads owner added `.band .disclosure { color: var(--ad-band-ink, var(--tx-strong)); }` at `apps/web/src/features/campaigns/components/ad-creative.module.css:152`, with an explanatory comment and one focused regression test. The selector overrides the host preview paragraph color using existing artwork variables. This is an accessibility correction; it introduces no security finding, external asset, dynamic input, authentication change or approval/provider behavior.

Security reopened and reviewed the exact final shared-CSS delta and test. The webinar model tests now pass seven of seven; the shared brand-band plus pack integration tests pass thirteen of thirteen; `git diff --check` remains clean. The parent also reported 3,940 passing tests with one skip across its six Vitest projects and a successful Next.js 16.3.8 build before this last CSS fix. Those broad results are attributed to the parent. The post-fix browser matrix and build remain the parent's verification responsibility; this scoped security clearance does not claim their result.

Fresh primary sources also consulted: [Next.js advisories](https://github.com/vercel/next.js/security/advisories), [React RSC follow-up advisory](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components). The stale Weapon's earlier patch thresholds were not used as the sole dependency-clearance evidence.

### CI correction recheck

Security reopened before the follow-up source correction commit and before fresh Quality finalized. The reviewed uncommitted delta contains only `margin: 0` on the Campaigns tool title/description, an exact Ads library region scope for the existing browser status assertion, and completion-ledger notes about read-only Vercel variable-name metadata and initial failed CI. No screenshot baseline replacement was included at this checkpoint.

None detected. The two CSS declarations introduce no dynamic input or security control change. The browser assertion still verifies the expected refinance status, now within its intended region. The ledger records environment key names only, including the absence of two names in the inspected inventory, without credentials, variable values or claims of successful live lookups. It preserves initial CI failures and pending canonical capture review rather than marking failed qualification accepted.

`git diff --check` passed on this delta. The parent reports 30 Campaigns interaction tests, 56 design/control tests and the targeted browser test passing; those results are attributed to the parent and were not redundantly rerun by this reviewer for two margin declarations and one locator correction. Zero unresolved Medium-or-higher security findings remain. This clearance applies to these source corrections; subsequent baseline changes or other runtime changes require their own applicable review. Proceed to fresh Quality for this correction cycle.

### Final baseline and planning-document recheck

Security reopened in the primary checkout before fresh Quality for the final PR #90 baseline/docs-only delta. No runtime, browser-test source, dependency or configuration edits occurred after the source-correction clearance. Excluded generated agent instruction files and the isolated homeowner/financing worktrees; this reviewer still owns only this primary report.

Independently confirmed exactly 64 modified PNGs in eight sets of eight: synthetic Campaigns empty/populated, account Ads library all/one-topic/real-catalog, account Campaigns all-states/empty-account, and approved campaign detail. All 64 destination SHA-256 hashes match their respective files in `test-results/canonical-chromium-corrected/` or `test-results/canonical-review-corrected/`. All decode as PNG; none has EXIF, XMP, IPTC or comment metadata. No other baseline set or runtime file is in this delta. A read-only GitHub run query independently confirms canonical run `38462525903` concluded successfully on `codex/completion-reconciliation` at full head `3004b5dc7e31931ba4a49c1cc896ed78cd87c828`.

Reviewed the UX acceptance/provenance notes and directly opened representative approved-detail desktop and synthetic Campaigns mobile images. The inspected images show fixture/sample identities, sample campaign content and masked dates, with no customer record, credential or session token visible. Existing capture source identifies the account/database as disposable seeded review data; the displayed NMLS values match its explicit test-brand literals. The 56 feature-image replacements and eight separately attributed historical date-mask refreshes change no runtime approval or launch control. This security pass verifies byte provenance, metadata, fixture source and representative visible content; it does not claim independent exhaustive visual inspection or customer visual acceptance of every frame.

Reviewed the complete new Draft next-wave plan and ledger/UX-report delta. No secrets or client PII detected. Key-name-only environment metadata remains distinct from deployed values or live lookup evidence. The documents preserve initial CI failures, identify successful canonical write-mode capture separately from the still-pending post-update comparison, and leave actual launch, hosted access, provider delivery and isolated next waves incomplete. The new unnumbered plan grants no fabricated lender approval, credentials or migration number.

`git diff --check` passed. No new or unresolved Medium-or-higher security findings. Cleared for fresh Quality on this exact baseline/docs delta; final comparison CI, PR mergeability and hosted/customer/provider qualification remain separate parent-owned evidence.

### Capture-only approval timestamp correction

Security reopened in the primary checkout before subsequent fresh Quality for the three-file delta: `tests/browser/helpers/design-quality.ts`, `tests/browser/screenshot-date-stability.spec.ts` and `COMPLETION_LEDGER.md`. No runtime, dependency, environment, CI permission or baseline image changed at this checkpoint.

None detected. The helper extends its explicit selector list only to library-ad approval/version `<time>` labels and the approved launch-step-3 decision card. New timestamp labels must have a plain single text node, a readable date shape and an ISO timestamp attribute. All selected nodes are validated before any mutation; existing normalization markers are refused and preserved. During capture only, those labels use `Oct 4, 2026`. Header/list normalization is retained. `datetime`, clocks, source records, approval status, nearby words, unrelated/retired/earlier-flow content and product storage are unchanged. Cleanup restores owned labels on capture failure and no longer sweeps unrelated marked nodes.

Reviewed the three new regression tests and the recorded RED/GREEN evidence. `test-results/timestamp-capture-red.log` shows all three new tests failed against the original helper; `timestamp-capture-green.log` records all eight existing/new tests passing after the fix. These are Browser Guardian execution results inspected by this reviewer, not an independent rerun. The tests exercise October 13 and future-year labels, compare resulting pixels, retain actual timestamp attributes, preserve unrelated content, reject malformed/missing timestamps before mutation, restore failures, preserve another capture's marker and still detect a surrounding font/layout change. This is bounded date-label stabilization rather than replacing the whole approval card or masking its content.

The ledger preserves failed comparison run `38469092751`, separates underlying database success from account-browser comparison failure, and explicitly leaves final canonical refresh/full comparison open. Its independent homeowner/financing notes contain no secret value or false completed-release claim. `git diff --check` passed on the reviewed delta. Zero unresolved Medium-or-higher security findings; cleared for subsequent fresh Quality. No refreshed image or full-CI success is certified by this appendix.

## Next step

Invoke Quality against this reviewed batch, then the orchestrator's code/repository review and required CI/build/browser checks before any ship claim. Do not infer approval, provider launch, hosted access or completed listing/homeowner reports from this security clearance. The authenticated hosted walkthrough still needs the user's sign-in.

## Stable-date baseline and provenance closure at 5e9ac27

Fresh narrow Security review in the primary checkout, before fresh Quality for this baseline/docs cycle. Reviewed source head `5e9ac27f0ea83b25b9680e1321338fbd15ea63e8` and its uncommitted 72-PNG replacement delta, completion-ledger checkpoint and UX report append. Prior source Security/Quality clearances remain historical checkpoints; this appendix adds no runtime remediation after them. This reviewer changed only this existing report. Generated untracked agent files and the independent homeowner/financing worktrees remain outside scope.

### Independent verification

| Check                       | Result                                                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exact current PNG inventory | 72: eight synthetic permission-restricted detail frames, 24 account detail frames (already-decided, approved, ready), and 40 account page frames (ad-retired, approved, library-notice, newer-version, sent-back); each state has four widths and two themes |
| Canonical bytes             | Independently recomputed SHA-256 for all 72 destinations and same-name files under `test-results/canonical-chromium-stable-approval/` or `test-results/canonical-review-stable-approval/`; every pair matches                                                |
| PNG safety                  | All 72 fully decode with Sharp; file widths match filenames; every file contains only `IHDR`, `IDAT`, `IEND`, with no textual/EXIF metadata or trailing payload                                                                                              |
| Branch inventory            | Independently counted 128 unique PNG changes against `origin/main`: 56 intentional feature frames plus 72 capture-date/historical-header frames. The approved-detail eight were already among the earlier 64 and are counted once                            |
| Excluded candidates         | All eleven unrelated-only synthetic and ten unrelated-only account candidates in the two stable-approval diff manifests remain outside the current replacement inventory                                                                                     |
| Canonical run               | Read-only `gh run view 38474385754` independently confirms success at the full source SHA above for both Synthetic screens (chromium project) and Account screens and guided setup (review project)                                                          |
| Delta boundaries            | Git lists only the 72 PNGs, `COMPLETION_LEDGER.md` and the existing UX report before this appendix; no new runtime, test source, dependency, configuration or provider delta                                                                                 |
| Diff hygiene                | `git diff --check` passes                                                                                                                                                                                                                                    |

### Security surfaces and evidence limits

Authorization, tenancy, input handling, webhook intake, secrets/environment routing, dependencies and headers: no new affected surface in this PNG/docs delta, and no new finding detected. Existing source and dependency qualifications above remain unchanged. No broad build, unit suite or production dependency audit was rerun for these image bytes; this appendix does not represent a fresh whole-application audit.

PII/logging/storage: none detected in the inspected delta. Directly opened representative synthetic permission-restricted desktop, account sent-back desktop and approved-detail mobile replacements. They show sample artwork, test identities, test-brand numbers and masked dates, with no visible credential, token or customer record. Their provenance is supported by `apps/web/src/fixtures/ui-foundation/synthetic-ui.ts:17-31`, the disposable seeded-review declaration at `tests/browser/review/design-quality.spec.ts:35-50`, explicit invented account name/company at `tests/browser/review/helpers/guided-setup-journey.ts:40-41`, and test NMLS input literals at `tests/browser/review/empty-account.spec.ts:135-136`. This reviewer inspected representative visible content and all file bytes/metadata, not every frame's text independently.

Evidence honesty: none detected. The UX append names the exact accepted intact frames, separates historical schedule-header differences from new timestamp-label normalization, discloses incidental control raster variation in one synthetic and fourteen account frames, and excludes unrelated-only candidates. Its full pairwise visual/RGBA review is attributed to the independent UX reviewer. Source/destination hash equality confirms no mixed, cropped or synthesized replacement. The launch-step approved frames are outside the replacement inventory; their RGBA identity is UX evidence, not an independent claim by this Security reviewer.

Reviewed ledger and PR-body provenance language. They retain final comparison CI, full D9/owner visual acceptance, authenticated hosted/customer access and provider activation as open qualifications. Successful canonical write-mode capture does not establish a passing post-replacement comparison, real lender approval or live delivery. Existing failed comparison checkpoints and independent increment limitations remain disclosed.

No Critical, High, Medium or Low findings introduced by this scoped delta. No remediation required. Cleared for fresh Quality on these exact baseline/docs changes. The parent retains final comparison CI, PR conflict/mergeability verification, repository/code review and owner/live qualification before any ship claim.
