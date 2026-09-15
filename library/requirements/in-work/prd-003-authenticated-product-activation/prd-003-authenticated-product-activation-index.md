# PRD-003: Authenticated Product Activation

> **Status:** In Work
> **Priority:** P0
> **Effort:** XL (> 3d)
> **Schema changes:** Additive

---

## Overview

Operation Automated LO already has the founding campaign domain contracts, deterministic preflight, approval policies, tenant-scoped database transaction infrastructure, and a production-grade Postgres foundation. The authenticated web product, however, still uses synthetic workspace fixtures and a filesystem-backed local campaign store for the newly added Open House Boost creation flow. This PRD activates the existing PRD-001 contracts in the real authenticated application path without changing the founding product scope.

The result of this batch is a tenant-backed Open House Boost workflow that can create and read immutable campaign versions in Postgres, derive location and authority from a verified server session, record a real human approval decision, and render the authenticated workspace from persisted product state. The batch remains fail-closed for external provider writes: it does not publish to HighLevel or Meta, send leads, charge through Stripe, or claim production authorization.

---

## Goals

- Replace the filesystem-backed campaign path with tenant-scoped Postgres repositories for authenticated staging and production-capable runtime paths.
- Derive actor, location, installation, and role from verified server session context rather than from browser-supplied campaign payloads.
- Persist immutable campaign versions, preflight results, approval decisions, state transitions, command execution evidence, and audit evidence atomically.
- Allow an authorized human `campaign_approver` to approve the exact current campaign version only after a current passing deterministic preflight.
- Make authenticated campaign routes and overview surfaces read persisted tenant data instead of synthetic fixtures.
- Preserve local synthetic/demo operation as an explicit development-only adapter with no accidental staging or production fallback.
- Keep all provider publication and external-evidence gates unchanged and disabled until their existing authorization conditions are met.

## Non-Goals

- HighLevel OAuth/App Test evidence, Meta publishing, provider draft creation, or paid spend.
- Lead routing, workflow enrollment, or G5 synthetic-lead execution.
- Stripe checkout, entitlement activation, refunds, or G6 evidence.
- Legal/compliance sign-off or G7 disposition.
- New campaign blueprints, generic campaign-builder behavior, or PRD-002 add-ons.
- Replacing the current domain policies or weakening any PRD-001 acceptance criterion.
- Moving PRD-001 to `completed/` or representing this batch as production launch authorization.

---

## Sub-features

