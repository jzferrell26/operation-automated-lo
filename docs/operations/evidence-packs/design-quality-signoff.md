# Design quality sign-off

PRD-006d D9 and acceptance criterion 006D-AC-015. **Status: OPEN.** This is the skeleton
`ux-ui-guardian` prepared; the orchestrator fills it in from real screenshots of the running
application and signs it.

- Commit reviewed: _fill in the SHA of the final tree_
- Date: _fill in_
- Signed by: _the orchestrator_

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
| Sign in | default | review | | | | | | | | |
| Sign in | signed out | review | | | | | | | | |
| Sign in | refused | review | | | | | | | | |
| Choose workspace | default | review | | | | | | | | |
| Sign up | default | review | | | | | | | | |
| Sign up | address already has an account | review | | | | | | | | |
| Forgot password | default | review | | | | | | | | |
| Forgot password | confirmation | review | | | | | | | | |
| Reset password | default | review | | | | | | | | |
| Reset password | link expired | review | | | | | | | | |
| Verify email | default | review | | | | | | | | |
| Verify email | confirmed | review | | | | | | | | |
| Verify email | link expired | review | | | | | | | | |
| Change password | default | review | | | | | | | | |
| Change password | saved | review | | | | | | | | |
| Shell | rail | synthetic | | | | | | | | |
| Shell | collapsed rail | review | | | | | | | | |
| Shell | tablet rail | synthetic | | | | | | | | |
| Shell | topbar | synthetic | | | | | | | | |
| Shell | mobile drawer | review | | | | | | | | |
| Shell | not-connected banner | review | | | | | | | | |
| Shell | "Finish setup" chip | review | | | | | | | | |
| Shell | help menu | review | | | | | | | | |
| Overview | default | synthetic | | | | | | | | |
| Campaigns list | empty | synthetic | | | | | | | | |
| Campaigns list | populated | synthetic | | | | | | | | |
| Create | empty | synthetic | | | | | | | | |
| Create | prefilled | review | | | | | | | | |
| Create | saving | synthetic | | | | | | | | |
| Create | ready for approval | synthetic | | | | | | | | |
| Create | needs changes | synthetic | | | | | | | | |
| Campaign detail | ready | review | | | | | | | | |
| Campaign detail | permission-restricted | synthetic | | | | | | | | |
| Campaign detail | approved | review | | | | | | | | |
| Campaign detail | already decided | review | | | | | | | | |
| Reports | not connected | synthetic | | | | | | | | |
| Onboarding | default | synthetic | | | | | | | | |
| Settings and connections | default | synthetic | | | | | | | | |
| Brand | default | synthetic | | | | | | | | |
| Guided setup step 1 | welcome | review | | | | | | | | |
| Guided setup step 2 | your details | review | | | | | | | | |
| Guided setup step 3 | your Realtor partner | review | | | | | | | | |
| Guided setup step 4 | create the campaign | review | | | | | | | | |
| Guided setup step 5 | read the result, ready | review | | | | | | | | |
| Guided setup step 5 | read the result, needs changes | review | | | | | | | | |
| Guided setup step 6 | approve | review | | | | | | | | |
| Guided setup step 6 | hand off | review | | | | | | | | |
| Guided setup step 7 | what happens next | review | | | | | | | | |
| Unverified email notice | default | review | | | | | | | | |
| Route error boundary | default | synthetic | | | | | | | | |
| Route loading boundary | default | synthetic | | | | | | | | |
| Email preview | reset password, 600px | synthetic | | | | | | | | |
| Email preview | confirm email, 600px | synthetic | | | | | | | | |

The two email rows are scored on axes 1, 3, 4, and 10 only, per the rubric's section 4: an email
has no states, no motion, and no responsive frames of its own. The frame columns record the frame
the surrounding preview page was at.

## Where each row's picture comes from

