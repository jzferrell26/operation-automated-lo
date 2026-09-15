# PRD-003c: Authenticated Product Activation - Human Approval

> **Parent:** [PRD-003](./prd-003-authenticated-product-activation-index.md)
> **Status:** In Work
> **Priority:** P0
> **Schema changes:** Uses PRD-003a additive tables

## Goal

Make the existing PRD-001 human-approval domain contract executable from the authenticated product: an authorized human approver reviews the exact persisted version and records an auditable decision that legally advances a passing campaign to `approved`.

## Scope

- Add a server-side approval command using `createApprovalDecision` from `@oalo/application`.
- Load the exact persisted campaign version and current accepted preflight result under tenant context.
- Bind actor identity and role from PRD-003b's verified principal.
- Persist approval decision, campaign aggregate transition, `integration.command_executions`, and `audit.events` atomically.
- Show immutable version/preflight evidence on the campaign detail screen before the approval control is enabled.
- Make the action idempotent and safe against double-submit/retry.

## Non-Goals

- Provider draft creation or publish confirmation.
- Realtor projection approval beyond the already-defined policy unless the exact projection UI is included in this batch.
- Automatic/model/service approval.
- Introducing a new rejection state not already authorized by the domain state machine.

## User stories

### US-003C.1 - Approve exact current evidence

**As a** campaign approver, **I want** to approve the exact campaign version I reviewed, **so that** later edits cannot inherit my decision.

Acceptance criteria:

- `003C-AC-001`: the approval command reloads the persisted version and preflight server-side; browser-supplied hashes are comparison hints at most, never authoritative data.
- `003C-AC-002`: approval is rejected if preflight is blocking, missing, stale, or bound to a different campaign-version/manifest hash.
- `003C-AC-003`: the decision stores the immutable approval snapshot required by `ApprovalDecisionSchema`.
- `003C-AC-004`: success changes aggregate state from `awaiting_approval` to `approved` using the existing legal state transition and appends audit evidence.
- `003C-AC-005`: later material edits create a new version and the prior approval cannot satisfy publish readiness for the new version.

### US-003C.2 - Prevent self-elevation and machine approval

**As a** compliance owner, **I want** only verified humans with the current approver role to approve, **so that** creators, models, services, and tampered clients cannot manufacture authority.

Acceptance criteria:

- `003C-AC-006`: actor kind is always derived as human from a verified user session; no request parameter can set actor kind.
- `003C-AC-007`: a creator without `campaign_approver` authority receives a denied result and no state mutation.
- `003C-AC-008`: a viewer, publisher-only user, model, service, or cross-location principal cannot record an approval.
- `003C-AC-009`: denied attempts may write safe audit evidence but never write an approval decision row.

## Command transaction

One database transaction should perform the complete durable command:

1. establish tenant/actor context;
2. load campaign aggregate + exact immutable version + current preflight;
3. validate expected row/version for optimistic concurrency;
4. call application approval policy;
5. insert approval decision;
6. transition `campaign.campaigns.status` to `approved` and increment row version;
7. write `integration.command_executions` result;
8. append `audit.events` safe before/after hashes;
9. commit.

There is no outbox/provider event in this PRD unless a future explicit publish/draft command consumes the approved state.

## API/UI contract

- Approval input should be minimal: campaign ref, expected campaign-version ref/row version, and decision.
- The server supplies actor, role, location, timestamps, audit hash inputs, and authoritative persisted evidence.
- The UI must display campaign version, manifest hash/evidence summary, preflight status, budget, targeting, dates, disclosures, and the exact approval scope before enabling approval.

## Files expected to change

- `apps/web/src/app/(authenticated)/marketing/campaigns/[campaignRef]/page.tsx`
- `apps/web/src/features/campaigns/components/*approval*`
- authenticated campaign mutation route/Server Action
- `packages/db/src/campaign-repository.ts`
- `packages/application/src/campaign-foundation.ts` only if orchestration port composition is required
- approval authorization, integration, and browser tests

## Test plan

- Application tests for human/non-human, stale preflight, mismatched hashes, and invalid roles.
- DB integration for atomic approval + aggregate transition + audit record.
- Retry/idempotency test: same command key does not double-insert approval.
- Concurrency test: approval loses if campaign row/version changed after review.
- Browser test: creator sees approval unavailable; approver sees explicit evidence and can approve once.

## Risks

- Approval is a security-sensitive mutation; any use of client-derived role or tenant is Critical.
- Approval evidence must remain immutable even after later campaign versions are created.

