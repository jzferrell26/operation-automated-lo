---
source_type: official-docs
authority: high
relevance: high
topic: auth-hook
sources:
  - https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
  - https://supabase.com/docs/guides/auth/auth-hooks
  - https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
  - https://supabase.com/docs/guides/auth/jwts
date_captured: 2026-06-27
---

# Custom Access Token Hook: define AND enable

## What it does
A Custom Access Token Hook is a Postgres function that runs BEFORE a JWT is issued (on every token issuance, including refresh and OAuth flows) and can add or modify claims. This is the canonical way to put an `app_role` / RBAC claim into the access token so RLS policies can read it via `auth.jwt()`.

## Function signature (exact)
```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  claims jsonb;
  user_role text;
begin
  claims := event->'claims';
  -- look up the role for event->>'user_id'
  select role into user_role from public.user_roles where user_id = (event->>'user_id')::uuid;
  if user_role is not null then
    claims := jsonb_set(claims, '{app_metadata, app_role}', to_jsonb(user_role));
  end if;
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;
```

`event` contains `user_id`, `claims`, and `authentication_method`. Return the event with modified `claims`. Add a custom claim with:
`claims := jsonb_set(claims, '{app_metadata, app_role}', '"your_role"');`

## Grants the hook needs
The `supabase_auth_admin` role must be able to execute the function and read any table it touches:
```sql
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
```

## ENABLE it (the headline footgun)
Defining the function does NOT enable it. Enable via one of:

1. **Management API (VERIFIED ground truth):**
   `PATCH /v1/projects/{ref}/config/auth` with a body enabling the hook and pointing at the function URI, e.g.
   `{"hook_custom_access_token_enabled": true, "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"}`
2. **config.toml + push:**
   ```toml
   [auth.hook.custom_access_token]
   enabled = true
   uri = "pg-functions://postgres/public/custom_access_token_hook"
   ```
   then `supabase config push` (CLI v2 config-as-code).
3. **Dashboard:** Authentication > Hooks (Beta), select the Postgres function.

## Verify
After enabling, mint a fresh token (re-login or refresh) and decode the JWT. The custom claim must appear under `app_metadata.app_role`. If it is absent, the hook is defined-but-disabled, the #1 failure mode.
