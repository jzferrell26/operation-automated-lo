---
name: social-publishing-weapon
description: Multi-provider social-publishing runbook for social-publishing-guardian. Equips the Guardian to push approval-gated DRAFT posts to connected social accounts via API (GoHighLevel / LeadConnector Social Planner, Zernio, extensible to Ayrshare / Blotato / Buffer / Postiz / Mixpost), with live-verified GHL payload shapes, the Zernio REST + MCP payloads, the drafts-only publish gate, the GHL scheduled-auto-publishes footgun, the Zernio MCP default-scheduled footgun, post-owner userId resolution, multi-account single-post fan-out, media-by-URL attachment with per-platform limits, account discovery, idempotent push manifests with dry-run/resume, and the sub-account-vs-agency token rule. Use whenever finished social content is pushed/scheduled to a platform, when a post auto-published without approval, when a social post 422s, or when choosing a publishing API. Drafts only, never auto-publish. No em dashes, ever.
---

# social-publishing-weapon

The publishing rulebook for `social-publishing-guardian`. It encodes how to get finished social content into connected accounts SAFELY (as drafts a human reviews and publishes), the live-verified GoHighLevel / LeadConnector Social Planner API contract, the Zernio runbook (REST + MCP), the alternative-provider landscape, and the provider-agnostic invariants (publish gate, idempotency, read-back verification). The GHL runbook was verified live against a real client account on 2026-06-29 (location `z1iSilSVX6vJSU01d92u`) and corroborated against current public docs by `loremaster` (see `research/research-summary.md`).

## The one rule that gates everything

DRAFTS ONLY. NEVER auto-publish. The most polished post is a liability if it goes live without the client's sign-off. Create every post as a DRAFT. The human schedules or publishes each draft in the platform UI.

The unsafe behavior is the DEFAULT on every provider studied:
- GHL `status:"scheduled"` AUTO-PUBLISHES at its scheduleDate. The approver/userId field does NOT route a post to a held approval queue (`research/ghl-social-planner/2026-06-29-ghl-create-post-api.md`).
- Zernio MCP DEFAULTS to scheduled, 60 minutes out, unless you pass `is_draft=true` (`research/zernio/2026-06-29-zernio-mcp-server-default-scheduled-footgun.md`).
- Even tiered approval CHAINS end in auto-publish; the only truly safe state is a draft a human manually promotes (`research/publish-gate/2026-06-29-approval-gate-automation-risk.md`).

The Guardian's whole value is forcing the draft state explicitly, every time. See `guides/01-publish-gate.md`.

## Critical directives (the guardrails)

These come from the Command Brief's SUBAGENT CRITICAL DIRECTIVES, deepened by research. Full treatment in `guides/00-principles.md`.

1. Drafts only. Forbid scheduled / published / active in code (e.g. `status: z.literal("draft")` for GHL, `is_draft: true` for Zernio, plus a runtime guard). The human publishes.
2. No em dashes in any copy, report, or prose, ever.
3. Token from env only. Never log it, never pass it on the command line, never commit it (gitignore the env file).
4. GHL location/sub-account endpoints need a SUB-ACCOUNT (location) PIT. An agency PIT returns `401 {"message":"Token's user type mismatch!"}` (publicly confirmed: `research/ghl-social-planner/2026-06-29-ghl-social-posting-api-overview-auth.md`).
5. Verify by read-back (GET by id), not by the 201. A created post can still FAIL at publish time (`research/ghl-social-planner/2026-06-29-ghl-failed-post-error-causes.md`).
6. Idempotency: parse the real post id, write a manifest, support resume. Dry-run by default (`guides/05-idempotency-manifest.md`).
7. Quote the exact API error in any finding. A 422 tells you the missing/invalid field.
8. Right provider for the channel (see `guides/06-provider-selection.md`). GHL for GHL-native clients; Zernio for what GHL cannot reach.

## The action sequence (publish gate -> auth -> discovery -> userId -> payload -> verify -> manifest)

This is the ordered procedure every publish run follows. Each step links to its guide.

