# Design quality sign-off

PRD-006d D9 and acceptance criterion 006D-AC-015, re-signed for PRD-008d 008D-AC-010 and
008D-AC-011. **Status: SIGNED.** `ux-ui-guardian` prepared the skeleton; the orchestrator filled it
in from real screenshots of the running application and signed it on 2026-09-21. On 2026-10-01
`ux-ui-guardian` re-signed every row against the PRD-008d tree, from the baselines the
`ubuntu-24.04` runner drew for it, and re-signed it again the same day after the D-009 and D-010
fix moved 343 of the 376 pictures (see "How this was filled").

- Commit reviewed: `cad9bf6`, the commit that installs the baselines drawn by screen-baselines run
  36844271868 from `eaf34e6` (the commit after it changes only this file, the review report, and
  the rubric's D-009 and D-010 rows and section 6)
  - Re-checked at the ship head of PR #74, as 008D-AC-010 and 008D-AC-011 ask: no file under
    `tests/visual/` and no baselined screen changed after `cad9bf6`, through that head.
    `git diff --stat cad9bf6 HEAD -- tests/visual`, run on the ship head, is empty, and the
    close-out quality report's 008D-AC-011 section accounts for every later rendered-code change.
    The re-check is recorded in PR #74: UNVERIFIED here, because the pull request body is outside
    this checkout.
- Date: 2026-10-01 (first signed 2026-09-21 against `74999a8`; re-signed against `d7af15a` earlier
  on 2026-10-01)
- Signed by: `ux-ui-guardian`, Gauntlet lane L6c (Claude Code), for the orchestrator

The screenshots themselves are retained outside git. They are large, some come from the deployed
review URL, and none of them is needed to read the result: the table below is the result. Every
screenshot contains only synthetic data or the seeded review people, never a real address, a real
name, a form with a value somebody typed, a cookie store, or developer tools.

## How to fill this in

1. **Synthetic screens.** Build and start the application yourself:
   `pnpm --filter @oalo/web... build && pnpm --filter @oalo/web exec next start --hostname 127.0.0.1 --port 3100`.
   Every row marked `synthetic` below is reachable at `http://127.0.0.1:3100`.
2. **Account screens and the guided setup.** They are 404 in synthetic mode. Start the review
   composition the way `pnpm test:db` does (`tooling/scripts/database/review-browser-run.mjs`), and
   use the TLS terminator at `https://127.0.0.1:3443` with the seeded creator and approver the gate
   writes; or use the deployed review URL with the operator present.
3. **Theme.** Set the theme from the workspace header's Light and Dark control. On a public account
   screen there is no control, so set `oalo:theme-preference` to `light` or `dark` in local storage
   and reload.
4. **Frames.** 1440x900, 1180x900, 768x1024, 390x844.
5. **Score.** Each cell is `pass` or a finding reference from
   `library/requirements/in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-prd-006d-design-review.md`.
   A fail on any axis returns the batch to implementation and this table is filled in again on the
   next tree.

The ten axes are the rubric's, in `library/knowledge/private/ux-ui/06-review-rubric.md` section 2:
1 hierarchy, 2 spacing rhythm, 3 typography, 4 colour and contrast, 5 states, 6 motion,
7 responsiveness, 8 dark and light, 9 empty and error states, 10 consistency with the canvases.

## The table

Each row is one screen in one named state. Fill in the eight frame-and-theme cells with `pass`, or
with a finding reference. A row is signed only when all eight are `pass` on all ten axes.

| Screen | State | Server | 1440 L | 1440 D | 1180 L | 1180 D | 768 L | 768 D | 390 L | 390 D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sign in | default | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Sign in | signed out | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Sign in | refused | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Choose workspace | default | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Sign up | default | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Sign up | address already has an account | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Forgot password | default | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Forgot password | confirmation | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Reset password | default | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Reset password | link expired | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Verify email | default | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Verify email | confirmed | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Verify email | link expired | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Change password | default | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Change password | saved | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Shell | rail | synthetic | pass | pass | pass | pass | n/a (tablet rail row) | n/a (tablet rail row) | n/a (drawer row) | n/a (drawer row) |
| Shell | collapsed rail | review | pass | pass | pass | pass | pass | pass | n/a (no rail at 390) | n/a (no rail at 390) |
| Shell | tablet rail | synthetic | n/a (rail row) | n/a (rail row) | n/a (rail row) | n/a (rail row) | pass | pass | n/a (drawer row) | n/a (drawer row) |
| Shell | topbar | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Shell | mobile drawer | review | n/a (drawer only at 390) | n/a (drawer only at 390) | n/a (drawer only at 390) | n/a (drawer only at 390) | n/a (drawer only at 390) | n/a (drawer only at 390) | pass | pass |
| Shell | not-connected banner | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Shell | "Finish setup" chip | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Shell | help menu | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Overview | default | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Campaigns list | empty | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Campaigns list | populated | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Create | empty | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Create | prefilled | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Create | saving | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Create | ready for approval | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Create | needs changes | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Campaign detail | ready | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Campaign detail | permission-restricted | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Campaign detail | approved | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Campaign detail | already decided | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Reports | not connected | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Onboarding | default | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Settings and connections | default | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Brand | default | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 1 | welcome | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 2 | your details | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 3 | your Realtor partner | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 4 | create the campaign, first field | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 4 | create the campaign, last field | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 5 | read the result, ready | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 5 | read the result, needs changes | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 6 | approve | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 6 | hand off | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Guided setup step 7 | what happens next | review | pass | pass | pass | pass | pass | pass | pass | pass |
| Unverified email notice | unverified, with resend | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Route error boundary | failed to load | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Route loading boundary | loading | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Email preview | reset password, 600px | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |
| Email preview | confirm email, 600px | synthetic | pass | pass | pass | pass | pass | pass | pass | pass |

The two email rows are scored on axes 1, 3, 4, and 10 only, per the rubric's section 4: an email
has no states, no motion, and no responsive frames of its own. The frame columns record the frame
the surrounding preview page was at.

The three rows above them, the two route boundaries and the unverified-email notice, share one
picture each frame and theme: `design-surfaces--default--<frame>--<theme>.png`. They are three
screens in the rubric and one page in the product, because none of the three can be navigated to
and each is scored on its own axes. PRD-006d's reopened-row review, F-28, says why the page exists.

## Where each row's picture comes from

The two screenshot suites capture one picture per row, frame, and theme, named
`<screen>--<state>--<frame>--<theme>.png` with the state as this table's state word in lower case
with hyphens. `tests/visual/screens/README.md` says how to take a set without touching a baseline.
A row whose picture the suites take is a row the orchestrator can check against
`tests/visual/screens/` rather than re-stage by hand. Since 2026-10-01 every row in the table has
its picture there.

The campaigns list's two rows come from two fixture workspaces rather than from whatever the
synthetic store held when the suite reached the screen: `campaigns--empty` from
`tests/browser/helpers/empty-campaign-workspace.ts` (no campaigns) and `campaigns--populated` from
`tests/browser/helpers/populated-campaign-workspace.ts` (two campaigns saved through the create
screen, one ready for approval and one that needs changes). There is no `campaigns--default`. Until
2026-10-01 the matrix took one, and on the runner, whose workspace is empty when the matrix runs, it
was always the empty list, so the populated row had been signed from a workstation capture that no
committed picture matched.

Two pictures carry a painted-over region. On campaign detail's approved and already-decided rows
the moment the decision was recorded is blanked, because it is a fact about the run rather than
about the design and a baseline that changed with the clock would fail every time. PRD-008b's
"Who decided" card put that moment on the approved row too. They are the only such regions in
either suite, and the loud colour is Playwright's own, chosen so nobody reads it as a surface.

### Rows whose server column changed

Four states are not states a synthetic deployment has, so the suites take them from the review
server and the `Server` column says so.

| Row | Why it is a review row |
| --- | --- |
| Campaign detail, ready / approved / already decided | Synthetic mode's principal holds `campaign_creator` (`apps/web/src/server/authenticated-principal.ts:210-224`), and `campaignMayBeApprovedBy` (`packages/application/src/campaign-workspace-read.ts:110-119`) needs an approval role. A synthetic deployment can therefore never render an approvable or an approved campaign. The seeded approver can. Campaign detail's permission-restricted state stays synthetic, because that is exactly what a creator sees. |
| Shell, collapsed rail and mobile drawer | Both are states of the signed-in shell that a person reaches with a control, and the review server is where a real session exists. |

### What the review run spends, per run

The review project shares one client address with the product's own rate limits, so how many
sign-ups it spends is part of its coverage. Since the named-state review's F-22:

| Spec | Sign-up submissions | Note |
| --- | --- | --- |
| `guided-setup.accessibility.spec.ts` | 1 | Was four, one per frame and theme. One account now walks all four cells, put back to step 1 from the help menu between them. |
| `guided-setup.tablet-anchoring.spec.ts` | 1 | Was three, one per frame. One account now walks all three. |
| `guided-setup.resume.spec.ts` | 2 | Unchanged. The two cases are two different account lifetimes: one dismissed and restarted, one completed. |
| `guided-setup.timed.spec.ts` | 1 | Unchanged. The run measures account creation, so it has to create one. |
| `guided-setup.walkthrough-captures.spec.ts` | 1 | Step 6's approve branch needs a workspace owner, and a self-serve account is the only owner this composition can make. The hand-off branch spends none: the seeded creator gives it. |
| `design-quality.spec.ts`, the sign-up refusal | 2 | One submission per theme, each refused. Neither creates an account. |
| **Total** | **8 of 10** | Six accounts created and two refusals. The limit is ten an hour per client address (`apps/web/src/server/password-authentication-handler.ts:118`), counted before the body is parsed (the same file, line 771). The gate drops and recreates the disposable database on every run, so the budget is per run rather than per hour of wall clock. |

Measured on 2026-09-20 against the seeded review database: the review project is **82 passed, 0
failed, 12.8 minutes**, with the eight submissions above and none refused. On 2026-10-01 the
runner's `pnpm test:db` in screen-baselines run 36828316006 is **104 passed, 0 failed**, with the same
eight submissions: PRD-008d's verify-email confirmed state spends two confirmations against the
verify limit and no sign-up, steps 1 and 2 sign the seeded creator in, and step 5's refusal is
walked on the approver's path with no new sign-in. The second redraw's three runs, 36838168997,
36841695906, and 36844271868, each ran the review project at **104 passed, 0 failed** with the same
eight submissions.

### Frames a state does not have

Two of these rows are scored at fewer than four frames, because the product does not have the state
at the others. This is the brief's own frame rule, not a gap.

| Row | Frames | Why |
| --- | --- | --- |
| Shell, collapsed rail | 1440, 1180, 768 | The rail exists at three frames and the toggle reaches all three, which is what design brief section 14 and `03-components/application-shell-and-navigation.md:26` mean by a collapsible tablet rail. Until F-19 it was a 1440 state only, because the stylesheet hid the toggle from 1180 down and forced the rail compact there. At 390 there is no rail to collapse: it is replaced by the drawer, which is the row below. |
| Shell, mobile drawer | 390 only | The drawer trigger is `display: none` above 767.98px (`apps/web/src/features/shell/components/app-shell.module.css`, the mobile block), which PRD-006d D5 moved deliberately so the 768 frame keeps the rail. |

### Rows no automated suite could take, which the orchestrator used to stage by hand

None remains. The last two left on 2026-10-01 with PRD-008d: verify email's confirmed state is
taken by `tests/browser/review/design-quality.spec.ts` with a token minted for the seeded outsider
through the product's own credential port (`tests/browser/review/helpers/verification-token.ts`),
and step 5's needs-changes answer is taken at the end of the approver's journey in
`tests/browser/review/guided-setup.walkthrough-captures.spec.ts`, from a draft whose open house has
already finished. The table below is kept as the record of why each row was once staged by hand.

Three rows left this table on 2026-09-20. Campaign detail's ready and approved states were
blocked by a control that failed the target-size check, and F-18 moved that control onto the
`Button` primitive, so `tests/browser/review/review-campaign-decision.spec.ts` now takes both with
every check at full strength. Sign up's address-already-has-an-account state was blocked by
arithmetic, and F-22 made room for it, so `tests/browser/review/design-quality.spec.ts` takes it
once per theme.

**Three more left it later the same day**, by the PRD-006d reopened-row review's F-28: the route
error boundary, the route loading boundary, and the unverified-email notice. Each of the three
reasons below was true, and each was a reason about how a state arrives rather than about the state
itself, which is why they went unreviewed for a batch. `/design-surfaces` renders all three from
placeholder values inside the real shell, gated on `canRenderSyntheticDemo()` like the email
preview, so `tests/browser/design-quality.spec.ts` now takes them at all four frames in both themes
with axe, the keyboard walk, the motion check, and the target-size check, and
`tests/browser/review/design-quality.spec.ts` proves the address answers 404 on a connected-account
deployment.

The orchestrator still stages the unverified notice on a deployment with a sending domain if it
wants the shell's own live instance of it rather than the boundary page's, because only a real
`unverified` session produces one. What the boundary page removes is the case where nobody had
looked at the surface at all.

| Row | Why the suite could not reach it before 2026-09-20 |
| --- | --- |
| Verify email, confirmed | Confirming needs an `email_verification` token, and `scheduleVerificationEmail` issues one only when a sending domain is configured (`apps/web/src/server/password-authentication-handler.ts:812-816`). The review composition leaves `OALO_RESEND_API_KEY` and `OALO_EMAIL_FROM` absent on purpose (`tooling/scripts/database/review-browser-run.mjs:48-51`), so no token exists for a browser to spend. Stage it on a deployment with a sending domain. |
| Unverified email notice | `UnverifiedEmailNotice` renders it, and only for `unverified` (`apps/web/src/features/auth/components/unverified-email-notice.tsx:38`). 006A-AC-021 is explicit that a deployment with no sending domain shows no verification notice, and the review composition leaves the email variables absent on purpose (`tooling/scripts/database/review-browser-run.mjs:48-51`), so every session in the run carries `not_applicable` and there is no notice on the shell to photograph. Stage it on a deployment with a sending domain. |
| Guided setup step 5, needs changes | The walkthrough's own journey saves a campaign the checks pass, because that is the path the budget in PRD-006c D3 is written against. The needs-changes branch of step 5 needs a campaign the checks refuse, which the synthetic suite already photographs on the create screen (`create--needs-changes`) but which no journey in the review run produces. Stage it by giving the walkthrough an open house that has already finished, which is the product's own blocking finding. |
| Route error boundary | Nothing a browser can do makes a synthetic server component throw, and `(authenticated)/error.tsx` only renders when one does. |
| Route loading boundary | `loading.tsx` is a streaming fallback. The shell's navigation is plain `<a href>` (`apps/web/src/features/shell/components/app-shell.tsx:346-360`) and the only `useRouter().push` in the product is the guided setup's (`apps/web/src/features/guided-setup/guided-setup-provider.tsx:226`), so a synthetic navigation is always a document load and the fallback is never on screen long enough to photograph. |

## Out of scope, recorded rather than fixed

PRD-006d 006D-AC-018 and the rubric's section 5, entries D-004 and D-005.

| Surface | Recorded drift | Why it is out of scope |
| --- | --- | --- |
| `/demo` | A private nine-token palette, 76 hex values, a `backdrop-filter`, and no Dark block in `apps/web/src/components/demo/founding-offer-demo.module.css`. | PRD-006d Non-Goals. It never renders in review mode, review mode answers 404 for it, and no screen in either mode links to it. Both facts are asserted: `tests/browser/design-quality.spec.ts` for synthetic mode and `tests/browser/review/design-quality.spec.ts` for review mode. |
| The synthetic reporting gallery | Demonstration rows and filters that exist only to show the reporting surface. | PRD-006d Non-Goals. It renders only in synthetic mode. Its controls were nonetheless moved onto the governed primitives under 006D-AC-003, so it no longer drifts on the field specification. |
| `<select>` on the reporting screens | Two native selects remain, wrapped in `FormField`. | PRD-006d D4 defers a `Select` primitive; nothing in PRD-006 needs one. Rubric section 5, entry D-004. |
| Checkbox and radio controls | Native controls inside an associated label on sign-in, the workspace choice, and the create screen. | PRD-006d D4 ships no primitive for either. They are allowed by name in `tooling/tests/unit/design-quality/governed-controls.test.ts`, not hidden. |

## How this was filled

### The second re-sign of 2026-10-01 (D-009 and D-010, 008D-AC-011)

Re-signed by `ux-ui-guardian`, Gauntlet lane L6c, after `design-system-guardian` ruled D-009 and
D-010 "fix now" in the rubric's section 5. The fix (`2687100`) puts the body step on `body` and each
heading level's step on its element, deletes the bootstrap `section { max-width: 44rem }` with the
four declarations that only undid it, and draws every timestamp in the data font, as brief section
10 asks. The redraw was dispatched three times under 008D-AC-011, each for fixes the review of the
run before it caused: run 36838168997 on `c3ab3ec`, run 36841695906 on `83095a1`, and run
36844271868 on `eaf34e6`, **whose pictures are installed**. The scored review, with every picture
that changed, its cause, and its verdict, is the second half of
`library/requirements/completed/prd-008-finish-line-hardening/qa/2026-10-01-008d-baseline-review.md`,
"Second redraw: D-009 and D-010 (008D-AC-011)".

Against the baselines the first re-sign installed (`d7af15a`, unchanged at `814939f`), 343 of the
376 pictures changed (110 synthetic, 233 review), none is new, and none is removed. The 33 that
did not change are the email preview's eight, the boundary page's two at 390, reset password's
default and expired-link states (fifteen cells), and verify email's confirmed state (eight); each
keeps its pass from the first re-sign.

**What the machine asserted for every cell.** On the runner, run 36844271868: the synthetic suite
**141 passed, 0 failed** (26 dashboard-preview specs skipped by project) and the review project
**104 passed, 0 failed**, the latter on the run's second attempt after the first stopped in
`pnpm test:db` on an unrelated rate-limit test before any picture was drawn, with every check the
first re-sign lists. The fix added these, so they hold on every platform and not
only in a picture: wherever either suite takes a picture, `html` computes 16px, `body` the 13px body
step, every visible text and field value one of the six steps, and every visible date the data font
(`expectTypographyOnBrief`); every metric card keeps its state label and its value inside the card
at every frame in both themes; the overview fills its column as the campaigns list does; the
overview's action links keep their own height; the reports screen keeps each group of actions
together and its campaign cards at `--space-4`; a finding's note stands `--space-3` clear of what
follows it; the rail's titles are larger than its links and its product name balances its lines;
the change-password form keeps the account measure at the column's start. On `pnpm test:unit`,
`global-element-defaults.unit.test.ts` holds the stylesheet's element defaults and the guard
against an element-selector width, and `type-tokens-defined.unit.test.ts` fails any type token the
token layer does not define.

**Findings of the second redraw, and what happened to them.** Each is in the review report in the
rubric's finding form with its file and line, and each was fixed with a test before the pictures
were installed.

- R-14, fixed (`c3ab3ec`). The overview's "See your leads" was stretched to a button some 200px tall
  beside an unavailable action (axes 1 and 2).
- R-15, fixed (`c3ab3ec`). Reports pushed each pair of actions to opposite edges of its card once
  its sections took the column (axes 1 and 10).
- R-16, fixed (`c3ab3ec`). A reports campaign card's metric cards touched the lines above and below
  them (axis 2).
- R-17, fixed (`c3ab3ec`). The create screen's legends named a weight token only the dashboard
  preview defines and were drawn lighter than their own labels (axes 1 and 3).
- R-18, fixed (`c3ab3ec`). A finding's note touched the support details under it (axis 2).
- R-19, fixed (`83095a1`). The rail's two titles were drawn at the size of its links (axes 1
  and 10).
