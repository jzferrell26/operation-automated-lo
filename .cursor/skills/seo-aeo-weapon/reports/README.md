> **DEPRECATED** â€” per-weapon `reports/` folders have been retired. Reports now live in the host repo's `library/` tree:
>
> - **Feature-tied audits:** `library/requirements/features/feature-<###>-<title>/reports/<date>-seo-audit.md`
> - **Issue-tied audits:** `library/requirements/issues/issue-<###>-<title>/reports/<date>-seo-audit.md`
> - **Standalone audits:** `library/qa/seo/<date>-<topic>.md` (e.g., `<date>-seo-audit-<branch>.md`, `<date>-schema-validation.md`, `<date>-web-vitals-snapshot.md`, `<date>-cwv-remediation-<route>.md`, `<date>-metadata-completeness.md`)
>
> The audit-report template has moved to [`../templates/audit-report-template.md`](../templates/audit-report-template.md). This stub remains so existing references don't 404 â€” it can be removed via `git rm` when convenient.
