---
source_url: https://hatchworks.com/blog/ai-agents/n8n-best-practices/
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: high
topic: rollback
weapon: live-event-ops-weapon
---

# HatchWorks: n8n Best Practices Checklist for Production (2026)

## Summary
Practitioner production-readiness guide (published 2026-03-31). Strongest external corroboration for the export-before-deploy + fast-rollback discipline the brief mandates. Frames rollback as a pre-deploy gate ("if you can't answer how to revert in under 10 minutes, you're not ready to deploy") and confirms the credential-id-only export detail.

## Key quotations / statistics
- Rollback as a gate (verbatim): "If this breaks in production, how do we revert it in under 10 minutes? If you can't answer that, you're not ready to deploy."
- Export-before-change (verbatim): "Workflows are exported and versioned before every change"; "export your workflow JSON before every meaningful change and commit it to a Git repository"; "Workflow was exported and committed to version control before any changes".
- Rollback timeline (verbatim): "A rollback plan exists and can be executed in under 10 minutes."
- First-hours monitoring (verbatim): "First execution in production monitored directly — don't deploy and walk away."
- Alerts (verbatim): "error rate above threshold", "execution time above baseline", "queue depth beyond normal"; each alert requires "a named owner".
- Credentials (verbatim): "the export contains only a credential ID, not the value. If they're hardcoded anywhere in the workflow logic, they export in plain text."

## Annotations for weapon-forge
- Directly validates Critical Directive 4 (keep a rollback path ready; export-before-deploy snapshot). weapon-forge can cite the under-10-minutes standard as the rollback time budget in the runbook.
- "First execution in production monitored directly — don't deploy and walk away" is the practitioner phrasing of the brief's post-deploy verification loop. Good pull-quote for the verification guide's intro.
- "Each alert requires a named owner" reinforces the escalation directive (operator + Slack) -- the alert is not fire-and-forget; a named human owns it.
- Reconciles the credential-export confusion: export contains the credential ID/reference, not the secret value -- UNLESS the secret was hardcoded into node logic (e.g., an HTTP header), in which case it exports in plaintext. weapon-forge should add a pre-flight check: "confirm no secrets are hardcoded in node fields before exporting the snapshot to Git" (otherwise the snapshot leaks credentials).
