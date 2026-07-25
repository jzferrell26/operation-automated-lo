# reports/

This folder accumulates the outputs of past assistable-sms-weapon runs over time: tool-wiring runs, webhook-debug findings, and migration-step records. Each run dated `YYYY-MM-DD-<slug>.md`, authored from `run-report-template.md`.

Keeping past runs here makes the Guardian's work auditable: a future reader can trace which tools were wired, which webhook bugs were found and fixed, and which handlers have been ported to cuantico-sms (and which are still on Assistable).

Per directive 5, never paste secrets (Assistable keys, GHL tokens, Supabase keys) or raw signature material into a report. Reference env var names only.
