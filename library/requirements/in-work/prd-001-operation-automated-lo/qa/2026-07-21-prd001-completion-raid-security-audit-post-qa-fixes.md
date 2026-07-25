# Security Audit Report: PRD-001 Completion Raid Post-QA Fixes

**Audit date:** 2026-07-21
**Auditor:** security-guardian subagent
**Scope:** Post-QA authentication fix in `packages/auth/src/browser-session.ts` and `tooling/tests/unit/production-foundation/auth-policy.test.ts`, followed by a deterministic scan and complete security regression review of the final uncommitted diff against `origin/main`
**Next.js version audited:** 16.2.10
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-04-24, 88 days old and within the 120-day freshness window

---

## Executive Summary

Quality discovered a Critical cookie-authentication boundary flaw after the first Security pass: cookie-authenticated mutations accepted any configured browser origin instead of requiring the accepted Origin host to equal the validated Host. The repaired snapshot now enforces exact canonical Origin-to-Host equality for cookie mode, preserves the separate exact allowlist behavior for embedded bearer mode, and passes focused negative coverage. This post-QA Security pass found the Critical fixed, found no new Critical or High regression in the complete final diff, and retains one architectural Medium for a nonce-based Content Security Policy.

The prior Quality report `2026-07-21-prd001-completion-raid-qa-report.md` predates the authentication fix and this Security pass. It is stale and quality-guardian must rerun after this report before the branch can be considered shippable.

---

## Scorecard

| Category | Status | Findings |
|---|---|---:|
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | FAIL | 1 fixed |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | OK | 0 current |
| Configuration & Headers | ATTN | 1 follow-up |
| Data Handling | OK | 0 |

Legend: **OK** = zero findings, **ATTN** = Medium or Low findings documented, **FAIL** = Critical or High findings fixed in this session.

---

## Critical Findings (fixed in this session)

- [x] **Cookie mutation authentication and CSRF boundary** `packages/auth/src/browser-session.ts:205` - The pre-fix policy accepted either configured allowlisted origin in cookie mode, so a cross-origin embedded origin could pass the origin gate for a first-party cookie mutation. Cookie mode now requires `new URL(input.origin).host` to equal the already validated request Host before checking the session-bound CSRF token. Exact HTTPS origin parsing, no-wildcard allowlisting, expected Host validation, and generic fail-closed errors remain intact.

The regression test at `tooling/tests/unit/production-foundation/auth-policy.test.ts:323` supplies the second configured origin, `https://app.gohighlevel.com`, to cookie mode and proves rejection. The success case at line 322 proves the first-party cookie origin still works. The embedded bearer success case at line 351 proves the separate allowlisted HighLevel origin remains accepted for bearer mode, while null and non-allowlisted origins remain rejected.

---

## High Findings (fixed in this session)

None detected.

The previous synthetic GHL lead-routing authorization remediation remains intact: campaign location and tags are still derived through the authoritative campaign resolver, and cross-tenant campaign requests remain rejected.

---

## Medium Findings (follow-up required)

- [ ] **Defense-in-depth CSP** `apps/web/next.config.ts:5` - The application sets HSTS, MIME sniffing, frame, referrer, permissions, opener, and resource policy headers, but does not set a global `Content-Security-Policy`. Add a nonce-based policy after inventorying required application and third-party origins. Avoid `unsafe-inline`, `unsafe-eval`, and broad wildcard sources.

---

## Low Findings (documentation only)

None detected.

---

## Authentication Fix Validation

The repaired mutation policy applies the following order:

1. Request Host must exactly equal the configured expected Host, and expected Host must not be empty.
2. Origin must be present.
3. Every configured origin must be an exact canonical HTTPS origin with no credentials, path, query, fragment, or wildcard.
4. The supplied Origin must be an exact member of that allowlist.
5. Cookie mode additionally requires the canonical Origin host, including any port, to equal the validated request Host and requires the session-bound HMAC CSRF token.
6. Embedded bearer mode retains the shared Host check and exact origin allowlist, but may use the separately configured HighLevel origin because authentication is carried by the embedded bearer token rather than the first-party cookie.

Focused exact Node 24.18.0 verification passed 6 of 6 tests in `auth-policy.test.ts`. No authentication error path reveals policy internals; rejection continues to use the generic `BrowserSessionPolicyError` message.

---

## Deterministic Scan and Manual Classification

The Security Weapon scanner ran before manual review through its Windows TypeScript fallback because the workspace does not expose a local `tsx` command. Results:

- No hardcoded secrets or committed environment files.
- No PCI card fields or financial-data handling regression.
- No unsafe JWT verification, prototype-pollution sink, SQL or command injection shape, wildcard CORS, or zero-width and bidirectional Unicode.
- Next.js 16.2.10 and React 19.2.7 remain beyond the Weapon's audited CVE patch floors.

Scanner matches were manually classified as safe:

- `NEXT_PUBLIC_PROVIDER_TOKEN` appears only in a negative test that rejects unsafe client-exposed provider token names.
- The theme bootstrap `dangerouslySetInnerHTML` sink contains a fixed application-owned script with no user-controlled input.
- The `localStorage` write is theme-preference browser-test coverage and stores no credential, token, PII, or financial data.

