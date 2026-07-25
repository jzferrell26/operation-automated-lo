# 03 - Wire or audit the tool call

ACTION 3 from the brief. Map the tool name + `body.args` to a handler, execute, and return the Assistable tool-response shape.

Source: `research/assistableai-mcp-schemas.md` (the authoritative Assistable tool-call surface) and `research/webhook-arch/2026-06-29-sms-agent-webhook-tool-calling-patterns.md` (the generic tool-call loop this specializes).

## The tool-call loop

The canonical loop (generic, then specialized to Assistable):

1. Inbound SMS arrives; Assistable's assistant decides it needs a tool.
2. Assistable POSTs to the tool's registered `url` using its `http_method`, carrying the agent-filled arguments in `body.args`.
3. Your handler validates (`02`), parses (`01`), executes, and returns a tool-response.
4. Assistable folds the result back into the conversation and replies to the contact.

## Tool definition fields (from `createTool`)

A tool the agent can call is registered with these fields (see `research/assistableai-mcp-schemas.md`):

| Field | Meaning |
|---|---|
| `name` | The tool name the agent invokes. Required. |
| `tool_type` | `FUNCTION` (chat/SMS, default), `CUSTOM` (voice/URL tool), or builtins `END_CALL` / `PRESS_DIGIT` / `TRANSFER_CALL`. For the SMS agent, use **FUNCTION**. |
| `parameters` | A JSON-Schema object describing the tool's arguments. This is the schema the runtime `body.args` must satisfy. |
| `required_params` | Array of required parameter names. |
| `url` | Your handler endpoint (where Assistable POSTs the args). |
| `http_method` | The verb Assistable uses to hit your endpoint (`POST` default; also `GET`/`PUT`/`PATCH`/`DELETE`). |
| `headers` | Free-form custom headers Assistable sends to your endpoint. |

`tool_type: CUSTOM` is the voice path and is out of scope here (route voice to voice-ai-telephony-guardian). For SMS, you wire `FUNCTION` tools.

## Message types: the tool-call shape

`createMessage` exposes a `type` enum that includes `TOOL_CALL`, `TOOL_RESULT`, `FUNCTION_CALL`, and `FUNCTION_RESULT` (alongside `TEXT`, `IMAGE`, etc.). These are the Assistable-side shape of the request/response loop:

- The agent's invocation surfaces as a `TOOL_CALL` (or `FUNCTION_CALL`).
- Your handler's answer is the `TOOL_RESULT` (or `FUNCTION_RESULT`) shape the agent expects folded back.

When you return from the handler, return the tool-response in the shape the agent consumes. Do not return a bare string where a structured result is expected; the agent uses the result to compose its SMS reply.

## Procedure to wire a new tool

1. **Define the contract first.** Decide the tool `name`, the `parameters` JSON Schema (and `required_params`), the handler `url`, and the `http_method`. Fill `templates/tool-handler-spec.md`.
2. **Register the tool** via `createTool` (FUNCTION) and **bind it** to the assistant via `assignTool` (`id` + `assistant_id`). Treat these as mutating; only run against a live account with explicit operator intent (see `01-parse-webhook.md`, do-not-casually-mutate).
3. **Author the handler.** It must: validate auth + shape (`02`), parse `body.args` and resolve `contact_id`/`location_id` (`01`), execute, and return the TOOL_RESULT shape.
4. **Route any side effects.** If the handler needs to write a GHL contact/field, that write goes through gohighlevel-guardian's contract; if it triggers an n8n flow, that is n8n-workflow-guardian's. You wire the call; the owning Guardian owns the write. See `04-routing-boundaries.md`.
5. **Audit an existing tool** the same way in reverse: confirm the registered `parameters` match what the handler reads from `body.args`, confirm validation runs first, and confirm the return shape is a proper TOOL_RESULT.

## Auditing checklist

- Does the handler read arguments from `body.args` (not a wrong key)?
- Does it validate auth + shape before executing?
- Does the registered `parameters` schema match the handler's actual argument use?
- Does it return the TOOL_RESULT shape, not a bare/ad-hoc payload?
- Are `contact_id` / `location_id` resolved from `body.metadata` with header cross-check?
- Are all secrets env-only?

## Worked example

`examples/01-wire-tool-happy-path.md` wires a `book_appointment` FUNCTION tool end to end and shows the TOOL_RESULT return.
