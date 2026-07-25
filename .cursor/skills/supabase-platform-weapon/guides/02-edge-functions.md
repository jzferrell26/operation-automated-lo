# 02 - Edge Functions (Deno)

Writing, configuring, and deploying Supabase Edge Functions. Backed by `research/01-edge-functions-deno.md`.

## Runtime and shape

Edge Functions run on Deno. A function lives at `supabase/functions/<name>/index.ts` and exports a fetch handler:

```ts
Deno.serve(async (req) => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Read env vars with `Deno.env.get('NAME')`. The starter is `templates/edge-function.ts`.

## Auto-injected environment variables (do NOT re-declare)

Present in BOTH local and hosted runtimes, no setup required:

| Variable | Use | Safety |
|---|---|---|
| `SUPABASE_URL` | project API gateway | safe |
| `SUPABASE_ANON_KEY` | RLS-scoped client | browser-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | admin client | server-only, bypasses RLS, NEVER to a browser |
| `SUPABASE_DB_URL` | direct DB connection | server-only |
| `SUPABASE_JWKS` | verify user JWTs | safe |
| `SB_REGION`, `SB_EXECUTION_ID`, `DENO_DEPLOYMENT_ID` | hosting metadata | safe |

Never set any of these via `supabase secrets set`. Re-declaring them is redundant and risks drift. Newer projects also expose `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS` JSON dictionaries.

Two clients from inside a function:

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

// RLS-scoped to the caller (pass through their Authorization header):
const userClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
);

// Admin client (bypasses RLS, server-only):
const adminClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
```

## verify_jwt and config.toml

Per-function config lives in `supabase/config.toml`:

```toml
[functions.my-user-fn]
verify_jwt = true   # default

[functions.stripe-webhook]
verify_jwt = false  # webhook presents no Supabase JWT
```

- **`verify_jwt = true` (default)** for user-facing functions: the platform validates the caller's JWT before your handler runs. Use the RLS-scoped `userClient`.
- **`verify_jwt = false`** for webhooks (Stripe, etc.): there is no Supabase JWT. Validate the PROVIDER signature inside the handler instead (e.g. Stripe signature verification). Do not leave a `verify_jwt = false` function unprotected.

The snippet is `templates/config.toml.snippet`.

## Setting real (external) secrets

```bash
supabase secrets set --env-file ./supabase/.env       # bulk
supabase secrets set RESEND_API_KEY=re_...             # single
```

Local: place them in `supabase/functions/.env` or run `supabase functions serve --env-file .env.local`.

## Deploy and serve

```bash
supabase functions serve <name>                        # local, hot-reload
supabase functions deploy <name> --project-ref <ref>   # cloud, token-only
```

## Verify

After deploy, invoke it and check the status, not just "deploy succeeded":

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/<name>" \
  -H "Authorization: Bearer <a-real-user-jwt-or-anon-key>" \
  -H "Content-Type: application/json" -d '{}'
```

A `401` on a `verify_jwt = true` function with no/invalid token is correct behavior, not a bug.

## Common mistakes

- Re-declaring `SUPABASE_SERVICE_ROLE_KEY` as a user secret. It is already injected.
- Leaving `verify_jwt = false` AND not validating the provider signature. That is an open endpoint.
- Using the admin client where the RLS-scoped client belongs. The admin client bypasses RLS; only use it for genuinely privileged paths.
