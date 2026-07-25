---
source_url: https://docs.n8n.io/courses/level-two/chapter-4/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: medium
topic: failed-run-triage
weapon: live-event-ops-weapon
---

# n8n Docs + practitioner triage: failed-run diagnosis on the canvas

## Summary
Official n8n course material plus corroborating practitioner triage guidance (n8nautomation.cloud debugging guide, RapidDev "workflow not executing"). Captures the canvas-level failed-run signal and the three canonical root causes of a non-executing workflow -- directly useful for the triage step and for the pre-flight "is it actually active" check.

## Key quotations / statistics
- Canvas failure signal (practitioner, n8nautomation.cloud, 2026): "The canvas will display the path the execution took, with successful nodes outlined in green and failed nodes outlined in red," which "immediately shows you exactly where the process broke down."
- Executions log (practitioner): "When one of your workflows fails, you can check the Executions log to see what went wrong," showing "the latest execution time, status, mode, and running time."
- Three root causes of a non-executing workflow (practitioner, RapidDev, 2026): "the workflow is not activated, the trigger node is misconfigured, or a server-side issue is preventing execution."

## Annotations for weapon-forge
- The three root causes map directly to PRE-FLIGHT checks: (1) workflow not activated -> pre-flight "published/active" check; (2) trigger misconfigured -> pre-flight "trigger reachable" check; (3) server-side issue -> pre-flight instance-health check. If the controlled test produces NO execution at all, run this triage triad first.
- Green/red node outline is the fast visual triage in the UI; for headless triage use the MCP `get_execution(includeData:true)` to find the red node programmatically. Note the official executions doc (separate source) did NOT mention the green/red outline -- it is practitioner-confirmed UI behavior, so weapon-forge should label it as observed UI behavior, not a doc guarantee.
- "No execution appeared" vs "execution appeared but errored" are two different triage branches the runbook must split: the former is a trigger/activation/instance problem (the workflow never ran), the latter is a node-level failure (the workflow ran and broke). This distinction is load-bearing for live-event triage.
