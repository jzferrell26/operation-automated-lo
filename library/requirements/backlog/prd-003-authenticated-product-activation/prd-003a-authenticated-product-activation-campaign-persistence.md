# PRD-003a: Authenticated Product Activation - Campaign Persistence

> **Parent:** [PRD-003](./prd-003-authenticated-product-activation-index.md)
> **Status:** Draft
> **Priority:** P0
> **Schema changes:** Additive

## Goal

Provide the real tenant-scoped Postgres repository implementation for Open House Boost campaign versions and deterministic preflight evidence so authenticated runtime paths no longer rely on the filesystem-backed local campaign store.

## Scope

- Add immutable campaign-version, preflight-result, and approval-decision storage tables under the existing `campaign` schema.
- Add RLS policies, indexes, constraints, append-only protections, and pgTAP coverage.
- Implement `CampaignVersionRepository` and campaign read repositories using the existing `TenantTransaction` abstraction.
- Persist current campaign aggregate status in `campaign.campaigns` without duplicating immutable evidence into the aggregate row.
- Persist preflight evidence for the exact version and hash that was evaluated.
- Preserve local filesystem persistence only behind explicit local/synthetic adapter selection.

## Non-Goals

- Session bootstrap or browser identity transport.
- Human approval UI or authority resolution.
- Provider publishing, rendering jobs, lead routing, or billing.
- Reworking the domain schemas already defined in `@oalo/contracts` unless a persistence mapping bug is discovered.

## User stories

### US-003A.1 - Persist a frozen campaign version

**As a** campaign creator, **I want** the frozen Open House Boost version stored durably under my HighLevel location, **so that** the campaign survives process restarts and can be reviewed later.

Acceptance criteria:

- `003A-AC-001`: creating a version writes one immutable `campaign.campaign_versions` row with a monotonically increasing version number scoped to that campaign.
- `003A-AC-002`: the stored manifest hash equals the application-layer canonical manifest hash; mismatched input is rejected before commit.
- `003A-AC-003`: retrying the same idempotent create command does not create a duplicate version.
- `003A-AC-004`: a second location cannot read the row even when given its campaign/version reference.

### US-003A.2 - Persist deterministic preflight evidence

**As a** later approver, **I want** the exact preflight result retained with the exact immutable version, **so that** approval cannot rely on recomputed or stale browser state.

Acceptance criteria:

- `003A-AC-005`: preflight persistence requires matching campaign ref, campaign-version ref, and manifest hash.
- `003A-AC-006`: preflight findings, ruleset version, blocking flag, evaluation timestamp, and result hash are immutable after insert.
- `003A-AC-007`: a campaign with a blocking preflight persists current aggregate status as `preflight_failed`; a passing preflight persists `awaiting_approval`.

## Data model

### `campaign.campaign_versions`

Minimum fields:

- `id uuid primary key`
- `location_id uuid not null`
- `campaign_id uuid not null`
- `campaign_ref text not null`
- `campaign_version_ref text not null`
- `version_no integer not null`
- `input_versions jsonb not null`
- `manifest jsonb not null`
- `manifest_hash text not null`
- `created_by_actor_id uuid not null`
- `created_at timestamptz not null`

Required uniqueness/indexing:

- unique `(location_id, campaign_version_ref)`
- unique `(location_id, campaign_id, version_no)`
- index every FK, including `(location_id, campaign_id)`

### `campaign.preflight_results`

Minimum fields:

- `id uuid primary key`
- `location_id uuid not null`
- `campaign_id uuid not null`
- `campaign_version_id uuid not null`
- `result_hash text not null`
- `ruleset_version_ref text not null`
- `blocking boolean not null`
- `findings jsonb not null`
- `evaluated_at timestamptz not null`

Require one retained immutable result identity per result hash and exact campaign version. If multiple preflight reruns are allowed, each is append-only and the approval command must select the current accepted result explicitly.

### `campaign.approval_decisions`

Create in this migration so the storage contract is available to PRD-003c. It is append-only and carries the exact evidence defined by `ApprovalDecisionSchema`.

## Repository behavior

- Use `withTenantTransaction`; no direct SQL from web route handlers.
- Repository calls accept opaque refs but never accept tenant context separately from the transaction authority.
- Decode every database row through an explicit SQL contract and Zod/domain schema before returning it upward.
- Do not store raw request payloads, IP addresses, tokens, or consumer PII in campaign evidence.

## Files expected to change

- `supabase/migrations/<timestamp>_campaign_activation.sql`
- `supabase/tests/*campaign*.sql`
- `packages/db/src/campaign-repository.ts` (new)
- `packages/db/src/index.ts`
- `packages/application/src/campaign-foundation.ts` only if a persistence port extension is required
- `tooling/tests/unit/production-foundation/*campaign*.test.ts`
- database integration tests under the existing real-Postgres harness

## Test plan

- pgTAP: RLS read/write isolation for two locations.
- pgTAP: append-only campaign versions, preflight results, and approval decisions.
- pgTAP: FK indexes and uniqueness constraints.
- Integration: concurrent version creation produces monotonic versions without duplicate version numbers.
- Integration: exact version/preflight hash matching is required.
- Integration: retry/idempotency behavior returns the previously committed logical result.

## Risks

- Concurrency around version numbering can create duplicate `version_no` values if implemented with read-then-insert without a lock or unique-retry strategy.
- JSONB must remain immutable evidence, not a substitute for indexed columns used in normal query paths.
- Repository code must not accidentally execute outside the transaction-local RLS context.

