# 06 - Provider selection

Pick the right publishing API for the channel and the client. The decision rule and the cost math come from the deep-tier comparison `loremaster` gathered. The compact decision table is mirrored in `templates/provider-selection-table.md`.

## The decision rule

1. Count platforms first. If you need only 1-2 platforms, consider skipping unified APIs entirely and going native (`research/alt-providers/2026-06-29-zernio-vs-ayrshare-decision-matrix.md`).
2. GHL-native client (CRM + approval queue in GHL) -> GHL Social Planner.
3. Platforms GHL cannot reach (X, Threads, Bluesky, Reddit, Pinterest, Discord, Telegram, Snapchat, WhatsApp), the agency's own channels, or a non-GHL client -> Zernio.
4. AI-agent / MCP publishing layer -> Zernio (or Blotato); MCP support is the fastest-growing differentiator.
5. Self-hosted / data-residency requirement -> Postiz or Mixpost.

## Why a unified provider at all

Direct platform integration is expensive and gated: App Review queues (Meta), MDP partner approval (LinkedIn), a forced sandbox audit (TikTok), quota units (YouTube), per-post fees (X ~$0.20/post with a URL), and Reddit's ~$12,000/year commercial fee (`research/alt-providers/2026-06-29-blotato-api-pricing.md`). The unified providers exist precisely to abstract these review queues and fees.

## The providers

### GHL Social Planner
The native choice for GHL clients: posts land in the client's own approval queue and CRM. Verified runbook in `guides/04-create-post-payload.md`. Reaches 9 platforms via OAuth (Facebook, Google My Business, Instagram, LinkedIn, TikTok, TikTok Business, Twitter, and others; `research/ghl-social-planner/2026-06-29-ghl-social-planner-public-api-changelog.md`).

### Zernio
One REST API to 15 platforms, native DRAFT state, MCP server, 4 official SDKs. The choice for what GHL cannot reach and for the agentic layer. Pricing: free up to 2 accounts; then ~$6/account (3-10), ~$3/account (11-100), ~$1/account (101-2,000); ~$108/mo at 30 client profiles (vendor-published; verify at signup). Full runbook: `guides/08-zernio-runbook.md`. Sources: `research/zernio/2026-06-29-zernio-social-media-api.md`, `research/alt-providers/2026-06-29-zernio-vs-ayrshare-decision-matrix.md`.

### Ayrshare
The mature, expensive incumbent. 13+ platforms, immediate vs scheduled posting, delete-by-id, webhooks from the Launch tier. Per-profile pricing makes it costly at scale: Premium $149/mo (1 profile), Launch $299/mo (10 profiles), Business $599/mo (30 profiles), scaling to ~$900/mo at 100 accounts (`research/alt-providers/2026-06-29-ayrshare-pricing-api.md`). Ayrshare HAS DM management; Zernio does NOT, so Ayrshare wins where DMs matter (`research/alt-providers/2026-06-29-zernio-vs-ayrshare-decision-matrix.md`).

> TODO: open question - needs human decision before next refresh. Ayrshare free-tier availability changed across 2026 sources (some show $0 / 1 profile / 50 posts, the pricing page showed a $149 entry). Treat $149/mo as the reliable paid entry and confirm any free tier at signup. Source: `research/research-summary.md` open question 3.

### Blotato
The cheapest MCP-enabled posting layer: $29/mo (20 accounts), $97/mo, $499/mo, API on every paid plan, MCP at `https://mcp.blotato.com/mcp`, 9 platforms (`research/alt-providers/2026-06-29-blotato-api-pricing.md`). Creator-oriented and "posting-only" (narrower than Zernio's DM/comment/analytics breadth). A low-cost MCP option for a single agency or creator.

### Buffer (NOT viable for new integrations in 2026)
Buffer is effectively CLOSED to new third-party developers: "Buffer is no longer accepting any new developer applications for the Publish API... you can't get a client_id." Only a personal-key GraphQL beta exists (third-party OAuth not enabled), suitable for an agency's OWN single Buffer account, not a multi-client product. A legacy dev app still works on the old REST API, but a 2026-05-25 media-input format change broke the legacy assets input format (`research/alt-providers/2026-06-29-buffer-api-closed.md`). Decisively: do not plan a new Buffer integration.

### Postiz (self-hosted, runbookable)
The leading open-source self-hosted scheduler. Real rate limit: 90 req/hr (100 cloud), applying ONLY to create-post, with batch scheduling in one request, and fully configurable on self-hosted via the `API_LIMIT` env var. The Zernio marketing claim that Postiz is "unusable at 30 req/hr" is OVERSTATED; do not repeat it (`research/alt-providers/2026-06-29-postiz-self-hosted.md`). Production-viable when self-hosted because the operator controls the limit.

### Mixpost (self-hosted, one-time license)
Privacy-first, $299 ONE-TIME license (no subscription), REST API + webhooks + media UPLOAD (not just URL attach), 11 platforms (`research/alt-providers/2026-06-29-mixpost-self-hosted.md`). The clean CapEx self-hosted option versus Postiz's open/agentic path.

## Provider tiers (independent landscape)

- Infrastructure-grade (multi-tenant ready): Zernio, Ayrshare.
- Posting-only (creator tools with an API): Blotato, Upload-Post.
- Self-hosted: Postiz, Mixpost.
- Off the table for new integrations: Buffer.

## Publish-gate caveat for all non-GHL/Zernio providers

Ayrshare, Blotato, Postiz, and Mixpost document immediate/scheduled posting, but their draft/hold semantics are NOT individually verified. Carry the same drafts-only caution and verify the draft state live before trusting any of them as the gate (see the TODO in `guides/01-publish-gate.md`).

## See also

- `templates/provider-selection-table.md` (the compact table)
- `guides/08-zernio-runbook.md` (Zernio detail)
- `guides/04-create-post-payload.md` (GHL detail)
