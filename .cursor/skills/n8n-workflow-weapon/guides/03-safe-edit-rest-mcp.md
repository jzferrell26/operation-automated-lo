# Guide 03: Safely Edit a Live Workflow (REST and MCP)

The canonical safe-edit recipe. Worked in `examples/03-safe-rest-put-edit.md`. Sources:
`research/2026-06-29-rest-api-update-workflow-allowed-keys.md`,
`research/2026-06-29-rest-api-workflow-endpoints-deepwiki.md`,
`research/2026-06-29-api-update-additional-properties-issue-19587.md`,
`research/2026-06-29-mcp-update-credentials-stripped-and-blocked.md`,
`research/2026-06-29-activate-deactivate-publish-version-model.md`.

## Prefer REST PUT over a naive MCP round-trip

REST PUT preserves node credential references when you echo the node's credential block back; a
naive MCP `update_workflow` drops the bindings and saves a draft. When credentials matter, REST
PUT is the safer surface. Source: `research/2026-06-29-cuantico-internal-prior-art.md`.

## The safe REST PUT recipe

1. **Confirm instance and live state** (Directive 5). Which host (Cuantico main vs voyze)? Is the
   workflow active? Are you editing the live workflow, not an archived clone?
2. **Export-before-edit.** Save the current workflow JSON. On community self-hosted there is no
   built-in undo, so this export is your only rollback (Directive 5 TODO). Keep it.
3. **GET** `/api/v1/workflows/{id}` with header `X-N8N-API-KEY`.
4. **Strip every read-only / system key** from the body: `id`, `active`, `versionId`, `createdAt`,
   `updatedAt`, `triggerCount`, `meta`, `pinData`. Keep ONLY `name`, `nodes`, `connections`,
   `settings`. The ID goes in the URL path, never the body.

   > TODO: open question - needs human decision before next refresh. Whether `staticData` is an
   > allowed PUT key is version-dependent (the brief lists it allowed; the public gist lists it to
   > strip). OMIT `staticData` by default; only include it if the workflow must seed static data,
   > and confirm against the instance's Swagger UI at `N8N_HOST/api/v1/docs`.

5. **Make the edit** inside the kept keys (echo each node's credential block back unchanged so the
   binding survives).
6. **PUT** to `/api/v1/workflows/{id}`. If you get
   `request/body must NOT have additional properties (Status: 400)`, an extra key slipped through,
   including possibly a nested `settings` extra (issue #19587). Strip it and retry.
7. **Re-bind and verify credentials** (Directive 1). Even on REST, verify the binding via UI or a
   test execution. Never declare done on assumption.
8. **Go live** (Directive 2). `active` was not changed by the PUT; call
   `POST /api/v1/workflows/{id}/activate` (or `publish_workflow` via MCP).
9. **Confirm the new version.** Re-GET and check `versionId` changed and the active flag is what
   you intend.

## The settings object shape

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

Omitting a required `settings` object is one of the two common causes of the 400 (the other is
including `workflowId` in the body). Source:
`research/2026-06-29-rest-api-update-workflow-allowed-keys.md`.

## If you must edit via MCP

The instance-native MCP `update_workflow` writes a DRAFT and may strip credentials. If you use it:

1. Make the change.
2. Re-bind credentials (UI paste preferred) and VERIFY (Directive 1).
3. `publish_workflow` to go live (Directive 2).
4. Confirm the active version changed.

Note: the diff-based `n8n_update_partial_workflow` (community czlonkowski MCP) is reported broken
or deprecated for some operations (issue #19587), which reinforces preferring a clean REST PUT or a
clone-and-create over a partial diff. Source:
`research/2026-06-29-n8n-mcp-server-tools-and-validation.md`.

## Three states you must keep straight

1. The saved workflow DEFINITION (what PUT / `update_workflow` changes).
2. The active / inactive FLAG (what activate/deactivate / `publish_workflow` toggles).
3. Workflow HISTORY versions in the instance DB (rollback path on cloud/paid only).

Source: `research/2026-06-29-activate-deactivate-publish-version-model.md`,
`research/2026-06-29-workflow-history-and-source-control.md`. The version model is covered in
`guides/06-version-model-and-go-live.md`.
