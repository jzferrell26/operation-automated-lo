-- Custom access-token hook: injects app_role into the JWT's app_metadata.
-- DEFINE this in a migration, then ENABLE it via the Management API / config.toml.
-- Defining alone does NOT enable it. See guides/03-auth-hook.md.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role text;
begin
  claims := event->'claims';

  -- Look up the role for this user. Adjust the source table to your schema
  -- (this table is db-guardian's to design; this hook just reads it).
  select role into user_role
  from public.user_roles
  where user_id = (event->>'user_id')::uuid;

  if user_role is not null then
    claims := jsonb_set(claims, '{app_metadata, app_role}', to_jsonb(user_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Required grants: the hook runs as supabase_auth_admin.
-- Missing grants make an ENABLED hook fail and block ALL logins.
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- After this migration is pushed, ENABLE the hook (see guides/03-auth-hook.md):
--   PATCH /v1/projects/{ref}/config/auth  { hook_custom_access_token_enabled: true, ... }
-- then mint a fresh JWT and confirm app_metadata.app_role is present.
