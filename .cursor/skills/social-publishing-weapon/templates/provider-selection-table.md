# Provider selection table

The compact decision table. Full logic, citations, and TODOs in `guides/06-provider-selection.md`. Cost figures marked "vendor-published" must be verified at signup.

## Decision rule (top to bottom; first match wins)

| If... | Use |
|---|---|
| You need only 1-2 platforms | Consider going native (skip a unified API) |
| GHL-native client (CRM + approval queue in GHL) | GHL Social Planner |
| Platforms GHL cannot reach (X, Threads, Bluesky, Reddit, Pinterest, Discord, Telegram, Snapchat, WhatsApp) | Zernio |
| Agency's own channels / non-GHL client | Zernio |
| AI-agent / MCP publishing layer | Zernio (or Blotato) |
| Self-hosted / data-residency requirement | Postiz or Mixpost |

## Provider comparison

| Provider | Platforms | Draft primitive | Pricing (verify at signup) | MCP | Notes |
|---|---|---|---|---|---|
| GHL Social Planner | 9 (FB, GMB, IG, LinkedIn, TikTok, TikTok Biz, X) | `status:"draft"` | per GHL plan | no | native approval queue + CRM; sub-account PIT only |
| Zernio | 15 | DRAFT mode / `is_draft=true` | free <=2 acct; ~$6/$3/$1 per acct by tier; ~$108/mo @ 30 profiles (vendor) | yes (mcp.zernio.com) | native draft; 4 SDKs; NO DM management |
| Ayrshare | 13+ | verify live | $149 / $299 / $599 mo per-profile; ~$900/mo @ 100 | no | mature, expensive at scale; HAS DM management; webhooks from Launch |
| Blotato | 9 | verify live | $29 / $97 / $499 mo | yes (mcp.blotato.com) | cheapest MCP; posting-only |
| Buffer | n/a (closed) | n/a | n/a | no | NOT viable for new integrations 2026 (no new client_id); legacy apps only |
| Postiz | X, Bluesky, Mastodon, Discord, + | verify live | open-source / self-host | "agentic" | 90 req/hr (100 cloud), configurable via API_LIMIT; production-viable self-hosted |
| Mixpost | 11 | verify live | $299 one-time license | no | privacy-first; REST + webhooks + media UPLOAD |

## Independent tiers

- Infrastructure-grade (multi-tenant ready): Zernio, Ayrshare.
- Posting-only (creator tools with an API): Blotato, Upload-Post.
- Self-hosted: Postiz, Mixpost.
- Off the table for new integrations: Buffer.

> TODO: open question - needs human decision before next refresh. Draft-vs-scheduled semantics for Ayrshare / Blotato / Postiz / Mixpost are NOT individually verified; live-test each before trusting it for the drafts-only gate. Ayrshare's free tier is ambiguous across 2026 sources (treat $149/mo as the reliable entry). Sources: `research/research-summary.md` open questions 2 and 3.
