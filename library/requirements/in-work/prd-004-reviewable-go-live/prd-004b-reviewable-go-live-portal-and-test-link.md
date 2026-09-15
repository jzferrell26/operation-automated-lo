# PRD-004b: Reviewable Go-Live - Portal Inspection and Test Link

> **Parent:** [PRD-004](./prd-004-reviewable-go-live-index.md)
> **Status:** Not started
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
- Flipping deferred G2 ACs without sanitized fixtures.

## Acceptance criteria

| ID | Criterion |
|---|---|
| 004B-AC-001 | Inspection checklist in submission packet is complete with listing type recorded. |
| 004B-AC-002 | OAuth callback and Custom Page URL match the verified preview hostname. |
| 004B-AC-003 | Test Link install succeeds into a sandbox location. |
| 004B-AC-004 | Operator can reach create → persist → approve on preview after install. |
| 004B-AC-005 | No tokens, client secrets, or PII committed to git. |

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| Marketplace portal not signed in | Human operator | Sign in to Developer Portal in browser |
| Preview URL from 004a | `release-deploy-guardian` | Complete 004a smoke first |

## Related

- [HighLevel Marketplace submission packet](../../../knowledge/private/product/highlevel-marketplace-submission.md)
- [G2 App Test evidence pack](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md)
