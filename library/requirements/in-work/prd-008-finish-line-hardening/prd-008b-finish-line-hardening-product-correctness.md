# PRD-008b: Finish-Line Hardening - Product Correctness

> **Parent:** [PRD-008](./prd-008-finish-line-hardening-index.md)
> **Status:** Draft
> **Priority:** P0. Two of these items make the product say something untrue about a campaign.
> **Schema changes:** None
> **Owner Guardians:** `react-guardian` (all four items); `typescript-node-guardian` (the draft server module)

## Goal

Make every statement the signed-in product makes about a campaign true:

- An approved version records only what the loan officer supplied.
- The approval card stops offering approval once a decision is recorded.
- `/brand` always edits the signed-in person's own saved branding.
- A demo-only URL no longer answers in the signed-in product.

## Background (honest)

1. **Fabricated approved image.** `apps/web/src/server/open-house-draft.ts:120-126` stamps every saved Open House Boost version with one image: `assetRef: "asset_propertyPlaceholder001"`, `approvalStatus: "approved"`, 1600 by 1200, alt text "Property image placeholder for <address>". The draft builder (`open-house-draft-builder.tsx`) has no image input, so the loan officer never supplied this image.

   Deterministic preflight checks that every image present is approved and large enough (`packages/domain/src/campaign-foundation.ts:217-238`), and the named human approval binds the exact version. So today a person approves a version that claims an approved property image they never saw.

   Preflight does not require at least one image. An empty `images` list therefore passes, and is the honest record.
2. **Approve control after a decision.** This is the PRD-006 QA warning "After a successful approval the campaign detail screen still says 'Ready for approval' and re-offers the approve button". `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx` computes `decision` from props (`alreadyDecided`, `state`, lines 71-78). After a successful response it only calls `setStatus` (line 107). Two things therefore persist until a reload:
   - The "Approve this version" `SafeAction` and the "Send back for changes" button stay enabled (the condition at line 129, the button text at line 150).
   - The server-rendered regions keep saying "Ready for approval".

   The review capture `campaign-detail--approved` (`tests/browser/review/review-campaign-decision.spec.ts:137-144`) photographs exactly this contradictory moment. A second click is harmless (the 005C duplicate path), but the screen contradicts itself.
3. **`/brand` depends on an unrelated flag.** `apps/web/src/app/(authenticated)/brand/page.tsx:14-18` shows the person's saved branding only when `OALO_HOMEOWNER_REPORTS === "enabled"`. Otherwise it renders `BrandProfileScreen` with the workspace's demo-derived brand projection.
4. **Leftover demo URL.** `apps/web/src/app/(authenticated)/marketing/campaigns/synthetic-open-house-001/page.tsx` still answers in signed-in mode, with the not-connected screen. Nothing links to it.

## Scope

- **Item 1:** `apps/web/src/server/open-house-draft.ts`, plus every component that summarises a version's images for a signed-in person.
- **Item 2:** `campaign-approval-controls.tsx` and `tests/browser/review/review-campaign-decision.spec.ts`.
- **Item 3:** `apps/web/src/app/(authenticated)/brand/page.tsx`, plus whatever the saved-branding read needs so that it works without the reports flag.
- **Item 4:** `.../marketing/campaigns/synthetic-open-house-001/page.tsx`.

## Non-Goals

- Property photo intake (upload, storage, approval workflow). That needs storage configuration and is a future PRD.
- Rewriting campaign versions already persisted on the hosted database. Versions are immutable and stay as recorded. The fix applies to every version created after it.
- Redrawing screenshot baselines. 008d redraws once, after every UI change.

## Design decisions

### D1. Record no image rather than a made-up one

Save `images: []`. The fixture asset `asset_propertyPlaceholder001` stays available to synthetic fixtures only. Where the product summarises images for a signed-in person, it says in PRD-006b language that no property photo is attached yet. It offers no upload control. 008b's new sentences live in a new `apps/web/src/copy/campaign-image-messages.ts`, which the user-language guard scans because it sits under `apps/web/src/copy/`. 008c owns `apps/web/src/copy/user-language.ts`, so 008b does not edit it.

### D2. Replace the controls with the outcome, then refresh

On a 200 response, including a duplicate 200, the card:

1. Replaces both controls with the recorded outcome sentence.
2. Calls `router.refresh()`, so the server-rendered status regions re-read the persisted state.

A refused or unreachable request keeps today's behaviour: the controls stay, and the refusal sentence and support reference show.

## Acceptance criteria

