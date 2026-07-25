# Research summary — gohighlevel-weapon

**Depth:** normal. **Window:** facts current as of June 2026. **Primary grounding:** this repo's
working GHL integration (`src/lib/ghlTransform.ts`, `supabase/functions/deals/index.ts`) plus the
official HighLevel V2 developer docs.

## Top sources
- HighLevel API Developer Portal — `https://marketplace.gohighlevel.com/docs/`
  (Opportunities create/update, OAuth 2.0, Private Integrations).
- HighLevel Support — "Private Integrations: everything you need to know".
- The repo's own self-contained, CI-verified transform + write-back implementation.

## Key findings
1. **V1 is end-of-support (2025-12-31).** V2 only. Base `https://services.leadconnectorhq.com`,
   mandatory `Version: 2021-07-28` header.
2. **Two auth modes:** Private Integration Token (right for this internal single-sub-account tool)
   vs OAuth 2.0 (Marketplace apps). This repo uses a token as `Bearer`.
3. **Rate limits:** 100 req / 10s burst and 200,000/day, per app per resource; rate-limit headers
   on responses; back off on 429.
4. **Custom fields** arrive id-only or with an inline `fieldKey`; resolve id→key via
   `GET /locations/:id/customFields?model=opportunity`. This is the repo's #1 bug source.
5. **Owner resolution:** opaque user ids must be resolved via `GET /users/?locationId=`; never
   surface the raw id. The per-deal auth model depends on clean owner resolution.
6. **Create opportunity** (`POST /opportunities`) exists but is unused here — it's the missing
   capability for the marketing "publish/log the property" flow.

## Open questions (verify against live docs before committing)
1. Exact `meta` cursor field names on `/opportunities/search` can drift — the repo handles both
   `startAfter`/`startAfterId` and `nextPageUrl`; verify on the target account.
2. Whether Private Integration Tokens carry a *different* rate-limit bucket than OAuth apps —
   design as if 100/10s is the ceiling regardless.
3. Contact-association requirements on `POST /opportunities` (whether `contactId` is strictly
   required) — confirm before building the create/publish flow.
