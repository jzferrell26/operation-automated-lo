---
source_type: official-docs + blog
authority: high
relevance: high
topic: cloud-vs-local-config
sources:
  - https://supabase.com/docs/guides/deployment/managing-environments
  - https://supabase.com/docs/guides/local-development/managing-config
  - https://supabase.com/blog/cli-v2-config-as-code
  - https://supabase.com/docs/reference/cli/supabase-link
  - https://supabase.com/docs/reference/api/introduction
date_captured: 2026-06-27
---

# Cloud vs local: linking, config-as-code, admin users

## The two targets
- **Local**: `supabase start` boots a full local stack; `db reset` re-applies migrations + seed. The rehearsal environment.
- **Cloud (linked)**: `supabase link --project-ref <ref>` connects the local project to a hosted project. Then `db push`, `functions deploy`, `secrets set`, and the Management API operate on cloud.

## Config-as-code (CLI v2)
- `supabase/config.toml` is the single source of truth for auth, db, storage, realtime, and per-function settings.
- `supabase config push` updates the linked remote's configuration from local `config.toml`. `supabase link` diffs local config against the remote so you can detect drift before pushing.
- `[remotes]` blocks hold per-environment overrides (staging vs production) in version control.

## Admin user creation (VERIFIED ground truth)
Create users server-side with the service-role key:
```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"seed@example.com","password":"...","email_confirm":true,"app_metadata":{"app_role":"admin"}}'
```
- The JS equivalent is `supabase.auth.admin.createUser(...)` (server-only).
- `email_confirm: true` skips the confirmation email for seed users.
- Setting `app_metadata.app_role` at creation pre-seeds the claim the custom access-token hook can also enforce.
- NEVER do this client-side; the service-role key bypasses RLS and is a breach if leaked.

## Recommended cutover sequence (token-only spine)
1. Rehearse locally: `db reset`, `functions serve`, pgTAP RLS test.
2. `export SUPABASE_ACCESS_TOKEN=...; supabase link --project-ref <ref>`.
3. `supabase db push` (deploy db-guardian's migrations).
4. `supabase functions deploy` (deploy Edge Functions).
5. `supabase secrets set --env-file ...` (only external secrets).
6. Enable the auth hook: `PATCH /v1/projects/{ref}/config/auth` (or `config push`).
7. Seed admin users via `auth/v1/admin/users`.
8. Verify: decode a fresh JWT for the custom claim; run a denied-RLS check with a real user token.

## Boundary
Production CI/CD pipeline topology (GitHub Actions wiring, container build) is devops-guardian's. This Guardian owns the cutover COMMANDS and their verification, not the pipeline they run inside.
