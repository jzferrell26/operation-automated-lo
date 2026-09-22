# PRD-006c: First-Party Sign-In and Guided Experience - Guided Setup

> **Parent:** [PRD-006](./prd-006-first-party-sign-in-and-guided-experience-index.md)
> **Status:** Draft
> **Priority:** P0 (owner requirement 3, and the owner's five-minute account setup rule)
> **Schema changes:** Additive (one table, `platform.user_preferences`)
> **Owner Guardians:** `product-tour-onboarding-ui-guardian` (anchor discipline, trigger rules, maintenance), `react-guardian` (the components), `ux-ui-guardian` (every step against the brief), `db-guardian` (the preferences table), `typescript-node-guardian` (the progress and profile routes), `technical-writing-craft-guardian` (step copy)

## Goal

The moment a loan officer signs in for the first time, a guided setup starts and walks them, step by step, through the minimum they need to create their first Open House Boost: their own details, their Realtor partner, the campaign draft, reading the check result, and approving it or handing it to an approver, ending with a plain statement of what happens next while HighLevel, Meta, and Stripe are not connected. It is not a passive tour: every step does something, progress is saved on the server, the user can skip and come back, and the whole journey from creating an account to a saved first campaign draft takes a first-time loan officer less than five minutes, measured by a browser test with realistic typing.

## Background (honest)

Verified in the worktree at `a3b06e6` on 2026-09-19.

- **An anchor convention exists, with no consumer.** `apps/web/src/features/onboarding/components/onboarding-screen.tsx` already renders `data-tour="onboarding-get-connected"` (line 64), `data-tour="onboarding-launch-readiness"` (line 71), and `data-tour={`onboarding-${item.id}`}` on each checklist action (line 124). Nothing reads them. There is no registry and no test that they exist.
- **No tour library, no positioning library, no animation library.** `driver.js`, `shepherd.js`, `intro.js`, `react-joyride`, `@floating-ui/*`, `@radix-ui/*`, `framer-motion`, and `motion` are absent from every `package.json` and from `pnpm-lock.yaml`. Any of them would enter under `saveExact: true` and `strictPeerDependencies: true` (`pnpm-workspace.yaml:55-56`) and would have to satisfy the browser gate's rules below.
- **The design system has no popover, tooltip, dialog, sheet, or stepper primitive.** `packages/ui/src/index.ts` exports fifteen components; the only dialog-like behaviour is the inline `role="alertdialog"` inside `SafeAction` (`packages/ui/src/components/Button.tsx:247-257`), with focus moved to the confirm control and returned to the trigger (lines 180-190). The shell's mobile drawer (`apps/web/src/features/shell/components/app-shell.tsx:47-97`) implements a focus trap, Escape, scroll lock, and focus return by hand. PRD-006d D4 adds the missing primitives; this sub-PRD builds on them.
- **What the user must do to create a campaign today.** The draft builder (`apps/web/src/features/campaigns/components/open-house-draft-builder.tsx:101-212`) has sixteen controls across three fieldsets, every one prefilled with a demo default ("123 Main Street, Dallas", "Jordan Smith", "Tour this home this weekend", lines 106-204), two permission checkboxes (lines 132-139), and one submit that posts to `/api/campaigns/preflight` (lines 46-63). The result shows "Preflight passed" or "blocked", the findings, and a link to the saved campaign (lines 225-286). The campaign page shows the check result and the approval control (`persisted-campaign-screen.tsx:83-155`); `CampaignApprovalControls` renders a `SafeAction` whose state is `permission_restricted` for a non-approver (`campaign-approval-controls.tsx:134-142`) and `ready` for an approver with a passing check (lines 153-164). A self-serve account from PRD-006a is a `location_admin`, which the role map treats as an approver-capable role; a seeded creator is not.
- **Nothing stores the user's own details.** The brand screen is a read-only fixture in review mode (`brand-profile-screen.tsx`; `authenticated-workspace-data.ts:347-394` collapses every value to "Not saved"), and there is no write path for a brand profile. The onboarding checklist is a server-verified readiness projection that the browser cannot complete (`apps/web/src/features/onboarding/model/readiness.ts:7-9`; review mode forces every item to `not_started`, `authenticated-workspace-data.ts:283-295`). Guided-setup progress is a different thing: the user's own progress through their own first campaign. It needs its own store.
- **The tenant-table precedent.** The campaign migration creates per-table policies in a loop (`supabase/migrations/20260915180000_campaign_activation.sql:225-244`: `migration_owner` all, `app_runtime` all under `platform.tenant_matches(location_id)`, `support_runtime` select) and grants `select, insert` on the evidence tables to `app_runtime` (lines 270-272). A user-preferences table follows that shape with `update` added, because progress changes.
- **The browser gate's rules that any walkthrough must satisfy** (`tests/browser/ui-foundation-ux.spec.ts`): every request to an origin other than `http://127.0.0.1:3100` is aborted and asserted absent (lines 16-38, 55-59); `prefers-reduced-motion: reduce` must yield zero animations and zero non-zero transitions on `/onboarding` (lines 219-230); every interactive control is at least 44 by 44 pixels (lines 195-205); the axe matrix `{overview, onboarding} x {Light, Dark} x {1180x900, 390x844}` must have zero violations (lines 234-257); the drawer must trap focus, lock scroll, close on Escape, and restore focus (lines 153-179). The suite runs one Chromium project (`playwright.config.ts:29-34`) against `next start` in synthetic mode on `http://127.0.0.1:3100` (lines 3, 22-28).
- **A review-mode browser run needs HTTPS.** The runtime composition requires `OALO_APP_URL` and every allowed origin to be `https:` (`apps/web/src/server/runtime-authentication.ts:132-143,158-173`), the mutation gate compares the request's `origin` and `host` to them (`packages/auth/src/browser-session.ts:204-233`), and the session cookie is `__Host-` prefixed and `Secure` (line 104). A plain-http local server therefore cannot exercise sign-in, a campaign write, or an approval in review mode. D9 solves this without a dependency.
- **Where a review-mode server can be started.** `tooling/scripts/database/run-real-database-tests.mjs` provisions the disposable database, applies every migration, seeds the review location twice, and runs the `web-postgres` vitest project (lines 156-280); the `database` CI job runs it with a 20-minute timeout (`.github/workflows/ci.yml:64-106`, line 67).
- **Design constraints for the step panel.** The brief's motion buckets are 120, 180, and 240 ms with reduced-motion honoured (`library/knowledge/private/ux-ui/00-design-brief.md:211-215`), focus is a 2 px ring with a 3 px offset that sticky surfaces must not obscure (lines 310-312), touch targets are 44 by 44 (line 256), the four frames are 1440, 1180, 768, and 390 (lines 241-244), and dialogs and drawers must trap focus, close on Escape, and return focus (`03-components/application-shell-and-navigation.md:29`). No canvas covers a walkthrough (`05-html-examples/claude-design/` has no occurrence of "walkthrough", "coach", or "tooltip"; the one "tour" hit in `Launch.dc.html` is ad body copy).

## Scope

- An in-house guided-setup component set on the design system, no new dependency.
- An anchor registry over the existing `data-tour` attribute, with tests that keep the registry and the screens in agreement.
- The seven steps in D3 with per-step time budgets, prefilling the campaign draft from what the user entered.
- Server-side, per-user progress and the small profile the steps collect, in an additive `platform.user_preferences` table.
- Auto-start on every sign-in until finished, resume, skip and return, a "Finish setup" reminder, restart from the help menu, and a completion state.
- Keyboard, screen-reader, and mobile behaviour.
- A timed browser test in review mode against a real server and the disposable database, with a five-minute ceiling and per-step budgets, plus unit and integration coverage.

## Non-Goals

- A general product-tour framework for future features, or tours for screens outside the first-campaign journey. The registry makes later tours possible; this sub-PRD ships one.
- Writing brand profile values, connecting HighLevel, Meta, or Stripe, publishing, or any provider call. The final step says so in user language.
- Changing the onboarding readiness checklist or its server-verified semantics.
- Notifications or email to an approver on hand-off. There is no email to a colleague in this batch; the hand-off step gives the user a link to copy.
- Analytics events. Progress is stored for the product, not measured for a dashboard.

## Design decisions

### D1. In-house, not `driver.js`

Recommended and chosen: a small component set at `apps/web/src/features/guided-setup/`, built on PRD-006d's new `Sheet`, `Stepper`, `TextField`, and `Link` primitives and the existing `Button`, `Card`, and `Icon`, with no runtime dependency.

`driver.js` was considered. Its cost under this repository's rules: an exact-pinned client dependency (`pnpm-workspace.yaml:55-56`), a second CSS system to reconcile with the token contract (its overlay, popover, and highlight styles are its own), an overlay whose animations must be proven to reach zero under `prefers-reduced-motion` (`ui-foundation-ux.spec.ts:219-230`), an accessibility profile the team does not control against the axe matrix, positioning logic that must be checked at all four frames, and copy templates that would have to be overridden everywhere to satisfy PRD-006b. Full visual control and a component that the design review can score like any other are worth more than the days saved.

### D2. Anchors: keep `data-tour`, add a registry

The attribute stays `data-tour` because three anchors already use it (`onboarding-screen.tsx:64,71,124`); introducing `data-walkthrough` would leave two conventions. The registry is `apps/web/src/features/guided-setup/anchor-registry.ts`, a frozen map from anchor id to `{ route, description, required }`, and every anchored element takes its id from the registry constant (`data-tour={GUIDED_SETUP_ANCHORS.campaignAddress}`), never from a string literal. Two tests hold the line: a unit test renders each screen the registry names through its existing integration harness and asserts every `required` anchor is present exactly once; and a source scan asserts no `data-tour="..."` literal exists outside the registry file. The three existing anchors are migrated into the registry.

Anchors: `setup.welcome` (the overview page's primary action area), `setup.details.form`, `setup.realtor.form`, `campaign.create.address`, `campaign.create.dates`, `campaign.create.realtor`, `campaign.create.permissions`, `campaign.create.headline`, `campaign.create.budget`, `campaign.create.submit`, `campaign.check.result`, `campaign.check.findings`, `campaign.approve.control`, `campaign.handoff.link`, `setup.done`, `shell.help.menu`, `shell.finish-setup.chip`, plus the three onboarding anchors that exist today.

### D3. The steps and their budgets

Budgets are user time under the D9 typing model (200 ms per character, a 4-second reading pause per screen, and the real server round trips). The sign-up step belongs to PRD-006a and is counted here because the owner's five minutes start at account creation.

| Step | What the user does | Anchors | Budget |
|---|---|---|---|
| 0. Create your account (PRD-006a) | Name, email, password, optional company; submit; lands on `/overview` | none | 30 s |
| 1. Welcome | A sheet opens on `/overview`: "Let's set up your first Open House Boost. It takes about three minutes." Buttons "Let's go" and "Not now" | `setup.welcome` | 10 s |
| 2. Your details | Name (prefilled from sign-up), company (prefilled), NMLS number (optional), phone (optional). Saved to the profile | `setup.details.form` | 40 s |
| 3. Your Realtor partner | Realtor's name, brokerage (optional). Saved to the profile | `setup.realtor.form` | 30 s |
| 4. Create the Open House Boost | The sheet moves the user to `/marketing/campaigns/new` with the Realtor name, disclosure, consent, headline, body, call to action, region, and budgets prefilled from the profile and a starter template; the user enters the address, state, and the two dates and confirms the two permission boxes; the sheet points at each field in turn and then at "Save and run the checks" | `campaign.create.*` | 90 s |
| 5. Read the result | On the saved campaign page the sheet explains "Ready for approval," "Needs changes" with, for each finding, what it means and how to fix it, or, when the campaign's own check result cannot be read, that it does not know and points at the campaign page underneath it (amended 2026-09-20, see Amendments) | `campaign.check.result`, `campaign.check.findings` | 20 s |
| 6. Approve, or hand it to an approver | Workspace owner or approver: the sheet points at "Approve this version" and the user confirms. Anyone else: "Only an approver or your workspace owner can approve. Copy this link and send it to them." with a copy button | `campaign.approve.control` or `campaign.handoff.link` | 20 s |
| 7. What happens next | "Your campaign is saved and approved. It won't run as an ad yet: HighLevel and Meta aren't connected. When they are, this is where you'll launch it." Button "Done". Progress becomes `completed` | `setup.done` | 10 s |

Total budget: 250 s. Ceiling: 300 s. Target: 180 s. A step over its budget in the timed run is a defect to fix, not a number to record.

Prefill rule: the draft builder's demo defaults (`open-house-draft-builder.tsx:106-204`) are replaced by profile-derived values when a profile exists and by empty fields with placeholders when it does not; demo defaults never appear for a signed-in user in review mode. The starter template for headline, body, call to action, disclosure, and consent is one honest default per field, editable, marked "Starter text, edit as you like".

### D4. Progress and profile live on the server

Migration `supabase/migrations/<timestamp>_user_preferences.sql`, additive:

| Column | Type and constraint |
|---|---|
| `location_id` | `uuid not null references platform.locations (id) on delete restrict` |
| `user_id` | `uuid not null references platform.app_users (id) on delete restrict` |
| `key` | `text not null check (key ~ '^[a-z][a-z0-9_.]{1,63}$')` |
| `value` | `jsonb not null check (pg_column_size(value) <= 16384)` |
| `updated_at` | `timestamptz not null default now()` |
| primary key | `(location_id, user_id, key)` |

RLS enabled and forced with the three standard policies; `grant select, insert, update on platform.user_preferences to app_runtime` and `select` to `support_runtime`; no delete. Every read and write runs inside `withTenantTransaction` under `set_app_context`, so a user can only ever touch rows for the location their session is bound to. Two keys:

- `guided_setup.v1`: `{ status: "not_started" | "in_progress" | "dismissed" | "completed", currentStep: 1..7, completedSteps: number[], campaignRef?: string, dismissedAt?: string, completedAt?: string, restartedCount: number }`.
- `setup_profile.v1`: `{ displayName, company, nmlsNumber?, phone?, realtorName?, realtorBrokerage? }`, each a bounded string, validated by a `.strict()` zod schema on write.

Routes: `POST /api/setup/progress` and `POST /api/setup/profile`, both requiring a valid session and the full mutation gate including CSRF, both `.strict()`; `GET` is not exposed, the authenticated layout reads both keys server-side and passes them to the provider. The profile is the user's own data (name, phone, NMLS, a partner's name); the retention, deletion, and export runbooks name the table.

The server-side read also answers two campaign facts alongside progress and the profile, both through the campaign repository under the tenant context the authenticated layout already holds (amended 2026-09-20, see Amendments): the stored campaign's own check result (ready, plus each finding's description and remediation, never a rule code), and, for someone who can approve and has no campaign of their own, the newest campaign in their workspace awaiting a decision. A campaign that cannot be read answers "unknown" rather than raising, so a removed or unreadable campaign costs the user only their step 5 sentence.

