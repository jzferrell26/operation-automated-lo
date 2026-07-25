# supabase-platform-weapon

One-page human overview of the Weapon that arms `supabase-platform-guardian`.

## What it is

The procedural arsenal for the Guild's Supabase PLATFORM specialist. It encodes the 2026 deploy-and-wire workflow as opinionated, cite-everything guides: the token-only CLI + Management-API deploy spine, Edge Functions (Deno), the custom access-token hook (define AND enable), RLS-on-Supabase patterns, Realtime + Storage, and the local-stack + pgTAP rehearsal loop.

## The seam with db-guardian

This is the load-bearing distinction. `db-guardian` DESIGNS the Postgres schema, indexes, and migration SQL and tunes queries. `supabase-platform-guardian` DEPLOYS that SQL (via `supabase db push` or the Management API `database/query` endpoint) and WIRES the platform (Edge Functions, Auth hook, Realtime, Storage, RLS enforcement) around it. If a request is "design this table" it is db-guardian's; if it is "deploy this and make the auth claim show up" it is this Guardian's.

## The five facts it is built on (verified on a real deploy)

1. `supabase db push` and `supabase functions deploy` work with only a `SUPABASE_ACCESS_TOKEN`.
2. The Management API `POST /v1/projects/{ref}/database/query` runs arbitrary SQL with just the token; build the body with `jq -Rs '{query:.}'`.
3. The custom access-token hook must be ENABLED via `PATCH /v1/projects/{ref}/config/auth`, not just defined in a migration.
4. Edge Functions auto-inject `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
5. Create auth users via `POST {url}/auth/v1/admin/users` with the service-role key.

## Folder layout

```text
supabase-platform-weapon/
+- SKILL.md                 (master index; read first)
+- README.md                (this file)
+- guides/
|  +- 00-principles.md       (deploy-vs-design boundary, token-only default, routing)
|  +- 01-deploy-workflow.md  (link, db push, functions deploy, Management API SQL, cutover)
|  +- 02-edge-functions.md   (Deno, config.toml verify_jwt, auto-injected env, secrets)
|  +- 03-auth-hook.md        (define AND enable the custom access-token hook, app_role)
|  +- 04-rls-on-supabase.md  (security_invoker views, (select auth.uid()), tenancy)
|  +- 05-realtime-storage.md (realtime.messages RLS, storage.objects RLS, signed URLs)
|  +- 06-local-stack-testing.md (supabase start / db reset / seed / pgTAP)
+- examples/
|  +- deploy-migration-and-function.md
|  +- enable-auth-hook-and-rls.md
+- templates/
|  +- deploy-runbook.md
|  +- management-api-sql.sh
|  +- custom-access-token-hook.sql
|  +- rls-policy-pack.sql
|  +- edge-function.ts
|  +- config.toml.snippet
+- reports/
|  +- README.md
|  +- deploy-wiring-report.md
+- research/                (loremaster output; read-only audit trail)
```

## Hard style rule

No em dashes in any prose, comment, or report. Commas, colons, parentheses, periods, semicolons. Regular hyphens are fine.

---

*Forged by the Guild AI Tools Factory pipeline from `supabase-platform-guardian-command-brief.md` and `research/`. Part of the Guild curated by [Mario Aldayuz a.k.a @thenotoriousllama](https://github.com/thenotoriousllama).*
