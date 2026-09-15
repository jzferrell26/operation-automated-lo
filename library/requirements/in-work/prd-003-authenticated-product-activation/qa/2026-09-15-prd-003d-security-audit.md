# Security Audit Report: PRD-003d Workspace Reads

**Audit date:** 2026-09-15
**Auditor:** security-guardian
**Scope:** `packages/application/src/campaign-workspace-read.ts`, `packages/db/src/campaign-repository.ts` (read contracts), `apps/web/src/server/campaign-persistence-runtime.ts`, `apps/web/src/server/campaign-workspace-reads.ts`, `apps/web/src/server/campaign-preflight-handler.ts`, `apps/web/src/server/campaign-approval-handler.ts`, `apps/web/src/server/campaign-command-http.ts`, campaign list/detail/overview pages, persisted campaign and overview screens, related tests
**Next.js version audited:** 16.3.3
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-08-26 (within 120 days)

---

## Executive Summary

PRD-003d wires authenticated campaign create, list, detail, and overview to tenant-backed persistence. No Critical or High findings. UI Client Components receive a server-side safe projection (no raw SQL rows, unrestricted JSONB manifests, `ipAuditHash`, approval snapshot, or `actorRef`). Review and production-capable modes select Postgres through `createPrincipalBoundTenantContextAuthority` and fail closed without `OALO_DATABASE_URL`. Local synthetic remains an explicit filesystem adapter. Overview empty-list catch is typed and does not fall back to the filesystem store or synthetic campaign fixtures.

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
| Data Handling | ATTN | 1 Low |

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

- [ ] **Over-broad catch on the request-scoped list loader** `apps/web/src/server/campaign-workspace-reads.ts:83-84` — `loadWorkspaceCampaignsForRequest` returns `[]` for any thrown error, not only the typed unauth/store/workspace cases used by `loadOverviewCampaigns`. Campaign mutations still fail closed (503). Overview and the list page stay empty rather than substituting synthetic campaign fixtures. Prefer narrowing the catch to the same error classes if unexpected 500s need to surface.

---

## Dependency Audit

```text
pnpm audit --prod --audit-level=high
vulnerabilities: info 0, low 0, moderate 0, high 0, critical 0
dependencies scanned: 150
```

Full output: ephemeral `reports/scan-output/npm-audit.json` (gitignored).

---

## Next.js Version Check

| CVE | Patched threshold | Current project | Status |
|---|---|---|---|
| **CVE-2025-29927** (middleware bypass) | 14.2.25 / 15.2.3 | next 16.3.3 | patched |
| **CVE-2025-55182** (React2Shell RCE) | React 19.0.1 / 19.1.2 / 19.2.1 | react 19.2.7 | patched |
| **CVE-2025-66478** (Next.js companion) | latest 14.x / 15.x / 16.x | next 16.3.3 | patched |
| **CVE-2026-27978** (null-origin CSRF) | latest | next 16.3.3 | patched |

---

## Catalog checks

- **Safe UI projection:** `projectCampaignWorkspace` copies headline, address, budgets, targeting, hashes, and finding text. It omits `ipAuditHash`, approval `snapshot`, `actorRef`, `findings.affected`, and the full manifest JSONB. `providerPublicationAuthorized` is hardcoded `false`. `assertCampaignAccessible` runs before projection.
- **IDOR / tenant isolation:** list and get SQL bind `platform.current_location_id()` plus `$1` for campaign ref. Unlocked read contracts do not use `for update`. Foreign location list/detail return empty/undefined in unit tests and Postgres integration.
- **Adapter fail-closed:** `campaignPersistenceKind` is filesystem only in synthetic workspace mode. Review/staging/production parse a postgres URL and require SSL except local. Missing URL throws `CampaignWorkspaceStoreUnavailableError`, mapped to HTTP 503 `CAMPAIGN_STORE_UNAVAILABLE` on mutations. Detail throws that error rather than rendering fixtures.
- **Principal authority:** Postgres version, read, and approval repositories receive `createPrincipalBoundTenantContextAuthority(principal, correlationId)`.
- **Injection:** campaign SQL remains named contracts with bound parameters. No `dangerouslySetInnerHTML` on the new campaign surfaces.
- **Secrets:** no tokens or live connection strings committed. Test URLs are placeholders. `pnpm audit` high+ is clean.
- **Deterministic scan:** unicode rules scan clean. `NEXT_PUBLIC_` secret-name hits are existing negative tests.

---

## Files Changed (remediation)

| File | Change Summary |
|---|---|
| `apps/web/src/server/campaign-persistence-runtime.ts` | Pool typed as `PostgresDatabasePool`; previous pool is closed on fingerprint change; test reset awaits `close()`. |

Run `git diff` to review every change; diff reviewed and confirmed security-scoped on 2026-09-15.

---

## Recommended Follow-Up (architectural)

- Narrow `loadWorkspaceCampaignsForRequest` catch to the typed error classes already handled by `loadOverviewCampaigns`, motivated by the Low finding at `apps/web/src/server/campaign-workspace-reads.ts:83-84`.

---

*Generated by `security-guardian` using `security-weapon`. See `.cursor/skills/security-weapon/` for methodology.*
