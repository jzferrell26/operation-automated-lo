---
source_url: https://docs.n8n.io/build/understand-workflows/understand-executions/view-executions-for-a-single-workflow/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: execution-monitoring
weapon: live-event-ops-weapon
---

# n8n Docs: View, inspect, and retry executions

## Summary
Official n8n executions documentation. This is the authority for the post-deploy verification loop's second half (confirm the controlled test produced the expected outputs) and for failed-run triage. Defines the status values, how to inspect a single execution's node IO, and the two retry modes.

## Key quotations / statistics
- Access: Executions tab in a workflow editor, or Overview -> Executions for instance-wide visibility.
- Status values (verbatim): "Failed, Running, Success, or Waiting".
- Filtering: filter by status through the Filters menu in the Executions list.
- Inspecting: "Pick an execution from the list to inspect it".
- Retry modes (verbatim): "Retry with currently saved workflow" and "Retry with original workflow".
- Debugging: "use Debug in editor to load the previous execution data into your current workflow".

## Annotations for weapon-forge
- This is the verification-and-triage backbone: after the controlled test, the operator finds the execution, confirms status = Success, and inspects node IO to confirm the expected records/tags/notifications were produced.
- TRIAGE DISCIPLINE: "Retry with currently saved workflow" vs "Retry with original workflow" is a real distinction the runbook must teach -- if the operator already changed the workflow, "currently saved" retries against the NEW version, "original" retries against the version that ran. For verifying a just-deployed change, "currently saved" is usually correct; for reproducing a historical failure, "original".
- The n8n MCP server in this workspace exposes the same data programmatically (see the MCP execution-tools source) -- the runbook should offer BOTH the UI Executions-tab path and the MCP `search_executions` / `get_execution` path so it works headless.
- "Debug in editor" loads prior execution data into the canvas -- useful for triage, but note it is an EDIT-adjacent action; this Guardian operates and does not edit, so use Debug to DIAGNOSE only, then hand the structural root cause to n8n-workflow-guardian.
