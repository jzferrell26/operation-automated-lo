# PRD-009g: Marketing Toolkit - Verification

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01; revised the same day for OD-H (the library screens join the captures; the click and field count moved to 009D-AC-022).
> **Priority:** P0. The bad first impression shipped because no check ever looked at an empty account.
> **Schema changes:** None
> **Owner Guardians:** `ux-ui-guardian` (captures, the redraw, the scored review, the sign-off); `browser-automation-guardian` (the new review-project specs); `react-guardian` (fixes the review finds)

## Goal

Prove the toolkit as a brand-new person meets it, not only as seeded or demo data shows it:

- screen baselines redrawn once, including new empty-account states captured in the review project;
- a scored design review against the PRD-009 mockups and the updated rubric;
- tests that hold the five-minute ceiling and the "state it once" rule (the click and field targets are 009D-AC-022);
- the design sign-off re-signed on the final commit.

The cross-cutting gates (`pnpm verify`, `pnpm test:db`, the four required checks, `MERGEABLE`, `security-guardian` then `quality-guardian`) are the index's MTK-002 to MTK-004.

## Background (honest)

1. **Every prior design check looked at seeded or demo data.** The synthetic project (`tests/visual/screens/chromium/`) photographs fixture workspaces, and the review project (`tests/visual/screens/review/`) photographs the seeded review people, whose workspace already has campaigns and settings. No baseline shows the Home a self-serve sign-up lands on, which is the page the owner saw (owner direction, "What he saw").
2. **Sign-ups are rate limited.** `sign_up_ip` allows 10 per 3,600 seconds (`apps/web/src/server/password-authentication-handler.ts:121`). Review specs already share that budget: one spec once spent it and broke others, so the account-creating specs now create one account and reuse it (`tests/browser/review/guided-setup.accessibility.spec.ts:32-38`; `tests/browser/review/design-quality.spec.ts:46-55`).
3. **How baselines move.** Pictures are drawn only on the comparing platform, the `ubuntu-24.04` runner, by `.github/workflows/screen-baselines.yml` (a `workflow_dispatch` workflow). It commits nothing: the run downloads the artifacts into `tests/visual/screens/`, reviews each changed picture, and commits with the "Baseline change:" note that `tooling/tests/unit/design-quality/baseline-note.test.ts:32` enforces (006D-AC-013).
4. **One existing UX test visits a removed page.** "keyboard focus, target size, checklist order, and reduced motion meet the UX contract" (`tests/browser/ui-foundation-ux.spec.ts:218-232`) opens `/onboarding`, which 009f redirects to Home. 009a changes it to open Home in Wave 1, in the same merge that removes `/onboarding`, so it never fails between waves.
5. **The header is sticky.** `apps/web/src/features/shell/components/app-shell.module.css:208` sets `position: sticky`, so a focused control can scroll under the top bar unless the page reserves room for it.
6. **The review test run shows sample ads, and the hosted app shows none.** The review run sets the samples flag (009c D3), so its library pictures show the labelled sample ads. The real catalog ships empty (index R-1), so a real sign-up sees Home's start card with the empty-library sentence, and the library tab and step 1 with no chips. Those are the hosted first impression, and they need their own pictures from a server started without the flag.
7. **The unverified-email notice cannot appear in the review run.** The layout renders it above every page (`apps/web/src/app/(authenticated)/layout.tsx:197`) only when transactional email is configured: with no email configured the state is `not_applicable` (`apps/web/src/server/runtime-authentication.ts:566-571`), and the review run configures none, which `tooling/tests/database/review-browser-run.test.ts:36-40` pins. The synthetic design surface already renders the notice inside the real shell (`apps/web/src/app/(authenticated)/design-surfaces/page.tsx:69`, `:89`).

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

The empty-account spec signs up once and walks every page, frame, and theme in that one account before anything is saved, then saves campaigns and photographs the populated states with the same account where it can. Its sign-ups, added to the other specs', stay within the limit in Background 2. The spec says so in a comment, as the existing specs do.

