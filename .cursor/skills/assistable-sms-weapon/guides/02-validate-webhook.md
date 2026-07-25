# 02 - Validate the webhook before acting

ACTION 2 from the brief. Directive #2: an SMS tool handler is an unauthenticated-by-default external entry point. Validate auth/signature AND shape before any handler logic runs.

Source: `research/webhook-arch/2026-06-29-sms-agent-webhook-tool-calling-patterns.md` (HMAC verification is the industry-standard control) and the directive in the Command Brief.

## Two checks, in order

### 1. Authenticity (auth/signature)

Verify the request actually came from Assistable (or, post-migration, from GHL) and was not forged or replayed.

- The industry-standard mechanism is **HMAC signature verification**: the provider signs the raw request body with a shared secret and sends the signature in a header; you recompute and compare with a timing-safe equality check.
- Use the **raw request body** for the HMAC computation, not a re-serialized parse (re-serialization changes bytes and breaks the signature).
- Reject on mismatch with a 401. Do not fall through.

> TODO: open question - needs human decision. The EXACT Assistable inbound-webhook signature/auth verification step (header name, signing algorithm, secret source) is NOT in the captured MCP schemas. The MCP is the API-client surface, not the inbound-webhook spec. Pull the verification detail from the private `cuantico-sms` repo (the operator/repo holds it), not the public web. See `research/research-summary.md` open question 4. Until confirmed, treat the signature step as a required-but-unspecified gate and ask the operator for the exact scheme before shipping handler code.

> TODO: re-fetch. For the GHL side of the migration, the GHL inbound-webhook verification is separate from Assistable's and must be sourced from GHL's docs (see `06-ghl-send-and-cuantico-sms-refetch.md`).

### 2. Shape (schema validation)

Confirm the payload has the structure the handler expects BEFORE you read fields out of it.

- The required envelope: `body.args` present (object), and `contact_id` / `location_id` resolvable from `body.metadata` or headers (see `01-parse-webhook.md`).
- Validate `body.args` against the tool's declared `parameters` JSON Schema (the same schema registered via `createTool`; see `03-tool-call-wiring.md`).
- A boundary validator (e.g. zod in the cuantico-sms TS engine) is the right tool here; that mechanic is typescript-node-guardian's territory, but the REQUIREMENT to validate at this boundary is yours.

## Why order matters

Authenticity before shape: do not spend parsing/validation effort on a payload that is not even from Assistable, and never let an unauthenticated caller probe your schema errors. Shape before handler logic: a handler that runs on a malformed payload is the silent-failure path directive #1 warns about.

## Secrets

The signing secret, Assistable key, and any GHL token used in verification are env-only (directive #5). Never log the raw signature header alongside the computed value in a way that leaks the secret, and never commit the secret.

## Worked example

`examples/01-wire-tool-happy-path.md` runs this validation gate (auth then shape) ahead of the tool execution.
