# 04 - Debug a failing or 404-ing deploy

When a deploy is Ready but 404s or 500s, debug the deploy before the code (directive #3). Most "broken deploys" are config, redirect, or env, not application code. This guide leads with the redirect-follow technique, the signature method that the public docs do not teach. Worked use in `examples/02-debug-ready-but-404.md`.

## Step 1 (lead here): follow the redirect chain

A gated Next.js app can 404 even when the Vercel build is Ready. The cause is usually auth middleware: it redirects an unauthenticated request to `/sign-in` (and a wrong-role request to `/403`); if those page routes were never built, the redirect lands on a Next 404. The deploy looks fine; the app 404s at `/`.

Diagnose by FOLLOWING the redirect, not by reading the rendered 404:

```bash
curl -sD - https://<url>/ | grep -i location
```

- A `307`/`302` with `Location: /sign-in` (a redirect, not a direct 404) points at MIDDLEWARE, not deploy config. The Root Directory and framework were correct. Fix = build the redirect-target pages (`/sign-in`, `/403`). Do not assume the 404 is a build-config problem.
- A direct `404` with no redirect points at config; go to step 2.

This is the centerpiece of the debug method. Reproduce the command and the 307/302-means-middleware heuristic exactly.

Source: `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md`.

## Step 2: check Output Directory and Root Directory

If it is a direct 404 (no redirect), a successful build can still serve an empty folder:

- **Incorrect Output Directory.** Even with a clean build, Vercel serves files from the configured Output Directory; if that is wrong (or empty), expected paths do not exist and 404. For Next.js this is usually auto-detected; override lives in `next.config.js` (`distDir`).
- **Wrong Root Directory (monorepo).** The Root Directory must point at the app subdir. If it points at the workspace root or the wrong app, the build runs against the wrong project.

Source: `research/deploy-debug-404/2026-06-29-vercel-kb-404-after-build.md`.

## Step 3: check rewrites (SPA case only)

For a Vite/CRA-style SPA (not Next.js SSR), a missing catch-all rewrite to `/index.html` causes 404 on client-routed paths, because Vercel resolves every URL server-side unless told otherwise. This is NOT the common Next.js cause; for a Next.js app, the redirect-to-unbuilt-page case (step 1) and the Root Directory case (step 2) are far more likely than SPA rewrites.

Source: `research/deploy-debug-404/2026-06-29-vercel-kb-404-after-build.md`, `research/deploy-debug-404/2026-06-29-vercel-404-community-causes.md`.

## Step 4: read build AND runtime logs

Examine both the build logs and the runtime logs for errors or warnings indicating why pages fail to load. A build-clean app can fail at runtime (a server route 500ing on a missing env, a DB route timing out). The build log alone will not show a runtime fault.

Source: `research/deploy-debug-404/2026-06-29-vercel-kb-404-after-build.md`.

## Step 5: check env wiring

Before touching code, verify the env is wired per environment. Common env-class faults:

- **Vars not set for the right environment.** They must be set explicitly for Production, Preview, and Development; they do not transfer automatically (a real gotcha for Lovable-imported apps, which the Cuantico team uses).
- **A missing server-only var causing a silent fallback.** A server snapshot reading `process.env.SUPABASE_SECRET_KEY` falls back to demo data when absent. The page renders Ready but serves placeholder data. The DB-touching smoke check (`guides/03`) is what surfaces this.
- **A frozen `NEXT_PUBLIC_` var.** If a `NEXT_PUBLIC_` var was changed but the app shows the old value, no rebuild was triggered; the value is frozen at build time (`guides/01`). Redeploy.

Source: `research/deploy-debug-404/2026-06-29-vercel-404-community-causes.md`, `research/internal-prior-art/2026-06-29-cuantico-deploy-debug-gotchas.md`, `research/vercel-env-secrets/2026-06-29-nextjs-env-vars-official.md`.

## Step 6: stale build cache

If a deploy still 404s after a config change that should have fixed it, the cache may have served a stale build. In Vercel, on the latest deployment choose Redeploy then Redeploy without existing Build Cache.

Source: `research/deploy-debug-404/2026-06-29-vercel-404-community-causes.md`.

## Only now: hand off a genuine code defect

If steps 1 through 6 clear and the fault is a real application bug (a route handler throwing, a component crashing), hand it to the language Guardian. That is the lane boundary in directive #6. You diagnosed the deploy; the code fix is theirs.

## The debug order, condensed

1. Follow the redirect chain (`curl -sD - <url> | grep -i location`); 307/302 = middleware, build the target pages.
2. Direct 404 -> Output Directory, then Root Directory (monorepo).
3. SPA only -> rewrites to `/index.html`.
4. Read build AND runtime logs.
5. Check env wiring (per-environment, silent fallback, frozen NEXT_PUBLIC).
6. Redeploy without build cache if a fix did not take.
7. Genuine code defect -> language Guardian.
