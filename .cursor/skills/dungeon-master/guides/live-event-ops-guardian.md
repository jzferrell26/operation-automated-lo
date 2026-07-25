# Routing guide: `live-event-ops-guardian`

**Guardian:** [`ai-tools/agents/live-event-ops-guardian.md`](../../agents/live-event-ops-guardian.md)
**Weapon:** [`ai-tools/skills/live-event-ops-weapon/`](../../skills/live-event-ops-weapon/)
**Command Brief:** [`ai-tools/command-briefs/live-event-ops-guardian-command-brief.md`](../../../command-briefs/live-event-ops-guardian-command-brief.md)
**Trigger policy:** on-demand

## Domain
Operate-and-verify runbook specialist for taking a Cuantico Live Event automation live on n8n. It
RUNS the deployment end to end across four phases: the pre-flight go/no-go gate (correct LIVE
workflow id, not the archived clone; bound credentials; published/active; trigger reachable;
per-event config; export-before-deploy snapshot), the exact-command deploy sequence, the post-deploy
verification loop against real execution data, and the deactivate-then-restore-snapshot rollback. It
covers the Live Event Deployment workflow AND the Live Event Intake workflow. It operates the LIVE
workflow, never the archived clone, and it owns RUNNING the workflow, not editing it: a client event
goes live correctly or does not go live at all.

## Trigger phrases (route here)
- "deploy the live event", "take the event live", "run the live event deploy"
- "is the live event ready to go live", "pre-flight the live event deploy"
- "verify the live event deploy", "did the live event deploy actually work"
- "the live event broke, roll it back", "deactivate and restore the live event"
- When an operator or a peer Guardian hands off a live-event RUN (deploy / verify / rollback).
- Or when the request implicitly involves running, verifying, or rolling back a live event on the
  Cuantico n8n instance.

## Do NOT route here
- Editing workflow STRUCTURE or wiring nodes (a broken node, a miswired connection, missing error
  handling) -> `n8n-workflow-guardian`. This Guardian operates; it does not edit structure.
- GHL field / contact / custom-field semantics (fieldKey resolution, DATE / SINGLE_OPTIONS typing,
  a blank GHL field) -> `gohighlevel-guardian`.
- A security CVE catalog or vulnerability audit -> `security-guardian`.

If a request straddles two domains, prefer the narrower-scoped Guardian and let this one act as the
live-event RUN backup.

## Inputs the Guardian needs
Before invoking, ensure the user has provided (or you can infer):
- The client and event context.
- The target n8n instance and the LIVE workflow id(s): the Live Event Deployment workflow, plus the
  Live Event Intake workflow where the event uses intake.
- The deploy request (deploy, re-deploy, verify, or roll back).
- The current state: already live, a re-deploy, and what changed.

If the exact LIVE workflow id is missing, do not invoke yet. Live-vs-archived-clone is a known trap
(Critical Directive 1); confirming the workflow id is mandatory, not optional.

## Outputs the Guardian produces
- A pre-flight go / no-go verdict (per the weapon's `templates/preflight-go-no-go.md`), including the
  export-before-deploy snapshot taken as the rollback known-good.
- A deploy confirmation from the exact-command deploy sequence.
- A verification report, pass/fail per check with the execution id (per
  `templates/verification-report.md`), proving the event works against real execution data.
- On failure: a Slack alert (`templates/slack-alert.md`) and a rollback record
  (`templates/rollback-record.md`).
- Past records accumulate in the weapon's `reports/`.

## Multi-Guardian sequences this Guardian participates in
- Operator hand-off -> `live-event-ops-guardian`: an operator or peer Guardian requests a live-event
  run, which this Guardian executes (pre-flight -> deploy -> verify -> rollback-if-needed).
- `live-event-ops-guardian` -> `n8n-workflow-guardian`: when verification fails on a workflow-STRUCTURE
  defect, this Guardian (which operates only) hands the structural fix to `n8n-workflow-guardian`.
  This is the operate / build counterpart pairing.
- `live-event-ops-guardian` -> `gohighlevel-guardian`: when the root cause is a GHL field / contact
  semantics issue, hand it off there.

## Critical directives the orchestrator should respect
- Operate the LIVE workflow, never the archived clone. Confirm the workflow id first.
- No deploy without a green pre-flight. A live client event has no margin.
- Always run post-deploy verification before declaring live. "It deployed" and "it works" are
  different claims; only a controlled test execution that succeeded proves the latter.
- Keep a rollback path ready before deploying. The rollback is deactivate-the-workflow then
  restore-the-export snapshot, instance-agnostic and not dependent on paid n8n workflow history.
- Exact-command discipline: every runbook step is a precise, copy-paste action with no implied
  context.
- Operate, do not edit. Route structural fixes to `n8n-workflow-guardian` and GHL semantics to
  `gohighlevel-guardian`.
- No em dashes in any runbook, report, or prose, ever.

(Full list lives in the Guardian file's `## Critical directives` section.)

## Paired Weapon
`ai-tools/skills/live-event-ops-weapon/` (read `SKILL.md` first, then `guides/00-principles.md` for
the seven operating directives before any pre-flight, deploy, verification, or rollback action).

---

*Part of Dungeon Master's roster. See [`SKILL.md`](../SKILL.md) for the full Guild.*
