# 03 - Trigger the deploy and verify (Ready is not working)

Trigger the Vercel deploy, confirm it reaches Ready, and then VERIFY it with a smoke check that exercises a real route plus the database. This guide is directive #2 in practice: a build that goes Ready can still 404 or 500 at runtime, so the build status is not the verdict. Worked use in `examples/01-happy-path-first-deploy.md`. The script lives at `templates/smoke-check.sh`.

## Confirm the monorepo Root Directory first

For a monorepo, the Vercel project's Root Directory must be the app subdir, and the Framework Preset is Next.js. Vercel installs from the workspace root automatically. Read the linked project's settings:

```bash
vercel link --yes --project <name>
vercel pull --yes        # writes .vercel/project.json including rootDirectory
```

> TODO: open question - needs human decision before next refresh. The exact Root Directory subdir (`apps/web`, `apps/admin`, etc.) is a per-repo input the operator supplies at deploy time.

Source: `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md`, `research/cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md`.

## Trigger the deploy

```bash
vercel --prod --yes      # deploy to production immediately
# or push to the connected git branch to trigger the git integration
```

Wait until the deployment status is Ready. Then stop trusting that status and run the smoke check.

## The smoke check: a 5 to 15 minute go/no-go gate

A smoke test answers one question: is this build healthy enough to keep moving? It is fast (5 to 15 minutes), scoped to the critical paths only, and run right after deploy. It is NOT a full E2E suite (that is out of lane). It must catch the two failure classes this Guardian owns: broken startup/routing (404/500) and configuration/secrets issues (missing env, expired credentials, wrong secret wiring).

Source: `research/deploy-verification/2026-06-29-smoke-test-cicd-go-nogo-gate.md`.

### The four checks for this stack

1. **Homepage returns 200, not a redirect-to-unbuilt-page 404.** Follow the redirect chain to be sure: `curl -sD - https://<url>/ | grep -iE 'HTTP/|location'`. A clean `200` is the pass. A `307`/`302` to `/sign-in` is fine ONLY if `/sign-in` was built (check #2 confirms it); a direct `404` is a fail. (Cross-ref `guides/04-deploy-debug.md`.)
2. **One auth-gated route correctly redirects to sign-in.** This proves middleware works and the redirect target page exists. A `307`/`302` with `Location: /sign-in` and then a `200` at `/sign-in` is the pass.
3. **One DB-touching route returns real data within the serverless timeout.** This is the load-bearing check: it proves env wiring, the Supabase connection, and the cold-start budget all at once. It is what catches the silent fallback to demo data and the PgBouncer cold-start timeout. The route must complete within the serverless cap (10s Hobby, 15s Pro).
4. **The auth callback URL resolves.** This proves the Supabase Auth Site URL and Redirect URLs were cut over (see `guides/05-sandbox-to-live-cutover.md`); otherwise OAuth/magic-link redirects 404 or loop.

Sources: `research/deploy-verification/2026-06-29-smoke-test-cicd-go-nogo-gate.md` (the failure classes and the checklist), `research/cutover-runbook/2026-06-29-vercel-supabase-works-breaks-2026.md` (serverless timeout + PgBouncer cold start), `research/cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md` (auth callback URL), `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md` (the redirect-follow and the demo-data fallback).

> TODO: open question - needs human decision before next refresh. Which specific routes are the DB-touching route and the auth-gated route for THIS app are per-app inputs from the operator/repo. None of the sources gave a copy-paste smoke script, so `templates/smoke-check.sh` is authored from these principles as a fill-in template, not a turnkey script.

## Verify a secret landed without reading it back

Because Vercel now stores prod/preview vars as `sensitive` (you cannot read them via `vercel env ls`; see `guides/01-env-secret-wiring.md`), the only reliable way to confirm a secret was wired correctly is the DB-touching smoke check at runtime. Check #3 above IS the secret-verification step. Do not try to confirm a secret value by listing env vars.

Source: `research/vercel-env-secrets/2026-06-29-vercel-cli-env-command.md`.

## Then go deeper

After the smoke gate passes, check deeper health signals: build and runtime logs, metrics, and a watch for cold-start latency on infrequently hit routes. Record the result using `templates/deploy-verification-report.template.md` and file it in `reports/`.

Source: `research/deploy-verification/2026-06-29-smoke-test-cicd-go-nogo-gate.md`.
