# Production Tonight Operator Runbook

> Category: Operations | Version: 1.0 | Date: September 2026 | Status: Active

The single ordered page for the operator-led half of the reviewable go-live: what to do, in what order, and exactly what to send back after each step so an agent can advance the ledger without guessing.

**Related:**

- [Reviewable preview smoke evidence pack](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md) (the smoke checklist itself)
- [HighLevel Marketplace submission packet](../product/highlevel-marketplace-submission.md) (portal inspection checklist)
- [Marketplace listing copy pack](../product/marketplace-listing-copy-pack.md) (listing fields, shot list, Loom script)
- [PRD-004: Reviewable Go-Live](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md)
- [Production environment contract](../../../../docs/production-environments.md)
- [Go-live raid ledger](../../../../EXECUTION_LEDGER.md#gauntlet-raid-go-live-remaining-in-repo-code)

---

## What this runbook adds

The evidence packs hold the checklists. This page holds the **order**, the **return artifact** for each step, and the **abort conditions**. It intentionally does not restate the checklists; follow the linked pack when you are inside a step.

Read this first, then work top to bottom. Steps 1 to 3 must be sequential. Step 6 can start any time.

## Ground rules

1. **No second Vercel project.** Everything deploys to the existing `operation-automated-lo-web`.
2. **Server-only secrets.** Never prefix a secret with `NEXT_PUBLIC_`. The repository has a gate that fails the build if a server secret name appears in the public allowlist.
3. **`OALO_REVIEW_SURFACE=authorized` is a prerequisite, not an option.** Without it the review URL still serves labeled synthetic demo metrics, and the honest-surface criteria are not met. Do not take screenshots without it.
4. **Nothing goes in git.** Deployment URLs and commit SHAs are fine. Connection strings, tokens, client secrets, and any real contact data are not.
5. **Do not flip the 28 `DEFERRED: LIVE HIGHLEVEL AUTH` criteria.** Test Link succeeding is not G2 evidence. G2 needs sanitized fixtures that pass `pnpm test:contracts`.
6. **Do not claim production traffic is authorized.** This path produces a *reviewable* product, not a launched one.

---

## Step 1 - Wire the review environment

**Rows:** `GGL-B01`, `GGL-B03` · **Owner:** operator with Vercel access

Set these as server-only environment variables on `operation-automated-lo-web` (root directory `apps/web`), per [`docs/production-environments.md`](../../../../docs/production-environments.md):

- `OALO_DATABASE_URL` - a review or staging Postgres, **not** production seed data
- `OALO_REVIEW_SURFACE=authorized`
- the remaining required `OALO_*` contract variables

**Send back:** the list of variable **names** you set (not values), the deployment URL, and the commit SHA.

**Abort if:** the only database available is production. Stop and get a review database first. A review URL pointed at production data is worse than no review URL.

---

## Step 2 - Run the preview smoke

**Rows:** `GGL-B02`, `GGL-B03` · **Owner:** operator

Work through the smoke checklist in [`reviewable-preview-smoke.md`](../../../../docs/operations/evidence-packs/reviewable-preview-smoke.md). The load-bearing sequence is: open `/overview` and `/reports`, confirm honest not-connected states, then create an Open House Boost, reload, and approve it.

**Send back:** pass or fail per checklist line, plus a non-PII campaign reference for the campaign you created and approved. Retain the full smoke log outside git.

**Abort if:** `/overview` shows spend or lead numbers. That means `OALO_REVIEW_SURFACE=authorized` did not take effect. Fix step 1 before continuing; do not proceed to screenshots.

**What happens next:** this satisfies the PRD-003 parent exit gate. An agent updates PRD-003, PRD-004a, and the ledgers from your report.

---

## Step 3 - Developer Portal inspection

**Rows:** `GGL-B04`, `GGL-B05` · **Owner:** human signed in at `marketplace.gohighlevel.com`

Complete the inspection checklist in the [submission packet](../product/highlevel-marketplace-submission.md). Inspection only: do not submit for review in this pass.

Two decisions come out of this step:

- **Does the Automated LO app already exist?** If yes, record its listing type and keep it. If no, create it as **Standard** unless the product owner has asked for a White-label terminology pass first (see the copy pack).
- **Which hostname?** Set the OAuth callback and Custom Page URL to the hostname from step 1, and nothing else.

**Send back:** app name, version, visibility, publisher, OAuth scopes, listing type, and the callback plus Custom Page URL you set. No secrets.

**Abort if:** the portal UI does not match the documented flow. Record what you actually see; a documentation mismatch is itself useful evidence and belongs in the packet.

---

## Step 4 - Test Link install into a sandbox location

**Rows:** `GGL-B06`, `GGL-B07` · **Owner:** human plus `gohighlevel-guardian`

Create an App Test Account, then install through **My Apps → Manage → Versions → Test Link** against a sandbox location. Open the app inside the location and run create → persist → approve once more from inside the embedded session.

**Send back:** whether Test Link install succeeded, whether the embedded session reached the create and approve flow, and any error text verbatim. Operator notes stay outside git.

**Abort if:** the install fails on OAuth. Capture the exact error and stop; do not start editing scopes experimentally in a submitted listing.

---

## Step 5 - Complete and submit the listing

**Row:** `GGL-B09` · **Owner:** `library-guardian` plus `ux-ui-guardian`, with operator capture

The copy already exists. What remains is capture and paste:

1. Capture the six screenshots in the [copy pack](../product/marketplace-listing-copy-pack.md) shot list, from the review URL, with review mode on.
2. Record the Loom against the script in the same pack.
3. Fill the portal fields from the pack, replacing every `<< … >>` placeholder.
4. Submit for review, and record the submission date.

**Send back:** submission date, the placeholder values you supplied (support email, publisher name, pricing), and confirmation that no screenshot contains synthetic spend or lead figures.

**Abort if:** any placeholder is still unresolved at submission time. An invented support email or price is worse than a delayed submission.

---

## Step 6 - Parallel: G2 App Test capture

**Row:** `GGL-B10` · **Owner:** operator plus `gohighlevel-guardian`

Independent of steps 1 to 5. Follow [`g2-highlevel-app-test.md`](../../../../docs/operations/evidence-packs/g2-highlevel-app-test.md). Set `OALO_GHL_LIVE_CAPTURE=authorized` **only in your own shell**, never as a committed default.

**Send back:** sanitized observations per the pack's nine-case matrix.

**Hard stop:** the 28 deferred criteria stay `DEFERRED: LIVE HIGHLEVEL AUTH` until sanitized fixtures pass `pnpm test:contracts`. No agent may flip them on the strength of a successful install.

---

## Step 7 - Optional: close the real-Postgres gate

**Row:** `GGL-B16` · **Owner:** anyone with a Docker-capable machine

Independent of everything above. See [PRD-004d](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004d-reviewable-go-live-postgres-command-gate.md) for the one command and the three provisioning routes. This is the last locally provable row on the board.

---

## Status at a glance

| Step | Rows | State |
| --- | --- | --- |
| 1. Review env | `GGL-B01`, `GGL-B03` | Blocked: operator Vercel access and a review database |
| 2. Preview smoke | `GGL-B02`, `GGL-B03` | Blocked by step 1 |
| 3. Portal inspection | `GGL-B04`, `GGL-B05` | Blocked: portal not signed in |
| 4. Test Link | `GGL-B06`, `GGL-B07` | Blocked by steps 1 and 3 |
| 5. Listing submit | `GGL-B09` | Content ready (PRD-004e); capture blocked by steps 2 and 4 |
| 6. G2 capture | `GGL-B10` | Harness ready; no sanitized fixtures |
| 7. Postgres gate | `GGL-B16` | Tests exist; no observed run |

Code for every in-repo half of this path is merged on `main` (`f4b79f7`, PR #61). Nothing in steps 1 to 7 requires new application code.

## Changelog

- v1.0 (2026-09-16): Initial runbook. Ordered steps, per-step return artifacts, abort conditions, and the listing-type decision point.