1. Confirm the publish gate. Every post is a DRAFT. `guides/01-publish-gate.md`.
2. Resolve auth. GHL: sub-account PIT, env only. Zernio: Bearer API key. `guides/02-auth-token-resolution.md`.
3. Discover connected accounts and build a `{platform: accountId}` map. `guides/03-account-discovery.md`.
4. Resolve the required post-owner userId (GHL only; 422s without it). `guides/03-account-discovery.md`.
5. Build the verified payload: accountIds[]/summary/media/type/status=draft/userId/scheduleDate (GHL) or content/platforms[]/is_draft (Zernio). Attach media by hosted URL within per-platform limits. `guides/04-create-post-payload.md` and `guides/07-media-attachment.md`.
6. Dry-run, then push ONE test post, then GET it back by id to confirm it landed as a draft on the right accounts with media. Only then push the rest. `guides/01-publish-gate.md` (dry-run) and `guides/05-idempotency-manifest.md` (read-back + resume).
7. Write an idempotent manifest (real post id at `results.post._id` for GHL) and support resume. `guides/05-idempotency-manifest.md`.
8. Hand off: report what landed, where the human reviews/schedules it, and any post that failed with its exact API error. `reports/REPORT-TEMPLATE.md`.

## Provider quick map

| Provider | Use when | Draft primitive | Runbook |
|---|---|---|---|
| GHL Social Planner | GHL-native client (CRM + approval queue in GHL) | `status:"draft"` | `guides/04-create-post-payload.md` |
| Zernio | Platforms GHL cannot reach (X, Threads, Bluesky, Reddit, Pinterest), agency channels, non-GHL clients, MCP/agent layer | DRAFT mode / `is_draft:true` | `guides/08-zernio-runbook.md` |
| Ayrshare | Mature incumbent; expensive per-profile at scale | verify live | `guides/06-provider-selection.md` |
| Blotato | Cheapest MCP posting layer ($29/mo) | verify live | `guides/06-provider-selection.md` |
| Buffer | NOT viable for new integrations in 2026 (no new client_id) | n/a | `guides/06-provider-selection.md` |
| Postiz | Self-hosted / data residency, rate-tunable | verify live | `guides/06-provider-selection.md` |
| Mixpost | Self-hosted, one-time $299 license, media upload | verify live | `guides/06-provider-selection.md` |

Full selection logic, cost math, and the draft-semantics-unverified TODOs are in `guides/06-provider-selection.md` and the table at `templates/provider-selection-table.md`.

## Footgun catalog (the fast index)

Each entry is `exact error -> cause -> fix`. The full catalog with research citations is `guides/09-footgun-catalog.md`.

- `401 Token's user type mismatch!` -> agency PIT on a location endpoint -> use the sub-account PIT.
- `422 media must be an array...` -> `media` omitted -> always include `media` (`[]` or `[{url,type:"image"}]`).
- `422 userId must be a string / should not be empty` -> no post owner -> resolve userId from `/users`.
- `422 property accountIds should not exist` -> sent accountIds to `/posts/list` -> drop it from the list body.
- create "succeeds" but ghlPostId unknown -> id is nested at `results.post._id` -> parse the nested path.
- list returns 0 right after a create -> eventual consistency / date filter -> GET-by-id; drop fromDate/toDate.
- a post went live unapproved (GHL) -> it was `status:"scheduled"` -> only ever create `draft`.
- a Zernio MCP post auto-published in ~60 min -> default is scheduled -> always pass `is_draft=true`.
- post created (201) but never published -> publish-time failure (expired token, oversized media, duplicate-in-12h, policy) -> read back and read the failure reason.

## Examples and reports

- `examples/01-ghl-drafts-push.md`: a full GHL run (dry-run -> test post -> read-back -> push rest -> manifest).
- `examples/02-zernio-push.md`: a Zernio run with the `is_draft` safety on both REST and MCP.
- `reports/REPORT-TEMPLATE.md`: the hand-off / audit report shape (what landed, where the human reviews, failures with exact errors).

## Scope boundary

This Weapon owns the API publishing layer: provider choice, account discovery/resolution, the create-post payload, the draft gate, owner identity, media attachment, multi-platform fan-out, idempotency, and read-back verification. It does NOT own content strategy or copy (organic-strategy domain), the creative assets (social-creative-weapon), email (email-marketing-weapon), GHL CRM core like opportunities/contacts/custom-fields (gohighlevel-weapon), or the n8n plumbing that triggers a run. When a provider's behavior is unverified, say so and verify live before trusting it; mark open questions `> TODO: open question - needs human decision before next refresh`.
