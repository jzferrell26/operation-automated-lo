---
source_url: https://docs.kie.ai/veo3-api/generate-veo-3-video
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: kie-ai
weapon: social-creative-weapon
---

# kie.ai Veo 3 / 3.1 Generate API - exact contract

## Summary
kie.ai's Veo generation endpoint is a single POST that returns a `taskId`; you then poll a "Get Video Details" endpoint (or supply a `callBackUrl` webhook) to retrieve the finished MP4 URL. Auth is a Bearer API key. Crucially for social creative: `aspect_ratio` supports native `9:16` vertical output and `model` selects the cost tier (`veo3_fast` default, `veo3` quality, `veo3_lite`). Priced at ~25% of official Google Veo pricing. This is the exact request/response shape the for-now weapon was missing.

## Endpoint + auth
- `POST https://api.kie.ai/api/v1/veo/generate`
- `Content-Type: application/json`
- `Authorization: Bearer YOUR_API_KEY`

## Request body parameters (verbatim table)
| Parameter | Type | Required | Details |
|---|---|---|---|
| `prompt` | string | Yes | Description of desired video content |
| `imageUrls` | array | No | 1-3 image URLs for image-to-video modes |
| `model` | string | No | `veo3`, `veo3_fast` (default), or `veo3_lite` |
| `generationType` | string | No | `TEXT_2_VIDEO`, `FIRST_AND_LAST_FRAMES_2_VIDEO`, or `REFERENCE_2_VIDEO` |
| `aspect_ratio` | string | No | `16:9` (default), `9:16`, or `Auto` |
| `duration` | integer | No | 4, 6, or 8 seconds (default: 8) |
| `resolution` | string | No | `720p`, `1080p` (default), or `4k` |
| `callBackUrl` | string | No | Webhook for completion notifications |
| `watermark` | string | No | Text watermark for video |
| `enableTranslation` | boolean | No | Auto-translate prompt to English (default false) |

## Example request (verbatim)
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

## Response (Code 200, verbatim)
```json
{ "code": 200, "msg": "success", "data": { "taskId": "veo_task_abcdef123456" } }
```

## Polling + callback
- Poll the separate "Get Video Details" endpoint with the `taskId` to retrieve `resultUrls` once generation completes.
- Or set `callBackUrl`; system POSTs:
```json
{
  "code": 200, "msg": "Veo3.1 video generated successfully.",
  "data": { "taskId": "veo_task_abcdef123456",
            "info": { "resultUrls": "[http://example.com/video1.mp4]", "resolution": "1080p" } }
}
```
Gotcha: `REFERENCE_2_VIDEO` mode currently only supports `duration` = 8 seconds.

## Annotations for weapon-forge
- This is the AUTHORITATIVE Veo request/response contract. weapon-forge should put it in `guides/video-kie-ai.md` as a worked example: a small Node fetch() that POSTs to `/api/v1/veo/generate`, reads `data.taskId`, then polls Get-Video-Details until `resultUrls` is populated.
- For social: set `aspect_ratio: "9:16"` for vertical Reels/TikTok/Shorts; `model: "veo3_fast"` is the cost-sane default ($0.40/8s, see pricing note file); upgrade to `veo3` only for the hero "right hook" clip.
- The async taskId+poll pattern mirrors the social-publishing-guardian push-manifest discipline: store the taskId, make the poll idempotent, persist the final MP4 URL.
- `imageUrls` (1-3) enables image-to-video: feed a brand photo or a rendered card as the first frame so the AI clip stays on-brand. `FIRST_AND_LAST_FRAMES_2_VIDEO` can bookend a clip with brand frames.
- Wrap the kie.ai clip with a HyperFrames logo intro/outro (see hyperframes-video/) authored from the SAME brand spec so the premium clip is bookended on-brand.
- VERIFY LIVE before committing per client (brief flags video maturity as a spike): the endpoint path and param names should be re-confirmed against docs.kie.ai at build time.
