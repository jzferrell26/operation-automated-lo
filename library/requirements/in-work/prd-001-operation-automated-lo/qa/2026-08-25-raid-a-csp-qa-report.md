# QA Report: Raid A nonce-based Content-Security-Policy

**Plan document:** Medium CSP remediation from `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-08-12-prd001-core-raid-security-audit.md` (Missing global CSP) and close-out `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-08-25-raid-a-csp-security-audit.md`
**Audit date:** 2026-08-25
**Base branch:** `origin/main`
**Head:** `cursor/raid-a-nonce-csp-ac42` @ `2f35b75` plus dirty working tree (request-CSP mirror and browser next-chunk assertions from security close-out)
**Auditor:** quality-guardian

## Summary

**Pass.** Raid A closes the 2026-08-12 Medium "Missing global Content Security Policy" with an enforced per-request nonce CSP, theme-bootstrap nonce binding, and Next.js request-header propagation. Security-guardian already ran (`2026-08-25-raid-a-csp-security-audit.md`: 0 Critical / 0 High / 0 Medium). Unit, contract, and browser CSP tests passed in this QA run. No Critical or Warning (Medium+) quality findings in Raid A scope.

## Scorecard

| Category      | Status | Notes |
|---------------|--------|-------|
| Completeness  | ✅ | Global enforced CSP, nonce generation, theme bootstrap binding, request+response headers, and required tests are present |
| Correctness   | ✅ | Policy denies script `unsafe-inline`/`unsafe-eval`, binds `script-src` to nonce + `strict-dynamic`, and browser proves theme + `_next` chunk nonces match |
| Alignment     | ✅ | CSP lives in middleware (not static `next.config` headers), matching the nonce-per-request design and security close-out |
| Gaps          | ✅ | Unit, contract, and Playwright browser coverage all green; accepted `style-src 'unsafe-inline'` tradeoff documented |
| Detrimental   | ✅ | Client-supplied nonce/CSP headers are stripped; no `unsafe-eval`; middleware is not treated as an auth boundary |

## Ordering check

- [x] `security-guardian` ran before this QA pass.
- Evidence: `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-08-25-raid-a-csp-security-audit.md` (dated 2026-08-25, 0 Medium remaining in scope).
- Prior Medium disposition: CLOSED in that report and in the 2026-08-25 addendum on `2026-08-12-prd001-core-raid-security-audit.md`.

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

- [ ] **Commit and push the security close-out delta before ship** — working tree (not only `2f35b75`)

  This QA verified the dirty tree that includes the request-side CSP mirror and `_next` chunk nonce browser assertions. Those changes are required for the security close-out evidence but are not yet on `origin/cursor/raid-a-nonce-csp-ac42`. Commit/push middleware, browser spec, prior-audit addendum, security audit, project-map status line, and this QA report together so the remote branch matches the audited tree.

  ```ts
  // apps/web/src/middleware.ts (working tree; absent from HEAD commit)
  requestHeaders.set(cspHeaderName, contentSecurityPolicy);
  ```

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|---|---|---|---|
| M-1 | Implement application-wide Content-Security-Policy (prior Medium) | ✅ | `apps/web/src/middleware.ts:14-35`, `apps/web/src/security/content-security-policy.ts:20-41` | Enforced header set on response; not left only in `next.config` |
| M-2 | Nonce-based policy compatible with inline theme bootstrap | ✅ | `apps/web/src/app/layout.tsx:22-35`, `apps/web/src/security/content-security-policy.ts:10-18` | Layout reads `x-nonce`; theme script uses `nonce={nonce}` |
| M-3 | Per-request cryptographic nonce; never trust inbound client nonce/CSP | ✅ | `apps/web/src/middleware.ts:19-26`, `apps/web/src/security/content-security-policy.ts:10-18` | Deletes inbound CSP/`x-nonce`, then sets server values |
| M-4 | Forward CSP on request so Next.js can propagate script nonces | ✅ | `apps/web/src/middleware.ts:25-26` | Security close-out remediates Next.js request-CSP extraction |
| M-5 | `script-src` must not allow `'unsafe-inline'`; framing denied | ✅ | `apps/web/src/security/content-security-policy.ts:29-39` | `strict-dynamic` + nonce; `frame-ancestors 'none'` |
| M-6 | Unit tests for nonce/policy builder | ✅ | `apps/web/src/security/content-security-policy.unit.test.ts:10-43` | 4/4 passed |
| M-7 | Contract/security-header tests keep static config CSP-free and assert builder | ✅ | `tests/security/web-security-headers.test.ts:10-42` | 2/2 passed |
| M-8 | Browser test: response CSP, theme bootstrap nonce, no script unsafe-inline | ✅ | `tests/browser/content-security-policy.spec.ts:3-35` | 1/1 passed (includes `_next` chunk nonce parity) |
| M-9 | Prior Medium marked CLOSED with evidence | ✅ | `qa/2026-08-25-raid-a-csp-security-audit.md`, `qa/2026-08-12-prd001-core-raid-security-audit.md` (2026-08-25 addendum) | Security report: 0 Medium remaining |
| NG-1 | Do not treat middleware as authorization boundary | ✅ | `apps/web/src/middleware.ts:10-13` | Comment + CSP-only behavior |
| NG-2 | Embedded HighLevel `frame-ancestors` allowlisting deferred | ✅ | `qa/2026-08-25-raid-a-csp-security-audit.md` Accepted tradeoffs | `frame-ancestors 'none'` retained |
| NG-3 | `style-src 'unsafe-inline'` retained for tenant accent / theme attributes | ✅ | `apps/web/src/security/content-security-policy.ts:25-31` | Documented; script path remains nonce-bound |

