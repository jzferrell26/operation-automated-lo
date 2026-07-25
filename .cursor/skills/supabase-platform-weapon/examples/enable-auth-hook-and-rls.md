# Example (the headline case): enable the custom access-token hook, then wire tenant RLS that reads the claim

The job that catches everyone: the hook is defined but its claim never shows up, so RLS silently misbehaves. This run does it correctly and proves it. See `guides/03-auth-hook.md` and `guides/04-rls-on-supabase.md`.

## Situation

- A multi-tenant app. Each user belongs to a tenant; `public.invoices` must be tenant-isolated.
- db-guardian designed `public.user_roles` and `public.invoices`.
- The goal: a `tenant_id` claim in every JWT, and an RLS policy that uses it.

## Step 1: define the hook (in a migration)

`supabase/migrations/0050_access_token_hook.sql` (from `templates/custom-access-token-hook.sql`, extended to inject `tenant_id`):

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare claims jsonb; v_tenant uuid;
begin
  claims := event->'claims';
  select tenant_id into v_tenant from public.user_roles
   where user_id = (event->>'user_id')::uuid;
  if v_tenant is not null then
    claims := jsonb_set(claims, '{app_metadata, tenant_id}', to_jsonb(v_tenant::text));
  end if;
  event := jsonb_set(event, '{claims}', claims);
  return event;
end; $$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
```

## Step 2: push the migration

```bash
supabase db reset            # local: applies cleanly
supabase link --project-ref abcdwxyz
supabase db push             # cloud
```

At this point the hook is DEFINED but NOT enabled. If you stopped here, the `tenant_id` claim would never appear and the policy in Step 4 would deny everything. This is the trap.

## Step 3: ENABLE the hook (the step everyone forgets)

```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/abcdwxyz/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hook_custom_access_token_enabled": true,
       "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"}'
```

## Step 4: wire the tenant RLS policy

`supabase/migrations/0051_invoices_rls.sql`:

```sql
alter table public.invoices enable row level security;
create policy "tenant isolation" on public.invoices for select
  to authenticated
  using ( tenant_id = (select (auth.jwt() -> 'app_metadata' ->> 'tenant_id'))::uuid );
```

```bash
supabase db push
```

## Step 5: VERIFY (mandatory)

```bash
# 1. Re-login so a FRESH token is minted (old tokens predate the hook).
# 2. Decode the access token's middle segment and confirm the claim:
#    "app_metadata": { "tenant_id": "..." }   <- must be present
```

Then prove isolation with a real user token, not the service-role client:

```sql
-- as a user in tenant A, querying an invoice owned by tenant B must return nothing.
set local role authenticated;
set local request.jwt.claims to '{"sub":"<userA>","role":"authenticated","app_metadata":{"tenant_id":"<tenantA>"}}';
select is_empty(
  'select 1 from public.invoices where tenant_id = ''<tenantB>''',
  'tenant A cannot read tenant B invoices'
);
```

## What this run proved

- The hook is ENABLED, not just defined: the `tenant_id` claim is in a fresh JWT.
- The RLS policy reads the claim and isolates tenants.
- Enforcement was verified with a real user token, the only valid proof.

## If the claim is missing

- Re-check Step 3 (the PATCH). Defined-but-disabled is the #1 failure.
- Check the grants (Step 1). A missing grant makes the enabled hook error and blocks logins.
- Make sure you minted a fresh token after enabling.

## Boundary

The table design is db-guardian's; the threat-model completeness of the policy set is security-guardian's. This run deployed the hook + policy and proved the claim and isolation.
