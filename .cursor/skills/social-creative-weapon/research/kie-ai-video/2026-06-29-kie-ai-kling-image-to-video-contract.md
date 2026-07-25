---
source_url: https://docs.kie.ai/market/kling/image-to-video
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: kie-ai
weapon: social-creative-weapon
---

# kie.ai Kling image-to-video API - unified jobs/createTask contract

## Summary
kie.ai's newer models (Kling 2.6) use a UNIFIED endpoint `POST /api/v1/jobs/createTask` with a `model` field and an `input` object, distinct from the older Veo `/api/v1/veo/generate` shape. Same Bearer auth, same taskId+poll pattern. For social: Kling is the image-to-video tier - feed a brand photo or a rendered card and animate it into a 5s/10s clip. Useful when Veo's text-to-video isn't on-brand enough and you want to drive motion from an existing brand frame.

## Endpoint + auth
- `POST https://api.kie.ai/api/v1/jobs/createTask`
- `Authorization: Bearer YOUR_API_KEY`
- `model`: `kling-2.6/image-to-video`

## Request body (input object)
Required:
- `prompt` (string, max 1000 chars)
- `image_urls` (array, max 1 item; JPEG/PNG; max 10MB)
- `sound` (boolean - include audio)
- `duration` (string `"5"` or `"10"`)
Optional:
- `callBackUrl` (URI webhook)
Not present in this model: `negative_prompt`, `cfg_scale`, `mode` (older Kling docs list these; the 2.6 kie.ai spec does not).

## Response (verbatim)
```json
{ "code": 200, "msg": "success", "data": { "taskId": "task_kling-2.6_1765182405025" } }
```
Status via the separate unified query endpoint, polled by taskId.

## Annotations for weapon-forge
- KEY ARCHITECTURE NOTE for the weapon: kie.ai has TWO request shapes. Older Veo path = `/api/v1/veo/generate` (flat params). Newer market models (Kling 2.6, and likely Seedance/Runway) = `/api/v1/jobs/createTask` with `{ model, input: {...} }`. weapon-forge should document both and prefer `jobs/createTask` as the forward-looking unified shape.
- For on-brand social: Kling image-to-video is the "animate a brand still" tool - feed a cropped square brand photo (from the sharp pipeline) as `image_urls[0]`, prompt the motion, get a 5s clip. Pairs with a HyperFrames logo outro.
- `image_urls` max 1 item and 10MB - the sharp-cropped 1080 PNG is well under that.
- Same idempotent taskId+poll discipline as Veo; reuse one kie.ai client wrapper for both shapes.
- VERIFY LIVE at build time (video layer is a per-client spike per the brief).
