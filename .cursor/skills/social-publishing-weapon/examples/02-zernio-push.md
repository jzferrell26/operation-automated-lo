# Example 02 - Zernio push with the is_draft safety (REST + MCP)

A Zernio run that reaches platforms GHL cannot (X + Bluesky) and demonstrates the `is_draft` safety on both the REST and MCP surfaces. Demonstrates `guides/08-zernio-runbook.md`, `guides/01-publish-gate.md`, `guides/02-auth-token-resolution.md`, and `guides/05-idempotency-manifest.md`. Values are illustrative.

## Why Zernio here

The client wants the post on X and Bluesky, which GHL Social Planner cannot reach (`guides/06-provider-selection.md`). Zernio covers both and has a native DRAFT state.

## Step 1 - confirm the gate

Every Zernio post is created in DRAFT mode (REST) / with `is_draft=true` (MCP). The default on the MCP surface is the UNSAFE scheduled-60-min mode, so the gate is explicit on every call.

## Step 2 - resolve auth

Token from env: `ZERNIO_API_KEY`.

```
Authorization: Bearer $ZERNIO_API_KEY
Content-Type: application/json
```

## Step 3 - account ids

Zernio accounts are short opaque ids:

```json
{ "twitter": "acc_x9", "bluesky": "acc_bs4" }
```

## Step 4 - DRY-RUN (the gate)

```
DRY-RUN PLAN (zernio)
  post 1 -> [twitter, bluesky]  draft: true
  every post is_draft == true / DRAFT mode  ->  PASS
```

## Step 5a - REST create (DRAFT mode)

```
POST https://zernio.com/api/v1/posts
{
  "content": "Launch teaser. Doors open July 8.",
  "scheduledFor": "2026-07-08T18:00:00Z",
  "timezone": "America/New_York",
  "platforms": [
    { "platform": "twitter", "accountId": "acc_x9" },
    { "platform": "bluesky", "accountId": "acc_bs4" }
  ]
}
```

Create in DRAFT mode ("saved but NOT published"). The post is held for the human to promote.

> Note (`guides/08-zernio-runbook.md`): whether the REST create accepts the same `is_draft` flag the MCP exposes, and whether a Zernio DRAFT ever auto-publishes, is an unverified open question. Verify live before trusting DRAFT as the gate. Caption fits Bluesky's 300-char cap.

## Step 5b - the MCP surface (the footgun)

If the same post is created via the Zernio MCP server (`https://mcp.zernio.com/mcp`), the create MUST set `is_draft=true`:

```
zernio.posts.create(
  content="Launch teaser. Doors open July 8.",
  platforms=[{platform:"twitter",accountId:"acc_x9"},{platform:"bluesky",accountId:"acc_bs4"}],
  is_draft=true            # REQUIRED - default is scheduled 60 min out
)
```

WITHOUT `is_draft=true`, this post would auto-publish in ~60 minutes with no approval (`guides/09-footgun-catalog.md`). Never pass `publish_now=true` under the gate.

## Step 6 - read back, manifest, hand off

Parse the returned post id into the manifest (`templates/push-manifest.json`), verify the stored state is a draft, and report: 1 draft created on X + Bluesky via Zernio, held for human promotion. Same idempotency discipline as GHL (`guides/05-idempotency-manifest.md`).

## Contrast with GHL

- GHL: `status:"draft"` is safe; `status:"scheduled"` auto-publishes.
- Zernio REST: DRAFT mode is safe.
- Zernio MCP: the DEFAULT is unsafe (scheduled 60 min); `is_draft=true` makes it safe.

The invariant is identical across all three: create the DRAFT primitive explicitly, let the human promote it.
