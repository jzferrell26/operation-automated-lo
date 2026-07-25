# 01 - Parse the inbound Assistable webhook

ACTION 1 from the brief. This is the single most important guide in the Weapon, because getting the payload locations wrong is the classic Assistable bug that fails silently.

Source of truth: `research/cuantico-internal/2026-06-29-assistable-payload-contract-and-cuantico-sms.md` (the verbatim contract) and `research/assistableai-mcp-schemas.md` (the live MCP corroboration).

## The contract (hardcode this)

When Assistable POSTs an inbound webhook to your tool endpoint:

| Field | Where it lives | Notes |
|---|---|---|
| Tool arguments | `body.args` | The JSON-Schema-described `parameters` the agent filled in. Never `body.data`, never `body.params`, never top-level. |
| `contact_id` | `body.metadata.contact_id` AND request headers | Duplicated. Read from `body.metadata`, cross-check the header. |
| `location_id` | `body.metadata.location_id` AND request headers | Duplicated. The MCP surface mirrors this with the `X-Subaccount-Id` header plus a `subaccount_id` (preferred) / `location_id` (legacy alias) body field. |

Never look anywhere else. The whole reason this is a directive is that the failure mode is silent: a parser that reads the wrong key gets `undefined`, the handler runs with empty inputs, and the SMS agent simply gives a wrong answer with no thrown error.

## Procedure

1. **Read `body.args`** for the tool arguments. Treat it as untrusted external JSON: validate its shape against the tool's declared `parameters` JSON Schema (see `03-tool-call-wiring.md`) before use.
2. **Resolve `contact_id`** from `body.metadata.contact_id`. Cross-check against the corresponding request header. If they disagree, prefer `body.metadata` but log a (non-secret) warning, because a mismatch signals a malformed or spoofed payload.
3. **Resolve `location_id`** the same way: `body.metadata.location_id`, cross-checked against the header (the `X-Subaccount-Id` equivalent). Accept the `subaccount_id` body alias if present (it is the MCP-preferred name).
4. **Fail loudly on absence.** If `contact_id` or `location_id` is absent from BOTH `body.metadata` AND the headers, reject the request (4xx) with a clear error. Do NOT default, guess, or proceed. The point of the directive is to convert the silent failure into a loud one. See `examples/02-webhook-parse-failure-edge-case.md`.
5. **Do this AFTER validation.** Parsing presupposes the request is authentic. Run `02-validate-webhook.md` first; never act on an unverified payload.

## The both-directions rule

The header-AND-body duplication runs both ways:

- **Parsing inbound** (this guide): read `contact_id`/`location_id` from `body.metadata`, cross-check the headers.
- **Calling Assistable back** (e.g. `createMessage`, `getConversation` via the MCP/API): supply the subaccount via the `X-Subaccount-Id` header (preferred) OR the `subaccount_id`/`location_id` body alias.

Do not hardcode only `location_id`. The MCP documents `subaccount_id` and the header as preferred, with `location_id` retained as a legacy alias (`research/assistableai-mcp-schemas.md`).

## Do not casually mutate

When inspecting Assistable via the live MCP, use read-only tools (`getTool`, `listTools`, `getConversation`, `listConversationMessages`). Do NOT invoke mutating tools (`create*`, `update*`, `delete*`, `archive*`) against a live SMS account without explicit operator intent. This Guardian validates and wires; it does not casually mutate a live channel.

## Worked example

`examples/02-webhook-parse-failure-edge-case.md` shows a payload that put `contact_id` only in the header (not `body.metadata`) and how the fail-loudly guard surfaces it instead of silently dropping it.
