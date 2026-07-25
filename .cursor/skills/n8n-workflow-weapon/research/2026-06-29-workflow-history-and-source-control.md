---
source_url: https://docs.n8n.io/workflows/history/ + https://docs.n8n.io/source-control-environments/ + https://docs.n8n.io/hosting/scaling/execution-data/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: versioning
weapon: n8n-workflow-weapon
---

# n8n versioning: workflow history (instance DB) vs Git source control vs execution pruning

## Summary
Covers the self-hosted-vs-cloud versioning question (Command Brief query #6). n8n has THREE distinct version-ish concepts that the Guardian must not conflate: (1) workflow HISTORY (previous saved versions, stored in the instance database, paid/cloud feature), (2) Git-backed SOURCE CONTROL + environments (workflows pushed to Git, but only credential/variable STUBS go with them), and (3) EXECUTION data pruning (unrelated to workflow versions; controls how long run logs are kept).

## Key quotations / statistics (verbatim)

Source control / environments (verbatim):
> "Linking your n8n instances to a Git repository lets you create multiple n8n environments, backed by Git branches."
> "Push sends work from your instance to Git, saving a copy of your workflows and tags, as well as credential and variable STUBS, to Git. Pull gets the workflows, tags, and variables from Git ... though you will need to populate any credentials or variable stubs."

Workflow history vs Git (verbatim):
> "Workflow history is previous versions of the workflow ... n8n saves versions to the instance database, NOT to Git."
> "Self-hosted n8n instances don't have built-in version history or undo for workflows, though this functionality is available in cloud and paid self-hosted plans."

Execution-data pruning (self-hosted, verbatim defaults):
> Executions are pruned when finished more than `EXECUTIONS_DATA_MAX_AGE` hours ago (default 336 hours -> 14 days) OR the count exceeds `EXECUTIONS_DATA_PRUNE_MAX_COUNT` (default 10,000). Safety buffer `EXECUTIONS_DATA_HARD_DELETE_BUFFER` (default 1 hour).

Cloud execution retention (verbatim): Start/Starter = 7 days / max 2,500 executions; Pro = 30 days / max 25,000; Enterprise = unlimited time / max 50,000.

## Annotations for weapon-forge
- This is the source for a "versioning & environments" guide and resolves a real conceptual trap: the credential-stub behavior of Git push is the SAME root cause as the API credential-strip gotcha — n8n deliberately never moves secrets out of the instance. The Guardian must re-populate credentials after a Git pull, exactly as it must re-bind after an API edit.
- Practical ruling for the edit guide: workflow HISTORY (instance DB) is the rollback path on cloud/paid; on community self-hosted there is NO built-in undo, so the Guardian must keep its own backup (export the workflow JSON before editing) — this is the "confirm which instance / is it live" discipline in Critical Directive #5.
- Keep "execution pruning" clearly separate from "workflow versions" in the guide — they share the word "history" in casual usage but are different surfaces. The pruning env vars matter for the live-event-ops Guardian's monitoring, not for this Guardian's edits, but documenting the distinction prevents a costly misread.
- Cuantico relevance: both the Cuantico main n8n and the voyze.ai n8n are self-hosted; confirm per-instance whether the paid workflow-history feature is enabled. If not, export-before-edit is mandatory.
