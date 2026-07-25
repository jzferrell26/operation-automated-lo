# Example 02: Audit Findings on an Enrichment Workflow (edge case)

Demonstrates `guides/02-audit-workflow.md`. Shows the node-by-node checklist applied to a real
shape (a batched contact-enrichment clone), including the can-not-confirm-binding edge case.

## Input the Guardian receives

> "Audit the Grant enrichment clone on the Cuantico main instance before we turn it on for a new
> client."

## What the Guardian does

Confirms instance (Cuantico main, Directive 5), exports the workflow JSON (Guide 03 step 2), then
walks every node against the Guide 02 checklist. Because `get_workflow_details` omits node
credentials (Directive 1), bindings are marked `Unverified` until checked in the UI.

## Output the Guardian produces (excerpt of `templates/audit-report.md`)

| Node | Severity | Issue | Reason | Fix |
|---|---|---|---|---|
| `Enrich (HTTP)` | Critical | `retryOnFail: true` on a provider call that also writes back to GHL, no idempotency gate | A retry re-runs the write-back side effect; Guide 07 | Add a Data-Table idempotency gate keyed on contact id before the write-back |
| `Write to GHL` | Critical | Credential binding unverifiable from API output | API omits node credentials; Guide 02 | Confirm binding in the UI or via a test execution before go-live |
| `SplitInBatches` | High | Downstream HTTP node missing `executeOnce`, runs N times per batch item | Item multiplication; Guide 01 | Set `executeOnce: true` on the node that should run once, or split into parallel branches + `merge()` |
| `Merge results` | High | Branch wired to Merge input `2` in a 2-branch merge | 0-based indices: valid inputs are `0` and `1`; Guide 01 | Re-wire to inputs `0` and `1` |
| `Route by status` | Medium | Switch uses `rules.rules` instead of `rules.values`, missing `outputKey` | Malformed Switch conditions; Guide 01 | Rebuild conditions with `rules.values`, each rule with `outputKey` and a full `conditions` object |
| (workflow) | Medium | No `errorWorkflow` set in settings | No failure path; Guide 04 | Set `errorWorkflow` to the global error handler |

Verdict: **Do not ship.** Fix the two Criticals (idempotency gate + verified GHL binding) first,
then re-audit.

## Why this is an edge case

It surfaces the binding-unverifiable case (you cannot prove a credential is bound from API JSON),
the retry-without-idempotency Critical, and the silent 0-based Merge mis-wire, none of which throw
an error at edit time. It also respects the scope boundary: the audit flags the GHL write-back
TYPING risk as a finding but routes the field-semantics fix to `gohighlevel-guardian` and the
enrichment-loop DESIGN to `contact-enrichment-guardian` rather than redesigning the loop.
