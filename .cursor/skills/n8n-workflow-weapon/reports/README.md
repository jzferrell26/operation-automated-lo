# Reports

This folder accumulates the audit and change reports n8n-workflow-guardian produces over time, one
file per run. It is the historical record of what was built, audited, or edited on the Cuantico
main n8n and voyze.ai n8n instances, and why.

## Naming

`YYYY-MM-DD-<instance>-<workflow-slug>-<audit|change>.md`

Examples:
- `2026-06-29-voyze-lofty-ghl-sync-change.md`
- `2026-06-29-cuantico-main-grant-enrichment-audit.md`

## Shape

- Audits use `templates/audit-report.md`.
- Builds and edits use `templates/change-report.md`.

When a change is part of a documented effort, a copy of the report may also live under `library/`;
this folder keeps the per-run history regardless. No em dashes in any report (Directive 6).
