# Routing guide: `assistable-sms-guardian`

**Guardian:** [`ai-tools/agents/assistable-sms-guardian.md`](../../agents/assistable-sms-guardian.md)
**Weapon:** [`ai-tools/skills/assistable-sms-weapon/`](../../skills/assistable-sms-weapon/)
**Command Brief:** [`ai-tools/command-briefs/assistable-sms-guardian-command-brief.md`](../../../command-briefs/assistable-sms-guardian-command-brief.md)
**Trigger policy:** on-demand

## Domain
SMS-AI-agent specialist for Cuantico. Its near-term job is the Assistable integration: parsing and
wiring the inbound webhook payload, validating tool calls, and returning the correct Assistable
tool-response shape so the live SMS agent behaves. It owns the Assistable inbound webhook payload
contract exactly (tool arguments under `body.args`; `contact_id` and `location_id` under
`body.metadata` AND the request headers) and the tool-call wiring (TOOL_CALL / TOOL_RESULT message
types, FUNCTION tools that carry a JSON-Schema `parameters` block, a `url`, and an `http_method`).
Its strategic job is the incremental migration off the third-party Assistable dependency to the
GHL-native cuantico-sms engine (Next.js + Inngest + Supabase), advanced behind a stable contract so
the live SMS flow never breaks. It owns the SMS-agent contract and the migration; it does not write
GHL contacts/fields, own the n8n plumbing, or own generic backend mechanics.

## Trigger phrases (route here)
- "parse this Assistable webhook", "validate the SMS webhook"
- "wire an Assistable tool", "add a tool to the SMS assistant"
- "my SMS agent tool returns the wrong shape", "the agent can't find contact_id"
- "port this handler to cuantico-sms", "plan the Assistable-to-cuantico-sms migration"
- "make the SMS receiver idempotent"
- When an operator or a peer Guardian hands off an SMS-agent integration or migration task.
- Or when the request implicitly involves the Assistable webhook payload contract, SMS tool-call
  wiring, or the cuantico-sms migration.

## Do NOT route here
- GHL contact / custom-field write semantics, the Conversations / SMS send API, or Conversation AI
  -> `gohighlevel-guardian`. This Guardian owns the SMS-agent contract; it consumes the GHL write,
  it does not own the GHL field catalog or the send API.
- The n8n workflow that triggers a send, or the plumbing around the webhook -> `n8n-workflow-guardian`.
  This Guardian wires the tool handler, not the workflow internals.
- Generic TypeScript / Node / Inngest / Supabase backend mechanics -> `typescript-node-guardian`.
  This Guardian owns the SMS-agent contract and the migration DESIGN plus handler wiring; it hands
  generic backend mechanics to the language Guardian.
- A security CVE catalog or vulnerability audit -> `security-guardian`.

If a request straddles two domains, prefer the narrower-scoped Guardian and let this one act as the
SMS-agent-contract backup.

## Inputs the Guardian needs
Before invoking, ensure the user has provided (or you can infer):
- The task type: an Assistable inbound webhook payload or tool-call to wire / validate / debug, a tool
  definition to add to the agent, or a migration task toward cuantico-sms (a milestone, a handler to
  port, an architecture question).
- The GHL location context.
- The current state: the live Assistable flow vs the cuantico-sms scaffold.
- For a tool-wiring task: the tool name, its `parameters` schema, and the handler endpoint.

If a required input is missing, do not invoke yet; ask the user to supply it. Several boundary
questions (migration ownership, the live-path-through-n8n question, the exact Assistable signature
verification step) are known open items carried in the Weapon; surface them to the operator rather
than guessing.

## Outputs the Guardian produces
- A wired / validated tool handler, captured via the weapon's `templates/tool-handler-spec.md`. The
  handler lives in the cuantico-sms codebase or the Assistable config.
- A webhook-contract or tool-contract note via `templates/webhook-contract-note.md`, returned to the
  caller.
- A migration plan / step note via `templates/migration-step-note.md` for a cuantico-sms migration
  task.
- A run record per the weapon's `reports/` (`reports/run-report-template.md`).

## Multi-Guardian sequences this Guardian participates in
- Operator hand-off -> `assistable-sms-guardian`: an operator or peer Guardian requests an SMS-agent
  integration, tool-wiring, validation, or migration step, which this Guardian executes (parse ->
  validate -> wire / audit -> route writes -> migrate incrementally).
- `assistable-sms-guardian` -> `gohighlevel-guardian`: when a handler needs a GHL contact / field
  write, the Conversations / SMS send API, or Conversation AI, hand that piece off there, then compose
  the answer back into the SMS-agent contract.
- `assistable-sms-guardian` -> `n8n-workflow-guardian`: when the live SMS path runs through n8n or a
  send is triggered by a workflow, hand the plumbing off there.
- `assistable-sms-guardian` -> `typescript-node-guardian`: for generic TS / Node / Inngest / Supabase
  backend mechanics in the cuantico-sms build, hand the build mechanics off there while this Guardian
  keeps the contract and migration design.

## Critical directives the orchestrator should respect
- Honor the Assistable webhook payload contract exactly: tool args under `body.args`; `contact_id` /
  `location_id` under `body.metadata` and the headers. Looking in the wrong place is the classic
  Assistable integration bug and it fails silently, so the agent appears wired but never finds its
  context.
- Validate the inbound webhook (auth/signature + shape) before acting: an SMS tool handler is an
  unauthenticated-by-default external entry point, so an unvalidated handler is an open door into the
  SMS flow and the credentials it touches.
- Migrate incrementally behind a stable contract; never break the live SMS flow to advance
  cuantico-sms. SMS is a live client channel, so a broken cutover is visible to the end customer
  immediately. Keep the live Assistable path working until cutover.
- Route GHL writes to `gohighlevel-guardian` and n8n plumbing to `n8n-workflow-guardian`. This
  Guardian owns the SMS-agent contract and migration, not the GHL field catalog, the Conversations /
  SMS API, or the workflow internals.
- Treat secrets (Assistable keys, GHL tokens, Supabase keys) as env-only; never log or commit them.
  An SMS webhook handler touches multiple credential sets, so one logged token leaks several
  integrations at once.
- No em dashes in any code comment, doc, or prose, ever.

(Full list lives in the Guardian file's `## Critical directives` section.)

## Paired Weapon
`ai-tools/skills/assistable-sms-weapon/` (read `SKILL.md` first, then `guides/00-principles.md` for
the scope boundary and the six critical directives before any parse, wiring, validation, or migration
action).

---

*Part of Dungeon Master's roster. See [`SKILL.md`](../SKILL.md) for the full Guild.*
