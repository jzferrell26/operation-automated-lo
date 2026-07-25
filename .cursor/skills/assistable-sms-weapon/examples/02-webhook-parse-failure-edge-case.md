# Example 02 - Webhook parse failure (edge case)

Demonstrates: `guides/01-parse-webhook.md` (the silent-failure trap and the fail-loudly guard) and `guides/00-principles.md` directive 1. This is the bug the whole Weapon exists to prevent.

## Input (what the Guardian receives)

> Operator: "The SMS agent keeps replying as if it does not know which contact it is talking to, but it does not throw any error. Here is a sample inbound webhook. What is wrong?"

```http
POST /api/assistable/tools/lookup_contact
X-Subaccount-Id: 4265S6wFm5AItXAJocih
X-Contact-Id: cVN8aZ2pQ1
Content-Type: application/json

{
  "args": { "field": "last_order_status" },
  "data": {
    "contactId": "cVN8aZ2pQ1",
    "locationId": "4265S6wFm5AItXAJocih"
  }
}
```

## Diagnosis (what the Guardian produces)

The payload puts the identifiers under `body.data.contactId` / `body.data.locationId` (camelCase, wrong key), but the contract says they live under `body.metadata.contact_id` / `body.metadata.location_id`. A handler that reads `body.metadata.contact_id` gets `undefined`. Because nothing throws, the agent runs the lookup with an empty contact and silently returns a wrong/empty answer. This is the classic Assistable bug from directive 1: it fails SILENTLY.

Two problems:

1. **Wrong location read** (if the handler trusted `body.data`): the handler is reading a non-contract key. Even though this specific payload happens to carry the ids under `body.data`, the contract source of truth is `body.metadata` + headers. A handler must read the contract locations.
2. **No fail-loud guard**: the handler did not reject when `body.metadata.contact_id` was absent, so the failure was invisible.

## Fix (apply guide 01 step 4)

```
resolve contact_id:
  from body.metadata.contact_id   -> undefined
  fallback to header X-Contact-Id  -> "cVN8aZ2pQ1"   (present!)

resolve location_id:
  from body.metadata.location_id  -> undefined
  fallback to header X-Subaccount-Id -> "4265S6wFm5AItXAJocih" (present!)
```

Because the contract says the ids live in `body.metadata` AND the headers, the header cross-check rescues this request: the handler resolves both ids from the headers. But it must also LOG a warning that `body.metadata` was missing the ids (a malformed payload signal), and if BOTH metadata and headers had been empty, it must reject with a 4xx instead of proceeding.

## Output note returned to the operator

"Root cause: the handler relied on `body.data.*`, which is not the contract location. The contract is `body.args` for arguments and `body.metadata.contact_id` / `body.metadata.location_id` (with the request headers as the duplicate). Fix: read the contract keys, cross-check the headers, and FAIL LOUD (4xx) when both are empty so this stops being a silent wrong-answer bug. This payload's ids were recoverable from the headers; a future one may not be."

## Why this is the instructive edge case

It is the exact failure directive 1 warns about: undefined inputs, no thrown error, wrong agent behavior. The fail-loudly guard converts a silent wrong answer into a visible rejection.