A failed profile or progress write holds the step where it is, restores the value that was stored before the write, and announces PRD-006b D7's generic failure sentence through the panel's own status region; the same "Continue" is the retry (amended 2026-09-20, see Amendments; cross-referenced at PRD-006d 006D-AC-011).

### D5. Trigger, resume, skip, reminder, restart, completion

- **Auto-start.** On every render of an authenticated page while `status` is `not_started` or `in_progress`, the sheet opens at `currentStep`, navigating to that step's route first if the user is elsewhere. For a brand-new account the first render is `/overview` after sign-up, so the welcome opens immediately.
- **Resume.** Progress is written after every completed step, so closing the tab and signing in tomorrow resumes at the same step with the profile values already saved.
- **Skip.** "Not now" on any step sets `status: "dismissed"` and `dismissedAt`. For seven days the shell shows a small "Finish setup" chip (anchor `shell.finish-setup.chip`) that reopens the sheet at `currentStep`; after seven days the chip disappears and the help menu is the way back.
- **Restart.** The help menu (anchor `shell.help.menu`) has "Show me around again", which resets `currentStep` to 1, keeps the profile, increments `restartedCount`, and opens the welcome.
- **Completion.** Step 7's "Done" sets `status: "completed"` and `completedAt`. A completed setup never auto-starts again. The campaign created during setup is recorded as `campaignRef` so step 5 through 7 can reopen it on resume.
- **Multiple users, one workspace.** Progress is per `(location_id, user_id)`, so a seeded approver and a seeded creator each get their own journey. A person who can approve and has no campaign of their own is handed the newest campaign in their workspace awaiting a decision (the same `canApprove` rule the approval control itself is drawn by); their step 3 leads to step 5 rather than step 4, step 4 is marked complete because their colleague did it, and steps 5 and 6 read against the colleague's campaign, step 6 pointing at the approve control the campaign page renders. Someone with a campaign of their own always sees it first (amended 2026-09-20, see Amendments).

