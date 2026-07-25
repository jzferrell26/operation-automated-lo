# Example 01 - Wire a tool (happy path)

Demonstrates: `guides/01-parse-webhook.md`, `guides/02-validate-webhook.md`, `guides/03-tool-call-wiring.md`, `guides/04-routing-boundaries.md`. Exercises directives 1, 2, 3, 5.

## Input (what the Guardian receives)

> Operator: "Add a `book_appointment` tool to the SMS assistant. When a contact texts asking to book, the agent should call it with the requested date and write the appointment back to GHL. Here is the inbound webhook Assistable will POST to the handler."

```http
POST /api/assistable/tools/book_appointment
X-Subaccount-Id: 4265S6wFm5AItXAJocih
X-Assistable-Signature: t=1719660000,v1=9f86d081...
Content-Type: application/json

{
  "args": { "requested_date": "2026-07-15", "service": "consult" },
  "metadata": {
    "contact_id": "cVN8aZ2pQ1",
    "location_id": "4265S6wFm5AItXAJocih"
  }
}
```

## Output (what the Guardian produces)

### 1. Tool definition (FUNCTION)

Per `guides/03`, register a FUNCTION tool:

- `name`: `book_appointment`
- `tool_type`: `FUNCTION`
- `url`: `https://sms.cuantico.app/api/assistable/tools/book_appointment`
- `http_method`: `POST`
- `parameters` (JSON Schema):

```json
{
  "type": "object",
  "properties": {
    "requested_date": { "type": "string", "format": "date" },
    "service": { "type": "string" }
  },
  "required": ["requested_date"]
}
```

- `required_params`: `["requested_date"]`

Bind it with `assignTool` (`id` + `assistant_id`). These are mutating calls; run only with operator intent.

### 2. Handler (order: validate, parse, execute, return)

```
1. VALIDATE (guide 02):
   - Recompute HMAC over the RAW body with the env signing secret; timing-safe compare
     against X-Assistable-Signature. Reject 401 on mismatch.
     > TODO: open question - confirm the exact Assistable signature scheme from the
     > cuantico-sms repo; the header name/algorithm shown here is illustrative.
   - Validate body.args against the book_appointment parameters schema. Reject 400 on shape error.

2. PARSE (guide 01):
   - args        = body.args                    -> { requested_date, service }
   - contact_id  = body.metadata.contact_id     -> "cVN8aZ2pQ1"  (cross-check X- header if present)
   - location_id = body.metadata.location_id    -> "4265S6wFm5AItXAJocih" (matches X-Subaccount-Id)
   - If contact_id/location_id absent from BOTH metadata AND headers: reject 4xx (fail loud).

3. EXECUTE:
   - Resolve availability, create the appointment.
   - The GHL contact/field WRITE (e.g. set custom field appointment_date) is ROUTED to
     gohighlevel-guardian (guide 04): this handler passes the resolved date; gohighlevel-guardian
     owns the field key and the DATE no-Z write rule.

4. RETURN the TOOL_RESULT shape:
   { "success": true, "result": { "booked_date": "2026-07-15", "confirmation": "APT-10293" } }
```

### 3. Routing note returned to the operator

"Tool `book_appointment` wired as a FUNCTION tool with validation-before-execution. The GHL custom-field write for `appointment_date` is routed to gohighlevel-guardian (field key + DATE rule). Secrets (signing key, GHL sub-account token) are env-only. The exact Assistable signature scheme is an open TODO to confirm from the cuantico-sms repo."

## Why this is the happy path

Every field was where the contract says it is, both validation checks passed, the side-effecting write was routed instead of absorbed, and the return used the TOOL_RESULT shape. Contrast with `examples/02-webhook-parse-failure-edge-case.md`.
