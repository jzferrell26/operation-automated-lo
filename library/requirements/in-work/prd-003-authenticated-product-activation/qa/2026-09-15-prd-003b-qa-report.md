# QA Report: PRD-003b Session Command Context

**Plan document:** `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003b-authenticated-product-activation-session-command-context.md`
**Audit date:** 2026-09-15
**Base branch:** `main`
**Head:** `cursor/prd-003b-session-command-context-fba2`
**Auditor:** quality-guardian

## Summary

Pass. 003b makes the verified server principal the authority for campaign create/preflight: embedded and first-party sessions normalize to one shape, local synthetic identity is explicit and fail-closed outside synthetic workspace mode, and the draft body cannot override tenant, actor, or role. Security review found no Critical or High issues. 003c and 003d remain unstarted.

## Scorecard

| Category      | Status | Notes |
|---------------|--------|-------|
| Completeness  | ✅     | Principal adapter, inbound auth, command authorization, approval port, and tenant-context factory required by 003b are present |
| Correctness   | ✅     | Tests cover stale roleVersion, viewer mutation, creator-cannot-approve, body override, and synthetic-mode isolation |
| Alignment     | ✅     | Application does not import auth or db; web owns request adaptation; mutation transport stays `/api/campaigns/preflight` |
| Gaps          | ✅     | Postgres web wiring and approval HTTP are correctly left to 003d and 003c |
| Detrimental   | ✅     | No provider traffic, no schema change, no synthetic fallback in review/staging/production |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

- [ ] **Use the principal-bound tenant factory on the 003d SQL path** — `packages/db/src/transaction-context.ts`

  003b ships `createPrincipalBoundTenantContextAuthority` and `assertPrincipalOwnsTransaction`, and tests them. The web preflight handler still persists through the local filesystem adapter, which is the agreed 003d cutover. When that lands, call the factory rather than constructing a raw `TenantContextAuthority` stub.

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|---|---|---|---|
| Goal | Session is sole authority for tenant/actor/installation/role | ✅ | `apps/web/src/server/authenticated-principal.ts`, `apps/web/src/server/open-house-draft.ts` | Hard-coded `location_localWorkspace001` remains only on the explicit local synthetic principal |
| US-003B.1 / 003B-AC-001 | Creation derives location from session; body cannot override tenant | ✅ | `apps/web/src/server/open-house-draft.ts`, `apps/web/src/server/campaign-preflight-handler.unit.test.ts` | Draft schema is `.strict()`; extra `locationRef` is 400 |
| 003B-AC-002 | Session location matches database transaction location before SQL | ✅ | `packages/application/src/campaign-command-context.ts`, `packages/db/src/transaction-context.ts` | Factory copies principal UUIDs and re-asserts before resolve; web SQL wiring is 003d |
| 003B-AC-003 | Cross-tenant campaign ref is not accessible and does not leak existence | ✅ | `assertCampaignAccessible` in `packages/application/src/campaign-command-context.ts` | Same error for missing and other-location resources |
| US-003B.2 / 003B-AC-004 | Stale role versions fail before command execution | ✅ | `packages/auth/src/inbound-session.ts`, `apps/web/src/server/authenticated-principal.ts` | Current role version comes from `RoleBindingPort`, not the token |
| 003B-AC-005 | `campaign_creator` may create/freeze but cannot approve as creator | ✅ | `assertMayExecuteCampaignMutation`, `createSessionApprovalAuthority` | Creator mutation allowed; approval port rejects |
| 003B-AC-006 | `campaign_approver` reaches approval only after server checks | ✅ | `createSessionApprovalAuthority` | Approval HTTP transport is 003c; the port is the 003b boundary |
| 003B-AC-007 | `viewer` cannot execute campaign mutations | ✅ | `CAMPAIGN_MUTATION_ROLES`, compile tests | Also rejects publisher and platform_support |
| Principal contract | actor/location UUIDs and refs, installation, role, roleVersion, sessionId, mode | ✅ | `AuthenticatedPrincipal` | Modes: `embedded`, `first_party`, `local_synthetic` |
| Embedded + first-party normalize | Same application principal shape | ✅ | `apps/web/src/server/authenticated-principal.unit.test.ts` | Shared identity directory and role binding |
| Local synthetic only when permitted | Impossible in staging/production-capable modes | ✅ | `resolveAuthenticatedPrincipal`, `compileOpenHouseDraft` | Review mode without a session is 401 |
| ApprovalAuthorityPort | Session-backed implementation | ✅ | `createSessionApprovalAuthority` | Uses session role, not the approval-decision enum, as authority |
| TenantContextAuthority | Built from principal | ✅ | `createPrincipalBoundTenantContextAuthority` | |
| HTTP mapping | 401 / 403 / 404 / 400 | ✅ | `apps/web/src/server/campaign-preflight-handler.ts` | Stable error codes; no auth exception text |
| NG-G2 | Do not complete HighLevel App Test matrix | ✅ | unchanged | Live HighLevel verify remains disabled |
| NG-OAuth | No new OAuth scopes or token storage | ✅ | unchanged | |
| NG-publish | No provider publishing authority | ✅ | unchanged | |
| NG-switching | No general org/agency switching | ✅ | unchanged | |

