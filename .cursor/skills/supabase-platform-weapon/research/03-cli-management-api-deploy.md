---
source_type: official-docs + verified-deploy
authority: high
relevance: high
topic: cli-management-api-deploy
sources:
  - https://supabase.com/docs/reference/cli/introduction
  - https://supabase.com/docs/reference/cli/supabase-db-push
  - https://supabase.com/docs/reference/cli/supabase-functions-deploy
  - https://supabase.com/docs/reference/api/introduction
  - https://supabase.com/docs/guides/functions/deploy
date_captured: 2026-06-27
---

# CLI + Management API deploy workflow (token-only)

## The one credential that matters
`SUPABASE_ACCESS_TOKEN` (a personal access token from the dashboard) is the credential for non-interactive CLI and ALL Management API calls. VERIFIED: `db push` and `functions deploy` need only this token (plus the linked ref). The docs also mention `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_ID` for some flows, but the two deploy verbs below were proven to work token-only.

## Link first
```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
supabase link --project-ref <ref>
```
`db push`, `db pull`, `db dump` require a linked project.

## Push migrations
```bash
supabase db push                 # pushes supabase/migrations/*.sql to the linked remote
supabase db push --dry-run       # preview
```
VERIFIED token-only. This is how db-guardian's authored migration SQL reaches cloud.

## Deploy functions
```bash
supabase functions deploy <name> --project-ref <ref>
supabase functions deploy                         # all functions
```
VERIFIED token-only with `SUPABASE_ACCESS_TOKEN` set.

## Set secrets
```bash
supabase secrets set --env-file ./supabase/.env
supabase secrets list
```

## Management API: run arbitrary SQL (VERIFIED ground truth)
`POST https://api.supabase.com/v1/projects/{ref}/database/query` runs arbitrary SQL with just the bearer token. Build the JSON body so multi-line SQL escapes correctly:

```bash
cat migration.sql \
  | jq -Rs '{query:.}' \
  | curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      --data @-
```

`jq -Rs '{query:.}'` reads the whole file as a raw string (`-R`), slurps it (`-s`), and wraps it as `{"query": "..."}` with all newlines and quotes escaped. Hand-escaping multi-line SQL into JSON is how arbitrary-SQL deploys silently corrupt. Use this for one-off DDL/DML that is not a tracked migration; use `db push` for tracked migrations.

NOTE: a generic search result claimed this endpoint does not exist. That is stale. The endpoint is real and was verified on a live deploy.

## Enable the auth hook via Management API
`PATCH https://api.supabase.com/v1/projects/{ref}/config/auth` with the hook-enable body (see `02-auth-custom-access-token-hook.md`). Token-only.

## CI note
The docs recommend CI/CD (GitHub Actions) for production deploys rather than from a laptop. This Guardian owns the cutover commands; devops-guardian owns the pipeline shape they run inside.
