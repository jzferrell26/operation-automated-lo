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

## Next step

Invoke Quality against this reviewed batch, then the orchestrator's code/repository review and required CI/build/browser checks before any ship claim. Do not infer approval, provider launch, hosted access or completed listing/homeowner reports from this security clearance. The authenticated hosted walkthrough still needs the user's sign-in.
