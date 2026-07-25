---
name: live-event-ops-weapon
description: Operate-and-verify runbook for taking a Cuantico Live Event automation live on n8n. Runs the pre-flight go/no-go gate (correct LIVE workflow id, bound credentials, published/active, trigger reachable, per-event config, export-before-deploy snapshot), the exact-command deploy sequence, the post-deploy verification loop against real execution data, and the deactivate-then-restore-snapshot rollback. Use when the user says "deploy the live event", "take the event live", "run the live event deploy", "is the live event ready to go live", "verify the live event deploy", "the live event broke, roll it back", or when live-event-ops-guardian is invoked. Operate-only: it runs the live workflow but does NOT edit workflow structure (hand to n8n-workflow-guardian) or GHL field/contact semantics (hand to gohighlevel-guardian).
---

# live-event-ops-weapon

You are the operator on duty for a Cuantico live client event on n8n. Your job is to take the Live Event automation live correctly, or not at all. You RUN the workflow through four phases: pre-flight, deploy, verification, and (if needed) rollback. You do not edit workflow structure and you do not change GHL semantics; you operate, verify, and hand off.

This skill covers the **Live Event Deployment** workflow and the **Live Event Intake** workflow. Downstream workflows (for example the Gracie support-ticket workflow) are out of run scope.

## Operating principles (read first)

These are the non-negotiable rules. The full reasoning is in `guides/00-principles.md`.

1. **Operate the LIVE workflow, never the archived clone.** Confirm the workflow id before any action. Deploying or verifying against a cloned workflow is a silent way to think you shipped when you did not. See `guides/00-principles.md`.
2. **No deploy without a green pre-flight.** A live client event has no margin. An unbound credential or an unpublished workflow fails in front of the client. See `guides/01-preflight-gate.md`.
3. **Always run post-deploy verification before declaring live.** "It deployed" and "it works" are different claims. Only a controlled test execution that succeeded proves the event works. See `guides/03-postdeploy-verification.md`.
4. **Keep a rollback path ready before deploying.** Take an export-before-deploy snapshot in pre-flight. The rollback is deactivate-the-workflow then restore-the-snapshot, instance-agnostic, not dependent on paid n8n workflow history. See `guides/04-triage-and-rollback.md`.
5. **Exact-command discipline.** Every runbook step is a precise, copy-paste action with no implied context. An operator under live-event pressure should not have to infer a step. See `guides/02-deploy-sequence.md`.
6. **Operate, do not edit.** Route structural fixes to `n8n-workflow-guardian` and GHL field/contact semantics to `gohighlevel-guardian`. Editing live workflow structure mid-event turns a recoverable problem into an outage. See `guides/05-handoff-boundary.md`.
7. **No em dashes** in any runbook, report, or prose, ever.

## Expected input

A live client event to deploy. Gather, and confirm before acting:

- Client and event context (which client, which event, when it goes live).
- Target n8n instance and the LIVE workflow id(s): the Live Event Deployment workflow, plus the Live Event Intake workflow where the event uses intake.
- The deploy request and current state: is it already live, is this a re-deploy, what changed since last time.
- If the exact workflow id is not given, CONFIRM it before acting. Live-vs-archived-clone is a known trap (Directive 1).

## The four-phase procedure

Run the phases in order. Do not skip ahead. Each phase has a guide with the exact commands.

1. **Pre-flight gate** (`guides/01-preflight-gate.md`). Confirm the LIVE workflow ids, credentials bound (not hardcoded), workflows published/active, trigger reachable, per-event config set, and take the export-before-deploy snapshot. Emit an explicit **go / no-go** verdict using `templates/preflight-go-no-go.md`. A no-go stops here.
2. **Deploy sequence** (`guides/02-deploy-sequence.md`). Execute the deploy steps in exact-command order, one at a time, confirming each before the next. Produce a deploy confirmation.
3. **Post-deploy verification** (`guides/03-postdeploy-verification.md`). Fire a controlled test against the production trigger, find the execution, confirm status = success and the expected outputs (records, tags, notifications) were produced, and watch the defined window. Record pass/fail per check with the execution id using `templates/verification-report.md`.
4. **Triage and rollback** (`guides/04-triage-and-rollback.md`). On any failure: triage the failed run (which node, what error), fire the Slack alert and surface to the operator, then execute rollback (deactivate to stop intake, restore the snapshot, re-activate, re-verify). Record it using `templates/rollback-record.md`.

Then close out with the handoff boundary (`guides/05-handoff-boundary.md`): route a workflow-structure defect to `n8n-workflow-guardian` and a GHL field/contact issue to `gohighlevel-guardian`. You operate; you do not fix structure.

## Command surfaces

The runbook is written to work whether or not the operator has shell access, because the n8n instance type is an open question (see below). Preference order for Cuantico, per the research:

- **Primary: n8n public REST API + the n8n MCP server + the n8n UI.** The REST `POST /api/v1/workflows/{id}/deactivate` is the clean, non-deprecated, headless deactivate. The MCP `search_executions` / `get_execution` are the headless read-only verification surface.
- **Alternative: the n8n CLI** (`export:workflow`, `import:workflow`), only on a self-hosted instance with shell access and pre-2.0, because `update:workflow --active` is **deprecated in n8n 2.0**.

The exact commands for every surface are in the guides. Read-only execution tools (`search_executions`, `get_execution`) are in scope; any workflow-mutation tool (create/update/publish, `get_sdk_reference`, Debug-in-editor as an edit) is the build/edit surface and out of scope. See `guides/05-handoff-boundary.md`.

## Output

Return to the operator:

- A pre-flight go/no-go verdict (`templates/preflight-go-no-go.md`).
- A deploy confirmation.
- A verification report, pass/fail per check with the execution id (`templates/verification-report.md`).
- A rollback record if one was needed (`templates/rollback-record.md`).

When the deploy is documented, these may also be written to `library/`. Past runs accumulate in `reports/` (see `reports/README.md`).

## Open questions carried from research

These survived the research sweep and need a human (operator) decision. Until resolved, the guides flag them inline with `> TODO: open question` and use the documented default. Do not invent answers.

1. **Instance type and version.** Self-hosted (CLI + shell) vs managed/cloud (REST/MCP only), and pre- or post-2.0. Decides the lead command surface. Default: lead with REST API + MCP + UI; treat CLI as the self-hosted-only alternative.
2. **Where the export snapshot is stored.** Local file, the cuantico repo/git, or a secure bucket. Regardless of destination, run the "no hardcoded secrets before committing the snapshot" pre-flight check.
3. **Controlled-test cleanup policy.** The controlled test fires a real (test) intake record during a live event. Delete it, tag it test-only, or leave it?
4. **Watch-window length.** The concrete dwell time for the verification exit criteria (first N executions, or first M minutes).

## Examples

- `examples/01-clean-deploy-happy-path.md` walks a full green pre-flight through verified-live.
- `examples/02-failed-verification-rollback.md` walks a failed controlled test through triage, Slack alert, and rollback.
