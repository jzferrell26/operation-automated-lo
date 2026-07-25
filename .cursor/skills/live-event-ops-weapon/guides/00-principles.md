# 00 - Principles and scope

This guide is the scope boundary and the reasoning behind the operating rules. Read it before the procedure guides. It is the home for every SUBAGENT CRITICAL DIRECTIVE from the Command Brief.

## What this weapon does

It RUNS a Cuantico Live Event automation deployment on n8n: pre-flight gate, deploy, verification, rollback. It operates the two in-scope workflows:

- The **Live Event Deployment** workflow (the live one, not the archived clone; dev client = `bill_rookstool`).
- The **Live Event Intake** workflow, where the event uses intake (slot field keys, lead-import tagging, the dormant-email safeguard, the form-placeholder mis-route gotcha are the internal prior art).

## What this weapon does NOT do

- It does not edit workflow structure. Any node fix, missing idempotency, broken branch, or trigger reconfiguration is a hand-off to `n8n-workflow-guardian`. See `05-handoff-boundary.md`.
- It does not change GHL field/contact semantics. Custom field keys, contact mapping, opportunity logic are a hand-off to `gohighlevel-guardian`.
- It does not operate downstream workflows (for example the Gracie support-ticket workflow). Those are out of run scope per the Command Brief.

## The seven directives and why they exist

These are quoted from the Command Brief's SUBAGENT CRITICAL DIRECTIVES and grounded in the research.

1. **Operate the LIVE workflow, never the archived clone. Confirm the workflow id first.** Deploying or verifying against a cloned workflow is a real, silent way to think you shipped when you did not. A non-executing workflow has three canonical root causes (not activated, trigger misconfigured, server-side), and "I was pointed at the wrong workflow" masquerades as all three. Source: `research/2026-06-29-n8n-troubleshooting-failed-run-triage.md`.

2. **No deploy without a green pre-flight.** A live client event has no margin; an unbound credential or an unpublished workflow fails in front of the client. The pre-flight is a read-only checklist; if a structural dimension (idempotency, secrets-referenced-not-hardcoded, error-alert wired) is missing, that is a no-go and a hand-off, not a patch. Source: `research/2026-06-29-dev-6-dimension-production-readiness-checklist.md`.

3. **Always run post-deploy verification before declaring live.** A successful deploy call is not proof the event works; a controlled test execution is. A production webhook fires the live workflow and shows nothing in the editor UI, so verification must check the Executions data, not the canvas. Source: `research/2026-06-29-n8n-webhook-test-vs-production-url.md`, `research/2026-06-29-n8n-executions-view-inspect-retry.md`.

4. **Keep a rollback path ready before deploying.** Take an export-before-deploy snapshot; the rollback is deactivate-the-workflow then restore-the-export. It is instance-agnostic and does not rely on paid n8n workflow history. The practitioner standard: if you cannot revert in under 10 minutes, you are not ready to deploy. Source: `research/2026-06-29-hatchworks-n8n-production-best-practices-rollback.md`, `research/2026-06-29-n8n-export-import-workflows-docs.md`.

5. **Exact-command discipline: every runbook step is a precise, copy-paste action with no implied context.** A runbook is an operational decision path, not a prose essay: numbered steps with exact commands, expected output, and wait conditions, in code blocks. An operator under live-event pressure should not have to infer a step. Source: `research/2026-06-29-sreschool-operational-runbook-structure.md`.

6. **Operate, do not edit.** Route structural fixes to `n8n-workflow-guardian` and GHL semantics to `gohighlevel-guardian`. Editing live workflow structure mid-event is how a recoverable problem becomes an outage. "Debug in editor" is allowed to DIAGNOSE only, never to change a node. Source: `research/2026-06-29-n8n-executions-view-inspect-retry.md`.

7. **No em dashes** in any runbook, report, or prose, ever. Use a comma, colon, parentheses, period, or semicolon.

## The operate-only command surfaces

In scope (read-only / operate): n8n public REST API activate/deactivate, the n8n MCP `search_executions` and `get_execution`, the n8n UI Executions tab and the workflow active/publish toggle, the CLI `export:workflow` / `import:workflow` (snapshot only, self-hosted).

Out of scope (build/edit, hand off): any create/update/publish workflow mutation, `get_sdk_reference` (the SDK build surface), editing node fields, reconfiguring a trigger.

## Example

A clean run of all four phases is in `examples/01-clean-deploy-happy-path.md`. A failure-and-rollback run is in `examples/02-failed-verification-rollback.md`.
