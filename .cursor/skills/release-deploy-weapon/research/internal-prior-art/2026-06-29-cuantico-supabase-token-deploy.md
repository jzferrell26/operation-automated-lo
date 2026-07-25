---
source_url: internal://cuantico/reference_supabase_cloud_deploy.md
retrieved_on: 2026-06-29
source_type: changelog
authority: official
relevance: critical
topic: prior-art
weapon: release-deploy-weapon
---

# Cuantico internal prior art: Supabase cloud-deploy via token/API (Equipment Room)

## Summary
The proven token-only Supabase cloud-deploy pattern from a real Cuantico deploy. The brief notes this pattern is OWNED by supabase-platform-guardian and CONSUMED here. It is the authoritative, field-tested expansion of the public Supabase deploy docs: how to push migrations, deploy functions, run arbitrary SQL, and seed/verify a cloud project with ONLY a `sbp_...` personal access token, no dashboard clicks and no DB password.

## Key quotations / statistics
- Token auth: `export SUPABASE_ACCESS_TOKEN=sbp_...` (or `supabase login`), then `npx -y supabase@latest link --project-ref <ref>`.
- Migrations: "`supabase db push` applies all `supabase/migrations/*` to the linked cloud DB WITHOUT prompting for the DB password (the access token + linked config suffice). `supabase migration list` shows Local vs Remote to confirm."
- Edge Functions: "`supabase functions deploy <name>` bundles + uploads via the Management API: no DB password, no Docker needed (CLI 2.x native bundling). Respects `supabase/config.toml` `[functions.x] verify_jwt`."
- Arbitrary SQL with only the token (no DB password): `POST https://api.supabase.com/v1/projects/{ref}/database/query` with body `{"query":"..."}`, `Authorization: Bearer $TOKEN`. "Build the JSON body safely with `jq -Rs '{query:.}'` piping the SQL (raw `--data` mangles quotes). This runs as admin (bypasses RLS) - good for seeding cloud and reading pg_class/RLS state."
- API keys: `GET /v1/projects/{ref}/api-keys` returns `anon` (client-safe) + `service_role` (secret, never display/commit).
- Custom access-token hook must be ENABLED as a project Auth setting, not just created in a migration: `PATCH /v1/projects/{ref}/config/auth` with `{"hook_custom_access_token_enabled":true,"hook_custom_access_token_uri":"pg-functions://postgres/public/custom_access_token_hook"}`. Without enabling, signed-in JWTs lack the claim.
- Edge Functions auto-inject `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` at runtime; you only `supabase secrets set` the EXTERNAL secrets (Stripe, GHL, etc.).
- Create an auth user programmatically: `POST {projectUrl}/auth/v1/admin/users` with the service_role key in BOTH `Authorization: Bearer` and `apikey` headers, body `{email,password,email_confirm:true}`.

## Annotations for weapon-forge
- This is the proven mechanic behind the Supabase half of DEPLOY.md. It supplies the operational detail the public docs omit: no DB password, no Docker, `jq -Rs` for safe SQL bodies, `migration list` for parity verification.
- LANE BOUNDARY (important): the custom-access-token-hook ENABLE step, the secrets-set, and the function internals are supabase-platform-guardian's territory per the brief. release-deploy-guardian consumes the deploy commands (link / db push / functions deploy) for the cutover and hands the platform-config items off. The weapon should reference, not re-own, the auth-hook enabling.
- The `migration list` Local-vs-Remote check is the verification step for the migration push: use it in the smoke/parity check after `db push`.
- The auto-injected runtime env vars vs externally-set secrets distinction matters for the env matrix: do not try to set SUPABASE_URL/ANON/SERVICE_ROLE inside an Edge Function (they are auto-injected); only set EXTERNAL secrets. Cross-ref the new-keys note: `SUPABASE_PUBLISHABLE_KEYS`/`SUPABASE_SECRET_KEYS` are now also auto-injected.
