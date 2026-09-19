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
- PRD-005 Authenticated Review Runtime (completion review findings C1 through C4, 2026-09-19)
  - moved from `backlog/` to `in-work/` on 2026-09-19 at gauntlet raid start; ledger section "Gauntlet raid: completion review C1 through C4 (PRD-005)" in [`EXECUTION_LEDGER.md`](../../../EXECUTION_LEDGER.md)
  - 005a runtime authentication composition, 005b review session issuance and store, 005c correlation and retry idempotency, 005d handoff reconciliation, 005e deployed qualification
