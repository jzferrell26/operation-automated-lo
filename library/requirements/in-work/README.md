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
  - 004a preview deploy smoke: **not started** (blocked: `OALO_DATABASE_URL` on `operation-automated-lo-web`)
  - 004b portal + Test Link: **not started** (blocked: Marketplace sign-in)
  - 004c Marketplace submission: **not started** (blocked: 004a + 004b)
