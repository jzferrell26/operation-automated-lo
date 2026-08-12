# PRD-001 Core RAID Final Post-Security QA Report

**Date:** 2026-08-12
**Branch:** `codex/raid-prd-001-core`
**Baseline:** `43f1656b67682bf884c88c4027f4cd71e5015a94`
**Plan:** PRD-001 index, PRD-001j, and PRD-001a through PRD-001i
**Security prerequisite:** satisfied by `qa/2026-08-12-prd001-core-raid-security-audit.md`, including its 09:27 CDT post-remediation addendum
**Supersedes:** `qa/2026-08-12-prd001-core-raid-qa-report.md`

## Summary

PASS. The final post-security tree has 0 Critical findings, 0 Warnings, and 0 Suggestions. The 001D-AC-021 defect recorded in the superseded report is fixed: paid-ad rendering now uses a strict paid-only asset manifest and awaited authority, emits real property and lender image markup with cover crop, focal points, and format-specific safe zones, resolves only exact authorized routes, validates checksum and bounded image decode before Chromium, proves visible pixels in a real Playwright raster, and excludes Realtor and collateral values from the browser boundary.

The canonical ledger contains 305 unique, contiguous criteria with no duplicates or unclassified rows: 267 VERIFIED, 28 DEFERRED: LIVE HIGHLEVEL AUTH, 8 BLOCKED: EXTERNAL EVIDENCE, 1 BLOCKED: G3 / G4, and 1 BLOCKED: G5. QA independently reconciles the same result as 267 PASS plus 38 explicitly deferred or externally blocked. The eight August paid-ad hard-rule criteria all pass.

**Final ship verdict: SHIP for the audited repository implementation.** The 38 deferred or blocked rows remain explicit external acceptance gates and are not represented as completed product evidence.

## Scorecard

| Category | Status | Notes |
| --- | --- | --- |
| Completeness | PASS | All 305 criteria are classified. 267 are verified and 38 retain explicit external or live-authorization constraints. |
| Correctness | PASS | The remediated paid-ad image path renders authorized pixels and fails closed on authority, route, checksum, MIME, dimensions, frame count, and decode bounds. |
| Alignment | PASS | Collateral, paid-ad rendering, approval, and provider compilation remain separate projections and trust boundaries. |
| Gaps | PASS | No unclassified criterion, missing in-scope implementation, or stale ledger status remains. |
| Detrimental patterns | PASS | No Realtor/collateral data leak, remote fetch, path traversal, unchecked decoder input, or async authority fail-open remains in the audited surface. |

## Findings

### Critical Issues

None.

### Warnings

None.

### Suggestions

None.

## 001D-AC-021 Remediation Verification

| Required proof | Result | Evidence |
| --- | --- | --- |
| Strict paid-only asset manifest | PASS | `packages/contracts/src/rendering-storage.ts:41-81` permits only approved JPEG/PNG identity and property assets, requires focal point and dimensions, caps asset counts, requires safe zones, rejects duplicate cross-role references, and rejects extra fields. |
| Awaited paid-only authority | PASS | `packages/rendering/src/paid-ad-render-sources.ts:123-159` awaits brand authorization before asset authorization, validates the returned manifest and canonical hash, binds campaign version and paid projection hash, and requires exact identity/property membership. |
| Actual image markup | PASS | `packages/rendering/src/paid-ad-render-sources.ts:168-189` emits property and identity `img` elements from only authorized manifest members. |
| Cover crop, focal point, safe zones | PASS | `packages/rendering/src/paid-ad-render-sources.ts:161-189` selects format-specific safe-zone insets, writes focal-point `object-position`, uses `object-fit:cover`, and positions copy inside the validated safe zone. |
| Real Playwright pixel output | PASS | `tests/visual/prd001d-rendering.test.ts:119-281` creates real red/blue property and green lender images, renders a 1080 by 1080 PNG through the production adapter, decodes the output, and asserts substantial pixel counts for all three visible colors. |
| Exact-route resolution | PASS | `packages/rendering/src/playwright-browser.ts:243-297` accepts only the exact render origin, path, empty query, GET method, and expected resource type. `tests/visual/prd001d-rendering.test.ts:283-313` rejects an unknown asset, IMDS URL, and normalized traversal path without loading the rejected asset. |
| Checksum, MIME, dimensions, frames, and decode bounds | PASS | `packages/rendering/src/playwright-browser.ts:34-70` caps encoded bytes at 25 MiB and decoded raw bytes at 40 MiB, limits input pixels, rejects decoder warnings, requires exact JPEG/PNG format and dimensions, and requires one frame. `packages/rendering/src/playwright-browser.ts:278-287` verifies SHA-256 before decode. `packages/rendering/src/playwright-browser.ts:209-228` requires successful Chromium `img.decode()` and nonzero natural dimensions. `tests/visual/prd001d-rendering.test.ts:315-426` proves checksum, mislabeled MIME, and decompression failures. |
| No Realtor or collateral values | PASS | `packages/rendering/src/playwright-browser.ts:90-116` gives paid jobs only their paid-only asset manifest. `tooling/tests/unit/production-foundation/prd001d-rendering.test.ts:661-687` proves the serialized paid browser input excludes the collateral manifest ref, partner profile, Realtor display name, collateral checksum, Realtor logo, and Realtor photo while retaining lender and property assets. |

## Eight Paid-Ad Hard-Rule Criteria

