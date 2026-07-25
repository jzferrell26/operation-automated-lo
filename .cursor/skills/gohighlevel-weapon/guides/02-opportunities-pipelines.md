# 02 — Opportunities & pipelines

## Pipelines
```
GET /opportunities/pipelines?locationId=<loc>
→ { pipelines: [ { id, name, stages: [ { id, name } ] } ] }
```
Build a `stageId → stageName` map from this. The dashboard canonicalizes stage names (New Lead /
Contacted / Offer Sent / Under Contract / Closed, plus legacy Marketing); a deal whose GHL
opportunity `status` is `won` is always **Closed** regardless of stage. To write a stage back you
must reverse-map a canonical name to the pipeline's `stageId` (see `04-write-back-and-create.md`).

## Searching opportunities (paginated)
```
GET /opportunities/search?location_id=<loc>&pipeline_id=<pid>&limit=100
    &startAfter=<meta.startAfter>&startAfterId=<meta.startAfterId>
→ { opportunities: [ … ], meta: { startAfter, startAfterId, nextPageUrl } }
```
- `limit` max 100. Page until a batch returns `< 100` or `meta.startAfterId` is absent.
- Filter by `pipeline_id` to avoid pulling unrelated pipelines.
- Each opportunity carries `id`, `name`, `pipelineStageId`, `status`, `monetaryValue`,
  `createdAt`/`updatedAt`, owner/assignedTo, and a `customFields[]` array.
- See `05-pagination-rate-limits.md` for the exact loop + 429 handling.

## Single opportunity
```
GET /opportunities/<id>   → { opportunity: { … } }
```
Used to authorize a per-deal action (resolve the current owner before allowing an agent to edit
or attach to it).

## Opportunity shape that matters here
- `pipelineStageId` → canonical stage (via the stage map).
- `status`: `open` / `won` / `lost` / `abandoned`. `won` ⇒ Closed.
- `monetaryValue` → `pipeline_value`.
- `customFields[]` → the `whetstone_*` fields (address, fees, agents, statuses). See
  `03-custom-fields-fieldkey.md`.
- owner / assignedTo → the acquisition agent fallback. See `06-owner-user-resolution.md`.

## Contacts vs opportunities
Deals are **opportunities**. A contact is the person; an opportunity is the deal in a pipeline.
The dashboard keys everything on the opportunity id. Contact custom fields are a *different*
namespace (`contact.*`) from opportunity custom fields (`opportunity.*`) — don't cross them.