- R-20, fixed (`83095a1`). The change-password form shrank with its title to some 296px and floated
  mid-column (axes 2 and 10).
- R-21, fixed (`eaf34e6`). The runner's face left "LO" alone on the rail title's second line
  (axis 3).

**D-009 and D-010 are closed**, by the conditions the rubric's section 5 set: the fix and its redraw
are in, every gate passes, and every redrawn picture scores 3 on the axes each names (D-009 axes 1
and 3; D-010 axes 2, 7, and 10 at 1440 and 1180). They are no longer this sign-off's open debts.

### The re-sign of 2026-10-01 (PRD-008d)

Re-signed by `ux-ui-guardian` from the baselines the `ubuntu-24.04` runner drew for the PRD-008d
tree. The redraw was dispatched once for the Wave 1 change set and the capture fixes (run
36823126319), and twice more under 008D-AC-011 for fixes its review caused (runs 36825957221 and
36828316006). The scored review, with every changed or new picture, its cause, and its verdict, is
`library/requirements/completed/prd-008-finish-line-hardening/qa/2026-10-01-008d-baseline-review.md`.

Every picture was compared with the committed baseline pixel by pixel; every changed picture was
read on a labelled contact sheet, and every one whose change was more than rasterisation was read
at full size, cropped to the change. The causes were the dependency group (React 19.3, Next 16.3.6,
Playwright 1.63), PRD-008b's decision-aware copy, PRD-008c's copy (no homeowner screen is a row of
this table, so none of its pictures exists to change), the email preview's sandbox, the new states
S-1, S-2, S-3, and A-1, and the fixes below.

