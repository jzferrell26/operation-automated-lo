# QA Report: PRD-003a Campaign Persistence

**Plan document:** `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003a-authenticated-product-activation-campaign-persistence.md`
**Audit date:** 2026-09-15
**Base branch:** `main`
**Head:** `cursor/prd-003a-campaign-persistence-fba2`
**Auditor:** quality-guardian

## Summary

Pass with warnings. 003a delivers additive campaign-version, preflight, and approval storage, a `TenantTransaction` repository, idempotent `createCampaignVersion`, and unit coverage for hash mismatch, retry, tenant isolation (pgTAP authored), and aggregate status. Local filesystem persistence is unchanged and remains the explicit local/synthetic path. pgTAP and live Postgres integration were not executed in this agent environment; CI must run `pnpm test:db` before merge. 003b/003c/003d are correctly left unstarted.

## Scorecard

| Category      | Status | Notes |
|---------------|--------|-------|
| Completeness  | ✅     | Schema, RLS, repository, application port, and tests required by 003a are present |
| Correctness   | ✅     | Canonical hash check, idempotent retry, blocking vs passing status, parameterized SQL |
| Alignment     | ✅     | Additive migration, `campaign` schema, `withTenantTransaction`, opaque refs |
| Gaps          | ⚠️     | Real Postgres / pgTAP not run here; CI must prove them |
| Detrimental   | ✅     | No 003b-003d scope creep; web still uses the local adapter |

## Critical Issues (must fix)

None.

## Warnings (should fix)

- [ ] **Live database tests not executed in this environment:** `supabase/tests/campaign_activation.pgtap.sql` and `packages/db/test/campaign-repository.integration.test.mjs`

  The plan requires pgTAP RLS/append-only coverage and integration tests for concurrency, hash matching, and retry. Those files exist. This session could not boot Supabase or `OALO_TEST_DATABASE_URL`. Treat CI `pnpm test:db` (and `test:postgres` when a test database is present) as a merge gate, not optional.

## Suggestions (consider improving)

- [ ] **Caller `locationRef` is unused in the Postgres transaction:** `packages/db/src/campaign-repository.ts`

  `getByCampaignVersionRef` and `getLatestVersionNo` take `locationRef` for port compatibility but read only `platform.current_location_id()`. That is the correct security posture. A later 003b pass can assert the session locationRef matches the transaction before calling the repository.

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|------------------|--------|-------------------------|-------|
| 003A-AC-001 | Creating a version writes one immutable `campaign.campaign_versions` row with a monotonic version number | ✅ | `packages/db/src/campaign-repository.ts` (`append`, `getLatestVersionNo`); unique `(location_id, campaign_id, version_no)` | Campaign row locked via `ON CONFLICT` on `campaign_ref` |
| 003A-AC-002 | Stored manifest hash equals the canonical hash; mismatch rejected before commit | ✅ | `packages/db/src/campaign-repository.ts` `canonicalHash`; unit test in `campaign-persistence.test.ts` | |
| 003A-AC-003 | Retrying the same idempotent create does not create a duplicate version | ✅ | `packages/application/src/campaign-foundation.ts` `getByCampaignVersionRef`; harness + postgres unit tests | |
| 003A-AC-004 | A second location cannot read the row even with its campaign/version reference | ✅ | RLS `platform.tenant_matches`; `select` filtered by `current_location_id()`; pgTAP isolation cases | Live RLS proof deferred to CI |
| 003A-AC-005 | Preflight persistence requires matching campaign ref, version ref, and manifest hash | ✅ | `insertPreflightContract` join; `CAMPAIGN_PREFLIGHT_MISMATCH` | |
| 003A-AC-006 | Preflight findings, ruleset, blocking flag, timestamp, and result hash are immutable after insert | ✅ | Append-only trigger; app_runtime has no UPDATE/DELETE | |
| 003A-AC-007 | Blocking preflight sets `preflight_failed`; passing sets `awaiting_approval` | ✅ | `persistPreflight`; unit test asserts status bind | |
| Data model | `campaign_versions`, `preflight_results`, `approval_decisions` with required uniques and FK indexes | ✅ | `supabase/migrations/20260915180000_campaign_activation.sql` | Approval table included for 003c |
| Repository | Use `withTenantTransaction`; decode through SQL contracts and Zod | ✅ | `packages/db/src/campaign-repository.ts` | |
| Filesystem | Preserve local filesystem only behind explicit local/synthetic adapter | ✅ | `apps/web/src/server/open-house-draft.ts` still no-ops append | |
| NG | Session bootstrap, approval UI, provider publishing | ✅ | Not started | |
| phase0 | Tenant table count includes the three new tables | ✅ | `supabase/tests/phase0_scaffold.pgtap.sql` 20 to 23 | |

## Files Changed

- `.cursor/rules/core/the-map.mdc` (M): PRD-003 path now in-work
- `NEXT_BATCH_LEDGER.md` (M): PRD-003 link and in-work wording
- `apps/web/src/server/open-house-draft.ts` (M): stub implements `getByCampaignVersionRef`
- `library/knowledge/private/product/project-map.md` (M): in-work link and 003a status
- `library/requirements/in-work/README.md` (M): lists PRD-003
- `library/requirements/in-work/prd-003-authenticated-product-activation/*` (R): moved from backlog
- `packages/application/src/campaign-foundation.ts` (M): idempotent create
- `packages/db/package.json` (M): `@oalo/application` workspace dependency
- `packages/db/src/campaign-repository.ts` (A): Postgres repository
- `packages/db/src/index.ts` (M): exports
- `packages/db/test/campaign-repository.test.mjs` (A): contract decode tests
- `packages/db/test/campaign-repository.integration.test.mjs` (A): real-Postgres tests (skip without URL)
- `packages/db/test/transaction-context.test.mjs` (M): expect default `SET LOCAL ROLE`
- `pnpm-lock.yaml` (M): workspace link
- `supabase/migrations/20260915180000_campaign_activation.sql` (A): additive schema
- `supabase/tests/campaign_activation.pgtap.sql` (A): RLS, uniqueness, append-only
- `supabase/tests/phase0_scaffold.pgtap.sql` (M): 23 tenant tables
- `tooling/tests/unit/production-foundation/campaign-foundation.test.ts` (M): retry harness
- `tooling/tests/unit/production-foundation/campaign-persistence.test.ts` (A): repository unit tests
- `library/requirements/in-work/prd-003-authenticated-product-activation/qa/2026-09-15-prd-003a-security-audit.md` (A)
- `library/requirements/in-work/prd-003-authenticated-product-activation/qa/2026-09-15-prd-003a-qa-report.md` (A)
