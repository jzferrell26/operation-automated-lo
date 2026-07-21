# UI Foundation Security Audit

**Date:** 2026-07-21
**Scope:** UIF-001 through UIF-026 on `codex/oalo-ui-foundation`
**Guardian:** `security-guardian`, armed with `security-weapon`
**Verdict:** PASS WITH MODERATE FOLLOW-UP

## Executive summary

The UI Foundation has no Critical or High security findings. The implemented surfaces are synthetic-only, read-only, contain no provider calls or customer data, and do not grant browser authority over tenant, onboarding completion, launch readiness, campaign approval, artifact identity, or publication.

Four Moderate follow-ups remain: a nonce or hash based Content Security Policy, plus three transitive dependency advisories. None is directly exploitable through the current synthetic UI path. These items do not block the UI Foundation PR, but they must stay visible in dependency and production-hardening work.

## Finding counts

| Severity | Open | Remediated during audit |
| --- | ---: | ---: |
| Critical | 0 | 0 |
| High | 0 | 0 |
| Moderate | 4 | 0 |
| Low | 0 | 0 |

## Security scorecard

| Area | Result | Evidence |
| --- | --- | --- |
| Authentication and authorization | PASS for current scope | The browser receives a frozen, strictly parsed synthetic session projection. It does not derive tenant or authority from URL state, expose a location switcher, or gain mutation authority. Production data and writes remain out of scope. |
| Injection and unsafe rendering | PASS | No SQL, command, template, or arbitrary CSS injection path was found. The only `dangerouslySetInnerHTML` call injects a generated theme bootstrap derived from a fixed storage-key constant, not user input. Tenant accents project only six fixed semantic custom properties from a server allowlist. |
| PII and financial data | PASS | No customer PII, credentials, tokens, payment fields, financial account data, or provider payloads exist in the UI fixtures or browser storage. |
| Browser storage | PASS | Storage contains only the product-specific theme value `light` or `dark`. System mode clears the manual value. No PII, tenant authority, completion evidence, or campaign state is stored. |
| Data and provider isolation | PASS | The UI uses visibly synthetic fixtures, performs no provider or network request, and exposes no production write path. Approval and artifact projections reject unknown UI keys and remain byte and hash invariant across theme changes. |
| Security headers | ATTENTION | HSTS, `nosniff`, frame denial, referrer policy, permissions policy, COOP, and CORP are configured. A CSP is not yet configured. |
| Dependency posture | ATTENTION | `pnpm audit --prod --audit-level=high` reports 0 Critical and 0 High. The full audit reports three Moderate transitive advisories. |
| Secrets and repository hygiene | PASS | Secret scanning, Unicode scanning, environment-file checks, product-type audit, and package-boundary audit pass. No tracked secret file or client-exposed provider credential was found. |

## Open Moderate findings

### SEC-UI-001: Nonce or hash based CSP is not configured

**Evidence:** `apps/web/next.config.ts` defines the global security header set without `Content-Security-Policy`. `apps/web/src/app/layout.tsx` injects the fixed first-paint theme bootstrap as an inline script.

**Impact:** A future injection flaw would have fewer browser-enforced execution constraints. Adding a strict CSP later without accounting for the first-paint script could also break theme initialization.

**Required follow-up:** Before production customer data or writes are enabled, implement a route-class-aware nonce or hash CSP and pass the nonce to the theme bootstrap. Do not use a blanket `unsafe-inline` script policy. Recheck Next.js framework requirements, development-only sources, browser tests, and third-party hosts at that time.

**Current exposure:** Moderate. The inline script source is fixed code, JSON serializes the fixed storage key, and no user-controlled value reaches the script body.

### SEC-UI-002: PostCSS transitive advisory

**Evidence:** Next.js resolves `postcss@8.4.31`, affected by GHSA-qx2v-qp2m-jg93. The patched range begins at 8.5.10.

**Impact:** The advisory concerns unsafe stringification of attacker-controlled CSS. The current UI does not accept or stringify user CSS, and tenant accent values come from a fixed server catalog.

**Required follow-up:** Upgrade through the owning Next.js dependency path when a compatible release resolves a patched PostCSS version. Keep arbitrary tenant CSS prohibited.

### SEC-UI-003: OpenTelemetry core transitive advisory

**Evidence:** Trigger.dev resolves `@opentelemetry/core@2.7.1`, affected by GHSA-8988-4f7v-96qf. The patched range begins at 2.8.0.

**Impact:** Unbounded baggage processing can increase memory consumption when untrusted baggage reaches the affected instrumentation path.

**Required follow-up:** Upgrade the Trigger.dev and OpenTelemetry dependency chain to a compatible version that resolves `@opentelemetry/core` 2.8.0 or later. Bound and reject oversized incoming baggage at the production ingress layer.

### SEC-UI-004: esbuild development-server advisory

**Evidence:** Trigger.dev resolves `esbuild@0.23.1`, affected by GHSA-67mh-4wv8-2f99.

**Impact:** The affected behavior concerns requests to the esbuild development server. This path is a development dependency and is not the deployed Next.js production server.

**Required follow-up:** Upgrade the Trigger.dev dependency chain when compatible. Do not expose the development server to untrusted networks.

## Trust-boundary decision

The `(authenticated)` route group is a UI composition boundary, not proof of production authentication. This is acceptable only because every rendered value is synthetic, frozen, visibly disclosed, and write-disabled. Before any production data or consequential action enters these routes, replace the fixture session with server-validated authentication, tenant, role, and capability context. Authorization must remain server-owned and fail closed.

## Audit-time correction

The package-boundary gate found that `apps/web` test files imported Vitest and Testing Library packages declared only at the workspace root. Exact pinned development dependencies were added to `apps/web/package.json`, and `pnpm-lock.yaml` was refreshed. Frozen installation and `pnpm audit:boundaries` then passed across all 16 packages, including the fixture rejection check. This was release verification hygiene, not a vulnerability in a shipped runtime path.

## Verification evidence

- `pnpm audit --prod --audit-level=high`: pass, 0 Critical and 0 High, 2 Moderate production-path advisories.
- `pnpm audit --audit-level=high`: pass, 0 Critical and 0 High, 3 Moderate total advisories.
- `pnpm audit:secrets`: pass.
- `pnpm audit:product-types`: pass.
- `pnpm audit:boundaries`: pass after declaring the web test dependencies locally.
- Security Weapon static scan: no hardcoded secret, Unicode concealment, wildcard CORS, JWT misuse, SQL injection, command injection, PII logging, or sensitive browser storage finding.
- Resolved framework versions: Next.js 16.2.10 and React 19.2.7, outside the applicable Critical watchlist ranges reviewed by the Weapon.
- Pinned Chromium evidence: theme transitions generate zero provider or artifact requests and do not change approval bytes, hashes, manifest IDs, approval IDs, or artifact IDs.
- Post-repair security rerun: secret, product-type, 16-package boundary, production dependency, and diff checks pass after the zero-duplication refactor. Finding counts and trust-boundary conclusions are unchanged.
- Post-CI-repair security rerun: secret, product-type, 16-package boundary, full dependency-threshold, and diff checks pass after adding the scoped Playwright Chromium prerequisite to the read-only CI job. No action pin, permission, secret, trigger, or trust boundary changed.

## Close-out

UIF-027 is security-verified. No Critical or High remediation remains. Quality Guardian may proceed, with the four Moderate follow-ups preserved as non-blocking production-hardening and dependency work.
