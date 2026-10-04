# PRD-009 writing check, QA-15 (MTK-008)

> Reviewer: `technical-writing-craft-guardian` (sonnet) | Date: 2026-10-04 | Run: `claude/prd-009-marketing-toolkit` at `0831365d` | Mode: read-only. No file in the worktree was edited, built or tested; this report is the only file added, and it is not committed.
> Standards read: [user-language contract](../../../../knowledge/private/standards/user-language-contract.md) (v1.2), the [delta check](2026-10-03-writing-review-delta.md) and [pass 2](2026-10-02-writing-review-pass-2.md) for the conventions, and QA-15 in the [quality report](2026-10-03-quality-report.md).
> Method: each string read in source with its callers, the page it sits on, and the page it leads to. I did not run the source guard or any test; the quality report records both strings passing it. Mechanical checks on both files: no em or en dash (`git grep`), no forbidden term, American spelling, sentence case.

## Scope

The two strings no writing check had read (QA-15): `requestNewLinkLabel` (added in `20a4fa08`) and the Brand reason line with its reused link (added in `51a42d72`).

## Result

| # | String | Verdict | Change today |
|---|---|---|---|
| 1 | "Request a new link" | PASS | None |
| 2 | "Homeowner reports aren't turned on in this workspace yet." beside "Workspace connections" | ADVISORY | None; no picture moves |

No BLOCKING finding. QA-15 can close with no string change, so no reset-password or Brand picture needs a redraw for writing reasons. MKR-008's evidence can name this record.

## 1. PASS: "Request a new link"

**Where.** `apps/web/src/copy/auth-messages.ts:75`, drawn by `RequestNewLink` at `apps/web/src/features/auth/components/auth-feedback.tsx:73` (the brief named `components/auth/`; the file is under `features/auth/components/`). It sits under "This reset link has expired or was already used. Request a new one." in the refused-link alert, and on the reset page opened with no token. It goes to `/forgot-password`.

**Why it holds.**

- The control says what the sentence above it tells the person to do: same verb ("Request a new one" and "Request a new link"), so the instruction and the button agree.
- "Link" is the product's word for the emailed thing: "reset link" in that sentence and in the forgot-password confirmation, "Send reset link" on the button, "Resend the link." in the verify notice.
- "Request" is the right verb and "Send" would not be: the link opens a form and sends nothing. The person lands on the heading "Reset your password" and the lead "Enter your email and we'll send you a link to choose a new one.", with an Email field and the button "Send reset link". That lead closes any gap between "Request" and "Send". The sign-in page's "Forgot your password?" opens the same page.
- It is better than the pass 4 note's idea of reusing "Reset your password" (the label `sign-up-form.tsx:60` uses for the same address). That label suits someone who forgot a password; on an expired-link screen it reads as starting over and does not echo the instruction.
- Plain words, sentence case, no forbidden term.

**Not raised.** (a) "Request a new one." and "Request a new link" sit side by side. That is the pair on purpose (instruction, then control); the sentence is the PRD-006b D10 literal and is pinned (`auth-messages.unit.test.ts:68`), so leave it. (b) The no-token page says "expired or was already used" for an address with no token. That sentence was already there before `20a4fa08` (it was a bare paragraph), it is the D10 literal, and it tells a reader nothing about whether an address has an account. Not new, so not part of QA-15.

## 2. ADVISORY: "Homeowner reports aren't turned on in this workspace yet." and "Workspace connections"

**Where.** `apps/web/src/features/workspace/preference-editors.tsx:207-212`, the last lines of the Brand page's report preview card when reports are off. The link goes to `/settings/connections`.

**The sentence passes.** Plain, true, and in the product's own words: "turned on" is what the Brand card above says ("once those are turned on", `:157`) and what Home says about launching. "Yet" states a fact and does not soften it (contract section 5, rule 2). No forbidden term.

**The reused label matches its sibling.** The Homeowner reports page uses the same label for the same state and the same destination (`features/homeowners/workspace.tsx:865`), and the delta check read that state and left it. Brand now says the same thing, in the same words, as the page the feature lives on.

**The weakness (why ADVISORY and not PASS).** The next step is a place, not an action, and the place does not cover reports.

- The Connections page ("What Automated LO asks for, and why") lists four items of access to HighLevel and Meta. I found no mention of homeowner reports or valuations in its fixture, its hosted projection (`authenticated-workspace-data.ts`) or its components. Its notice says connecting "isn't available in the app yet."
- Whether reports are on is a deployment setting (`OALO_HOMEOWNER_REPORTS`, `server/homeowners/runtime.ts:51-54`), not a connection a loan officer can make.
- So a reader who clicks finds nothing about reports. Contract section 5 rule 3 is met in form (a next step is named) and only partly in substance (section 2 rule 7: say what the user can do).
- Four labels now open that one page: "See what's needed for ..." (Home), "Open connections" and "Review connections" (Settings), and "Workspace connections" (Homeowner reports, Brand). The page's own name is "Connections".

**Why it is not BLOCKING.** The sentence promises no action. That is the difference from pass 2 W-25 and W-28, where "connect it in Settings" named an action with no control. The same pair already stands on the Homeowner reports page through every earlier check, so a change on Brand alone would split two pages that agree. And a change moves 16 Brand pictures (`review/brand--empty-account--*`, `chromium/brand--default--*`) and forces one more redraw under 009G-AC-011, for a weakness that misleads no one into a false belief.

**Exact words if the owner wants them (not today, and change both pages together).**

- Smallest: replace the link label "Workspace connections" with "Review connections" on Brand (`preference-editors.tsx:211`) and on Homeowner reports (`workspace.tsx:865`). It is verb-led and is the label the Settings card already uses for this page (`workspace-screen.tsx:157`). It removes one name; it does not fix the dead end.
- The honest fix needs one fact from the owner: how a workspace gets homeowner reports turned on. If the answer is "not from the app yet", the contract's own pattern (section 2 rule 3, as W-28 applied it) is to say so and drop the link; I will not invent that sentence. This is the same kind of open fact as W-12 (the support address).
- Tests that would change: `synthetic-brand-page.integration.test.tsx:141-145, 161`; `refusal-messages.integration.test.tsx:236, 263` if Homeowner reports moves too.

**Not raised.** With reports off, the Brand page says the fact twice, once as a condition in the Your details card ("once those are turned on") and once as the reason the preview card has no create action. They do different jobs (what the details are used for, and why there is no button), so I leave both.

## For the orchestrator

1. Nothing in this record needs a code change before ship.
2. Log item 2's follow-up in the index's "Follow-ups after PRD-009": decide how a workspace turns on homeowner reports, then fix the Connections link on Brand and Homeowner reports together.
3. The owner decisions already recorded (W-5, W-12, W-20) stand and are not re-raised.
