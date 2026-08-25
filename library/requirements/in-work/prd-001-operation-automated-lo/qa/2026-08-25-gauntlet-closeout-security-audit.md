# Security Audit Report: Gauntlet PRD-001 Closeout

**Audit date:** 2026-08-25
**Auditor:** security-guardian (Gauntlet Wave 3 close-out)
**Scope:** `git diff origin/main...HEAD` on `cursor/gauntlet-prd001-closeout-ac42` — Raid A nonce CSP surface (`apps/web/src/middleware.ts`, `apps/web/src/security/content-security-policy.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/security/content-security-policy.unit.test.ts`, `tests/security/web-security-headers.test.ts`, `tests/browser/content-security-policy.spec.ts`), request/auth trust-boundary review of every non-doc file touched by this branch, and a docs-only PII/secret sweep of `EXECUTION_LEDGER.md`, `GAUNTLET_EXECUTION_LEDGER.md`, `PRODUCTION_EXECUTION_LEDGER.md`, `README.md`, the G1/G4 accepted-constraint decision, and the library scaffold README additions.
**Next.js version audited:** 16.2.11
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-04-24 (`.cursor/skills/security-weapon/research/cve-watchlist.md` and `guides/06-cve-tracker.md`) — **123 days old as of this audit, exceeding the 120-day freshness threshold.** Flagged per operating rules; recommend re-running `forge-weapon` for `security-guardian` to refresh the CVE catalog. This audit still manually verified the current Next.js/React versions against the stale catalog's version tables below and found no unpatched Tier 0/Tier 1 CVE.

---

## Executive Summary

Zero Critical, High, or Medium findings in scope. This audit re-verified (not rubber-stamped) the Raid A nonce-based Content-Security-Policy after its merge onto the Gauntlet closeout branch: the full diff between `origin/main` and `HEAD` for the CSP surface was re-read line by line, all three CSP test layers (unit, contract, live Playwright browser) were re-executed against a running build and passed, and the trust-boundary handling of client-supplied `x-nonce`/`content-security-policy` headers was independently re-traced through `middleware.ts`. No other request/auth-boundary code was touched by this branch — the diff outside the CSP surface is entirely documentation (ledgers, PRD status updates, library scaffold READMEs), and a targeted secret/PII regex sweep of every changed doc file found nothing. One out-of-scope, pre-existing dependency finding (High, `@trigger.dev/core` prototype pollution) was identified by `pnpm audit` but predates this branch's base commit and is not part of this branch's diff; it is documented below and not remediated in this session per minimal-blast-radius policy.

**Ordering check:** No quality-guardian report exists yet for the full Gauntlet closeout tree at this HEAD (`c30264a`). A prior QA report (`2026-08-25-raid-a-csp-qa-report.md`, committed `b3a532b` at 12:49:29 UTC) covers only the pre-merge Raid A branch and predates the 14:30:59 merge and 14:32:43 ledger commit — it is a valid historical artifact, not a stale QA gate for this scope. This audit runs correctly before `quality-guardian` for the Gauntlet closeout scope.

---

## Scorecard

| Category | Status | Findings |
|---|---|---|
| Financial / Payment Security | OK | 0 |
| PII Exposure | OK | 0 |
| Authentication & Authorization | OK | 0 |
| Injection Vulnerabilities | OK | 0 |
| Dependency Security | ATTN | 1 (pre-existing, out of branch diff scope — see below) |
| Configuration & Headers | OK | 0 |
| Data Handling | OK | 0 |

Legend: **OK** = zero findings in scope · **ATTN** = Medium/Low or out-of-scope findings documented · **FAIL** = Critical/High findings (fixed in this session).

---

## Critical Findings (fixed in this session)

None detected.

---

## High Findings (fixed in this session)

None detected in this branch's diff.

**Out-of-scope, pre-existing (documented, not fixed in this session):**

