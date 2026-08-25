# Architecture

System design documents and Architecture Decision Records (ADRs) for Operation Automated LO.

## ADR naming

ADRs live in this folder as:

```
ADR-<n>-<kebab-slug>.md
```

Example: `ADR-001-use-highlevel-as-meta-authority.md`

Each ADR records a locked decision with context, alternatives considered, and consequences.

## What belongs here

- **ADRs**: irreversible or high-cost architectural decisions
- **System documents**: boundary, data model, runtime contracts, delivery, and build blueprints that describe how the product is constructed and operated

## What does NOT belong here

- Feature PRDs or issue IRDs (use `library/requirements/` or `library/issues/`)
- UX/UI design specs (use `library/knowledge/private/ux-ui/`)
- Security threat models (use `library/knowledge/private/security/`)
- Customer-facing documentation (use `library/knowledge/public/`)

## Existing documents

No ADR files (`ADR-*`) are present yet. Current system documents:

| File | Topic |
|---|---|
| [system-architecture.md](system-architecture.md) | System boundary and end-to-end flow |
| [system-build-blueprint.md](system-build-blueprint.md) | Deployables, modules, runtimes, and integrations |
| [system-data-model.md](system-data-model.md) | Schemas, tables, RLS, and retention |
| [system-runtime-contracts.md](system-runtime-contracts.md) | HTTP, commands, events, and provider operations |
| [system-delivery-and-operations.md](system-delivery-and-operations.md) | Environments, CI, observability, and recovery |
| [backend-readiness-assessment-2026-07-21.md](backend-readiness-assessment-2026-07-21.md) | Backend production readiness review |

## Related

- [Private knowledge README](../README.md)
- [Documentation framework](../standards/documentation-framework.md)
