# 07 — How GHL is wired into this repo

A map of every place GHL is touched, so a change lands in the right files (and all the lockstep
copies).

## The transform — THREE runtimes in lockstep
| Runtime | File | Role |
|---|---|---|
| Canonical TS | `src/lib/ghlTransform.ts` | The source of truth (`transformGhlPayload`, custom-field keys) |
| Edge Function | `supabase/functions/deals/index.ts` | Self-contained copy (no imports) — pasteable into Supabase |
| n8n | `n8n/whetstone-deal-dashboard-sync.json` (Code node) | Legacy backend, kept as fallback |

CI parity tests assert all three are byte-identical over the sample fixtures:
- `src/test/edgeFunctionTransform.test.ts` (Edge vs canonical),
- `src/test/n8nWorkflow.test.ts` (extracts + sandboxes the n8n Code node vs canonical).

**Rule:** any change to field keys, normalization, or output shape goes into all three in the
same PR, or the build fails. The one-time Monday→GHL migration has the same pattern
(`mondayTransform.ts` ↔ `n8nMondayWorkflow.test.ts`).

> Keep authorization out of the transform. Fee redaction and per-deal owner-scoping are applied
> in the handler **after** `transformGhlPayload`, so the parity tests stay green.

## The GHL-calling Edge Functions
| Function | GHL usage |
|---|---|
| `deals` | pipelines + paginated opportunities + custom-field defs + users → transform → `{ deals }`; `PATCH` writes back via `PUT /opportunities/:id` |
| `deal-documents` | resolves a deal's owner from `GET /opportunities/:id` (+ custom-field defs) to authorize photo/doc access |
| `deal-state` | resolves the owner from GHL on first write to denormalize ownership |
| `property-listings` | same owner resolution on first write |

All four read the GHL secrets (`GHL_API_TOKEN`, `GHL_LOCATION_ID`, optional `GHL_PIPELINE_ID`).
`deals` is self-contained (no imports); the other three use supabase-js + a small GHL fetch.

## Secrets
`GHL_API_TOKEN` (Bearer; `GHL_LOCATION_API_KEY` also accepted), `GHL_LOCATION_ID`,
`GHL_PIPELINE_ID` (filters the wholesale pipeline). Server-side only — never `VITE_*`.

## Production identifiers (treat as PRODUCTION — confirm before destructive work)
- GHL V2 base: `https://services.leadconnectorhq.com`, version `2021-07-28`.
- n8n legacy webhook: `https://n8n.voyze.ai/webhook/whetstone-deals`.
- Supabase: `https://hvfchmmkfxzrqgtvpyyq.supabase.co`.

## The not-yet-built capability
**Create opportunity** (`POST /opportunities`) — required for the marketing "publish" flow to
log a property that isn't a GHL deal yet. See `04-write-back-and-create.md`. When built, add it
to the write-back path with a de-dup rule (match by address/contact) and seed the `whetstone_*`
fields.

## Before touching GHL code, run the safety gate
Migrations, secret changes, and anything hitting the production identifiers above go through the
Sentinel check first (per `CLAUDE.md`). Then `npm run test` (the parity tests are the canary).
