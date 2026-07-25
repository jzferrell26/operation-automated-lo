# reports/

Where supabase-platform-guardian writes its output reports.

## What goes here

Each platform job (a deploy, an auth-hook enablement, an RLS wiring, a Realtime/Storage setup) produces a deploy/wiring report from `deploy-wiring-report.md`. The report records:

- What surface was deployed or wired (migrations pushed, functions deployed, hook enabled, policies created).
- The exact CLI commands and Management-API calls run (token-only where possible).
- The enable-state of any auth hook, with the JWT-claim verification evidence.
- The RLS enforcement proof (a denied query with a real user token).
- Any `> TODO: open question - needs human decision` items and the routed-Guardian handoffs.

## Where reports land in a host repo

When this Guardian runs inside a product repo with a `library/` tree, prefer:

- Feature-tied: `library/requirements/features/feature-<###>-<title>/reports/<date>-supabase-deploy.md`
- Standalone: `library/qa/supabase/<date>-deploy-wiring.md`

Otherwise write next to the deploy (e.g. `supabase/DEPLOY-REPORT-<date>.md`). Use `deploy-wiring-report.md` as the skeleton.

This folder accumulates report templates and (optionally) dated past-run summaries over time. It starts with just the template.
