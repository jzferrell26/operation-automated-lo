# 06 - Local Stack and Testing (the rehearsal loop)

The local stack is where every cloud deploy is rehearsed. Backed by `research/05-local-stack-pgtap.md`.

## Init and start

```bash
supabase init     # creates supabase/config.toml and the supabase/ tree
supabase start    # boots Postgres, Auth, Storage, Realtime, Studio, Edge runtime; runs seed.sql
supabase status   # shows local URLs + keys
supabase stop
```

## The inner loop: db reset

```bash
supabase db reset
```

Drops the local DB, re-applies ALL migrations in `supabase/migrations/` in order, then re-runs `supabase/seed.sql`. This is the fast proof that db-guardian's migration applies cleanly BEFORE you `db push` to cloud. If `db reset` fails, the migration is broken; fix it (hand back to db-guardian if it is a schema issue) before any cloud push.

## Seeding

- `supabase/seed.sql` runs on `start` and after every `db reset`.
- `config.toml` `[db.seed] sql_paths = [...]` controls order; globs are sorted lexicographically.
- Seed admin users either in `seed.sql` (local) or via the `auth/v1/admin/users` REST call (`guides/01` Step 7).

## pgTAP tests

Test files live in `supabase/tests/` with a `.sql` or `.pg` extension. Run them:

```bash
supabase test db    # runs pg_prove against the local DB; requires supabase start first
```

Each test is wrapped in its own transaction and rolled back, so tests never pollute each other.

### What to test at the platform layer
- **Schema presence** (sanity that the migration deployed): `has_table`, `has_column`, `col_is_pk`.
- **RLS enforcement** (the important one): set a user JWT context and assert a non-owner is denied.

```sql
begin;
select plan(2);

-- owner can read their row
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select isnt_empty(
  'select 1 from public.docs where user_id = ''00000000-0000-0000-0000-000000000001''',
  'owner reads own doc'
);

-- non-owner is denied
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is_empty(
  'select 1 from public.docs where user_id = ''00000000-0000-0000-0000-000000000001''',
  'non-owner cannot read another user''s doc'
);

select * from finish();
rollback;
```

This is the canonical "prove RLS works" artifact. Run it locally before deploying RLS to cloud.

## The rehearsal discipline

Before any cloud cutover (`guides/01`):

1. `supabase db reset` - migrations apply cleanly.
2. `supabase functions serve <name>` - the function runs and returns the expected status.
3. `supabase test db` - the RLS enforcement test passes.

Only then `link` + `db push` + `functions deploy`. A cloud deploy that skipped this loop is how broken authorization ships.

## config.toml is the single local config surface

It configures auth (including `[auth.hook.custom_access_token]`), db, storage, realtime, and per-function `verify_jwt`. Under CLI v2 it is config-as-code: `supabase config push` promotes it to the linked remote. So the hook can be enabled locally via `config.toml` and pushed, OR enabled directly in cloud via the Management API PATCH (`guides/03`). Keep the two in sync to avoid the "works locally, missing in cloud" failure.
