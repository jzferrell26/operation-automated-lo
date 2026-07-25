# Research Summary: social-publishing-weapon

- **Depth tier consumed:** deep
- **Time window covered:** 2026-06-29 back to ~2026-01 (most sources are current 2026 provider docs/pricing). No source older than 12 months was relied upon.
- **Tools used:** built-in WebSearch + WebFetch (Firecrawl and Exa were NOT connected in this environment). GHL marketplace pages (marketplace.gohighlevel.com) are JS-rendered; WebFetch returned partial excerpts on the create-post/get-post pages and 404'd one independent analyst page (alexisbouchez.com). Where that happened, the changelog, support-portal, and overview pages (which fetched cleanly) and search snippets filled the gap. These limitations are flagged on the affected source notes.
- **Files written:** 15 source notes + research-plan.md + index.md + this summary.
  - `ghl-social-planner/`: 5
  - `zernio/`: 4
  - `alt-providers/`: 6
  - `publish-gate/`: 1
  - `idempotency/`: 2

## Verified-internal vs public-docs status (the brief's primary ask)

The arsenal weapon's GHL Social Planner runbook was verified LIVE on 2026-06-29. This run corroborated it against public docs as follows:

- CONFIRMED PUBLICLY: the create-post endpoint (`POST /social-media-posting/{loc}/posts`), the field set (accountIds, summary, media, type, status, scheduleDate, userId), the six `socialplanner/*` scopes (account/post/oauth x readonly/write), the account-discovery + get/list/delete operations, and the sub-account-token rule ("Access Token with user type Sub-Account OR Private Integration Token of Sub-Account").
- VERSION DISCREPANCY RESOLVED: the marketplace create-post page rendered `Version: v3`, but the API overview lists `2021-07-28` as a valid version. The verified-live `2021-07-28` is documented and correct; `v3` exists as a newer version to test, not adopt blindly. Pin the verified version.
- STILL VERIFIED-INTERNAL (public docs silent, NOT contradicted): the exact 422 strings (media-must-be-an-array, userId-must-be-a-string), the `results.post._id` nested id path, the `POST /posts/list` quirks (no accountIds in body, date filter drops date-less drafts, eventual consistency), and the scheduled-auto-publishes semantics. Absence of public docs here is not contradiction; the live test stands.
- NEW PUBLIC CORROBORATION the arsenal lacked: per-platform media/character/rate limits, and the Failed-Post-Error causes (which prove the read-back-verify rule is necessary, since a 201-created post can still fail to publish).

## The 5 most influential sources

1. **`zernio/2026-06-29-zernio-docs-draft-scheduled-published.md`** (docs.zernio.com) - RESOLVES the arsenal's biggest open question: Zernio has a true DRAFT state ("saved but NOT published"). weapon-forge can now write a real Zernio drafts-only runbook mirroring the GHL one, instead of the arsenal's "verify before trusting."
2. **`zernio/2026-06-29-zernio-mcp-server-default-scheduled-footgun.md`** (docs.zernio.com/mcp) - NEW CRITICAL FOOTGUN: Zernio MCP DEFAULTS to scheduled (60 min out); you must pass `is_draft=true`. This is the Zernio analogue of the GHL scheduled-auto-publishes trap, with exact field names. Belongs in the footgun catalog and the publish-gate guard.
3. **`ghl-social-planner/2026-06-29-ghl-social-posting-api-overview-auth.md`** (marketplace overview) - publicly confirms the sub-account-PIT rule AND resolves the Version header discrepancy. The single best corroboration of the verified runbook's auth invariants.
4. **`zernio/2026-06-29-zernio-social-media-api.md`** (zernio.com/social-media-api) - supplies the concrete Zernio payload the arsenal never had: `POST https://zernio.com/api/v1/posts` with `{content, scheduledFor, timezone, platforms:[{platform,accountId}]}`, Bearer API key. Plus 4 official SDKs (Python/JS/PHP/.NET).
5. **`alt-providers/2026-06-29-zernio-vs-ayrshare-decision-matrix.md`** + the Buffer/Postiz notes - the deep-tier provider decision matrix with real cost math, the Buffer-is-closed finding (downgrade from "alternative" to "not viable for new integrations"), and the corrected Postiz rate limit (90/hr configurable, not the marketing's "30/hr unusable").

## NEW detail found beyond the for-now weapon (brief's explicit ask)

- **Zernio (biggest gap closed):** concrete REST payload + base URL + auth; native DRAFT/SCHEDULED/PUBLISHED modes; the MCP default-scheduled footgun with `is_draft`/`publish_now` field names; MCP at mcp.zernio.com (300+ tools, OpenAPI-generated); 4 official SDKs; DM management is a GAP (Zernio does NOT do DMs, Ayrshare does).
- **Ayrshare:** full pricing tiers ($149/$299/$599), per-profile billing math (~$900/mo at 100 accounts), webhooks from Launch tier.
- **Blotato:** $29/$97/$499, MCP at mcp.blotato.com, 9 platforms, plus a valuable per-platform underlying-API-cost table (X $0.20/post, Reddit ~$12k/yr commercial, etc.).
- **Buffer:** effectively CLOSED to new third-party developers in 2026 (no new client_id); only a personal-key GraphQL beta. Decision-changing.
- **Postiz:** 90 req/hr (100 cloud), configurable via `API_LIMIT`; the Zernio "unusable/30 req/hr" knock is overstated. Now runbookable.
- **Mixpost:** $299 one-time license, REST API + webhooks + media upload, 11 platforms.
- **GHL:** per-platform media/char/rate limits (entirely new); Failed-Post-Error causes incl. the 12h duplicate-content rule (a weak server-side dedupe signal).

## Open questions that survived (for the user/operator, not weapon-forge to invent)

1. Does Zernio's REST `/posts` create support the same `is_draft` flag the MCP exposes, and does a Zernio DRAFT ever auto-publish? The docs assert "saved but NOT published"; verify live before trusting it as the gate (same discipline the arsenal applied to GHL).
2. Ayrshare / Blotato / Postiz / Mixpost draft-vs-scheduled semantics are NOT individually verified - each should be live-tested before its provider runbook is trusted for the drafts-only gate.
3. Ayrshare free-tier availability changed across sources in 2026 (some show $0/1-profile/50-posts, the pricing page showed a $149 entry). Confirm at signup.
4. The GHL `Version` header: `2021-07-28` (verified live) vs `v3` (marketplace docs). Operator should confirm which version the production integration pins and whether `v3` alters the payload contract.
5. The image-host choice for GHL `media` URLs (the arsenal used GitHub Pages on hfbomb.cuantico.us) remains an operator/setup decision; per-platform size caps (Bluesky 1 MB is tightest) constrain it.

## Sources weapon-forge should re-fetch with deeper context

- The GHL marketplace create-post / get-post pages (JS-rendered; this run got partial excerpts). If weapon-forge has a JS-capable fetcher, re-fetch for the full response JSON schema and the enumerated `status` values.
- docs.zernio.com REST reference for the `/posts` create - confirm whether `is_draft`/`publish_now`/`scheduledFor` are the REST field names (the MCP exposes them; the REST page showed `content`/`scheduledFor`/`timezone`/`platforms`). Reconcile the two.
- The Zernio official SDKs (zernio-dev/zernio-python, zernio-dev/zernio-dotnet, zernio-php) READMEs for the exact create-post call signature, if weapon-forge wants SDK-based examples.
