# Production schema operation, October15

Outcome: the two approved, unchanged migrations were applied to operation-automated-lo (vonesqpyfsrhasuxfiiz). Hosted inventory increased17 to19, recording original versions20261013210000 financing_media and20261013230000 webinar_ad_destination. Later main/PR100 domain, publisher, financing-release and provider-budget migrations remain excluded. Source27 versus hosted19 leaves eight versions outside this operation.

Jonathan Ferrell approved the original packet and renewed execution after reconnecting his personal Supabase account with "Ok lets do this". Chief operated and owns rollback. Fresh preflight began October15 at09:17:50America/Chicago (14:17:50UTC); apply and catalog/runtime checks completed before09:29:05Chicago, inside the30-minute window. The project/organization/us-east-1/PostgreSQL17 identity, exact17 initial records, missing new objects, existing prerequisites and restricted web role matched the packet. Production remained READY build dpl_6jCZMp9cq9U7YZdhGwzLGDVtJAbQ on ccc705e7462948309e4e98f26304b9d84d5d324a throughout. No new web deployment was performed.

Original frozen manifest SHA2566bd86c6b33946a02bed75ee8a943c6da3a0a51d7c04453646877e0d9f8b5f887, financing_media SQL63a525c6970166fa76391a69772c99fa51ba93ffed1780dee04f9b901146c77c, webinar_ad_destination SQL8165cd4d7f27776d902a56ccf9f95818e1419239b972db9af7374f51059a3620. These exact deployed-commit bytes were used from the isolated19-file cutoff directory. The frozen manifest's PENDING field remains unmodified; human approvals and execution are recorded here separately.

## Tool failure and correction

Official CLI2.109.1 linked and dry-ran exactly the two files, then failed the first migration's appended history INSERT with42501. Execution stopped; read-back showed17 records, neither table and no destination function, confirming rollback. Catalog showed temporary cli_login_postgres NOINHERIT with no direct history access, but existing permission to SET postgres. The migration already ends with RESET ROLE, exposing the [documented CLI failure](https://github.com/supabase/cli/issues/6236).

The official [vendor fix6246](https://github.com/supabase/cli/pull/6246) restores the intended administrator role after role reverts and before CLI history writes without recording modified SQL. Official stable CLI2.121.0 contains merge0c721790ff19cdf020e3896e5351fbfb16d6c63d, confirmed by GitHub comparison. Only the execution tool changed; no SQL rewrite, manual history DML, runtime grant or credential extraction occurred. Its repeated linked dry run listed exactly the two original files. Its actual push succeeded and migration list reported all19 local/remote versions matching within the approved cutoff.

## Security verification

Both new tables belong to migration_owner, enable and force RLS, grant app_runtime SELECT/INSERT only, deny UPDATE/DELETE and public access, and carry the two enabled immutable-mutation triggers. All four destination functions belong to migration_owner and are security definers with PUBLIC execution revoked. app_runtime can execute the three scoped readers, but not the private authorization predicate. oalo_web still cannot SET migration_owner.

In a rolled-back app_runtime transaction without any tenant/session context, both media tables exposed zero rows and all three destination readers returned null. This proves refusal under missing context; it is not a tenant save/upload test. No customer rows were created by verification.

## Quality verification and limits

The exact approved versions/names,19-record inventory, object owners/RLS/ACL and no-context refusal checks passed after Security verification. Existing sign-in and library routes returned200. An actual signed-in browser reload then loaded the ad library with15 pending-review creatives. Homeowner reports loaded and correctly reported valuations unavailable, with zero saved reports in the account. No provider account, allowance, flag, storage permission, public collection, ad launch, DNS or customer message was activated.

The live walkthrough also found an existing /overview500 on the unchanged production build. Runtime logs identify eager Playwright initialization and missing browser metadata, not a migration SQL error. The separate main-based Home runtime repair is prepared with a RED/GREEN regression and compiled-route proof. Thus this is a passed narrow database operation, not a whole-app healthy verdict or completed signed-in save/photo journey.

Rollback remains roll-forward: retain additive objects and immutable records, stop further rollout on failure, preserve the current web deployment/configuration, and review any further operation separately. PR100's implementation head dcb83ac passed all four canonical CI jobs in run38722786143; it remains draft with unfinished customer/provider work. This receipt changes none of those gates.
