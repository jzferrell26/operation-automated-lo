# Guide 05: Surface Selection (MCP vs REST vs SDK)

Pick the safe surface for the change before you touch anything. Sources:
`research/2026-06-29-n8n-mcp-server-tools-and-validation.md`,
`research/2026-06-29-rest-api-update-workflow-allowed-keys.md`,
`research/2026-06-29-cuantico-internal-prior-art.md`,
`research/2026-06-29-workflow-sdk-reference-in-environment.md`.

## Which MCP you are driving

The tools wired into this workspace (`get_sdk_reference`, `get_node_types`, `search_nodes`,
`validate_workflow`, `create_workflow_from_code`, `update_workflow`, `publish_workflow`, and the
Data Table tools) are the INSTANCE-NATIVE n8n MCP server (shipped April 2026). Write all guidance
against THESE tool names. The community `czlonkowski/n8n-mcp` (the `n8n_*`-prefixed tools, diff-based
`n8n_update_partial_workflow`) is a different, external surface; mention it only as an alternative.

## Decision tree

1. **Authoring a new workflow?** -> Workflow SDK via `create_workflow_from_code`. Declarative,
   whole-workflow, with `newCredential()` for auth. Follow `guides/01-build-workflow-sdk.md`.
2. **Editing an existing workflow where credentials matter?** -> REST PUT
   `/api/v1/workflows/{id}`. It preserves node credential references when you echo the credential
   block back. Follow `guides/03-safe-edit-rest-mcp.md`.
3. **Editing via MCP `update_workflow`?** -> Only with the mandatory re-bind + verify step and a
   `publish_workflow` afterward, because the MCP round-trip drops bindings and saves a draft.
4. **Going live?** -> `publish_workflow` (MCP) or `POST /api/v1/workflows/{id}/activate` (REST).
   `active` is read-only on PUT, so this is always a separate call. See
   `guides/06-version-model-and-go-live.md`.
5. **Native structured storage (dedup, idempotency, config)?** -> Data Table tools. See
   `guides/08-data-tables.md`.

## Validation progression (every surface)

`validate_node({mode: 'minimal'})` -> `validate_node({mode: 'full', profile: 'runtime'})` ->
`validate_workflow(workflow)` before deploy. This catches single-node workflows and multi-node
workflows with no connections before they ship (Directive 4).

## Read-only deployments

MCP write operations can be disabled via `DISABLED_TOOLS` / `DISABLED_TOOL_OPERATIONS` env vars
plus a read-only API key. If a write tool is unexpectedly unavailable on an instance, suspect a
read-only deployment rather than a bug, and confirm with the operator before working around it.

## Worked references

The build path is demonstrated in `examples/01-build-http-to-datatable.md`; the edit path in
`examples/03-safe-rest-put-edit.md`.