**What the machine asserted for every cell.** On the runner, run 36828316006: the synthetic suite
**137 passed, 0 failed** and the review project **104 passed, 0 failed**, each with axe, overflow, the
44 by 44 targets, the keyboard walk and ring, reduced motion, and the theme before paint, as the
first fill describes. PRD-008d added these, so they hold on every platform and not only in a
picture: the walkthrough's highlighted element is on screen, below the header, and clear of the
panel (step 1, every frame and theme); nothing in a panel shows below its footer (every captured
step); every notice title is the informational tone in both themes; every metric card keeps its
state label inside the card at every frame; the campaigns list opens at the top of the content and
at the column's edge, its empty state is the shared `empty` state, and a card title is smaller than
the page title.

**Findings of 2026-10-01, and what happened to them.** Each is in the review report in the rubric's
finding form with its file and line.

- R-1, fixed (`c2c51fe`). Step 5 at 1440: the result sat under the sticky header with only its
  ring's edge showing, and the panel beside it rose over the header's theme control and "Sign out"
  (axes 5 and 7). The beside-the-element case of `resolveAnchorScroll` now keeps the element
  between the header and the viewport's end, and the panel is placed against the same floor.
- R-2, fixed (`c2c51fe`). Step 5 at 768 and 1180: the panel covered the finding card the step was
  explaining (axis 7). The step points at the whole check result, the verdict and what the checks
  found, so both are scrolled above the panel.
