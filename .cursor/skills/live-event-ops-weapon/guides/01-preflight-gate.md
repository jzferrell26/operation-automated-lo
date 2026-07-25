# 01 - Pre-flight gate (Scope + Safety / Pre-checks)

This is the go/no-go gate. No deploy proceeds without a green pre-flight (Directive 2). The gate is read-only: you confirm readiness, you do not fix structure. A missing item is a no-go and, where it is structural, a hand-off to `n8n-workflow-guardian`.

The gate maps onto the SRE runbook skeleton's Scope-Check and Safety/Pre-checks sections (source: `research/2026-06-29-sreschool-operational-runbook-structure.md`) and the 6-dimension production-readiness checklist (source: `research/2026-06-29-dev-6-dimension-production-readiness-checklist.md`).

Record the result in `templates/preflight-go-no-go.md`. Emit an explicit GO or NO-GO.

## Step P0 - Confirm the LIVE workflow id (Scope Check)

Confirm you are pointed at the live workflow, not the archived clone (Directive 1). If the id was not supplied, get it and confirm the name and active state before any other step.

```
# n8n MCP (headless): list workflows and confirm the id + name match the LIVE one
search_workflows({ query: "Live Event Deployment" })
search_workflows({ query: "Live Event Intake" })
```

Expected output: the exact LIVE workflow id(s). Wait condition: do not proceed until the operator confirms the id maps to the live event, not a clone. Record `LIVE_DEPLOY_ID` and `LIVE_INTAKE_ID`.

> TODO: open question - needs human decision before next refresh. Instance type/version (self-hosted + CLI vs managed/cloud + REST/MCP/UI, pre/post-2.0) decides the lead command surface. Default until resolved: lead with REST API + MCP + UI; CLI is the self-hosted-only alternative. Source: `research/research-summary.md` open question 1.

## Step P1 - Credentials bound, and not hardcoded

Confirm every node that needs a credential has one bound, and confirm no secret is hardcoded into a node field (an HTTP header, a query param). This matters twice: an unbound credential fails the deploy in front of the client, and a hardcoded secret leaks in plaintext when you export the snapshot in P5.

```
# UI: open each in-scope workflow, scan credential-bearing nodes for a bound credential.
# Confirm no literal API key / token is typed into any node field (HTTP Request headers are the usual offender).
```

Expected output: every credential bound by reference; zero hardcoded secrets. Source for the credential-reference rule and the hardcoded-secret leak: `research/2026-06-29-n8n-export-import-workflows-docs.md` and `research/2026-06-29-hatchworks-n8n-production-best-practices-rollback.md` ("the export contains only a credential ID, not the value. If they're hardcoded anywhere in the workflow logic, they export in plain text"). If a secret is hardcoded: NO-GO, hand to `n8n-workflow-guardian` to move it into a credential.

## Step P2 - Workflows published / active

Confirm both in-scope workflows are published/active. An inactive workflow is one of the three canonical reasons a workflow never runs (source: `research/2026-06-29-n8n-troubleshooting-failed-run-triage.md`).

```
# n8n MCP (headless), read-only status check:
get_workflow_details({ workflowId: "<LIVE_DEPLOY_ID>" })
get_workflow_details({ workflowId: "<LIVE_INTAKE_ID>" })
# Confirm active: true on each.
```

Expected output: `active: true` on both. Wait condition: if either is inactive, that is expected if this deploy activates it; note it and activate in the deploy sequence (guide 02), do not silently leave it off.

## Step P3 - Trigger reachable

Confirm the production trigger is reachable. For a webhook/intake trigger, the production URL is only registered when the workflow is published, and incoming production payloads do NOT show in the editor; they show in Executions (source: `research/2026-06-29-n8n-webhook-test-vs-production-url.md`). Confirm the production URL exists and resolves. Do not exercise it yet with real data; that is the verification step.

```
# Confirm the production webhook path is registered (workflow must be published).
# Note the production URL; you will fire the controlled test at it in guide 03.
```

Expected output: a known, registered production trigger URL/path. Do not use the TEST url for a real go-live; the test listener auto-closes after 120 seconds and silently stops working.

## Step P4 - Per-event config set

Confirm the event-specific config is correct: client, slot field keys, lead-import tagging, and the dormant-email safeguard. These are the Intake-workflow prior art; a wrong slot key or the form-placeholder mis-route is a known live-event gotcha. Confirm the config matches THIS client and event.

Expected output: client, slot fields, and tags set for this event. This is a read-and-confirm; if a field key is wrong, that is a structural hand-off to `n8n-workflow-guardian` (or a GHL field-semantics hand-off to `gohighlevel-guardian`), not a patch here.

> TODO: open question - needs human decision before next refresh. Controlled-test cleanup policy: the verification test in guide 03 fires a real (test) intake record during a live event. Decide now whether to delete it, tag it test-only, or leave it, so the per-event tagging is set up to make the test record identifiable. Source: `research/research-summary.md` open question 3.

## Step P5 - Export-before-deploy snapshot (the rollback known-good)

Take the snapshot that is the rollback known-good (Directive 4). This is a pre-flight step precisely so the rollback never depends on paid n8n workflow history.

REST / MCP / UI path (primary):

```
# UI: workflow menu -> Download -> save the JSON as the snapshot.
# Do this for BOTH in-scope workflows.
# Name them: snapshots/<date>-live-event-deployment.json and snapshots/<date>-live-event-intake.json
```

CLI path (self-hosted, shell access only):

```
n8n export:workflow --id=<LIVE_DEPLOY_ID> --output=snapshots/<date>-live-event-deployment.json
n8n export:workflow --id=<LIVE_INTAKE_ID> --output=snapshots/<date>-live-event-intake.json
```

Expected output: one JSON snapshot per in-scope workflow, captured BEFORE any deploy change. The snapshot carries node structure plus credential names/ids (references), NOT secret values, so restoring onto the SAME instance reconnects automatically (source: `research/2026-06-29-n8n-export-import-workflows-docs.md`). Re-confirm P1 held: if a secret was hardcoded, this snapshot now contains it in plaintext, so do not commit it to git until P1 is clean.

> TODO: open question - needs human decision before next refresh. Where the snapshot is stored (local file, the cuantico repo/git, or a secure bucket). HatchWorks recommends git; regardless of destination the "no hardcoded secrets before committing" check (P1) is mandatory. Source: `research/research-summary.md` open question 2.

## The verdict

If every step is green: GO. Proceed to guide 02.
If any step is red: NO-GO. Stop. Record the failing check and, where it is structural, hand off to `n8n-workflow-guardian` or `gohighlevel-guardian`. Do not deploy.

A worked green gate is in `examples/01-clean-deploy-happy-path.md`; a NO-GO-then-recover path is illustrated alongside the rollback in `examples/02-failed-verification-rollback.md`.
