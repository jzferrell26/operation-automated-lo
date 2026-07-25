---
source_url: https://marketplace.gohighlevel.com/docs/ghl/social-planner/social-media-posting-api/index.html
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: ghl-auth-endpoints
weapon: social-publishing-weapon
---

# GHL Social Media Posting API: overview, endpoints, and AUTH (corroborates sub-account-PIT rule)

## Summary
The Social Media Posting API overview page. This is the strongest PUBLIC corroboration of two arsenal invariants: (1) the sub-account-vs-agency token rule, and (2) the `2021-07-28` version header. It also enumerates the full endpoint surface (Post, Account, CSV, OAuth, Category, Tag, Statistics, Category Queue, Comments).

## Key quotations / statistics
- AUTH (verbatim intent): the API requires bearer token auth using either an "Access Token generated with user type as Sub-Account (OR) Private Integration Token of Sub-Account" for sub-account operations, or agency-level credentials for agency operations.
- API versions referenced on the page: `v3`, `2023-02-21`, `2021-07-28`, `2021-04-15` - "suggesting version-specific differences exist."
- Endpoint surface: Post (create/retrieve/list/edit/delete), Account, CSV (bulk), OAuth | Generic, Category, Tag, Statistics, Category Queue, Comments.
- Base URL not stated on this page (the arsenal's verified base is `https://services.leadconnectorhq.com`).

## Annotations for weapon-forge
- CORROBORATION (strong) of the sub-account-PIT rule: the official docs explicitly say sub-account operations need a "Sub-Account" user-type token OR a "Private Integration Token of Sub-Account." This confirms the arsenal's directive #4 and the `401 Token's user type mismatch!` footgun: an agency token on a location endpoint is the wrong user type. PUBLICLY CONFIRMED.
- RESOLVES THE VERSION DISCREPANCY: the create-post marketplace page rendered `Version: v3`, but this overview lists `2021-07-28` among the valid versions. The arsenal's verified-live `Version: 2021-07-28` is therefore a VALID, documented version, not an error. weapon-forge should use `2021-07-28` (verified live) and note `v3` exists as a newer version the operator MAY test but should not assume. Flag: version-specific field differences "exist" per the docs, so a version change could alter the payload contract - pin the verified version.
- The Account endpoint corroborates the arsenal's `GET /social-media-posting/{loc}/accounts` discovery step.
- The CSV endpoint (bulk) is a future enhancement path for multi-post fan-out; Comments/Statistics endpoints are out of this Weapon's publishing scope but worth a one-line "exists, not owned here" note.
- Base URL stays verified-internal: `https://services.leadconnectorhq.com` (the arsenal value); the marketplace docs do not print it.
