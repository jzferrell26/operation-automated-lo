# Guide 06: The Version Model and Going Live

Three "version-ish" concepts share loose language but are different surfaces. Conflating them is
how a "fixed" workflow keeps running the old version. Sources:
`research/2026-06-29-activate-deactivate-publish-version-model.md`,
`research/2026-06-29-workflow-history-and-source-control.md`,
`research/2026-06-29-cuantico-internal-prior-art.md`. Worked in
`examples/03-safe-rest-put-edit.md`.

## The three concepts

1. **The saved workflow DEFINITION** - what `PUT /api/v1/workflows/{id}` and MCP
   `update_workflow` change. An MCP `update_workflow` saves a DRAFT (verified on voyze).
2. **The active / inactive FLAG** - what `publish_workflow` (MCP) and
   `/workflows/{id}/activate` + `/deactivate` (REST) toggle. In the public-API vocabulary
   activate/deactivate IS "publish/unpublish." `active` is READ-ONLY on PUT.
3. **Workflow HISTORY versions** - previous saved versions stored in the instance DATABASE (not
   Git). This is the rollback path, and it is a CLOUD / PAID self-hosted feature only.

## The go-live checklist

1. `validate_workflow` and resolve findings (Directive 4).
2. Update the body (REST PUT allowed keys, or MCP `update_workflow`).
3. Re-bind and VERIFY credentials (Directive 1).
4. `publish_workflow` (MCP) or `POST /api/v1/workflows/{id}/activate` (REST) (Directive 2).
5. Re-GET and confirm the new version is active: `versionId` changes on each save, so compare it
   to confirm the running instance is on your new version, not the old one.

## Git source control and environments

Linking instances to a Git repo creates multiple environments backed by Git branches. But a Git
`push` saves only WORKFLOWS, TAGS, and credential / variable STUBS; a `pull` requires you to
re-populate credentials and variable stubs. This is the SAME root cause as the API credential
strip: n8n never moves secrets out of the instance. Re-populate after a pull just as you re-bind
after an API edit.

## Self-hosted vs cloud rollback

Both the Cuantico main and voyze instances are self-hosted.

> TODO: open question - needs human decision before next refresh. Workflow-history / undo is
> paid-only: community self-hosted has NO built-in version history or undo; cloud and paid
> self-hosted do. Confirm whether the Cuantico main and voyze instances are on a plan that enables
> workflow history. If NOT, export-before-edit (Guide 03, step 2) is the ONLY rollback path and is
> mandatory.

## Do not confuse execution pruning with workflow versions

Execution-data pruning (`EXECUTIONS_DATA_MAX_AGE`, default 336 hours / 14 days;
`EXECUTIONS_DATA_PRUNE_MAX_COUNT`, default 10,000) controls how long RUN LOGS are kept. It is
unrelated to workflow versions, despite the shared word "history." It matters for monitoring (the
live-event-ops Guardian's concern), not for your edits. Source:
`research/2026-06-29-workflow-history-and-source-control.md`.
