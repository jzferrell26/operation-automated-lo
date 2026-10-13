# Homeowner readiness UX source review

Date: 2026-10-13. Reviewer: independent `ux-ui-guardian`. Target: draft PR #91, branch `codex/homeowner-readiness`, implementation commit `7a434df6f25017b63ca905a257c4a7737e159633`.

## Provisional verdict

The changed readiness presentation is supported by source review, with actual frame acceptance pending. HR-STATE, HR-READS and HR-DESTINATION align with the governing contract. The changed fresh-lookup, cached-create and scheduling behavior aligns with HR-ACTIONS. Two inherited UI issues below limit a blanket conclusion about every control and every scored axis. This review does not close HR-PROOF, HR-PR, full D9, customer/owner visual acceptance or real-provider qualification.

Only this report is owned and written by this reviewer. No product, CSS, test, ledger, baseline, configuration or provider file was changed. No commit, push, deployment or external operation was performed.

## Governing sections

Host authority is `library/knowledge/private/ux-ui/README.md`, followed by `00-design-brief.md`, `04-screens/homeowner-reports.md`, `03-components/button-and-safe-action.md`, `03-components/async-empty-error-permission-state.md` and `06-review-rubric.md`. PRD-009's amendments govern the current Inter, semantic-token and light-interface contract. Historical Claude Design canvases do not confer current acceptance.

> Design brief section 15: "Every disabled consequential action explains why it is disabled and gives the next safe action."

> Design brief section 16: "Missing data is `Unavailable`, never zero."

> Homeowner reports screen spec: "Live reports show configuration failures instead of substituting a sample."

> Button and Safe Action: "Disabled controls retain the reason in adjacent text, not only a tooltip."

> Review rubric section 1: "The bar is 3 on every axis, for every screen, at every frame, in both themes."

The existing spec covers this readiness increment; no new design-system ruling or token is necessary for its capability contract. The parent expressly restricted ownership to this report.

## Source criteria and evidence

| Criterion                                    | Source result                      | Evidence and limit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HR-STATE                                     | Supported                          | `apps/web/src/server/homeowners/readiness.ts:3-31` distinguishes unknown/unavailable storage, read-only write authority, unavailable valuation setup, zero allowance and exhausted allowance using safe enums. `apps/web/src/server/homeowners/http.ts:168-189` derives live readiness after authenticated reads. `apps/web/src/features/homeowners/readiness.ts:24-68` assigns distinct explanatory copy. This is source evidence, not execution of the actual server projection.                                                 |
| HR-ACTIONS, fresh lookup and cached creation | Supported                          | `readiness.ts:3-21` separates fresh capability from creation that may reuse a cached value. `builder.tsx:179-187` explains setup/access prerequisites and `builder.tsx:416-429` gates final creation. The zero/exhausted notices explicitly qualify reuse by a recent value for the address, rather than promising a fresh lookup. `workspace.tsx:564-595` blocks fresh refresh with a useful linked-contact explanation.                                                                                                          |
| HR-ACTIONS, monthly and delivery preference  | Supported for the changed controls | `workspace.tsx:694-780` blocks new monthly scheduling/resumption when fresh capability or the linked contact connection is absent, while allowing pause and On demand only. Delivery preference cannot be newly enabled with unavailable delivery/contact setup, but an existing preference can be turned off. Copy identifies administrator/support and preserves communication/source checks. See inherited handoff-control limitation below.                                                                                    |
| HR-READS                                     | Supported                          | `workspace.tsx:497-510` preserves download and existing writer-authorized sharing, `workspace.tsx:547-563` preserves saved history and snapshot editing, and `workspace.tsx:669-672` explains that revision reuses the valuation. `use-home-workspace.ts:123-141` retains already loaded snapshots during a failed recheck while clearing stale write capability. Read-only users retain saved reading/export but are not offered writer actions. Storage explicitly switched off follows the existing unavailable workspace path. |
| HR-DESTINATION                               | Supported                          | `workspace.tsx:878-915` replaces the unrelated `/settings/connections` action with Check report availability and administrator/support copy. `readiness.ts:34-48` distinguishes report storage/setup from valuation setup. HighLevel remains optional for standalone property valuation and relevant to linked-contact follow-up.                                                                                                                                                                                                  |