### D6. Keyboard and screen reader

- The step panel is `role="dialog"` with `aria-labelledby` (the step title) and `aria-describedby` (the step body), `aria-modal="false"`: it does not trap focus, because the user must type into the highlighted field beneath it. A "Continue" which opens the next step is a step opening, so focus goes to the new step's heading; a "Continue" that keeps the same step open instead returns focus to the highlighted element, which today is only step 4's walk along the create screen's fields (amended 2026-09-20, see Amendments). When the step's action is a field, the "Continue" control is enabled only once the field is valid.
- Escape dismisses the step (same as "Not now") and saves progress; it never loses typed text.
- Tab order: the panel's controls, then the page in document order. The highlighted element is the first page control in that order.
- Step changes are announced through a `role="status"` live region ("Step 3 of 7: Your Realtor partner").
- The highlight is a non-color cue: the focus ring tokens (2 px, 3 px offset) around the anchored element plus the panel's text; no dimming overlay that would fail contrast on the surrounding page.
- Reduced motion: the panel appears and moves with no transition; otherwise it uses `--motion-base` and `--ease-standard`.

### D7. Mobile and the four frames

Below 768 px the panel is a bottom sheet (`Sheet` from PRD-006d) that never covers the field being edited; the anchored element is scrolled into view above the sheet with `scrollIntoView({ block: "center" })` and the sheet's own height is capped at 40 percent of the viewport. At 768 and 1180 the panel anchors beside the element (right, then below when there is no room); at 1440 it anchors right. Every control in the panel is at least 44 by 44. The panel never obscures the focused element or the shell's sticky header. While a step is open the page gains room at its end equal to the block size the panel occupies at that frame (plus the gap and the viewport margin), at every frame, so a control anchored at the end of a long page can always be scrolled clear of the panel; scrolling alone cannot lift a control above a panel pinned to the bottom edge otherwise. The anchored element's scroll floor is the sticky header's end, not the viewport margin (landed by Wave 7r at `b1b2b4e`, see Amendments).

