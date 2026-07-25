# Research Index: supabase-platform-weapon

Manifest of all source notes. Depth: deep. Window: 2026-current (Supabase CLI v2 / config-as-code era). Tooling: WebSearch + WebFetch against `supabase.com` (Firecrawl/Exa unavailable in this environment; pipeline not blocked). Read-only audit trail for `weapon-forge`.

| File | Topic | Source type | Authority | Relevance | Backs guide |
|---|---|---|---|---|---|
| `research-plan.md` | plan + ground truth | meta | - | - | all |
| `research-summary.md` | executive summary | meta | - | - | all |
| `01-edge-functions-deno.md` | Edge Functions: config.toml, verify_jwt, secrets, auto-injected env | official-docs | high | high | `02-edge-functions.md` |
| `02-auth-custom-access-token-hook.md` | custom access-token hook: define + ENABLE, app_role claim | official-docs | high | high | `03-auth-hook.md` |
| `03-cli-management-api-deploy.md` | CLI + Management API token-only deploy, the jq SQL pattern | docs + verified-deploy | high | high | `01-deploy-workflow.md` |
| `04-rls-on-supabase.md` | security_invoker views, (select auth.uid()), service_role bypass | official-docs | high | high | `04-rls-on-supabase.md` |
| `05-local-stack-pgtap.md` | supabase start / db reset / seed / pgTAP test loop | official-docs | high | medium-high | `06-local-stack-testing.md` |
| `06-realtime-storage.md` | Realtime authorization (realtime.messages RLS), Storage RLS, signed URLs | docs + blog | high | medium-high | `05-realtime-storage.md` |
| `07-cloud-vs-local-config.md` | linking, config-as-code, admin user creation, cutover sequence | docs + blog | high | high | `01-deploy-workflow.md` |

## Five most influential sources
1. Supabase Edge Functions env-vars + function-configuration docs (the auto-injected vars + verify_jwt).
2. Supabase Custom Access Token Hook + Auth Hooks docs (the define-vs-enable split).
3. Supabase CLI reference (db push / functions deploy / link) + the verified token-only deploy.
4. Supabase RLS + RLS-performance troubleshooting docs (security_invoker, (select auth.uid())).
5. Supabase Realtime Authorization docs/blog (realtime.messages RLS model).

## Verified ground truth (overrides vaguer general results)
See `research-plan.md`. Key: token-only `db push`/`functions deploy`; Management API `POST /v1/projects/{ref}/database/query` runs arbitrary SQL (build body with `jq -Rs '{query:.}'`); the auth hook must be ENABLED via `PATCH /v1/projects/{ref}/config/auth`, not just defined; Edge Functions auto-inject the three legacy keys; admin users via `POST {url}/auth/v1/admin/users` with the service-role key.
