# Guide 02: Audit a Workflow Node by Node

Walk an existing workflow and surface severity-ranked findings, each tied to the node name and the
exact issue. Produce the report in `templates/audit-report.md`. Worked in
`examples/02-audit-findings.md`.

## What you can and cannot see from the API

You CANNOT audit credential binding from `get_workflow_details` / a REST GET, because n8n omits
node credentials from API output (Directive 1). So "is this node bound?" must be checked in the UI
or by attempting a test execution, never inferred from API JSON. Source:
`research/2026-06-29-mcp-update-credentials-stripped-and-blocked.md`. Flag any node whose binding
you could not confirm as `Unverified binding` rather than `Bound`.

## The node-by-node checklist

For each node, check:

1. **Credential gap.** Does the node need auth, and is it bound? Confirm via UI or test run, not
   API JSON. Severity: Critical if a live side-effect node is unbound.
2. **Item multiplication.** Does an upstream node return more than 1 item into a node that should
   run once? Look for the missing `executeOnce: true` or missing parallel-branch + `merge()`.
   Source: `research/2026-06-29-workflow-sdk-reference-in-environment.md`.
3. **`alwaysOutputData` misuse.** Is `alwaysOutputData: true` set on a node whose empty case does
   NOT have its own dedicated branch? That synthetic `{json:{}}` item will break downstream reads.
4. **0-based merge wiring.** Are Merge inputs wired `0..N-1`? A branch wired to input `N` (or a
   1-based scheme) silently drops data.
5. **IF / Switch `conditions` shape.** Does every IF/Filter `conditions` include `options`,
   `conditions`, and `combinator`? Do Switch rules use `rules.values` with `outputKey` per rule?
6. **Missing error handling.** Does a flaky external call lack `retryOnFail` / `maxTries` /
   `waitBetweenTries`? Does the workflow lack an `errorWorkflow` setting? See
   `guides/04-error-handling-mechanics.md`. Source:
   `research/2026-06-29-error-handling-mechanics.md`.
7. **Retry-without-idempotency.** Does a node with `retryOnFail: true` perform a non-idempotent
   side effect (charge, send SMS/email, create CRM record) with no idempotency gate? A retry
   DOUBLES the side effect. See `guides/07-idempotency-and-rerun-safety.md`. Source:
   `research/2026-06-29-idempotency-dedupe-webhook-retries.md`.
8. **Webhook + irreversible side effect, no gate.** Any webhook-triggered workflow with an
   irreversible side effect MUST have an idempotency gate; Remove Duplicates is NOT sufficient
   (it only dedupes within one execution).
9. **Data Table column-rename risk.** Does the workflow reference a Data Table column by name?
   Renaming that column silently breaks the reference. Source:
   `research/2026-06-29-data-tables-surface.md`.
10. **Expression hazards.** Plain JS variables outside `{{ }}`, backtick template literals, or
    `$json` used after fan-in where `nodeJson(node, 'path')` is required.

## Severity ranking

- **Critical:** breaks (or will break) a live workflow with no edit-time error (unbound credential
  on a live node, retry-without-idempotency on a money/message side effect, missing idempotency
  gate on a webhook with an irreversible side effect).
- **High:** wrong-output or silent-data-loss risk (item multiplication, `alwaysOutputData` misuse,
  mis-indexed Merge, malformed IF/Switch conditions).
- **Medium:** resilience gap that surfaces under failure (no `errorWorkflow`, no node-level retry
  on a flaky call, Data Table near the 50MB cap with no pruning).
- **Low:** style or maintainability (expression hazards that currently resolve, unnamed nodes).

## Output

One finding per row in `templates/audit-report.md`: node name, severity, the exact issue, the
research-grounded reason, and the fix. End with a one-line verdict (safe to ship / fix Criticals
first). No em dashes (Directive 6).
