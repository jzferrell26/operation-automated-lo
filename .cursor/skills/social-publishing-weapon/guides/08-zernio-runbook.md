# 08 - Zernio runbook (REST + MCP)

Zernio is one REST API to 15 platforms with a native DRAFT state, an MCP server, and 4 official SDKs. It is the choice for platforms GHL cannot reach and for the agentic publishing layer. All detail here is from the Zernio research notes; behavior NOT verified live is flagged.

## Platforms (15)

Twitter/X, Instagram, TikTok, LinkedIn, Facebook, YouTube, Threads, Reddit, Pinterest, Bluesky, Google Business, Telegram, Snapchat, WhatsApp, Discord (`research/zernio/2026-06-29-zernio-social-media-api.md`). This covers the platforms GHL cannot reach (X, Threads, Bluesky, Reddit, Pinterest, Discord, Telegram, Snapchat, WhatsApp). Zernio does NOT do DM management (Ayrshare does); see `guides/06-provider-selection.md`.

## REST: create a post

Base URL: `https://zernio.com/api/v1`. Auth: `Authorization: Bearer <ZERNIO_API_KEY>` (simple API key, no OAuth complexity for the developer call).

```
POST https://zernio.com/api/v1/posts
```

Request body (`research/zernio/2026-06-29-zernio-social-media-api.md`):

```json
{
  "content": "post body text",
  "scheduledFor": "2026-03-15T10:00:00Z",
  "timezone": "America/New_York",
  "platforms": [
    {"platform": "twitter",  "accountId": "acc_123"},
    {"platform": "linkedin", "accountId": "acc_456"}
  ]
}
```

- `content`: the post text/caption.
- `scheduledFor`: ISO 8601 timestamp.
- `timezone`: e.g. `America/New_York`.
- `platforms`: array of `{platform, accountId}`. Add entries to fan out to multiple platforms in one create.

Each connected account gets a short opaque id like `acc_123` (`guides/03-account-discovery.md`).

## The three publish modes

Zernio supports a true DRAFT state, unlike GHL's "scheduled auto-publishes" (`research/zernio/2026-06-29-zernio-docs-draft-scheduled-published.md`):

1. DRAFT: "saved but NOT published." The safe state. Use it as the default to satisfy the drafts-only gate.
2. SCHEDULED: scheduled for future publication (auto-publishes at its time).
3. IMMEDIATE/PUBLISH: goes live right away.

For the drafts-only gate, always create in DRAFT mode and let the human promote it, exactly mirroring the GHL `status:"draft"` rule.

> TODO: open question - needs human decision before next refresh. Does the REST `/posts` create accept the same `is_draft` flag the MCP exposes, and does a Zernio DRAFT ever auto-publish? The REST page shows `content`/`scheduledFor`/`timezone`/`platforms`; the MCP exposes `is_draft`/`publish_now`. Reconcile the two and verify live before trusting DRAFT as the gate. Source: `research/research-summary.md` open question 1 and the re-fetch note.

## MCP: the default-scheduled footgun

Zernio MCP server: `https://mcp.zernio.com/mcp`, OAuth sign-in or `Authorization: Bearer <API_KEY>`. 300+ tools auto-generated from the OpenAPI spec (Posts, Media, Ads, WhatsApp, Inbox, Contacts, Comment automations, Analytics, Webhooks). Clients: Claude Desktop (Settings -> Connectors -> Add custom connector), Cursor (`.cursor/mcp.json`, HTTP type), ChatGPT, any MCP client.

THE FOOTGUN (verbatim from the docs): "Posts default to scheduled mode (60 minutes out). Users must explicitly set `publish_now=true` or `is_draft=true` to override this default" (`research/zernio/2026-06-29-zernio-mcp-server-default-scheduled-footgun.md`).

So an agent that creates a Zernio MCP post WITHOUT setting `is_draft=true` will AUTO-PUBLISH in ~60 minutes with no approval. This is the Zernio analogue of the GHL `status:"scheduled"` trap, with exact field names:

- `is_draft=true` -> safe draft (REQUIRED on every MCP create in the drafts-only gate).
- `publish_now=true` -> immediate publish (forbidden under the gate).
- neither set -> scheduled 60 min out (the unsafe default; forbidden under the gate).

Because the 300+ MCP tools are auto-generated from the same OpenAPI spec, the REST draft field and the MCP `is_draft` flag are the same underlying capability. One publish-gate rule covers both surfaces: always force draft explicitly.

## Official SDKs

Python (`zernio-sdk` on PyPI, `zernio-dev/zernio-python`), JavaScript, PHP (`zernio-dev/zernio-php`), .NET (`zernio-dev/zernio-dotnet`). For the Cuantico stack, note the Python and JS SDKs (`research/zernio/2026-06-29-zernio-docs-draft-scheduled-published.md`). They reduce the need to hand-roll the HTTP client.

> TODO: open question - needs human decision before next refresh. If SDK-based examples are wanted, re-fetch the official SDK READMEs for the exact create-post call signature. Source: `research/research-summary.md` re-fetch note.

## Read-back and idempotency still apply

Apply the same discipline as GHL: parse the returned post id into the manifest, dry-run by default, and verify the stored state before trusting it (`guides/05-idempotency-manifest.md`). Confirm Zernio's draft state live before trusting it as the gate.

## See also

- `examples/02-zernio-push.md` (a Zernio run with the `is_draft` safety)
- `guides/01-publish-gate.md`, `guides/06-provider-selection.md`, `guides/09-footgun-catalog.md`
