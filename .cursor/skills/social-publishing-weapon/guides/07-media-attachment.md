# 07 - Media attachment and per-platform limits

How to attach media safely, and the per-platform constraints that cause a created post to fail at publish time even though the create returned 201.

## GHL: media by public URL

GHL attaches media by hosted URL. The `media` field MUST be present as an array or GHL 422s (`["media must be an array with media objects or an empty array"]`):

- `[]` for a text-only post.
- `[{ "url": "https://host/image.png", "type": "image" }]` to attach an image.

GHL FETCHES the image from the URL, so the URL must be PUBLICLY reachable at create time. The arsenal run used GitHub Pages on a custom domain (`hfbomb.cuantico.us`); the provider media library or any CDN also works.

> TODO: open question - needs human decision before next refresh. The public image host for GHL `media` URLs (GitHub Pages, the provider media library, a CDN) is an operator/setup choice, constrained by the per-platform size caps below (Bluesky's 1 MB is tightest). Source: Command Brief IDEAS section; `research/research-summary.md` open question 5.

## Per-platform media, character, and rate limits (GHL)

Entirely from `research/ghl-social-planner/2026-06-29-ghl-media-content-platform-limits.md`. When ONE post targets MULTIPLE accountIds, the post must satisfy the MOST RESTRICTIVE target.

### Image limits (format / max size / max count)
- Facebook: JPEG/PNG/GIF, 10 MB, up to 10.
- Instagram: JPEG/PNG, 8 MB, aspect 4:5 to 1.91:1, max 10.
- LinkedIn: JPEG/PNG/GIF, 8 MB, max 6012x6012px, 9 max.
- Pinterest: JPEG/PNG/BMP/TIFF/WEBP, 10 MB, 1 image.
- Threads: JPEG/PNG, 8 MB, up to 20.
- Bluesky: JPEG/PNG, 1 MB per image (TIGHTEST).

### Video limits
- Facebook Reel: 1 GB, 3-90 sec.
- Instagram Reel: 300 MB, 3 sec-15 min, thumbnail supported.
- LinkedIn: MOV/MP4, 500 MB, 3 sec-30 min, 9 max.
- TikTok Business: MOV/MP4/WebM, 1 GB, 3-600 sec.
- Bluesky: MP4/MOV, 50 MB, up to 3 min.

### Character limits
Facebook 62,000; Instagram 2,200; LinkedIn 3,000; TikTok 2,200; Pinterest title 100 / content 500; Bluesky 300 (TIGHTEST).

### Posting rate limits
Facebook 200/hr; Instagram 25/24hr; TikTok 15/24hr; LinkedIn 200/24hr; Pinterest 25/5min.

## The fan-out lowest-common-denominator rule

A single `summary` and a single `media` array sent to multiple accountIds must satisfy the strictest target:

- If Bluesky is a target, the `summary` must fit 300 chars and each image must be under 1 MB.
- Otherwise use the per-channel CUSTOM-copy mode: multiple create calls, one per platform, each within that platform's own limits (`guides/04-create-post-payload.md`).

Decide explicitly: lowest-common-denominator single post vs per-channel custom multi-call. Do not let a fan-out silently fail on the strictest platform.

## Why this connects to read-back

GHL fetches the image at publish time. If the image exceeds a platform's size cap, the post can FAIL at publish even though the create returned 201 ("File upload timeouts (oversized media)" is a documented failure cause; `research/ghl-social-planner/2026-06-29-ghl-failed-post-error-causes.md`). The 24hr rate caps (Instagram 25, TikTok 15) also matter for a bulk fan-out. This is another reason read-back is mandatory, not paranoia (`guides/05-idempotency-manifest.md`).

## Zernio and Mixpost media note

Zernio attaches media in the create payload; Mixpost documents media UPLOADS (not just URL attach) in its REST API, which differs from GHL's media-by-public-URL model (`research/alt-providers/2026-06-29-mixpost-self-hosted.md`). Confirm each provider's media model before a run.

## See also

- `guides/04-create-post-payload.md` (the `media` field in the payload)
- `guides/05-idempotency-manifest.md` (read-back catches publish-time media failures)
- `guides/09-footgun-catalog.md` (the media 422 and oversized-media entries)
