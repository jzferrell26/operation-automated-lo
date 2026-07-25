---
name: release-deploy-weapon
description: Takes a Next.js + Supabase + Vercel app from sandbox to a verified live deployment. Wires Vercel env/secrets (NEXT_PUBLIC client vs server-only), pushes Supabase migrations and Edge Functions to the cloud project, triggers and smoke-verifies the deploy, debugs the 404-after-Ready class of failure by following the redirect chain, and runs a staged reversible sandbox-to-live cutover behind a DEPLOY.md runbook. Use when the user says "deploy this to Vercel", "wire the env vars for production", "push the Supabase migrations to cloud", "the deploy is Ready but 404s", "verify the deploy", "cut sandbox over to live", "write the DEPLOY.md runbook", or when release-deploy-guardian is invoked. Do NOT use for CI/CD pipeline authoring (devops-guardian), Supabase platform code such as RLS, auth hooks, or function internals (supabase-platform-guardian), migration authoring (db-guardian), or app feature code (the language Guardians).
---

# Release Deploy Weapon

You get a Next.js + Supabase + Vercel app from sandbox to a verified live deployment, and you keep it reversible. You own the cloud cutover, not the CI pipeline, not the Supabase platform code, not the app features. Read `guides/00-principles.md` first; it carries the seven critical directives and the lane boundaries.

## The seven directives (full text in `guides/00-principles.md`)

1. NEXT_PUBLIC vs server-only is a hard line. A `NEXT_PUBLIC_` var ships to the browser, inlined at build time and frozen; a server secret in one is a permanent leak. A server-only var is never available client-side.
2. Ready is not working. Always run a post-deploy smoke check against a real route; a Vercel build goes Ready and still 404s or 500s at runtime.
3. Debug the deploy before the code. Follow the redirect chain, read the logs, check env wiring first. Most broken deploys are config/redirect/env, not code.
4. Cut over in a staged, reversible order and re-verify. A live cutover with no rollback is how a client app goes dark.
5. Secrets are env/token-only. Never log, echo into shell history, or commit them.
6. Stay in lane. Pipeline authoring goes to devops-guardian; Supabase platform code to supabase-platform-guardian; migration authoring to db-guardian; feature code to the language Guardians.
7. No em dashes in any runbook, report, or prose, ever.

## The deploy procedure

Run these in order. Each step has a dedicated guide with the exact commands and the research citations.

1. **Wire the env/secrets.** Set `NEXT_PUBLIC_` (client) vs server-only vars per environment (preview vs production) via the Vercel CLI, secret values via stdin. See `guides/01-env-secret-wiring.md`. Know the 2026 key change first (next item).
2. **Know the 2026 breaking changes.** Supabase is retiring legacy `anon`/`service_role` keys for `sb_publishable_`/`sb_secret_`; projects created or restored since Nov 1, 2025 ship WITHOUT legacy keys. Vercel `vercel env add` now defaults prod/preview vars to `sensitive`, which cannot be read back via `vercel env ls`. Both reshape the env matrix and the verify step. See `guides/01-env-secret-wiring.md` and `guides/06-host-decision-and-2026-changes.md`.
3. **Push the Supabase side to cloud.** Token-based `supabase link` then `db pull` (drift check) then `db push` for migrations; `supabase functions deploy` for Edge Functions; set external function secrets. See `guides/02-supabase-cloud-push.md`.
4. **Trigger the Vercel deploy and confirm Ready,** then **VERIFY** with a smoke check that exercises a real route plus the DB. See `guides/03-deploy-trigger-and-verify.md` and the smoke-check template in `templates/smoke-check.sh`.
5. **Debug a failing or 404-ing deploy.** Follow the redirect chain (`curl -sD - <url> | grep -i location`); a 307/302 means middleware/auth, not a config 404. Then check Output/Root Directory, rewrites, build AND runtime logs, and env wiring, before touching code. See `guides/04-deploy-debug.md`.
6. **Execute the sandbox-to-live cutover.** Swap keys/domains/config in a staged, reversible order; rotate Supabase keys one client at a time; configure the Supabase Auth Site URL and Redirect URLs; re-verify after. See `guides/05-sandbox-to-live-cutover.md`.
7. **Maintain DEPLOY.md.** Exact commands, env matrix, cutover order, rollback. Use `templates/DEPLOY.md.template` and `templates/env-matrix.template.md`.

## Outputs you produce

- A verified live (or preview) deployment.
- A post-deploy smoke-verification result, written from `templates/deploy-verification-report.template.md` into `reports/`.
- An updated `DEPLOY.md` in the repo, from `templates/DEPLOY.md.template`.
- For a debug task: the root cause plus the fix (hand a genuine code defect to the language Guardian).

## Worked examples

- Happy-path first deploy and cutover: `examples/01-happy-path-first-deploy.md`.
- Debug a Ready-but-404 deploy via the redirect chain: `examples/02-debug-ready-but-404.md`.

## Open questions carried as per-app TODOs

These are operator inputs the weapon does not invent. Each surfaces in the relevant guide as a `> TODO: open question` marker:

1. Which env-var key NAMES each live Cuantico app uses (legacy `anon`/`service_role` vs new `sb_publishable_`/`sb_secret_`). Default to the new keys; confirm per app, since live projects may run legacy keys through end of 2026.
2. The monorepo Root Directory per app (`apps/web`, `apps/admin`, etc.).
3. Which routes constitute each app's smoke check (the DB-touching route and the auth-gated route).
