---
source_url: https://supabase.com/docs/guides/functions/deploy
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: supabase-deploy
weapon: release-deploy-weapon
---

# Supabase: Deploy Edge Functions to Production (official docs)

## Summary
The authoritative CLI sequence for pushing Edge Functions to a cloud Supabase project. Confirms the token-based, Docker-free, password-free deploy path the Guardian uses: login (or SUPABASE_ACCESS_TOKEN) -> link -> functions deploy. JWT verification is controlled in `config.toml`, not a deploy flag. For CI/non-interactive use, `SUPABASE_ACCESS_TOKEN` + `--project-ref` replaces the interactive login/link.

## Key quotations / statistics
- Login: `supabase login`. List projects: `supabase projects list`. Link: `supabase link --project-ref your-project-id`.
- Deploy all functions: `supabase functions deploy`. Deploy one: `supabase functions deploy hello-world`.
- "All edge functions within the functions folder can be deployed with a single command" and "When deployment is successful, the function is automatically distributed to edge locations worldwide."
- JWT verification is configured in `config.toml`, not via a deploy flag:
  ```toml
  [functions.hello-world]
  verify_jwt = false
  ```
- CI / non-interactive deploy uses the access token env var:
  ```yaml
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    PROJECT_ID: your-project-id
  ```
  then `supabase functions deploy --project-ref $PROJECT_ID`.
- Edge Functions can be deployed via Dashboard, CLI, or MCP.

## Annotations for weapon-forge
- This is the citation of record for the Supabase-side deploy steps in DEPLOY.md. Pair with the Cuantico prior art (`internal-prior-art/`) which adds the proven detail that CLI 2.x does native bundling so NO Docker and NO DB password is needed, and that `db push` applies migrations without prompting for the DB password when the access token + linked config are present.
- Important lane note: per the brief, the Supabase platform CODE (function internals, RLS, auth hooks, config.toml verify_jwt semantics) is owned by supabase-platform-guardian. release-deploy-guardian CONSUMES this deploy mechanic; the weapon should reference it for the cutover, not re-teach Edge Function authoring.
- `verify_jwt` in config.toml is a security-relevant setting (a public function vs a JWT-gated one). The deploy guide should call out that this is set in config and travels with the deploy, not toggled at deploy time.
