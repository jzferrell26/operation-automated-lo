# Research Plan: assistable-sms-weapon

- **Depth tier:** normal (confirmed from Command Brief YAML `research_depth: normal` AND backlog entry 4 `**Research Depth:** normal`)
- **Time window:** 2026-06-29 back to ~2026-01 (about 6 months; default window, not exceeded)
- **Page budget target:** ~100 pages worth of consumed material (normal tier); achieved via 8 web searches + 5 authoritative doc fetches + live MCP schema capture
- **Source breadth target:** canonical docs (GHL Marketplace API, Inngest docs), practitioner blogs (GHL AI setup guides, webhook architecture), an industry report or two, plus the authoritative live `assistableai` MCP tool schemas wired into this workspace

## Tooling note

Firecrawl and Exa are NOT connected in this workspace. Research used the built-in `WebSearch` + `WebFetch` tools instead. The live `assistableai` MCP server IS wired in; its tool SCHEMAS were captured read-only (via `ToolSearch`) as the authoritative Assistable API surface. No write/mutating Assistable tool was invoked against any live account.

## Cuantico-internal provenance (NOT public web)

Two pillars of this domain are Cuantico-internal and do not appear on the public web. They are sourced from operator memory, the private `cuantico-sms` repo, and the live MCP schemas:

1. The **Assistable inbound webhook payload contract**: tool args under `body.args`; `contact_id` / `location_id` under `body.metadata` AND the request headers. (Operator memory: "Assistable webhook payload shape" + "Cuantico SMS Engine". The MCP schemas corroborate the header pattern via `X-Subaccount-Id` and the `location_id`/`subaccount_id` body aliases.)
2. The **cuantico-sms engine** architecture: own GHL-native AI SMS to replace Assistable; repo `cuantico-sms` (private); Next.js + Inngest + Supabase stack locked; Sprint 0 scaffold done. (Operator memory: "Cuantico SMS Engine".)

The public-web research below provides the EXTERNAL authorities (GHL Conversations/SMS API, GHL native Conversation AI, Inngest durable/idempotency patterns) that the Cuantico-internal contracts plug into.

## Initial queries (from session-zero / the brief)

- "Assistable AI SMS agent webhook payload tool args 2026"
- "GoHighLevel native SMS conversation AI agent 2026"
- "Inngest Supabase Next.js SMS engine architecture 2026"
- "SMS AI agent tool calling webhook contract 2026"
- "replace third-party SMS AI with GHL-native conversation AI 2026"

## Expansion queries (authored by loremaster)

### Branch from "GoHighLevel native SMS conversation AI agent"
- "GoHighLevel Conversations API send SMS message endpoint 2026" (gap: the brief queries surfaced the native bot but not the concrete send-SMS API the migration target writes through)

### Branch from "Inngest Supabase Next.js SMS engine architecture"
- "Inngest durable functions webhook idempotency exactly-once 2026" (gap: idempotency is the load-bearing correctness property for an SMS webhook handler and the brief queries only named the stack, not the durability mechanics)

## Live MCP schema capture (authoritative Assistable surface)

Captured read-only schemas for the SMS/webhook/tool-call-relevant Assistable tools: `createMessage`, `createTool`, `getTool`, `listTools`, `assignTool`, `createChatCompletion`, `createAssistant`, `createCall`, `getConversation`, `listConversationMessages`. Filed in `assistableai-mcp-schemas.md`.
