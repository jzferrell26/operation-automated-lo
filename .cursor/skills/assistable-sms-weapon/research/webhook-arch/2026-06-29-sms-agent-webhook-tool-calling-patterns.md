---
source_url: https://www.sendblue.com/blog/ai-agent-sms-texting-api ; https://www.buildmvpfast.com/blog/webhook-driven-agent-architecture-event-based-triggers-autonomous-ai-workflows-2026 ; https://www.twilio.com/en-us/blog/developers/tutorials/integrations/add-sms-capabilities-ai-agent ; https://www.digitalapplied.com/blog/webhook-reliability-idempotency-retries-engineering-reference-2026
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: high
topic: sms-webhook-tool-calling
weapon: assistable-sms-weapon
---

# SMS AI agent webhook + tool-calling patterns (industry, 2026)

## Summary

The general-industry shape of an SMS-AI-agent webhook loop, useful as the GENERIC pattern the Assistable-specific contract is an instance of. The canonical loop: inbound SMS arrives -> provider POSTs a webhook to your server (sender phone, message content, conversation/channel ids) -> your LLM processes -> if a tool call is detected, the agent hits a tool/function endpoint -> reply is sent back through the SMS send API. Production hardening centers on HMAC signature verification, idempotent handlers (duplicate-delivery safe), retry logic with backoff, and dead-letter queues. Note: NO public source documents "Assistable AI" webhook payloads specifically -- the Assistable contract is Cuantico-internal (see assistableai-mcp-schemas.md and the operator-memory note).

## Key quotations / statistics

- "When the human replies, a webhook fires back to your server, your LLM processes the reply, and the loop continues. Inbound messages, delivery confirmations, read receipts, and failures all fire to your webhook URL."
- "Two endpoints handle 90% of use cases: POST /api/send-message and your inbound webhook." (Sendblue) -- mirrors the cuantico-sms shape: one send call + one inbound webhook.
- SMS webhook payloads "typically include conversation_id, phone_number, agent_number, and channel information ('sms', 'rcs', or 'whatsapp'), with webhooks firing every time a message is sent or received."
- Tool calling: "The AI agent processes user inputs and determines if it needs to call functions; if a tool call is detected, the agent sends the message through the API."
- Webhook-driven AI agent architectures "use event-based triggers with payload routing, security measures like HMAC verification, retry logic, and dead letter queues."

## Annotations for weapon-forge

- Use this as the GENERIC backdrop, then immediately specialize to the Assistable contract: Assistable delivers tool args under `body.args` and `contact_id`/`location_id` under `body.metadata` AND headers. The generic pattern says "payload includes phone/conversation/channel"; the Cuantico-specific rule pins WHERE those live for Assistable. The weapon's webhook-parsing guide must use the Cuantico contract, not the generic field names.
- HMAC signature verification is the industry-standard webhook-auth control and maps directly to the Guardian's directive #2 (validate auth/signature + shape before acting). The weapon should specify the exact Assistable verification step (capture from MCP/Assistable docs or operator) and the GHL inbound-webhook verification separately.
- The "one send call + one inbound webhook" minimal surface (Sendblue) is a clean mental model for the cuantico-sms engine: an inbound Inngest-backed webhook receiver + a `POST /conversations/messages` GHL send.
- Idempotency + dead-letter + retry are the correctness trio; they hand off cleanly to the Inngest durability notes (durable-workflows) -- cross-reference them in the migration guide.
