# 04 - RLS on Supabase (wire and enforce)

Wiring the Supabase-specific RLS plumbing into the policies db-guardian designs, and proving enforcement. Backed by `research/04-rls-on-supabase.md`. This Guardian WIRES and VERIFIES; the threat-model sign-off is security-guardian's.

## The Supabase RLS primitives

- `auth.uid()` - the caller's user id (JWT `sub`).
- `auth.jwt()` - the full JWT. Read a custom claim with `(auth.jwt() -> 'app_metadata' ->> 'app_role')` (populated by the hook in `guides/03`).
- `auth.role()` - the Postgres role (`anon` / `authenticated`).

## Performance: wrap auth.*() in a subselect

Calling `auth.uid()` per-row is slow on large scans. Wrap it so Postgres runs an initPlan and caches the result per statement:

```sql
-- slow (called per row):   using ( user_id = auth.uid() )
-- fast (cached per query): using ( user_id = (select auth.uid()) )

create policy "owner can read"
  on public.docs for select
  to authenticated
  using ( user_id = (select auth.uid()) );
```

This applies to `auth.uid()`, `auth.jwt()`, and any `security definer` function in a policy. On large tables the difference is large.

## security_invoker views (Postgres 15+)

A normal view runs with the VIEW OWNER's permissions and BYPASSES the querying user's RLS, silently leaking data. The Supabase security advisor flags this as `0010_security_definer_view`. Always create views over RLS-protected tables with `security_invoker`:

```sql
create view public.my_docs with (security_invoker = true) as
  select id, title, user_id from public.docs;
```

Now the view obeys the underlying tables' RLS as the querying user.

## Enable RLS, then add policies

```sql
alter table public.docs enable row level security;

create policy "insert own" on public.docs for insert
  to authenticated with check ( user_id = (select auth.uid()) );
create policy "select own" on public.docs for select
  to authenticated using ( user_id = (select auth.uid()) );
```

A table with RLS enabled and NO policies denies all access to `anon`/`authenticated`. That is the correct secure default; add policies deliberately, per action.

## Tenancy via a JWT claim

For multi-tenant scoping, read a claim the hook injected:

```sql
create policy "tenant isolation" on public.invoices for select
  to authenticated
  using ( tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id'))::uuid );
```

This depends on `guides/03` putting `tenant_id` into `app_metadata`. If the claim is absent, the policy denies everything: another reason to verify the JWT.

The starters are in `templates/rls-policy-pack.sql`.

## service_role BYPASSES RLS

Any client using the service-role key (including the admin Edge Function client) bypasses RLS entirely. Therefore:

- NEVER verify RLS with the service-role client; it will always return data and tell you nothing.
- Verify with a REAL user token. The proof: as a NON-owner user, the protected row must NOT be returned.

```sql
-- pgTAP-style enforcement proof (see guides/06):
set local role authenticated;
set local request.jwt.claims to '{"sub":"<other-user-uuid>","role":"authenticated"}';
select is_empty(
  'select * from public.docs where id = ''<owned-by-someone-else>''',
  'non-owner cannot read another user''s doc'
);
```

## Boundary

This guide WIRES `auth.uid()` / `auth.jwt()` into the policies and PROVES a denied query. Whether the policy set is COMPLETE against the threat model (every table covered, no PII leak, no privilege escalation) is security-guardian's audit. db-guardian designs the table and the intended policy; this Guardian deploys it and proves enforcement.
