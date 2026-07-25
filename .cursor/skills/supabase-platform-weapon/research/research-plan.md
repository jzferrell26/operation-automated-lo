# Research Plan: supabase-platform-weapon

**Guardian/Weapon:** supabase-platform-guardian / supabase-platform-weapon
**Depth tier:** deep
**Window:** most-recent-first, 2026-current (Supabase CLI v2 / config-as-code era), back ~12 months as needed
**Researcher:** loremaster (run by dms-hand, Phase 1.5)
**Date:** 2026-06-27
**Tools used:** WebSearch + WebFetch against `supabase.com` (Firecrawl / Exa not available in this environment; the pipeline was NOT blocked, web tools were used instead per the dms-hand environment-adaptation note).

## Why deep

This Guardian DEPLOYS and WIRES the Supabase platform layer in production. Wrong decisions ship broken authorization (a defined-but-disabled auth hook), leak credentials (a service-role key in a client), or corrupt data (mis-escaped arbitrary SQL). The blast radius is real, so the research is deep and every platform fact is grounded.

## Ground truth (verified on a real Supabase deploy the week of this forge)

These facts were PROVEN on a live deploy and take precedence over vaguer or stale general search results:

1. `supabase db push` and `supabase functions deploy` work with only a `SUPABASE_ACCESS_TOKEN` (plus the linked project ref). No DB password or service-role key required for those two.
2. The Management API `POST /v1/projects/{ref}/database/query` runs arbitrary SQL with just the token. Build the JSON body with `jq -Rs '{query:.}'` so multi-line SQL escapes correctly.
3. The custom access-token hook must be ENABLED via `PATCH /v1/projects/{ref}/config/auth` (or `config.toml` + `supabase config push`), NOT merely defined in a migration. Defined-but-disabled is the default failure.
4. Edge Functions auto-inject `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (plus newer `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`). Never re-declare these as user secrets.
5. Create auth users via `POST {url}/auth/v1/admin/users` with the service-role key (server-side only).

Note: one generic web result claimed "the Management API has no arbitrary-SQL endpoint." This is stale/incomplete; the `database/query` endpoint is real and verified. Ground truth wins.

## Query plan (the 7 backlog queries, all executed)

1. Supabase Edge Functions Deno deploy config.toml verify_jwt secrets 2026 -> `01-edge-functions-deno.md`
2. Supabase custom access token auth hook Management API app_role claims 2026 -> `02-auth-custom-access-token-hook.md`
3. Supabase CLI Management API db push functions deploy database query endpoint 2026 -> `03-cli-management-api-deploy.md`
4. Supabase RLS security_invoker views auth.uid re-derivation patterns 2026 -> `04-rls-on-supabase.md`
5. Supabase local stack supabase start db reset pgTAP test database 2026 -> `05-local-stack-pgtap.md`
6. Supabase Realtime Storage production gotchas 2026 -> `06-realtime-storage.md`
7. Supabase cloud vs local config project linking deployment workflow 2026 -> `07-cloud-vs-local-config.md`

Each note carries YAML frontmatter (source type, authority, relevance, topic) and cites the Supabase docs URL(s) it summarizes.
