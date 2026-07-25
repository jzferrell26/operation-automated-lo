---
source_url: live n8n MCP server in this workspace (server id d228d0ab; tools search_executions, get_execution, get_sdk_reference)
retrieved_on: 2026-06-29
source_type: tool-reference
authority: official
relevance: critical
topic: execution-monitoring
weapon: live-event-ops-weapon
---

# n8n MCP server: execution-monitoring tool shapes (search_executions, get_execution)

## Summary
Authoritative tool schemas from the LIVE n8n MCP server connected to this workspace. These are the headless, copy-paste programmatic surface for the post-deploy verification loop and failed-run triage -- the operator does not need the n8n UI. Captured verbatim from the loaded tool definitions (not invoked against the live instance, by design -- no client execution data was read).

## Key quotations / statistics (verbatim tool schemas)
- `search_executions` — "Search for workflow executions with optional filters. Returns execution metadata including status, timing, and workflow ID." Parameters:
  - `workflowId` — "Filter executions by workflow ID"
  - `status` — array, enum: `["canceled", "crashed", "error", "new", "running", "success", "unknown", "waiting"]`
  - `startedAfter` / `startedBefore` — ISO 8601 timestamps
  - `limit` — max 200
  - `lastId` — "Cursor for pagination — pass the last execution ID from the previous page"
- `get_execution` — "Get execution details by execution ID and workflow ID. By default returns metadata only. Set includeData to true to include node execution data, optionally filtered by nodeNames and truncated by truncateData." Parameters:
  - `workflowId` (required), `executionId` (required)
  - `includeData` — "Defaults to false (metadata only). Set to true to include node inputs/outputs. Use `false` to quickly check execution status"
  - `nodeNames` — "When includeData is true, return data only for these node names"
  - `truncateData` — limit items per node output
- `get_sdk_reference` — "Required reference for building n8n Workflow SDK code." (sections: patterns, expressions, functions, rules, import, guidelines, design, all). NOTE: SDK = build/edit surface, OWNED BY n8n-workflow-guardian, NOT this Guardian.

## Annotations for weapon-forge
- This is the exact-command, headless verification path. The runbook's post-deploy verification can be fully scripted:
  1. Fire controlled test (production webhook).
  2. `search_executions({ workflowId: <LIVE_ID>, status: ["success","error","crashed"], startedAfter: <deploy_ts>, limit: 5 })` to find the test execution.
  3. If status != success: `get_execution({ workflowId, executionId, includeData: true, nodeNames: [<failing node>], truncateData: 5 })` to pull the failing node IO for triage.
- DISCIPLINE NOTE: the `status` enum here is RICHER than the UI's four values (the UI shows Failed/Running/Success/Waiting; the MCP exposes canceled/crashed/error/new/running/success/unknown/waiting). The runbook should filter triage on `["error","crashed"]` (hard failures) plus check for stuck `["running","waiting"]` (a hung intake).
- `get_execution` default `includeData:false` is the fast go/no-go status check; only set `includeData:true` for triage to avoid pulling large payloads under live-event pressure.
- BOUNDARY: `get_sdk_reference` and any create/update/publish workflow tools on this MCP server are the BUILD/EDIT surface. This Guardian operates and verifies only; it must NOT call workflow-mutation tools. weapon-forge should explicitly list the read-only execution tools as in-scope and the mutation tools as out-of-scope (hand to n8n-workflow-guardian).