- **Dependency: Trigger.dev prototype pollution** `pnpm-lock.yaml` (unchanged by this branch) — `pnpm audit --audit-level=high` reports `@trigger.dev/core` at a version in the range `>=3.3.8 <=4.5.5` (patched `>=4.5.6`), GHSA-p28v-f755-9qrg, "prototype pollution via run metadata operations → process-wide cross-tenant DoS." Verified via `git diff origin/main...HEAD --stat -- '**/pnpm-lock.yaml' '**/package.json'` that neither file changed on this branch — the resolved version is identical to `origin/main` (base commit `f3a120942b9779e06ccf31b8c4d5f4f4c65979e4`). This is not a regression introduced by the Gauntlet closeout branch and is outside the audit scope defined for this run (Raid A CSP, request/auth trust boundaries touched by this branch, docs-only secret/PII sweep). Not remediated here to avoid an unrelated dependency bump contaminating a docs+CSP-scoped diff. **Recommended follow-up:** track a separate `pnpm up @trigger.dev/core@^4.5.6` bump (and re-run `pnpm why @trigger.dev/core` to confirm transitive resolution moved) in the next raid that touches `apps/tasks` or the Trigger.dev pipeline. A second `high` advisory, `deepmerge-ts` stack exhaustion (`<8.0.0`, transitive via `@trigger.dev/build` → `@prisma/config`), shares the same disposition and remediation path.

---

## Medium Findings

None detected in scope.

---

## Low Findings

None detected.

---

## Raid A CSP re-verification (line-by-line, not rubber-stamped)

Re-read the full `git diff origin/main...HEAD` for every CSP file and re-traced each trust boundary independently of the prior 2026-08-25 audit's conclusions:

1. **Nonce generation** (`apps/web/src/security/content-security-policy.ts:8-16`) — `createRequestNonce()` draws 16 bytes (128 bits) from `crypto.getRandomValues`, base64-encodes them. Meets the CSP3 recommendation of ≥128 bits of entropy per nonce; confirmed fresh per call via the unit test `"creates opaque base64 nonces that differ per call"` (re-executed, passing).
2. **Never trust inbound nonce/CSP headers** (`apps/web/src/middleware.ts:19-26`) — before setting server-generated values, the middleware explicitly deletes `x-nonce`, `content-security-policy`, and `content-security-policy-report-only` from the forwarded request headers. A client cannot smuggle a self-chosen nonce or a weakened CSP into the request that reaches the Server Component. Re-verified this is the *only* place `x-nonce` is read downstream (`apps/web/src/app/layout.tsx:22` reads it from `headers()`, which by this point can only contain the server-set value).
3. **Request-CSP mirror for Next.js nonce propagation** (`apps/web/src/middleware.ts:25-26`) — the enforced policy is set on the forwarded *request* headers (not just the response) so Next.js can extract the nonce during RSC/script-chunk rendering, matching the documented Next.js CSP-with-nonces pattern. Re-verified live: the Playwright spec (`tests/browser/content-security-policy.spec.ts`) asserts every `_next` chunk `<script>` carries the same nonce as the theme-bootstrap script and the response `Content-Security-Policy` header — re-ran this test against a live dev build in this session and it passed (12.1s, 1/1).
4. **Policy content** (`content-security-policy.ts:20-41`) — `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'` with no `unsafe-inline`/`unsafe-eval` on the script directive; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests`. `style-src 'self' 'unsafe-inline'` is a documented, accepted tradeoff (tenant accent CSS variables and `color-scheme` use HTML style attributes, which nonces cannot authorize; script execution is unaffected). No change to this tradeoff on this branch.
5. **Nonce validation** (`content-security-policy.ts:11-13`) — `buildContentSecurityPolicy` throws on any nonce that fails the base64 charset check or is under 16 characters, so a malformed/attacker-influenced nonce can never be baked into an emitted policy. Re-verified via the unit test `"rejects malformed nonces"`.
6. **Static config stays CSP-free** (`apps/web/next.config.ts`) — confirmed unchanged: `headers()` returns only the non-CSP baseline (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`; `poweredByHeader: false`). The contract test `tests/security/web-security-headers.test.ts` asserts `Content-Security-Policy` and `Content-Security-Policy-Report-Only` are `undefined` on the static config — re-ran, passing (2/2).
7. **Middleware matcher** (`apps/web/src/middleware.ts:38-46`) — excludes `_next/static`, `_next/image`, `favicon.ico`, and static image extensions, and excludes prefetch requests via the `missing` header conditions (`next-router-prefetch`, `purpose: prefetch`). This mirrors the documented Next.js CSP matcher pattern; excluding static assets and prefetches from header-setting is not a security gap since those responses are not HTML documents that execute scripts.
8. **Middleware is explicitly not an authorization boundary** — the file carries a comment stating this, and no auth/session logic was added to `middleware.ts` on this branch. No new route protection, redirect, or session-check logic exists in the diff to assess for CVE-2025-29927-style bypass risk beyond the version check below.

