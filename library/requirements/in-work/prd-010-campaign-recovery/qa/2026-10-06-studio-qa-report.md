# Campaign studio: UX/UI and quality self-review

Date: October 6, 2026. Reviewer: Chief, direct sequential self-review after the [security review](2026-10-06-studio-security-self-review.md). This is not independent review or owner visual approval.

Scope: the first Home and property-preparation UX increment on `chief/ux-campaign-studio-2026-10-06`, base `0d2187a5`, [PR #80](https://github.com/jzferrell26/operation-automated-lo/pull/80). Governing design: [Campaign studio](../../../../knowledge/private/ux-ui/04-screens/campaign-studio.md), the design brief's October 6 amendment, and the existing ten-axis review rubric. Financing implementation in the separate worktree is not reviewed or modified here.

## Current disposition

Implementation and the complete local offline gate have passed. [Canonical Linux generation and real-database/signed-in qualification](https://github.com/jzferrell26/operation-automated-lo/actions/runs/37408667799) also passed. The newly reviewed references and final capture-only correction still require the final PR comparison run, so the PR remains draft and unmerged. The Vercel preview is not a production deployment or evidence of hosted account creation/generation. Do not describe the entire product, payment system or five-funnel pack as finished because these two screens improved.

## What changed for the user

Home leads with the implemented property campaign and its four connected private outputs, one primary action and a supporting campaign-list link. The old ad workflow remains available but is no longer the page's primary title or filled action. Connection/setup states retain their honest status below the studio rather than taking the first position.

Property preparation groups facts, times and permission, shows the three real stages, and mirrors entered property facts plus the selected saved identities in an explicitly unsaved summary. At wide frames this is side-by-side; at tablet and phone sizes it becomes a single reading column. On a phone the Home illustration compresses to a small output strip. No synthetic photo, fake lead count, made-up payment or working public QR is shown.

## Review findings and resolutions

| Finding | Resolution |
| --- | --- |
| Home had an ad-only h1 and hid the existing property package behind a direct route | New studio h1 and role-correct property action. The existing ad card becomes a secondary h2; the same ad flow remains keyboard reachable. |
| Initial mobile decoration consumed too much vertical space | The decorative paper stack is hidden on phone widths while its compact four-output rail remains. The primary action precedes it. |
| Property breadcrumb stretched/centered within its grid | The composer gives it `justify-self: start`, preserving its normal accessible link behavior. |
| Screenshot capture followed a scrolled field selection and placed the sticky header across the page | Captures explicitly return to the top after the actual field/summary checks. This is capture hygiene, not removal of the real sticky header. |
| Shared launch-form CSS reversed Back/Save visually on phones while keeping the opposite keyboard order | A composer-specific mobile rule restores visible Back then Save in DOM order. The new browser matrix checks focus order and the corresponding bounding boxes; other launch screens are not restyled. |
| Historical tests assumed Home's first card/h1 was the ad card | Updated the precise Home assertions and first-card measurement to the new studio, preserving all underlying geometry, accessibility and ad journey checks. |
| Duplicate private-draft notice styling failed the zero-duplicate check | Extracted the identical rule into `components/campaign-draft-notice.module.css` and reused it from both screens. No ignore directive or duplicate threshold change. |
| Linux comparison exposed rolling campaign-list date widths shifting adjacent table columns despite date masks | Extended the existing capture-only date normalizer to campaign-list time elements. Actual dates, clocks, data, controls and non-list text remain untouched; labels restore even after capture failure. Two new tests prove stable geometry, retained datetime attributes, narrow scope and refusal of malformed text. The eight populated-list reference images are an explicit harness repair, not an unrelated application redesign. |
| Tablet scan counted the decorative four-output illustration as application content columns | A narrow marker plus `aria-hidden=true` identifies only that illustration. A regression assertion proves it contains no interactive descendants; actual content layout remains checked. |
| A CSS `zoom:2` experiment failed without exercising viewport media queries | Replaced it with an explicitly labelled 200-percent-equivalent viewport reflow check. This is not claimed as automation of the browser's zoom chrome. |

## Functional and safety review

The presentation capability is derived on the server from the authenticated role. Missing capability defaults to false. The existing mutation, tenant, saved-brand, partner, retry and package handlers remain authoritative and unchanged. The review-surface negative test now explicitly rejects both the new studio h1 and the retained ad h2 behind the not-found boundary, rather than checking only a retired heading.

The summary reads local field state and the saved data already supplied to the form. Integration tests prove that typing and changing partners trigger no save, HTML-like text remains escaped, and the prior partner's name disappears after switching. Existing tests retain permission clearing, uncertain-save key reuse, conflict recovery, disabled roles, missing setup and invalid-response refusal.

Two inherited dependency findings were repaired rather than waived: source-map-js 1.2.2 and proxy-addr 2.0.8, both with explicit patch-floor/no-ignore tests. Production and full-policy audits pass after those patches; the full graph retains only the pre-existing owner-accepted development-only braces exception. No pricing, migration, hosting configuration, domain, provider activation, customer message or source-client asset changed.

## Acceptance traceability

| Criterion | Evidence |
| --- | --- |
| UX-001 | `overview-screen.integration.test.tsx`, role cases in `home-reads.unit.test.ts`, and browser primary/focus assertions. One studio h1 and one filled primary; creators and reviewers get appropriate fixed paths. |
| UX-002 | Studio entry opens the actual existing preparation route. Copy names only private page/flyer/QR/copy capability. The decorative illustration is marked and contains no focusable control. |
| UX-003 | `property-campaign-form.integration.test.tsx` verifies real local summary values, safe literal markup, changed partner and zero saves while typing. |
| UX-004 | Existing handler/form regression tests remain, including missing brand/partners, viewer restrictions, invalid inputs, conflict and uncertain saves. |
| UX-005 | `campaign-studio.spec.ts` covers 1440, 1180, 768 and 390 in Light and Dark, using unfiltered axe, type scale, target-size and no-overflow checks. Screenshots are visually inspected as well. |
| UX-006 | Static original composition, no fictitious QR or public screenshot, keyboard order, reduced-motion and equivalent reflow checks. Mobile Back/Save visual order now matches its focus order. |
| UX-007 | Source-level no-CRM/no-publication guards, inherited ad and package tests, canonical Linux baseline generation and subsequent comparisons. Final run identifiers and disposition are recorded below after completion. |

## Visual matrix and scores

Frames reviewed: 1440, 1180, 768 and 390, each in Light and Dark. Sources include the actual browser-generated studio/composer captures and the canonical Linux screen artifacts. A local capture is not substituted for a Linux golden image.

The final mobile Back/Save correction passed in both themes, and its focus ring and visible order were inspected in the generated 390px captures. The following scores apply to the scoped implemented screens across all four frames and both themes. A 3 means agreement with this screen brief, not a universal 10/10 rating or owner approval. Canonical Linux comparisons remain an independent release check and are not waived by these scores.

| Rubric axis | Home studio | Property composer | Evidence |
| --- | --- | --- | --- |
| Hierarchy | 3 | 3 | One primary and h1; property value leads Home; summary and stages support the form rather than compete with Save. |
| Spacing rhythm | 3 | 3 | Existing semantic spacing steps; measured supporting-card geometry retained, no cramped mobile action row. |
| Typography | 3 | 3 | One explicitly governed display step; other text uses the existing scale and Inter. Wrong-tag/size/descendant exemption tripwires pass. |
| Color and contrast | 3 | 3 | Existing semantic colors and contrast contract; no raw-color redesign, status still written out. |
| States | 3 | 3 | Role-correct Home action; saved/missing/uncertain/error/pending form behavior retained; unsaved summary labelled explicitly. |
| Motion | 3 | 3 | Static illustration, shared short interaction behavior, reduced-motion checks pass. |
| Responsiveness | 3 | 3 | Four-frame matrix, zero horizontal overflow, 44px targets, compact phone artwork and matching visible/focus order. |
| Dark and Light | 3 | 3 | All frame/theme captures inspected, source tokens reused rather than hardcoded Light-only styling. |
| Empty/error states | 3 | 3 | Existing empty ad/setup regions retained; missing setup and failed saves still have truthful recovery. |
| Consistency | 3 | 3 | Current amended brief, existing shell/brand/components; no new navigation language or generic editor. |

## Verification record

**`pnpm verify:offline` passed, exit 0**, on the final application UI, including the shared notice styles and mobile Back/Save correction. This includes 2,744 unit tests, 839 integration tests (one existing skip), 112 contract/security tests, 77 component tests, eight visual-contract tests, one preview-contract test, 217 synthetic browser tests (22 existing skips), 16 dashboard-preview browser tests, formatting/lint/types, duplication, package/secret/product-type audits, builds and the sample-ad build-output scan. Log: `tmp/ux-final-verification.log`.

The subsequent capture-only list-date repair passed all five isolated screenshot-helper browser tests without occupying another workflow's application port; the full workspace typecheck passed again. No application behavior changed after the aggregate local pass. Final Linux CI still must verify the updated harness against the committed reference set. The earlier focused 50-test browser regression run also passed; it is not double-counted in the aggregate figures.

Initial Linux baseline run `37406942577` found old Home-h1 assumptions in shared/new-account helpers. Those assumptions were corrected, not deleted. **Both jobs of the later run `37408667799` passed** on `242f230c`: the synthetic matrix, real PostgreSQL migrations/pgTAP and repository/web integration checks, 149 sample-catalog authenticated browser tests and four real-catalog browser tests. This is canonical generation and functional qualification, not the subsequent no-update golden comparison on the final PR tree.

Exactly **50** existing Linux references are updated. The intended visual change is 42 Home-related images: eight synthetic Home states, two Home-under-notice states, eight authenticated first-run Home states, eight real-catalog Home states, eight password-saved notices over Home and eight Help-open states over Home. The remaining eight populated-campaign-list references accompany the explicit capture-only date-width repair. No campaign detail, sign-in error, settings or other unrelated rasterization difference is accepted. No screenshot threshold, mask color, comparator or wholesale artifact refresh changes.

Final application code after that generation differs only in the shared identical notice-CSS extraction and the mobile Back/Save order correction. Both passed the complete local gate and the final eight-frame/theme matrix; the property form has ephemeral captures rather than committed golden files. The later date helper has its five passing isolated tests. Final PR CI must still compare the committed references and run on that final tree; no pending check is reported as green here.

Vercel reports the branch deployment Ready. Unauthenticated requests remain protected by Vercel SSO. An authorized CLI read returned HTTP 200 for `/overview`, but it serves the existing dashboard-preview shell rather than independently proving the new authenticated Home; `/sign-in` was 404 on that preview configuration. No preview environment/protection setting was changed, and no hosted first-party session or generation success is claimed. The PR's inspected screenshots and isolated authenticated-review checks are the appropriate evidence for this UI increment until hosted account validation.

Raw local logs and captures are in ignored `tmp/ux-*` and `test-results/browser/`. Those paths are local evidence, not guaranteed downloadable PR artifacts. The exact reference inventory is the PR's `tests/visual/screens/` diff; the generation artifacts remain attached to run `37408667799`. Final PR comparison results and owner review remain required before declaring this a released increment.

## Remaining product work

This establishes the visual and interaction direction for the existing property entry flow, not all screens in AutomatedLO. The photo-led financing comparison, matching co-branded site, original five-funnel catalog, reusable rich brand/media profiles and guided domain activation remain their separately tracked work. New screens should use this output-first, role-correct, responsive pattern without inventing features or hiding required financial review.

No owner visual approval, production traffic, lender compliance approval or successful hosted generation is claimed by this self-review.
