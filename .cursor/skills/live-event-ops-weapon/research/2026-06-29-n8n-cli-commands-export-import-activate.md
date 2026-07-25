---
source_url: https://docs.n8n.io/deploy/host-n8n/configure-n8n/use-the-command-line/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: exact-commands
weapon: live-event-ops-weapon
---

# n8n Docs: CLI commands (export:workflow / import:workflow / update:workflow --active)

## Summary
The official n8n CLI reference. These are the exact, copy-paste commands for the deploy/rollback runbook: take a snapshot (export:workflow), restore a snapshot (import:workflow), and activate/deactivate a workflow. This is the backbone of the "exact-command discipline" directive.

## Key quotations / statistics
- `export:workflow` flags (verbatim): "--all — Export all workflows", "--id — Workflow ID to export", "--output, -o — Output file name or directory", "--separate — Exports one file per workflow", "--published — Exports the published/active version", "--decrypted — Exports credentials in plain text format".
  - Example: `n8n export:workflow --id=<ID> --output=file.json`
- `import:workflow` flags (verbatim): "--input — Input file name or directory", "--separate — Imports *.json files from the directory", "--activeState — Controls imported workflows' active state" (options: `false` or `fromJson`).
  - Example: `n8n import:workflow --separate --input=backups/latest/ --activeState=fromJson`
  - Default behavior: "imported workflows are deactivated" by default, but can preserve active status with `--activeState=fromJson`.
- `update:workflow` (verbatim): "--id — Workflow ID", "--active — true or false", "--all — Apply to all workflows".
  - Examples: `n8n update:workflow --id=<ID> --active=true` and `n8n update:workflow --all --active=false`
  - **Note: `update:workflow` is "Deprecated in n8n 2.0."**

## Annotations for weapon-forge
- These belong in the runbook's exact-command blocks for: (1) pre-flight snapshot `export:workflow --id=<LIVE_ID> --output=snapshots/<date>-<workflow>.json`; (2) rollback restore `import:workflow --input=<snapshot>.json`; (3) rollback deactivate.
- FOOTGUN to encode: `import:workflow` deactivates the imported workflow by DEFAULT. After a restore, the workflow is OFF unless `--activeState=fromJson` was used or the operator re-activates it. The rollback guide must include an explicit re-activation/verification step after restore, or intake stays down silently.
- DEPRECATION to flag: `update:workflow --active` is deprecated in n8n 2.0. weapon-forge should present both the CLI activate path AND the deactivate-via-UI / REST `setActive`-equivalent path so the runbook survives the 2.0 deprecation. The Guardian's stated rollback is "deactivate the workflow" -- on 2.0 the safe deactivate is via the UI toggle (unpublish) or the public REST API, not the deprecated CLI.
- This is instance-side CLI; it requires shell access to the n8n host. For Cuantico's managed/cloud instance the REST API (`/workflows`, activate/deactivate) and the n8n MCP server are the alternative surfaces -- weapon-forge should pair this with the REST/MCP path so the runbook works whether or not the operator has CLI shell access.
