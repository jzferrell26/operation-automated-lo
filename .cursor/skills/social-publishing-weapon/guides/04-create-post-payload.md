# 04 - The GHL create-post payload (verified)

The exact GHL Social Planner create-post contract, verified live 2026-06-29 (location `z1iSilSVX6vJSU01d92u`) and corroborated for field names by the public marketplace doc (`research/ghl-social-planner/2026-06-29-ghl-create-post-api.md`).

## Endpoint

```
POST /social-media-posting/{locationId}/posts
```

Headers per `guides/02-auth-token-resolution.md`. Success status code: 201.

## The exact shape

```json
{
  "accountIds": ["<facebookId>", "<linkedinId>"],
  "summary": "post body text",
  "media": [{ "url": "https://host/image.png", "type": "image" }],
  "type": "post",
  "status": "draft",
  "userId": "<ownerUserId>",
  "scheduleDate": "2026-07-08T18:00:00Z"
}
```

Field-by-field:

- `accountIds` (required): one or more discovered account ids. MULTIPLE ids publish ONE identical post to MULTIPLE platforms, with a single approval. The public doc confirms this single-call multi-account behavior, and notes that per-channel CUSTOM copy instead requires hitting create multiple times with different summaries and account ids (`research/ghl-social-planner/2026-06-29-ghl-create-post-api.md`).
- `summary` (required): the post body text. If any target platform has a tight character cap (Bluesky is 300), the single `summary` must fit the MOST RESTRICTIVE target, or you must split into per-channel custom calls. See `guides/07-media-attachment.md`.
- `media` (required as an array): `[]` for a text-only post, or `[{ "url": "...", "type": "image" }]` to attach a hosted image. OMITTING `media` 422s: `["media must be an array with media objects or an empty array"]`. GHL FETCHES the image from the public URL, so the URL must be publicly reachable. See `guides/07-media-attachment.md`.
- `type`: `"post"`.
- `status`: `"draft"` ONLY. `scheduled`/`published`/`active` are forbidden (they auto-publish). See `guides/01-publish-gate.md`.
- `userId` (required): the post owner from `GET /users`. Missing userId 422s: `["userId must be a string","userId should not be empty"]`. Does NOT cause publishing. See `guides/03-account-discovery.md`.
- `scheduleDate`: on a DRAFT this is a NON-BINDING hint (the planned slot the planner shows). A draft does NOT publish at this date. Only a human publishing it makes it go live.

The public marketplace doc confirms the field set (`accountIds`, `summary` required; `media`, `type`, `status`, `scheduleDate`, `userId` optional) and the 201 code. The exact 422 strings, the allowed `status` values, and the nested response path below remain verified-internal (public docs are silent, not contradictory).

## Parse the post id from the nested response

A success looks like:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Created Post",
  "results": { "post": { "_id": "<id>", "...": "..." } }
}
```

The id is at `results.post._id`, NOT top-level. Parse it so the manifest can track, dedupe, read back, and clean up posts (`guides/05-idempotency-manifest.md`).

## Read back to verify

```
GET /social-media-posting/{locationId}/posts/{id}
```

Confirm `status` is `draft`, the `accountIds` length, and the `media` length. This is authoritative. A 201 does NOT prove the stored state or that the post will publish (`guides/05-idempotency-manifest.md`, `research/ghl-social-planner/2026-06-29-ghl-failed-post-error-causes.md`).

## Listing posts (quirky)

```
POST /social-media-posting/{locationId}/posts/list
```

Body like `{"type":"all","skip":"0","limit":"50"}`. Gotchas:

- The body must NOT include `accountIds` -> `422 ["property accountIds should not exist"]`.
- Adding `fromDate`/`toDate` filters OUT date-less drafts.
- The endpoint is flaky/eventually-consistent (can return 0 right after a create).

Trust GET-by-id over list for verification.

## Delete (cleanup / undo)

```
DELETE /social-media-posting/{locationId}/posts/{id}   ->  200 "Deleted Post"
```

Use to neutralize a wrongly-scheduled post or clean up test pushes. This is the kill switch used to delete the near-miss client post on 2026-06-29.

## The push pattern

dry-run -> push ONE test post -> GET-by-id verify (draft + accounts + media) -> push the rest -> write a manifest of real ids -> support `--resume` to skip already-pushed ids. Full mechanics in `guides/05-idempotency-manifest.md`; worked end to end in `examples/01-ghl-drafts-push.md`.

## See also

- `templates/posts.json` (the content-package shape this payload is built from)
- `templates/push-manifest.json` (where `results.post._id` is recorded)
- `guides/01-publish-gate.md`, `guides/07-media-attachment.md`, `guides/09-footgun-catalog.md`
