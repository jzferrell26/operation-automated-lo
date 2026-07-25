> **DEPRECATED** â€” per-weapon `reports/` folders have been retired. Reports now live in the host repo's `library/` tree:
>
> - **Feature-tied reports:** `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
> - **Issue-tied reports:** `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`
> - **Standalone reviews / audits / specs / handoffs:** `library/qa/ux-ui/<date>-<type>-<slug>.md`
>
> Templates live under [`../templates/`](../templates/) â€” `review-output.md` for reviews and audits, `component-brief-with-wrap.md` for new component or screen specs. System-level escalation shape is defined in `../guides/09-system-level-escalation.md`. This stub remains so existing references don't 404 â€” it can be removed via `git rm` when convenient.
