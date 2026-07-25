# Migration Step Note: {{handler_or_milestone}}

One note per migration step toward cuantico-sms. See `guides/05-migration.md`. Keep the live Assistable flow working (directive 3).

- **Date:** {{YYYY-MM-DD}}
- **Step:** {{port handler X | milestone Y}}
- **cuantico-sms repo state assumed:** {{Sprint 0 scaffold | after step N}}

## External contract held constant

- **tool url unchanged:** {{yes/no}}
- **parameters schema unchanged:** {{yes/no}}
- **TOOL_RESULT shape unchanged:** {{yes/no}}
- (If any "no": this is a contract change, not a transparent migration. Flag to operator.)

## New shape in Next.js + Inngest + Supabase

```
1. Thin Next.js route: {{path}}
2. Verify signature ({{scheme}})  > TODO: confirm scheme from repo if unknown
3. Ack 200 fast
4. inngest.send({ id: "{{stable_idempotency_key}}", name: "{{event}}", data: {{...}} })
5. Durable function "{{name}}":
     step.run("{{step1}}", ...)
     step.run("{{ghl-send}}", () => POST /conversations/messages)   // routed, guide 06
```

## Idempotency

- **event-level id:** {{e.g. contact_id + inbound_message_id}}
- **function-level idempotency (CEL):** {{expression}}
- **24h window acknowledged:** [ ] yes

## Persistence (Supabase)

- **what is persisted:** {{processed message id for dedupe, conversation thread, tool-call audit}}
- **connection:** transaction-mode pooler URL + prepared statements disabled [ ] yes
- **routed:** schema -> db-guardian; deploy -> supabase-platform-guardian

## Routing

- GHL send/write -> gohighlevel-guardian
- n8n plumbing -> n8n-workflow-guardian
- generic TS/Node mechanics -> typescript-node-guardian
- durable-workflow engine mechanics -> durable-workflows-guardian

## Cutover plan (no live break)

{{run in parallel -> verify parity for this handler -> switch this tool's url -> other tools stay on Assistable}}

## Open items

- {{TODO: open question - post-Sprint-0 milestones (operator input)}}
- {{TODO: open question - migration ownership boundary}}
- {{TODO: re-fetch - GHL send body schema / repo scaffold}}
