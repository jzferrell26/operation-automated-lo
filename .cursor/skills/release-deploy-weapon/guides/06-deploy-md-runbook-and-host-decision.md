# 06 - DEPLOY.md runbook and the host decision

Maintain the DEPLOY.md runbook in the repo and, when asked, give the short Vercel-first host decision note. The runbook is the durable output of every deploy; keep it current. Worked use in `examples/01-happy-path-first-deploy.md`.

## Maintain DEPLOY.md

DEPLOY.md is the repo's deploy runbook: exact commands, the env matrix, the cutover order, and the rollback. Author it from `templates/DEPLOY.md.template`, and keep the env matrix from `templates/env-matrix.template.md`. It must contain, at minimum:

1. **Prerequisites / tooling preamble.** Vercel CLI authenticated (`vercel whoami`), Supabase access token exported, and the MCP-session-restart note (a Supabase MCP added mid-session is not callable until restart; use the CLI/token path for immediate work).
2. **The env matrix.** Every var, split into NEXT_PUBLIC (client) vs server-only, per environment. Default to the new Supabase key names; carry the legacy-name TODO.
3. **The exact deploy commands.** Env wiring (`guides/01`), Supabase push (`guides/02`), deploy trigger (`guides/03`), in order.
4. **The smoke check.** The four checks from `guides/03`, with this app's specific routes filled in.
5. **The cutover order.** The four staged steps from `guides/05`.
6. **The rollback.** The per-stage rollback table from `guides/05`.

The MakerKit production runbook is the skeleton this template is built on: ordered steps, env matrix table, post-deploy auth-URL config, preview wildcard, rollback line.

Source: `research/cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md`, `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md`.

Keep DEPLOY.md exact-command and copy-pasteable. A runbook with "deploy the app" instead of the literal command is a runbook that fails at 2am.

## The host decision (Vercel-first, with two off-ramps)

This weapon is Vercel-first for Next.js. Give this as a short note, not a multi-host runbook. Do NOT author a full Netlify or self-host runbook.

Decision heuristic:

- **Next.js + SSR/ISR/PPR + want zero ops -> Vercel.** The frictionless, opinionated default; outperformed Netlify across regions in Q1 2026 tests; the only host with full Partial Prerendering fidelity (so PPR adoption locks the choice to Vercel).
- **Cost predictability for a large team, or framework-neutral -> Netlify.** Flat $20/month Pro for unlimited team members (per-seat pricing removed April 2026); runs Next.js's own E2E suite daily for stable features.
- **Tight budget, willing to run infra, want everything on one box -> self-host (Coolify on a VPS).** A $6 to $14/month VPS hosts a dozen apps; Coolify gives Nixpacks auto-detection and PR preview URLs but consumes ~2GB RAM, so budget a 4GB+ VPS.

Gotcha for client work: Vercel Hobby prohibits commercial use, so client production deploys must be on Vercel Pro ($20/user/month).

Source: `research/host-decision/2026-06-29-vercel-netlify-selfhost-2026.md`.

## The 2026 changes to bake into every runbook

Two breaking changes must be reflected in DEPLOY.md and the env matrix:

1. **Supabase key migration.** Legacy `anon`/`service_role` are being retired for `sb_publishable_`/`sb_secret_`; projects created or restored since Nov 1, 2025 ship without legacy keys; legacy deprecated by end of 2026. Default the env matrix to the new keys, document both. (`guides/01`.)
2. **Vercel sensitive-by-default.** `vercel env add` defaults prod/preview vars to `sensitive`, unreadable via `vercel env ls`. The runbook's verification step must verify secrets at runtime (the DB-touching smoke check), not by listing env. (`guides/03`.)

Source: `research/supabase-cloud-deploy/2026-06-29-supabase-new-api-keys-migration.md`, `research/vercel-env-secrets/2026-06-29-vercel-cli-env-command.md`.
