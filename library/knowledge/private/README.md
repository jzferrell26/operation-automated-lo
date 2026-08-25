---
ai_description: |
  Internal engineering and business documentation for Operation Automated LO.
  ADRs MUST live in architecture/ADR-<n>-<kebab-slug>.md.
  Engineering standards MUST live in standards/documentation-framework.md.
  Domain folders below are repo-specific; do not invent placeholder docs.
  Do NOT file customer-facing content here (that goes in knowledge/public/).
  Write path: library/knowledge/private/<domain>/<kebab-slug>.md.
human_description: |
  Internal product, architecture, integration, compliance, security, research,
  UX/UI, AI, commercial, competitive, frontend, and discovery documentation.
  Default landing zone for any doc that does not need to be customer-facing.
---

# Knowledge (Private)

Internal documentation for engineers, product, and AI agents working on Operation Automated LO.

## Required sub-folders

| Folder | Contents |
|---|---|
| `architecture/` | ADRs (`ADR-<n>-<kebab-slug>.md`) and system design documents. See [architecture/README.md](architecture/README.md). |
| `standards/` | [documentation-framework.md](standards/documentation-framework.md) and repo-specific writing rules. See [standards/README.md](standards/README.md). |

## Domain folders (this repo)

| Folder | Purpose | Representative docs |
|---|---|---|
| `ai/` | LLM generation, metering, and unit economics | [llm-generation-and-unit-economics.md](ai/llm-generation-and-unit-economics.md) |
| `architecture/` | System boundary, data model, runtime, delivery | [system-architecture.md](architecture/system-architecture.md), [system-build-blueprint.md](architecture/system-build-blueprint.md) |
| `commercial/` | Founding cohort and go-to-market plans | [founding-cohort-plan.md](commercial/founding-cohort-plan.md) |
| `competitive/` | Competitive landscape and teardowns | [competitive-landscape.md](competitive/competitive-landscape.md) |
| `compliance/` | Compliance and risk posture | [compliance-and-risk.md](compliance/compliance-and-risk.md) |
| `discovery/` | G8 demand validation package (OST, experiments, evidence) | [discovery/README.md](discovery/README.md) |
| `frontend/` | Frontend implementation notes | [ambient-motion-background.md](frontend/ambient-motion-background.md) |
| `integrations/` | Third-party integration configuration | [ghl-marketplace-and-scopes.md](integrations/ghl-marketplace-and-scopes.md) |
| `product/` | Product definition, project map, asset inventory | [project-map.md](product/project-map.md), [product-definition.md](product/product-definition.md) |
| `research/` | Build-readiness gate and research sources | [2026-build-readiness-and-research-gate.md](research/2026-build-readiness-and-research-gate.md) |
| `security/` | Threat model and security posture | [threat-model.md](security/threat-model.md) |
| `ux-ui/` | Design system, components, screens, HTML examples | [ux-ui/README.md](ux-ui/README.md) |

## What does NOT belong here

- Customer-facing content (put in `knowledge/public/`)
- PRDs (put in `library/requirements/{backlog,in-work,completed}/`)
- IRDs (put in `library/issues/{backlog,in-work,completed}/`)
- Human scratch notes (put in `library/notes/`; agents never write there)

## Related

- [Library README](../../README.md)
- [Documentation framework](standards/documentation-framework.md)
