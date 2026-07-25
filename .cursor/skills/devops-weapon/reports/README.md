> **DEPRECATED** â€” per-weapon `reports/` folders have been retired. Reports now live in the host repo's `library/` tree:
>
> - **Feature-tied reports:** `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
> - **Issue-tied reports:** `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`
> - **Standalone audits:** `library/qa/devops/<date>-<topic>.md`
> - **CI/CD architecture / migration plans:** `library/architecture/<date>-<topic>.md`
>
> The audit template has moved to [`../templates/audit-template.md`](../templates/audit-template.md). This stub remains so existing references don't 404 â€” it can be removed via `git rm` when convenient.
