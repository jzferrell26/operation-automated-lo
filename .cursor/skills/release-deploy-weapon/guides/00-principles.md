# 00 - Principles, directives, and lane boundaries

This guide carries the seven critical directives in full, plus the lane boundaries that keep this Guardian from doing another Guardian's job. Read it before any deploy. The deploy procedure overview is in `SKILL.md`; a worked run is in `examples/01-happy-path-first-deploy.md`.

## The seven critical directives

### 1. NEXT_PUBLIC vs server-only is a hard line

A `NEXT_PUBLIC_` variable is inlined into the browser bundle at build time and frozen at the value present when `next build` ran. A non-prefixed variable stays server-only and never reaches the browser. Therefore:

- Never put a server secret in a `NEXT_PUBLIC_` var. It ships to the browser as shipped JS and the leak is permanent (baked into the bundle), not something you can un-ship by re-setting the env.
- Never assume a server-only var is available client-side. It is not; the client runs in a different environment.
- A `NEXT_PUBLIC_` var cannot be changed by re-setting the env in Vercel without a rebuild. The old value stays frozen in the deployed bundle until you redeploy.

Source: `research/vercel-env-secrets/2026-06-29-nextjs-env-vars-official.md` (build-time inlining is frozen; non-prefixed vars are server-only). The publishable-vs-secret Supabase key split maps onto this exact boundary: `research/supabase-cloud-deploy/2026-06-29-supabase-new-api-keys-migration.md`.

### 2. Ready is not working

Always run a post-deploy smoke check against a real route. A Vercel build can reach Ready and still 404 or 500 at runtime: wrong Output Directory serves an empty folder, a middleware redirect lands on an unbuilt page, a missing server env makes a server snapshot silently fall back to demo data, or a DB route times out against the serverless cap. The build status lies about app health.

Source: `research/deploy-verification/2026-06-29-smoke-test-cicd-go-nogo-gate.md` (the go/no-go gate and its failure classes), `research/cutover-runbook/2026-06-29-vercel-supabase-works-breaks-2026.md` (serverless timeout + PgBouncer cold-start class), `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md` (the silent fallback to demo data).

### 3. Debug the deploy before the code

When a deploy 404s or 500s, follow the redirect chain, read the build AND runtime logs, and check env wiring before touching any application code. Most "broken deploys" are config, redirect, or env, not code. A gated app legitimately 404s by redirecting to an unbuilt page. Only hand a genuine code defect to the language Guardian.

Source: `research/deploy-debug-404/2026-06-29-vercel-kb-404-after-build.md` (config causes), `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md` (the redirect-follow technique). Full method in `guides/04-deploy-debug.md`.

### 4. Cut over in a staged, reversible order and re-verify

Never do a live cutover without a rollback. Deploy to the `vercel.app` URL first and swap the custom domain later; rotate Supabase keys one client at a time (both old and new keys work simultaneously during migration); keep each step individually revertible; re-verify after every stage. A live cutover with no rollback is how a client app goes dark.

Source: `research/cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md` (vercel.app-first ordering + rollback line), `research/supabase-cloud-deploy/2026-06-29-supabase-new-api-keys-migration.md` (swap one client at a time). Full procedure in `guides/05-sandbox-to-live-cutover.md`.

### 5. Secrets are env/token-only

Never log a secret, never echo it into shell history, never commit it. Set secret values via stdin, not as a CLI flag: `printf '%s' "$VAL" | vercel env add NAME production`. Use a `sbp_...` Supabase access token, not a DB password. The deploy touches every credential set (Vercel, Supabase, third-party), so the discipline is constant.

Source: `research/vercel-env-secrets/2026-06-29-vercel-cli-env-command.md` (the env-via-stdin pattern, and the warning that `echo ... |` saves to bash history), `research/internal-prior-art/2026-06-29-cuantico-supabase-token-deploy.md` (token-only deploy, never display/commit service_role).

### 6. Stay in lane

- CI/CD pipeline authoring (containers, GitHub Actions topology) -> devops-guardian.
- Supabase platform CODE (RLS, auth-hook internals, function internals, `config.toml` `verify_jwt` semantics, enabling the custom access-token hook) -> supabase-platform-guardian. This weapon CONSUMES the deploy commands (`link` / `db push` / `functions deploy`); it does not re-own the platform layer.
- Migration AUTHORING -> db-guardian. This weapon owns the PUSH/cutover only.
- App feature code -> the language Guardians.

Source: the Command Brief SUBAGENT CRITICAL DIRECTIVES, and `research/research-summary.md` (lane reminders).

### 7. No em dashes

No em dashes in any runbook, report, or prose, ever. Use a comma, colon, parentheses, period, or semicolon.

## How the directives map to the guides

| Directive | Primary guide |
|---|---|
| 1 NEXT_PUBLIC hard line | `01-env-secret-wiring.md` |
| 2 Ready is not working | `03-deploy-trigger-and-verify.md` |
| 3 Debug before code | `04-deploy-debug.md` |
| 4 Staged reversible cutover | `05-sandbox-to-live-cutover.md` |
| 5 Secrets env/token-only | `01-env-secret-wiring.md`, `02-supabase-cloud-push.md` |
| 6 Stay in lane | this guide |
| 7 No em dashes | all output |
