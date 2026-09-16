# PRD-004b: Reviewable Go-Live - Portal Inspection and Test Link

> **Parent:** [PRD-004](./prd-004-reviewable-go-live-index.md)
> **Status:** Not started (blocked: Marketplace portal sign-in)
> **Priority:** P0
> **Schema changes:** None
> **Owner Guardians:** `gohighlevel-guardian`, `auth-guardian`

## Goal

Inspect the Automated LO app in the HighLevel Developer Portal, confirm sandbox App Test and Test Link availability, and install into a sandbox location against the review preview URL from 004a.

## Scope

- Sign in to [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com/login) (human).
- Confirm or create Automated LO app entry; record listing type (Standard vs White-label).
- Verify OAuth scopes, HTTPS callback URL, Custom Page URL (must match 004a preview domain).
- Try **Testing** → Create App Test Account per [SandboxAccount](https://marketplace.gohighlevel.com/docs/oauth/SandboxAccount/).
- Record **My Apps** → Manage → Versions → Test Link steps per [TestingApp](https://marketplace.gohighlevel.com/docs/oauth/TestingApp/).
- Install via Test Link; exercise embedded session and Open House Boost flow on preview.
- Update [highlevel-marketplace-submission.md](../../../knowledge/private/product/highlevel-marketplace-submission.md) inspection checklist (no secrets in git).

## Non-Goals

- Marketplace submit for review in this sub-PRD (004c).
- Full G2 nine-case matrix capture (Wave 1; may begin in parallel after Test Link works).
- Flipping deferred G2 ACs without sanitized fixtures (`GGL-B10`).

## Acceptance criteria

| ID | Criterion | Status | GGL row |
|---|---|---|---|
| 004B-AC-001 | Inspection checklist in submission packet is complete with listing type recorded. | BLOCKED | `GGL-B04` |
| 004B-AC-002 | OAuth callback and Custom Page URL match the verified preview hostname. | BLOCKED | `GGL-B05` |
| 004B-AC-003 | Test Link install succeeds into a sandbox location. | BLOCKED | `GGL-B06` |
| 004B-AC-004 | Operator can reach create → persist → approve on preview after install. | BLOCKED | `GGL-B07` |
| 004B-AC-005 | No tokens, client secrets, or PII committed to git. | BLOCKED (operator notes) | `GGL-B08` |

Repo-side secret leakage is enforced by `pnpm audit:secrets` (`GGL-003`). Operator notes must stay outside git.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| Marketplace portal not signed in | Human operator | Sign in to Developer Portal (`GGL-B04`) |
| Preview URL + Postgres smoke from 004a | Operator | Complete `GGL-B01`–`B03` first |
| OAuth callback hostname decision | Product owner | Pick preview hostname (`GGL-B05`) |

## Related

- [HighLevel Marketplace submission packet](../../../knowledge/private/product/highlevel-marketplace-submission.md)
- [G2 App Test evidence pack](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md)
- [Go-live raid ledger](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code)
