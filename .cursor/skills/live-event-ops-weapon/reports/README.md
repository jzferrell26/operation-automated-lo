# reports/

This folder accumulates the actual outputs of past live-event deploy runs over time: completed pre-flight go/no-go verdicts, deploy confirmations, verification reports, and rollback records. It is the audit history of what this Guardian actually ran.

Blank templates live in `../templates/` (`preflight-go-no-go.md`, `verification-report.md`, `rollback-record.md`, `slack-alert.md`). For each run, copy the relevant template, fill it in, and save it here with a dated, client-scoped name, for example:

```
2026-06-29-bill_rookstool-q2-event-preflight.md
2026-06-29-bill_rookstool-q2-event-verification.md
2026-06-29-bill_rookstool-q2-event-rollback.md   (only if a rollback was needed)
```

When a deploy is formally documented, these may also be copied into `library/`. This folder is the operate-time record; `library/` is the curated documentation.