## Verification evidence (this run)

| Layer | Command / target | Result |
|---|---|---|
| Unit | `pnpm exec vitest run --project unit apps/web/src/security/content-security-policy.unit.test.ts` | Pass (4 tests) |
| Contract | `pnpm exec vitest run tests/security/web-security-headers.test.ts` | Pass (2 tests) |
| Browser | `pnpm exec playwright test tests/browser/content-security-policy.spec.ts` | Pass (1 test, ~13s) |

## Files Changed

Relative to `origin/main...HEAD` (committed Raid A surface), plus dirty-tree security close-out noted:

- `apps/web/src/app/layout.tsx` (M) — Reads `x-nonce` from request headers and applies it to the theme bootstrap inline script.
- `apps/web/src/middleware.ts` (A; dirty M) — Per-request nonce + enforced CSP on response; working tree also mirrors CSP onto forwarded request headers.
- `apps/web/src/security/content-security-policy.ts` (A) — Nonce generation, policy assembly, header name helper, malformed-nonce rejection.
- `apps/web/src/security/content-security-policy.unit.test.ts` (A) — Unit coverage for nonce entropy shape, policy directives, rejection, header names.
- `tests/browser/content-security-policy.spec.ts` (A; dirty M) — Playwright asserts response CSP, theme bootstrap nonce, and (working tree) `_next` script nonce parity.
- `tests/security/web-security-headers.test.ts` (M) — Asserts static Next headers remain CSP-free; builder supplies per-request CSP.

Out-of-band documentation (dirty / untracked, not functional code):

- `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-08-12-prd001-core-raid-security-audit.md` (M) — Raid A Medium CLOSED addendum.
- `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-08-25-raid-a-csp-security-audit.md` (A, untracked) — Security close-out.
- `library/knowledge/private/product/project-map.md` (M) — Status line updated to reflect CSP Medium closed.
- `library/requirements/in-work/prd-001-operation-automated-lo/qa/2026-08-25-raid-a-csp-qa-report.md` (A, this report)

## Verdict

| Gate | Result |
|---|---|
| Security guardian already ran (2026-08-25) | Pass |
| Prior CSP Medium closed with evidence | Pass |
| Unit / contract / browser CSP tests pass | Pass |
| No Medium+ quality gaps in Raid A scope | Pass |

**Overall: PASS** (0 Critical, 0 Warning; 1 Suggestion on commit/push hygiene for the dirty security close-out tree).