- R-3, fixed (`c2c51fe`). Every guided-setup panel taller than its cap showed a band of its next
  progress row below Continue: the sticky footer stopped the sheet's end padding short of the
  panel's edge (axes 2 and 10). The padding is the footer's own now.
- R-4, fixed (`d788f35`). The new pictures of step 1 were taken from the top of the page with the
  walkthrough's own scroll undone, so at 1180, 768, and 390 the panel pointed at quick actions below
  the fold. The cell now photographs what the product shows after its scroll from the top of the
  overview.
- R-5, fixed (`d788f35`, `2cadc3e`). The populated row had no populated picture (above).
- R-6, fixed (`0392b64`). The "nothing goes out" notice title on create, campaign detail, reports,
  and brand took its colour from whichever of two equally specific rules the bundle loaded last,
  and the dependency group's Next.js swapped which, so it was blue on some screens and dark on
  others (axes 4 and 10). It is pinned to the informational tone the onboarding notice already
  pins.
- R-7, fixed (`0392b64`). The bootstrap `main` rule centred a short page in the frame, so the
  campaigns list, change password, and the boundary page floated about 200px below where every
  sibling page starts (axis 2).
- R-8, fixed (`0392b64`). The campaigns list's empty state was a card built on the page rather than
  the shared `empty` state (axis 9).
