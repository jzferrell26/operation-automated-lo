# 04 - Routing boundaries

ACTION 4 from the brief. You own the SMS-agent contract and the migration. Many sub-tasks that arise inside a tool handler belong to a peer Guardian. Route them; do not absorb them.

Source: the Command Brief routing directives and `research/cuantico-internal/2026-06-29-assistable-payload-contract-and-cuantico-sms.md` (ROUTING boundaries) and `research/ghl-api/2026-06-29-ghl-conversations-send-message-api.md`.

## The routing table

| Sub-task | Owner | You keep |
|---|---|---|
| GHL contact/custom-field WRITE (field keys, upsert, DATE/SINGLE_OPTIONS rules) | gohighlevel-guardian | The tool call that needs the write; you wire it and hand off the field semantics. |
| The GHL `POST /conversations/messages` field catalog / contact semantics | gohighlevel-guardian | The fact that the engine sends through this endpoint; you own the send-call contract, they own field-level semantics. |
| n8n workflow that triggers or routes a send | n8n-workflow-guardian | The SMS-agent contract the workflow feeds; you do not edit workflow nodes. |
| Generic TypeScript/Node mechanics (bundling, zod, ESM, Vitest, concurrency primitives) | typescript-node-guardian | The REQUIREMENT (e.g. "validate `body.args` at this boundary"); they own the implementation mechanic. |
| Supabase deploy/platform (migrations, RLS, Edge Functions, access-token hook) | supabase-platform-guardian | WHAT must be persisted (inbound message id for dedupe, conversation thread, tool-call audit); they own the deploy. |
| Supabase/Postgres schema DESIGN (column types, indexes) | db-guardian | The persisted-data requirement, not the schema. |
| Durable-workflow engine mechanics (Inngest concurrency-key internals, retry tuning) | durable-workflows-guardian | The SMS-contract reason for idempotency/per-contact ordering; they own the engine mechanics. |
| Voice-AI / telephony, Assistable `CUSTOM` voice tools | voice-ai-telephony-guardian | Nothing; voice is out of scope. SMS uses FUNCTION tools. |

## How to route

State the boundary explicitly in your output. For example: "The handler needs to upsert a GHL custom field `appointment_date`. Routing the field-key resolution and the DATE no-Z write rule to gohighlevel-guardian; this Weapon wires the tool call and passes the resolved value."

Do not silently implement a peer Guardian's surface. Crossing the line duplicates ownership and lets the two copies drift.

## Open question that shapes routing

> TODO: open question - needs human decision. Migration ownership boundary: does this Guardian own the cuantico-sms BUILD code (the Next.js/Inngest/Supabase implementation), or only the Assistable integration + the migration DESIGN + the handler wiring, handing generic backend mechanics to typescript-node-guardian? Brief default: the latter (owns the SMS-agent contract + migration design + handler wiring; hands generic backend to the language Guardian). Resolve per engagement with the operator before committing to build work. Source: `research/research-summary.md` open question 1; brief IDEAS/QUESTIONS section.

> TODO: open question - needs human decision. Does today's live SMS path run through n8n or directly to Assistable? This determines how much n8n-workflow-guardian is in the loop. If the path is direct-to-Assistable, n8n is barely involved; if it routes through n8n, coordinate sends/triggers with n8n-workflow-guardian. Source: `research/research-summary.md` open question 3.

## Worked example

`examples/01-wire-tool-happy-path.md` shows a handler that needs a GHL write and routes the field semantics to gohighlevel-guardian while keeping the tool-call wiring.
