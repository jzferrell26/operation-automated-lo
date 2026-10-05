# Security self-review: private campaign packages

Date: October 5, 2026. Reviewer: Chief, direct sequential self-review, not an independent agent audit. Scope: Batch B against `0b47805e` on `chief/campaign-package-2026-10-05`. This report precedes the Batch B quality report. Batch A's earlier reports remain historical records.

## Verdict

No unresolved new Critical or High finding was detected in the reviewed package implementation. Two preparation concurrency defects and a database-level generation-permission gap were corrected and verified against isolated PostgreSQL. This is approval of the private-review implementation for code review, not authorization for public distribution, provider activation, or unrestricted customer-data collection.

## Scorecard

| Area | Result and evidence |
| --- | --- |
| Identity and authorization | `property-package-http.ts:54-83` authenticates and checks the mutation role before accepting generation input. `property-package-service.ts:68-92` verifies tenant ownership and the saved preparation version before package access. Hosted unauthenticated reads, cross-tenant reads/writes, viewer generation, and bad CSRF are refused in tests. |
| Database defense | `20261005160000_property_campaign_packages.sql:33-64` forces RLS, scopes reads by tenant, scopes inserts by current actor and active creator/admin binding, checks the actual source version, and grants no UPDATE/DELETE. A direct SQL insert as a viewer fails independently of the API. |
| Immutable data and retries | `property-package-store.ts:67-94` inserts one whole package with first-committer semantics. `property-package-service.ts:163-174` verifies the returned source tuple and version number; `property-package-render.ts:84-100` verifies byte sizes and hashes on reads. Concurrent package generation and preparation saves pass against PostgreSQL. |
| HTML, SVG, and URL safety | User text is escaped; the QR symbol is generated locally, never supplied by a request. The HTML contains no script, external asset, or form. Its CSP disallows execution and network access. `property-package-service.ts:22-48` uses configured application origin, not Host headers, and rejects unsafe origins. |
| Privacy and exposure | Every output requires a verified session and tenant access, and uses private/no-store/noindex/no-referrer response headers. The QR payload contains only the opaque private preview address, not a bearer token or personal details. Private partner email and phone never enter the output snapshot. |
| Financial/provider side effects | No provider request, budget, billing change, or message is added. Draft generation remains possible while marketing permission is unconfirmed, but every output carries internal-review restrictions and the missing permission is explicit. No approval or public publication is inferred. |
| Dependencies | Only a workspace rendering dependency and narrow QR export were added. No external dependency version or advisory exception changed. The fresh production audit reports no known vulnerabilities; the full audit retains one previously accepted development-only high advisory. |
| Resource bounds | Generation accepts a 2,048-byte command and validates bounded saved inputs. Packages are limited to 1.5 MB, PDFs to 12 pages, and active rendering to two jobs per process. Failure releases the slot, saves no partial package, and preserves the campaign. |

Unless otherwise prefixed, code paths in this report are under `apps/web/src/server/` and the migration is under `supabase/migrations/`.

## Findings corrected

**SEC-PKG-01, High, incorrect concurrent version evidence:** the inherited `createCampaignVersion` path checked for a retry before taking the campaign aggregate lock. Two first writes could both miss, after which the losing write returned version 2 even though only version 1 existed. `packages/application/src/campaign-foundation.ts:249-279` now takes the existing allocation lock before looking up the version reference. The handler returns the persisted record, not a speculative local version. Both exact and altered concurrent preparation requests are covered by real-PostgreSQL route tests; altered requests return 409 instead of a generic 503.

**SEC-PKG-02, High, insufficient database write-role restriction:** the initial package INSERT policy checked tenant and actor identity but relied on the API to exclude viewers. The final migration adds an active `location_admin` or `creator` binding check. Store methods independently check mutation authority. The new direct SQL viewer test confirms that bypassing the handler still cannot create a package.

**SEC-PKG-03, defensive integrity correction:** a successful commit is no longer checked only for valid output hashes. Its returned location, campaign, version, source hash, and source version number must match the requested saved source. A test that returns a validly hashed package with a different source version number is refused.

## Existing limits and release follow-up

The two-job limiter is in-process, not a distributed workspace quota. Existing Batch A creation quotas and the product's customer-data retention/export/deletion work remain release concerns for broader customer rollout. This batch does not claim to close them. A package is an internal review draft, not an approved marketing artifact. Do not distribute its PDF, copy, or QR to customers merely because generation succeeds.

The static security skill watchlist is dated April 24, 2026 and is stale. It was not used as a current comprehensive CVE assessment. Fresh package audits were run. The existing exact `braces` advisory exception remains documented in `pnpm-workspace.yaml:42-51`, including its owner decision and revisit date; no new exception was introduced.

## Scans and evidence

The canonical security scan completed. Its rules-file Unicode scan found no zero-width or bidi characters, and its pattern scan found no newly introduced hardcoded secret, command-execution sink, SQL interpolation sink, or API payload log. Matches in security-test fixtures, skill templates, the pre-existing static theme bootstrap, and synthetic theme-preference tests were inspected as context rather than treated as newly introduced exploits.

`pnpm audit --prod` returned exit 0 with no known vulnerabilities. `pnpm audit --audit-level high` returned exit 0 under the existing single ignored high-advisory policy, not a claim that the entire development graph is vulnerability-free. Evidence is in ignored `tmp/package-security-scan/`, `tmp/package-audit-prod.log`, and `tmp/package-audit-all.log`.

The final migration was applied to a newly created disposable database, `oalo_test_property_package_final`, in the dedicated local `oalo-package-proof-20261005` container running PostgreSQL 17.6. No shared stack was reset and no hosted database was modified. The six selected real-database regression files passed all 109 tests, including the ten package-specific cases. The final offline gate result and rendering inspection are recorded in the companion QA report.

## Deployment position

Apply the additive migration through the normal migration-role release process before enabling hosted package generation. A missing package table leaves the campaign readable with an explicit materials-unavailable state; it does not masquerade as an empty or generated package. Review [deployment notes](../deployment.md) before merging or deploying. No hosted release or independent security certification is claimed here.

## Continuation closeout review

The interrupted continuation left additional UI transport changes after the earlier QA run. That earlier result does not qualify the final tree by itself. This security re-review precedes the refreshed QA evidence and includes the recovered staged and unstaged changes rather than discarding or replaying them.

`apps/web/src/features/property-campaigns/property-package-panel.tsx:59-71` still validates the server response and matches its campaign, version and source hash before exposing output links. It now passes the confirmed summary to `property-campaign-screen.tsx:29-54` instead of starting a redundant server refresh. The screen's client boundary receives only the existing explicit page projection, not a database record, credential or private partner contact list. The parent screen is keyed by campaign version, preventing a different version from inheriting the previous version's local package state.

`features/property-campaigns/package-model.ts:3-6` performs a full read-only page reload only after an explicit click on the unavailable-state recovery control. It changes no campaign or provider state. No authentication, authorization, storage, output-content, or publication boundary was weakened by this transport correction. No additional Critical or High finding was detected. The companion QA report records the final complete-tree tests and whether the previously observed stream error recurs.
