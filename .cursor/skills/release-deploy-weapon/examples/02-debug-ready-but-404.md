# Example 02 - Debug a Ready-but-404 deploy

The edge case that defines this Guardian: the Vercel build is Ready, but the app 404s at `/`. Demonstrates `guides/04` (and the directive #3 "debug the deploy before the code" discipline).

## Input the Guardian receives

> The `acme-portal` deploy is Ready in Vercel, the build log is clean, but visiting the site gives a 404. The dev says "the build passed, so it must be a routing bug in the code." Find the root cause.

## What the Guardian does

### Step 1: follow the redirect chain (do NOT trust the rendered 404)

```bash
curl -sD - https://acme-portal.vercel.app/ | grep -i location
# location: /sign-in
```

The response is a `307`, not a direct `404`. `Location: /sign-in` means the auth middleware is redirecting an unauthenticated request. So this is a MIDDLEWARE behavior, not a deploy-config 404. The Root Directory and framework were correct.

### Step 2: confirm the redirect target was built

```bash
curl -sD - https://acme-portal.vercel.app/sign-in | grep -i 'HTTP/'
# HTTP/2 404
```

There it is. The middleware redirects to `/sign-in`, but `/sign-in` was never built, so the redirect lands on a Next 404. The app "404s at `/`" because the unauthenticated redirect dead-ends.

### Root cause

Not a code routing bug and not a deploy-config fault. The `/sign-in` (and `/403`) page routes are missing from the build output. The deploy looked fine because the homepage build was fine; the failure is the unbuilt redirect target.

### Fix

Build the redirect-target pages (`/sign-in`, `/403`) and redeploy. After redeploy:

```bash
curl -sD - https://acme-portal.vercel.app/ | grep -iE 'HTTP/|location'
# HTTP/2 307
# location: /sign-in
curl -sD - https://acme-portal.vercel.app/sign-in | grep -i 'HTTP/'
# HTTP/2 200
```

Now the redirect resolves. The smoke check (`guides/03`) passes check #2.

## What the Guardian did NOT do

It did not accept the dev's "must be a routing bug in the code" and hand it straight to the language Guardian. Directive #3: debug the deploy first. The redirect-follow technique (`guides/04` step 1) found that the fault was an unbuilt page reachable only by following the redirect, which the rendered 404 hid. Had the chain shown a direct `404` with no `location`, the next move would have been Output Directory / Root Directory (step 2), not the code.

## Output the Guardian produces

- Root cause: middleware redirects `/` -> `/sign-in`, and `/sign-in` was not in the build output, so the redirect lands on a 404.
- Fix: build the `/sign-in` and `/403` pages; redeploy; re-verify with the redirect-follow check.
- A note for DEPLOY.md: add "confirm redirect-target pages (`/sign-in`, `/403`) are built" to the pre-deploy checklist.
