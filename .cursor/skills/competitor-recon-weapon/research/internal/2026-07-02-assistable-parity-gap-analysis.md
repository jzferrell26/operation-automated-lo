---
source_url: C:\Users\jzfer\cuantico-sms\library\knowledge-base\ux-ui\assistable-parity-gap-analysis.md
retrieved_on: 2026-07-02
source_type: internal-precedent
authority: official
relevance: critical
topic: gap-analysis-methodology
weapon: competitor-recon-weapon
---

# Assistable visual + perceived-performance parity: gap analysis (2026-07-02) [internal worked example]

## Summary
This is the single worked precedent the whole competitor-recon-guardian Guardian generalizes from, per the Command Brief. It is a 12-section (2.1 through 2.12 plus Parts 1-3) hand-built gap analysis comparing the Assistable SaaS product (competitor/reference) against the in-house Cuantico SMS portal, built from a live logged-in side-by-side browser walkthrough on 2026-07-02. It demonstrates every discipline the Guardian is meant to encode: perceived-performance root-causing (not just visual diffing), a per-surface visual gap table, an explicit corrected-findings log, public-docs-repo cross-referencing for behavioral facts, and a phased build-order recommendation that stops short of a ship/iterate/watch/kill verdict.

## Key quotations / statistics
- "This supersedes prd-040-foundation.md as the parity bar: PRD-040 hit its written ACs but the shipped portal does not look or feel like Assistable." (evidence that a written spec can pass and still miss the true target; ground truth beats a stale spec)
- "Three verified root causes, in impact order" -- performance section is diagnosed with hard evidence (`X-Vercel-Id: cle1::iad1::...` header, network capture showing "15+ dynamic RSC prefetch requests"), not guessed.
- "### 2.10 Billing is a CONDITIONAL client-facing settings tab (corrected 2026-07-02) / Correction of the earlier read: billing IS exposed to clients... (observed present on a re-billed account, absent on a non-rebilled one...)" -- THE canonical corrected-findings example referenced by Critical Directive 4 of the Guardian's Command Brief. A feature was initially recorded as absent, then found present under a different account state (re-billed vs non-rebilled), forcing a correction to a previously-filed finding.
- "### 2.12 Authoritative behavior reference: Assistable's public docs repo / github.com/assistable-ai/docs (public Mintlify source, 166 files, updated 2026-04) is the canonical behavior reference for every module... Local clone for raid reference: C:\Users\jzfer\assistable-docs-reference (do NOT vendor into this repo; read for facts and behavior, never copy prose)." -- demonstrates the read-facts-never-copy-prose discipline (Critical Directive 2) applied to a real public docs repo, and shows public docs used to REFINE a UI-observed finding (the billing-tab gate resolved from "some accounts" to "member-invited accounts" by reading `platform/subaccount-wallet.mdx`).
- "### 2.7 Not inspected this pass (capture before building) / Knowledge, Widgets, Artifacts, Numbers, Active Tags, Observations, Contacts (main page), Calendar, integration Configure/Manage detail views, Account tab below the fold, docs article pages." -- an explicit "not yet covered" ledger inside the report itself, distinct from a false negative. This is a coverage-honesty pattern worth generalizing: the report names what it did NOT check, not just what it found.
- "Owner routing: react-guardian (structure) + ux-ui-guardian (per-surface conformance) + design-system token updates; security-guardian then quality-guardian close-out per rule 4c." -- the report ends by routing to OTHER agents/guardians for implementation, never rendering the strategy verdict itself. This is the live example of "route, do not render" (Critical Directive 7).

## Annotations for weapon-forge
- The report's section shape (Part 1 performance root-cause / Part 2 per-surface visual gap tables 2.1-2.11 / an explicit "not inspected" ledger (2.7) / Part 3 phased build order) is NOT the schema to copy verbatim -- the Command Brief explicitly says the Weapon should encode a GENERIC gap-table schema (surface / present-in-target / present-in-ours / severity / evidence-source / verification-state), generalized from this document's structure, not a copy of its exact section list. weapon-forge's guide should show this document as "the concrete instance," then present the abstracted schema alongside it.
- The corrected-findings billing-tab example (2.10) is the canonical illustration for a guide section on "verify across account states before recording a gap" (Critical Directive 4). weapon-forge should probably quote this example directly (with attribution) as the worked cautionary tale, since it is specific, concrete, and already proven correct after revision.
- Section 2.12's use of the public docs repo to REFINE (not just corroborate) a UI finding is a second-order pattern worth its own guide callout: public-artifact archaeology is not only for filling gaps UI walkthroughs cannot reach, it is also for resolving ambiguity in what the UI observation alone could not explain (why does billing appear on some accounts and not others).
- No contradictions found between this source and the other internal sources reviewed; this document and `assistable-reference/README.md` are companion artifacts of the same 2026-07-02 session and are mutually consistent (the README explicitly cross-references this gap-analysis doc, and vice versa).
