---
source_url: https://makerkit.dev/docs/next-supabase-turbo/going-to-production/vercel
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: high
topic: cutover
weapon: release-deploy-weapon
---

# MakerKit: Deploy Next.js Supabase to Vercel (production cutover runbook)

## Summary
The single best end-to-end cutover runbook found, from a widely-used Next.js+Supabase SaaS starter. Gives an ordered, reversible deploy checklist that matches the Guardian's mandate almost exactly: monorepo Root Directory, the full env matrix split into NEXT_PUBLIC vs secret, the post-deploy Supabase URL configuration, and an explicit rollback. Also confirms the new Supabase key naming (`NEXT_PUBLIC_SUPABASE_PUBLIC_KEY` / `SUPABASE_SECRET_KEY`) is live in production templates.

## Key quotations / statistics
- Monorepo: set Vercel Root Directory to `apps/web`, Framework Preset Next.js.
- Env matrix - client (NEXT_PUBLIC): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`, plus product/title/description. Server-only: `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`.
- Cutover ordering gotcha (custom domain): "Set `NEXT_PUBLIC_SITE_URL` to `https://your-project.vercel.app`, deploy, then update to your custom domain later" to avoid first-deployment failures.
- Post-deploy Supabase config (Dashboard -> Authentication -> URL Configuration): Site URL = `https://yourdomain.com`; Redirect URLs = `https://yourdomain.com/auth/callback**`.
- Preview deploys: add a wildcard to Supabase Redirect URLs: `https://*-yourproject.vercel.app/auth/callback**`. Webhooks only fire on production (preview URLs aren't publicly accessible / are protected).
- ROLLBACK: "If deployment fails, revert the `NEXT_PUBLIC_SITE_URL` environment variable and redeploy."
- Build-time validation: Vercel "validates environment variables at build time" (a missing required var fails the build, not silently at runtime - this is the startup-validation pattern in practice).

## Annotations for weapon-forge
- Use this as the skeleton for the DEPLOY.md runbook template: ordered steps, env matrix table, post-deploy auth-URL config, preview wildcard, rollback line. It is the closest existing artifact to the weapon's required output.
- The "deploy with vercel.app URL first, swap domain later" ordering is a concrete instance of directive #4 (staged, reversible cutover). The rollback (revert NEXT_PUBLIC_SITE_URL + redeploy) is the matching reverse step.
- The Supabase Auth Redirect URL config is the auth-cutover step that is easy to forget and causes post-deploy login failures (the app deploys Ready, but OAuth/magic-link redirects 404 or loop because Site URL / Redirect URLs still point at localhost or the old domain). This belongs in the smoke-check list.
- New-key naming here corroborates the official Supabase key-migration doc (supabase-cloud-deploy/). Treat `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY` + `SUPABASE_SECRET_KEY` as the 2026 default env names.
