# 01 — Auth & tokens

## The two ways to authenticate V2

| | Private Integration Token (PIT) | OAuth 2.0 (Marketplace app) |
|---|---|---|
| Best for | Internal tools, single sub-account (**this repo**) | Multi-account apps distributed via the Marketplace |
| Setup | Generate a token in the sub-account → use as `Bearer` | Register an app, run the auth-code flow, refresh tokens |
| Scope | The one location it was created in | Per-install, per-location |
| Token rotation | Manual | Refresh-token rotation |
| Rate limit bucket | Per resource | Per Marketplace app per resource |

**This repo uses a token as `Bearer`** (`GHL_API_TOKEN`, also accepts `GHL_LOCATION_API_KEY`).
For an internal single-sub-account tool, a Private Integration Token is the right call — no OAuth
dance, no refresh plumbing. Recommend OAuth only if the studio ever becomes a distributable
Marketplace app spanning many clients' locations.

## Required on every request
```
Authorization: Bearer <token>
Version: 2021-07-28
Accept: application/json
```
The `Version` header is **mandatory** on V2. Missing it is a quiet 4xx. (`Content-Type:
application/json` on writes.)

## Location scoping
Everything is scoped to a **location** (sub-account). Pass `location_id` / `locationId` on
endpoints that require it (opportunities search, pipelines, custom fields, users). A token only
sees its own location's data.

## Decision checklist
- Single internal sub-account, server-side caller → **Private Integration Token**.
- Need to act across many clients' locations from one distributed app → **OAuth 2.0**.
- Token is currently a location API key (legacy) → still works as `Bearer`, but prefer a
  Private Integration Token going forward; V1 keys/endpoints are EOL (2025-12-31).

## Hand-offs
- "Is the token leaking into the client bundle / is rotation safe?" → `security-guardian`.
- "Where do I set the secret on Lovable Cloud?" → `devops-guardian`.
