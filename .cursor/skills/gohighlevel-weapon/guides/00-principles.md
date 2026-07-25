# 00 — Principles (the non-negotiables)

These govern every GHL engagement in this repo. Violating one is how integrations silently rot.

## 1. GHL is the system of record for deals
The dashboard reads from GHL and writes edits back to GHL. Local Postgres stores (`deal_state`
overrides, `property_listings`) are **durability/overlay layers**, never a competing source of
truth. When GHL and a local store disagree, GHL wins on the next fetch. Design every write so
GHL receives it.

## 2. The transform is in lockstep across THREE runtimes
The GHL → `Deal[]` transform exists in:
- `src/lib/ghlTransform.ts` (the canonical TypeScript source),
- `supabase/functions/deals/index.ts` (the self-contained Edge Function copy),
- the Code node inside `n8n/whetstone-deal-dashboard-sync.json`.

CI parity tests (`src/test/edgeFunctionTransform.test.ts`, `src/test/n8nWorkflow.test.ts`)
assert all three produce byte-identical output over the sample fixtures. **Change one, change
all three in the same PR**, or the build fails. This is the single biggest footgun. See
`guides/07-this-repo-integration.md`.

> Authorization/redaction logic (owner-scoping, fee redaction) lives **outside** the shared
> transform — apply it in the handler, not in `transformOpportunity`, so parity holds.

## 3. Always send `Version: 2021-07-28`
The V2 API requires the date-versioned `Version` header on every request. Omitting it is a
quiet source of 4xx. Base URL is `https://services.leadconnectorhq.com`. V1 is end-of-support
(2025-12-31) — never reach for a V1 endpoint.

## 4. Custom fields are addressed by `fieldKey`, never by position
A field on an opportunity may arrive with an inline `key`/`fieldKey` (e.g.
`opportunity.whetstone_final_approved_fee`) **or** as an `id`-only entry. To read id-only
fields you must resolve the id→`fieldKey` map from
`GET /locations/:locationId/customFields?model=opportunity`. Never assume array order. See
`guides/03-custom-fields-fieldkey.md`.

## 5. Never surface a raw opaque GHL user id
Owner/assigned fields and some agent custom fields may hold a ~20-char opaque user id. Resolve
it to a display name via `GET /users/?locationId=`; if unresolved, fall back to the
opportunity's native owner name — but never render the raw id to a human. See
`guides/06-owner-user-resolution.md`.

## 6. Respect the rate limit; paginate, don't fan out
Public V2 (OAuth) limits: **100 requests / 10 seconds (burst)** and **200,000 / day**, per app
per resource. Page through opportunities sequentially (`startAfter` + `startAfterId`); never
issue one request per deal in a loop. Honor `429` + the rate-limit response headers with
backoff. See `guides/05-pagination-rate-limits.md`.

## 7. A failed write must not lose the edit
Write-back is `PUT /opportunities/:id`. The dashboard persists the override to `deal-state`
**before** attempting the GHL write, so a GHL failure leaves the edit durable and retryable —
never a silent loss, never a swallowed error.

## 8. Tokens are location-scoped and server-side only
GHL data is scoped to a sub-account (**location**). The token (`GHL_API_TOKEN`) lives only in
Edge Function secrets — never in a `VITE_*` var or the client bundle. Token secrecy review is
`security-guardian`'s call; this Guardian surfaces it and hands off.
