# 09 - Footgun catalog

Every known failure mode as `exact error -> cause -> fix`, with the research citation. Quote the exact error string in any finding (directive 7).

## Auth

`401 {"message":"Token's user type mismatch!"}`
- Cause: an agency PIT used on a location/sub-account endpoint.
- Fix: use the SUB-ACCOUNT (location) PIT. Publicly confirmed (`research/ghl-social-planner/2026-06-29-ghl-social-posting-api-overview-auth.md`). See `guides/02-auth-token-resolution.md`.

## Create-post 422s (GHL)

`422 ["media must be an array with media objects or an empty array"]`
- Cause: the `media` field was omitted.
- Fix: always include `media` as an array: `[]` for text-only, `[{url,type:"image"}]` to attach. See `guides/07-media-attachment.md`.

`422 ["userId must be a string","userId should not be empty"]`
- Cause: no post-owner userId.
- Fix: resolve userId from `GET /users/?locationId={loc}` and include it. It does NOT cause publishing. See `guides/03-account-discovery.md`.

`422 ["property accountIds should not exist"]`
- Cause: `accountIds` was sent in the body of `POST /posts/list`.
- Fix: drop `accountIds` from the list body. See `guides/04-create-post-payload.md`.

## Response parsing

create "succeeds" but the post id is unknown
- Cause: the id is nested at `results.post._id`, not top-level.
- Fix: parse the nested path. See `guides/04-create-post-payload.md`.

## Listing / verification

`POST /posts/list` returns 0 right after a create
- Cause: eventual consistency, or a `fromDate`/`toDate` filter dropping date-less drafts.
- Fix: GET the post by id (authoritative); drop the date filters. See `guides/05-idempotency-manifest.md`.

## The publish-gate footguns (the dangerous ones)

a GHL post went live unapproved
- Cause: it was created with `status:"scheduled"`, which AUTO-PUBLISHES at its scheduleDate. The userId/approver field does not hold it for review.
- Fix: only ever create `status:"draft"`; the human publishes. See `guides/01-publish-gate.md`.

a Zernio MCP post auto-published in ~60 minutes
- Cause: Zernio MCP DEFAULTS to scheduled mode (60 min out) when `is_draft` is unset.
- Fix: always pass `is_draft=true` on every Zernio MCP create; never `publish_now=true` under the gate (`research/zernio/2026-06-29-zernio-mcp-server-default-scheduled-footgun.md`). See `guides/08-zernio-runbook.md`.

## Publish-time failures (created but not published)

post created (201) but never published
- Cause: a publish-time failure the create response cannot reveal: expired/revoked account token, missing posting permission, oversized media / file-upload timeout, "Duplicate content posted within 12 hours," community-standards violation, invalid links, exceeding character/tag limits, Instagram not a Business Account, or missing LeadConnector app on the FB page/group.
- Fix: read the post back by id and inspect the failure-reason field; remediate per the cause (reconnect account, shrink media, dedupe content, trim length, limit tags to 30 or fewer). This is a DISTINCT failure class from a create-422 (`research/ghl-social-planner/2026-06-29-ghl-failed-post-error-causes.md`). See `guides/05-idempotency-manifest.md`.

GHL silently rejects a re-run as duplicate
- Cause: GHL rejects "duplicate content posted within 12 hours." A naive caller can misread the rejection as success.
- Fix: the client-side manifest is authoritative for idempotency; do not rely on GHL's 12h duplicate rule. See `guides/05-idempotency-manifest.md`.

## Provider gotcha (legacy Buffer)

legacy Buffer create fails on media
- Cause: the 2026-05-25 Buffer change broke the legacy assets input format.
- Fix: do not start new Buffer integrations (no new client_id is issued); migrate off the legacy assets format if on an existing app (`research/alt-providers/2026-06-29-buffer-api-closed.md`). See `guides/06-provider-selection.md`.

## See also

- `guides/00-principles.md` (the directives these footguns enforce)
- `reports/REPORT-TEMPLATE.md` (where a finding quotes one of these errors)
