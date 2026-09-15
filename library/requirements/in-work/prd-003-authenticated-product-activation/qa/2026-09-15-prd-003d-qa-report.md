# QA Report: PRD-003d Workspace Reads

**Plan document:** `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003d-authenticated-product-activation-workspace-reads.md`
**Audit date:** 2026-09-15
**Base branch:** `main`
**Head:** `cursor/prd-003d-workspace-reads-fba2`
**Auditor:** quality-guardian

## Summary

Pass. 003d makes authenticated campaign create, list, detail, and overview read tenant-backed campaign state through a safe application projection. Synthetic workspace mode keeps the explicit filesystem adapter. Review and production-capable modes use Postgres via `createPrincipalBoundTenantContextAuthority` and fail closed without a database URL. Security review found no Critical or High issues. Dedicated demo/synthetic pages remain labeled; reports stay fixture-backed with the existing review disclosure.

## Scorecard

| Category      | Status | Notes |
|---------------|--------|-------|
| Completeness  | ✅     | Projection, Postgres read repo, web adapter, list/detail/overview wiring, and tests required by 003d are present |
| Correctness   | ✅     | Unit, fake-pool, and integration tests cover list/get, tenant isolation, fail-closed review, and UI evidence |
| Alignment     | ✅     | Application does not import db; Client Components receive the projection, not raw SQL/JSONB |
| Gaps          | ✅     | Playwright create-refresh is covered by handler plus RTL plus unit reads; live pgTAP remains CI |
| Detrimental   | ✅     | No provider publish, no filesystem fallback in review, no synthetic campaign fixtures as authority |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

- [ ] **Narrow the request-scoped list catch** (`apps/web/src/server/campaign-workspace-reads.ts:83-84`)

  `loadWorkspaceCampaignsForRequest` swallows every error into an empty list. `loadOverviewCampaigns` already filters to unauth, store-unavailable, and workspace-unavailable. Matching that set would let unexpected failures surface on the list route.

- [ ] **Playwright create-refresh path** (`prd-003d` test plan)

  Browser create -> persist -> detail -> refresh is covered by preflight handler tests, persisted-screen RTL, and workspace-read unit tests. A Playwright click-path is not in this PR, matching the 003c evidence pattern.

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|---|---|---|---|
| Goal | Authenticated surface renders tenant-backed campaign state | ✅ | `campaign-workspace-reads.ts`, list/detail/overview pages | Filesystem only in synthetic mode |
| Scope / new | Wire `/marketing/campaigns/new` through authenticated persistence | ✅ | `campaign-preflight-handler.ts`, `createCampaignPersistenceAdapter` | Compile uses adapter `versionRepository` |
| Scope / detail | Wire `[campaignRef]` to persisted evidence | ✅ | `[campaignRef]/page.tsx`, `PersistedCampaignScreen` | Inaccessible refs `notFound()` |
| Scope / list | Tenant-scoped campaign list | ✅ | `marketing/campaigns/page.tsx`, `PostgresCampaignReadRepository.listForLocation` | |
| Scope / fixtures | Keep dedicated synthetic pages labeled | ✅ | `/demo`, `/public/synthetic-open-house-v3`, `/marketing/campaigns/synthetic-open-house-001` | Unchanged |
| 003D-AC-001 | Create returns persisted ref and navigates to detail | ✅ | preflight JSON `campaignRef` + `detailHref`; draft builder link | |
| 003D-AC-002 | Restart retains campaign because source is Postgres | ✅ | review adapter uses postgres; synthetic uses explicit FS | Review missing URL is 503, not FS |
| 003D-AC-003 | Overview/marketing list only verified location | ✅ | SQL `current_location_id()`; workspace-read unit foreign location empty | |
| 003D-AC-004 | Inaccessible ref is non-enumerating not-found | ✅ | `[campaignRef]/page.tsx:25-29`; `loadWorkspaceCampaign` returns undefined | |
| 003D-AC-005 | Preflight-failed detail shows blocking findings | ✅ | `deriveCampaignNextActions` + persisted screen findings | |
| 003D-AC-006 | Awaiting-approval exposes approve only to authorized role | ✅ | `campaignMayBeApprovedBy`; `CampaignApprovalControls` | Default local synthetic is creator |
| 003D-AC-007 | Approved detail shows who/when/safe evidence | ✅ | approval projection: decision, decidedAt, actorRole | Omits actorRef, snapshot, ipAuditHash |
| 003D-AC-008 | No UI implies provider publication | ✅ | `providerPublicationAuthorized: false`; publish action unavailable | |
| Read model | Safe projection, not raw SQL/JSONB to Client Components | ✅ | `projectCampaignWorkspace`; preflight JSON uses projection fields | |
| T-create-read | Integration create then list/get | ✅ | `campaign-repository.integration.test.mjs` read case; fake-pool unit | Live DB skipped without `OALO_TEST_DATABASE_URL` |
| T-tenant | Tenant A cannot see tenant B | ✅ | integration `readB.listForLocation() === []`; unit foreign principal | |
| T-fail-closed | Production-capable never falls back to FS | ✅ | `campaign-persistence-runtime.unit.test.ts`; overview empty on missing store | Detail/mutations throw or 503 |
| NG-reporting | Full reporting replacement | ✅ | Reports remain fixture + review disclosure | Honored |
| NG-G3 | Provider spend/status before G3 | ✅ | Overview metrics stay not-connected review copy | Honored |
| NG-publish | New public page publishing | ✅ | No publish path added | Honored |
| NG-dashboard | Generic dashboard customization | ✅ | Unchanged | Honored |
| APA-001 | Non-local create persists in Postgres, no FS | ✅ | `createCampaignPersistenceAdapter` postgres branch | Version then preflight remain two tenant transactions (003a) |
| APA-006 | List/detail/overview read persisted tenant data | ✅ | overview filters fixture `type === "campaign"` when workspace campaigns provided | |
| APA-007 | Local synthetic adapter; staging/prod fail closed | ✅ | `campaignPersistenceKind` | |
| APA-008 | No new provider side effects | ✅ | publication flag false; no HighLevel/Meta/Stripe calls | |