| Sub-PRD | Scope | Status |
|---|---|---|
| [`prd-003a-authenticated-product-activation-campaign-persistence`](./prd-003a-authenticated-product-activation-campaign-persistence.md) | Tenant-scoped Postgres schema and repositories for immutable campaigns, versions, and preflight evidence | **Done** (`70531fb`, PR #54) |
| [`prd-003b-authenticated-product-activation-session-command-context`](./prd-003b-authenticated-product-activation-session-command-context.md) | Verified server principal and transaction context for authenticated campaign commands | **Done** (`2ee2634`, PR #55) |
| [`prd-003c-authenticated-product-activation-human-approval`](./prd-003c-authenticated-product-activation-human-approval.md) | Persisted human approval decision, audit evidence, and legal campaign transition | Draft (not started) |
| [`prd-003d-authenticated-product-activation-workspace-reads`](./prd-003d-authenticated-product-activation-workspace-reads.md) | Authenticated campaign creation/detail/list/overview backed by persisted tenant data | Draft (not started) |

---

## Acceptance criteria

| ID | Criterion |
|---|---|
| APA-001 | Given an authenticated non-local runtime, when an Open House Boost draft is created, then the immutable campaign version and matching preflight result are persisted in Postgres inside a tenant-scoped transaction and no filesystem store is used. |
| APA-002 | Given any authenticated campaign mutation, when the command executes, then `location_id`, actor identity, installation, and role are derived from verified server session context and cannot be selected or overridden by the browser request body. |
| APA-003 | Given two locations, when either location reads or mutates campaign data, then RLS and repository contracts prevent cross-location access even if an opaque campaign reference from the other location is supplied. |
| APA-004 | Given a passing current preflight and a verified human principal with `campaign_approver` authority, when approval is submitted, then the exact campaign version, manifest hash, preflight hash, actor, role, decision, timestamp, IP audit hash, command record, and append-only audit evidence are committed atomically. |
| APA-005 | Given a stale, blocking, mismatched, non-human, unauthorized, or cross-tenant approval attempt, when the command executes, then it fails closed and the campaign does not enter `approved`. |
| APA-006 | Given an authenticated user, when campaign list, detail, and overview routes render, then they read persisted data for that verified tenant and do not import synthetic campaign fixtures as the authoritative workspace source. |
| APA-007 | Given local synthetic mode, when the application is run for development or demo purposes, then local adapters may be used explicitly, but the same adapter selection fails closed in staging and production-capable environments. |
| APA-008 | Given this batch is complete, when the production verification gate runs, then no HighLevel, Meta, Stripe, lead-routing, or other provider side effect is newly enabled by default. |
| APA-009 | Given the schema changes, when migrations and pgTAP execute, then campaign-version and approval records have tenant RLS, required indexes, append-only protections where applicable, and rollback-safe additive migration behavior. |
| APA-010 | Given the completed implementation, when security and quality review run, then the batch has no unresolved Critical or High security finding and every PRD-003 acceptance criterion is traceable to code and tests before merge. |

---

## Data model changes

Add immutable campaign evidence tables under the existing `campaign` schema rather than overloading the mutable `campaign.campaigns` aggregate row:

- `campaign.campaign_versions`: one immutable row per campaign version with tenant, campaign, version number, canonical refs, input-version refs, manifest JSON, manifest hash, creator, and timestamp.
- `campaign.preflight_results`: immutable deterministic evaluation for one campaign version, including result hash, ruleset ref, blocking flag, findings JSON, and evaluation timestamp.
- `campaign.approval_decisions`: append-only human decision bound to the exact campaign version, manifest hash, preflight hash, actor, role, decision, audit hash, snapshot JSON, and decision timestamp.

Reuse existing `campaign.campaigns` for current aggregate status and row version, `integration.command_executions` for idempotent command evidence, and `audit.events` for append-only operator history. Do not add a duplicate generic audit/event system.

All new foreign keys require indexes. All tenant rows carry `location_id`, use the existing transaction-local context model, and receive RLS policies equivalent to the existing location-scoped product tables.

---

## API changes

The web layer receives authenticated internal command/query boundaries rather than provider-facing APIs:

- Create/freeze Open House Boost draft: replace the current local-only persistence path behind `/api/campaigns/preflight` with an authenticated application command in non-local runtime modes.
- Read campaign detail/list: server-side tenant queries by opaque campaign reference, with resource location checked through RLS and application authorization.
- Approve campaign: add an authenticated mutation endpoint or Server Action that accepts only the decision and campaign/version reference required to identify the resource; actor, location, role, and authority come from the verified server session.

Browser requests must never accept `location_id`, installation authority, publisher authority, or approver role as trusted input.

---

## Implementation order

1. `003a` first: schema, RLS, repository adapters, pgTAP, and application-port implementations.
2. `003b` second: server session-to-command principal boundary and tenant transaction authority.
3. `003c` third: human approval command, atomic audit/state transition, and authorization tests.
4. `003d` fourth: replace synthetic/local authenticated workspace reads and wire the real campaign flow end to end.
5. Run `security-weapon`, then `quality-weapon`, then PR review before merge.

---

## Open questions

- [x] Should the browser mutation transport be a route handler or a Next.js Server Action? Keep `/api/campaigns/preflight` as the mutation transport. The application command and authorization boundary stay transport-independent.
- [x] Should rejected approval decisions leave the aggregate in `awaiting_approval` or transition through a dedicated rejected state? Denied stays `awaiting_approval`. This batch must not invent a new state.
- [x] Should local filesystem persistence remain as a maintained development adapter after Postgres activation, or be reduced to test-only fixtures once local Supabase is the default developer path? Keep the filesystem store as an explicit local/synthetic adapter only.

---

## Related

- [`PRD-001c: Campaign Blueprint and Preflight`](../../in-work/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md)
- [`PRD-001j: Platform Foundation, Runtime, and Delivery`](../../in-work/prd-001-operation-automated-lo/prd-001j-operation-automated-lo-platform-foundation-runtime-and-delivery.md)
- [`System Build Blueprint`](../../../knowledge/private/architecture/system-build-blueprint.md)
- [`Project Map`](../../../knowledge/private/product/project-map.md)
- [`Next Batch Ledger: External Evidence Sprint`](../../../../NEXT_BATCH_LEDGER.md)

