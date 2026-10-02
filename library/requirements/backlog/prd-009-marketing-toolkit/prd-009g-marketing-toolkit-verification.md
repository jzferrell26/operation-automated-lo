# PRD-009g: Marketing Toolkit - Verification

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01. Not started.
> **Priority:** P0. The bad first impression shipped because no check ever looked at an empty account.
> **Schema changes:** None
> **Owner Guardians:** `ux-ui-guardian` (captures, the redraw, the scored review, the sign-off); `browser-automation-guardian` (the new review-project specs); `react-guardian` (fixes the review finds)

## Goal

Prove the toolkit as a brand-new person meets it, not only as seeded or demo data shows it:

- screen baselines redrawn once, including new empty-account states captured in the review project;
- a scored design review against the PRD-009 mockups and the updated rubric;
- tests that hold the click and field targets, the five-minute ceiling, and the "state it once" rule;
- the design sign-off re-signed on the final commit.

The cross-cutting gates (`pnpm verify`, `pnpm test:db`, the four required checks, `MERGEABLE`, `security-guardian` then `quality-guardian`) are the index's MTK-002 to MTK-004.

## Background (honest)

1. **Every prior design check looked at seeded or demo data.** The synthetic project (`tests/visual/screens/chromium/`) photographs fixture workspaces, and the review project (`tests/visual/screens/review/`) photographs the seeded review people, whose workspace already has campaigns and settings. No baseline shows the Home a self-serve sign-up lands on, which is the page the owner saw (owner direction, "What he saw").
2. **Sign-ups are rate limited.** `sign_up_ip` allows 10 per 3,600 seconds (`apps/web/src/server/password-authentication-handler.ts:121`). Review specs already share that budget: one spec once spent it and broke others, so the account-creating specs now create one account and reuse it (`tests/browser/review/guided-setup.accessibility.spec.ts:32-38`; `tests/browser/review/design-quality.spec.ts:46-55`).
3. **How baselines move.** Pictures are drawn only on the comparing platform, the `ubuntu-24.04` runner, by `.github/workflows/screen-baselines.yml` (a `workflow_dispatch` workflow). It commits nothing: the run downloads the artifacts into `tests/visual/screens/`, reviews each changed picture, and commits with the "Baseline change:" note that `tooling/tests/unit/design-quality/baseline-note.test.ts:32` enforces (006D-AC-013).
4. **One existing UX test visits a removed page.** "keyboard focus, target size, checklist order, and reduced motion meet the UX contract" (`tests/browser/ui-foundation-ux.spec.ts:218-232`) opens `/onboarding`, which 009f redirects to Home.
5. **The header is sticky.** `apps/web/src/features/shell/components/app-shell.module.css:208` sets `position: sticky`, so a focused control can scroll under the top bar unless the page reserves room for it.

## Scope

- New and edited specs under `tests/browser/review/` and `tests/browser/`.
- `tests/visual/screens/**`.
- `docs/operations/evidence-packs/design-quality-signoff.md` and `docs/operations/evidence-packs/guided-setup-timing.md`.
- The scored review in this PRD's `qa/` folder.

## Non-Goals

- Changing the comparison thresholds or the frames.
- Redrawing before every 009a to 009f criterion is VERIFIED.
- Photographing anything on the deployed app. The owner's visual sign-off on the live app is an operator item (009F-AC-014).

## Design decisions

### D1. One fresh account, reused

The empty-account spec signs up once and walks every page, frame, and theme in that one account before anything is saved, then saves one campaign and photographs the populated states with the same account where it can. Its sign-ups, added to the other specs', stay within the limit in Background 2. The spec says so in a comment, as the existing specs do.

### D2. "Stated once" is measured by sentence