`apps/web/src/features/homeowners/readiness.integration.test.tsx:48-173` contains zero/exhausted allowance, cached creation, setup unavailable, reader access, pause and failed-recheck recovery assertions. These are inspected source assertions, not fresh test execution by this reviewer. Parent reports application CI run `38473357552` passed; the new database/browser job was still pending when this provisional review was authored. Independent Security followed by Quality is recorded in the neighboring October 13 reports; this UX review adds no independent runtime claim to those reports.

## Inherited source issues

### UX-S01: readiness notice copy uses an off-scale text size

Screen: homeowner report detail and other live views containing the readiness notice. Frames: 1440, 1180, 768 and 390. Themes: Light and Dark. States: zero allowance, exhausted allowance, valuation setup unavailable, read-only and unknown capability. Location: `apps/web/src/features/homeowners/homeowners.module.css:374-376`; notice consumption: `workspace.tsx:883-892`.

Current value: `.notice p { font-size: 13px; }`. Required value: `font-size: var(--text-secondary-size)` (the host's 14px secondary step) or another explicitly governed step. Axis: 3, Typography, under rubric section 2 and brief section 10's PRD-009 amendment. This declaration predates the increment, but the expanded readiness states consume it. The CSS is outside this reviewer's ownership. Rendered scoring remains pending; an unchanged declaration is not evidence of compliance.

### UX-S02: existing HighLevel handoff has incomplete connection/disabled explanation

Screen: saved linked-homeowner report detail. Frames: all four shared frames. Themes: Light and Dark. State: linked contact, live workspace, writer authorized, `deliveryEnabled=true`, `ghlConnected=false`. Location: `apps/web/src/features/homeowners/workspace.tsx:610-630`.

Current value: the handoff button checks delivery flag, write access and property association, but does not check `ghlConnected`. Its live linked-report description explains a successful handoff path. With delivery disabled, the same generic description does not identify the unavailable delivery prerequisite. Required rule: brief section 15 and Button/Safe Action disabled-reason contract. Proposed delta for the implementation owner: include the unavailable linked-contact connection in the handoff availability guard and put the delivery/contact reason plus administrator/support next step beside that action. Axis: 5, States, and 9, Empty and error states.

This is inherited and is not a claim of a server authorization bypass. The changed monthly preference dialog already supplies a delivery explanation at `workspace.tsx:737-744`, and the refresh toolbar supplies a linked-contact explanation at `workspace.tsx:587-595`. Those improvements do not establish that the separate handoff control is fully qualified.

## Exact rubric axes, provisional evidence only

No rendered score is awarded before the actual retained files exist and are inspected. The rubric has no accepted score of 2; pending is an evidence state, not a passing score.

| Axis from host rubric             | Source observation                                                                                                                          | Rendered score |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1. Hierarchy                      | Existing report/action hierarchy retained; added availability notice appears before the report header.                                      | Pending        |
| 2. Spacing rhythm                 | Existing `styles.notice` consumes `--space-4` and `--space-5`; no new spacing literal introduced.                                           | Pending        |
| 3. Typography                     | UI wrappers retained; inherited notice size issue UX-S01 remains.                                                                           | Pending        |
| 4. Color and contrast             | Existing warning semantic tokens reused; no new color literal introduced. Contrast is not established by source inspection.                 | Pending        |
| 5. States                         | Changed fresh/create/monthly states and read-only/unknown explanations are explicit; inherited handoff issue UX-S02 remains.                | Pending        |
| 6. Motion                         | No new animation or transition added. This does not prove computed reduced-motion behavior.                                                 | Pending        |
| 7. Responsiveness                 | Existing notice wraps on mobile at `homeowners.module.css:813-815`; actual wrapping, overflow and target size await execution/inspection.   | Pending        |
| 8. Dark and Light                 | Semantic tokens and existing wrappers remain shared. Both rendered themes await inspection.                                                 | Pending        |
| 9. Empty and error states         | Unconfigured uses governed `EmptyState`, errors use `LiveRegion`, saved data survives failed rechecks. UX-S02 limits full control coverage. | Pending        |
| 10. Consistency with the canvases | Compare against current PRD-009 sibling styling plus the homeowner screen and component specs, as required by the amended rubric.           | Pending        |

## Pending 12-frame evidence and proof boundaries

Inspected `tests/browser/review/homeowner-readiness.spec.ts:22-134`. It signs into the real local seeded shell and supplies synthetic homeowner report API fixtures. It is presentation evidence. It does not establish an actual server readiness projection, a live valuation provider, hosted configuration or a real server PDF export.

Expected files under retained `product-review-frames/homeowner-readiness`:

- `readiness-{1440,1180,768,390}-{Light,Dark}.png`: eight zero-allowance detail frames.
- `setup-unavailable-{1440,1180,768,390}.png`: four setup-unavailable detail frames, captured after the Dark iteration.

The spec asserts saved PDF download naming, enabled sharing and revision controls, disabled fresh refresh, absent unrelated connections link, full shared axe checks, no horizontal overflow, no homeowner mutations and no external requests. The synthetic PDF path establishes a download interaction/name, not authenticity of provider data or real server-generated PDF contents. No screenshot baseline is regenerated by this spec.

The 12 pictures cover two readiness presentation states. Storage unavailable, writer restrictions, unknown/error recovery, exhausted allowance, builder, schedule/delivery dialogs, focus traversal, hover/active states, reduced motion, measured target size, print layout and actual sharing/revision execution are not established by those pictures. Existing unit/integration, PostgreSQL and legacy browser evidence must remain separately attributed. Full D9, customer/owner sign-off and live provider activation remain unestablished.

Follow-up: reactivate this reviewer when the exact artifact is downloaded to inspect all 12 files and assign the supported frame/theme scores. Source findings stay assigned to the implementation owner; this reviewer will not alter the owned product files or acceptance ledger.

## Source-fix recheck, October 13

This append supersedes the source status of UX-S01 and UX-S02 and the references to them as remaining issues in the provisional table above. Inspected the final uncommitted three-file correction on base HEAD `7a434df6f25017b63ca905a257c4a7737e159633`: `homeowners.module.css`, `workspace.tsx` and `readiness.integration.test.tsx`. It follows the independent Security source-cycle recheck and fresh Quality. All rendered scores remain Pending, with no new-head screenshot, CI, PostgreSQL or provider evidence credited here.

| Finding | Source result    | Exact correction and verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-S01  | Closed in source | `homeowners.module.css:378-380` applies `var(--text-secondary-size)` only to `.notice.readinessNotice p`, and `workspace.tsx:895-900` applies that class to the readiness notice. The matching existing token is `0.875rem` in `packages/ui/src/tokens.css:160` and host `01-master-tokens.css:253`. The legacy general notice rule is untouched. This closes the readiness notice typography delta under brief section 10 and rubric axis 3; computed rendering awaits the new captures.                                                                                                                                                                                                                                                                                    |
| UX-S02  | Closed in source | `workspace.tsx:618-627` supplies adjacent plain-text explanations for unknown capability, reader access, missing contact connection and disabled delivery, with a useful recheck, administrator/support or schedule next step. `workspace.tsx:631-638` requires connected contacts, ready storage and allowed write capability alongside the existing busy, delivery, role and property-association guards. The delivery explanation names the actual current action, Monthly updates or Update schedule. `workspace.tsx:737-791` retains turning off an existing delivery preference and pausing or choosing On demand only. This closes the scoped handoff availability/explanation delta under brief section 15 and the Button/Safe Action contract, rubric axes 5 and 9. |

The revised integration source contains unavailable contact/delivery/reader, unknown capability, deliberate configured-writer confirmation and existing delivery-preference turn-off assertions at `readiness.integration.test.tsx:50-149`. Independent Security records fourteen interaction tests passing on this final source cycle. The parent reports fresh Quality passed thirty-two tests and the owner passed fifty-four integration tests, type checks, lint, format and zero duplication. Those executions are attributed to their reviewers/owner; this UX recheck independently inspected the source rather than rerunning their tests.

No additional scoped source defect found. The guard remains presentational and grants no server authority, provider activation, consent or quota. Saved reads/export, authorized sharing and snapshot revision remain as previously reviewed. This report's own `git diff --check` passed. Only this report was appended by UX.

HR-PROOF and every rendered axis remain pending the final new-head evidence. Earlier-head CI and captures do not qualify this CSS/control correction. Full D9, customer/owner acceptance and real-provider proof remain unestablished.
