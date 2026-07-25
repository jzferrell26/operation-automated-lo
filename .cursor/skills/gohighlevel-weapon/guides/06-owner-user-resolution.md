# 06 — Owner / user resolution

The acquisition agent and other people-fields can be a **name** or an **opaque GHL user id**.
Never render the raw id.

## The users map
```
GET /users/?locationId=<loc>
→ { users: [ { id, name | firstName+lastName, email, … } ] }
```
Build `userId → displayName` once, reuse it for every opportunity (don't fetch per deal).

## Where an agent value can come from (precedence)
For `acquiring_agent`, the transform resolves in this order:
1. The `whetstone_acquiring_agent` custom field, if populated:
   - plain name → use it,
   - opaque id → resolve via the users map.
2. Fall back to the opportunity's **native owner / assignedTo** (resolve its id via the users
   map, or read the inline owner name object).
3. If still unresolved → empty string. **Never** surface the raw id.

`sales_agent`, `buyer_agent`, `loan_fee_agent` come only from their custom fields (with the same
opaque-id resolution); they do **not** fall back to the owner.

## Detecting an opaque id
Heuristic used in the repo: a value matching `^[A-Za-z0-9_-]{16,}$` with no whitespace is treated
as an opaque id (resolve or blank it), otherwise it's a plain name.

## Why this matters for authorization
The whole per-deal auth model (deals fee redaction, document/listing ownership) matches the
caller's `app_metadata.agent_name` / `ghl_user_id` against the opportunity's resolved owner.
Garbage-in (an unresolved id where a name should be) breaks ownership matching. Prefer matching
on the **GHL user id** when both sides have it; fall back to name. This is the documented
hardening path — push agents to carry `app_metadata.ghl_user_id`.

## "An agent name is wrong / showing an id" — triage
1. Is the users map being fetched? (Without it, ids can't resolve.)
2. Is `whetstone_acquiring_agent` storing an id with no matching user in the location?
3. Did the agent get renamed in GHL but the custom field still holds the old string?