## Files Changed

- `apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx` (M): principal plus workspace read; inaccessible `notFound()`
- `apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx` (A): tenant campaign list
- `apps/web/src/app/(authenticated)/overview/page.tsx` (M): loads workspace campaigns
- `apps/web/src/features/campaigns/components/open-house-draft-builder.tsx` (M): safe preflight JSON fields
- `apps/web/src/features/campaigns/components/persisted-campaign-screen.integration.test.tsx` (M): projection-shaped evidence
- `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx` (M): projection UI, next actions, no raw events
- `apps/web/src/features/overview/components/overview-screen.integration.test.tsx` (M): tenant campaigns replace fixture campaign card
- `apps/web/src/features/overview/components/overview-screen.tsx` (M): workspace campaign cards
- `apps/web/src/server/authenticated-workspace-data.ts` (M): `campaignPersistenceKind`
- `apps/web/src/server/authenticated-workspace-data.unit.test.ts` (M): persistence kind cases
- `apps/web/src/server/campaign-approval-handler.ts` (M): adapter approval repository
- `apps/web/src/server/campaign-command-http.ts` (M): 503 `CAMPAIGN_STORE_UNAVAILABLE`
- `apps/web/src/server/campaign-command-test-support.ts` (M): isolated store helpers
- `apps/web/src/server/campaign-persistence-runtime.ts` (A): adapter, pool, fail-closed review
- `apps/web/src/server/campaign-persistence-runtime.unit.test.ts` (A): FS vs postgres selection
- `apps/web/src/server/campaign-preflight-handler.ts` (M): adapter persist plus projection JSON
- `apps/web/src/server/campaign-preflight-handler.unit.test.ts` (M): safe response fields
- `apps/web/src/server/campaign-workspace-reads.ts` (A): list/load/overview loaders
- `apps/web/src/server/campaign-workspace-reads.unit.test.ts` (A): location isolation and empty overview
- `apps/web/src/server/local-campaign-store.ts` (M): filesystem read repository
- `apps/web/src/server/open-house-draft.ts` (M): injectable version repository
- `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md` (M): 003d In Work; 003c Done
- `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003d-authenticated-product-activation-workspace-reads.md` (M): status In Work
- `library/requirements/in-work/prd-003-authenticated-product-activation/qa/2026-09-15-prd-003d-security-audit.md` (A): security closeout
- `library/requirements/in-work/prd-003-authenticated-product-activation/qa/2026-09-15-prd-003d-qa-report.md` (A): this report
- `packages/application/src/campaign-workspace-read.ts` (A): safe projection
- `packages/application/src/index.ts` (M): export workspace-read symbols
- `packages/db/src/campaign-repository.ts` (M): unlocked list/get read repository
- `packages/db/src/index.ts` (M): export read repository
- `packages/db/test/campaign-repository.integration.test.mjs` (M): list/get tenant isolation
- `packages/db/test/campaign-repository.test.mjs` (M): unlocked aggregate decode
- `tooling/tests/unit/production-foundation/campaign-workspace-read.test.ts` (A): projection and next-action tests
- `tooling/tests/unit/production-foundation/database-production-paths.test.ts` (M): fake-pool list/get