### D8. Copy

Every string follows PRD-006b's contract; the strings in D3 are the exact step copy. Findings in step 5 use the mapped explanations from PRD-006b D5 (the plain description first, the rule code only under "Details for support").

### D9. The timed run and the `review` browser project

A second Playwright project, `review`, in `playwright.config.ts`, with `testDir: "./tests/browser/review"` and `ignoreHTTPSErrors: true`, run only by `pnpm test:db` as a new step after `web-postgres` (`run-real-database-tests.mjs`), because it needs the migrated disposable database. The step:

1. Generates a self-signed certificate for `127.0.0.1` with `openssl req -x509` into a temporary directory (openssl is already assumed by the seeding runbook and present on the `ubuntu-24.04` runner).
2. Starts `next start` on `127.0.0.1:3100` with `OALO_ENVIRONMENT=preview` (amended 2026-09-19 to `local`, see Amendments), `OALO_REVIEW_SURFACE=authorized`, `OALO_PROVIDER_MODE=stub`, `OALO_SYNTHETIC_DATA_ONLY=true`, `OALO_SELF_SERVE_SIGNUP=enabled`, `OALO_DATABASE_URL` pointing at the disposable database's application login, `OALO_CSRF_SERVER_SECRET` generated for the run, `OALO_APP_URL=https://127.0.0.1:3443`, `OALO_ALLOWED_ORIGINS=https://127.0.0.1:3443`, no email variables (the honest not-configured state), and the rest of the preview contract's required names with synthetic values exactly as `tests/security/provider-side-effect-default-off.test.ts` builds a deployed preview environment.
3. Starts a dependency-free TLS terminator, `tooling/scripts/browser/https-proxy.mjs`, on `127.0.0.1:3443` using `node:https` and `node:http`, forwarding to 3100 and rewriting nothing but the connection. This gives the browser a secure context, so the `__Host-` cookie, the `https:` origin check, and the host check all hold. It also answers the open question in PRD-006a about `__Host-` cookies over plain http: the run does not depend on it.
4. Runs `playwright test --project review`.
5. Stops both processes.

