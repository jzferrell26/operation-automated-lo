# 04 — Write-back & create

## Update (write-back) — `PUT /opportunities/:id`
The dashboard maps a whitelisted patch onto GHL custom fields and the native pipeline stage.

Body shape:
```jsonc
{
  "pipelineStageId": "<stageId>",        // only when stage changed
  "status": "won",                        // when canonical stage === "Closed"; else "open"
  "customFields": [
    { "id": "<fieldId>", "field_value": "31500" },
    { "key": "opportunity.whetstone_sales_agent", "field_value": "Carolina Ceja" }
  ]
}
```
Rules:
- **Whitelist the patch keys.** Only fields the dashboard owns
  (`CUSTOM_FIELD_KEY_BY_PATCH_KEY` + `stage`) are writable. Drop unknown keys server-side.
- **Stage → stageId:** reverse-map the canonical stage name to the pipeline's `stageId` by
  canonicalizing each stage's name and matching. `Closed` also sets `status: "won"`.
- **Serialize values to strings** for `field_value` (numbers, dates as ISO).
- Prefer `id` over `key` (resolve the id from the custom-field definitions map).
- On success GHL returns the updated `opportunity`; re-transform it so the UI reflects truth.

## Create — `POST /opportunities`
Not yet implemented in this repo, but needed for the marketing **publish** flow ("log the
property if it isn't logged yet"). Shape:
```jsonc
{
  "locationId": "<loc>",
  "pipelineId": "<pid>",
  "pipelineStageId": "<stageId>",      // e.g. the "New Lead" stage
  "name": "123 Main St, Dallas TX",     // opportunity name
  "status": "open",
  "contactId": "<contactId>",           // associate to a contact (create the contact first if needed)
  "customFields": [
    { "key": "opportunity.whetstone_address", "field_value": "123 Main St, Dallas TX" }
    // …seed any known whetstone_* fields
  ]
}
→ { opportunity: { id, … } }
```
Notes:
- An opportunity usually wants a **contact**. If there's no contact, create one first
  (`POST /contacts`) and pass its `contactId`. Decide the de-dup rule (match by address /
  contact) so generating a contract for the same property twice doesn't create two deals.
- Seed the `whetstone_*` custom fields you already know so the new deal shows up complete.
- After create, the returned `opportunity.id` becomes the `deal_id` everything else keys on
  (documents, deal-state, property-listings).
- See `templates/opportunity-create-payload.json`.

## Idempotency / safety
- Wrap writes so a `429` backs off and retries (see `05-pagination-rate-limits.md`).
- Never echo raw GHL error bodies to the browser — log server-side, return a generic error
  (this matches the repo's hardened error handling).
- A failed write-back must leave the edit durably persisted (`deal-state`) and retryable.
