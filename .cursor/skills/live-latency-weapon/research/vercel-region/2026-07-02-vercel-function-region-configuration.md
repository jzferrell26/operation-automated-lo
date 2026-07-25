---
source_url: https://vercel.com/docs/functions/configuring-functions/region
retrieved_on: 2026-07-02
source_type: official-docs
authority: official
relevance: critical
topic: region-config
weapon: live-latency-weapon
---

# Configuring regions for Vercel Functions

## Summary
Official Vercel docs (last updated 2026-06-02) on configuring the region a Vercel Function executes in. Establishes that the default region for all new projects is `iad1` (Washington, D.C.), which is close to most East Coast US data sources but can be far from a database hosted elsewhere (e.g. a Supabase project in `us-west-2`/Oregon). Region is set via the `regions` key in `vercel.json`, per-function overrides via the `functions` property, or the CLI `--regions` flag. This is the exact mechanism behind the one-line fix in the cuantico-sms precedent (`"regions": ["pdx1"]`).

## Key quotations / statistics
- "By default, Vercel Functions execute in Washington, D.C., USA (`iad1`) for all new projects to ensure they are located close to most external data sources, which are hosted on the East Coast of the USA."
- "In a globally distributed application, the physical distance between your function and its data source can impact latency and response times. Therefore, Vercel allows you to specify the region in which your functions execute, ideally close to your data source (such as your database)."
- Config example: `{ "$schema": "https://openapi.vercel.sh/vercel.json", "regions": ["sfo1"] }`
- Per-function override example shows `regions` and `functionFailoverRegions` set independently per file path in the `functions` object, useful "when different functions access different data sources in different regions."
- Plan limits: Hobby = single region, Pro = 5 regions, Enterprise = all regions. "Deploying to more regions than your plan allows causes the deployment to fail before the build step."
- Warning: "If your functions communicate with external services, choosing regions far from those services increases latency. Select only regions close to your external services."
- "Vercel deploys Routing Middleware to all regions by default, regardless of your region settings." (Middleware itself is not subject to the same region pin as Functions.)

## Annotations for weapon-forge
- This is the primary citation for the Guardian's Action 1-2 (curl/header forensics leading to a region-mismatch diagnosis and fix). Use the exact `vercel.json` `regions` syntax as the canonical fix-menu entry for the region-mismatch class of bug.
- Note the distinction between Functions (region-pinnable) and Routing Middleware (always multi-region) -- this matters for diagnosing where auth/session round trips actually execute versus where the page-render function executes. A guide should flag this nuance so operators do not assume pinning `regions` also pins middleware execution.
- No contradiction with other sources in this folder.