The timed spec `tests/browser/review/guided-setup.timed.spec.ts` does, in one browser context with a fresh random email: sign-up, welcome, details, Realtor, create (typing every value with `page.keyboard.type(value, { delay: 200 })` and pausing 4 seconds after each screen renders, before acting), read the result, approve (the self-serve user is a workspace owner), and done; it records `performance.now()` deltas per step and the wall clock from the sign-up page's first paint to the "Done" click; asserts each step is within its D3 budget and the total is under 300 seconds; and, when `OALO_REGENERATE_UI_EVIDENCE=true` (the flag `ui-foundation-ux.spec.ts:7` already uses), writes the numbers to `docs/operations/evidence-packs/guided-setup-timing.md` as a table (date, commit, per-step seconds, total). A second spec signs in as the seeded creator (password set by the gate's `--password-stdin` run, PRD-006a 006A-AC-029), runs the journey to the hand-off branch, then signs in as the seeded approver and approves; a third spec covers dismiss, the chip, resume after a new context, restart from help, and completion never auto-starting; a fourth runs the axe matrix and the reduced-motion check on every step at 390 and 1180 in both themes; a fifth exercises the 768 frame's side anchoring.

The `verify` CI job keeps `pnpm test:browser` in synthetic mode; the `database` job gains this run and its `timeout-minutes` (`.github/workflows/ci.yml:67`) is raised as the measured duration requires.

## Acceptance criteria

| ID | Criterion | Owner requirement |
|---|---|---|
| 006C-AC-001 | `apps/web/src/features/guided-setup/` exists with `GuidedSetupProvider`, `GuidedSetupStep`, and `GuidedSetupProgress` built on `@oalo/ui` primitives and no new dependency; `pnpm audit:dependencies` output and `pnpm-lock.yaml`'s dependency set are unchanged except for PRD-006d's own additions (none expected). | 3 |
| 006C-AC-002 | The anchor registry exists as D2 specifies, every `data-tour` value in `apps/web/src` comes from it (source scan), the three pre-existing anchors are migrated, and a unit test renders every registry route through its integration harness and asserts each `required` anchor is present exactly once. | 3 |
| 006C-AC-003 | The migration creates `platform.user_preferences` as D4 specifies with RLS forced, the three standard policies, `select, insert, update` for `app_runtime`, `select` for `support_runtime`, no delete grant, and the size and key checks; pgTAP asserts each and proves a session bound to one location cannot read or write another location's rows. | 3 |
| 006C-AC-004 | `POST /api/setup/progress` and `POST /api/setup/profile` require a valid session and the full mutation gate including CSRF, validate with `.strict()` schemas, write inside `withTenantTransaction`, and reject a body carrying `locationId` or `userId` with `400`; route-level Postgres tests cover the accept and refuse paths. | 3 |
| 006C-AC-005 | After sign-up, the first render of `/overview` opens the welcome step without any click; the layout reads progress server-side and the sheet is present in the server-rendered HTML (no client-only flash); proven in the timed browser run and by an integration test of the layout. | 3 |
| 006C-AC-006 | Each of the seven steps renders the D3 copy, anchors to the D2 element, and performs its action; steps 2 and 3 write `setup_profile.v1`; step 4 prefills the draft from the profile and shows no demo default; step 5 explains the result, each finding, or, when the campaign's check result cannot be read, that it does not know and points at the campaign page (amended 2026-09-20, see Amendments); step 6 branches on `canApprove`; step 7 marks `completed`; integration tests cover every step in both branches. | 3 |
| 006C-AC-007 | Progress is written after every completed step; closing the context and signing in again resumes at `currentStep` with the profile intact; proven in the review browser run with a new context. | 3 |
| 006C-AC-008 | "Not now" and Escape set `dismissed` without losing typed text; the "Finish setup" chip appears in the shell, reopens at `currentStep`, and is absent seven days after `dismissedAt` (clock control); proven in the browser run and an integration test. | 3 |
| 006C-AC-009 | "Show me around again" in the help menu restarts at step 1, keeps the profile, and increments `restartedCount`; a `completed` setup never auto-starts; both proven. | 3 |
| 006C-AC-010 | Keyboard and screen-reader behaviour per D6: `role="dialog"`, `aria-modal="false"`, labelled and described, focus to the new step's title when a "Continue" opens the next step and back to the anchored element only when a "Continue" keeps the current step open (amended 2026-09-20, see Amendments), Escape dismisses, Tab order as specified, a `role="status"` announcement per step; an integration test asserts each and the browser run asserts the focus movements. | 3 |
| 006C-AC-011 | Under `prefers-reduced-motion: reduce` the panel, the highlight, and the sheet have zero animations and zero non-zero transitions on every step (the assertion at `ui-foundation-ux.spec.ts:219-230` applied to each step); every control in the panel is at least 44 by 44 pixels. | 3, 4 |
| 006C-AC-012 | Every step passes axe with zero violations in Light and Dark at 390x844 and 1180x900, and the highlight never reduces the contrast of the highlighted element's text below the brief's requirement. | 3, 4 |
| 006C-AC-013 | Below 768 px the panel is a bottom sheet capped at 40 percent of the viewport, the anchored field is scrolled into view above it, the sheet never covers the focused field, and while a step is open the page gains room at its end equal to the block size the panel occupies at that frame, at every frame, so a control anchored at the end of a long page can always be scrolled clear of the panel, with the sticky header's end as the scroll floor (landed by Wave 7r at `b1b2b4e`, see Amendments); at 768 the panel anchors beside the element; proven by the 390 and 768 browser specs and by the accessibility walk's rectangle and hit-test clearance assertion at every step that points at the page. | 3, 4 |
| 006C-AC-014 | The `review` Playwright project and the `pnpm test:db` step in D9 exist, composing the review server with `OALO_ENVIRONMENT=local` and `OALO_REVIEW_SURFACE=authorized` rather than the environment name `preview` (amended 2026-09-19, see Amendments); the TLS terminator is `node:https` and `node:http` only; the run passes in the `database` CI job; the synthetic-mode `pnpm test:browser` in the `verify` job is unchanged. | 3 |
| 006C-AC-015 | The timed spec measures the whole journey from the sign-up page's first paint to "Done" under the D9 typing model and asserts the total is under 300 seconds and every step is within its D3 budget; the measured numbers are written to `docs/operations/evidence-packs/guided-setup-timing.md` under the regenerate flag, and the pull request records the run's total. | 3 |
| 006C-AC-016 | The seeded-creator spec reaches the hand-off branch with a working copy-link control, and the seeded-approver spec then approves that campaign through step 6; both pass. | 3 |
| 006C-AC-017 | No step, route, or component reads or writes `localStorage`, `sessionStorage`, or IndexedDB (source scan of the feature), and no request leaves the local origin during the run. | Constraint |
| 006C-AC-018 | The final step states in PRD-006b language that HighLevel, Meta, and Stripe are not connected and nothing will run as an ad; no step offers a connect, publish, or spend action; `tests/security/provider-side-effect-default-off.test.ts` passes unchanged; none of the 28 deferred rows and none of G1, G4, or G8 changes. | Constraint |
| 006C-AC-019 | Every string in the feature passes PRD-006b's source guard, and `technical-writing-craft-guardian` reviews the step copy with no blocking finding. | 2, 3 |
| 006C-AC-020 | `ux-ui-guardian` scores every step against PRD-006d's rubric at the top score on every axis, and the orchestrator's sign-off in PRD-006d includes the guided-setup screens. | 4 |
| 006C-AC-021 | `docs/operations/retention-and-deletion.md` and `docs/operations/export.md` name `platform.user_preferences` and the `setup_profile.v1` fields as user data. | Constraint |
| 006C-AC-022 | `pnpm verify:offline` and `pnpm test:db` are green; `security-guardian` reviews the two routes, the table's policies, and the profile schema before `quality-guardian` runs. | Constraint |

