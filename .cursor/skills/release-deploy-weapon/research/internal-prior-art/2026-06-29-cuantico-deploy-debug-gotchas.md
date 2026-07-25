---
source_url: internal://cuantico/reference_deploy_debug_gotchas.md
retrieved_on: 2026-06-29
source_type: changelog
authority: official
relevance: critical
topic: prior-art
weapon: release-deploy-weapon
---

# Cuantico internal prior art: deploy-debug gotchas (Equipment Room cloud bring-up)

## Summary
Hard-won, battle-tested deploy-debug lessons from a real Cuantico cloud bring-up (The Equipment Room). The brief names this as authoritative internal prior art that the weapon consumes. These are the four signature gotchas that define this Guardian's debugging method, and they are NOT all covered by the public Vercel/Supabase docs (especially the redirect-follow 404 technique).

## Key quotations / statistics
- THE redirect-404 technique (directive #3): "A gated Next.js app can 404 even when the Vercel build is 'Ready.' Cause: auth middleware redirects unauthenticated to `/sign-in` (and wrong-role to `/403`); if those page routes were never built, the redirect lands on a Next 404. The deploy looks fine; the app 404s at `/`. Diagnose by FOLLOWING the redirect (`curl -sD - / | grep -i location`) - a `307`/`302` with `Location: /sign-in` (not a direct 404) points at middleware, not deploy config. Fix = build the redirect-target pages. Root Directory / framework were correct; do not assume the 404 is a build-config problem."
- MCP session-restart: "MCP servers added mid-session do not expose their tools until the session restarts." After `claude mcp add ... supabase` + browser auth, `claude mcp list` showed Connected but tools were NOT callable until restart. Workaround: use the CLI/token path for immediate work.
- Vercel CLI + monorepo + env-via-stdin: Vercel CLI is already authenticated on the Cuantico machine (`vercel whoami` -> jonathan-4064, org cuantico-ai). Useful: `vercel link --yes --project <name>`; `vercel pull --yes` writes settings incl. `rootDirectory` to `.vercel/project.json`; `vercel env rm NAME production --yes` then `printf '%s' "$VAL" | vercel env add NAME production` (value via stdin, not flag); `vercel --prod --yes` deploys immediately. Monorepo: the project's Root Directory must be the app subdir (e.g. `apps/admin`); Vercel installs from the workspace root automatically.
- Server-secret-vs-client-key split: "in Vercel, `NEXT_PUBLIC_*` for the anon key/URL (browser), plain `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for server-only reads. A Next.js server snapshot that reads `process.env.SUPABASE_SERVICE_ROLE_KEY` falls back to demo data when that env is absent." (the silent-fallback failure that directive #2 exists to catch)

## Annotations for weapon-forge
- The redirect-follow technique is the CENTERPIECE of the deploy-debug guide and is the part the public docs do NOT teach. Lead the debug guide with it. The exact command (`curl -sD - / | grep -i location`) and the 307/302-means-middleware-not-config heuristic are load-bearing - reproduce them verbatim.
- The env-via-stdin pattern here (`printf '%s' "$VAL" | vercel env add NAME production`) is the secret-safe form; cross-ref the official Vercel CLI doc's `< file` and stdin support (vercel-env-secrets/).
- The silent-fallback-to-demo-data example is the concrete instance of "Ready is not working" (directive #2) and what the DB-touching smoke check is designed to catch.
- The MCP session-restart note is an operator-environment gotcha (Claude Code / Cursor specific): after adding the Supabase MCP, restart before relying on its tools, or use the CLI/token path. Useful in the runbook's tooling-setup preamble.
- Note the key names here use the LEGACY anon/service_role convention; cross-ref the new-key migration note (supabase-cloud-deploy/) - the weapon should present the new `sb_publishable_`/`sb_secret_` names as the 2026 default while keeping these legacy names recognizable since live Cuantico projects may still use them through end of 2026.
