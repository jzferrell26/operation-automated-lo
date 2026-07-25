# Research Plan: live-event-ops-weapon

- **Depth tier:** normal
- **Time window:** 2026-06-29 back to ~2025-12-29 (6 months); extend only on user consent, never past 12 months
- **Page budget target:** ~100 unique pages, triaged to the most authoritative ~20-30 filed sources
- **Source breadth target:** canonical n8n docs (executions, activate/deactivate, export/import, webhooks) + practitioner blogs + GitHub READMEs + 1-2 industry/SRE runbook references + the live n8n MCP server SDK reference for execution-monitoring shapes
- **Tooling:** WebSearch + WebFetch (Firecrawl/Exa NOT connected in this workspace); live n8n MCP server (get_sdk_reference, search_executions/get_execution shapes) for authoritative execution-monitoring detail
- **Guardian scope reminder:** OPERATE-and-verify only (runs the deploy, does not edit workflow structure). Owns pre-flight gate, deploy sequence, post-deploy verification loop, rollback (deactivate + restore export-before-deploy snapshot). Run scope = Live Event Deployment workflow AND Live Event Intake workflow.

## Initial queries (from session-zero, carried via Command Brief REFERENCE MATERIAL)
- "n8n production deployment runbook operate verify rollback 2026"
- "live event automation workflow pre-flight checklist n8n 2026"
- "n8n workflow execution monitoring failed run triage 2026"
- "operational runbook exact-command discipline escalation path 2026"
- "n8n webhook trigger live event intake verification 2026"

## Expansion queries (authored by loremaster, only if a gap surfaces)
### Branch from "operate verify rollback"
- "n8n workflow export import JSON CLI as rollback snapshot 2026"
- "n8n activate deactivate workflow API REST setActive 2026"

### Branch from "execution monitoring failed run triage"
- "n8n executions API get execution data error status 2026"
- "n8n execution log failed node debugging retry 2026"

### Branch from "runbook exact-command discipline escalation"
- "SRE runbook structure rollback step escalation path 2026"
- "deployment pre-flight go no-go gate checklist 2026"

## Internal prior art (Cuantico-specific, authoritative; not web-sourced)
- Live Event Deployment workflow on n8n (live one, not archived clone; dev client = bill_rookstool)
- Live Event Intake workflow (slot field keys, lead-import tagging, dormant-email safeguard, form-placeholder mis-route gotcha)
- n8n execution-monitoring tools (search_executions, get_execution) via the workspace MCP
- Global error handler / Slack alert pattern already in use for live events

## Filing rules
- One source = one file: `<retrieved-date>-<slug>.md` with YAML frontmatter (source_url, retrieved_on, authority, relevance, source_type, topic, weapon)
- Subfolders by topic once a group exceeds ~10 files
- `index.md` manifest updated after every file write
- Cite verbatim in "Key quotations / statistics"; no paraphrase in raw notes
