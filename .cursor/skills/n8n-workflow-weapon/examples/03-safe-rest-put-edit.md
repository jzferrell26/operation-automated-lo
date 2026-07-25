# Example 03: Safe REST PUT Edit of a Live Workflow

Demonstrates `guides/03-safe-edit-rest-mcp.md` and `guides/06-version-model-and-go-live.md`. Shows
the 400-additional-properties failure, the fix, the credential re-verify, and the separate activate.

## Input the Guardian receives

> "Add a 5-second timeout to the HTTP node in the Lofty to GHL sync (voyze, workflow
> `y2YAfuNh4wsTxhFj`). It is live. Don't break the credentials."

## What the Guardian does (and the failure it hits)

1. Confirm instance + live state: voyze, `y2YAfuNh4wsTxhFj`, currently active (Directive 5).
2. Export the workflow JSON as the rollback (Guide 03 step 2; no built-in undo on community
   self-hosted, Directive 5 TODO).
3. `GET /api/v1/workflows/y2YAfuNh4wsTxhFj` with `X-N8N-API-KEY`.
4. First attempt (WRONG): edits the HTTP node, then PUTs the whole GET response back unchanged.

   Result: `request/body must NOT have additional properties (Status: 400)`. The body still
   carried `id`, `active`, `versionId`, `createdAt`, `updatedAt`, `triggerCount`, `meta`,
   `pinData` (Directive 3).

5. Fix: strip every read-only key, keep only `name`, `nodes`, `connections`, `settings`. Omit
   `staticData` by default (Directive 3 TODO). Echo each node's credential block back unchanged so
   the binding survives.
6. PUT again to `/api/v1/workflows/y2YAfuNh4wsTxhFj`. Succeeds (200).
7. Re-verify the GHL and Lofty credentials are still bound via a test execution (Directive 1).
8. The PUT did NOT change `active`. Call `POST /api/v1/workflows/y2YAfuNh4wsTxhFj/activate` to keep
   it live on the new definition (Directive 2).
9. Re-GET; confirm `versionId` changed and the workflow is active on the new version (Guide 06).

## Output the Guardian produces (per `templates/change-report.md`)

> Instance: voyze.ai n8n. Workflow: Lofty to GHL Sync (`y2YAfuNh4wsTxhFj`).
> Change: added `timeout: 5000` to the HTTP node options.
> Surface: REST PUT (chosen to preserve credentials).
> Hit `400 additional properties` on first attempt; stripped read-only keys and retried.
> Credentials verified bound after edit. Re-activated; confirmed new `versionId` is live.
> Rollback: exported JSON saved before edit.

## Why this matters

It shows the single most common edit failure (PUTting the whole GET body back) and proves the four
edit-critical directives in one flow: allowed keys only, preserve + verify credentials, separate
activate, confirm the new version. The unsafe version of this (MCP `update_workflow` with no
re-bind and no publish) would have silently dropped the credentials and left the old version live.
