# Example (happy path): deploy a migration and an Edge Function, token-only

A worked end-to-end run for the most common job: db-guardian authored a migration, the app has one Edge Function, and you need both in cloud with verification. See `guides/01-deploy-workflow.md` and `guides/02-edge-functions.md`.

## Situation

- db-guardian delivered `supabase/migrations/0042_add_docs_table.sql` (a `docs` table with RLS).
- There is one function `supabase/functions/list-docs/index.ts`.
- You have a `SUPABASE_ACCESS_TOKEN` and the project ref `abcdwxyz`.

## Step 1: rehearse locally

```bash
supabase db reset            # applies 0042 + all prior migrations + seed
supabase functions serve list-docs
curl -s -X POST "http://127.0.0.1:54321/functions/v1/list-docs" \
  -H "Authorization: Bearer $LOCAL_ANON_KEY" -d '{}'
supabase test db             # RLS enforcement test passes
```

All green. The migration applies and the function runs. Proceed.

## Step 2: link and push

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
supabase link --project-ref abcdwxyz
supabase db push --dry-run   # shows 0042_add_docs_table.sql will apply
supabase db push             # token-only; migration applied to cloud
```

## Step 3: deploy the function

```bash
supabase functions deploy list-docs --project-ref abcdwxyz   # token-only
```

## Step 4: verify in cloud

```bash
# A real user JWT (logged-in caller). verify_jwt = true means no/invalid token returns 401.
curl -s -X POST "https://abcdwxyz.supabase.co/functions/v1/list-docs" \
  -H "Authorization: Bearer $A_REAL_USER_JWT" -H "Content-Type: application/json" -d '{}'
# -> 200 with the caller's own docs (RLS scoped), proving the function + RLS work together.

# Confirm with no token: must be 401, not 200.
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://abcdwxyz.supabase.co/functions/v1/list-docs" -d '{}'
# -> 401 (correct)
```

## What this run proved

- The migration deployed token-only (no DB password needed).
- The function deployed token-only.
- The function returns only the caller's rows (RLS via the auto-injected anon key + passed-through JWT), and rejects unauthenticated calls.

## What was NOT done here (by design)

- The `docs` table SCHEMA was not authored here; db-guardian designed it. This run deployed it.
- No security sign-off was issued. If this is a sensitive surface, hand to security-guardian for the audit.
