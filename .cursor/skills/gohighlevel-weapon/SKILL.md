---
name: gohighlevel-weapon
description: GoHighLevel / LeadConnector V2 API specialist -- opportunities, contacts, pipelines, custom-field fieldKey resolution, OAuth 2.0 vs Private Integration Token, the agency/sub-account (location) model, pagination, rate limits, webhooks, and write-back/create correctness. Use when the user says "GHL custom field mapping", "resolve a fieldKey", "create an opportunity in GHL", "GHL pagination / rate limit", "LeadConnector OAuth vs location token", "GHL webhook", "why is my GHL write-back 400ing", or "opportunity vs contact custom fields". Do NOT use for generic multi-CRM sync (crm-integration-guardian), secret handling / token-in-bundle (security-guardian), Edge-Function deploy plumbing (devops-guardian), or the Deal[] schema / React layer (react-guardian).
---

# gohighlevel-weapon

GoHighLevel (LeadConnector) V2 REST API playbook for `gohighlevel-guardian`. Forged for the
**Whetstone Capital Group Studio**, whose entire deal dashboard is a GHL integration: the
`deals` Edge Function reads GHL pipelines + opportunities, resolves custom-field `fieldKey`s,
transforms to `Deal[]`, and writes edits back into GHL custom fields. GHL is the **system of
record for deals**.

Research window: facts current as of June 2026 (GHL V1 API reached end-of-support
**2025-12-31** — V2 only).

---

## When this weapon applies

Load when any of the following are true:

- A change touches the GHL → `Deal[]` transform, the `deals`/`deal-state`/`property-listings`
  Edge Functions' GHL calls, or the n8n GHL code node.
- The user needs to resolve a custom-field **id ↔ `fieldKey`**, add a new `whetstone_*` field,
  or debug a field coming back blank.
- The user wants to **create** a GHL opportunity (e.g. "log the property" for the marketing
  publish flow) — a capability this repo does not yet have.
- A GHL call is **400/401/422/429**-ing, paginating wrong, or hitting rate limits.
- Owner/agent resolution is wrong (opaque user id showing instead of a name).
- Choosing between **OAuth 2.0** (Marketplace app) and a **Private Integration Token** (PIT).
- Designing or debugging a GHL **webhook**.

Do NOT load for:

- Generic multi-CRM sync taxonomy (HubSpot/Salesforce/etc.) → `crm-integration-guardian`.
- GHL token secrecy / "is the token in the client bundle?" → `security-guardian`.
- Edge-Function deploy/secrets plumbing on Lovable → `devops-guardian`.
- The `Deal` TypeScript schema, React data layer, or drawer UI → `react-guardian`.
- The local Postgres schema (`deal_state`, `property_listings`) → `db-guardian`.

---

## Critical directives

Full justification in `guides/00-principles.md`.

- **GHL is the system of record for deals; never invent a second one.** Edits write back to
  GHL; local stores (`deal_state`) are durability overlays, not the truth.
- **The GHL → `Deal[]` transform is in lockstep across THREE runtimes** — `src/lib/ghlTransform.ts`,
  `supabase/functions/deals/index.ts`, and the n8n Code node. Change one, change all three, or
  CI parity tests fail. This is the #1 footgun in this repo.
- **Always send the `Version: 2021-07-28` header.** Missing it is a silent source of 4xx.
- **Resolve custom fields by `fieldKey`, not by position.** Fields arrive as `id`-only OR with
  an inline `fieldKey`; map ids via `GET /locations/:id/customFields?model=opportunity`.
- **Never surface a raw opaque GHL user id to a human.** Resolve to a name via the users
  endpoint, or fall back to the opportunity owner — never print the 20-char id.
- **Respect the rate limit (100 req / 10s burst, 200k/day per app/resource).** Paginate, don't
  fan out; back off on `429` using the response headers.
- **A failed write-back must not silently lose the edit.** Persist first (`deal-state`), then
  attempt GHL; surface failures.

---

## Routing table

| Request type | First guide | Template |
|---|---|---|
| "Pick OAuth vs Private Integration Token" | `guides/01-auth-tokens.md` | — |
| "Read opportunities / pipelines / paginate" | `guides/02-opportunities-pipelines.md` | — |
| "Custom field is blank / map a fieldKey / add a field" | `guides/03-custom-fields-fieldkey.md` | `templates/custom-field-update.json` |
| "Write back an edit / create an opportunity" | `guides/04-write-back-and-create.md` | `templates/opportunity-create-payload.json` |
| "Rate limit / 429 / pagination is wrong" | `guides/05-pagination-rate-limits.md` | — |
| "Owner/agent shows an id, not a name" | `guides/06-owner-user-resolution.md` | — |
| "How does this repo wire GHL?" | `guides/07-this-repo-integration.md` | — |

---

## Folder layout

```
gohighlevel-weapon/
├─ SKILL.md                              (this file)
├─ README.md                            (one-page overview)
├─ guides/
│  ├─ 00-principles.md                  (the non-negotiables)
│  ├─ 01-auth-tokens.md                 (OAuth 2.0 vs Private Integration Token; the Version header)
│  ├─ 02-opportunities-pipelines.md     (search, pagination, pipelines, stages)
│  ├─ 03-custom-fields-fieldkey.md      (id↔fieldKey resolution — the trickiest part)
│  ├─ 04-write-back-and-create.md       (PUT update + POST create opportunity)
│  ├─ 05-pagination-rate-limits.md      (startAfter/startAfterId; 429 backoff)
│  ├─ 06-owner-user-resolution.md       (opaque id → name; owner fallback)
│  └─ 07-this-repo-integration.md       (the 3-runtime lockstep; where GHL lives in this repo)
├─ templates/
│  ├─ opportunity-create-payload.json
│  └─ custom-field-update.json
├─ reports/README.md
└─ research/research-summary.md
```

---

*Forged via the Guild AI Tools Factory for the Whetstone studio. Part of the Guild curated by [Mario Aldayuz a.k.a @thenotoriousllama](https://github.com/thenotoriousllama).*