## Files expected to change

- `supabase/migrations/<timestamp>_user_preferences.sql` (new) and `supabase/tests/user_preferences.pgtap.sql` (new); `supabase/tests/phase0_scaffold.pgtap.sql` table count.
- `apps/web/src/features/guided-setup/{anchor-registry.ts,guided-setup-provider.tsx,guided-setup-step.tsx,guided-setup-progress.tsx,steps/*.tsx,model/progress.ts,model/profile.ts}` (new) and tests beside them.
- `apps/web/src/server/setup-preferences.ts` (new): reads and writes through `withTenantTransaction`; `apps/web/src/app/api/setup/{progress,profile}/route.ts` (new); route-level tests in the `web-postgres` project.
- `apps/web/src/app/(authenticated)/layout.tsx`: read progress and profile, mount the provider, the "Finish setup" chip, and the help menu.
- `apps/web/src/features/shell/components/app-shell.tsx`: help menu and chip slots.
- `apps/web/src/features/campaigns/components/open-house-draft-builder.tsx:101-212`: profile-derived prefill, empty-with-placeholder defaults, registry anchors.
- `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx` and `campaign-approval-controls.tsx`: registry anchors, the hand-off copy-link control.
- `apps/web/src/features/onboarding/components/onboarding-screen.tsx:64,71,124`: anchors from the registry.
- `apps/web/src/app/(authenticated)/marketing/campaigns/new/page.tsx`: pass the profile to the builder.
- `playwright.config.ts`: the `review` project; `tests/browser/review/*.spec.ts` (new); `tooling/scripts/browser/https-proxy.mjs` (new); `tooling/scripts/database/run-real-database-tests.mjs`: the new step; `.github/workflows/ci.yml:67`: timeout.
- `docs/operations/evidence-packs/guided-setup-timing.md` (new), `docs/operations/retention-and-deletion.md`, `docs/operations/export.md`.

## Test plan

- **pgTAP** (`pnpm test:db`): 006C-AC-003.
- **Unit** (`pnpm test:unit`): progress and profile state machines (transitions, the seven-day chip window with a fixed clock, restart counting), the registry scan, the prefill mapping, the `.strict()` schemas.
- **Integration** (`pnpm test:integration`): each step component in both branches, the provider's auto-start decision from server-provided progress, keyboard and ARIA behaviour (006C-AC-010), the layout with the chip and help menu.
- **Route-level** (`pnpm test:db`, `web-postgres`): 006C-AC-004.
- **Browser, synthetic mode** (`pnpm test:browser`): the anchors exist on the synthetic screens, the reduced-motion and target-size assertions on the guided-setup components rendered in a synthetic-mode harness route.
- **Browser, review mode** (`pnpm test:db`, `review` project): the five specs in D9, including the timed run (006C-AC-015), the two seeded-user runs (006C-AC-016), dismiss, resume, restart, completion (006C-AC-007 through 009), axe and reduced motion on every step (006C-AC-011, 012), and the 768 frame (006C-AC-013).
- **Design review**: PRD-006d's scored review and sign-off cover every step.

