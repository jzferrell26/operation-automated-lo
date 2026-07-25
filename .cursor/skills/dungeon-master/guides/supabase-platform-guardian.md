# Supabase Platform Guardian - Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `supabase-platform-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/supabase-platform-guardian.md`](../../../agents/supabase-platform-guardian.md)
**Weapon:** [`skills/supabase-platform-weapon/`](../../supabase-platform-weapon/)
**Command Brief:** [`command-briefs/supabase-platform-guardian-command-brief.md`](../../../command-briefs/supabase-platform-guardian-command-brief.md)
**Trigger policy:** proactive

---

## Domain

supabase-platform-guardian owns the Supabase PLATFORM layer: Edge Functions (Deno, `config.toml` `verify_jwt`, auto-injected keys, secrets), Supabase Auth and the custom access-token hook (define in a migration AND enable via the Management API, `app_role` claims), Realtime, Storage, RLS-on-Supabase patterns (`security_invoker` views, `(select auth.uid())` caching), and the token-only CLI + Management-API deploy workflow against the local stack and a linked cloud project. It DEPLOYS and wires what db-guardian designs; the whole deploy spine runs on a single `SUPABASE_ACCESS_TOKEN`. It does not author schema, pick the auth provider, run the security audit, or shape the CI pipeline.

## Trigger phrases

Route to `supabase-platform-guardian` when the user says any of:

- "deploy my Supabase migrations" / "push migrations to my Supabase project"
- "deploy an Edge Function" / "my Supabase function isn't deploying"
- "enable the custom access token hook" / "my JWT claim isn't showing up"
- "wire RLS on this Supabase table" / "set up security_invoker views"
- "set up Realtime / Storage RLS" / "private Realtime channel authorization"
- "run SQL via the Supabase Management API" / "rehearse this on the local Supabase stack"

Or when the request implicitly involves deploying or wiring the Supabase platform (Edge Functions, Auth hook, Realtime, Storage, RLS enforcement, the CLI / Management-API workflow).

## Do NOT route when

- The request is to DESIGN schema, indexes, or migration SQL, or to tune a slow query. That is `db-guardian`. (This Guardian deploys what db-guardian designs; the seam is design-vs-deploy.)
- The request is WHICH auth provider to use, or the app-side sign-in / session flow. That is `auth-guardian`.
- The request is a security AUDIT of RLS correctness, PII exposure, or key handling. That is `security-guardian`. (This Guardian wires RLS and proves a denied query; it does not sign off the threat model.)
- The request is to design the CI/CD PIPELINE that runs the deploy (GitHub Actions topology, container build). That is `devops-guardian`. (This Guardian owns the cutover commands, not the pipeline.)

If a request straddles two Guardians' domains, prefer the narrower-scoped Guardian and let the broader one act as backup. The common pair is db-guardian (design) then supabase-platform-guardian (deploy).

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The target: local stack, a linked cloud project (its `project-ref`), or both, and the surface in scope.
- Whether a `SUPABASE_ACCESS_TOKEN` is available (the only credential needed for `db push`, `functions deploy`, and the Management API).
- For deploys: the migrations / functions / secrets to push. For hooks/RLS: the intended claims and tenancy model.

If a required input is missing, do not invoke yet; ask the user to supply it.

## Outputs the Guardian produces

- A deploy / wiring report: the exact CLI commands and Management-API calls (token-only where possible), the hook enable-state with JWT-claim evidence, and the RLS enforcement proof. Lands at `library/qa/supabase/<date>-deploy-wiring.md` or next to the deploy.
- Working platform artifacts: deployed Edge Functions, an enabled auth hook with the custom claim present, RLS-gated Realtime channels / Storage buckets, `security_invoker` views.
- Handoff notes for routed Guardians when the work touches their domain.

## Multi-Guardian sequences this Guardian participates in

- **Schema-touching feature**: `db-guardian` designs the schema, indexes, and migration SQL; `supabase-platform-guardian` deploys that SQL (`db push` / Management API) and wires the platform (Edge Functions, Auth hook, Realtime, Storage, RLS enforcement) around it; `security-guardian` then audits the result.
- **Supabase Auth enablement**: `auth-guardian` decides the provider and app-side flow; `supabase-platform-guardian` wires the custom access-token hook and the RLS that reads its claims, and proves the claim is in the JWT.

## Critical directives the orchestrator should respect

- Deploy and wire; never author schema. Route schema design to db-guardian.
- The token-only path is the default. Do not expect this Guardian to demand a DB password or service-role key where the access token suffices.
- The custom access-token hook must be ENABLED via the Management API, not just defined. The Guardian will verify the claim in a real JWT before declaring done.
- The service-role key is server-side only; RLS is verified with a real user token, never the service-role client.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
