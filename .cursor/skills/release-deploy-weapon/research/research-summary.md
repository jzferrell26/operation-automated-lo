# Research Summary: release-deploy-weapon

Authored by loremaster. Handoff to weapon-forge.

- **Depth tier consumed:** normal (~100-page budget; triaged to 14 high-signal source notes across 7 topics)
- **Time window covered:** 2025-12-29 to 2026-06-29 (6 months). Window was sufficient; no extension to 12 months needed. All sources are 2026-current or evergreen official docs verified current in 2026.
- **Tools used:** WebSearch + WebFetch (Firecrawl/Exa not connected this run). Vercel and Supabase official docs fetched directly and quoted verbatim; practitioner sources triaged from search and corroborated against official docs.

## Files written (14), by subfolder
- `vercel-env-secrets/` (3): Next.js env official docs, Vercel CLI env command, NEXT_PUBLIC/server-only practitioner patterns
- `deploy-debug-404/` (2): Vercel KB 404-after-build (official), community 404 causes
- `supabase-cloud-deploy/` (3): functions deploy (official), migrations db push (official), new API keys migration (official)
- `cutover-runbook/` (2): MakerKit production cutover runbook, Vercel+Supabase works/breaks 2026
- `deploy-verification/` (1): post-deploy smoke-test go/no-go gate
- `host-decision/` (1): Vercel vs Netlify vs self-host 2026
- `internal-prior-art/` (2): Cuantico deploy-debug gotchas, Cuantico Supabase token-deploy
- Plus `research-plan.md`, `index.md`, this `research-summary.md`.

## Query coverage (all 6 brief queries + 3 refining)
1. NEXT_PUBLIC server-only wiring -> covered (official Next.js + Vercel CLI docs)
2. Ready build 404 redirect debugging -> covered (Vercel KB + Cuantico redirect-follow prior art)
3. Supabase migrations + Edge Functions to cloud -> covered (3 official Supabase docs)
4. sandbox-to-live keys cutover runbook -> covered (MakerKit runbook + new-keys migration)
5. post-deploy smoke check -> covered (2026 smoke-test consensus)
6. Vercel vs Netlify vs self-host -> covered (decision note)
Refining queries added on gaps: Supabase new API keys migration, Vercel CLI env-via-stdin, Next.js build-time-vs-runtime env inlining. All resolved.

## The 5 most influential sources (for weapon-forge)
1. **Next.js env vars official docs** (`vercel-env-secrets/2026-06-29-nextjs-env-vars-official.md`) - the build-time-inlining-is-frozen fact is the spine of directive #1 and explains a whole failure class. Highest-authority, most load-bearing.
2. **Cuantico deploy-debug gotchas** (`internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md`) - the redirect-follow 404 technique (`curl -sD - / | grep -i location`, 307/302 = middleware not config) is the Guardian's signature method and is NOT in the public docs. Lead the debug guide with it.
3. **MakerKit production cutover runbook** (`cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md`) - the closest existing artifact to the required DEPLOY.md output: ordered steps, env matrix, post-deploy auth-URL config, rollback. Use as the runbook skeleton.
4. **Supabase new API keys migration** (`supabase-cloud-deploy/2026-06-29-supabase-new-api-keys-migration.md`) - the 2026 breaking change (sb_publishable_/sb_secret_ replacing anon/service_role, legacy deprecated end of 2026). Reshapes the env matrix; must be encoded as the new default.
5. **Post-deploy smoke-test go/no-go gate** (`deploy-verification/2026-06-29-smoke-test-cicd-go-nogo-gate.md`) - the external authority for directive #2 (Ready is not working); names the exact failure classes (routing 404/500, missing env/secrets) the smoke check must catch.

## Open questions (for the USER to resolve, not weapon-forge to invent)
1. **Key-naming convention to standardize on.** Three naming sets are live in the sources: legacy (`SUPABASE_SERVICE_ROLE_KEY`, Cuantico current), official-new (`sb_secret_`/`sb_publishable_`), and MakerKit env-var-new (`SUPABASE_SECRET_KEY`/`NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`). The weapon should default to the new keys, but the operator should confirm which env-var NAMES the Cuantico apps actually use, since live projects may still run legacy keys through end of 2026.
2. **Monorepo Root Directory per app.** The Root-Directory-is-the-app-subdir rule is universal, but the exact subdir (`apps/web`, `apps/admin`, etc.) is a per-repo input the operator supplies at deploy time. The brief already carries this as a TODO.
3. **Which routes constitute the smoke check** for a given app (the specific DB-touching route and auth-gated route) are per-app and must come from the operator/repo.

## Sources weapon-forge should consider re-fetching with deeper context (if it has tooling)
- Supabase changelog / discussion #40300 for the precise legacy-key deprecation dates and any update past June 2026 (the migration timeline could tighten).
- Vercel `vercel.json` rewrites/redirects reference, if the weapon needs to author rewrite config for non-Next.js SPA cases (currently out of the Next.js-first scope but adjacent).
- A worked DB-touching smoke-check script example (none of the sources gave a copy-paste smoke script; weapon-forge may want to author one as a template from the principles gathered).

## Lane reminders carried from the brief (do NOT cross in the weapon)
- CI/CD pipeline authoring (containers, GitHub Actions topology) -> devops-guardian.
- Supabase platform CODE (RLS, auth-hook internals, function internals, config.toml semantics) -> supabase-platform-guardian. This weapon CONSUMES the deploy commands; it does not re-own the platform layer.
- App feature code -> language Guardians.
- Migration AUTHORING -> db-guardian; this weapon owns the PUSH/cutover only.
