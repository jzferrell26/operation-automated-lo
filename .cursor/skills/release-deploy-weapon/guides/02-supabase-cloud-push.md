# 02 - Supabase cloud push (migrations and Edge Functions)

Push the Supabase side to the cloud project: migrations via `db push`, Edge Functions via `functions deploy`, all token-based with no DB password and no Docker. This weapon CONSUMES these commands for the cutover; it does not author migrations (db-guardian) or function internals (supabase-platform-guardian). Worked use in `examples/01-happy-path-first-deploy.md`.

## Authenticate with a token, not a password

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...        # or: supabase login
npx -y supabase@latest link --project-ref <project-ref>
```

The `<project-ref>` comes from the project's dashboard URL. With the access token exported and the project linked, the migration and function commands run non-interactively: no DB password prompt, no Docker (CLI 2.x does native bundling).

Source: `research/supabase-cloud-deploy/2026-06-29-supabase-functions-deploy-official.md`, `research/internal-prior-art/2026-06-29-cuantico-supabase-token-deploy.md`.

## Migrations: pull for drift, then push

Always check for remote drift before pushing, so you do not clobber out-of-band schema changes (directive #4, reversibility on the DB side):

```bash
supabase db pull        # capture remote drift into supabase/migrations/<ts>_remote_schema.sql
# review the generated remote-schema migration before applying
supabase db push        # apply all local migrations to the linked cloud DB
supabase migration list # shows Local vs Remote to confirm parity
```

`db push` applies all `supabase/migrations/*` without prompting for the DB password when the access token plus linked config are present. `supabase migration list` is the parity check: Local and Remote columns should match after a successful push. Use it as the migration half of the post-deploy verification.

Source: `research/supabase-cloud-deploy/2026-06-29-supabase-migrations-db-push.md`, `research/internal-prior-art/2026-06-29-cuantico-supabase-token-deploy.md`.

Lane note: writing the SQL in `supabase/migrations/` is db-guardian's job. You own the push and the drift check, not the schema design.

## Edge Functions: deploy all or one

```bash
supabase functions deploy                    # all functions in supabase/functions/
supabase functions deploy <function-name>    # a single function
# CI / non-interactive:
supabase functions deploy --project-ref <project-ref>   # with SUPABASE_ACCESS_TOKEN exported
```

A successful deploy distributes the function to edge locations worldwide. JWT verification is NOT a deploy flag; it is set in `config.toml` and travels with the deploy:

```toml
[functions.hello-world]
verify_jwt = false
```

Lane note: `verify_jwt` semantics and function internals are supabase-platform-guardian's territory. Call out that a public function (`verify_jwt = false`) versus a JWT-gated one is decided in config and ships with the deploy; do not toggle it at deploy time and do not re-teach function authoring here.

Source: `research/supabase-cloud-deploy/2026-06-29-supabase-functions-deploy-official.md`.

## Function secrets: only set the EXTERNAL ones

Edge Functions auto-inject these at runtime: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and (under the new-keys regime) `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS`. Do NOT set those yourself. Only set the EXTERNAL secrets the functions call (Stripe, GHL, etc.):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
```

Source: `research/internal-prior-art/2026-06-29-cuantico-supabase-token-deploy.md`, `research/supabase-cloud-deploy/2026-06-29-supabase-new-api-keys-migration.md`.

## Arbitrary SQL with only the token (for seeding/verification)

When you need to seed cloud data or read schema/RLS state with only the access token (no DB password), use the Management API. Build the JSON body safely with `jq -Rs` so quotes in the SQL are not mangled:

```bash
echo "SELECT count(*) FROM public.items;" \
  | jq -Rs '{query:.}' \
  | curl -s -X POST "https://api.supabase.com/v1/projects/<ref>/database/query" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      --data @-
```

This runs as admin (bypasses RLS), so it is good for seeding and for reading `pg_class`/RLS state, and bad for anything you would not run as a superuser. Never inline secrets into the SQL string.

Source: `research/internal-prior-art/2026-06-29-cuantico-supabase-token-deploy.md`.

## Lane boundary: the custom access-token hook

If the app uses a custom access-token hook, it must be ENABLED as a project Auth setting (a `PATCH /v1/projects/{ref}/config/auth` call), not just defined in a migration. Without enabling, signed-in JWTs lack the claim. That enable step, plus the hook internals, belong to supabase-platform-guardian. Reference it; do not own it.

Source: `research/internal-prior-art/2026-06-29-cuantico-supabase-token-deploy.md`.

## Operator-environment gotcha: MCP session restart

If you add the Supabase MCP server mid-session (`claude mcp add ... supabase`), its tools are NOT callable until the session restarts, even though `claude mcp list` shows Connected. For immediate work, use the CLI/token path above. Note this in the runbook's tooling-setup preamble.

Source: `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md`.