- R-9, fixed (`0392b64`). The campaigns list's card titles were drawn at the browser's own heading
  size, larger than the page title, with default margins (axes 1, 2, and 3).
- R-10, fixed (`0392b64`, `02ea08a`). A metric card's state label ran past the card's edge on
  the overview at 1440 and 1180 (axis 7).
- R-11, fixed (`2be0385`). Right after a decision the approval card lost its title, while the same
  campaign loaded later shows it (axes 1 and 10).
- R-12, fixed (`a414eae`). Pictures carried incidental hovers wherever the last click left the
  pointer, which differed between runs (the theme control at 1180 on most walkthrough pictures and
  on the help menu, a button on sign-up and reset password). The pointer is parked before a
  picture.
- R-13, fixed (`02ea08a`). The campaigns list's width followed its contents, so its title moved
  about 300px between the empty and the populated state (axes 2 and 10).

**Recorded, not fixed, with an owner.** Two deltas hold on rows other than the ones that changed,
were on the tree the first fill signed, and are system-level by the folder's own rule (they move
every screen), so they are handed to `design-system-guardian` with the evidence in the review
report rather than rebuilt from inside one lane. They are proposed for the rubric's section 5 as
D-009 and D-010, to be recorded there by their owner; until then they are this sign-off's open
debts, not passes by agreement.

