# Deploy verification report - {{app_name}} - {{date}}

A post-deploy smoke-verification result. File completed reports in `reports/`. No em dashes. See `guides/03-deploy-trigger-and-verify.md`.

## Context

- App: {{app_name}}
- Deployment URL: {{deployment_url}}
- Environment: {{production | preview}}
- Vercel deployment id / status: {{id}} / Ready
- Supabase project ref: {{supabase_project_ref}}
- Task type: {{first deploy | re-deploy | cutover | debug}}
- Operator: {{operator}}

## Smoke check (go/no-go)

| # | Check | Command / route | Expected | Result | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Homepage returns 200, not a redirect-to-unbuilt-page 404 | `curl -sD - {{url}}/ \| grep -iE 'HTTP/\|location'` | 200 (or 307 to a built /sign-in) | {{ }} | {{ }} |
| 2 | Auth-gated route redirects to sign-in | `{{auth_route}}` | 307/302 -> /sign-in, then /sign-in = 200 | {{ }} | {{ }} |
| 3 | DB-touching route returns real data within timeout | `{{db_route}}` | real rows, no demo-data fallback, under 10s/15s | {{ }} | {{ }} |
| 4 | Auth callback URL resolves | `{{callback_url}}` | resolves (Supabase Site URL / Redirect URLs cut over) | {{ }} | {{ }} |

## Verdict

- Go / No-go: {{ }}
- If No-go, the failing check and the root cause (per `guides/04-deploy-debug.md`): {{ }}

## Deeper signals checked after the gate

- Build log: {{clean | errors}}
- Runtime log: {{clean | errors}}
- Cold-start latency on infrequent routes: {{ }}

## Follow-ups

- {{ }}

<!-- TODO: fill in {{auth_route}}, {{db_route}}, {{callback_url}} for this app (per-app operator input). -->
