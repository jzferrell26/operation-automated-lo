# 08 - Video: premium AI clips via kie.ai (Veo / Kling)

ACTION step 7 (extension, continued): generate a premium clip via kie.ai (Veo 3.1 / Kling), then bookend it with a HyperFrames logo intro/outro authored from the SAME brand spec.

kie.ai is a unified API for premium AI video (Veo 3.1, Kling, Seedance, Runway) plus image/LLM, credit-based and priced under the official providers. Use it for the hero "right hook" clip; use HyperFrames (`guides/07-video-hyperframes.md`) for the deterministic on-brand bookends.

> TODO: open question - the video layer is a per-client spike. Re-verify kie.ai endpoints and pricing LIVE at build/use time; the paths and numbers below were current 2026-06-29. Confirm live pricing from kie.ai/pricing in a browser if exact numbers matter (the marketing domain 403s automated fetches; docs.kie.ai serves cleanly).

## Two endpoint shapes (the architecture note)

kie.ai has TWO request shapes. Document and handle both; prefer `jobs/createTask` as the forward-looking unified shape (`research/kie-ai-video/2026-06-29-kie-ai-kling-image-to-video-contract.md`).

1. **Veo (flat params):** `POST https://api.kie.ai/api/v1/veo/generate`
2. **Unified market models (Kling 2.6, likely Seedance/Runway):** `POST https://api.kie.ai/api/v1/jobs/createTask` with `{ model, input: {...} }`

Both use `Authorization: Bearer YOUR_API_KEY` + `Content-Type: application/json`, and both return a `taskId` you poll (or receive via `callBackUrl`).

## Veo request (text-to-video, native vertical)

```json
{
  "prompt": "A dog playing in a park",
  "imageUrls": ["http://example.com/image1.jpg"],
  "model": "veo3_fast",
  "aspect_ratio": "9:16",
  "duration": 8,
  "resolution": "1080p"
}
```

Key params (`research/kie-ai-video/2026-06-29-kie-ai-veo3-generate-api-contract.md`):

- `model`: `veo3`, `veo3_fast` (default), or `veo3_lite`
- `aspect_ratio`: `16:9` (default), `9:16` (native vertical for Reels/TikTok/Shorts), or `Auto`
- `duration`: 4, 6, or 8 seconds (default 8)
- `resolution`: `720p`, `1080p` (default), or `4k`
- `imageUrls` (1-3): image-to-video; feed a brand photo or a rendered card as the first frame so the clip stays on-brand. `generationType` of `FIRST_AND_LAST_FRAMES_2_VIDEO` can bookend with brand frames. Gotcha: `REFERENCE_2_VIDEO` only supports `duration` = 8.

Response: `{ "code": 200, "msg": "success", "data": { "taskId": "veo_task_..." } }`.

## Kling request (image-to-video, animate a brand still)

```json
{
  "model": "kling-2.6/image-to-video",
  "input": {
    "prompt": "slow push-in, warm light",
    "image_urls": ["https://.../photo-warm-1080.png"],
    "sound": true,
    "duration": "5"
  }
}
```

POST to `/api/v1/jobs/createTask`. `image_urls` is max 1 item, JPEG/PNG, max 10MB; a sharp-cropped 1080 PNG is well under that. `duration` is the string `"5"` or `"10"`. Use Kling to animate an existing on-brand frame when Veo's text-to-video is not on-brand enough (`research/kie-ai-video/2026-06-29-kie-ai-kling-image-to-video-contract.md`).

## The async contract (poll or callback)

A `200 OK` only means the task was CREATED, not done. You MUST poll the Get-Video-Details endpoint by `taskId` until `resultUrls` is populated, or supply a `callBackUrl` webhook (`research/kie-ai-video/2026-06-29-kie-ai-pricing-getting-started-gotchas.md`). Never treat the create response as the finished asset. Store the `taskId`, make the poll idempotent, persist the final MP4 URL. Re-fetch the exact poll endpoint path fresh from docs.kie.ai when authoring the client wrapper.

## The 14-day retention rule (CRITICAL, bake in)

Generated files are retained only 14 days: "Download results promptly for long-term storage." After a clip finishes, immediately download the MP4 and re-host or commit it. Do NOT rely on the kie.ai `resultUrl` staying live; it expires (`research/kie-ai-video/2026-06-29-kie-ai-pricing-getting-started-gotchas.md`).

> TODO: open question - the kie.ai 14-day retention needs a re-host destination. WHERE the kept MP4 lives (client repo, GHL media, Supabase storage) is a per-deployment decision the human / social-publishing-guardian owns. Decide it before generating clips you intend to keep.

## Rate limits and pricing

- Rate limit: 20 generation requests per 10 seconds; exceeded requests return HTTP 429 and are NOT queued. Supports 100+ concurrent tasks. A campaign of clips needs client-side throttling/backoff; do not fire-and-forget.
- Pricing (verify live): `$0.005` per credit. Veo 3 Fast (8s, with audio) = `$0.40` (80 credits); Veo 3 Quality (8s, with audio) = `$2.00` (400 credits). Rates run roughly 30-50% under official APIs. Decision: `veo3_fast` ($0.40) is the default jab-clip; `veo3` ($2.00) for the hero right-hook; Kling for animating a brand still.

## Security (the key handling guardrail)

API key in an env var only. Never in the committed generator, never in frontend code, never in a public repo. This aligns with the repo's no-secrets-in-git rule. The kie.ai docs say the same: "Never expose your API key in frontend code."

## How it pairs with HyperFrames

The premium kie.ai clip is the middle; the HyperFrames logo intro/outro are the bookends, authored from the SAME brand spec so the whole short is on-brand. See the full worked short in `examples/02-branded-short-video.md`.

## See also

- The bookend layer: `guides/07-video-hyperframes.md`.
- Worked branded short: `examples/02-branded-short-video.md`.
- Sources: `research/kie-ai-video/2026-06-29-kie-ai-veo3-generate-api-contract.md`, `research/kie-ai-video/2026-06-29-kie-ai-kling-image-to-video-contract.md`, `research/kie-ai-video/2026-06-29-kie-ai-pricing-getting-started-gotchas.md`.
