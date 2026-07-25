---
source_type: official-docs
authority: high
relevance: high
topic: edge-functions
sources:
  - https://supabase.com/docs/guides/functions/secrets
  - https://supabase.com/docs/guides/functions/function-configuration
  - https://supabase.com/docs/guides/functions/auth
  - https://supabase.com/docs/guides/functions/deploy
date_captured: 2026-06-27
---

# Edge Functions (Deno): config, verify_jwt, secrets, auto-injected env

## Runtime
Edge Functions run on Deno. Access env vars with `Deno.env.get('NAME')`. A function lives at `supabase/functions/<name>/index.ts`.

## Auto-injected environment variables (do NOT re-declare as secrets)
Pre-populated in BOTH local and hosted environments:

- `SUPABASE_URL` - the API gateway for the project.
- `SUPABASE_ANON_KEY` - browser-safe (legacy publishable key), RLS applies.
- `SUPABASE_SERVICE_ROLE_KEY` - admin key (legacy secret key), NEVER ship to a browser, bypasses RLS.
- `SUPABASE_DB_URL` - direct database connection URL.
- `SUPABASE_JWKS` - JSON Web Key Set used to verify user JWTs.
- `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS` - newer key JSON dictionaries.
- Hosting: `SB_REGION`, `SB_EXECUTION_ID`, `DENO_DEPLOYMENT_ID`.

VERIFIED GROUND TRUTH: the three legacy names (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are present and usable in deployed functions without any manual secret setup.

## Setting real (external) secrets
- File: `supabase secrets set --env-file ./supabase/.env`
- Individual: `supabase secrets set STRIPE_SECRET_KEY=sk_live_...`
- Local serve: `supabase functions serve --env-file ./supabase/functions/.env.local`
- Dashboard: Edge Functions > Secrets.

Only set secrets that are genuinely external (Stripe, third-party APIs). The Supabase keys above are already injected.

## verify_jwt and config.toml
Per-function config lives in `config.toml`:

```toml
[functions.my-fn]
verify_jwt = true   # default: platform validates the JWT before the handler runs
```

- Keep `verify_jwt = true` (default) for user-facing functions so the caller's JWT is validated and RLS-scoped clients work.
- Set `verify_jwt = false` for webhooks (e.g. Stripe) that present no Supabase JWT; validate the provider signature inside the handler instead.

## Deploy
- `supabase functions deploy <name> --project-ref <ref>` (VERIFIED token-only with `SUPABASE_ACCESS_TOKEN`).
- Deploy all: `supabase functions deploy`.

## Gotcha
A function that needs the service-role key should read `SUPABASE_SERVICE_ROLE_KEY` from the injected env, NOT from a user-set secret of the same name. Re-declaring it is redundant and risks drift.