## Files Changed

- `apps/web/package.json` (M): add `@oalo/auth`
- `apps/web/src/app/api/campaigns/preflight/route.ts` (M): delegate to authenticated handler
- `apps/web/src/server/authenticated-principal.ts` (A): request-to-principal adapter
- `apps/web/src/server/authenticated-principal.unit.test.ts` (A): session normalization and fail-closed tests
- `apps/web/src/server/campaign-command-test-support.ts` (A): shared draft fixture
- `apps/web/src/server/campaign-preflight-handler.ts` (A): command entry and status mapping
- `apps/web/src/server/campaign-preflight-handler.unit.test.ts` (A): HTTP status tests
- `apps/web/src/server/local-campaign-store.unit.test.ts` (M): pass synthetic principal
- `apps/web/src/server/open-house-draft.ts` (M): bind location/actor from principal
- `apps/web/src/server/open-house-draft.unit.test.ts` (M): principal-aware compile tests
- `library/knowledge/private/product/project-map.md` (M): 003b in progress
- `library/requirements/in-work/README.md` (M): 003b status
- `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md` (M): 003b In Work
- `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003b-authenticated-product-activation-session-command-context.md` (M): status In Work
- `library/requirements/in-work/prd-003-authenticated-product-activation/qa/2026-09-15-prd-003b-security-audit.md` (A): security closeout
- `library/requirements/in-work/prd-003-authenticated-product-activation/qa/2026-09-15-prd-003b-qa-report.md` (A): this report
- `packages/application/src/campaign-command-context.ts` (A): principal and command authorization
- `packages/application/src/index.ts` (M): export command-context
- `packages/auth/src/browser-session.ts` (M): established first-party session lookup
- `packages/auth/src/embedded-session.ts` (M): shared signature/lifetime helpers
- `packages/auth/src/inbound-session.ts` (A): inbound authenticators
- `packages/auth/src/index.ts` (M): export inbound session
- `packages/auth/src/session-policy.ts` (M): shared session role set
- `packages/db/src/index.ts` (M): export principal-bound authority factory
- `packages/db/src/transaction-context.ts` (M): principal-bound `TenantContextAuthority`
- `pnpm-lock.yaml` (M): workspace `@oalo/auth` link
- `tooling/tests/unit/production-foundation/auth-policy.test.ts` (M): inbound session tests
- `tooling/tests/unit/production-foundation/campaign-command-context.test.ts` (A): authorization and tenant-match tests
- `vitest.config.ts` (M): `@oalo/auth` alias
