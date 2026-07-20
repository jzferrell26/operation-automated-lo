# Library

This directory is the product and engineering source of truth for Operation Automated LO.

## Structure

- `knowledge/private/`: internal product, architecture, integration, compliance, security, and research documents.
- `knowledge/public/`: future customer-facing documentation.
- `requirements/backlog/`: approved or proposed work that has not entered implementation.
- `requirements/in-work/`: requirements actively being implemented.
- `requirements/completed/`: requirements whose implementation has passed security and quality review.
- `requirements/issues/`: issue research documents when production defects are investigated.
- `requirements/reports/`: standalone security and quality reports that are not attached to a specific PRD.
- `qa/`: legacy standalone-report location retained until schema migration.

New PRD folders contain an index, independently implementable sub-PRDs, and a `qa/` directory whose report content is authored by `quality-guardian`. PRD-001 retains its existing legacy `reports/` directory until a dedicated schema migration moves those authored reports safely.

## PRD catalog

| PRD | Lifecycle | Scope |
|---|---|---|
| [PRD-001: Operation Automated LO](requirements/backlog/prd-001-operation-automated-lo/prd-001-operation-automated-lo-index.md) | Backlog | Founding Open House Boost product |
| [PRD-002: Operation Automated LO Add-On Portfolio](requirements/backlog/prd-002-operation-automated-lo-add-ons/prd-002-operation-automated-lo-add-ons-index.md) | Backlog | Independently gated future expansion modules |

## Current build gate

- [2026 build-readiness and research gate](knowledge/private/research/2026-build-readiness-and-research-gate.md): the core architecture is defined, but production implementation remains blocked until the recorded App Test, Marketplace, compliance, billing, lead-path, and demand gates close.
