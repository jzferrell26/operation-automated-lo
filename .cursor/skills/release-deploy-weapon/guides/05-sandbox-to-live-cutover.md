# 05 - Sandbox-to-live cutover

Swap keys, domains, and config from sandbox to live in a staged, reversible order, and re-verify after every stage. This is directive #4. The single rule: every step must be individually revertible, and you re-run the smoke check after each one. A live cutover with no rollback is how a client app goes dark. Worked use in `examples/01-happy-path-first-deploy.md`.

## Order the cutover so each step is reversible

### Stage 1: deploy to the vercel.app URL first, swap the custom domain later

Set `NEXT_PUBLIC_SITE_URL` to `https://<project>.vercel.app`, deploy, verify, and only then update it to the custom domain. Deploying straight to a custom domain on first cutover invites first-deployment failures (DNS not propagated, domain not yet attached). The rollback is the exact reverse: revert `NEXT_PUBLIC_SITE_URL` and redeploy.

Because `NEXT_PUBLIC_SITE_URL` is a `NEXT_PUBLIC_` var, changing it requires a redeploy to take effect (`guides/01`).

Source: `research/cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md`.

### Stage 2: rotate Supabase keys one client at a time

Both legacy and new keys (and both publishable and secret) work simultaneously during migration. Swap one client at a time and deactivate the old keys only after nothing depends on them. This is a textbook staged-reversible rotation:

1. Add the new key alongside the old in Vercel (new var name or new value).
2. Cut one client (server, then browser, or vice versa) to the new key.
3. Verify with the smoke check.
4. Repeat until all clients are on the new key.
5. Deactivate the legacy key last.

Source: `research/supabase-cloud-deploy/2026-06-29-supabase-new-api-keys-migration.md`.

### Stage 3: configure the Supabase Auth URLs (the easy-to-forget step)

After the app is live, set the Supabase Auth URL configuration, or OAuth and magic-link redirects will 404 or loop even though the app deploys Ready:

- Dashboard -> Authentication -> URL Configuration.
- Site URL = `https://yourdomain.com`.
- Redirect URLs = `https://yourdomain.com/auth/callback**`.
- For preview deploys, add a wildcard: `https://*-yourproject.vercel.app/auth/callback**`.

Note: webhooks only fire on production; preview URLs are protected/not publicly accessible, so webhook-dependent flows will not exercise on preview.

Lane note: the Auth URL configuration is a project Auth setting. If it overlaps the custom access-token hook enable or other Auth internals, that is supabase-platform-guardian's territory; you set the Site URL / Redirect URLs as part of the cutover and hand off deeper Auth config.

Source: `research/cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md`, `research/internal-prior-art/2026-06-29-cuantico-supabase-token-deploy.md`.

### Stage 4: swap the custom domain and re-verify

Now update `NEXT_PUBLIC_SITE_URL` to the custom domain, attach the domain in Vercel, redeploy, and re-run the full smoke check (`guides/03`) including the auth callback URL check (#4).

## Re-verify after every stage

Re-run the smoke check after each stage, not just at the end. The whole point of staging is that you find the broken stage immediately and revert just that one, instead of debugging a fully cut-over app that went dark.

Source: `research/deploy-verification/2026-06-29-smoke-test-cicd-go-nogo-gate.md`.

## Rollback, per stage

| Stage | Forward | Rollback |
|---|---|---|
| 1 Site URL | set to vercel.app, deploy | revert `NEXT_PUBLIC_SITE_URL`, redeploy |
| 2 Key rotation | cut one client to new key | point that client back to the old key (still active) |
| 3 Auth URLs | set Site URL + Redirect URLs | restore the previous Site URL / Redirect URLs |
| 4 Custom domain | set custom-domain Site URL, attach domain | revert to vercel.app Site URL, redeploy |

The rollback for the whole cutover is to revert `NEXT_PUBLIC_SITE_URL` and redeploy while the old keys are still active, then unwind any stage that was applied.

Source: `research/cutover-runbook/2026-06-29-supabase-vercel-integration-env-sync.md`, `research/supabase-cloud-deploy/2026-06-29-supabase-new-api-keys-migration.md`.

## Commercial-use gotcha for client deploys

The Vercel Hobby tier prohibits commercial use; a client production deploy must be on the Pro plan. Confirm the project is on Pro before cutting a paying client's app to live.

Source: `research/host-decision/2026-06-29-vercel-netlify-selfhost-2026.md`.
