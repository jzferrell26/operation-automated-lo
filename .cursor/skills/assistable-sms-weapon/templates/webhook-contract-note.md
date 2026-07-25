# Webhook / Tool Contract Note: {{subject}}

A short note documenting a parse/validate decision or a contract clarification. See `guides/01-parse-webhook.md` and `guides/02-validate-webhook.md`.

- **Date:** {{YYYY-MM-DD}}
- **Context:** {{inbound webhook debug | new tool contract | audit | other}}
- **GHL location / subaccount:** {{location_id}}

## Payload locations confirmed

| Field | Contract location | Present in this payload? |
|---|---|---|
| tool args | `body.args` | {{yes/no}} |
| contact_id | `body.metadata.contact_id` + headers | {{yes/no/header-only/metadata-only}} |
| location_id | `body.metadata.location_id` + headers (`X-Subaccount-Id`) | {{yes/no/...}} |

## Validation

- **auth/signature:** {{scheme + result}}  > TODO: open question - exact Assistable scheme from cuantico-sms repo if unknown
- **shape:** {{passed/failed + which check}}

## Finding

{{what was wrong or confirmed; e.g. handler read a non-contract key, ids recoverable from headers, fail-loud guard missing}}

## Action / routing

- {{fix applied}}
- {{routed to: gohighlevel-guardian / n8n-workflow-guardian / typescript-node-guardian / ...}}

## Open items

- {{any TODO: open question or TODO: re-fetch surfaced}}