- D-009 (proposed). Page paragraphs that no module sizes render at the browser's 16px default, not
  brief section 10's 13px body step (measured from the pictures by cap height: for example the
  campaigns list's lead sentence and its cards, campaign detail's cards, and the overview's lead).
  Axis 3, every in-shell row and the account screens.
- D-010 (proposed). The bootstrap `section { max-width: 44rem }` rule caps every section in the
  shell, so the overview's metric grids squeeze four cards into 704px at 1440 and 1180; the word
  value "Unavailable" in the synthetic overview's "More numbers" runs into its card's end padding.
  Axis 7, the overview row and every shell row whose picture is of the overview.

Both were ruled "fix now" by `design-system-guardian` the same day, and both are fixed and closed by
the second re-sign above.

### The first fill, 2026-09-21

Filled and signed by the orchestrator on 2026-09-21 from a capture of `74999a8` written outside git
(`OALO_SCREEN_SNAPSHOT_DIR`, `OALO_UPDATE_SCREEN_BASELINES=all`, both suites, 112 synthetic and
232 review pictures, capture `signoff-74999a8`), read as 43 labelled contact sheets (eight
pictures each, every picture on exactly one sheet) plus full-size reads of the pictures a sheet
put in question. Every named state in the table maps to the picture group named in the capture
by `<screen>--<state>--<frame>--<theme>.png`; a row whose picture group carries another row's
screen (the shell rows, the create page prefilled by the walkthrough, the three design surfaces,
the two emails) is judged on that picture.