| Criterion | QA result | Implementation and proof |
| --- | --- | --- |
| 001C-AC-028 | PASS | Separate strict projection contracts and scopes at `packages/contracts/src/campaign-foundation.ts:40-146`; distinct refs, previews, hashes, summaries, and deep freezing at `packages/application/src/campaign-foundation.ts:60-120`; collision and immutability tests at `tooling/tests/unit/production-foundation/campaign-foundation.test.ts:840-890`. |
| 001C-AC-029 | PASS | Paid-ad text, contact, asset, and dual-brand rejection at `packages/domain/src/campaign-foundation.ts:403-518`; adversarial field, URL, contact, and asset tests at `tooling/tests/unit/production-foundation/campaign-foundation.test.ts:912-1023`. |
| 001C-AC-030 | PASS | Paid-ad Realtor approval is rejected by contract at `packages/contracts/src/campaign-foundation.ts:185-202` and by application authorization at `packages/application/src/campaign-foundation.ts:385-427`; role-scope tests at `tooling/tests/unit/production-foundation/campaign-foundation.test.ts:1031-1058`. |
| 001D-AC-034 | PASS | Paid creative is generated only from the authorized paid projection at `packages/rendering/src/paid-ad-render-sources.ts:118-189`; authority rejection and Realtor-free production input tests at `tooling/tests/unit/production-foundation/prd001d-rendering.test.ts:394-428` and `661-687`. |
| 001D-AC-035 | PASS | Paid browser input has its own context and source, never the collateral manifest, at `packages/rendering/src/production-rendering.ts:36-59` and `packages/rendering/src/playwright-browser.ts:90-116`; production-boundary proof is at `tooling/tests/unit/production-foundation/prd001d-rendering.test.ts:646-692`. |
| 001E-AC-033 | PASS | Strict provider input takes `PaidAdProjectionSchema` and immutable evidence at `packages/ghl/src/meta-adapter.ts:473-503`; compilation validates projection and awaits stored authority at `packages/ghl/src/meta-adapter.ts:515-591`; contract proof excludes collateral at `tests/contracts/ghl/meta-brand-boundary.test.ts:96-120`. |
| 001E-AC-034 | PASS | Provider presentation is compiled only from paid-ad advertiser identity, copy, creative, lead form, and CTA at `packages/ghl/src/meta-adapter.ts:421-461`; fully rebound Realtor identity, asset, contact, copy, creative, and lead-form vectors are rejected at `tests/contracts/ghl/meta-brand-boundary.test.ts:126-158`. |
| 001E-AC-035 | PASS | Paid-ad boundary rejection and exact provider route/method allowlist remain enforced at `packages/ghl/src/meta-adapter.ts:360-403` and `515-591`; brokerage and dual-brand attacks are rejected at `tests/contracts/ghl/meta-brand-boundary.test.ts:160-174`. |

## Full Plan Traceability Reconciliation

Every exact criterion in `PRODUCTION_EXECUTION_LEDGER.md` was inventoried and reconciled against the PRD-001 index plus PRD-001j and PRD-001a through PRD-001i. IDs are unique and contiguous within each sub-PRD.

| PRD | Total | VERIFIED / PASS | Deferred live auth | Blocked external | Blocked G3/G4 | Blocked G5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 001A | 41 | 20 | 21 | 0 | 0 | 0 |
| 001B | 20 | 20 | 0 | 0 | 0 | 0 |
| 001C | 30 | 30 | 0 | 0 | 0 | 0 |
| 001D | 35 | 35 | 0 | 0 | 0 | 0 |
| 001E | 35 | 33 | 0 | 1 | 1 | 0 |
| 001F | 29 | 28 | 0 | 0 | 0 | 1 |
| 001G | 43 | 43 | 0 | 0 | 0 | 0 |
| 001H | 24 | 20 | 3 | 1 | 0 | 0 |
| 001I | 14 | 11 | 0 | 3 | 0 | 0 |
| 001J | 34 | 27 | 4 | 3 | 0 | 0 |
| **Total** | **305** | **267** | **28** | **8** | **1** | **1** |

The canonical 001D-AC-021 row at `PRODUCTION_EXECUTION_LEDGER.md:274` now records VERIFIED with final post-security evidence. No ledger row is open, in progress, duplicated, missing evidence, or unclassified.

## Verification Evidence

- Security close-out is correctly ordered and cumulative: 0 Critical, 3 High fixed, 1 Medium documented, 0 Low. No unresolved Critical or High remains.
- The latest complete offline gate before the final decoder hardening passed 377 unit, 28 integration, 48 contract, 7 visual, 1 preview, and 22 browser tests.
- The final decoder and route hardening was then verified by 21 focused rendering unit tests, 17 rendering security and Meta contract tests, and 6 focused visual tests, including the real paid-only pixel raster and hostile route/byte cases.
- Focused rendering typecheck, tooling TypeScript check, lint, formatting, dependency audit, secret audit, and `git diff --check` passed in the post-remediation security close-out.
- Verification ran on local Node 22.19.0 with the repository's expected warning for canonical Node 24.18.0. No cited check failed because of that warning.

## External Acceptance Boundary

The 38 non-VERIFIED rows are intentionally preserved as external or live-environment gates. This report does not convert those rows to PASS and does not claim live HighLevel authorization, external G1 through G7 evidence, G3/G4 live Meta execution, G5 live provider state, or other external production evidence that has not occurred.

## Final Verdict

**SHIP.** The audited repository implementation conforms to all 267 in-scope verified criteria, including the eight August hard rules and the remediated 001D-AC-021 paid-image path. Release operators must continue to honor the 38 explicit external/deferred gates and the documented application-wide CSP Medium follow-up.
