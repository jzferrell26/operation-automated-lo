# Example 01 - GHL drafts push (dry-run -> test -> read-back -> push rest)

A full happy-path GHL Social Planner run for the canonical drafts-only flow. Demonstrates `guides/01-publish-gate.md`, `guides/02-auth-token-resolution.md`, `guides/03-account-discovery.md`, `guides/04-create-post-payload.md`, `guides/05-idempotency-manifest.md`, and `guides/07-media-attachment.md`. Values are illustrative; the contract is real (verified live 2026-06-29).

## Input (the content package)

A finished package (see `templates/posts.json`): three posts, each targeting Facebook + LinkedIn, one with a hosted image, for location `z1iSilSVX6vJSU01d92u`.

## Step 1 - confirm the gate

Every post will be created `status:"draft"`. The human publishes from the GHL planner. No `scheduled`/`published`/`active` anywhere.

## Step 2 - resolve auth

Token from env: `GHL_SUBACCOUNT_PIT` (a SUB-ACCOUNT PIT, not agency). Headers:

```
Authorization: Bearer $GHL_SUBACCOUNT_PIT
Version: 2021-07-28
Accept: application/json
Content-Type: application/json
```

(An agency token here would return `401 Token's user type mismatch!` per `guides/09-footgun-catalog.md`.)

## Step 3 - discover accounts + userId

```
GET /social-media-posting/z1iSilSVX6vJSU01d92u/accounts
GET /users/?locationId=z1iSilSVX6vJSU01d92u
```

Resolved map and owner:

```json
{ "facebook": "643a...._z1iSil...._hfbomb_fb",
  "linkedin": "643a...._z1iSil...._hfbomb_li",
  "userId":   "ownerUser_abc123" }
```

## Step 4 - DRY-RUN (the gate)

Print the plan and STOP. No create calls.

```
DRY-RUN PLAN (location z1iSilSVX6vJSU01d92u)
  post 1 -> [facebook, linkedin]  media: 1 image  status: draft
  post 2 -> [facebook, linkedin]  media: 1 image  status: draft
  post 3 -> [facebook, linkedin]  media: []        status: draft
  every post status == draft  ->  PASS
```

Every line reads `status: draft`. If any read `scheduled`, the run would halt here. Gate passed.

## Step 5 - push ONE test post, then read it back

Create post 1:

```
POST /social-media-posting/z1iSilSVX6vJSU01d92u/posts
{
  "accountIds": ["...._hfbomb_fb", "...._hfbomb_li"],
  "summary": "First draft post body.",
  "media": [{ "url": "https://hfbomb.cuantico.us/img/post1.png", "type": "image" }],
  "type": "post",
  "status": "draft",
  "userId": "ownerUser_abc123",
  "scheduleDate": "2026-07-08T18:00:00Z"
}
```

Response (201). Parse the id from the NESTED path:

```json
{ "success": true, "statusCode": 201, "message": "Created Post",
  "results": { "post": { "_id": "post_AAA111" } } }
```

Read it back (authoritative):

```
GET /social-media-posting/z1iSilSVX6vJSU01d92u/posts/post_AAA111
-> status: "draft", accountIds: 2, media: 1   ->  VERIFIED
```

The read-back confirms `draft`, 2 accounts, 1 image. (A 201 alone would not; a created post can still fail at publish, per `guides/05-idempotency-manifest.md`.) Write the manifest entry immediately.

## Step 6 - push the rest

Create posts 2 and 3 the same way, reading each back by id and recording each `results.post._id` to the manifest as it lands.

## Step 7 - the manifest

See `templates/push-manifest.json` for the full shape. After the batch:

```json
{ "provider": "ghl", "locationId": "z1iSilSVX6vJSU01d92u",
  "entries": [
    { "key": "hash_p1", "postId": "post_AAA111", "readBackStatus": "draft", "accounts": 2, "media": 1 },
    { "key": "hash_p2", "postId": "post_BBB222", "readBackStatus": "draft", "accounts": 2, "media": 1 },
    { "key": "hash_p3", "postId": "post_CCC333", "readBackStatus": "draft", "accounts": 2, "media": 0 }
  ] }
```

A re-run reads this manifest and skips all three keys (no double-posting). If the batch had died after post 2, `--resume` would push only post 3.

## Step 8 - hand off

Report (see `reports/REPORT-TEMPLATE.md`): 3 drafts created on Facebook + LinkedIn for `z1iSilSVX6vJSU01d92u`, each verified `draft` by read-back. The human reviews and publishes each from the GHL Social Planner. Zero failures.

## If something had gone wrong

- A `422 media must be an array...` on a text-only post -> we sent `media: []`, not omitted. See `guides/09-footgun-catalog.md`.
- A read-back showing a failure-reason (e.g. oversized media for a Bluesky target) -> remediate per `guides/07-media-attachment.md`.
