# Env matrix - {{app_name}}

The authoritative list of every environment variable, split across the NEXT_PUBLIC (client) vs server-only line, per environment. Fill in one row per var. Default to the new Supabase key names; record the legacy name in Notes if the live project still uses it. See `guides/01-env-secret-wiring.md`.

## Client-exposed (NEXT_PUBLIC, inlined at build time, never put a secret here)

| Variable | Production | Preview | Development | Value source | Notes |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | {{ }} | {{ }} | {{ }} | operator | vercel.app first, custom domain later |
| `NEXT_PUBLIC_SUPABASE_URL` | {{ }} | {{ }} | {{ }} | Supabase dashboard | |
| `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY` | {{ }} | {{ }} | {{ }} | Supabase API keys | `sb_publishable_...` (new); legacy was the `anon` key |
| `{{ }}` | {{ }} | {{ }} | {{ }} | | |

## Server-only (no prefix, never shipped to the browser, all secrets here)

| Variable | Production | Preview | Development | Value source | Notes |
|---|---|---|---|---|---|
| `SUPABASE_SECRET_KEY` | {{ }} | {{ }} | {{ }} | Supabase API keys | `sb_secret_...` (new); legacy: `SUPABASE_SERVICE_ROLE_KEY` |
| `{{external_secret}}` | {{ }} | {{ }} | {{ }} | third-party | e.g. STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY |
| `{{ }}` | {{ }} | {{ }} | {{ }} | | |

## Auto-injected at runtime (do NOT set these in Edge Functions)

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and under the new-keys regime `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS`. Only set EXTERNAL secrets via `supabase secrets set`.

## Reminders

- Prod/preview vars set via `vercel env add` are stored `sensitive` and cannot be read back via `vercel env ls`. Verify at runtime.
- A `NEXT_PUBLIC_` change requires a redeploy to take effect (build-time freeze).
- `development` vars cannot be added in the same `vercel env add` command as `production`/`preview`.

<!-- TODO: open question - confirm which env-var NAMES this app reads (legacy vs new sb_ keys). -->
