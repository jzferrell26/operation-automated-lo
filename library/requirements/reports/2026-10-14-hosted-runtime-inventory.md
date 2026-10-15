# Hosted runtime inventory

Read-only inspection on October15 UTC (October14 Chicago) identified Vercel project `prj_3vsGKbHLbEmJBkokUpE3eRNXoRz2`, `operation-automated-lo-web`, under Jonathan Ferrell's scope `jonathan-ferrell`. The connector's default scope returned404; the existing authenticated CLI resolved the correct project with that explicit scope. No cross-project fallback was used.

Production alias `operation-automated-lo-web.vercel.app` resolves to READY deployment `dpl_6jCZMp9cq9U7YZdhGwzLGDVtJAbQ`. Selected deployment metadata identifies branch main and exact commit `ccc705e7462948309e4e98f26304b9d84d5d324a`, the merged restart checkpoint. Its root directory is apps/web and Node version24.x. PR100's new runtime and migrations are not on that deployment.

The environment inventory was read by name only. Existing report, live-data, monthly-allowance, delivery, funnel-publication, database, session and cron setting names are present. The listed Production settings do not include `OALO_RENTCAST_API_KEY`, `OALO_HOMEOWNER_ALLOWED_LOCATION_IDS` or the new domain provider configuration names. Values were not decrypted, so presence does not establish that any flag is enabled or a connection is qualified. No environment pull, credential read or configuration write occurred.

A public unauthenticated request to `/marketing/campaigns/library` responded200 with no-store headers and sign-in content. That establishes reachability, not authenticated library contents. Browser inventory remains empty. The controlled Supabase inventory is recorded separately and establishes the missing hosted migrations.

No deployment, production alias, environment value, DNS, provider credential, customer record, live lookup, ad or message changed during this inspection.
