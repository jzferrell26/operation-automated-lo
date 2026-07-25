---
source_url: https://community.vercel.com/t/404-error-on-vercel-deployment-despite-successful-build/5601
retrieved_on: 2026-06-29
source_type: reddit
authority: community
relevance: medium
topic: debug-404
weapon: release-deploy-weapon
---

# Vercel Community + DEV: 404 despite successful build (community consensus)

## Summary
Community-thread consensus (Vercel Community forum, GitHub discussion vercel/next.js#40287, and DEV write-ups including a 3-hour Lovable-app 404 debug) on the practical causes and fixes for a Ready-but-404 deploy. Corroborates the official KB and adds field-tested fixes: redeploy without build cache, and (for Lovable/imported apps) env vars that did not transfer. Filed as community-authority corroboration, not primary.

## Key quotations / statistics
- Catch-all rewrite fix: "A catch-all route rewrite that captures all incoming requests and redirects them to root ensures your application handles routing instead of letting Vercel try to find static files for each route." (SPA-style fix; not for Next.js SSR apps.)
- Stale build cache: "Going to your latest deployment in Vercel and choosing 'Redeploy -> Redeploy without existing Build Cache' can help, as old cached builds have caused deployment issues."
- Lovable / imported apps: "ensure environment variables are manually added to Vercel's Settings -> Environment Variables and set for Production, Preview, and Development - they don't automatically transfer from Lovable."
- Next.js `distDir` / Output Directory override lives in `next.config.js`.

## Annotations for weapon-forge
- The "redeploy without build cache" step is a useful early move in the debug runbook when a deploy 404s after a config change that should have fixed it (the cache served a stale build).
- The Lovable env-transfer gotcha is directly relevant to the Cuantico stack (the team uses Lovable). Cross-reference the Cuantico prior art and the Vercel CLI env note: env must be set per environment (Production/Preview/Development) explicitly.
- Use this only to corroborate the official KB; cite the KB as authority of record.
