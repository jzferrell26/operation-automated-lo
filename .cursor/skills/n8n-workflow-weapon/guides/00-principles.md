# Guide 00: Principles and Critical Directives

The scope, the six directives, and the standing rules. Read this before any build, audit, or
edit. Every other guide assumes these are in force.

## What this Weapon covers

Build, audit, and safe-edit MECHANICS for n8n workflows on the Cuantico main n8n instance and
the voyze.ai n8n instance, across three surfaces: the instance-native n8n MCP server, the public
REST API, and the Workflow SDK. Plus error-handling MECHANICS and the Data Table surface.

## What this Weapon does NOT cover

- Enrichment-loop DESIGN -> `contact-enrichment-guardian`.
- GHL field / contact semantics -> `gohighlevel-guardian`.
- Live-event RUN ops -> `live-event-ops-guardian`.
- Security CVE catalog / vulnerability audit -> `security-guardian`.
- Error severity-routing POLICY (who gets paged, which channel) -> per-client decision.

These boundaries are load-bearing. Source: `research/2026-06-29-cuantico-internal-prior-art.md`,
`research/research-summary.md` ("Scope reminder for weapon-forge").

## The six critical directives

### Directive 1 - Credentials are invisible to the API; MCP edits strip them

The MCP `update_workflow` strips credential bindings, and `get_workflow_details` omits node
credentials so you cannot audit binding from it. n8n intentionally blocks LIST and GET of
credentials over the public API to prevent credential exposure; a node stores only a REFERENCE
to a credential, never the secret. **Why it matters:** a silent credential strip breaks a live
workflow with NO error at edit time. **Rule:** prefer REST PUT (which preserves the bound
reference when you echo the node's credential block back), or after any MCP-based change, re-bind
credentials (UI paste preferred, or a REST update carrying the reference) and VERIFY the binding
(test execution or UI check) before declaring done. Source:
`research/2026-06-29-mcp-update-credentials-stripped-and-blocked.md`,
`research/2026-06-29-cuantico-internal-prior-art.md`. Demonstrated in
`examples/03-safe-rest-put-edit.md`.

> TODO: open question - needs human decision before next refresh. The exact MCP credential-strip
> behavior of the April-2026 instance-native MCP `update_workflow` is asserted from Cuantico prior
> art, not freshly verified on 2026 builds. Run ONE controlled test per instance (edit a throwaway
> workflow, then check the binding) before trusting any MCP edit on a live workflow. Until then,
> treat "credentials survived the edit" as something to VERIFY every time, never assume.

### Directive 2 - An MCP update saves a DRAFT, not a live change

In the public REST API the `active` field is read-only on PUT; going live is a SEPARATE call.
In the public-API vocabulary the activate/deactivate pair IS "publish/unpublish." **Why it
matters:** assuming an edit is live is how a "fixed" workflow keeps running the old version.
**Rule:** after updating the body, call `publish_workflow` (MCP) or `POST /api/v1/workflows/{id}/activate`
(REST) to go live, then re-GET and confirm the active version changed (`versionId` changes).
Source: `research/2026-06-29-activate-deactivate-publish-version-model.md`. Demonstrated in
`examples/03-safe-rest-put-edit.md`.

### Directive 3 - Restrict the REST PUT body to the allowed keys

Allowed PUT body keys: `name`, `nodes`, `connections`, `settings`. Strip every read-only / system
field (`id`, `active`, `versionId`, `createdAt`, `updatedAt`, `triggerCount`, `meta`, `pinData`)
before sending. The workflow ID goes in the URL path, never the body. **Why it matters:** extra
keys cause the exact error `request/body must NOT have additional properties (Status: 400)` (MCP
surfaces it as `MCP error 1003: request/body must NOT have additional properties (Status: 400)`),
and a nested `settings` sub-object also rejects extras. Source:
`research/2026-06-29-rest-api-update-workflow-allowed-keys.md`,
`research/2026-06-29-rest-api-workflow-endpoints-deepwiki.md`,
`research/2026-06-29-api-update-additional-properties-issue-19587.md`. Demonstrated in
`examples/03-safe-rest-put-edit.md`.

> TODO: open question - needs human decision before next refresh. `staticData` on PUT is
> version-dependent: the Command Brief and Cuantico prior art list `staticData` as an ALLOWED key,
> but the widely-cited public gist lists it as a field to STRIP. The safe default is to OMIT
> `staticData` unless a workflow specifically needs to seed static data. Confirm the true
> allowed-key set per instance via the live Swagger UI at `N8N_HOST/api/v1/docs`.

### Directive 4 - Always validate before create or update

Run `validate_workflow` and use `get_node_types` for exact parameter names before creating or
updating. The validation progression is `validate_node({mode: 'minimal'})` ->
`validate_node({mode: 'full', profile: 'runtime'})` -> `validate_workflow(workflow)`. **Why it
matters:** guessing node parameters produces an invalid workflow that fails only at runtime. The
SDK reference itself says guessing creates invalid workflows. Source:
`research/2026-06-29-workflow-sdk-reference-in-environment.md`,
`research/2026-06-29-n8n-mcp-server-tools-and-validation.md`. Demonstrated in
`examples/01-build-http-to-datatable.md`.

### Directive 5 - Confirm the instance and the published state before editing

Confirm which instance (Cuantico main n8n vs voyze.ai n8n) and whether the workflow is published
before touching it. **Why it matters:** editing the wrong instance, or the archived clone instead
of the live workflow, is a real and costly mistake. **Rule:** export the workflow JSON before any
edit (this is also your rollback path), then re-confirm the instance host and the active flag.
Source: `research/2026-06-29-cuantico-internal-prior-art.md`,
`research/2026-06-29-workflow-history-and-source-control.md`.

> TODO: open question - needs human decision before next refresh. Workflow-history / undo is
> paid-only: community self-hosted n8n has NO built-in version history or undo; cloud and paid
> self-hosted plans do. Both the Cuantico main and voyze instances are self-hosted. Confirm
> whether each instance is on a plan that enables workflow history. If NOT, export-before-edit is
> MANDATORY and is the only rollback path.

### Directive 6 - No em dashes, ever

No em dashes (the long dash) or en dashes in any report, code comment, or prose. Use a comma,
colon, parentheses, period, or semicolon. Regular hyphens are fine. This is a project hard rule.

## Standing rule: never hardcode a secret

On a from-scratch build, use `newCredential('Name')` for authentication. Never use placeholder
strings, fake API keys, hardcoded auth values, or synthesized credential IDs (no `mock-*`, no
invented raw IDs). If `availableCredentials` is provided, treat it as an allow-list: copy an
existing credential ID exactly, or use `newCredential('Name')` without an ID. The credential type
must match what the node expects. This is the SDK-side complement to Directive 1. Source:
`research/2026-06-29-workflow-sdk-reference-in-environment.md`.

## Standing rule: n8n never moves secrets out of the instance

The same root cause underlies the API credential-strip (Directive 1) and Git source control: n8n
deliberately never exports secrets. A Git `push` saves only credential and variable STUBS; a
`pull` requires you to re-populate them. So you must re-bind credentials after an API edit AND
re-populate them after a Git pull. Source:
`research/2026-06-29-workflow-history-and-source-control.md`.
