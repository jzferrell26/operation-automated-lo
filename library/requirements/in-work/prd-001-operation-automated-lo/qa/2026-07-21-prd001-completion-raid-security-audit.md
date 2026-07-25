# Security Audit Report: PRD-001 Completion Raid

**Audit date:** 2026-07-21
**Auditor:** security-guardian subagent
**Scope:** Entire uncommitted diff against `origin/main`, with surrounding authentication, AI generation, GHL lead routing, reporting, rendering, workspace manifests, lockfile, and Vercel and Next.js deployment configuration
**Next.js version audited:** 16.2.10
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-04-24, 88 days old and within the 120-day freshness window

---

## Executive Summary

The most important finding was a High authorization flaw in the new synthetic GHL lead-test planner: caller-selected campaign location and tag values could cross a tenant boundary. The planner now resolves campaign identity through a server-owned port, strictly validates the authoritative record, derives location and tags only from that record, and rejects tenant mismatches. The audit closed one High and two Medium findings in-session, found no Critical, Low, financial-data, or PII findings, and leaves one Medium architectural follow-up for a nonce-based Content Security Policy.

---

## Scorecard

| Category | Status | Findings |
|---|---|---:|
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | FAIL | 1 fixed |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | ATTN | 2 fixed |
| Configuration & Headers | ATTN | 1 follow-up |
| Data Handling | OK | 0 |

Legend: **OK** = zero findings, **ATTN** = Medium or Low findings documented, **FAIL** = Critical or High findings fixed in this session.

---

## Critical Findings (fixed in this session)

None detected.

---

## High Findings (fixed in this session)

- [x] **Authorization / IDOR / tenant boundary** `packages/ghl/src/lead-routing.ts:503` - The synthetic lead-test planner previously trusted caller-selected location and campaign tagging metadata, allowing a validated actor to target another tenant's campaign. The planner now accepts only actor authority and a requested campaign reference, resolves campaign identity through `SyntheticLeadCampaignResolutionPort`, strict-parses the result, derives destination and tags from the authoritative record, and rejects a location mismatch. Unit coverage at `tooling/tests/unit/production-foundation/lead-routing.test.ts:438` proves authoritative derivation, rejects caller override keys, and exercises the tenant-A actor against tenant-B campaign case.

---

## Medium Findings (follow-up required)

- [x] **Dependency path traversal, GHSA-frvp-7c67-39w9** `pnpm-workspace.yaml:28` - The transitive `@hono/node-server` 1.19.14 dependency was affected by a Windows encoded-backslash path traversal advisory. The workspace now overrides it to 2.0.10, above the 2.0.5 patched floor. Advisory: https://github.com/advisories/GHSA-frvp-7c67-39w9
- [x] **Dependency memory exhaustion, GHSA-9mqv-5hh9-4cgg** `pnpm-workspace.yaml:28` - An intermediate 2.0.5 remediation candidate was affected by an unauthenticated WebSocket handshake memory exhaustion advisory through 2.0.9. Re-audit caught the regression before close-out and the final override is 2.0.10. Advisory: https://github.com/advisories/GHSA-9mqv-5hh9-4cgg
- [ ] **Defense-in-depth CSP** `apps/web/next.config.ts:5` - The application sets HSTS, MIME sniffing, frame, referrer, permissions, opener, and resource policy headers, but does not set `Content-Security-Policy`. Add a nonce-based CSP after inventorying required application and third-party script, style, image, font, connection, frame, and worker origins. Avoid `unsafe-inline` and broad wildcard sources.

---

## Low Findings (documentation only)

None detected.

---

## Deterministic Scan and Manual Classification

The Security Weapon scanner ran before remediation through its Windows TypeScript fallback because the workspace does not expose a local `tsx` command. It reported zero hardcoded secrets, environment files, PCI fields, JWT verification issues, prototype-pollution patterns, SQL or command injection patterns, wildcard CORS, or Unicode-control findings.

Scanner matches were manually classified as safe:

- The `NEXT_PUBLIC_PROVIDER_TOKEN` match is a negative test that rejects unsafe client-exposed provider token names.
- The theme bootstrap `dangerouslySetInnerHTML` sink contains a fixed application-owned script with a JSON-encoded fixed storage key and no user-controlled input.
- The `localStorage` write is theme preference test coverage and does not store credentials, tokens, PII, or financial data.

