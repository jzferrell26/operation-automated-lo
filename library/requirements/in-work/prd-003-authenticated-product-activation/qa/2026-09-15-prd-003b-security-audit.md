# Security Audit Report: PRD-003b Session Command Context

**Audit date:** 2026-09-15
**Auditor:** security-guardian
**Scope:** `packages/auth/src/inbound-session.ts`, `packages/auth/src/embedded-session.ts`, `packages/auth/src/browser-session.ts`, `packages/application/src/campaign-command-context.ts`, `packages/db/src/transaction-context.ts`, `apps/web/src/server/authenticated-principal.ts`, `apps/web/src/server/campaign-preflight-handler.ts`, `apps/web/src/server/open-house-draft.ts`, `apps/web/src/app/api/campaigns/preflight/route.ts`, related unit tests
**Next.js version audited:** 16.3.3
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-08-26 (within 120 days)

---

## Executive Summary

PRD-003b replaces hard-coded campaign principals with a verified server session. No Critical or High findings. Embedded tokens are still EdDSA-only with a shared signature path, cookie mutations still require Origin/Host plus a session-bound CSRF token, and local synthetic identity cannot be selected when a cookie or bearer is present or when the workspace mode is review, staging, or production. Financial and PII risk for this diff is low: the handler no longer returns exception messages on auth failures, and campaign body fields remain the existing draft contract.

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

Legend: **OK** = zero findings · **ATTN** = Medium/Low findings documented · **FAIL** = Critical/High findings (fixed in this session).

---

## Critical Findings (fixed in this session)

None detected.

---

## High Findings (fixed in this session)

None detected.

---

## Medium Findings (follow-up required)

None detected.

---

## Low Findings (documentation only)

None detected.

---

## Dependency Audit

`@oalo/web` gained an internal workspace dependency on `@oalo/auth`. No new third-party packages. The lockfile delta is the workspace link only.

Next.js 16.3.3 and React 19.2.7 remain outside the CVE-2025-29927 / CVE-2025-55182 affected ranges in the 2026-08-26 watchlist.

---

## Next.js Version Check

| CVE | Patched threshold | Current project | Status |
|---|---|---|---|
| **CVE-2025-29927** (middleware bypass) | 14.2.25 / 15.2.3 | 16.3.3 | patched |
| **CVE-2025-55182** (React2Shell RCE) | React 19.0.1 / 19.1.2 / 19.2.1 | 19.2.7 | patched |
| **CVE-2025-66478** (Next.js companion) | latest 14.x / 15.x / 16.x | 16.3.3 | patched |
| **CVE-2026-27978** (null-origin CSRF) | latest | 16.3.3 | patched; cookie mutations reject null Origin via `assertBrowserMutationRequest` |

---

## Category notes (checked)

- **AuthN / session bootstrap:** `authenticateInboundEmbeddedSession` verifies signature, issuer, audience, lifetime, active session, and current role version without trusting a caller-supplied subject. `verifyEmbeddedSessionToken` still requires expected bindings for the existing handshake path. Cookie plus bearer fails closed. A cookie with no first-party lookup fails closed and does not fall back to local synthetic.
- **AuthZ / two-layer:** The preflight handler resolves the principal, then `compileOpenHouseDraft` calls `assertMayExecuteCampaignMutation` and writes `principal.locationRef` / `principal.actorRef`. The draft schema is `.strict()`, so extra tenant fields return 400. `createPrincipalBoundTenantContextAuthority` copies principal UUIDs and re-checks them before SQL. Cross-tenant and missing resources share `CampaignResourceNotAccessibleError`.
- **CSRF / origin:** Cookie mutations require `x-csrf-token` plus Origin host equality. Embedded bearer mutations require an allowlisted origin. Default local ports omit mutation/embedded config, so a presented cookie or bearer cannot authenticate without injected ports.
- **JWT algorithm confusion:** Embedded header parse still requires EdDSA and rejects other `alg` values. Signature verification uses the `kid` public key map only.
- **Error leakage:** Auth, forbidden, and not-found responses return stable codes without exception messages. Zod draft issues remain 400 with issue objects.
- **Secrets:** No env defaults, private keys, or session secrets were added to git.
- **Web persistence:** Preflight still writes the local filesystem adapter. That is 003d scope, not a session-authority bypass.

---

## Files Changed (audit-relevant)

- `packages/auth/src/inbound-session.ts` (A): inbound embedded and first-party authenticators
- `packages/auth/src/embedded-session.ts` (M): shared signature and lifetime helpers
- `packages/application/src/campaign-command-context.ts` (A): principal, mutation, approval, and tenant-match helpers
- `apps/web/src/server/authenticated-principal.ts` (A): request-to-principal adapter
- `apps/web/src/server/campaign-preflight-handler.ts` (A): status mapping and command entry
- `apps/web/src/server/open-house-draft.ts` (M): session-bound location and actor

Run `git diff origin/main...HEAD` to review every change. Diff reviewed and confirmed security-scoped on 2026-09-15.

---

## Recommended Follow-Up (architectural)

- 003d should construct `createPrincipalBoundTenantContextAuthority` on every authenticated campaign SQL path so the session/transaction match cannot be skipped by a new repository caller.
- 003c should call `createSessionApprovalAuthority` from the approval mutation transport and keep approval `actorRole` distinct from session `ApplicationRole`.