**Verification evidence re-executed in this session** (not merely re-read from the prior report):

| Layer | Command | Result |
|---|---|---|
| Unit | `pnpm exec vitest run --project unit apps/web/src/security/content-security-policy.unit.test.ts` | Pass (4/4) |
| Contract | `pnpm exec vitest run --project contracts tests/security/web-security-headers.test.ts` | Pass (2/2) |
| Browser | `pnpm exec playwright test tests/browser/content-security-policy.spec.ts` | Pass (1/1, 12.1s) |

**Conclusion: the Raid A CSP holds after the merge onto the Gauntlet closeout branch.** No regression, no weakened directive, no trust-boundary gap introduced.

---

## Request / auth trust-boundary review (branch-wide)

`git diff origin/main...HEAD --name-only` was filtered to non-documentation paths to enumerate every code file this branch touches:

```text
apps/web/src/app/layout.tsx
apps/web/src/middleware.ts
apps/web/src/security/content-security-policy.ts
apps/web/src/security/content-security-policy.unit.test.ts
tests/browser/content-security-policy.spec.ts
tests/security/web-security-headers.test.ts
```

This is the complete set — no other middleware, route handler, Server Action, API route, session/auth module, or database-access file was touched by this branch. `apps/web/src/middleware.ts` is the only middleware file in the monorepo (`find apps -iname middleware.ts` returns exactly one match) and existed nowhere on `origin/main`; it is entirely new and is the CSP file audited above. No pre-existing auth middleware was displaced, merged with, or shadowed by this addition. No header-trust or request-boundary issue was found outside the CSP surface already covered.

---

## Dependency Audit

```text
pnpm audit --audit-level=high (Node 22.14.0 — engine mismatch warning only, non-security)

2 vulnerabilities found. Severity: 2 high.
1. @trigger.dev/core — prototype pollution via run metadata operations (GHSA-p28v-f755-9qrg)
   Vulnerable: >=3.3.8 <=4.5.5 · Patched: >=4.5.6
2. deepmerge-ts — stack exhaustion merging recursive object graphs (GHSA-ggr8-5vv4-36mx)
   Vulnerable: <8.0.0 · Patched: >=8.0.0 (transitive via @trigger.dev/build > @prisma/config)
```

Both advisories are unchanged from `origin/main` — confirmed via `git diff origin/main...HEAD --stat -- '**/pnpm-lock.yaml' '**/package.json'` returning no output. See "High Findings" above for disposition (out-of-scope, pre-existing, documented follow-up recommended).

`npm audit` could not run (`ENOLOCK` — this monorepo uses `pnpm-lock.yaml`, not `package-lock.json`); `pnpm audit` above is the authoritative result.

---

## Next.js / React CVE Version Check

| CVE | Patched threshold | Current project | Status |
|---|---|---|---|
| **CVE-2025-29927** (middleware auth bypass) | 14.2.25 / 15.2.3 | Next.js 16.2.11 | Patched (version far beyond threshold) |
| **CVE-2025-55182** (React2Shell RCE, CVSS 10.0) | React 19.0.1 / 19.1.2 / 19.2.1 (guide `07`: 19.0.2 / 19.1.3 / 19.2.2) | React 19.2.7 | Patched |
| **CVE-2025-66478** (Next.js React2Shell companion) | Latest 14.x/15.x/16.x with patched React | Next.js 16.2.11 | Patched |
| **CVE-2025-55184** (Next.js RSC DoS) | 16.0.9 / 16.0.10 (consolidated) | Next.js 16.2.11 | Patched |
| **CVE-2025-55183** (Next.js Server Function source exposure) | 16.0.9 / 16.0.10 (consolidated) | Next.js 16.2.11 | Patched |
| **CVE-2026-27978** (`Origin: null` Server Actions CSRF bypass) | Latest Next.js; no `'null'` in `experimental.serverActions.allowedOrigins` | Next.js 16.2.11; `apps/web/next.config.ts` has no `experimental.serverActions` block at all | Not applicable / patched by version — confirmed no `allowedOrigins` misconfiguration exists |