**What the machine asserted for every cell before a person looked.** The browser suite on the
same tree (`scratchpad capture-74999a8.log, synthetic suite`, 139 cases) and the review project of the database gate
(`scratchpad capture-74999a8.log, review project`, 90 cases) run, per screen, frame and theme: axe with zero violations, no
horizontal overflow, every control at least 44 by 44 (axis 5 and 7), the keyboard walk with the
ring measured on the control (2 px, 3 px offset, `--focus-color` from the element's own cascade,
axis 5), reduced motion honoured (axis 6), the theme resolved before the picture (axis 8), and
the named error and empty states rendered through the primitives (axis 9). Axis 4 is pinned by
the token contrast test (82 pairs, every ring against every surface). The sheets were read for
what those assertions cannot see: hierarchy, spacing rhythm, typography, dark and light parity,
responsiveness of the composition, and consistency with the canvases (axes 1, 2, 3, 7, 8, 10).

**Findings, and what happened to them.**

- F-1, fixed. The navigation rail's state chip overlapped or squeezed the label whenever the chip
  was long: "Automation" ran under "Not included in your plan" and "Email and SMS" broke into
  three lines, at 1440, 1180 and 768 in both themes, on every screen with the rail (axis 2 and
  7). Cause: the row's third grid column never shrank. Fixed at `d717c86`
  (`apps/web/src/features/shell/components/app-shell.module.css`): the chip and the detail sit
  on their own rows under the label. The capture this table is filled from is of the fixed tree.
