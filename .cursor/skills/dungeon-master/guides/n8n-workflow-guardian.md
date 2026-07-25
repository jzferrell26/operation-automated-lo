# Routing guide: `n8n-workflow-guardian`

## Domain
n8n workflow build, audit, and safe-edit specialist for Cuantico's automation fleet. Owns the
WORKFLOW itself across the three surfaces Cuantico actually uses: the instance-native n8n MCP
server, the public REST API, and the Workflow SDK. Its disciplines are the ones that keep a live
client workflow from breaking silently: credential-binding integrity, the draft-vs-publish version
model, allowed-key PUT payload hygiene, node-by-node validation, error-handling mechanics (error
trigger, retries/backoff, dead-letter, global error handler), idempotency / re-run safety, and the
n8n Data Table surface. It is the engineering layer beneath the operator and domain Guardians, not a
replacement for them. It operates against two instances: the Cuantico main n8n and the voyze.ai n8n.

## Trigger phrases (route here)
- "build an n8n workflow", "wire a new trigger", "rebuild this node"
- "audit this workflow node by node", "add an error branch"
- "this MCP update broke the credentials", "the PUT update returns 400 additional properties"
- "is this workflow live or a draft", "publish vs draft", "go live / activate the workflow"
- "set up a Data Table", "add a Data Table column", "make this webhook idempotent"
- When an operator or domain Guardian needs a workflow built or changed without breakage on the
  Cuantico main n8n or the voyze.ai n8n instance.
- Or when the request implicitly involves building, validating, or safely editing n8n workflow state
  across MCP / REST / SDK.

## Do NOT route here
- Enrichment-loop DESIGN (batched waterfall logic, provider fallback) -> `contact-enrichment-guardian`
  (this Guardian only wires the mechanics that one specifies).
- GHL field / contact semantics (custom-field keys, DATE / SINGLE_OPTIONS typing, fieldKey
  resolution) -> `gohighlevel-guardian`.
- Running a live event (the RUN ops, not the workflow build) -> `live-event-ops-guardian`.
- A security CVE catalog or vulnerability audit -> `security-guardian`.

If a request straddles two domains, prefer the narrower-scoped Guardian and let this one act as the
workflow-mechanics backup.

## Inputs the Guardian needs
Before invoking, ensure the user has provided (or you can infer):
- Which instance: Cuantico main n8n or the voyze.ai n8n instance.
- The workflow id (for an audit or edit), or a from-scratch build spec (trigger, nodes, the service
  it automates).
- Whether the workflow is published (live) or a draft.
- The surface constraint if known (must go through MCP, REST, or SDK) and whether this is a build, an
  audit, or an edit.

If the instance or publish status is missing, do not invoke yet. Confirming instance and publish
status is a critical directive, not optional.

## Outputs the Guardian produces
- A validated, working workflow (created or updated) living in the correct n8n instance, with
  credentials still bound and the live version actually updated.
- A short change or audit report returned to the caller (per the weapon's `templates/change-report.md`
  or `templates/audit-report.md`), optionally written to `library/` when part of a documented change.
- For an audit: severity-ranked findings naming the node and the exact issue (credential gaps,
  unbound nodes, missing error handling, retry / idempotency gaps).

## Multi-Guardian sequences this Guardian participates in
- Operator hand-off -> `n8n-workflow-guardian`: `live-event-ops-guardian`,
  `contact-enrichment-guardian`, or `gohighlevel-guardian` design the intent, then route the actual
  workflow build / edit here to execute it without breakage.
- On a change that needs a security pass: `n8n-workflow-guardian` (build / edit) ->
  `security-guardian` (audit) before declaring done.

## Critical directives the orchestrator should respect
- MCP `update_workflow` STRIPS credential bindings, and `get_workflow_details` OMITS node credentials
  so binding cannot be audited from it. Prefer REST PUT (preserves credentials) or re-bind and verify
  after an MCP update.
- An MCP update saves a DRAFT, not a live change. Call `publish_workflow` (or REST `/activate`) to go
  live, then confirm the new version is the running one.
- Restrict the REST PUT body to the allowed keys (`name`, `nodes`, `connections`, `settings`); extra
  keys cause `request/body must NOT have additional properties (Status: 400)`.
- Always `validate_workflow` before creating or updating, and use `get_node_types` for exact
  parameter names.
- Confirm which instance and whether the workflow is published before editing.
- No em dashes in any report, code comment, or prose, ever.

(Full list lives in the Guardian file's `## Critical directives` section.)

## Paired Weapon
`ai-tools/skills/n8n-workflow-weapon/` (read `SKILL.md` first, then `guides/00-principles.md` for the
six critical directives before any build, audit, or edit).

---

*Part of Dungeon Master's roster. See [`SKILL.md`](../SKILL.md) for the full Guild.*