Resolved versions taken from `pnpm-lock.yaml` (source of truth over `package.json` ranges), unchanged by this branch. Rocket Loader/App Router in use (`apps/web/src/app` exists), so 55183/55184 exposure surface would apply if unpatched — it is not.

---

## Docs-only PII / secret leakage sweep

Reviewed every non-code file in `git diff origin/main...HEAD --name-only`: `EXECUTION_LEDGER.md`, `GAUNTLET_EXECUTION_LEDGER.md` (new), `PRODUCTION_EXECUTION_LEDGER.md`, `README.md`, `library/knowledge/private/README.md` (new), `library/knowledge/private/architecture/README.md` (new), `library/knowledge/private/product/project-map.md`, `library/knowledge/private/research/2026-build-readiness-and-research-gate.md`, `library/knowledge/private/standards/README.md` (new), `library/knowledge/private/standards/documentation-framework.md` (new), `library/requirements/backlog/README.md` (new), the three PRD-001 files, the two prior CSP QA/security-audit files, `qa/README.md`, and `library/requirements/reports/2026-08-25-g1-g4-accepted-constraint-decision.md` (new).

Regex sweeps run against the full docs diff (`sk_live`, `sk_test`, `pk_live`, `api[_-]?key\s*[:=]`, `password\s*[:=]`, `secret\s*[:=]`, `token\s*[:=]`, PEM headers, AWS access-key shape, GitHub PAT shape, Slack token shape, SSN shape, 16-digit card-number shape, email address shape): **zero matches.** These files are exclusively status-accounting prose (gate dispositions, AC status changes, wave plans, README scaffolding) — no customer data, tokens, or credentials of any kind appear. `.env*` file check: no `.env*` files exist in the repository at all (tracked or untracked), so there is nothing to leak from that vector either.

---

## Files Changed (remediation)

No remediation was required this session; zero Critical/High/Medium findings in the audited scope. No files were modified by security-guardian.

`git diff` after this audit is empty except for the new report file and the ledger update described below — confirmed clean working tree prior to those two additions.

---

## Recommended Follow-Up (architectural)

- Bump `@trigger.dev/core` to `>=4.5.6` and `deepmerge-ts` to `>=8.0.0` (transitive) in a raid that owns `apps/tasks`/Trigger.dev tooling — motivated by the two pre-existing High `pnpm audit` findings documented above. Not blocking this branch since neither is a regression it introduced.
- Refresh `.cursor/skills/security-weapon/research/cve-watchlist.md` and `guides/06-cve-tracker.md` (`Last refreshed: 2026-04-24`, now 123 days stale) via `forge-weapon` for `security-guardian`. This audit manually cross-checked current Next.js 16.2.11 / React 19.2.7 against the known Tier 0/Tier 1 CVE version tables in guide `07-known-critical-cves.md` and found no unpatched CVE, so the staleness did not produce a false negative here — but the catalog should not be allowed to drift further.

---

## Ordering Note

This audit ran before `quality-guardian` for the Gauntlet closeout scope, per policy. The only existing QA report touching this repository, `2026-08-25-raid-a-csp-qa-report.md`, was committed at 12:49:29 UTC and scoped to the pre-merge Raid A branch only; it predates the 14:30:59 UTC merge onto the Gauntlet branch and the 14:32:43 UTC ledger commit, so it is a valid historical artifact for its own scope rather than a stale gate for this closeout audit. `quality-guardian` should now run against this full closeout tree.

---

*Generated by `security-guardian` using `security-weapon`. See `.cursor/skills/security-weapon/` for methodology.*