### D2. "Stated once" is measured by sentence

A connection sentence is any sentence that says HighLevel or Meta is not connected (including "isn't connected", "aren't connected", and "Not connected yet"). On a page, each distinct connection sentence appears at most once; a short state attached to a named item ("Connect Meta: Not connected yet") counts once per item. On Home, every connection sentence is inside the "Get set up" card. "Not live yet" on a result figure is a reading, not a connection sentence.

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009G-AC-001 | A new review-project spec follows D1 and captures, before anything is saved: Home (first run), Campaigns "Your campaigns" (empty), the Ads library tab (all, and one topic), step 1 (all, and filtered), step 2 for the first campaign (the area still empty), Brand (empty), Realtor partners (empty, with its line), Settings, Settings connections, and Homeowner reports, at 1440, 1180, 768, and 390 in Light and Dark. Each capture is compared against a baseline in `tests/visual/screens/review/`, and axe reports zero violations for each. The same review run then starts the server a second time with `OALO_ADS_LIBRARY_SAMPLES` unset and captures Home, the Ads library tab, and step 1 against the real, empty catalog at the four frames in both themes, axe at zero: the hosted first impression. The synthetic design surface gains a state that renders the new Home under the unverified-email notice, captured at 1440 and 390 in Light. | Browser (review), Browser (synthetic), Visual baseline |
| 009G-AC-002 | The review project also captures and compares, at the four frames in both themes with axe at zero: step 3 in every state of 009d D8 (including "Ad retired"); the campaign page approved, sent back, with a library notice, and for a campaign saved before PRD-009; the Campaigns list populated with every chip; the gone page; and the Menu sheet open at 390. | Browser (review), Visual baseline |
| 009G-AC-003 | Every kept synthetic-project screen is redrawn; the 8 `reports--*` baselines and every baseline of a removed screen (including the open house create states) are deleted; no baseline shows a left rail. | Visual baseline |
| 009G-AC-004 | Every 009a to 009f criterion is VERIFIED before `screen-baselines.yml` is dispatched. It is dispatched once on the run branch for the whole change set, and its run ID is recorded in the ledger. Any later dispatch happens only under 009G-AC-011. | CI record |
| 009G-AC-005 | The committed baselines carry the "Baseline change:" note, and `Application verification` and `Real PostgreSQL migrations and pgTAP` pass on the head that installs them. | CI |
| 009G-AC-006 | `ux-ui-guardian` reviews every changed and new picture against `library/knowledge/private/ux-ui/06-review-rubric.md` as amended (axis 10 now reads against the PRD-009 mockups) and against `design/00-direction.md`, attributes each change to its sub-PRD, and records the result in this PRD's `qa/` folder. Every installed picture scores 3 on every axis; any picture below 3 is a defect fixed, with a test, before the baselines are committed. | Review |
| 009G-AC-007 | `docs/operations/evidence-packs/design-quality-signoff.md` is re-signed against the final commit: rows for removed screens read "Removed by PRD-009 on <date>" and stay as history; every new screen and state, including each empty-account state, has a row; no "not photographed" or "asserted" cell remains; the statement that screenshots are retained outside git and hold no real personal data stays. | Record check |
| 009G-AC-008 | A new timed spec (`tests/browser/review/launch-an-ad.timed.spec.ts`, replacing `guided-setup.timed.spec.ts`, which 009b deletes in Wave 2 with the walkthrough) measures from the sign-up page's first paint to an approved version through "Launch an ad", under the D9 typing model of PRD-006c, and asserts under 300 seconds (the `CEILING_SECONDS` of `guided-setup.timed.spec.ts:43`, kept). The measured numbers are written to `docs/operations/evidence-packs/guided-setup-timing.md` under the regenerate flag, below the walkthrough's earlier table, which stays under a dated heading "PRD-006c, retired" because `CRR-162` cites it; the pull request records the total. | Browser (review) |
| 009G-AC-009 | A review-project spec visits every signed-in page of a brand-new account (Home, both Campaigns tabs, steps 1 to 3, a campaign page, Brand, Realtor partners, Homeowner reports, Settings and its sub-pages) and asserts D2 on each. | Browser (review) |
| 009G-AC-010 | Every new screen is operable end to end with the keyboard alone. The focus ring is 2 px with a 3 px offset, and no focused control is hidden under the sticky top bar (the page reserves the bar's height as scroll padding). The UX contract test at `tests/browser/ui-foundation-ux.spec.ts:218` opens Home instead of `/onboarding` (changed by 009a in Wave 1) and still asserts focus, target size, and reduced motion. | Browser (synthetic, review) |
| 009G-AC-011 | Any fix after the 009G-AC-004 dispatch that changes rendered output, including one the close-out audits cause, re-opens 009G-AC-004 and 009G-AC-007 for the affected pictures only; the further dispatch's run ID is recorded, and the sign-off is re-signed on the final commit. | CI record |
| 009G-AC-012 | Under `prefers-reduced-motion: reduce`, every new screen, the Menu sheet, the topic chips, and the ad preview's shape switch have zero non-zero animations and transitions. | Browser (synthetic) |

## Files expected to change

- `tests/browser/review/` (new empty-account, populated-state, and single-statement specs; a new timed spec; the guided-setup specs, including the old timed spec, removed by 009b in Wave 2). `freshEmail` and `signUpFreshAccount` in `tests/browser/review/helpers/guided-setup-journey.ts:34-35,171` are kept (moved if the file is renamed), because they create accounts under `@oalo.invalid`
- `tests/browser/ui-foundation-ux.spec.ts`, `tests/browser/design-quality.spec.ts`, and the other synthetic specs recon section 1 names
- `tests/visual/screens/chromium/**`, `tests/visual/screens/review/**`
- `docs/operations/evidence-packs/design-quality-signoff.md`, `docs/operations/evidence-packs/guided-setup-timing.md`
- `apps/web/src/features/shell/components/app-shell.module.css` (scroll padding), if 009a has not already added it
- `tooling/scripts/database/review-browser-run.mjs` (the second server start without the samples flag) and `apps/web/src/app/(authenticated)/design-surfaces/page.tsx` (the Home-under-notice state)

## Test plan

- **Browser and visual (CI on the run branch, after the redraw):** 009G-AC-001 to 003, 005, 008 to 010, 012.
- **Review:** `ux-ui-guardian`'s scored report (006) and the re-signed sign-off (007).
- **CI record:** the dispatch discipline (004, 011).

## Security notes

- Every capture uses the disposable test database, the seeded review people, or accounts the run creates under the reserved `.invalid` domain. No picture holds a real name, address, or token.
- The ads in captures are the labelled sample ads; no real ad exists in PRD-009.

## Open questions

- [ ] None blocking.

## Related

- [PRD-008d verification depth](../../completed/prd-008-finish-line-hardening/prd-008d-finish-line-hardening-verification-depth.md), whose redraw discipline this follows
- [Design quality sign-off](../../../../docs/operations/evidence-packs/design-quality-signoff.md)
- [`tests/visual/screens/README.md`](../../../../tests/visual/screens/README.md)

## Amendments

- **2026-10-01, OD-H.** The captures now include the Ads library, the three "Launch an ad" steps, the "Ad retired" state, and older open house campaigns. The click and field count moved to 009D-AC-022, where its targets are defined, so criteria 009G-AC-008 onward were renumbered.
- **2026-10-01, the authoring quality review** (W-9, I-7). 009G-AC-001 also photographs the hosted first impression (the empty real catalog, from a second server start without the samples flag) and the unverified-email notice over Home (from the synthetic design surface, because the review run configures no email). 009G-AC-008 keeps the walkthrough's timing table under a dated heading.
