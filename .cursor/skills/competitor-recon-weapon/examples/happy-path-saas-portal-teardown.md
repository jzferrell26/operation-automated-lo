# Example: happy-path SaaS portal teardown (end to end)

A worked walkthrough of the full pipeline (guide 01), generalized from the Assistable vs cuantico-sms run. Names are illustrative; the method is the point.

## Scenario

The operator wants to know how our portal compares to a competitor SaaS portal we can log into with our own (white-labeled) account, so we can prioritize what to build next.

## Stage 1: Scope

- Target: competitor portal, `portal.example-competitor.com`, own authorized account available.
- Surfaces in scope: app chrome, the main builder surface, settings.
- Authenticated capture possible: yes (tier 1/2). Demonstrates guide 02.

## Stage 2: Capture (three channels)

**(a) Authenticated UI** (guide 02). Drove a browser via MCP through a real task flow, screenshotting each surface. Ran a second pass for interactive states (modals, panels, empty/loading states). Used a throwaway test record to reach a data-populated screen, then cleaned up (Hard Rule 1).

**(b) Public-artifact archaeology** (guide 03). Probed `portal.example-competitor.com/openapi.json` (found: full API surface), `/.well-known/api-catalog` (found), `/llms.txt` (404, proves nothing). Found the docs repo; the `docs.json` nav mapped every module. A business-layer docs page documented a settings tab's visibility gate.

**(c) Client-bundle mining** (guide 04). Found an exposed `.js.map`; extracted the module tree and three feature-flag names, one of which named an unshipped surface. Recorded as build-not-shipped, pending live verification.

## Stage 3: Verify across states (guide 05)

The billing-like settings tab appeared absent on the trial account. A second capture on a differently-provisioned account showed it present. The competitor's public docs then resolved the gate to a membership condition. Finding recorded with `verification-state: corrected` and the full arc noted. This is the discipline that prevented a false "competitor lacks billing" gap.

## Stage 4: Organize the corpus (guide 08)

Filed captures into `example-competitor-reference/` with a role-split layout (`Admin Side/`, `Member Side/`), one folder per module, in walk order. Wrote the corpus README from `templates/reference-corpus-README-template.md`: provenance, private-repo restriction, PII acknowledgment (names/emails present, redaction pending per Hard Rule 5), and a pointer to the docs for behavioral facts.

## Stage 5: Synthesize (guide 07)

Wrote the gap analysis from `templates/gap-analysis-template.md`:
- Provenance header (accounts, date, method).
- Part 1: one cross-cutting perceived-performance finding with header evidence.
- Part 2: per-surface tables with the six-column schema; each row cites its evidence-source and verification-state; a "not inspected this pass" ledger for surfaces skipped.
- Part 3: phased build order, P0 (cheap high-impact hotfix) first, then P1..Pn by (impact x exposure)/effort.

## Stage 6: Route (Hard Rule 7)

- Phased build order and gap tables -> handed to the operator.
- "Is this worth building / in what order strategically" -> white-council-guardian.
- "Write the PRD for P1" -> library-guardian.
- No legal question arose this run, so code-forensics-guardian was not engaged.

## Rules demonstrated

1 (throwaway records), 2 (facts not prose), 4 (verify across states), 5 (PII in corpus README), 7 (route don't render), 8 (no em dashes). Guides: 01, 02, 03, 04, 05, 07, 08.
