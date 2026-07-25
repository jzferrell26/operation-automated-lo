---
source_url: https://marketplace.gohighlevel.com/docs/ghl/social-planner/create-post/index.html
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: ghl-create-post
weapon: social-publishing-weapon
---

# GoHighLevel Create Post API (Social Planner)

## Summary
The official HighLevel marketplace doc for the Social Planner Create Post endpoint. It is the PUBLIC corroboration of the hand-authored arsenal weapon's verified-live runbook. The public doc confirms the endpoint shape, the method, and the core field set (accountIds, summary, media, type, status, scheduleDate, userId) but is thin: it does NOT publicly enumerate the allowed `status` values, the exact 422 error strings, the nested `results.post._id` response path, or the required scopes on this page. Those remain verified-internal (live test 2026-06-29 on location z1iSilSVX6vJSU01d92u).

## Key quotations / statistics
- Endpoint: `POST /social-media-posting/:locationId/posts`
- Required headers: `Authorization` (Bearer token), `Version: v3` (per this marketplace doc page).
- Required body fields: `accountIds`, `summary`.
- Optional body fields: `media`, `type`, `status`, `scheduleDate`, `userId`.
- Success status code: 201.
- "It is possible to create customized posts per channel by using the same platform account IDs in a request and hitting the create post API multiple times with different summaries and account IDs per platform." (from search snippet)
- "The content and media limitations, as well as platform rate limiters corresponding to the respective platforms, are provided" in a platform-limitations reference doc.

## Annotations for weapon-forge
- CORROBORATION: the public doc confirms the verified runbook's endpoint and field set. Treat the arsenal weapon's `POST /social-media-posting/{locationId}/posts` with `accountIds[]/summary/media/type/status/userId/scheduleDate` as PUBLICLY CONFIRMED for the field NAMES.
- CONTRADICTION TO RESOLVE (flag for weapon-forge): this marketplace doc page lists the header as `Version: v3`. The arsenal weapon (verified live) uses `Version: 2021-07-28`. GHL's broader API standard header has historically been `Version: 2021-07-28`; the marketplace docs site sometimes auto-renders a generic `v3` placeholder. The verified-live value (`2021-07-28`) should win for the runbook, but weapon-forge should note both and let the operator confirm at integration time. This is a known GHL marketplace-docs rendering quirk, not proof the runbook is wrong.
- GAP the public doc does NOT fill (keep verified-internal labeling): allowed `status` values, the draft-vs-scheduled auto-publish semantics, the exact 422 strings (media must be an array / userId must be a string), and the `results.post._id` nested id path. Public docs are silent here; absence is not contradiction.
- The "customized posts per channel = multiple calls" note is a useful nuance vs the single-call multi-account fan-out the arsenal documents: one POST with multiple accountIds = ONE identical post to many platforms; per-channel CUSTOM copy requires multiple calls. weapon-forge should document both modes.
- NOTE: marketplace.gohighlevel.com is JS-rendered; WebFetch returned a partial excerpt. Schema completeness limited by the fetcher.
