# gohighlevel-weapon

The GoHighLevel (LeadConnector) V2 API arsenal for `gohighlevel-guardian`.

GHL is the **system of record for deals** in the Whetstone studio. This weapon covers the
mechanics the repo depends on every day: reading pipelines + paginated opportunities,
resolving custom-field `fieldKey`s, writing edits back, creating opportunities, resolving
owner ids to names, staying inside the rate limit, and — most importantly here — keeping the
GHL → `Deal[]` transform in lockstep across its three runtimes.

Start at `SKILL.md` (master index + routing table). The non-negotiables are in
`guides/00-principles.md`. For how GHL is wired into *this* codebase specifically, read
`guides/07-this-repo-integration.md`.

Base URL: `https://services.leadconnectorhq.com` · required header `Version: 2021-07-28` ·
V2 only (V1 EOL 2025-12-31).
