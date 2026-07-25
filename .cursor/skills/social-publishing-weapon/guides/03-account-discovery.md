# 03 - Account discovery and userId resolution

Before you can create a post you must know which accounts to target and (for GHL) who owns the post. This guide covers both lookups and the two account-id shapes you will encounter.

## GHL: discover connected accounts

```
GET /social-media-posting/{locationId}/accounts
```

Each account has an `id` shaped like `<oauthBlock>_<locationId>_<handle>_<platform-suffix>` and a `platform` (`facebook` / `linkedin` / `tiktok` / `youtube` / `instagram` / `googleMyBusiness` / `twitter`). Build a `{platform: accountId}` map from the response.

Notes:
- The Accounts module is officially published (`research/ghl-social-planner/2026-06-29-ghl-social-planner-public-api-changelog.md`).
- TikTok appears as TWO account types (TikTok + TikTok Business) in GHL's OAuth coverage. Both can exist; key your map carefully so you do not collide them.
- TikTok and YouTube are video-first. Route those to scripts/video assets, not text posts.

## GHL: resolve the post-owner userId (REQUIRED)

```
GET /users/?locationId={locationId}
```

Take a user id (the only/first user, or an explicit override). GHL 422s on create without it:

```
["userId must be a string","userId should not be empty"]
```

Critical nuance (directive 3 in the brief): the `userId` is the post OWNER and does NOT cause publishing. Publishing is governed by `status` (GHL) / the draft flag, never by `userId`. A missing userId fails every post; a present userId never auto-publishes one.

## Zernio: account model

Zernio connects each social account via OAuth and assigns it a short opaque id like `acc_123` (`research/zernio/2026-06-29-zernio-social-media-api.md`). You reference it in the `platforms` array as `{"platform":"twitter","accountId":"acc_123"}`. Zernio has no separate post-owner userId requirement; the API key scopes the call.

## The two account-id shapes side by side

| Provider | accountId shape | Example |
|---|---|---|
| GHL | composite string | `643a...._z1iSil...._hfbomb_fb` |
| Zernio | short opaque | `acc_123` |

Document which shape a manifest entry holds so a reader never confuses the two.

## Multi-account fan-out

- GHL: put MULTIPLE accountIds in ONE post to fan one identical post out to many platforms (one post, one approval). See `guides/04-create-post-payload.md`.
- Zernio: add MULTIPLE entries to the `platforms` array of one create.
- Per-channel CUSTOM copy (different summary per platform) requires MULTIPLE create calls in both providers; the single-call fan-out sends the SAME copy everywhere.

## See also

- `guides/04-create-post-payload.md` (where the discovered ids and userId are used)
- `guides/07-media-attachment.md` (per-platform limits that constrain fan-out)
- `examples/01-ghl-drafts-push.md` (discovery shown in a run)
