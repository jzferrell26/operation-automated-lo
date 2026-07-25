# 03 - The Custom Access Token Hook (define AND enable)

The headline platform footgun and how to get it right. Backed by `research/02-auth-custom-access-token-hook.md`.

## What it is

A Custom Access Token Hook is a Postgres function that runs BEFORE every JWT is issued (login, refresh, OAuth) and can add or modify claims. It is the canonical way to put an `app_role` (or `tenant_id`) claim into the access token so RLS policies can read it via `auth.jwt()`.

## Step 1: define the hook function

```sql
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
```

- `event` carries `user_id`, `claims`, and `authentication_method`.
- Return the event with modified `claims`.
- Add a literal claim with `jsonb_set(claims, '{app_metadata, app_role}', '"admin"')`.

The skeleton is `templates/custom-access-token-hook.sql`.

## Step 2: grant the auth admin role

The hook runs as `supabase_auth_admin`. It needs execute on the function and read on any table it touches, and the function must be hidden from the API roles:

```sql
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
```

Missing grants are why an enabled hook returns an error and blocks ALL logins. Apply these in the same migration as the function.

## Step 3: ENABLE it (this is the part everyone forgets)

Defining the function does NOTHING on its own. Enable it via one of:

### A. Management API (token-only, recommended for deploys)
```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hook_custom_access_token_enabled": true,
    "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"
  }'
```

### B. config.toml + push (config-as-code)
```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```
then `supabase config push`.

### C. Dashboard
Authentication > Hooks (Beta) > select the Postgres function.

> TODO: open question - confirm the exact PATCH field names and the `config.toml` schema version against the installed CLI / live Management API. The observed names are `hook_custom_access_token_enabled` / `hook_custom_access_token_uri` and `[auth.hook.custom_access_token]`.

## Step 4: VERIFY the claim is in the JWT

This is mandatory. A defined-but-disabled hook is the #1 Supabase auth failure: everything looks wired but the claim never appears, so RLS silently denies or over-permits.

1. Re-login or refresh the session so a NEW token is minted (old tokens predate the hook).
2. Decode the access token (jwt.io, or `Deno`/`node` base64-decode of the middle segment).
3. Confirm `app_metadata.app_role` is present with the expected value.

If the claim is absent: the hook is not enabled (redo Step 3), or the grants are missing (Step 2), or you are looking at a pre-hook token (mint a fresh one).

## The failure-mode checklist

| Symptom | Cause | Fix |
|---|---|---|
| Claim missing from JWT | hook defined but not enabled | Step 3 (PATCH / config push) |
| All logins suddenly fail | missing grant to `supabase_auth_admin` | Step 2 grants |
| Claim is stale | looking at an old token | mint a fresh token |
| Claim present locally, absent in cloud | enabled locally (config.toml) but not pushed | run the PATCH or `config push` against the linked project |

## Boundary

Choosing WHETHER to use Supabase Auth at all (vs Clerk, Auth.js, etc.) and the app-side sign-in flow is auth-guardian's. This guide owns making the hook and its claim work on the platform once Supabase Auth is the chosen provider.
