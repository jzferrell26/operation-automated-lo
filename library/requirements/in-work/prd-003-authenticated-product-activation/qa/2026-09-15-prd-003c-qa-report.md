# QA Report: PRD-003c Human Approval

**Plan document:** `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003c-authenticated-product-activation-human-approval.md`
**Audit date:** 2026-09-15
**Base branch:** `main`
**Head:** `cursor/prd-003c-human-approval-fba2`
**Auditor:** quality-guardian

## Summary

Pass. 003c makes named human approval executable: the command reloads persisted version and preflight, binds actor and role from the verified principal, records an immutable `ApprovalDecision`, and atomically advances a passing campaign from `awaiting_approval` to `approved`. Security review found no Critical or High issues. The web mutation still uses the explicit local/synthetic filesystem adapter; Postgres remains the durable repository for 003d to wire.

## Scorecard

| Category      | Status | Notes |
|---------------|--------|-------|
| Completeness  | ✅     | Command, Postgres atomic repository, HTTP route, evidence UI, and tests required by 003c are present |
| Correctness   | ✅     | Tests cover hints, blocking/stale/mismatch, creator deny, idempotent retry, optimistic conflict, and UI permission |
| Alignment     | ✅     | Application does not import auth or db; actor kind is server-derived; rejected stays `awaiting_approval` |
| Gaps          | ✅     | Web Postgres cutover is correctly left to 003d; Playwright click-path is covered by handler plus RTL evidence |
| Detrimental   | ✅     | No provider publish, no new rejection state, no machine approval, no secrets |

## Critical Issues (must fix)

None.

## Warnings (should fix)

None.

## Suggestions (consider improving)

- [ ] **Point the approve route at Postgres in 003d** (`apps/web/src/server/campaign-approval-handler.ts:81`)

  The handler currently constructs `createLocalCampaignApprovalRepository(environment)`. `PostgresCampaignApprovalRepository` already commits decision, status, command, and audit in one tenant transaction. 003d should select that repository outside local synthetic mode.

## Plan Item Traceability

| # | Plan Requirement | Status | Implementation Location | Notes |
|---|---|---|---|---|
| Goal | Named human approval of the exact persisted version | ✅ | `packages/application/src/campaign-approval-command.ts` | Uses `createApprovalDecision` |
| Scope / reload | Load persisted version and current preflight under tenant context | ✅ | `executeHumanCampaignApproval`, `PostgresCampaignApprovalRepository.loadCurrentEvidence` | Browser hashes are `hintsMatch` only |
| 003C-AC-001 | Reload server-side; browser hashes are hints | ✅ | `packages/application/src/campaign-approval-command.ts:116-144,168-174` | Stale hints throw `CampaignApprovalStaleError` |
| 003C-AC-002 | Reject blocking, missing, stale, or mismatched preflight | ✅ | command tests; `CampaignApprovalNotReadyError` | Tampered manifest hash fails `createApprovalDecision` |
| 003C-AC-003 | Store immutable `ApprovalDecisionSchema` snapshot | ✅ | `createApprovalDecision` plus insert contract | Snapshot comes from the loaded version |
| 003C-AC-004 | `awaiting_approval` to `approved` plus audit | ✅ | command transition; `commitApproval` insert audit | Rejected stays `awaiting_approval` with no event |
| 003C-AC-005 | Later edits cannot inherit the decision | ✅ | Approval bound to `campaignVersionRef` | Duplicate short-circuit requires same version |
| 003C-AC-006 | Actor kind always human; no request parameter | ✅ | `campaign-approval-command.ts:241`; request schema `.strict()` | Client `actorKind` is 400 |
| 003C-AC-007 | Creator without approver authority is denied, no mutation | ✅ | command denied path; handler 403 | `recordDeniedAttempt` only |
| 003C-AC-008 | Viewer, publisher, model, service, cross-location cannot approve | ✅ | role loop in command tests; location mismatch is not-accessible | Cross-tenant shares hide-existence error |
| 003C-AC-009 | Denied writes safe audit, never an approval row | ✅ | `recordDeniedAttempt`; Postgres insert-audit only | Local adapter no-ops denied audit |
| Command transaction | Atomic decision + status + command + audit | ✅ | `packages/db/src/campaign-repository.ts:674-809` | Web filesystem adapter is the synthetic path |
| API contract | Minimal body; server supplies actor/evidence | ✅ | `apps/web/src/server/campaign-approval-handler.ts:25-34,54-84` | |
| UI evidence before enable | Version, hashes, budget, targeting, dates, disclosures, scope | ✅ | `persisted-campaign-screen.tsx`, `campaign-approval-controls.tsx` | Creator sees permission_restricted |
| Idempotent retry | Same command key does not double-insert | ✅ | Postgres command lookup; application duplicate short-circuit | Handler unit test retries 200 `duplicate: true` |
| Concurrency | Approval loses if row/version changed | ✅ | optimistic update contract; FakeConnection conflict | Also browser `expectedRowVersion` hint |
| Browser test | Creator unavailable; approver sees evidence | ✅ | `persisted-campaign-screen.integration.test.tsx` | RTL, not Playwright |
| NG-publish | No provider draft/publish | ✅ | UI copy; no outbox write | |
| NG-projection | No extra realtor projection approval | ✅ | unchanged | |
| NG-machine | No automatic/model/service approval | ✅ | `actorKind: "human"` hardcoded | |
| NG-rejected-state | No new rejection state | ✅ | reject keeps `awaiting_approval` | |

