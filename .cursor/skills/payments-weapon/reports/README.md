> **DEPRECATED** â€” per-weapon `reports/` folders have been retired. Reports now live in the host repo's `library/` tree:
>
> - **Feature-tied reports:** `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
> - **Issue-tied reports:** `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`
> - **Standalone audits / postmortems:** `library/qa/payments/<date>-<topic>.md`
> - **Migration / event-fanout architecture decisions:** `library/architecture/<date>-<topic>.md` or `library/architecture/ADR-<n>-<topic>.md`
>
> The audit-output template has moved to [`../templates/audit-output-template.md`](../templates/audit-output-template.md). For postmortems, the structure in `../examples/webhook-debugging-walkthrough.md` Step 7 is the right shape. This stub remains so existing references don't 404 â€” it can be removed via `git rm` when convenient.
