---
source_url: https://gist.github.com/benben-ops/eed24ce1e67edfa615ab3d576bf65099
retrieved_on: 2026-06-29
source_type: github-readme
authority: practitioner
relevance: critical
topic: rest-api-put
weapon: n8n-workflow-weapon
---

# Solution and fix for update_workflow in the n8n API (allowed PUT body keys)

## Summary
A widely-cited practitioner gist documenting the exact cause of, and fix for, the n8n public-API "update workflow" failure. It enumerates the allowed PUT body keys, the read-only/system fields that MUST be stripped before sending, the exact validation error string, and the URL-path-vs-body rule. This is the authoritative answer to Command Brief Critical Directive #3 ("Restrict the REST PUT body to the allowed keys").

## Key quotations / statistics (verbatim)

Exact validation error when extra properties are present:
> "request/body must NOT have additional properties (Status: 400)"
(MCP surfaces it as: "MCP error 1003: request/body must NOT have additional properties (Status: 400)")

Allowed body keys for a PUT update:
- `name` — workflow name
- `nodes` — array of workflow nodes
- `connections` — connections object
- `settings` — workflow settings object

Read-only / system fields to STRIP before updating (verbatim list):
- `active` (use the separate activate/deactivate endpoints instead)
- `id`
- `versionId`
- `createdAt`
- `updatedAt`
- `triggerCount`
- `staticData`
- `meta`
- `pinData`

URL-vs-body rule (verbatim):
> "Workflow ID must be in the URL path: `/api/v1/workflows/{workflowId}`" — the ID should NOT appear in the request body itself.

Settings object shape (verbatim example):
```json
{
  "saveExecutionProgress": true,
  "saveManualExecutions": true,
  "saveDataErrorExecution": "all",
  "saveDataSuccessExecution": "all",
  "executionTimeout": 3600,
  "timezone": "UTC"
}
```

Core cause (verbatim):
> "including `workflowId` in the body or omitting required `settings` triggers the validation error."

## Annotations for weapon-forge
- This is the spine of the "safe REST PUT edit" guide. The canonical safe-edit recipe: GET the workflow, delete every read-only key (`id`, `active`, `versionId`, `createdAt`, `updatedAt`, `triggerCount`, `meta`, `pinData`, and per the issue source even nested `settings` extras), keep only `name`/`nodes`/`connections`/`settings`, PUT to `/api/v1/workflows/{id}`.
- NOTE a contradiction with the Command Brief / Cuantico prior art: the brief's allowed-key list includes `staticData`, but this gist lists `staticData` as a field to STRIP. weapon-forge must flag this for the operator. The likely resolution: `staticData` is accepted on some n8n versions and rejected on others; the safest default is to omit it unless a workflow specifically needs to seed static data. See also issue #19587 (settings sub-object also rejects extras).
- Pair this with the activate/deactivate source: because `active` is read-only on PUT, going live is a SEPARATE call (`/activate`), which is the REST analogue of the MCP draft-vs-publish model.
- Authority is "practitioner" not "official" because the official api-reference page would not render via WebFetch (docs.n8n.io trailing-slash paths 404 the fetcher); the DeepWiki mirror corroborates the endpoint paths and the name/nodes/connections/settings body (see `2026-06-29-rest-api-workflow-endpoints-deepwiki.md`).
