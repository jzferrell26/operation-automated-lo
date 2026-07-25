# Routing guide: `gohighlevel-guardian`

## Domain
GoHighLevel (LeadConnector) **V2 API** integration for this repo's deal dashboard — GHL is the
system of record for deals. Owns: auth (OAuth 2.0 vs Private Integration Token), reading
opportunities/pipelines/contacts, custom-field **id↔fieldKey** resolution, owner/user
resolution, pagination + rate limits, webhooks, write-back (`PUT /opportunities/:id`),
create (`POST /opportunities`), and the **three-runtime transform-lockstep** invariant.

## Trigger phrases (route here)
- "GHL custom field mapping", "resolve a fieldKey", "my GHL field shows blank"
- "create an opportunity in GHL", "log the property in GHL"
- "GHL pagination", "GHL rate limit / 429", "GHL write-back is 400ing / 422ing"
- "OAuth vs Private Integration Token", "LeadConnector token", "Version header"
- "owner shows an id not a name", "resolve GHL user ids"
- "GHL webhook", "opportunity vs contact custom fields"
- Any change touching `ghlTransform.ts`, the `deals`/`deal-state`/`property-listings` Edge
  Functions' GHL calls, or the n8n GHL Code node.

## Inputs the Guardian needs
- Which GHL call / file is involved (or the failing request + status code).
- The `location_id` / pipeline context if relevant.
- For custom-field issues: the field's intended `fieldKey` (the `whetstone_*` name).

## Outputs
- A correct GHL request/response design, a fieldKey resolution, a write-back/create payload, or a
  rate-limit-safe read loop — plus the lockstep checklist when the transform is touched.

## Do NOT route here
- Generic multi-CRM connectivity/taxonomy (HubSpot, Salesforce, sync conflict patterns) →
  `crm-integration-guardian`.
- "Is the GHL token leaking into the bundle / rotation / PII in logs" → `security-guardian`.
- Where to set the GHL secret on Lovable / function deploy → `devops-guardian`.
- The `Deal` schema, React data layer, deal-drawer UI → `react-guardian`.
- `deal_state` / `property_listings` table design, migrations → `db-guardian`.

## Multi-Guardian note
On a schema-or-deploy-touching GHL change, sequence: `gohighlevel-guardian` (the GHL surface) →
`db-guardian` (any local table) → `security-guardian` → `quality-guardian`. The transform
lockstep + `npm run test` parity tests are the "is it done?" canary.

## Paired Weapon
`.claude/skills/gohighlevel-weapon/` (read `SKILL.md` first).
