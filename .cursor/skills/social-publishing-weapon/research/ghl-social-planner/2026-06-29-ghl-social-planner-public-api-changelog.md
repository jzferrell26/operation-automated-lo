---
source_url: https://ideas.gohighlevel.com/changelog/public-apis-are-now-available-for-social-planner
retrieved_on: 2026-06-29
source_type: changelog
authority: official
relevance: critical
topic: ghl-scopes-modules
weapon: social-publishing-weapon
---

# GHL Changelog: Public APIs now available for Social Planner

## Summary
The official HighLevel changelog announcing the Social Planner public API. This is the BEST public corroboration of the arsenal weapon's scope and account-discovery claims. It enumerates the exact six scopes, the Posts/Accounts/OAuth module set, the platform coverage, and the future-phase modules (csv, stats, etc.). It directly confirms the verified-internal runbook's `socialplanner/account.readonly` and `socialplanner/post.write` scopes.

## Key quotations / statistics
- "release of public API support for Posts, Account and OAuth Modules in Social Planner as part of the Phase 1 release."
- Six scopes (verbatim):
  - `socialplanner/account.readonly` and `socialplanner/account.write`
  - `socialplanner/post.readonly` and `socialplanner/post.write`
  - `socialplanner/oauth.readonly` and `socialplanner/oauth.write`
- OAuth platform coverage (9): Facebook, Google My Business, Instagram, LinkedIn, TikTok, TikTok Business, Twitter (list rendered as "nine platforms").
- Post endpoints (5 operations): retrieve a single post, list posts with filtering, create, update, delete (by locationId + postId).
- Account & OAuth endpoints: account retrieval and deletion by locationId; OAuth flows to initiate connections and retrieve platform profiles (Facebook pages, GMB locations, Instagram accounts, LinkedIn pages, TikTok profiles, Twitter profiles) by accountId.
- Future phases: "group, stats, csv, rss, review, tags, categories, settings APIs in multiple phases."

## Annotations for weapon-forge
- CORROBORATION (strong): the arsenal weapon names exactly `socialplanner/account.readonly` + `socialplanner/post.write` as the required scopes. This changelog confirms both are real, published scopes. Treat the scope requirement as PUBLICLY CONFIRMED.
- CORROBORATION: the Accounts module (GET accounts by locationId) and the post create/get/list/delete operations the arsenal runbook uses are all officially published. The arsenal's `GET /social-media-posting/{loc}/accounts`, `POST /posts`, `GET /posts/{id}`, `POST /posts/list`, `DELETE /posts/{id}` map onto the published Posts + Accounts module set.
- GAP still verified-internal: the changelog does NOT document the draft-vs-scheduled auto-publish semantics, the userId-required 422, or the media-array 422. Those remain live-test findings. The "csv" and "stats" modules are future phases, so the arsenal's silence on them is correct.
- The future-phase `csv` module is worth a weapon-forge TODO: a bulk CSV upload path may eventually replace manual multi-post fan-out.
- TikTok appears twice (TikTok + TikTok Business) - weapon-forge should note both account types exist when building the {platform: accountId} map.
