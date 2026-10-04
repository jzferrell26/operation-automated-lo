# In-work requirements

Move a PRD here only when implementation has started on a dedicated branch.

Current in-work PRDs:

- PRD-001 Operation Automated LO
- PRD-003 Authenticated Product Activation
  - 003a campaign persistence: **done** (`70531fb`, PR #54)
  - 003b session command context: **done** (`2ee2634`, PR #55)
  - 003c human approval: **done** (`71c371d`, PR #57)
  - 003d workspace reads: **done** (`26051b3`, PR #58)
  - Parent stays in-work until [PRD-004a](./prd-004-reviewable-go-live/prd-004a-reviewable-go-live-preview-deploy-smoke.md) preview smoke passes
- PRD-004 Reviewable Go-Live and Marketplace Submission
  - 004a in-repo code: **done** (`f4b79f7`, PR #61); `GGL-001`–`GGL-007`, `GGL-010` VERIFIED
  - 004a operator smoke: **blocked** (`GGL-B01`–`B03`: `OALO_DATABASE_URL`, `OALO_REVIEW_SURFACE=authorized`, smoke log)
  - 004b portal + Test Link: **not started** (`GGL-B04`–`B07`; portal unsigned-in)
  - 004c Marketplace submission: **not started** (`GGL-B09`; blocked on smoke + Test Link)
  - 004d real-Postgres command gate: **done** (PR #65, `c140f11`, CI run `35058370796`); `GGL-008`, `GGL-009` VERIFIED. PR #66 was a separate, closed and unmerged attempt at the same gate; it is not the gate's proof.
  - 004e listing content and demo script: **content authored** in-repo; capture and submission remain blocked (`GGL-B09`)
- PRD-005 Authenticated Review Runtime (completion review findings C1 through C4, 2026-09-19)
  - moved from `backlog/` to `in-work/` on 2026-09-19 at gauntlet raid start; ledger section "Gauntlet raid: completion review C1 through C4 (PRD-005)" in [`EXECUTION_LEDGER.md`](../../../EXECUTION_LEDGER.md)
  - 005a runtime authentication composition, 005b review session issuance and store, 005c correlation and retry idempotency, 005d handoff reconciliation, 005e deployed qualification
- PRD-006 First-Party Sign-In and Guided Experience (product owner requirements of 2026-09-19)
  - moved from `backlog/` to `in-work/` on 2026-09-19 when the gauntlet raid took it on; ledger rows follow the PRD-005 section in [`EXECUTION_LEDGER.md`](../../../EXECUTION_LEDGER.md)
  - 006a email and password sign-in with sign-up, forgot-password, and reset; 006b user language; 006c guided setup under five minutes; 006d design quality bar (10 of 10) _(Amended on 2026-10-01 by PRD-009 (S-19 to S-35; D-15): the guided setup of 006c is retired.)_
  - supersedes PRD-005b design decision D4 (persona plus operator secret); reuses the PRD-005b session store
- PRD-007 Homeowner reports (the authorized homeowner-intelligence slice of PRD-002e)
  - implementation merged in PRs #69, #71, and #72; live valuation and HighLevel delivery wait on operator configuration (finish-line operator checklist steps 6a and 6b)
  - its evidence lives in `reports/` rather than `qa/`

Moved out of `in-work/`:

- PRD-008 Finish-Line Hardening moved to [`completed/`](../completed/prd-008-finish-line-hardening/prd-008-finish-line-hardening-index.md) on 2026-10-01, at the end of the Gauntlet run on branch `claude/gauntlet-prd-008`. It is complete and merged as pull request #74 on 2026-10-01 (`e89058e`).
- PRD-009 Marketing Toolkit moved to [`completed/`](../completed/prd-009-marketing-toolkit/prd-009-marketing-toolkit-index.md) on 2026-10-03, at the end of the Gauntlet run on branch `claude/prd-009-marketing-toolkit`. It is complete in pull request #75 (open, not merged); its human-only items are steps 10 to 13 of the [finish-line operator checklist](../../knowledge/private/operations/finish-line-operator-checklist.md).