## Security notes

- Progress and profile writes require a session and the full mutation gate including CSRF, run under `app_runtime` inside a tenant transaction, and can only touch the session's own location. The browser never supplies a location or user id.
- The profile holds the user's name, an optional phone number, an optional NMLS number, and a Realtor partner's name and brokerage. These are the user's own data, bounded in length, validated strictly, never logged, and named in the retention, deletion, and export runbooks.
- The copy-link control copies a URL to a campaign in the user's own workspace; the link is useless without a session for that workspace.
- The TLS terminator and the self-signed certificate exist only inside the test gate, on the loopback interface, for the duration of the run. The certificate is never committed.
- Nothing in the walkthrough offers a provider action; the final step says the truth in user language.

## Open questions

- [ ] Whether the `database` CI job's 20-minute timeout is enough once the review browser run is added; measure and raise as needed.
- [ ] Whether the seven-day chip window should be configurable or fixed. Recommendation: fixed.
- [ ] Whether step 2 should ask for the NMLS number at all in this release, since nothing renders it yet. Recommendation: ask, mark optional, because the FAQ already promises partner and brand details are captured during setup for later.
- [ ] Whether the starter text for headline, body, and disclosure should come from a template registry rather than constants, so a compliance owner can change it later. Recommendation: constants now, one file, easy to move.

## Exact operator ask

None for the code. The deployed walkthrough is exercised during PRD-005e's seven-point proof with the operator present; the timed run happens in CI against the disposable database.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| PRD-006a's sign-up, sign-in, and seeded credentials | Engineering | Land PRD-006a first |
| PRD-006d's `Sheet`, `Stepper`, `TextField`, and `Link` primitives | Engineering | Land PRD-006d's primitives slice before the step components |
| Docker for the review browser run locally | Engineering | The `database` CI job has it; local runs need Docker Desktop running |

## Related

