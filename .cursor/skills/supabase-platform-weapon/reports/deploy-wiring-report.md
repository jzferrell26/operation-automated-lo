# Supabase Deploy / Wiring Report

**Date:** YYYY-MM-DD
**Project ref:** `<ref>`
**Target:** local | linked cloud | both
**Operator:** supabase-platform-guardian
**Credential path:** token-only (`SUPABASE_ACCESS_TOKEN`) | token + service-role (admin user seed)

## Summary

One or two sentences: what was deployed and wired, and whether verification passed.

## Migrations deployed (db-guardian's SQL)

| Migration | How | Result |
|---|---|---|
| `0042_add_docs_table.sql` | `supabase db push` | applied |

## Edge Functions deployed

| Function | verify_jwt | How | Verify (status) |
|---|---|---|---|
| `list-docs` | true | `supabase functions deploy list-docs` | 200 with token / 401 without |

## Secrets set (external only)

| Secret | Set via | Notes |
|---|---|---|
| `RESEND_API_KEY` | `supabase secrets set` | external; Supabase keys are auto-injected, not set here |

## Auth hook

| Item | State |
|---|---|
| Hook function defined (migration) | yes |
| Hook ENABLED (PATCH /config/auth or config push) | yes |
| Grants to `supabase_auth_admin` applied | yes |
| Claim verified in a FRESH JWT | yes - `app_metadata.app_role` = `...` |

## RLS / Realtime / Storage wired

| Surface | Policy / config | Enforcement proof (real user token) |
|---|---|---|
| `public.invoices` | tenant isolation via `app_metadata.tenant_id` | non-owner denied: PASS |
| `storage.objects` (`user-files`) | folder = uid | cross-user read denied: PASS |

## Commands run

```bash
# paste the exact commands (token-only where possible)
```

## Flags, warnings, open questions

- `> TODO: open question - needs human decision` items, if any.
- Config drift between local `config.toml` and the linked remote, if observed.

## Handoffs

- Schema change needed -> db-guardian
- Provider / app sign-in flow -> auth-guardian
- Security audit of the RLS / key handling -> security-guardian
- CI/CD pipeline to run this cutover -> devops-guardian
