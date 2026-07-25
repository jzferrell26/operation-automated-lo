---
source_url: https://nextjs.org/docs/pages/guides/environment-variables
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: env
weapon: release-deploy-weapon
---

# Next.js: How to use environment variables (official docs, v16.2.9, lastUpdated 2025-04-24)

## Summary
The canonical Next.js rule set for environment variables. This is the primary authority behind the Guardian's "NEXT_PUBLIC vs server-only is a hard line" directive. The load-bearing fact: `NEXT_PUBLIC_` variables are inlined into the browser bundle AT BUILD TIME, frozen at the value present when `next build` ran; non-prefixed variables stay server-only and never reach the browser. This is why a leaked secret in a NEXT_PUBLIC var is permanent (baked into shipped JS) and why a NEXT_PUBLIC var cannot be changed by re-setting the env without a rebuild.

## Key quotations / statistics
- "Non-`NEXT_PUBLIC_` environment variables are only available in the Node.js environment, meaning they aren't accessible to the browser (the client runs in a different environment)."
- "In order to make the value of an environment variable accessible in the browser, Next.js can 'inline' a value, at build time, into the js bundle that is delivered to the client, replacing all references to `process.env.[variable]` with a hard-coded value. To tell it to do this, you just have to prefix the variable with `NEXT_PUBLIC_`."
- "After being built, your app will no longer respond to changes to these environment variables ... all `NEXT_PUBLIC_` variables will be frozen with the value evaluated at build time, so these values need to be set appropriately when the project is built. If you need access to runtime environment values, you'll have to setup your own API to provide them to the client."
- "By default, environment variables are only available on the server. To expose an environment variable to the browser, it must be prefixed with `NEXT_PUBLIC_`."
- Dynamic lookups are NOT inlined: `process.env[varName]` and `const env = process.env; env.NEXT_PUBLIC_X` will NOT be replaced. Only direct static `process.env.NEXT_PUBLIC_X` references are inlined.
- Env load order (first match wins): `process.env` > `.env.$(NODE_ENV).local` > `.env.local` (skipped in test) > `.env.$(NODE_ENV)` > `.env`.
- Allowed `NODE_ENV` values: `production`, `development`, `test`.

## Annotations for weapon-forge
- This is the spine of the env-wiring guide. Build the "NEXT_PUBLIC vs server-only" guide directly on these quotes.
- The build-time-inlining-is-frozen fact explains a real deploy failure class: env changed in Vercel but the app still shows the old value because no rebuild was triggered. Pair this with the Cuantico note (a server snapshot reading `process.env.SUPABASE_SERVICE_ROLE_KEY` silently falls back to demo data when the env is absent) in `internal-prior-art/`.
- The dynamic-lookup-not-inlined caveat is a subtle gotcha worth a callout box: a "clever" indirection that reads NEXT_PUBLIC vars dynamically will return undefined in the browser.
- Pages Router URL; App Router behavior is equivalent for env semantics but verify if weapon targets App Router specifically (it does, per Cuantico stack).
