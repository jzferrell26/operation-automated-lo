---
source_type: official-docs
authority: high
relevance: high
topic: rls-on-supabase
sources:
  - https://supabase.com/docs/guides/database/postgres/row-level-security
  - https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
  - https://supabase.com/docs/guides/database/database-advisors?lint=0010_security_definer_view
date_captured: 2026-06-27
---

# RLS-on-Supabase patterns (wire and enforce, do not audit)

This Guardian WIRES the platform-specific RLS plumbing into the policies db-guardian designs, and proves enforcement. The threat-model sign-off is security-guardian's.

## auth.uid() / auth.jwt()
- `auth.uid()` returns the requesting user's id from the JWT `sub`.
- `auth.jwt()` returns the full JWT; read custom claims like `app_role` via `(auth.jwt() -> 'app_metadata' ->> 'app_role')` (populated by the custom access-token hook, see `02-...`).

## Performance: wrap auth.*() in a subselect
Calling `auth.uid()` per-row is slow on large scans. Wrap it so Postgres runs an initPlan and caches the result per statement:

```sql
-- slow:   using ( user_id = auth.uid() )
-- fast:   using ( user_id = (select auth.uid()) )
create policy "owner can read"
  on public.docs for select
  to authenticated
  using ( user_id = (select auth.uid()) );
```
This applies to `auth.uid()`, `auth.jwt()`, and `security definer` functions.

## security_invoker views (Postgres 15+)
A normal view runs with the VIEW OWNER's permissions and BYPASSES the querying user's RLS, which silently leaks data. The Supabase security advisor flags this (`0010_security_definer_view`). Fix:

```sql
create view public.my_view with (security_invoker = true) as
  select ... from public.base_table;
```
With `security_invoker = true`, the view obeys the RLS of the underlying tables as the querying user. Prefer this for any view over RLS-protected tables.

## Enable RLS, then add policies
```sql
alter table public.docs enable row level security;
-- then create per-action policies (select/insert/update/delete), specify TO role (authenticated/anon)
```
A table with RLS enabled and NO policies denies all access to anon/authenticated (correct default).

## service_role bypasses RLS
Any client using the service-role key bypasses RLS entirely. So verify enforcement with a REAL user token (anon/authenticated), never with the service-role client. The standard proof: as a non-owner user, the protected row must NOT be returned.

## Tenancy pattern
For multi-tenant, scope on a tenant claim from the JWT:
```sql
using ( tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id'))::uuid )
```
This depends on the hook injecting `tenant_id` into `app_metadata`.