Manual review confirmed that the new authentication code uses embedded Ed25519 verification, signed one-time OAuth state, one-time fragment handoff, secure cookies, CSRF and origin checks, and token rotation and revocation. AI and reporting payloads use strict schemas and synthetic fixture data. Rendering escapes generated HTML, blocks network access, strips metadata, and writes through private storage boundaries.

---

## Dependency Audit

```text
info: 0
low: 0
moderate: 0
high: 0
critical: 0
total dependencies: 639
top advisories: none
```

Full output was reviewed from the exact Node 24.18.0 `pnpm audit --json` run. Ephemeral deterministic scanner output remains under the ignored `reports/scan-output/` scratch directory.

Dependency and build-integrity hardening also pinned `sharp` 0.35.3 consistently in the root manifest, rendering package, workspace override, build allowlist, and lockfile. The exact dependency graph contains one `sharp` version, and a native PNG render under Node 24.18.0 loaded `sharp` 0.35.3 successfully and produced a 95-byte PNG.

---

## Next.js Version Check

| CVE | Patched threshold | Current project | Status |
|---|---|---|---|
| **CVE-2025-29927** (middleware bypass) | 14.2.25 / 15.2.3 | Next.js 16.2.10 | Patched |
| **CVE-2025-55182** (React2Shell RCE) | React 19.0.1 / 19.1.2 / 19.2.1 | React 19.2.7 | Patched |
| **CVE-2025-66478** (Next.js companion) | Latest 14.x / 15.x / 16.x with patched React | Next.js 16.2.10 and React 19.2.7 | Patched |
| **CVE-2026-27978** (null-origin CSRF) | Upgrade Next and do not allow `Origin: null` | Next.js 16.2.10 | Patched, no null-origin allowlist detected |

---

## Files Changed (remediation)

| File | Change Summary |
|---|---|
| `packages/ghl/src/lead-routing.ts` | Replaced caller-owned campaign metadata with authoritative campaign resolution and tenant matching. |
| `tooling/tests/unit/production-foundation/lead-routing.test.ts` | Added authoritative derivation, strict override rejection, and cross-tenant negative coverage. |
| `package.json` | Pinned the root `sharp` dependency to 0.35.3. |
| `packages/rendering/package.json` | Pinned the rendering package to `sharp` 0.35.3. |
| `pnpm-workspace.yaml` | Allowed the exact `sharp` build and added exact `sharp` and `@hono/node-server` security overrides. |
| `pnpm-lock.yaml` | Refreshed the resolved graph for `sharp` 0.35.3 and `@hono/node-server` 2.0.10. |

Run `git diff` to review every change; the complete diff and surrounding security boundaries were reviewed and confirmed on 2026-07-21.

---

## Verification

Exact Node 24.18.0 verification passed on the final shared-worktree snapshot:

- `pnpm verify:offline`: exit 0, including Prettier, lint, 16-package typecheck, all test layers, browser tests, duplication detection, policy audits, dependency audit, and 16-package production build.
- Unit: 364 of 364 passed. GHL lead routing reached 98.16 percent statement coverage, 96.19 percent branch coverage, 100 percent function coverage, and 98.13 percent line coverage.
- Integration: 28 of 28 passed.
- Contracts: 32 of 32 passed.
- Visual: 7 of 7 passed.
- Preview E2E: 1 of 1 passed.
- Browser: 22 of 22 passed, including responsive and accessibility coverage.
- Duplication: 0 clones across 187 analyzed files.
- Boundary, product-type, secret, and dependency audits: passed.
- Native `sharp` smoke test: version 0.35.3 loaded and rendered successfully.
- Frozen install: passed.

---

## Recommended Follow-Up (architectural)

- Add a nonce-based Content Security Policy in `apps/web` after a production script and asset-origin inventory. This is motivated by the Medium defense-in-depth finding at `apps/web/next.config.ts:5`.
- Ensure the live adapter for `SyntheticLeadCampaignResolutionPort` queries server-owned campaign storage by the requested reference and returns only the strict authoritative record. Keep the current fail-closed behavior for absent, malformed, mismatched, or cross-location records.
- Preserve live G5 evidence as an external production gate. The synthetic plan intentionally reports `requiresLiveG5Evidence: true` and excludes test traffic from production metrics.

---

*Generated by `security-guardian` using `security-weapon`. See `C:\Users\jzfer\.agents\skills\security-weapon\` for methodology.*
