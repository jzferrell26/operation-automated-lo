# Security self-review: financing report increment

Date: October 6, 2026. Reviewer: Chief, direct sequential self-review. Base: `0d2187a5`.
This is not independent security certification. Scope is the financing comparison branch, not the entire inherited product.

## PR #81 rebase-only review

The October 6 conflict repair rebases the original `72aa7fd7` onto `main` at `4afdda8a` (merged PR #80). Three additive documentation conflicts retain both product directions. A direct source diff confirms the financing form, arithmetic, schemas, saved-context handling, authentication/output handlers and verification code are identical to the original feature commit. Home, design tokens, screenshots and the dependency lockfile match the new main base. Existing scoped patch overrides are retained without adding a new ignore rule or dependency version.

No database, financial formula, credential, deployment setting, publication permission or live-provider change is introduced by this resolution. The added browser regression verifies that the studio summary and financing entry coexist. This scoped review precedes the rebase QA addendum and does not replace or broaden the original security assessment and release restrictions below.

## Executive summary

No new Critical or High exploit was detected in the reviewed financing diff. The new save and read routes reuse the verified authentication, role, request-origin and tenant repository boundaries. Browser input cannot supply branding, tenant authority, saved calculations, approvals or a publication command. Financial outputs remain private, and the existing ad-approval operation independently refuses financing manifests.

Two vulnerable transitive dependencies identified during verification were patched with exact overrides and a frozen-lockfile install. Production audit is clean. The full audit retains the pre-existing owner-accepted development-only high `braces` exception; it is not a zero-advisory graph.

## Checked boundaries

| Area | Evidence and disposition |
| --- | --- |
| Authority | `financing-http.ts` authenticates and checks mutation role before reading the 64 KB body. Signed viewer/approver, invalid-origin and missing-CSRF tests refuse writes. `financing-save.ts` checks mutation authority again at the service boundary. |
| Tenant/data access | Output reads use the principal-bound campaign repository and explicit campaign access assertion. Real PostgreSQL cross-tenant site/PDF reads are 404; tenant viewers may read but cannot create. A user's reusable settings list contains only their own verified versions. |
| Snapshot integrity | Save request hash, source manifest hash and independently recomputed result hash are checked. Exact retries reuse one version; altered payloads are 409. Concurrent PostgreSQL first-save tests verify one version. |
| Financial state | Missing is not zero. Fee classification avoids code-level double-counting, excessive credits/negative cash are refused, source quotes are explicit, and APR is never synthesized. Eligibility and lender review are not claimed. |
| Expiry | The self-review found and fixed a reuse defect: a date-only editor could otherwise extend an intraday quote to the end of the day. Reuse now retains the exact saved timestamp unless the author changes the date. A new regression covers offset issue times and intraday expiry. |
| Rendering | All HTML text is escaped; no live fetch, scripts, forms, remote assets or executable user markup. Private/no-store/noindex headers and restrictive CSP accompany output. PDF font failure is explicit, and input text is not silently discarded. |
| Resource bounds | One to five scenarios, twenty classified costs each, bounded labels/descriptions/amounts and a 64 KB request cap. PDF output has a page cap and a two-render per-process concurrency limit with retry response. |
| Public side effects | No public projection, domain write, paid-ad launch, email/SMS dispatch or billing operation. The new blueprint always has blocking preflight and cannot create an ad-style approval snapshot, including with forged internal passing preflight. |
| Source privacy | No historical client PDF, personal financial data, restricted template, source correspondence, token-bearing collaboration link, live credential or real quote fixture was added. |

Server files in the table are under `apps/web/src/server/`; contracts and arithmetic are `packages/contracts/src/financing-comparison.ts` and `packages/domain/src/financing-comparison.ts`.

## Dependency findings and remediation

- [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q): `source-map-js` event-loop denial of service through invalid indexed source-map section offsets, fixed at 1.2.2. The affected transitive version was replaced with exact 1.2.2.
- [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h): `proxy-addr` trusted-proxy matching issue, fixed at 2.0.8. The task CLI's transitive Express dependency now resolves to exact 2.0.8.

The primary GitHub-reviewed advisory records and package-registry versions/integrity were checked during this run. No direct feature dependency, broad upgrade, new ignore rule or production environment change was introduced. `pnpm audit --audit-level high` exits 0 under the existing policy with one previously ignored high advisory. The fresh production audit reports no advisories.

## Deterministic scans

The canonical `security-weapon/scripts/scan.ts` completed. Its production audit and hardcoded-secret, prototype-pollution, SQL-interpolation and API logging scans reported no new hits. Rules-file Unicode sweep was clean. Matches in negative tests, skill templates, existing static theme bootstrap and theme-only browser storage were manually distinguished from new runtime findings. A root-level Next configuration warning is not evidence that the app lacks headers; the actual configuration remains under `apps/web`.

Ephemeral evidence: `tmp/financing-security-scan/`, `tmp/financing-audit-final.log`, `tmp/financing-audit-prod-final.json`. The earlier static CVE watchlist in the skill was not treated as current proof; fresh advisory data was used.

## Remaining release restrictions

Per-process rendering limits do not provide a distributed workspace storage/creation quota. Before unrestricted customer use, qualify rate limits/quotas and the inherited retention/export/deletion policy. The existing data-entry restriction stays in place. No borrower identity or application data is collected by this new form, but that does not eliminate its need for a data-lifecycle policy.

The current PDF is deterministically rerendered from a saved version. It is not yet a sealed, reviewed public artifact. Future template upgrades must preserve the pinned renderer behavior. Photo/media entitlements, final lender disclosures, public expiry/revocation and HighLevel/form activation remain separate requirements. These restrictions are why this is a private-review increment rather than a production marketing release.

This report precedes the associated QA self-review. No hosted test, lender approval, live provider readiness or independent-agent audit is inferred from local evidence.
