# Explicit test role Security self-review

Scope: the post-106a639 change in packages/db/test/campaign-integration-support.mjs. Author review performed inline under the sequential-work instruction. This is not independent review. Earlier integration reviews remain evidence for their original snapshot only.

The CI run38673972016 database job116223250049 reports CONNECTION_CLOSED in the authentication before hook, then all16 authentication cases fail. Its other153 native integration cases pass. This is consistent with the Supabase role-specification crash reported at https://github.com/supabase/postgres/issues/2348 and https://github.com/supabase/postgres/issues/2325; the job did not retain a server backtrace, so the precise crash cause remains an inference pending the next CI run.

At campaign-integration-support.mjs:97, the trusted database now returns quote_ident(current_user). At lines107 and132, only that server-quoted authenticated identifier is interpolated into the two fixed capability grants and their restoration. No caller role, browser input or environment-supplied SQL identifier enters the statement. SELECT comparisons still use current_user normally. Loopback, exact disposable database name, current_database match, grantor-specific restoration, no inherited capability and bounded pool cleanup remain enforced. No production grants, function bodies, migrations, runtime capability or secrets change.

Result: no blocking Security finding in this delta. All16 native authentication cases pass on PostgreSQL17.11 under a non-superuser, non-CREATEROLE, NOINHERIT login, with exact before/after membership restoration. The Supabase-specific CI confirmation is still required. Whole-product and live-provider holds remain.
