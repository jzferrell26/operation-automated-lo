---
name: assistable-sms-weapon
description: Equips assistable-sms-guardian to own the SMS-AI-agent surface for Cuantico. Parses and validates the Assistable inbound webhook (tool args under body.args; contact_id/location_id under body.metadata AND headers), wires and audits tool-call handlers (TOOL_CALL/TOOL_RESULT message types, FUNCTION tools with parameters/url/http_method), routes GHL writes and n8n plumbing to the right Guardian, and drives the incremental migration to the GHL-native cuantico-sms engine (Next.js + Inngest + Supabase) behind a stable contract without breaking the live SMS flow. Use when the user says "parse this Assistable webhook", "wire an Assistable tool", "my SMS agent tool returns the wrong shape", "validate the SMS webhook", "the agent can't find contact_id", "add a tool to the SMS assistant", "port this handler to cuantico-sms", "plan the Assistable-to-cuantico-sms migration", "make the SMS receiver idempotent", or when assistable-sms-guardian is invoked. Do NOT use for GHL contact/custom-field write semantics (gohighlevel-guardian), the n8n workflow that triggers a send (n8n-workflow-guardian), generic TypeScript/Node backend mechanics (typescript-node-guardian), Supabase deploy/platform wiring (supabase-platform-guardian), durable-workflow engine mechanics (durable-workflows-guardian), or voice-AI telephony (voice-ai-telephony-guardian).
---

# Assistable SMS Weapon

You wield this skill on behalf of **assistable-sms-guardian**, the SMS-AI-agent specialist for Cuantico. You own two jobs: the **near-term Assistable integration** (parse the inbound webhook, validate it, wire tool calls, return the correct tool-response shape) and the **strategic migration** off the third-party Assistable dependency to the GHL-native **cuantico-sms** engine (Next.js + Inngest + Supabase), advanced incrementally without ever breaking the live SMS flow.

You own the **SMS-agent contract and the migration**. You do not write GHL contacts/fields directly, you do not own the n8n plumbing, and you do not own generic backend mechanics. You route those to the right Guardian.

Read `guides/00-principles.md` first. It carries the critical directives that govern every action below.

## When to use

Invoke when the task is any of:

- Parse, validate, or debug an Assistable inbound webhook payload.
- Wire, audit, or add an Assistable tool call (map tool name + args to a handler, return the tool-response shape).
- Advance the cuantico-sms migration (port a handler, plan a milestone, answer an architecture question) behind the stable external contract.
- Decide whether a sub-task is yours or belongs to a peer Guardian.

Do NOT use this skill for the work that belongs to peer Guardians. See the routing table in `guides/04-routing-boundaries.md`.

## The five core actions

Each maps to a guide. Read the guide before acting; do not work from memory on the payload contract or the migration architecture.

1. **Parse the inbound webhook per the contract.** Tool arguments live under `body.args`. `contact_id` and `location_id` live under `body.metadata` AND the request headers. Never look elsewhere. Resolve from `body.metadata` with the headers as a cross-check, and FAIL LOUDLY if absent from both. Full procedure: `guides/01-parse-webhook.md`.

2. **Validate before acting.** An SMS tool handler is an unauthenticated-by-default external entry point. Verify auth/signature AND the expected shape before you touch any handler logic. Procedure and the open question on the exact Assistable verification step: `guides/02-validate-webhook.md`.

3. **Wire or audit the tool call.** Map the tool name + `body.args` to its handler, execute, and return the Assistable tool-response shape (TOOL_RESULT). FUNCTION tools carry a JSON-Schema `parameters` block, a `url` (your handler endpoint), and an `http_method`. Procedure: `guides/03-tool-call-wiring.md`.

4. **Route data writes correctly.** A GHL contact/field write goes to gohighlevel-guardian's contract; n8n-triggered plumbing goes to n8n-workflow-guardian; generic TS/Node, Supabase, and durable-workflow mechanics go to their language/platform Guardians. Boundaries: `guides/04-routing-boundaries.md`.

5. **Advance the migration incrementally.** Port a handler or milestone to the Next.js + Inngest + Supabase engine behind the SAME external contract, document the step, and keep the live Assistable path working until cutover. Architecture and the ack-fast-then-process-durably + idempotency pattern: `guides/05-migration.md`.

## Critical directives (full text in `guides/00-principles.md`)

1. Honor the Assistable webhook payload contract exactly: tool args under `body.args`; `contact_id` / `location_id` under `body.metadata` and the headers. Looking in the wrong place is the classic Assistable bug and it fails silently.
2. Validate the inbound webhook (auth/signature + shape) before acting. The handler is an external entry point.
3. Migrate incrementally behind a stable contract; never break the live SMS flow to advance cuantico-sms. SMS is a live client channel; a broken cutover is visible to the end customer immediately.
4. Route GHL writes to gohighlevel-guardian and n8n plumbing to n8n-workflow-guardian. You own the SMS-agent contract and migration, not the GHL field catalog or the workflow internals.
5. Treat secrets (Assistable keys, GHL tokens, Supabase keys) as env-only; never log or commit them.
6. No em dashes in any code comment, doc, or prose, ever.

## Outputs you produce

You produce one of three things, depending on the task. Templates are in `templates/`:

- A **wired/validated tool handler** plus a tool-handler spec. Template: `templates/tool-handler-spec.md`.
- A **webhook-contract or tool-contract note** documenting the parse/validate decision. Template: `templates/webhook-contract-note.md`.
- A **migration plan or step note** toward cuantico-sms. Template: `templates/migration-step-note.md`.

When you finish a run, record it per `reports/README.md` using `reports/run-report-template.md`. Worked examples of a tool-wiring run and a migration-step run live in `examples/`.

## Open questions carried into this weapon

These survived research and are NOT for you to invent answers to. Surface them to the operator when they become load-bearing for a task. They are tagged inline in the guides as `> TODO: open question` or `> TODO: re-fetch`:

1. **Migration ownership boundary** (`guides/04`, `guides/05`): does this Guardian own the cuantico-sms BUILD code, or only the Assistable integration + migration design + handler wiring (handing generic backend mechanics to typescript-node-guardian)? Brief default: the latter.
2. **Concrete cuantico-sms milestones beyond Sprint 0** (`guides/05`): undefined; operator input.
3. **Does today's live SMS path run through n8n or directly to Assistable?** (`guides/04`): determines how much n8n-workflow-guardian is in the loop.
4. **The exact Assistable inbound-webhook signature/auth verification step** (`guides/02`): not in the captured MCP schemas; pull it from the private cuantico-sms repo, not the public web.

Plus re-fetch targets before authoring send-SMS code: the verbatim GHL `POST /conversations/messages` body schema, the GHL Conversation AI Public API spec, and the cuantico-sms Sprint-0 scaffold. See `guides/06-ghl-send-and-cuantico-sms-refetch.md`.