| ID | Criterion |
|---|---|
| 008B-AC-001 | A campaign version saved through the signed-in create path persists `images: []`. No non-test source file outside synthetic fixtures contains `asset_propertyPlaceholder001`, and a unit test enforces this. |
| 008B-AC-002 | A Postgres-backed test proves that a newly saved version with `images: []` passes deterministic preflight with no `IMAGE_NOT_APPROVED` or `IMAGE_QUALITY_LOW` finding, and can be approved by a `campaign_approver`. |
| 008B-AC-003 | Every signed-in screen that summarises a version's images says that no property photo is attached when the list is empty, passes the PRD-006b user-language guard, and offers no upload control. A component or browser test covers each such screen. |
| 008B-AC-004 | After a 200 or duplicate-200 decision response, the approval card no longer renders an enabled "Approve this version" action or a "Send back for changes" button, shows the recorded outcome sentence, and calls `router.refresh()`. A component test asserts all three for both an approval and a send-back. |
| 008B-AC-005 | After a refused (non-2xx) or unreachable decision request, both controls remain available and the refusal sentence and support reference render as they do today. A component test covers both. |
| 008B-AC-006 | The review browser spec's `approved` state waits for the refreshed page. It asserts that "Ready for approval", "An approver can sign off on it now.", and the "Approve this version" next-step are absent, and that the approved outcome is present. |
| 008B-AC-007 | In review mode, `/brand` renders the signed-in person's own saved branding editor, and a save persists, whether `OALO_HOMEOWNER_REPORTS` is set or unset. Demo brand values appear only in synthetic mode. The existing `canRenderDashboardPreview()` branch (`brand/page.tsx:13`) is unchanged. A test covers review mode with the flag set and unset, plus synthetic mode. |
| 008B-AC-008 | In review mode, `/marketing/campaigns/synthetic-open-house-001` serves the not-found page, or redirects to `/marketing/campaigns`. Synthetic mode is unchanged. A test covers both modes. |
| 008B-AC-009 | Every signed-in surface that labels a campaign's state (detail screen check heading, state badge, "Where it stands", next steps; the campaign list; the overview) reads the recorded decision. A sent-back version never reads "Ready for approval" or invites a sign-off anywhere. Integration tests cover undecided, approved, and sent-back versions on each surface, red first. (Added 2026-10-01; see Amendments.) |
| 008B-AC-010 | Neither the approver hand-off card nor the guided walkthrough tells a person to hand off or approve a version that already has a recorded decision. The walkthrough's campaign record carries the decision. Step 6 for a person who cannot approve branches on it: an undecided version keeps today's hand-off copy and anchor, and a decided one gets a true statement of what happened and what to do next. The approver's walkthrough selects only a campaign awaiting approval with no recorded decision, and says so truthfully when none exists. `CampaignHandOff` renders only when no decision is recorded. Integration tests cover creator and approver on undecided, approved, and sent-back versions, red first. (Added 2026-10-01; see Amendments.) |
| 008B-AC-011 | Every guided-walkthrough statement about the campaign matches its recorded decision and current check result. Step 5 does not say "ready for approval" for a decided version or for one whose checks need changes. Step 7 ("what happens next") says the campaign is approved only when an approval is recorded; an undecided campaign is described as saved and waiting for approval, and a sent-back one as sent back and needing a new version. The approver hand-off card does not appear for a version whose checks need changes. Integration tests cover each branch, red first. (Added 2026-10-01; see Amendments.) |

## Files expected to change

- `apps/web/src/server/open-house-draft.ts` and its tests.
- Campaign detail and approval summary components that list images, if any.
- `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx` and its component tests.
- `tests/browser/review/review-campaign-decision.spec.ts`.
- `apps/web/src/app/(authenticated)/brand/page.tsx`, plus any saved-branding data loader it needs.
- `apps/web/src/app/(authenticated)/marketing/campaigns/synthetic-open-house-001/page.tsx`, plus the two existing tests that import or name it: `campaigns-review-surface.integration.test.tsx` (line 17) and `review-navigation-paths.integration.test.tsx`.
- `apps/web/src/copy/campaign-image-messages.ts` (new).

## Test plan

- **Unit:** the placeholder-asset guard (008B-AC-001).
- **Component:** approval card after success, duplicate, refusal, and unreachable (008B-AC-004, 008B-AC-005); image summary with an empty list (008B-AC-003).
- **Postgres** (`pnpm test:db`): save, preflight, and approve with no image (008B-AC-002).
- **Browser (review project):** the approved state after refresh (008B-AC-006); `/brand` in both flag states (008B-AC-007); the demo URL (008B-AC-008).

## Security notes

- `router.refresh()` re-reads through the same session-scoped server path. Nothing new is fetched from the browser.
- The `/brand` change must not widen which location's branding a session can read or write. It uses the existing user-and-location scoped settings.

## Open questions

- [ ] None blocking.

## Related

- [PRD-006 QA report, the "re-offers the approve button" warning](../../in-work/prd-006-first-party-sign-in-and-guided-experience/qa/2026-09-19-prd-006-qa-report.md)
- [PRD-001c (blueprint, versions, preflight, approval)](../../in-work/prd-001-operation-automated-lo/prd-001c-campaign-blueprint-and-preflight.md)
- [PRD-007 authenticated pages scope](../../in-work/prd-007-homeowner-reports/reports/2026-09-24-authenticated-pages-scope.md)

## Amendments

- **2026-10-01, contract change behind D1.** The Background and D1 say an empty `images` list passes. That held for the domain preflight but not for the shared manifest contract: `packages/contracts/src/campaign-foundation.ts` required `images` to have at least one entry (`.min(1)`), so `images: []` was refused with a validation error before preflight ran. Lane L3 removed `.min(1)` (`8a07167`). With that change, an empty list passes both the contract and preflight, as D1 intends. No other rule about images changed.
- **2026-10-01, criteria 008B-AC-009 and 008B-AC-010 added during the Gauntlet run.** The independent writing review (`qa/2026-10-01-008c-writing-review.md`, finding S1b) and the review-fix lane found that the approve-control defect has the same root cause elsewhere: a send-back leaves the campaign state at `awaiting_approval`. Every surface that reads the state alone therefore still says "Ready for approval" and invites a sign-off. That covers the detail screen heading, badge and next steps, the campaign list, and the overview. The approver hand-off card and the guided walkthrough's step 6 and approver pick can also point a person at a decided version. Both criteria serve this PRD's goal that every statement the product makes about a campaign is true. They were added rather than folded into 008B-AC-004 so each surface has its own proof.
- **2026-10-01, criterion 008B-AC-011 added during the Gauntlet run.** While implementing 008B-AC-010, the review-fix lane found two more walkthrough statements that ignore the decision and the check result. Step 7 told every person "Your campaign is saved and approved.", including a creator whose campaign was only handed off or was sent back. Step 5 said "ready for approval" on a decided version. The hand-off card also appeared for a version whose checks need changes. Same goal as 008B-AC-009 and 008B-AC-010.
