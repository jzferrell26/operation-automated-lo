# Research Summary: supabase-platform-weapon

**Depth consumed:** deep. **Files written:** 7 source notes + plan + index + this summary (10 total in `research/`). **Window:** 2026-current (Supabase CLI v2 / config-as-code). **Tooling:** WebSearch + WebFetch against `supabase.com`; Firecrawl/Exa were not available in this environment, so web tools were used and the pipeline was NOT blocked (per the dms-hand environment-adaptation directive).

## The domain in one paragraph
supabase-platform-guardian deploys and wires the Supabase PLATFORM layer: Edge Functions (Deno), Auth and the custom access-token hook, Realtime, Storage, RLS enforcement patterns, and the CLI + Management-API workflow against a local stack and a linked cloud project. It DEPLOYS what db-guardian designs. The whole deploy spine runs on a single `SUPABASE_ACCESS_TOKEN`.

## The five facts that shape every guide (verified on a real deploy this week)
1. **Token-only deploy.** `supabase db push` and `supabase functions deploy` work with only `SUPABASE_ACCESS_TOKEN` + a linked ref. No DB password or service-role key needed for those.
2. **Management API runs arbitrary SQL.** `POST /v1/projects/{ref}/database/query` executes SQL with just the token. Build the JSON body with `jq -Rs '{query:.}'` so multi-line SQL escapes correctly. (One generic search result wrongly claimed no such endpoint exists; ground truth overrides it.)
3. **The auth hook must be ENABLED, not just defined.** Define the Postgres `custom_access_token_hook(event jsonb)` in a migration, THEN enable it via `PATCH /v1/projects/{ref}/config/auth` (or `config.toml [auth.hook.custom_access_token]` + `config push`). Defined-but-disabled is the #1 Supabase auth failure. Verify the `app_role` claim in a fresh JWT.
4. **Edge Functions auto-inject keys.** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (plus `SUPABASE_DB_URL`, `SUPABASE_JWKS`, newer key dictionaries) are present in local AND hosted runtimes. Never re-declare them as user secrets; only set genuinely external secrets.
5. **Admin users via REST.** `POST {url}/auth/v1/admin/users` with the service-role key (server-side only) creates users and can pre-seed `app_metadata.app_role`.

## Supporting facts
- `verify_jwt = true` (default) for user-facing functions; `false` for webhooks (validate the provider signature in-handler).
- RLS performance: wrap `auth.uid()` as `(select auth.uid())` for initPlan caching; use `security_invoker = true` views so a view obeys the querying user's RLS (the security advisor flags `security definer` views).
- service-role bypasses RLS, so always verify enforcement with a REAL user token, never the service-role client.
- Realtime Broadcast/Presence authz is RLS on `realtime.messages` with `private: true` channels; Postgres Changes already respects table RLS. Storage authz is RLS on `storage.objects` (scope by `bucket_id` + `storage.foldername(name)`); private data goes in a private bucket served via signed URLs.
- Local stack is the rehearsal: `db reset` re-applies migrations + seed; `supabase test db` runs pgTAP from `supabase/tests/` (each test in a rolled-back transaction).

## Open questions (carry into the weapon as TODO where unresolved)
1. Exact JSON field names on the `PATCH /config/auth` body for the hook (`hook_custom_access_token_enabled` / `hook_custom_access_token_uri` are the observed names; confirm against the live Management API for the project's CLI version).
2. Whether the project is on legacy keys (`anon`/`service_role`) or the newer publishable/secret keys; the guides cover both, the operator confirms which.
3. BIMI / advanced auth surfaces are out of scope (auth-guardian owns provider/app-flow choices).
4. The precise `config.toml` schema version for `[auth.hook.custom_access_token]` (CLI v2+); pin to the installed CLI.
5. Rotation policy for secrets set via `secrets set` is security-guardian's call, not this Guardian's.

## Sources to re-fetch if stale
- Supabase CLI reference (`supabase-db-push`, `supabase-functions-deploy`, `supabase-link`).
- Management API reference (`/database/query`, `/config/auth`).
- Custom Access Token Hook + Auth Hooks docs.
- RLS + RLS-performance troubleshooting docs.
- Realtime Authorization + Storage access-control docs.

Ready to hand off to **weapon-forge**.
