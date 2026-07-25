# 03 — Custom fields & fieldKey resolution (the trickiest part)

This is where most GHL bugs in this repo come from. Read carefully.

## How a custom field arrives on an opportunity
The `customFields[]` array entries come in two shapes, sometimes both, sometimes only one:

```jsonc
// Shape A — inline key (easy):
{ "key": "opportunity.whetstone_final_approved_fee", "fieldValue": "31500" }
// Shape B — id only (needs resolution):
{ "id": "abCdEf123", "fieldValue": "31500" }
```
Values may land under any of `value` / `fieldValue` / `fieldValueString` / `fieldValueNumber`.
Read all four (first non-null wins).

## Resolving id-only fields
Fetch the location's opportunity field definitions and build an `id → fieldKey` map:
```
GET /locations/<locationId>/customFields?model=opportunity
→ { customFields: [ { id, fieldKey, name, dataType, … } ] }
```
Then for each `customFields[]` entry: prefer the inline `key`/`fieldKey`; else look up `id` in
the map. **Strip the prefix** (`opportunity.` / `contact.`) and lowercase before comparing to a
`whetstone_*` key.

```
stripFieldKeyPrefix("opportunity.whetstone_sales_agent") === "whetstone_sales_agent"
```

## The `whetstone_*` field set (this repo)
The dashboard reads these opportunity custom fields (must exist in GHL with these exact keys):

`whetstone_address`, `whetstone_transaction_type`, `whetstone_backside_buyer`,
`whetstone_acquiring_agent`, `whetstone_sales_agent`, `whetstone_buyer_agent`,
`whetstone_title_company`, `whetstone_buy_title_company`, `whetstone_sell_title_company`,
`whetstone_emd_status`, `whetstone_wire_status`, `whetstone_close_date`,
`whetstone_offers_sent`, `whetstone_buyers_contacted`, `whetstone_estimated_fee`,
`whetstone_final_approved_fee`, `whetstone_loan_fee`, `whetstone_loan_fee_agent`,
`whetstone_payment_method`, `whetstone_lender_name`, `whetstone_appraisal_status`,
`whetstone_survey_status`, `whetstone_loan_docs_status`.

## "My field is blank in the dashboard" — triage
1. **Does the GHL custom field exist with exactly that key?** A different key (e.g.
   `whetstone_sales_agent_name`) → blank. Confirm in GHL → Custom Fields (Opportunity model).
2. **Is it populated on the opportunity?** Empty in GHL → blank in the dashboard (expected;
   this is data entry, not a bug).
3. **Is it id-only with no definitions fetch?** Then the id→key map is missing → resolve via the
   customFields endpoint.
4. **Lockstep:** if you add/rename a key, update it in **all three** transform runtimes (see
   `07-this-repo-integration.md`) or CI fails.

## Writing a custom field
On update (`PUT /opportunities/:id`) send:
```jsonc
"customFields": [ { "id": "<fieldId>", "field_value": "31500" } ]
// or, when you only have the key:
"customFields": [ { "key": "opportunity.whetstone_final_approved_fee", "field_value": "31500" } ]
```
Prefer `id` (resolve it from the definitions map); fall back to `key`. See
`templates/custom-field-update.json` and `04-write-back-and-create.md`.
