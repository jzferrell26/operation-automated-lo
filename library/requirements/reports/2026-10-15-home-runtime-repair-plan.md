# Home runtime import repair

Production on ccc705e fails GET /overview while importing the rendering barrel: its eager Playwright export loads browser metadata absent from the Vercel function. Actual request logs show the missing playwright-core/browsers.json module. This is an application import failure, not a failed database read. The signed-in ad library and homeowner page load successfully.

Work sequentially from current main in codex/home-runtime-repair-20261015. Route implementation to typescript-node-guardian, then Security self-review, Quality self-review and PR review. These are author self-reviews under the project instruction, not independent reviews.

1. Reproduce the failure at the package import boundary with a deliberately unavailable browser runtime. Ordinary exports and constructing the adapter must remain possible.
2. Defer loading Playwright until the existing actual browser-launch path. Preserve strict types, render validation, deny-all network policy, asset rights/hash checks, launch errors and existing cleanup. Do not add an alternate renderer or claim hosted browser rendering works.
3. Verify the regression, existing browser-adapter tests, related rendering suites, package/web/tooling types and production build. No baseline, migration, dependency, provider or runtime grant change.
4. Complete Security, Quality and PR closeout on the exact fix. Fetch current main and confirm mergeability. Production deploy is a separate reviewed operation; do not deploy unfinished PR100 source to repair this page.

Separately, the approved original financing_media and webinar_ad_destination migrations were successfully applied to production on October15 with unchanged SQL bytes using official CLI2.121.0 after the older CLI's confirmed role-reset bug rolled back. The resulting19 migration records and forced RLS/scoped ACL/no-context refusals passed. This hotfix needs no database migration.
