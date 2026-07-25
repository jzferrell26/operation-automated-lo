# Example 01 - Happy-path first deploy and cutover

A clean first-deploy of a Next.js + Supabase monorepo app to Vercel, with the staged cutover. Demonstrates `guides/01` through `guides/06`.

## Input the Guardian receives

> Deploy `acme-portal` to production. Monorepo, the app is `apps/web`. Supabase project ref `abcdwxyz`. New project (created Jan 2026), so it uses the new Supabase keys. Vercel project `acme-portal` exists and is on Pro. First deploy, sandbox to live, custom domain `portal.acme.com`. DB-touching route is `/dashboard` (lists items from Postgres); auth-gated route is `/dashboard` (redirects to `/sign-in` when logged out).

## What the Guardian does

### 1. Confirm Root Directory and host (guides/03, guides/06)

```bash
vercel link --yes --project acme-portal
vercel pull --yes
# .vercel/project.json shows rootDirectory: "apps/web" -> correct
```

Project is on Pro (commercial use allowed). Vercel-first is correct for this Next.js SSR app.

### 2. Wire env per environment (guides/01)

New-key naming, publishable client-side, secret server-only. Secret value via stdin so it never hits shell history:

```bash
vercel env add NEXT_PUBLIC_SITE_URL production            # set to https://acme-portal.vercel.app FIRST
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLIC_KEY production  # sb_publishable_...
printf '%s' "$SUPABASE_SECRET_KEY" | vercel env add SUPABASE_SECRET_KEY production   # sb_secret_...
```

Note: these are now stored `sensitive` and cannot be read back via `vercel env ls`. They will be verified at runtime by the smoke check, not by listing.

### 3. Push Supabase to cloud (guides/02)

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
npx -y supabase@latest link --project-ref abcdwxyz
supabase db pull          # no remote drift
supabase db push          # migrations applied
supabase migration list   # Local == Remote, parity confirmed
supabase functions deploy # all Edge Functions live
supabase secrets set STRIPE_SECRET_KEY=sk_...   # external secret only
```

### 4. Deploy and smoke-verify (guides/03)

```bash
vercel --prod --yes       # reaches Ready
```

Ready is not the verdict. Run the smoke check (`templates/smoke-check.sh`):

1. `curl -sD - https://acme-portal.vercel.app/ | grep -iE 'HTTP/|location'` -> `200`. Pass.
2. `/dashboard` logged out -> `307 Location: /sign-in`, and `/sign-in` -> `200`. Middleware works. Pass.
3. `/dashboard` authenticated -> returns real item rows within the timeout. Env wiring + Supabase connection confirmed; no demo-data fallback. Pass.
4. Auth callback URL resolves. Pass after step 6 below.

### 5 to 6. Staged cutover (guides/05)

- Stage 1 already done: deployed on the vercel.app URL.
- Stage 3 (Auth URLs): Supabase Dashboard -> Authentication -> URL Configuration: Site URL `https://portal.acme.com`, Redirect URLs `https://portal.acme.com/auth/callback**`, plus preview wildcard `https://*-acme-portal.vercel.app/auth/callback**`.
- Stage 4 (custom domain): set `NEXT_PUBLIC_SITE_URL` to `https://portal.acme.com`, attach the domain in Vercel, redeploy (NEXT_PUBLIC needs a rebuild), re-run the full smoke check including check #4.

Keys are new-only, so no stage-2 rotation needed.

## Output the Guardian produces

- A verified live deployment at `https://portal.acme.com`.
- A deploy-verification report (from `templates/deploy-verification-report.template.md`) filed in `reports/`, all four checks green.
- `DEPLOY.md` written from `templates/DEPLOY.md.template`, with the env matrix, the four exact-command stages, the smoke check with `/dashboard` filled in, and the per-stage rollback table.

## Why this is the happy path

Every directive held: the hard NEXT_PUBLIC/secret line (#1), a runtime smoke check rather than trusting Ready (#2), staged reversible cutover with re-verify (#4), secrets via stdin and token-only (#5), and no platform-code or pipeline work crossed into another lane (#6).
