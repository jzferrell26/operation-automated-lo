# Research Plan: social-publishing-weapon

- **Depth tier:** deep
- **Time window:** 2025-12-29 back to 2026-06-29 (6 months default), extending to 2025-06 (12 months) where substantive 2026 material is thin (provider docs change slowly).
- **Page budget target:** thousands-of-pages tier; in practice bounded by WebSearch/WebFetch (no Firecrawl/Exa connected). Target ~25-40 high-signal unique sources filed across 5 subfolders, prioritizing provider primary docs.
- **Source breadth target:** official provider docs (GHL/LeadConnector, Zernio, Ayrshare, Blotato, Buffer, Postiz, Mixpost), provider marketplace/API reference, practitioner blogs, GitHub READMEs, comparison/pricing pages, community threads (Reddit/forums) where they corroborate footguns.

## Tooling note (IMPORTANT)

Firecrawl and Exa are NOT connected in this environment. This run used the built-in
**WebSearch** + **WebFetch** tools instead. GHL marketplace pages (marketplace.gohighlevel.com,
highlevel.stoplight.io) are JS-rendered and frequently 404 or return empty to the fetcher;
where that happened, search-result snippets and mirror/aggregator pages were used and the
limitation is flagged on the affected source notes.

## Verified-internal caveat (carry into every GHL note)

The GHL Social Planner payload specifics in the hand-authored arsenal weapon
(`~/.claude/skills/social-publishing-weapon/SKILL.md`) were **verified LIVE on 2026-06-29**
against real client location `z1iSilSVX6vJSU01d92u`. Public GHL docs for the social-media-posting
API are THIN and partially behind the developer portal. loremaster's job: corroborate the verified
runbook against public docs **where possible**, and clearly mark which payload fields are
verified-internal vs publicly documented. Do NOT downgrade the verified runbook when public docs
are silent; absence of public docs is not contradiction.

## Initial queries (from session-zero backlog entry 8)

- "GoHighLevel LeadConnector Social Planner API create post scheduled draft approval 2026"
- "Zernio REST API MCP server multi-platform social publishing Instagram TikTok LinkedIn 2026"
- "social media publishing API comparison Ayrshare Blotato Buffer Postiz Mixpost self-hosted 2026"
- "GoHighLevel social planner API userId required media array accountIds 422 gotchas 2026"
- "scheduled vs draft auto-publish approval gate social automation safety 2026"
- "GoHighLevel sub-account PIT vs agency token location endpoint 401 user type mismatch 2026"
- "idempotent social post push manifest dry-run resume hosted image URL 2026"

## Command Brief's 5 queries (overlapping, run as worded)

- "GoHighLevel Social Planner API create post accountIds media 2026"
- "Zernio social media API 15 platforms OAuth MCP 2026"
- "social publishing API Ayrshare Blotato Buffer comparison 2026"
- "GHL social post scheduled vs draft auto-publish approval 2026"
- "social media post idempotency manifest dry-run multi-account 2026"

## Expansion queries (authored by loremaster, deep tier)

### Branch from GHL Social Planner
- "highlevel.stoplight.io social-media-posting API reference create post 2026"
- "GoHighLevel Private Integration Token socialplanner scopes 2026"
- "LeadConnector social media posting CSV bulk upload accounts list endpoint 2026"
- "GoHighLevel social planner OAuth scopes social-media-posting.write 2026"

### Branch from Zernio
- "Zernio API authentication endpoints post create 2026"
- "Zernio pricing free tier accounts platforms 2026"
- "Zernio MCP server AI agent social posting 2026"
- "docs.zernio.com create post media schedule draft 2026"

### Branch from alternative providers
- "Ayrshare API post endpoint platforms pricing 2026"
- "Ayrshare vs Blotato pricing platforms 2026"
- "Blotato API social posting platforms pricing 2026"
- "Buffer API publish update create endpoint deprecated 2026"
- "Postiz self-hosted open source social scheduler API 2026"
- "Mixpost self-hosted social media management API 2026"

### Branch from publish gate
- "Ayrshare scheduleDate immediate publish vs draft approval 2026"
- "social media API approval workflow draft state human review 2026"

### Branch from idempotency
- "idempotency key social post create dedupe re-run 2026"
- "dry-run multi-account social post manifest resume pattern 2026"
