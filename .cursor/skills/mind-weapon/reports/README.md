> **DEPRECATED** â€” per-weapon `reports/` folders have been retired. Reports now live in the host repo's `library/` tree:
>
> - **Feature-tied reports:** `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
> - **Issue-tied reports:** `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`
> - **Standalone audits / investigations / reviews:** `library/qa/ai/<date>-<topic>.md`
>
> Slug examples for the `<topic>` portion: `rag-audit-<tenant>`, `trace-investigation-low-retrieval`, `eval-review-quarterly-q2`, `coach-addition-<name>`, `prompt-cascade-change-level-2`, `graphrag-enablement-<tenant>`, `slot-rollback-modelChat`, `failure-investigation-compaction-stuck`.
>
> The audit template has moved to [`../templates/audit-template.md`](../templates/audit-template.md). This stub remains so existing references don't 404 â€” it can be removed via `git rm` when convenient.
