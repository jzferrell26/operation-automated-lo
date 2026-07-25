# Research Summary: assistable-sms-weapon

- **Depth tier consumed:** normal (confirmed from Command Brief YAML AND backlog entry 4)
- **Time window covered:** ~2026-01 to 2026-06-29 (about 6 months; default window, not extended)
- **Tools used:** WebSearch + WebFetch (Firecrawl/Exa NOT connected in this workspace). Live `assistableai` MCP server tool SCHEMAS captured read-only via ToolSearch -- 10 tools (createMessage, createTool, getTool, listTools, assignTool, createChatCompletion, createAssistant, createCall, getConversation, listConversationMessages). NO write/mutating Assistable tool was invoked against any live account.
- **Files written:** 7 source/note files + research-plan.md + index.md + this summary, grouped as:
  - root: `assistableai-mcp-schemas.md` (live MCP, authoritative Assistable surface)
  - `cuantico-internal/`: 1 file (the Assistable payload contract + cuantico-sms engine, internal prior art)
  - `ghl-api/`: 1 file (GHL Conversations send-message + Conversation AI Public API)
  - `inngest/`: 2 files (Inngest idempotency/durability; Supabase+Next.js stack)
  - `webhook-arch/`: 1 file (industry SMS webhook + tool-calling patterns)
  - `ghl-native/`: 1 file (GHL native Conversation AI on SMS, build-vs-buy backdrop)

## Query coverage

All 5 brief queries executed + 3 refining queries (one MCP-schema capture is the de-facto answer to the Assistable query, since the public web does not document Assistable):

| Brief query | Covered by |
|---|---|
| Assistable AI SMS agent webhook payload tool args 2026 | MCP schemas + cuantico-internal note (public web has ~none; expected) |
| GoHighLevel native SMS conversation AI agent 2026 | ghl-native note |
| Inngest Supabase Next.js SMS engine architecture 2026 | inngest idempotency note + supabase stack note |
| SMS AI agent tool calling webhook contract 2026 | webhook-arch note |
| replace third-party SMS AI with GHL-native conversation AI 2026 | ghl-native note + ghl-api note |

Refining queries (loremaster-authored): GHL Conversations API send-SMS endpoint (-> ghl-api note); Inngest durable-functions webhook idempotency/exactly-once (-> inngest note); plus the GHL Conversation AI Public API help-doc fetch.

## 5 most influential sources

1. **`assistableai-mcp-schemas.md`** -- THE authoritative Assistable API surface. The public web has effectively no Assistable-specific docs, so the live MCP schemas are the primary evidence. Confirms the header-vs-body subaccount routing (`X-Subaccount-Id` + `location_id`/`subaccount_id` alias) and the TOOL_CALL/TOOL_RESULT message types + FUNCTION tool `parameters`/`url`/`http_method` that define the tool-call loop. weapon-forge should build the Assistable guide primarily from this file.
2. **`cuantico-internal/...assistable-payload-contract-and-cuantico-sms.md`** -- the verbatim Cuantico contract (`body.args`, `body.metadata` + headers) and the locked cuantico-sms stack. This is the spine of the webhook-parsing guide and the migration guide; it carries the brief's open items.
3. **`inngest/...inngest-idempotency-durable-webhooks.md`** -- load-bearing correctness for the migration: event-level + function-level idempotency (24h window), exactly-once `step.run`, and the ack-fast-then-process-durably webhook pattern. This is how the cuantico-sms receiver avoids double-sending replies.
4. **`ghl-api/...ghl-conversations-send-message-api.md`** -- the concrete `POST /conversations/messages` send-SMS call + the sub-account-token rule + V1 EOS (2025-12-31). The external write path the engine delivers through.
5. **`ghl-native/...ghl-conversation-ai-native-sms.md`** -- the build-vs-buy backdrop and the non-functional targets (sub-2s replies, cross-session memory, $97/mo/sub-account) a custom engine must justify itself against.

## Open questions surviving research (for the user / operator, NOT for weapon-forge to invent)

1. Migration ownership boundary: does this Guardian own the cuantico-sms BUILD code, or only the Assistable integration + migration DESIGN + handler wiring (handing generic backend mechanics to typescript-node-guardian)? Brief default leans to the latter.
2. Concrete cuantico-sms milestones beyond Sprint 0 are undefined -- operator input.
3. Does today's live SMS path run through n8n or directly to Assistable? Determines how much n8n-workflow-guardian is in the loop.
4. The EXACT Assistable inbound webhook signature/auth verification step is not in the captured MCP schemas (the MCP is the API client surface, not the inbound-webhook spec). The operator/private repo holds the verification detail; weapon-forge should source it from the cuantico-sms repo, not the public web.

## Sources weapon-forge should re-fetch with deeper context

- **GHL `POST /conversations/messages` exact field list + `Version` header.** The marketplace docs page is JS-rendered and returned thin via WebFetch. Re-fetch the Stoplight reference (`highlevel.stoplight.io`) or the marketplace page in a browser session for the verbatim body schema before authoring send-SMS code. (This is also gohighlevel-guardian's territory for field semantics.)
- **GHL Conversation AI Public API (Agents/Actions/Generations)** full endpoint specs at `marketplace.gohighlevel.com/docs/ghl/conversation-ai/actions` -- only summarized here; pull the full spec if the migration rides native Conversation AI.
- **The cuantico-sms private repo** for the Sprint-0 scaffold shape, the actual webhook verification code, and any already-ported handlers -- the authoritative internal source weapon-forge should read directly.
