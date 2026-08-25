# Standards

Engineering and documentation standards for Operation Automated LO.

## What belongs here

- **Documentation framework**: naming, folder layout, headers, and cross-linking rules for all `library/` content
- **Repo-specific writing rules**: conventions that apply across PRDs, IRDs, knowledge docs, and QA reports

## Canonical document

| File | Purpose |
|---|---|
| [documentation-framework.md](documentation-framework.md) | Single source of truth for how documentation is written in this repository |

## What does NOT belong here

- Architecture Decision Records (use `library/knowledge/private/architecture/ADR-<n>-<slug>.md`)
- Product or domain knowledge (use the appropriate folder under `library/knowledge/private/<domain>/`)
- QA report content (authored by `quality-guardian` and `security-guardian` in PRD/IRD `qa/` folders or `library/requirements/reports/`)

## Related

- [Private knowledge README](../README.md)
- [Library README](../../../README.md)