- [PRD-006a: email and password sign-in](./prd-006a-first-party-sign-in-and-guided-experience-email-password-auth.md) (step 0 and the seeded users)
- [PRD-006b: user language](./prd-006b-first-party-sign-in-and-guided-experience-user-language.md) (every step's copy)
- [PRD-006d: design quality bar](./prd-006d-first-party-sign-in-and-guided-experience-design-quality-bar.md) (the primitives and the review of every step)
- [PRD-003c: human approval](../../in-work/prd-003-authenticated-product-activation/prd-003c-authenticated-product-activation-human-approval.md) (what step 6 exercises)
- [PRD-005e: deployed qualification](../../in-work/prd-005-authenticated-review-runtime/prd-005e-authenticated-review-runtime-deployed-qualification.md) (the deployed proof this walkthrough rides on)
- [Design brief](../../../knowledge/private/ux-ui/00-design-brief.md) (frames, motion, focus, targets)

## Amendments

- **2026-09-19, D9 and 006C-AC-014, the review server's environment name.** Text said: D9's step 2 starts the review server with `OALO_ENVIRONMENT=preview`, matching the preview contract `tests/security/provider-side-effect-default-off.test.ts` builds. Code does: `tooling/scripts/database/review-browser-run.mjs` composes the run with `OALO_ENVIRONMENT=local` and `OALO_REVIEW_SURFACE=authorized`. Why: the database pool refuses a TLS-disabled connection on any deployment environment other than `local` or `test`, and the disposable Supabase stack this run drives speaks plain TCP, so an `OALO_ENVIRONMENT=preview` composition here would mean either no database connection or a weakened TLS rule, neither acceptable. Review mode itself is selected by `OALO_REVIEW_SURFACE`, not by the environment name, so the composition this run exercises is the same one a preview deployment builds, minus a TLS requirement the local stack cannot satisfy; weakening the rule to keep the label was the wrong trade. Decision recorded by the implementing lane at commit `4109996`, consistent with the same divergence `apps/web/src/server/campaign-route-postgres-support.ts` already carries. Touches: 006C-AC-014.
- **2026-09-20, D3 step 5 and 006C-AC-006, the third answer.** Text said: the step "explains 'Ready for approval' or 'Needs changes'". Code does: `apps/web/src/copy/guided-setup-messages.ts` (`GUIDED_SETUP_STEPS.readTheResult.unknownBody`) gives the step a third sentence, "We couldn't read the result for this campaign just now. Open the campaign to see where it stands.", chosen through `resultBody(campaign)` in `apps/web/src/features/guided-setup/guided-setup-provider.tsx` when the server's campaign read answers `undefined`. Why: a person who signs in again the next day resumes on step 5 with no result in this browser's memory, which is every resume; the two-answer version fell through to the ready sentence and told that person a campaign the checks had blocked was ready for approval, on the page that said the opposite underneath it. The honest third answer says it does not know and points at the campaign's own page. Decision recorded by the implementing lane at commit `ce67527`. Touches: 006C-AC-006.
- **2026-09-20, D4, the server-side read gains two campaign facts.** Text said: "the authenticated layout reads both keys server-side and passes them to the provider," naming only progress and profile. Code does: `readSetupPreferences` in `apps/web/src/server/setup-preferences.ts` also answers the stored campaign's own check result (`readCampaignResult`: ready, plus each finding's description and remediation, never a rule code) and, for an approver with no campaign of their own, the newest campaign in their workspace awaiting a decision (`readCampaignAwaitingDecision`), both read through the campaign repository under the tenant context the layout already holds; a campaign that cannot be read answers `undefined` rather than raising. Why: step 5's third answer (above) and step 6's approver hand-off (below) both need a campaign fact the provider cannot get from the browser session, so the layout's own server-side read is the one place both can trust. Decision recorded by the implementing lane at commit `ce67527`. Touches: 006C-AC-006, 006C-AC-016.
- **2026-09-20, D5, the mechanism behind the approver's journey.** Text said: "the approver's journey at step 6 approves the creator's campaign if one exists, otherwise their own." Code does: a person who can approve and has no campaign of their own is handed the newest campaign in their workspace awaiting a decision, chosen by the same `canApprove` rule the approval control itself is drawn by (`readCampaignAwaitingDecision`); their step 3 hands them to step 5 rather than step 4, because step 4 asks for a campaign their colleague has already made, and step 4 is marked complete on their behalf; steps 5 and 6 then read their existing sentences against the colleague's campaign, and step 6 points at the approve control the campaign's own page renders, going through the same approve route with its evidence (version, manifest, check result, row version). Why: the provider previously resolved steps 5 and 6 only from the signed-in person's own progress, so a seeded approver with no campaign of their own put the walkthrough aside and approved beside it rather than through it. Decision recorded by the implementing lane at commit `ce67527`. Touches: 006C-AC-016.
- **2026-09-20, D6, which focus movement wins on a shared Continue.** Text said: "Focus moves to the step title when a step opens and returns to the highlighted element when the user presses 'Next' or 'Continue'," without saying which wins when one Continue does both. Code does: a Continue that opens the next step is treated as a step opening, so focus goes to the new step's heading; only a Continue that keeps the same step open returns focus to the highlighted element, which today is step 4's walk along the create screen's fields (`continueStaysOnThisStep` in `apps/web/src/features/guided-setup/guided-setup-step.tsx`, set for step 4 in `guided-setup-provider.tsx`). Why: a focus-return test found the two movements meeting in the wrong order: a Continue that opened the next step was handing focus to a link in the page behind the panel while a screen reader was being told about the step that had just appeared. Decision recorded by the implementing lane at commit `ce67527`. Touches: 006C-AC-010.
- **2026-09-20, D7 and 006C-AC-013, clearance for the docked sheet on a long page.** Text said: "the sheet's own height is capped at 40 percent of the viewport" and "the panel never obscures the focused element," with no statement about a control anchored at the very end of a long page. Gap measured by Wave 7p: at 390 the panel sits on the last control of a long page, because a page already scrolled to its end cannot lift that control above a sheet pinned to the bottom edge; scrolling alone cannot do it. Rule landed: while a step is open the document gains room at its end equal to the block size the panel occupies at that frame plus the gap and the viewport margin (`panelEndRoom` in `apps/web/src/features/guided-setup/model/panel-placement.ts`, published by the step as `--guided-setup-panel-room` on the document element and taken by the shell's main landmark as end padding), at every frame rather than only below 768, because the browser refused the narrower version: at 1180 the campaign page's approve control sat about 330 px short of the ceiling with no scroll left. The anchored element's scroll floor is the shell's sticky header's end rather than the 16 px viewport margin (`Viewport.blockStart`, measured from `[data-shell-sticky-header]`), because once the page could scroll further the topbar covered the overview's quick actions. The accessibility walk asserts rectangle clearance and an `elementFromPoint` hit at every step that points at the page, in every cell, and saves with the pointer. Cost stated: while a step is open every authenticated page carries the panel's block size as extra end padding at the wide frames too, so the room is knowable on the first render the scroll runs on. Decision recorded by the implementing lane at commit `b1b2b4e`. Touches: 006C-AC-013.
- **2026-09-20, D4 and D6, the write-failure retry (PRD-006c half of 006D-AC-011).** Text was silent on what happens when a progress or profile write fails. Code does: the step stays where it is, the value that was stored before the write is restored, PRD-006b D7's generic failure sentence is announced through the panel's own status region, and the same "Continue" is the retry; no line moves the user to the next step on a failed write. Why: a failed write previously moved the step anyway and only logged to the console, so a person whose details had not saved was shown the next step and told nothing. Decision recorded by the implementing lane at commit `ce67527`. Cross-referenced at PRD-006d 006D-AC-011. Touches: 006D-AC-011 (the guided-setup half).
- [Application shell and navigation spec](../../../knowledge/private/ux-ui/03-components/application-shell-and-navigation.md) (dialog and drawer rules)
- [Campaign lifecycle spec](../../../knowledge/private/ux-ui/04-screens/campaign-lifecycle.md) (the create screen must not ask for canonical data twice)
- [Onboarding checklist spec](../../../knowledge/private/ux-ui/03-components/onboarding-checklist.md) (what the walkthrough does not replace)
