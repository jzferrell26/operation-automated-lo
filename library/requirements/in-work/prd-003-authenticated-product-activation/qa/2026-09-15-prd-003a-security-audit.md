# Security Audit Report: PRD-003a Campaign Persistence

**Audit date:** 2026-09-15
**Auditor:** security-guardian
**Scope:** `supabase/migrations/20260915180000_campaign_activation.sql`, `supabase/tests/campaign_activation.pgtap.sql`, `packages/db/src/campaign-repository.ts`, `packages/db/src/index.ts`, `packages/application/src/campaign-foundation.ts`, `apps/web/src/server/open-house-draft.ts`, unit and integration tests for campaign persistence
**Next.js version audited:** 16.3.3
**React version audited:** 19.2.7
**CVE watchlist last refreshed:** 2026-08-26 (within 120 days)

---

## Executive Summary

PRD-003a adds tenant-scoped append-only campaign evidence storage and a Postgres repository behind `withTenantTransaction`. No Critical or High findings. Tenant identity comes from the verified transaction context, not from caller-supplied location arguments. SQL is parameterized through named contracts. Evidence rows store hashes rather than raw IP, tokens, or request payloads. Financial and PII risk for this diff is low: property address in the campaign manifest is campaign content already defined by `@oalo/contracts`, not a new consumer-PII collector.

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

`@oalo/db` gained an internal workspace dependency on `@oalo/application` (types for `CampaignVersionRepository`). No new third-party packages. `pnpm audit --audit-level=high` was not re-run against the full lockfile in this audit because the lockfile delta is a workspace link only.

Next.js 16.3.3 and React 19.2.7 remain outside the CVE-2025-29927 / CVE-2025-55182 affected ranges in the 2026-08-26 watchlist.

---

## Next.js Version Check

- CVE-2025-29927 middleware bypass: not applicable to this diff (no middleware or auth transport change). Next 16.3.3 is past the 14.2.25 / 15.2.3 patches.
- CVE-2025-55182 React2Shell: React 19.2.7 is at or above 19.2.1.
- This change is server-side Postgres persistence. No RSC payload or Server Action surface was added.

---

## Category notes (checked)

- **AuthZ / IDOR:** `PostgresCampaignVersionRepository` always runs inside `withTenantTransaction`. SELECT/INSERT SQL predicates use `platform.current_location_id()`. RLS is enabled and forced on `campaign.campaign_versions`, `campaign.preflight_results`, and `campaign.approval_decisions` with `platform.tenant_matches(location_id)`. `getByCampaignVersionRef` ignores the caller location argument and reads only the transaction tenant.
- **Injection:** Contract SQL is static. Bindings are `$n` parameters. JSON is passed as text then cast to `jsonb`.
- **PII:** Approval rows store `ip_audit_hash` (64 hex), not raw IP. Grants are select/insert for `app_runtime` and select-only for `support_runtime`. Append-only triggers reject UPDATE/DELETE.
- **Secrets:** No env defaults, tokens, or credentials added.
- **Web wiring:** `/api/campaigns/preflight` still uses the local in-memory stub. 003a does not expose a new authenticated mutation that writes Postgres from the browser. That remains 003b/003d.

---

## Files Changed (audit-relevant)

- `supabase/migrations/20260915180000_campaign_activation.sql` (A): additive tables, RLS, append-only trigger, grants
- `packages/db/src/campaign-repository.ts` (A): tenant repository
- `packages/application/src/campaign-foundation.ts` (M): idempotent create via `getByCampaignVersionRef`

---

## Residual risk

pgTAP and real-Postgres integration tests exist but were not executed in this environment (no local Supabase / `OALO_TEST_DATABASE_URL`). CI `pnpm test:db` must stay required before merge. Do not start 003b until that gate is green.
