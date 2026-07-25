# Routing guide: `release-deploy-guardian`

**Guardian:** [`ai-tools/agents/release-deploy-guardian.md`](../../agents/release-deploy-guardian.md)
**Weapon:** [`ai-tools/skills/release-deploy-weapon/`](../../skills/release-deploy-weapon/)
**Command Brief:** [`ai-tools/command-briefs/release-deploy-guardian-command-brief.md`](../../../command-briefs/release-deploy-guardian-command-brief.md)
**Trigger policy:** on-demand

## Domain
Cloud DEPLOY orchestration specialist for Next.js + Supabase + Vercel apps. It gets an app from
sandbox to a verified live deployment and keeps it reversible. It wires the Vercel project env and
secrets while holding the `NEXT_PUBLIC` (client-exposed, inlined at build time and frozen) vs
server-only line, pushes the Supabase migrations and Edge Functions to the cloud project with a
token-based workflow, triggers and smoke-verifies the deploy (Ready is not the same as working, so it
checks a real route that exercises the app plus the DB), debugs the 404-after-Ready class by following
the redirect chain, runs the staged reversible sandbox-to-live cutover, and maintains the DEPLOY.md
runbook. It owns the cloud cutover only: not the CI pipeline, not the Supabase platform code, not the
schema, not the app features.

## Trigger phrases (route here)
- "deploy this to Vercel", "verify the deploy"
- "wire the env vars for production", "set up the NEXT_PUBLIC vs server-only env"
- "push the Supabase migrations to cloud", "deploy the Edge Functions to cloud"
- "the deploy is Ready but 404s", "the deploy is green but the route is broken"
- "cut sandbox over to live", "run the staged cutover"
- "write the DEPLOY.md runbook"
- When an operator or a peer Guardian hands off a live cloud deploy, verification, debug, or cutover.
- Or when the request implicitly involves the Vercel deploy, the Supabase cloud push, deploy
  verification, the redirect-follow 404 debug, or the sandbox-to-live cutover.

## Do NOT route here
- CI/CD pipeline authoring (containers, GitHub Actions topology, the build pipeline itself) ->
  `devops-guardian`. This Guardian USES the pipeline to deploy; it does not author it.
- Supabase platform coding (RLS, auth hooks, Edge Function internals, Realtime / Storage wiring) ->
  `supabase-platform-guardian`. This Guardian PUSHES the functions and migrations to cloud; it does not
  write the platform-layer code inside them.
- Database schema or migration AUTHORING -> `db-guardian`. This Guardian pushes migrations; it does not
  design the schema or write the migration.
- App feature code, or a genuine code defect surfaced during a deploy debug -> the language Guardians
  (`typescript-node-guardian` / `react-guardian`). This Guardian debugs the deploy (config, redirect,
  env) before the code, then hands a real code defect off.

If a request straddles two domains, prefer the narrower-scoped Guardian and let this one act as the
cloud-cutover backup.

## Inputs the Guardian needs
Before invoking, ensure the user has provided (or you can infer):
- The deploy request type: deploy, verify, debug a failing/404-ing deploy, or cut sandbox over to live.
- The app to deploy: the Next.js repo and the monorepo Root Directory per app (`apps/web`, `apps/admin`)
  if it is a monorepo.
- The Supabase project ref and the Vercel project.
- The env/secret inventory: which vars are `NEXT_PUBLIC` (client-exposed) vs server-only, per
  environment (preview vs production).
- The current state: sandbox vs live, first deploy vs re-deploy, and what changed.
- For a verify task: which routes constitute the smoke check (the DB-touching route and the auth-gated
  route).

If a required input is missing, do not invoke yet; ask the user to supply it. Three open per-app items
are carried as operator inputs the Guardian does not invent: (1) which env-var key NAMES each live app
uses (legacy `anon` / `service_role` vs the new `sb_publishable_` / `sb_secret_`); (2) the monorepo
Root Directory per app; (3) which routes constitute each app's smoke check. Surface these rather than
guessing.

## Outputs the Guardian produces
- A verified live (or preview) deployment on Vercel plus the Supabase cloud project.
- A post-deploy smoke-verification result via the weapon's
  `templates/deploy-verification-report.template.md`, written into the weapon's `reports/`.
- An updated DEPLOY.md runbook in the repo (exact commands, env matrix, cutover order, rollback) via
  `templates/DEPLOY.md.template` and `templates/env-matrix.template.md`.
- For a debug task: the root cause plus the fix (or a handed-off code defect to the language Guardian).

## Multi-Guardian sequences this Guardian participates in
- Operator hand-off -> `release-deploy-guardian`: an operator or peer Guardian requests a live deploy,
  verification, debug, or cutover, which this Guardian executes (wire env -> push Supabase -> trigger ->
  verify -> debug if needed -> cutover -> update DEPLOY.md).
- `db-guardian` -> `release-deploy-guardian`: db-guardian authors the schema and migration; this Guardian
  pushes those migrations to the Supabase cloud project.
- `supabase-platform-guardian` -> `release-deploy-guardian`: supabase-platform-guardian writes the
  Edge Function and platform-layer code; this Guardian deploys it to cloud and wires its secrets.
- `release-deploy-guardian` -> `devops-guardian`: when the deploy needs a CI/CD pipeline change
  (containers, GitHub Actions topology), hand the pipeline authoring off there.
- `release-deploy-guardian` -> language Guardians (`typescript-node-guardian` / `react-guardian`): when a
  deploy debug isolates a genuine code defect (not config, redirect, or env), hand the code fix off
  there, then re-verify the deploy.

## Critical directives the orchestrator should respect
- `NEXT_PUBLIC` vs server-only is a hard line: a `NEXT_PUBLIC_` var ships to the browser, inlined at
  build time and frozen; a server-only var is never available client-side. A leaked key is a security
  incident and a missing one is a silent runtime failure.
- Ready is not working: always run a post-deploy smoke check against a real route. A Vercel build can go
  Ready and still 404 or 500 at runtime; the build status lies about app health.
- Debug the deploy before the code: follow the redirect chain (`curl -sD - <url> | grep -i location`; a
  307/302 means middleware/auth, not a config 404), read the logs, check env wiring first. Most broken
  deploys are config/redirect/env, not code, and a gated app legitimately 404s via a redirect.
- Cut over in a staged, reversible order and re-verify. A live cutover with no rollback is how a client
  app goes dark.
- Secrets are env/token-only; never log, echo into shell history, or commit them. Deploy touches every
  credential set (Vercel, Supabase, third-party).
- Carry the two 2026 breaking changes on every deploy: Supabase is retiring legacy `anon` /
  `service_role` keys for `sb_publishable_` / `sb_secret_` (projects created or restored since
  Nov 1, 2025 ship without legacy keys), and `vercel env add` now defaults prod/preview vars to
  `sensitive`, which cannot be read back via `vercel env ls`. Both reshape the env matrix and the verify
  step.
- Stay in lane: pipeline authoring -> `devops-guardian`; Supabase platform code -> `supabase-platform-guardian`;
  migration authoring -> `db-guardian`; feature code -> the language Guardians.
- No em dashes in any runbook, report, or prose, ever.

(Full list lives in the Guardian file's `## Critical directives` section.)

## Paired Weapon
`ai-tools/skills/release-deploy-weapon/` (read `SKILL.md` first as the master index, then
`guides/00-principles.md` for the lane boundaries and the seven critical directives before any env
wiring, Supabase push, deploy, verify, debug, or cutover action).

---

*Part of Dungeon Master's roster. See [`SKILL.md`](../SKILL.md) for the full Guild.*
