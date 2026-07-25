---
source_type: official-docs
authority: high
relevance: medium-high
topic: local-stack-pgtap
sources:
  - https://supabase.com/docs/guides/local-development/overview
  - https://supabase.com/docs/reference/cli/supabase-start
  - https://supabase.com/docs/reference/cli/supabase-db-reset
  - https://supabase.com/docs/guides/local-development/seeding-your-database
  - https://supabase.com/docs/guides/local-development/testing/pgtap-extended
date_captured: 2026-06-27
---

# Local stack: start, db reset, seed, pgTAP

## Init + start
- `supabase init` creates `supabase/config.toml` (and the `supabase/` dir for migrations, functions, tests).
- `supabase start` boots the local Docker stack (Postgres, Auth, Storage, Realtime, Studio, Edge runtime) and runs `supabase/seed.sql`.
- `supabase stop` tears it down; `supabase status` shows local URLs and keys.

## db reset (the local rehearsal loop)
- `supabase db reset` drops the local DB, re-applies ALL migrations in `supabase/migrations/`, then re-runs the seed. This is the fast inner loop to prove a migration applies cleanly before `db push` to cloud.
- `--no-backup` resets without keeping a dump.

## Seeding
- `supabase/seed.sql` runs on `start` and after `db reset`.
- `config.toml` `[db.seed] sql_paths = [...]` controls order; globs are sorted lexicographically.

## pgTAP tests
- Test files live in `supabase/tests/` with `.sql` or `.pg` extension.
- `supabase test db` runs `pg_prove` in a container against the local DB (requires `supabase start` first).
- Each test is wrapped in its own transaction and rolled back, so tests do not pollute each other.
- pgTAP assertions cover schema (`has_table`, `has_column`, `col_is_pk`), RLS (`policies_are`, `is(...)` against a `set role` + `set request.jwt.claims`), and functions.

## Why this matters for the platform Guardian
The local stack is where a deploy is REHEARSED. The token-only cloud cutover (`db push`, `functions deploy`, hook enable) should always be proven locally first: `db reset` to confirm migrations apply, `functions serve` to confirm the function runs, a pgTAP RLS test to confirm a non-owner is denied. Then push to cloud.

## config.toml is the single local config surface
It configures auth (including `[auth.hook.custom_access_token]`), db, storage, realtime, and per-function `verify_jwt`. CLI v2 treats it as config-as-code: `supabase config push` promotes it to the linked remote.
