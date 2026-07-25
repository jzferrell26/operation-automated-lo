---
source_url: https://docs.kie.ai/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: kie-ai
weapon: social-creative-weapon
---

# kie.ai pricing, getting-started, and the operational gotchas

## Summary
The kie.ai getting-started doc nails the operational contract the for-now weapon only guessed at: async task model (200 = task CREATED not done), Bearer auth, rate limits (20 req / 10s, HTTP 429 NOT queued), 100+ concurrent tasks, and - the load-bearing gotcha - generated files are retained only 14 days, so you MUST download/re-host the MP4 promptly. Pricing corroborated from kie.ai pricing pages: $0.005/credit, Veo 3 Fast 8s+audio = $0.40 (80 credits), Veo 3 Quality 8s+audio = $2.00 (400 credits).

## Key quotations / statistics
- Auth: `Authorization: Bearer <YOUR_API_KEY>` + `Content-Type: application/json`. Get key at https://kie.ai/api-key.
- "A 200 OK response only means the task was successfully created. It does not mean the task is completed."
- Rate limits: "Maximum 20 generation requests per 10 seconds", "Supports 100+ concurrent running tasks", "Exceeded requests return HTTP 429 (not queued)."
- Data retention (CRITICAL): "Generated files: 14 days. Log records: 2 months. Download results promptly for long-term storage."
- Pricing: "$0.005 per credit." "Veo 3 Fast Video (8 seconds, with audio) costs $0.40 (80 credits)", "Veo 3 Quality Video (8 seconds, with audio) costs $2.00 (400 credits)." Rates "typically 30%-50% lower than official APIs", "up to 80%" on select models; "over 60% savings compared to ... Replicate and Fal.ai."
- Free signup credits available (search reports ~5,000 credits / ~20+ Veo 3.1 clips for new users; verify live).
- Security: "Never expose your API key in frontend code" or public repos; IP whitelist; per-key rate limits.
- Support hours UTC 21:00-17:00; support@kie.ai; Discord/Telegram via dashboard. Model catalog at https://kie.ai/market.

## Annotations for weapon-forge
- THE 14-DAY RETENTION RULE is the single most important operational gotcha and must be a guardrail in the weapon: after a kie.ai clip finishes, immediately download the MP4 and commit/host it (or hand to social-publishing-guardian). Do not rely on the kie.ai resultUrl staying live - it expires.
- "200 = created, not done" means the weapon's kie.ai example MUST poll (or use callBackUrl). Never treat the create response as the finished asset.
- Rate limit 20/10s + 429-not-queued means the weapon's batch path needs client-side throttling/backoff; do not fire-and-forget a campaign of clips.
- Pricing table for the weapon's decision guide: Veo 3 Fast $0.40 (default jab-clip), Veo 3 Quality $2.00 (hero right-hook), Kling for image-to-video animation of a brand still. $0.005/credit is the unit.
- API-key handling is a security guardrail: env var only, never in the committed generator, never in frontend - aligns with the repo's no-secrets-in-git and hivemind-no-PII rules.
- CORROBORATES + sharpens the for-now weapon's "~30% under official pricing, verify live" bullet with exact numbers, the credit rate, retention window, and rate limits.
