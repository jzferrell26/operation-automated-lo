# Library

This directory is the product and engineering source of truth for Operation Automated LO. It follows Library Schema v2.

Start with the [canonical project map](knowledge/private/product/project-map.md) for the current product boundary, system flow, module status, external gates, and prioritized next steps.

## Structure

- `knowledge/public/`: future customer-facing documentation.
- `knowledge/private/`: internal product, architecture, integration, compliance, security, research, UX/UI, AI, commercial, competitive, frontend, and discovery documents.
- `knowledge/private/discovery/`: G8 paid-founder demand package (Opportunity Solution Tree, experiments, interview scripts, evidence register).
- `requirements/backlog/`: approved or proposed work that has not entered implementation.
- `requirements/in-work/`: requirements actively being implemented.
- `requirements/completed/`: requirements whose implementation has passed security and quality review.
- `requirements/reports/`: standalone security and quality reports not attached to a specific PRD or IRD.
- `issues/{backlog,in-work,completed}/`: reactive IRDs keyed to GitHub issue numbers. Create an IRD only after the GitHub issue exists.
- `notes/`: human-only scratch space. Agents never read or write here beyond the seeded README.

New PRD folders contain an index, independently implementable sub-PRDs, and a `qa/` directory whose report content is authored by `quality-guardian` and `security-guardian`.

## PRD catalog

| PRD | Lifecycle | Scope |
|---|---|---|
| [PRD-001: Operation Automated LO](requirements/in-work/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md) | In Work | Founding Open House Boost product. Production traffic remains blocked on G1 through G7. |
| [PRD-002: Operation Automated LO Add-On Portfolio](requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002-operation-automated-lo-add-ons-index.md) | Backlog | Independently gated future expansion modules. Not authorized for implementation. |
| [PRD-003: Authenticated Product Activation](requirements/in-work/prd-003-authenticated-product-activation/prd-003-authenticated-product-activation-index.md) | In Work | Postgres persistence, verified server session authority, human approval, and tenant-backed authenticated workspace reads for the campaign domain. 003a through 003d done on `main`. |
| [PRD-004: Reviewable Go-Live](requirements/in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md) | In Work | Preview deploy, Developer Portal inspection, Test Link, real-Postgres command gate, and Marketplace listing content for a reviewable go-live. 004d complete (PR #65); PR #66 was a separate, closed and unmerged attempt at the same gate. |
| [PRD-005: Authenticated Review Runtime](requirements/in-work/prd-005-authenticated-review-runtime/prd-005-authenticated-review-runtime-index.md) | In Work | Closes completion review findings C1 through C4: real request authentication, correlation and retry correctness, handoff documentation reconciliation, and deployed qualification. In progress on branch `claude/completion-review-2026-09-19`, unmerged. |

## Current build gate

- [Agent terrain map](../.cursor/rules/core/the-map.mdc): short resume brief for Codex / Claude / Cursor (done, pending, HighLevel park, next steps).
- [Canonical project map](knowledge/private/product/project-map.md): the current cross-document status map for PRD-001, PRD-002, external evidence gates, hard boundaries, and core completion.
- [Next batch: External Evidence Sprint](../NEXT_BATCH_LEDGER.md): Wave 1 G2 App Test is primary; currently parked on HighLevel app approval.
- [2026 build-readiness and research gate](knowledge/private/research/2026-build-readiness-and-research-gate.md): product and construction research are complete. Phase 0 scaffold and evidence-harness work is authorized, while production feature traffic remains blocked until the recorded App Test, compliance, billing, lead-path, and demand gates close.
- [G8 discovery package](knowledge/private/discovery/README.md): G8 remains `ACCEPTED CONSTRAINT` (commercial validation unproven).
- [Library Schema v2 raid ledger](../LIBRARY_SCHEMA_V2_RAID_LEDGER.md): documentation lifecycle migration authority for this Schema v2 shape.

## Root execution ledgers

- [Phase 0 execution ledger](../EXECUTION_LEDGER.md)
- [Production execution ledger](../PRODUCTION_EXECUTION_LEDGER.md)
- [Backend production raid ledger](../BACKEND_PRODUCTION_RAID_LEDGER.md)
- [2026-08-26 full reverse review](requirements/reports/2026-08-26-full-reverse-review-report.md): document-only codebase reverse review (SHIP for repo-proved code; production still not authorized)

## Construction specifications

- [UX/UI design scope](knowledge/private/ux-ui/README.md): approved platform information architecture, visual system, responsive behavior, component contracts, screen specifications, and preserved Claude Design canvases.
- [System build blueprint](knowledge/private/architecture/system-build-blueprint.md): deployables, monorepo, modules, runtimes, tokens, sessions, rendering, storage, billing, and AI.
- [System data model](knowledge/private/architecture/system-data-model.md): schemas, tables, roles, RLS, integrity, retention, migrations, and scale triggers.
- [System runtime contracts](knowledge/private/architecture/system-runtime-contracts.md): HTTP, commands, events, tasks, provider operations, failures, approvals, lead routing, and billing.
- [System delivery and operations](knowledge/private/architecture/system-delivery-and-operations.md): environments, CI, testing, observability, SLOs, recovery, capacity, and phased build order.
