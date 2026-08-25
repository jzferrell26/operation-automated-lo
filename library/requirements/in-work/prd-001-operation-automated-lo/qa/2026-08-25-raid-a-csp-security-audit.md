# Security Audit Report: Raid A nonce-based Content-Security-Policy

**Audit date:** 2026-08-25
**Auditor:** security-guardian (Raid A close-out)
**Scope:** `apps/web/src/middleware.ts`, `apps/web/src/security/content-security-policy.ts`, `apps/web/src/app/layout.tsx`, `tests/security/web-security-headers.test.ts`, `tests/browser/content-security-policy.spec.ts`, `apps/web/src/security/content-security-policy.unit.test.ts`
**Next.js version audited:** 16.2.11
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** see security-weapon research; Next 16.2.11 is beyond CVE-2025-29927 patched floors

---

## Executive Summary

Raid A remediates the open Medium finding for a missing application-wide Content-Security-Policy. Per-request cryptographic nonces are generated in middleware, enforced CSP is attached to both the forwarded request (for Next.js framework nonce propagation) and the response, and the theme bootstrap inline script is nonce-bound. After the request-CSP mirror fix, this audit reports 0 Critical, 0 High, 0 Medium, and 0 Low findings in scope.

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | OK | 0 |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | OK | 0 |
| Configuration & Headers | OK | 0 |
| Data Handling | OK | 0 |

Legend: **OK** = zero findings. **ATTN** = Medium/Low findings documented. **FAIL** = Critical/High findings (fixed in this session).

---

## Critical Findings (fixed in this session)

None detected.

---

## High Findings (fixed in this session)

None detected.

---

## Medium Findings

None remaining after remediation of the Next.js request-CSP propagation gap during this close-out.

### Remediated during Raid A

- [x] **Missing global Content Security Policy** (prior finding from 2026-08-12) `apps/web/next.config.ts` / `apps/web/src/middleware.ts` - Enforced per-request CSP with server-generated nonce; theme bootstrap script uses the same nonce.
- [x] **Request-side CSP omitted for Next.js nonce extraction** `apps/web/src/middleware.ts` - Middleware now sets the server-built CSP on forwarded request headers after deleting untrusted inbound CSP values, matching the Next.js 16 CSP guide so framework scripts receive nonces.

---

## Low Findings

None detected.

---

## Prior finding disposition

| Finding | Prior status | Raid A status |
|---|---|---|
| Missing global Content-Security-Policy | Medium open | **CLOSED** |

---

## Accepted tradeoffs

- `style-src 'self' 'unsafe-inline'` remains because tenant accent CSS variables and theme `color-scheme` use HTML style attributes. CSP nonces do not authorize style attributes. Script execution does not allow `'unsafe-inline'`.
- `frame-ancestors 'none'` matches the current first-party `X-Frame-Options: DENY` posture. Embedded HighLevel `frame-ancestors` allowlisting remains a later G2/auth surface change.

---

## Verification evidence

- Unit: `apps/web/src/security/content-security-policy.unit.test.ts`
- Contract: `tests/security/web-security-headers.test.ts`
- Browser: `tests/browser/content-security-policy.spec.ts` (response CSP, theme bootstrap nonce, Next `_next` chunk nonces)

---

## Residual risk

None Medium or higher in the Raid A CSP surface. Production traffic remains unauthorized pending external gates G2/G3/G5/G6/G7.
