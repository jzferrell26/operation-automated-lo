# 01 - Deploy Workflow (token-only)

The deploy spine. How to push db-guardian's migrations, deploy Edge Functions, set secrets, run one-off SQL via the Management API, and enable the auth hook, all on a single `SUPABASE_ACCESS_TOKEN`. Backed by `research/03-cli-management-api-deploy.md` and `research/07-cloud-vs-local-config.md`.

## Step 0: the one credential

```bash
export SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

A personal access token from the dashboard (Account > Access Tokens). This alone authorizes the CLI in non-interactive mode and every Management API call below. VERIFIED: `db push` and `functions deploy` need only this token plus a linked ref.

## Step 1: link the project

```bash
supabase link --project-ref <ref>
```

`<ref>` is the project ref (the `xxxx` in `xxxx.supabase.co`). Linking is required before `db push`, `db pull`, `db dump`. It also diffs your local `config.toml` against the remote so you can see config drift.

## Step 2: push migrations (db-guardian's SQL)

```bash
supabase db push            # applies supabase/migrations/*.sql to the linked remote
supabase db push --dry-run  # preview what would run
```

This is the canonical path for TRACKED migrations authored by db-guardian. Do not author the SQL here; deploy it.

## Step 3: deploy Edge Functions

```bash
supabase functions deploy <name> --project-ref <ref>
supabase functions deploy                          # all functions in supabase/functions/
```

Token-only. See `guides/02-edge-functions.md` for `config.toml` `verify_jwt` and secrets.

## Step 4: set external secrets

```bash
supabase secrets set --env-file ./supabase/.env
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets list
```

Only set genuinely external secrets. The Supabase keys (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are auto-injected; do not set them.

## Step 5: run one-off arbitrary SQL via the Management API

For SQL that is not a tracked migration (a backfill, a grant, a quick check), use the Management API. VERIFIED endpoint:

```bash
REF=<ref>
cat ops.sql \
  | jq -Rs '{query:.}' \
  | curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      --data @-
```

`jq -Rs '{query:.}'` reads the whole file as one raw string and wraps it as `{"query":"..."}` with every newline and quote escaped. NEVER hand-escape multi-line SQL into JSON; that is how arbitrary-SQL deploys silently corrupt. The helper script is `templates/management-api-sql.sh`.

Use `db push` for tracked migrations; use this endpoint for one-off operational SQL.

## Step 6: enable the custom access-token hook

```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hook_custom_access_token_enabled": true,
    "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"
  }'
```

Defining the hook function in a migration does NOT enable it. This PATCH (or `config.toml` + `supabase config push`) is what turns it on. See `guides/03-auth-hook.md`.

> TODO: open question - confirm the exact JSON field names against the live Management API for the installed CLI version. The observed names are `hook_custom_access_token_enabled` / `hook_custom_access_token_uri`.

## Step 7: seed admin users (when needed)

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"...","email_confirm":true,"app_metadata":{"app_role":"admin"}}'
```

Server-side only; the service-role key bypasses RLS and is a breach if leaked client-side.

## Step 8: verify

- Decode a fresh JWT and confirm the custom claim (`guides/03`).
- Run a denied-RLS query with a real user token (`guides/04`).
- Hit the function and confirm the status code.

## The full cutover sequence

The token-only spine, in order: rehearse locally (`guides/06`) -> `link` -> `db push` -> `functions deploy` -> `secrets set` -> enable hook (PATCH) -> seed users -> verify. The copy-paste checklist is `templates/deploy-runbook.md`.

## Boundary

Production CI/CD pipeline topology is devops-guardian's. This guide owns the cutover COMMANDS; the GitHub Actions workflow that runs them is devops-guardian's.
