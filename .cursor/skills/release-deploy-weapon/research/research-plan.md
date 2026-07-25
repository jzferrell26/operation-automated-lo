# Research Plan: release-deploy-weapon

- **Depth tier:** normal
- **Time window:** 2026-06-29 back to 2025-12-29 (6 months); extend to 12 months only on a clear gap
- **Page budget target:** ~100 unique pages, triaged to the most authoritative
- **Source breadth target:** Vercel + Supabase official deploy docs (primary authority), practitioner blogs, GitHub READMEs / discussions, 1-2 comparison/industry write-ups
- **Tools used:** WebSearch + WebFetch (Firecrawl/Exa NOT connected this run)
- **Authority note:** Vercel and Supabase official docs are the external authorities. Some official docs pages are JS-rendered and may 404 the fetcher; use mirrors, changelog pages, or `.md` variants where available.
- **Internal prior art (Cuantico, authoritative, consumed not re-derived):** the deploy-debug gotchas (gated Next.js app 404s by redirect - follow it; MCP tools need a session restart after add; Vercel CLI in a monorepo + env-via-stdin for secret values; NEXT_PUBLIC vs server-only split) and the Supabase cloud-deploy-via-token pattern (db push + functions deploy + arbitrary SQL/seed with only an access token). Sourced from `reference_deploy_debug_gotchas.md` and `reference_supabase_cloud_deploy.md`.

## Initial queries (from session-zero / Command Brief)
1. "Vercel Next.js deploy env secrets NEXT_PUBLIC server-only wiring 2026"
2. "Vercel deploy Ready build 404 redirect debugging diagnosis 2026"
3. "Supabase migrations Edge Functions push to cloud deploy cutover 2026"
4. "Next.js Supabase Vercel sandbox to live keys cutover runbook 2026"
5. "deploy verification post-deploy smoke check production 2026"
6. "Vercel vs Netlify vs self-host Next.js deploy decision 2026"

## Refining queries (loremaster, added only on a clear gap)
- "Vercel CLI deploy env pull add stdin 2026" (env-wiring mechanics)
- "supabase CLI db push functions deploy access token non-interactive 2026" (token-based cloud deploy mechanics)
- "Next.js 15 / 16 deploy environment variables build-time vs runtime 2026" (the build-time inlining trap behind NEXT_PUBLIC)

## Topic subfolders (filing plan)
- `vercel-env-secrets/` - NEXT_PUBLIC vs server-only, env matrix, CLI env wiring
- `deploy-debug-404/` - Ready-but-broken, redirect-chain diagnosis, logs
- `supabase-cloud-deploy/` - db push, functions deploy, secrets, token-based CLI
- `cutover-runbook/` - sandbox-to-live cutover order, rollback, DEPLOY.md shape
- `deploy-verification/` - post-deploy smoke checks, health endpoints
- `host-decision/` - Vercel vs Netlify vs self-host
- `internal-prior-art/` - Cuantico deploy-debug + Supabase token-deploy notes
