# 05 — Pagination & rate limits

## Rate limits (V2, OAuth)
- **Burst:** 100 requests / 10 seconds, per app per resource.
- **Daily:** 200,000 requests / day, per app per resource.
- Responses include rate-limit headers (remaining / reset) — read them, don't guess.
- On **429**, back off and retry (exponential: 1s, 2s, 4s…), honoring the reset hint. Never
  hot-loop a 429.

> Private Integration Tokens share the same V2 limits in practice — design as if 100/10s is the
> ceiling.

## The pagination loop (opportunities)
```
all = []
startAfter, startAfterId = undefined, undefined
for page in 0..MAX_PAGES (cap it — e.g. 50):
    params = { location_id, pipeline_id, limit: 100 }
    if startAfter:   params.startAfter   = startAfter
    if startAfterId: params.startAfterId = startAfterId
    res  = GET /opportunities/search?<params>
    batch = res.opportunities ?? res.items ?? []
    all.push(...batch)
    meta = res.meta ?? {}
    if batch.length < 100 or (!meta.startAfterId and !meta.nextPageUrl): break
    startAfter   = meta.startAfter ?? startAfter
    startAfterId = meta.startAfterId ?? startAfterId
    if !startAfterId: break
return all
```
- **Cap the page count** (`MAX_PAGES`) so a pathological response can't loop forever.
- Both `startAfter` (a timestamp/cursor) **and** `startAfterId` are needed — passing only one
  paginates wrong (duplicates or skips).
- Stop when a batch is short OR the cursor is gone.

## Don't fan out
The cardinal sin: one request **per deal** inside a loop (e.g. fetching each opportunity's owner
individually). Instead:
- Fetch the **users map once** (`GET /users/?locationId=`) and resolve all owners locally.
- Fetch the **custom-field definitions once** and reuse the id→key map for every opportunity.
- Batch reads; only hit single-opportunity GET when you genuinely need one (per-deal authz).

## Cost-aware design for this repo
The `deals` GET already does the right thing: pipelines + paginated opportunities + custom-field
defs + users, then transforms in memory. When adding a feature, reuse those fetched maps rather
than issuing new GHL calls per item.
