---
source_url: https://vercel.com/kb/guide/why-is-my-deployed-project-giving-404
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: debug-404
weapon: release-deploy-weapon
---

# Vercel KB: Why is my deployed project giving a 404? (official knowledge base)

## Summary
Vercel's own enumeration of why a successfully-built deployment serves a 404. This is the external authority behind directive #3 (debug the deploy before the code). Note: Vercel's list covers CONFIG-level 404s (output directory, root directory, rewrites, framework preset). It does NOT cover the redirect-chain class of 404 that the Cuantico prior art documents (auth middleware redirects to an unbuilt page). The weapon's debug guide must UNION both: Vercel's config causes plus the Cuantico redirect-follow technique.

## Key quotations / statistics
- Missing SPA rewrites: "Vercel treats every URL as a server-resolved path unless you tell it otherwise, and SPAs rely on the browser to handle routing after `index.html` is loaded." Fix: a rewrite in `vercel.json` to `/index.html`.
- Incorrect Output Directory: "If this is not correct it can mean that, even if the project builds without any errors, Vercel is serving files from a potentially empty folder, leading to your expected paths not existing." Fix: verify Output Directory matches the build; check framework-specific `distDir`.
- Deployment URL / permission issues: wrong URL, deleted deployment, or deployment-protection access level.
- Build configuration errors: wrong build command or wrong directory (relevant to monorepos: the Root Directory must point at the app subdir).
- Build or runtime failures: "Examine both build logs and runtime logs for errors or warnings indicating why pages fail to load."

## Annotations for weapon-forge
- Build the deploy-debug decision tree from this PLUS the Cuantico note. Ordering for the guide: (1) follow the redirect chain first (`curl -sD - / | grep -i location`) - a 307/302 to `/sign-in` means middleware, not config; (2) if a direct 404 (not a redirect), check Output Directory and Root Directory (monorepo); (3) check rewrites; (4) read build AND runtime logs.
- The "Ready is not working" directive (#2) is reinforced here: a clean build with the wrong Output Directory serves an empty folder and 404s. The build status genuinely lies.
- For Next.js on Vercel specifically, Output Directory is usually auto-detected; the more common Next.js 404 cause is the monorepo Root Directory or the middleware-redirect-to-unbuilt-page case, not SPA rewrites (those are for Vite/CRA-style SPAs).
