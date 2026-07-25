# 01 - Vercel env and secret wiring

Wire the app's environment variables into Vercel correctly across the NEXT_PUBLIC vs server-only line, per environment, with secret values kept out of shell history. This is directive #1 and directive #5 in practice. Worked use in `examples/01-happy-path-first-deploy.md`.

## The hard line: what goes where

- `NEXT_PUBLIC_` prefix -> client-exposed. Inlined into the browser bundle at build time, frozen at the build-time value. Only safe for non-secret values: the site URL, the Supabase URL, the Supabase publishable key.
- No prefix -> server-only. Available only in the Node.js environment, never shipped to the browser. This is where every secret lives: the Supabase secret key, Stripe secret key, webhook signing secrets, third-party API keys.

Source: `research/vercel-env-secrets/2026-06-29-nextjs-env-vars-official.md`.

Two consequences to internalize:

1. **Build-time freeze.** After `next build`, `NEXT_PUBLIC_` values are frozen. If you change one in Vercel and do not redeploy, the app still shows the old value. A common "I updated the env but nothing changed" bug. Fix: redeploy after changing any `NEXT_PUBLIC_` var.
2. **Dynamic lookups are not inlined.** Only direct static `process.env.NEXT_PUBLIC_X` references are replaced. `process.env[varName]` or aliasing `const env = process.env` returns `undefined` in the browser. Do not read `NEXT_PUBLIC_` vars indirectly client-side.

Source: same official doc.

## The 2026 Supabase key change (default to the new keys)

Supabase is retiring the legacy `anon` and `service_role` JWT keys in favor of:

- `sb_publishable_...` - low privilege, RLS still applies, client-safe. Goes in a `NEXT_PUBLIC_` var.
- `sb_secret_...` - bypasses RLS, full access, server-only. Goes in a non-prefixed var.

Projects created or restored since Nov 1, 2025 ship WITHOUT the legacy keys at all; legacy keys are deprecated by end of 2026. Both key types work simultaneously during migration. The privilege boundary is identical to the old anon/service_role split, so directive #1 carries over unchanged: publishable is NEXT_PUBLIC-safe, secret is server-only.

Source: `research/supabase-cloud-deploy/2026-06-29-supabase-new-api-keys-migration.md`. The production naming `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY` (client) + `SUPABASE_SECRET_KEY` (server) is corroborated live in `research/cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md`.

> TODO: open question - needs human decision before next refresh. Which env-var key NAMES does this specific app use? Three naming sets are live: legacy (`SUPABASE_SERVICE_ROLE_KEY`, Cuantico current), official-new (`sb_secret_`/`sb_publishable_` as the value format), and the MakerKit env-var names (`SUPABASE_SECRET_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`). Default to the new keys; confirm with the operator which names the app actually reads, because live projects may still run legacy keys through end of 2026.

## Setting vars with the Vercel CLI

Set a var per environment (`production`, `preview`, or `development`; omit the environment to add to all):

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

Set a SECRET value via stdin so it never lands in shell history (directive #5). The Cuantico-proven form:

```bash
printf '%s' "$SUPABASE_SECRET_KEY" | vercel env add SUPABASE_SECRET_KEY production
```

The official docs also support reading the value from a file: `vercel env add NAME production < secret.txt`, and updating from stdin: `cat ~/.npmrc | vercel env update NPM_RC preview`. The docs explicitly warn that `echo [value] | vercel env add ...` saves the value in bash history and is not recommended for secrets; use `printf` or the `< file` form.

To replace an existing var, remove then re-add (or use `--force`):

```bash
vercel env rm SUPABASE_SECRET_KEY production --yes
printf '%s' "$NEW_VAL" | vercel env add SUPABASE_SECRET_KEY production
```

Source: `research/vercel-env-secrets/2026-06-29-vercel-cli-env-command.md`, `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md`.

CLI rules that bite operators:

- `vercel env add` returns an error if you select `development` together with `production` or `preview` in one command. Add development vars separately.
- `--no-sensitive` opts a prod/preview var out of the sensitive default, but team policy may block it.

## The 2026 sensitive-by-default change (changes verification)

`vercel env add` now defaults new production, preview, and custom-environment variables to the `sensitive` type. Sensitive values are stored securely and CANNOT be viewed later in the dashboard or via `vercel env ls`. They are still available to builds in the Vercel build container and at runtime. Development targets are `encrypted`, not sensitive (the API does not allow sensitive vars in development).

Consequence for the verify step: after setting a secret, you cannot read it back to confirm. Verify it landed by exercising it at runtime (the DB-touching smoke check), not by `vercel env ls`. See `guides/03-deploy-trigger-and-verify.md`.

Source: `research/vercel-env-secrets/2026-06-29-vercel-cli-env-command.md`.

## Two cheap guardrails (recommended)

1. **`server-only` import guard.** The `server-only` package causes a build failure when a server module is accidentally imported into a Client Component, turning a silent secret leak into a loud build error.
2. **Startup env validation.** A zod schema over `process.env` at boot turns a missing-var silent runtime fallback into a loud boot-time error. Vercel also validates required env vars at build time, so a missing required var fails the build rather than 500ing later.

Source: `research/vercel-env-secrets/2026-06-29-nextjs-env-nextpublic-server-only-dev.md`, `research/cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md` (Vercel build-time env validation).

## The silent-fallback failure this prevents

A Next.js server snapshot that reads `process.env.SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`) falls back to demo data when that env is absent. The deploy goes Ready, the homepage looks fine, and the app silently serves placeholder data. This is the concrete instance directive #2 exists to catch, and it is exactly what the DB-touching smoke check surfaces.

Source: `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md`.

## Local env pull for parity

After changing env in Vercel, pull it for local tooling: `vercel env pull .env.local` (or `--environment=preview`). Note the distinction from `vercel pull --yes`, which writes `.vercel/project.json` including the monorepo `rootDirectory`; that is for `vercel build`/`vercel dev`, used in `guides/04-deploy-debug.md`.

Source: `research/vercel-env-secrets/2026-06-29-vercel-cli-env-command.md`.

The full env matrix shape is in `templates/env-matrix.template.md`.
