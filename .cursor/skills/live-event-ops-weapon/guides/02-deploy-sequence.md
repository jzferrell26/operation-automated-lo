# 02 - Deploy sequence (Mitigation Steps, in order)

Execute the deploy in exact-command order, one step at a time, confirming each before the next (Directive 5). This guide is the Mitigation-Steps section of the runbook skeleton (source: `research/2026-06-29-sreschool-operational-runbook-structure.md`): every step is a code block with an exact command, the expected output, and a wait condition. No implied context.

Precondition: guide 01 returned GO and the snapshot from P5 exists. If pre-flight was not green, stop; you have no business deploying.

> TODO: open question - needs human decision before next refresh. Instance type/version decides whether this sequence leads with the CLI or the REST API + UI. Default until resolved: REST API + MCP + UI primary, CLI as the self-hosted-only alternative. Source: `research/research-summary.md` open question 1. Both surfaces are given per step below.

## Step D1 - Announce the deploy window

State, to the operator and the Slack channel, that the deploy is starting: client, event, workflow id(s), and the snapshot location. This is the Logging/audit start (source: `research/2026-06-29-sreschool-operational-runbook-structure.md`, "every action is recorded to incident history").

Expected output: a posted start notice naming the named owner of this deploy. Wait condition: none; proceed.

## Step D2 - Apply the deploy change

Apply only the change this deploy requires. If the deploy is "activate the prepared workflow for this event," activate it. If the deploy is "promote a new version that `n8n-workflow-guardian` already built and saved," publish that saved version. You do NOT edit nodes here; if the change needs structural edits, it was not ready and is a hand-off (Directive 6).

REST API path (primary, headless, not deprecated):

```
# Activate the LIVE workflow so the production trigger registers.
curl -X POST "https://<n8n-host>/api/v1/workflows/<LIVE_DEPLOY_ID>/activate" \
  -H "X-N8N-API-KEY: <key>"
# If the event uses intake, activate it too:
curl -X POST "https://<n8n-host>/api/v1/workflows/<LIVE_INTAKE_ID>/activate" \
  -H "X-N8N-API-KEY: <key>"
```

UI path (operator-friendly fallback): toggle the workflow Active / publish it in the editor.

CLI path (self-hosted, pre-2.0 only; `update:workflow --active` is DEPRECATED in n8n 2.0):

```
n8n update:workflow --id=<LIVE_DEPLOY_ID> --active=true
```

Expected output: the activate call returns success and the production trigger is now registered. Source for the endpoint and the deprecation: `research/2026-06-29-n8n-public-rest-api-activate-deactivate.md`, `research/2026-06-29-n8n-cli-commands-export-import-activate.md`. Wait condition: confirm `active: true` before moving on (re-run `get_workflow_details` from guide 01 P2).

## Step D3 - Confirm the deployed state

Confirm the workflow is active and the production trigger is live, headless:

```
get_workflow_details({ workflowId: "<LIVE_DEPLOY_ID>" })   # confirm active: true
get_workflow_details({ workflowId: "<LIVE_INTAKE_ID>" })   # confirm active: true (if intake in scope)
```

Expected output: `active: true` on every in-scope workflow. Wait condition: if either is not active, do not declare deployed; diagnose with the triage triad in guide 04 (not activated / trigger misconfigured / server-side).

## Step D4 - Emit the deploy confirmation

Produce the deploy confirmation: client, event, workflow id(s), the change applied, the snapshot location, and the timestamp. Capture the deploy timestamp; you need it as `startedAfter` in the verification search (guide 03).

Expected output: a deploy confirmation handed to the operator. Wait condition: none.

## Important: a deploy confirmation is NOT proof it works

Activating the workflow and getting `active: true` is "it deployed," not "it works" (Directive 3). Do not declare the event live yet. Proceed immediately to guide 03 for verification. "First execution in production monitored directly, don't deploy and walk away" (source: `research/2026-06-29-hatchworks-n8n-production-best-practices-rollback.md`).

A worked deploy sequence is in `examples/01-clean-deploy-happy-path.md`.
