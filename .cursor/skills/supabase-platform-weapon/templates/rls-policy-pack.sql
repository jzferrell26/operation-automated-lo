-- RLS-on-Supabase policy starters. See guides/04-rls-on-supabase.md.
-- This Guardian DEPLOYS these around db-guardian's table design and PROVES enforcement.
-- Always wrap auth.*() as (select auth.*()) for initPlan caching.

-- 1. Enable RLS (a table with RLS on and no policies denies all by default).
alter table public.docs enable row level security;

-- 2. Owner-scoped per-action policies.
create policy "insert own" on public.docs for insert
  to authenticated
  with check ( user_id = (select auth.uid()) );

create policy "select own" on public.docs for select
  to authenticated
  using ( user_id = (select auth.uid()) );

create policy "update own" on public.docs for update
  to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );

-- 3. Tenant isolation via a JWT claim injected by the custom access-token hook.
create policy "tenant isolation" on public.invoices for select
  to authenticated
  using ( tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id'))::uuid );

-- 4. security_invoker view (Postgres 15+) so the view obeys the caller's RLS.
create view public.my_docs with (security_invoker = true) as
  select id, title, user_id from public.docs;

-- 5. Storage: a user can only touch objects under a folder named for their uid.
create policy "user owns their folder" on storage.objects for all
  to authenticated
  using ( bucket_id = 'user-files'
          and (storage.foldername(name))[1] = (select auth.uid())::text )
  with check ( bucket_id = 'user-files'
               and (storage.foldername(name))[1] = (select auth.uid())::text );

-- 6. Realtime Broadcast/Presence: gate a channel topic via realtime.messages RLS.
create policy "room members can read" on realtime.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members
      where room_id = (realtime.topic())::uuid
        and user_id = (select auth.uid())
    )
  );

-- VERIFY with a real user token (never the service-role client, which bypasses RLS):
-- as a non-owner, the protected row must NOT be returned. See guides/06-local-stack-testing.md.
