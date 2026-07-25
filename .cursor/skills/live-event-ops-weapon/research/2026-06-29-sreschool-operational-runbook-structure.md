---
source_url: https://sreschool.com/blog/operational-runbook/
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: high
topic: runbook-discipline
weapon: live-event-ops-weapon
---

# SRE School: Operational Runbook (structure, escalation, rollback discipline)

## Summary
SRE-discipline reference (published 2026-02-15) for the runbook FORM the brief demands: exact-command discipline, escalation path, rollback procedure, pre-checks. Frames a runbook as a decision path, not prose -- exactly the brief's "exact-command, no-implied-context" directive.

## Key quotations / statistics
- Runbook nature (verbatim, from sibling SRE School runbook articles surfaced in the same search): "A runbook is not a prose essay—it is an operational decision path."
- Exact-command discipline (verbatim): "Numbered steps with exact commands, expected output, and wait conditions"; "use code blocks for ALL commands"; "Prioritize clarity and scannability with copy-pasteable commands and checklists over long paragraphs."
- Components (verbatim): "Triggers: alerts or scheduled checks detect defined conditions"; "Runbook content: instructions, commands, scripts, and automation links"; "Execution layer: a runbook executor or operator performs steps"; "Logging & audit: every action is recorded to incident history".
- Safety / rollback (verbatim): include "Prechecks"; "Rollback automation" and "atomic rollback path"; "Approval gating" for sensitive actions; "RBAC considerations and approval gating".
- Escalation (verbatim): "named contacts" and "objective criteria" (escalation criteria objective, not social); exit criteria should "name a time window, not just a green dashboard".

## Annotations for weapon-forge
- This is the FORM template for the whole runbook: every step gets a code block with exact command + expected output + wait condition. No implied context. Maps to Critical Directive 5.
- Canonical section order to adopt (corroborated across the SRE sources in this sweep): Trigger -> Scope Check -> Safety/Pre-checks -> Mitigation Steps (in order, including rollback) -> Escalation -> Exit Criteria. weapon-forge should structure the deploy runbook on this skeleton: pre-flight = Scope + Safety/Pre-checks; deploy = Mitigation Steps; verification = Exit Criteria; failure path = Escalation + rollback.
- "Exit criteria should name a time window, not just a green dashboard" -> the verification loop should have an explicit dwell/monitor window (corroborated by HatchWorks "don't deploy and walk away" + "monitor first execution directly"). weapon-forge should set a concrete watch window for the live event (e.g., monitor the first N executions / first M minutes).
- "Escalation criteria objective, not social" + "named contacts" -> the escalation path must name the operator + the Slack channel explicitly, with an objective trigger (any failed execution on the controlled test, or any error-status execution during the watch window), not "escalate if it feels wrong".
- Note: the page itself is more conceptual than a fill-in template; the verbatim section-order skeleton above is synthesized from the consistent guidance across the SRE-discipline sources in this sweep (sreschool, rootly, oneuptime, incident.io). weapon-forge owns turning it into the actual runbook.
