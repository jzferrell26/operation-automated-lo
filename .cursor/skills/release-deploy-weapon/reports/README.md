# reports/

This folder accumulates deploy-verification reports over time, one per deploy or cutover run. Each report records the post-deploy smoke check (the go/no-go gate) and the verdict for a specific deployment.

## How to use it

1. Copy `templates/deploy-verification-report.template.md` into this folder.
2. Name it `{{date}}-{{app_name}}-{{task}}.md`, for example `2026-06-29-acme-portal-first-deploy.md`.
3. Fill in the four smoke checks, the verdict, and any follow-ups.
4. For a debug task, also record the root cause and fix per `guides/04-deploy-debug.md`.

Reports are the durable evidence that "Ready" was followed by a real verification (directive #2). Keep them; they form the deploy history for the app.

No em dashes in any report.