- F-2, fixed. The disclosure banner's trailing status ("Not connected yet") broke into three
  lines at 768 in both themes (axis 2). Fixed in the same commit: the sentence wraps, the status
  keeps its line.
- Not a finding: the solid magenta bar under "Who signed off" on the already-decided campaign
  page is Playwright's screenshot mask over the decision timestamp
  (`tests/browser/review/review-campaign-decision.spec.ts`, `mask:`), so the picture is stable
  between runs. The live page shows the timestamp.

- Recorded after signing, not a finding. The sixteen review pictures of steps 3 and 7 were
  redrawn on the runner (screen-baselines run 35631562012, installed at `b9a0f97`) after the
  capture's canonical start changed for a step that points at nothing on the page: the picture
  now starts from the top of the page instead of wherever the previous step and the browser's
  clamp against the changing room below the content left the scroll, which differed between
  runs. The panel, its content and its placement are what the signed sheets show; only the
  page behind it moved. The redrawn pictures were read at full size, not on a new contact sheet.

**Cells that are not a plain `pass`.**

Since 2026-10-01 there are no "asserted" and no "not photographed" cells. Until then:

- `pass, asserted (A-1)`: guided-setup steps 1 and 2 at 1180 and 390 were asserted by
  `tests/browser/review/guided-setup.accessibility.spec.ts` but not photographed. The cell
  procedure in `tests/browser/review/design-quality.spec.ts`, renamed on 2026-10-01 from "the
  guided setup meets the bar at 1440 and 768, in both themes" to "the guided setup's steps 1 and 2
  meet the bar at every frame, in both themes", now photographs all four frames.
- `not photographed (S-1, S-2, S-3)`: verify email's confirmed state, the campaigns list's empty
  state, and step 5's needs-changes answer. Each is photographed since 2026-10-01 (see "Where each
  row's picture comes from" and the by-hand table above).

- `n/a`: a shell part that does not render at that frame (the rail below 1180, the tablet rail
  outside 768, the drawer outside 390).

Signed: every cell of every row is photographed and passes on all ten axes on the tree named
above. D-009 and D-010 are fixed and closed, as "The second re-sign of 2026-10-01" describes, and no
open debt is carried.
