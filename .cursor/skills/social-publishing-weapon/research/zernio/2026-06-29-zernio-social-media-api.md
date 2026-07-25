---
source_url: https://zernio.com/social-media-api
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: zernio-api
weapon: social-publishing-weapon
---

# Zernio Social Media API (official product page + technical detail)

## Summary
Zernio's official API page. This is the single most valuable NEW source for this run: it gives the actual Zernio create-post payload shape, base URL, and auth model, which the hand-authored arsenal weapon did NOT have (the arsenal only described Zernio at a high level: "one REST API to 15 platforms, OAuth-connected accounts, free tier 2 accounts"). This fills the biggest gap the brief asked for.

## Key quotations / statistics
- Base URL: `https://zernio.com/api/v1`
- Auth: Bearer token (API key) in the `Authorization` header. "Simple API Key Auth. Bearer token auth. No OAuth complexity." (The OAuth flows are Zernio-side for connecting end-user accounts; the DEVELOPER calls the API with a simple API key.)
- Create post endpoint: `POST /posts`
- Request body fields:
  - `content` - post text/caption
  - `scheduledFor` - ISO 8601 timestamp, e.g. `"2026-03-15T10:00:00Z"`
  - `timezone` - e.g. `"America/New_York"`
  - `platforms` - array of `{ "platform": "<name>", "accountId": "<id>" }` objects
- Example platforms array (verbatim):
```json
[
  {"platform": "twitter", "accountId": "acc_123"},
  {"platform": "linkedin", "accountId": "acc_456"}
]
```
- 15 platforms: Twitter/X, Instagram, TikTok, LinkedIn, Facebook, YouTube, Threads, Reddit, Pinterest, Bluesky, Google Business, Telegram, Snapchat, WhatsApp, Discord.
- Account model: each connected social account "receives a unique ID for API calls," linked via OAuth, referenced by `accountId`.
- Free tier: "First 2 social accounts free with unlimited posts and full API access. No credit card required."

## Annotations for weapon-forge
- NEW vs for-now weapon: the arsenal weapon had NO concrete Zernio payload. This source supplies it: `POST https://zernio.com/api/v1/posts` with `{content, scheduledFor, timezone, platforms:[{platform,accountId}]}` and `Authorization: Bearer <API_KEY>`.
- IMPORTANT publish-gate GAP for Zernio: this page documents `scheduledFor` (scheduled) but does NOT explicitly expose a `draft`-only state on this page. The arsenal weapon's invariant ("confirm the platform's actual publish semantics before trusting any scheduled state, same lesson as GHL") therefore HOLDS and is UNRESOLVED here. Open question: does Zernio support a true draft / human-approval state, or does `scheduledFor` auto-publish at its time the way GHL `status:"scheduled"` does? Must be verified live before trusting. See zernio docs note files for any draft-state finding.
- Zernio's account model differs from GHL: GHL accountId is a composite string `<oauthBlock>_<locationId>_<handle>_<suffix>`; Zernio's is a short opaque `acc_123`. weapon-forge should document the two account-id shapes side by side.
- Zernio reaches the platforms GHL cannot (X, Threads, Bluesky, Reddit, Pinterest, Discord, Telegram, Snapchat, WhatsApp), confirming the provider-selection table's Zernio column.
