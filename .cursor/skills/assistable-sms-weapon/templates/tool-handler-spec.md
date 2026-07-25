# Tool Handler Spec: {{tool_name}}

Fill this before authoring or auditing a handler. See `guides/03-tool-call-wiring.md`.

## Tool definition (FUNCTION)

- **name:** {{tool_name}}
- **tool_type:** FUNCTION
- **url:** {{handler_endpoint_url}}
- **http_method:** {{POST|GET|PUT|PATCH|DELETE}}
- **parameters (JSON Schema):**

```json
{
  "type": "object",
  "properties": {
    "{{param_name}}": { "type": "{{type}}" }
  },
  "required": [ "{{required_param}}" ]
}
```

- **required_params:** [ {{...}} ]
- **assistant_id to bind (assignTool):** {{assistant_id}}

## Inbound contract resolution

- **args source:** `body.args` -> {{fields_read}}
- **contact_id:** `body.metadata.contact_id` (cross-check header {{header_name}})
- **location_id:** `body.metadata.location_id` (cross-check `X-Subaccount-Id`; accept `subaccount_id` alias)
- **fail-loud guard:** reject 4xx if contact_id/location_id absent from BOTH metadata and headers? [ ] yes

## Validation (run BEFORE execute)

- **auth/signature step:** {{scheme}}  > TODO: open question - confirm exact Assistable scheme from cuantico-sms repo if not yet known
- **shape validation:** validate `body.args` against the parameters schema above? [ ] yes

## Execution and side effects

- **what the handler does:** {{...}}
- **GHL write needed?** {{yes/no}} -> if yes, route field semantics to gohighlevel-guardian
- **n8n trigger needed?** {{yes/no}} -> if yes, route to n8n-workflow-guardian
- **persistence needed?** {{what}} -> schema to db-guardian, deploy to supabase-platform-guardian

## Return shape (TOOL_RESULT)

```json
{ "success": true, "result": { {{...}} } }
```

## Secrets used (env-only, never logged/committed)

- {{ASSISTABLE_SIGNING_SECRET}}, {{GHL_SUBACCOUNT_TOKEN}}, {{...}}