The two screenshot suites capture one picture per row, frame, and theme, named
`<screen>--<state>--<frame>--<theme>.png` with the state as this table's state word in lower case
with hyphens. `tests/visual/screens/README.md` says how to take a set without touching a baseline.
A row whose picture the suites take is a row the orchestrator can check against
`tests/visual/screens/` rather than re-stage by hand.

One picture carries a painted-over region. On campaign detail's already-decided row the moment the
decision was recorded is blanked, because it is a fact about the run rather than about the design
and a baseline that changed with the clock would fail every time. It is the only such region in
either suite, and the loud colour is Playwright's own, chosen so nobody reads it as a surface.

### Rows whose server column changed

Four states are not states a synthetic deployment has, so the suites take them from the review
server and the `Server` column says so.

| Row | Why it is a review row |
| --- | --- |
| Campaign detail, ready / approved / already decided | Synthetic mode's principal holds `campaign_creator` (`apps/web/src/server/authenticated-principal.ts:210-224`), and `campaignMayBeApprovedBy` (`packages/application/src/campaign-workspace-read.ts:110-119`) needs an approval role. A synthetic deployment can therefore never render an approvable or an approved campaign. The seeded approver can. Campaign detail's permission-restricted state stays synthetic, because that is exactly what a creator sees. |
| Shell, collapsed rail and mobile drawer | Both are states of the signed-in shell that a person reaches with a control, and the review server is where a real session exists. |

### Frames a state does not have

Two of these rows are scored at fewer than four frames, because the product does not have the state
at the others. This is the brief's tablet rule, not a gap.

| Row | Frames | Why |
| --- | --- | --- |
| Shell, collapsed rail | 1440 only | The collapse control is `display: none` from 1180 down (`apps/web/src/features/shell/components/app-shell.module.css:263-276`), because the tablet range renders the rail compact from the media query instead. 1180 and 768 are the "tablet rail" row. |
| Shell, mobile drawer | 390 only | The drawer trigger is `display: none` above 767.98px (the same file, lines 283-302), which PRD-006d D5 moved deliberately so the 768 frame keeps the compact rail. |

### Rows no automated suite can take, which the orchestrator stages by hand

| Row | Why the suite cannot reach it |
| --- | --- |
| Campaign detail, approved | Reachable, and blocked by a defect on the screen rather than by the picture. Between the decision and the next load the screen still carries "Send back for changes" (`apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:95-104`), a raw `<button>` with `.hint` from `open-house-draft-builder.module.css` that renders 152 by 21 against the brief's 44 by 44 (design brief section 14; WCAG 2.2 SC 2.5.8). Measured on 2026-09-19. Capturing it would have meant a red gate or a weakened target-size check, so the suite takes the already-decided state and leaves this one to the batch that moves the control onto the `Button` primitive, whose `Button.module.css:2` already sets `min-block-size: 44px`. |
| Campaign detail, ready | The same control, in the same state, before anybody decides. |
| Sign up, address already has an account | Reachable, but not on every run. Each submission spends one `sign_up_ip` attempt before the body is parsed (`apps/web/src/server/password-authentication-handler.ts:713`), the limit is ten an hour per address (the same file, line 86), and PRD-006c's four specs already spend exactly ten in one review run. Adding two was measured on 2026-09-19: the run's last two sign-ups were refused with "There have been too many attempts" and two PRD-006c specs failed. A set of the eight pictures was taken that day; stage it on a deployment of its own, or on a morning when nothing else is signing up. |
| Verify email, confirmed | Confirming needs an `email_verification` token, and `scheduleVerificationEmail` issues one only when a sending domain is configured (`apps/web/src/server/password-authentication-handler.ts:812-816`). The review composition leaves `OALO_RESEND_API_KEY` and `OALO_EMAIL_FROM` absent on purpose (`tooling/scripts/database/review-browser-run.mjs:48-51`), so no token exists for a browser to spend. Stage it on a deployment with a sending domain. |
| Unverified email notice | The sentence exists in `apps/web/src/copy/auth-messages.ts:84` as `VERIFY_EMAIL.unverifiedNotice` and nothing renders it. There is no such notice on the shell to photograph. |
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