The scanner's generic next-config locator did not discover `apps/web/next.config.ts`, so headers were inspected manually. The exact pnpm dependency audit was used as the authoritative workspace result because the scanner's npm-oriented audit does not resolve the complete pnpm workspace graph.

Manual final-diff review rechecked authentication, AI generation and evaluation, GHL routing, reporting, rendering, manifests, the lockfile, and deploy configuration. No new security regression was found.

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

The exact Node 24.18.0 `pnpm audit --json` run is clean. The prior `@hono/node-server` 2.0.10 and `sharp` 0.35.3 remediations remain resolved in the final graph.

---

## Next.js Version Check

| CVE | Patched threshold | Current project | Status |
|---|---|---|---|
| **CVE-2025-29927** (middleware bypass) | 14.2.25 / 15.2.3 | Next.js 16.2.10 | Patched |
| **CVE-2025-55182** (React2Shell RCE) | React 19.0.2 / 19.1.3 / 19.2.2 or later | React 19.2.7 | Patched |
| **CVE-2025-66478** (Next.js companion) | Current patched 14.x / 15.x / 16.x with patched React | Next.js 16.2.10 and React 19.2.7 | Patched |
| **CVE-2025-55184** (RSC denial of service) | 16.0.10 for the affected 16.0 line | Next.js 16.2.10 | Patched |
| **CVE-2025-55183** (Server Function source exposure) | 16.0.10 for the affected 16.0 line | Next.js 16.2.10 | Patched |
| **CVE-2026-27978** (null-origin CSRF) | Upgrade Next and do not allow `Origin: null` | Next.js 16.2.10 | Patched, null origin rejected by local auth policy |

---

## Files Changed (remediation)

| File | Change Summary |
|---|---|
| `packages/auth/src/browser-session.ts` | Added exact cookie Origin-host equality after canonical origin and Host validation while preserving embedded-bearer allowlisting. |
| `tooling/tests/unit/production-foundation/auth-policy.test.ts` | Added the negative second-allowlisted-origin cookie case and retained the positive embedded-bearer case. |
| `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-07-21-prd001-completion-raid-security-audit-post-qa-fixes.md` | Recorded the mandatory post-QA Security re-audit and verification evidence. |

Security did not modify the ledger, PRDs, first Security report, or either existing Quality report. The complete final diff was reviewed on 2026-07-21.

---

## Exact Full Verification

The required command ran under exact Node 24.18.0 and passed on the first attempt:

```text
npx --yes node@24.18.0 C:\Users\jzfer\AppData\Roaming\npm\node_modules\pnpm\bin\pnpm.cjs verify
exit: 0
duration: 262.9 seconds
retry required: no
```

Evidence from the same full invocation:

- Formatting, lint, and all 16 package typechecks passed.
- Unit: 364 of 364 passed.
- Integration: 28 of 28 passed.
- Contracts: 32 of 32 passed.
- Visual: 7 of 7 passed in 38.34 seconds. The previous Quality timeout did not recur.
- Preview E2E: 1 of 1 passed.
- Browser: 22 of 22 passed.
- Duplication: 0 clones across 187 analyzed files.
- Boundary, product-type, secret, and dependency audits passed.
- Production build passed across all 16 packages.
- Database orchestration contract tests: 6 of 6 passed.
- pgTAP `context_reset`: 6 tests passed.
- pgTAP `durable_primitives`: 34 tests passed.
- pgTAP `phase0_scaffold`: 20 tests passed.
- pgTAP `reconciliation_primitives`: 45 tests passed.
- pgTAP `support_access`: 8 tests passed.
- pgTAP `tenant_isolation`: 13 tests passed.
- Local Supabase shut down cleanly after the database suite.

This resolves the prior Quality visual-timeout release blocker and supplies current exact-gate evidence for PRD-001J AC032 on the repaired authentication snapshot.

---

## Recommended Follow-Up (architectural)

- Add a nonce-based global Content Security Policy in `apps/web` after completing a production script and asset-origin inventory. This is motivated by the Medium finding at `apps/web/next.config.ts:5`.
- Keep first-party cookie origins and embedded bearer origins modeled as separate policy concepts if the current single allowlist grows. The current mode-specific equality check is secure, but distinct configuration types would reduce future policy-mixing risk.
- Preserve live HighLevel authentication and G5 evidence as external production gates. Passing repository security and local database tests does not replace authorized provider exercises.

---

## Ordering Note

This Security audit ran after `quality-guardian` produced `2026-07-21-prd001-completion-raid-qa-report.md` because that Quality pass discovered the Critical cookie-origin defect. The Quality report therefore predates the repaired authentication code and this successful exact full gate. Its implementation verification is stale. Run `quality-guardian` again after this report and use only the new post-Security Quality report for the final ship decision.

---

*Generated by `security-guardian` using `security-weapon`. See `C:\Users\jzfer\.agents\skills\security-weapon\` for methodology.*
