---
name: supabase-platform-weapon
description: Supabase PLATFORM-layer deploy and wiring toolkit for supabase-platform-guardian. Equips the Guardian to push migrations and Edge Functions with a token-only workflow (SUPABASE_ACCESS_TOKEN), run arbitrary SQL via the Management API (POST /v1/projects/{ref}/database/query with the jq -Rs body pattern), define AND enable the custom access-token hook (PATCH /v1/projects/{ref}/config/auth, app_role claims), wire RLS-on-Supabase patterns (security_invoker views, (select auth.uid()) caching), configure Realtime and Storage with RLS, and rehearse it all on the local stack (supabase start / db reset / pgTAP). DEPLOYS what db-guardian designs; routes schema authoring to db-guardian, provider/app-flow choice to auth-guardian, security audits to security-guardian, CI pipeline shape to devops-guardian. Use when the user says "deploy my Supabase migrations", "deploy an Edge Function", "my auth hook claim isn't in the JWT", "enable the custom access token hook", "wire RLS on this Supabase table", "set up Realtime/Storage RLS", or supabase-platform-guardian is invoked. No em dashes, ever.
---

# supabase-platform-weapon

The Supabase platform runbook for `supabase-platform-guardian`. It encodes the 2026 deploy-and-wire workflow: the token-only CLI + Management-API spine, the Edge Functions Deno reference, the custom access-token hook define-and-enable procedure, the RLS-on-Supabase pattern catalog, the Realtime + Storage production guide, and the local-stack + pgTAP rehearsal loop.

This Weapon owns the PLATFORM layer. It DEPLOYS and WIRES what `db-guardian` designs. Every factual claim in the guides cites a file in `research/`. That folder is the audit trail: read it, never edit it.

## The two rules that gate everything

1. **Deploy and wire; never author schema.** Schema, indexes, and migration SQL belong to db-guardian. This Weapon pushes that SQL (via `db push` or the Management API) and wires the platform around it. Crossing that line breaks the routing contract.
2. **The token-only path is the default.** `db push`, `functions deploy`, and the entire Management API run on a single `SUPABASE_ACCESS_TOKEN`. Do not demand a DB password or paste a service-role key where the token suffices.

## Critical directives (the guardrails)

Straight from the Command Brief's SUBAGENT CRITICAL DIRECTIVES. Full detail in `guides/00-principles.md`.

1. Deploy and wire; never author schema. db-guardian designs, this Guardian deploys.
2. Token-only is the default. `db push` + `functions deploy` + Management API all run on `SUPABASE_ACCESS_TOKEN` alone.
3. The custom access-token hook must be ENABLED via the Management API (`PATCH /config/auth`), not just defined in a migration. Always verify the claim is in a real JWT.
4. Edge Functions auto-inject `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`. Never re-declare them as user secrets.
5. Build Management-API SQL bodies with `jq -Rs '{query:.}'`. Hand-escaping multi-line SQL into JSON corrupts deploys.
6. The service-role key is server-side only. It bypasses RLS, so verify enforcement with a real user token, never the service-role client.
7. Never invent a Supabase fact. Every flag, endpoint, and env var cites `research/`. Unresolved items get `> TODO: open question - needs human decision`.
8. No em dashes in any report, comment, or prose, ever. Commas, colons, parentheses, periods, semicolons. Regular hyphens are fine.
9. Surface security; do not audit it. RLS correctness, PII, and key handling go to security-guardian.

## Routing table: request type to guide

| The request is about... | Go to |
|---|---|
| The non-negotiables, the deploy-vs-design boundary, the scope routing | `guides/00-principles.md` |
| Deploying: link, `db push`, `functions deploy`, secrets, the Management-API SQL endpoint, the cutover sequence | `guides/01-deploy-workflow.md` |
| Edge Functions: Deno, `config.toml` `verify_jwt`, auto-injected env, setting real secrets | `guides/02-edge-functions.md` |
| Auth: defining the custom access-token hook AND enabling it, `app_role` claims, verifying the JWT | `guides/03-auth-hook.md` |
| RLS-on-Supabase: `security_invoker` views, `(select auth.uid())`, service_role bypass, tenancy | `guides/04-rls-on-supabase.md` |
| Realtime + Storage: `realtime.messages` RLS, private channels, `storage.objects` RLS, signed URLs | `guides/05-realtime-storage.md` |
| Local stack + testing: `supabase start` / `db reset` / seed / pgTAP rehearsal loop | `guides/06-local-stack-testing.md` |

## Workflow: how a job runs

1. **Establish target + credentials** (`guides/01`). Local, linked cloud, or both? Is `SUPABASE_ACCESS_TOKEN` present? Confirm the token-only path before reaching for anything heavier.
2. **Rehearse locally** (`guides/06`). `db reset` to prove migrations apply, `functions serve` to prove the function runs, a pgTAP RLS test to prove a non-owner is denied.
3. **Deploy** (`guides/01`). Link, `db push` db-guardian's migrations, `functions deploy`, `secrets set` for external secrets only.
4. **Wire auth** (`guides/03`). Define the hook, ENABLE it via the Management API, verify the claim in a fresh JWT.
5. **Wire RLS / Realtime / Storage** (`guides/04`, `guides/05`) as the surface demands; verify enforcement with a real user token.
6. **Report** (`reports/`, filling `templates/`): the exact commands run, the hook enable-state, and the verification evidence.

## Templates and reports

- `templates/deploy-runbook.md` - the token-only link/push/deploy/secrets/enable/verify cutover checklist.
- `templates/management-api-sql.sh` - the `jq -Rs '{query:.}'` arbitrary-SQL helper and the `PATCH /config/auth` hook-enable call.
- `templates/custom-access-token-hook.sql` - the hook function skeleton with `app_role` injection and the grants.
- `templates/rls-policy-pack.sql` - `security_invoker` view + `(select auth.uid())` tenant policy + Storage policy starters.
- `templates/edge-function.ts` - a clean Deno Edge Function skeleton (auto-injected env, optional service-role client).
- `templates/config.toml.snippet` - the `[functions.*] verify_jwt` and `[auth.hook.custom_access_token]` blocks.
- `reports/deploy-wiring-report.md` - the full output report matching the brief's EXPECTED OUTPUT.

## Worked examples

- `examples/deploy-migration-and-function.md` - happy path: push a db-guardian migration and deploy an Edge Function, token-only, with verification.
- `examples/enable-auth-hook-and-rls.md` - the headline case: define + enable the custom access-token hook, then wire and prove a tenant RLS policy that reads the new claim.

## Scope boundary

This Weapon owns the Supabase platform layer: Edge Functions, Auth hook enablement, Realtime, Storage, RLS enforcement wiring, and the CLI + Management-API deploy workflow on local and cloud. It does NOT own: Postgres schema / index / migration AUTHORING and query tuning (db-guardian designs, this Weapon deploys), auth PROVIDER selection and app-side sign-in flows (auth-guardian), security AUDITS of RLS correctness / PII / key handling (security-guardian), or CI/CD PIPELINE topology (devops-guardian). When research did not answer a question, the guides mark it `> TODO: open question - needs human decision` rather than inventing an answer.
