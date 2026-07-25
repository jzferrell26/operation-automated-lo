---
source_url: https://docs.n8n.io/api/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: exact-commands
weapon: live-event-ops-weapon
---

# n8n Docs: Public REST API activate / deactivate workflow

## Summary
Official n8n public REST API reference for activating and deactivating a workflow. This is the NON-DEPRECATED, instance-agnostic surface for the rollback "deactivate the workflow" step (the CLI `update:workflow --active` is deprecated in n8n 2.0, and a managed/cloud instance has no shell access). This is the recommended deactivate path for Cuantico's instance.

## Key quotations / statistics (verbatim)
- Activate: `POST /api/v1/workflows/{id}/activate`
- Deactivate: `POST /api/v1/workflows/{id}/deactivate`
- Auth header: `X-N8N-API-KEY`
- Base path: `/api/v1`
- The activate endpoint supports an optional JSON body with parameters like `versionId`, `name`, and `description` to specify which workflow version to activate.

## Annotations for weapon-forge
- This is the PRIMARY rollback "stop intake" command for the runbook: `POST /api/v1/workflows/{LIVE_ID}/deactivate` with header `X-N8N-API-KEY: <key>`. Works on managed/cloud (no shell needed), survives the n8n 2.0 CLI deprecation, and is instance-agnostic -- satisfying the brief's "does not rely on paid n8n workflow history" requirement.
- Present THREE deactivate surfaces in the runbook, in preference order for Cuantico: (1) REST API `POST /workflows/{id}/deactivate` (recommended, headless, not deprecated); (2) UI toggle / unpublish (operator-friendly fallback); (3) CLI `update:workflow --active=false` (only if shell access AND pre-2.0, deprecated). The n8n MCP server in this workspace also exposes publish/unpublish tools -- but those are the EDIT surface boundary; for pure activate/deactivate the public REST API is the clean operate-only call.
- ROLLBACK SEQUENCE the runbook should encode: (a) `POST .../deactivate` to stop intake immediately; (b) restore the export-before-deploy snapshot via `import:workflow` (or re-import the JSON through the UI / REST); (c) re-activate the known-good via `POST .../activate` (remember import deactivates by default); (d) re-run the verification loop to confirm the restored known-good actually works before declaring rollback complete.
- The `versionId` body param on activate is useful if the instance keeps versions, but the brief's rollback is snapshot-based (export JSON) precisely so it does NOT depend on paid workflow-history/versioning -- so the snapshot-restore path is primary and versionId is a nice-to-have only.
