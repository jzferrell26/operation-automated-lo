---
source_url: live-mcp-server://assistableai (wired into this workspace)
retrieved_on: 2026-06-29
source_type: api-schema
authority: official
relevance: critical
topic: assistable-api-surface
weapon: assistable-sms-weapon
---

# Assistable AI -- Live MCP Tool Schemas (authoritative API surface)

> PROVENANCE: This is the authoritative Assistable API surface, captured read-only from the live `assistableai` MCP server wired into this workspace. Schemas only; NO write/mutating tool was invoked against any live account. This is Cuantico-internal infrastructure, not public-web documentation.

## Summary

The `assistableai` MCP server exposes a full Assistable v3 API surface (assistants, tools, conversations, messages, calls, contacts, knowledge bases, voices, number pools, monitor rules). The schemas confirm and refine the Assistable integration contract this Guardian owns. The headline corroborations for the brief's payload-contract claim:

- **Subaccount (GHL location) routing is header-first.** Nearly every tool accepts an `X-Subaccount-Id` header described as "Target subaccount for the request. Required unless the API key is authorized for exactly one subaccount." This is the live-API mirror of the brief's rule that `location_id` lives in the request headers. The body also accepts `subaccount_id` (preferred) and a legacy `location_id` alias ("Alias for subaccount_id (GHL location id)"). So the location identifier travels in BOTH the header and the body, exactly matching the operator-memory contract.
- **Tool calls are first-class message types.** `createMessage` exposes a `type` enum that includes `TOOL_CALL`, `TOOL_RESULT`, `FUNCTION_CALL`, and `FUNCTION_RESULT`. This is the Assistable-side shape of the tool-call / tool-response loop the Guardian wires.
- **Tools are typed FUNCTION vs CUSTOM.** `createTool` / `listTools` use a `tool_type` enum: `FUNCTION` (chat/LLM, default), `CUSTOM` (voice tool with URL), plus builtins `END_CALL`, `PRESS_DIGIT`, `TRANSFER_CALL`. A FUNCTION tool carries a JSON-Schema `parameters` object and a `required_params` array -- this is where the agent's tool arguments (the `body.args` the webhook delivers to your handler) are declared.

## Key schemas (verbatim-relevant fields)

### createMessage (scope `messages:create`)
- Required: `conversation_id`, `content`
- `channel` enum: `SMS`, `EMAIL`, `VOICE`, `WHATSAPP`, `WEBCHAT`, `FACEBOOK`, `INSTAGRAM`, `GMB`, `LIVE_CHAT`, `CUSTOM` (defaults to conversation's last channel, else CUSTOM)
- `type` enum: `TEXT` (default), `IMAGE`, `VIDEO`, `AUDIO`, `FILE`, `LOCATION`, `CONTACT`, `SYSTEM`, `TOOL_CALL`, `TOOL_RESULT`, `FUNCTION_CALL`, `FUNCTION_RESULT`
- Subaccount routing: `X-Subaccount-Id` header (preferred) OR `subaccount_id` / `location_id` body alias

### createTool (scope `tools:create`)
- Required: `name`
- `tool_type` enum: `FUNCTION` (default), `CUSTOM`, `END_CALL`, `PRESS_DIGIT`, `TRANSFER_CALL`
- `http_method` enum: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` (default POST) -- the verb Assistable uses to hit YOUR tool endpoint
- `url`: the tool's endpoint (your handler URL)
- `parameters`: "JSON Schema object describing the tool's parameters"
- `required_params`: array of required parameter names
- `headers`: free-form object (custom headers Assistable sends to your endpoint)
- `speak_during_execution` / `speak_after_execution`, `execution_message_description` (voice UX)

### getTool / listTools (scopes `tools:read` / `tools:list`)
- `listTools` filters: `assistant_id`, `category`, `tool_type`, `search`, `deprecated`, `include_prebuilt`, cursor pagination (`limit` max 100)

### assignTool (scope `tools:update`)
- Required: `id` (tool), `assistant_id` -- binds a tool to an assistant

### createChatCompletion (scope `chat:create`)
- Required: `assistant_id`, `conversation_id`
- Optional: `additional_instructions` -- drives an assistant reply on an existing conversation

### createAssistant (scope `assistants:create`)
- Required: `name`
- `assistant_type` enum: `STANDARD` (prompt-driven, default), `FLOW_BUILDER` (node/flow driven)
- `model` enum includes (2026): `KIMI_K2_5` (default), `GPT_5_4`/`GPT_5_2`/`GPT_5_1`/`GPT_5`/`GPT_5_MINI`/`GPT_5_NANO`, `GPT_4_1`*, `GPT_4O`*, `CLAUDE_4_1_OPUS`, `CLAUDE_4_SONNET`, `CLAUDE_3_7_SONNET`, `CLAUDE_HAIKU_4_5`, `GEMINI_2_5_FLASH`/`GEMINI_2_0_FLASH`*, `QWEN_3_235B_A22B`, `CUSTOM`
- `temperature` 0-2 (default 0), `voice_enabled` (default true), `voice_id`, `language` (BCP-47, default en), inbound/outbound greetings

### createCall (scope `calls:create`)
- Required: `assistant_id`, `to`; optional `contact_id`, `from`, `variables` (free-form), subaccount routing

### getConversation / listConversationMessages (scopes `conversations:read` / `messages:list`)
- Both take `id` + `X-Subaccount-Id`; the read side of the conversation/message store

## Annotations for weapon-forge

- This file is the SINGLE most authoritative source in the folder for the Assistable side of the contract. Build the "Assistable API surface" guide primarily from here, not from the public web (the public web has almost no Assistable-specific documentation -- see the per-source notes).
- The `X-Subaccount-Id` header + `subaccount_id`/`location_id` body alias pattern is the live-API confirmation of the brief's directive: when PARSING an inbound webhook, `contact_id`/`location_id` are under `body.metadata` AND headers; when CALLING Assistable back, you supply the subaccount via the `X-Subaccount-Id` header (preferred) or the body alias. Document both directions.
- The `TOOL_CALL` / `TOOL_RESULT` message types plus `createTool`'s `parameters` + `url` + `http_method` define the tool-call loop. A tool the agent calls is registered with a JSON-Schema `parameters` block; at runtime Assistable POSTs the args (the `body.args`) to the tool's `url`. The Guardian's handler reads `body.args`, executes, and returns the tool-response shape.
- `tool_type: CUSTOM` is the voice path (URL tool); `FUNCTION` is the chat/SMS path. For the SMS agent, FUNCTION tools are the relevant type.
- NOTE the legacy alias: Assistable still accepts `location_id` as a body field but documents `subaccount_id` (and the `X-Subaccount-Id` header) as preferred. Flag this so the weapon does not hardcode only `location_id`.
- Do NOT instruct callers to invoke the mutating MCP tools (`create*`, `update*`, `delete*`, `archive*`) against a live account during normal weapon use without explicit operator intent -- this Guardian validates and wires, it does not casually mutate a live SMS account.