## Files Changed

- `.cursor/rules/core/the-map.mdc` (M): 003c is the current wave
- `apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx` (M): read principal plus location-scoped `canApprove`
- `apps/web/src/app/api/campaigns/approve/route.ts` (A): POST transport
- `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx` (A): confirm-before-approve UI
- `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx` (M): evidence cards and approval control
- `apps/web/src/features/campaigns/components/persisted-campaign-screen.integration.test.tsx` (A): creator vs approver UI
- `apps/web/src/server/authenticated-principal.ts` (M): read principal without CSRF
- `apps/web/src/server/authenticated-principal.unit.test.ts` (M): GET read vs cookie mutation
- `apps/web/src/server/campaign-approval-handler.ts` (A): HTTP command adapter
- `apps/web/src/server/campaign-approval-handler.unit.test.ts` (A): 400/403/409/401 and idempotent approve
- `apps/web/src/server/campaign-command-http.ts` (A): shared auth error mapping
- `apps/web/src/server/campaign-command-test-support.ts` (M): isolated store path env
- `apps/web/src/server/campaign-preflight-handler.ts` (M): shared error mapping
- `apps/web/src/server/campaign-preflight-handler.unit.test.ts` (M): isolated store
- `apps/web/src/server/local-campaign-store.ts` (M): row version, approval, path-aware store
- `library/knowledge/private/product/project-map.md` (M): 003c in progress
- `library/requirements/in-work/README.md` (M): 003c status
- `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md` (M): 003c In Work
- `library/requirements/in-work/prd-003-authenticated-product-activation/prd-003c-authenticated-product-activation-human-approval.md` (M): status In Work
- `library/requirements/in-work/prd-003-authenticated-product-activation/qa/2026-09-15-prd-003c-security-audit.md` (A): security closeout
- `library/requirements/in-work/prd-003-authenticated-product-activation/qa/2026-09-15-prd-003c-qa-report.md` (A): this report
- `packages/application/src/campaign-approval-command.ts` (A): human approval command
- `packages/application/src/campaign-command-context.ts` (M): approval role mapping and session authority
- `packages/application/src/index.ts` (M): export approval command
- `packages/db/src/campaign-repository.ts` (M): Postgres approval repository
- `packages/db/src/index.ts` (M): export approval repository
- `packages/db/test/campaign-repository.integration.test.mjs` (M): atomic approval + retry
- `packages/db/test/campaign-repository.test.mjs` (M): command lookup decode
- `tooling/tests/unit/production-foundation/campaign-approval-command.test.ts` (A): application policy tests
- `tooling/tests/unit/production-foundation/campaign-command-context.test.ts` (M): actorRole mapping
- `tooling/tests/unit/production-foundation/campaign-persistence.test.ts` (M): FakeConnection approval path