A connection sentence is any sentence that says HighLevel or Meta is not connected (including "isn't connected", "aren't connected", and "Not connected yet"). On a page, each distinct connection sentence appears at most once; a short state attached to a named item ("Connect Meta: Not connected yet") counts once per item. On Home, every connection sentence is inside the "Get set up" card. "Not live yet" on a result figure is a reading, not a connection sentence.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009G-AC-001 | A new review-project spec follows D1 and captures, before anything is saved: Home (first run), Campaigns (empty), step 1 (empty and with the Home address), step 2 (before save), Brand (empty), Realtor partners (empty), Settings, Settings connections, and Homeowner reports, at 1440, 1180, 768, and 390 in Light and Dark. Each capture is compared against a baseline in `tests/visual/screens/review/`, and axe reports zero violations for each. | Browser (review), Visual baseline |
| 009G-AC-002 | The review project also captures and compares, at the four frames in both themes with axe at zero: step 3 in every state of 009d D9; the campaign page approved, sent back, and with an imported property line; the Campaigns list populated with every chip; the gone page; and the Menu sheet open at 390. | Browser (review), Visual baseline |
| 009G-AC-003 | Every kept synthetic-project screen is redrawn; the 8 `reports--*` baselines and every baseline of a removed screen are deleted; no baseline shows a left rail. | Visual baseline |
| 009G-AC-004 | Every 009a to 009f criterion is VERIFIED before `screen-baselines.yml` is dispatched. It is dispatched once on the run branch for the whole change set, and its run ID is recorded in the ledger. Any later dispatch happens only under 009G-AC-012. | CI record |
| 009G-AC-005 | The committed baselines carry the "Baseline change:" note, and `Application verification` and `Real PostgreSQL migrations and pgTAP` pass on the head that installs them. | CI |
| 009G-AC-006 | `ux-ui-guardian` reviews every changed and new picture against `library/knowledge/private/ux-ui/06-review-rubric.md` as amended (axis 10 now reads against the PRD-009 mockups) and against `design/00-direction.md`, attributes each change to its sub-PRD, and records the result in this PRD's `qa/` folder. Every installed picture scores 3 on every axis; any picture below 3 is a defect fixed, with a test, before the baselines are committed. | Review |
| 009G-AC-007 | `docs/operations/evidence-packs/design-quality-signoff.md` is re-signed against the final commit: rows for removed screens read "Removed by PRD-009 on <date>" and stay as history; every new screen and state, including each empty-account state, has a row; no "not photographed" or "asserted" cell remains; the statement that screenshots are retained outside git and hold no real personal data stays. | Record check |
| 009G-AC-008 | A review-project spec drives 009d D10's happy path from Home to an approved version, as a workspace owner with a saved brand and a consented partner used before, and counts through a helper: exactly 6 button and link activations, 3 typed fields, 1 checkbox, and 1 photo upload; a second run that changes the partner counts 7 activations. | Browser (review) |
| 009G-AC-009 | The timed spec (`tests/browser/review/guided-setup.timed.spec.ts`, re-scoped) measures from the sign-up page's first paint to an approved version on the three-step flow under the D9 typing model of PRD-006c and asserts under 300 seconds (`CEILING_SECONDS`, `:43`). The measured numbers are written to `docs/operations/evidence-packs/guided-setup-timing.md` under the regenerate flag, and the pull request records the total. | Browser (review) |
| 009G-AC-010 | A review-project spec visits every signed-in page of a brand-new account (Home, Campaigns, steps 1 to 3, a campaign page, Brand, Realtor partners, Homeowner reports, Settings and its sub-pages) and asserts D2 on each. | Browser (review) |
| 009G-AC-011 | Every new screen is operable end to end with the keyboard alone. The focus ring is 2 px with a 3 px offset, and no focused control is hidden under the sticky top bar (the page reserves the bar's height as scroll padding). The UX contract test at `tests/browser/ui-foundation-ux.spec.ts:218` opens Home instead of `/onboarding` and still asserts focus, target size, and reduced motion. | Browser (synthetic, review) |
| 009G-AC-012 | Any fix after the 009G-AC-004 dispatch that changes rendered output, including one the close-out audits cause, re-opens 009G-AC-004 and 009G-AC-007 for the affected pictures only; the further dispatch's run ID is recorded, and the sign-off is re-signed on the final commit. | CI record |
| 009G-AC-013 | Under `prefers-reduced-motion: reduce`, every new screen, the Menu sheet, and the ad preview's shape switch have zero non-zero animations and transitions. | Browser (synthetic) |

## Files expected to change

- `tests/browser/review/` (new empty-account, populated-state, click-count, and single-statement specs; the timed spec re-scoped; the guided-setup specs removed in 009b). `freshEmail` and `signUpFreshAccount` in `tests/browser/review/helpers/guided-setup-journey.ts:34-35,171` are kept (moved if the file is renamed), because they create accounts under `@oalo.invalid`
- `tests/browser/ui-foundation-ux.spec.ts`, `tests/browser/design-quality.spec.ts`, and the other synthetic specs recon section 1 names
- `tests/visual/screens/chromium/**`, `tests/visual/screens/review/**`
- `docs/operations/evidence-packs/design-quality-signoff.md`, `docs/operations/evidence-packs/guided-setup-timing.md`
- `apps/web/src/features/shell/components/app-shell.module.css` (scroll padding), if 009a has not already added it

## Test plan

- **Browser and visual (CI on the run branch, after the redraw):** 009G-AC-001 to 003, 005, 008 to 011, 013.
- **Review:** `ux-ui-guardian`'s scored report (006) and the re-signed sign-off (007).
- **CI record:** the dispatch discipline (004, 012).

## Security notes

- Every capture uses the disposable test database, the seeded review people, or accounts the run creates under the reserved `.invalid` domain. No picture holds a real name, address, or token.
- Sample photos in captures are generated or come from fixtures the run owns, never from Zillow or Redfin.

## Open questions

- [ ] None blocking.

## Related

- [PRD-008d verification depth](../../completed/prd-008-finish-line-hardening/prd-008d-finish-line-hardening-verification-depth.md), whose redraw discipline this follows
- [Design quality sign-off](../../../../docs/operations/evidence-packs/design-quality-signoff.md)
- [`tests/visual/screens/README.md`](../../../../tests/visual/screens/README.md)

## Amendments

None yet.
