# PRD-009d: Marketing Toolkit - Launch an Ad

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01 after OD-H. It replaces the three-step open house launch of the first draft (commit `22e6b87`).
> **Priority:** P0. This is the product's core: "They select the one they want and launch. Nothing crazy." (OD-H)
> **Schema changes:** None in the database. It uses 009c's manifest variant and adds rules to the domain checks.
> **Owner Guardians:** `react-guardian` (the flow, the brand band, the Brand page fields); `typescript-node-guardian` (the save, the checks); `meta-ads-guardian` (verifies Meta's current Special Ad Category rules during the run, 009D-AC-012)

## Goal

"Launch an ad" in three steps at `/marketing/campaigns/new`:

1. **Choose an ad** from the library.
2. **Set it up:** the loan officer's brand goes on the ad automatically; only the headline and primary text can change; the disclosure is locked; budget, dates, and where it shows are set within Meta's Special Ad Category rules.
3. **Review and launch:** the actual ad at its real shape, what the approval covers, "Approve this version" with its own confirmation, and "Launch on Facebook", which stays disabled with one honest sentence.

Every PRD-008b truthfulness state holds on every surface, and the happy path meets the design's click and field targets.

## Background (honest)

1. **Today's create page** is the open house form (`apps/web/src/features/campaigns/components/open-house-draft-builder.tsx`): an address (`:444`), a State field (`:452-469`), a description (`:474-478`), open house times (`:483-494`), a Realtor (`:502-530`), two permission boxes (`:538-543`), ad words (`:569-600`), a typed area (`:625-629`), and budgets (`:633-648`), posted to `/api/campaigns/preflight` (`:187`). Approval happens on the campaign page through `CampaignApprovalControls` (`/api/campaigns/approve`, `campaign-approval-controls.tsx:105`; "Yes, approve" at `:172-174`; the line "Approving applies to this exact version. Nothing is published or sent." at `:170`).
2. **The server save** (`apps/web/src/server/open-house-draft.ts`) mints a new campaign reference every time (`:76-79`), records constant profile references (`:90-97`), targets `country: "US"` and one typed region (`:146-152`), and checks against banned phrases "guaranteed approval" and "no credit check" (`:175`). The application layer already numbers a new version of an existing campaign from the latest one (`packages/application/src/campaign-foundation.ts:270-271`); only the web server never asks it to.
3. **The checks today.** Preflight's rules (`packages/domain/src/campaign-foundation.ts:195-360`) include `DISCLOSURE_REQUIRED`, `CONSENT_REQUIRED`, the two image rules, `BRAND_BANNED_PHRASE` (which reads only the headline and body, `:253-268`), `FINANCING_TERMS_BLOCKED` (which reads only the structured `financingTerms` list, not the words), `META_HOUSING_CATEGORY_REQUIRED`, `TARGETING_NOT_ALLOWED` (`:335-350`, no ZIP, custom audiences, or protected dimensions), and `BUDGET_OUT_OF_BOUNDS`. Nothing reads the ad's words for rate, payment, or term claims, which `library/knowledge/private/compliance/compliance-and-risk.md:48` says are controlled.
4. **The Meta connection's model** already has country, region, and city locations (`packages/ghl/src/meta-adapter.ts:287-293`) and four placements including `facebook_feed` (`:299-302`). It is a plan only (`META_ADAPTER_MODE = "fixture-plan"`, `:13`).
5. **No launch exists, by design.** `/api/campaigns` has only `approve` and `preflight`; `provider_publish` is always `available: false` and `providerPublicationAuthorized` is `false` (`packages/application/src/campaign-workspace-read.ts:101-107`).
6. **The brand today** is the homeowner report brand (`packages/contracts/src/homeowner-reports.ts:16-26`: name, company, email, phone, NMLS, company NMLS, tagline), saved per person as `workspace.brand.v1` (`apps/web/src/server/workspace-preferences.ts:54`). It has no title, colour, disclosure line, or logo. The design's band needs the first three; a logo needs file storage, which OD-H removed from PRD-009.
7. **L-14 and L-15 from PRD-008.** Approval records carry constant profile references (Quality L-14), and no route saves a new version of an existing campaign although some sentences promise one (Quality L-15).

## Scope

- `apps/web/src/app/(authenticated)/marketing/campaigns/new/**` and new components under `apps/web/src/features/campaigns/` for the steps, the ad preview, the brand band, and the launch button.
- `apps/web/src/server/` (a library-ad save path beside or replacing `open-house-draft.ts`) and `campaign-preflight-handler.ts`.
- `packages/domain/src/campaign-foundation.ts` (the library-ad rules).
- The Brand page and editor (the three new fields) and `apps/web/src/server/workspace-preferences.ts`.
- A new `apps/web/src/copy/launch-messages.ts`.

## Non-Goals

- Publishing anything: no launch route, no Meta or HighLevel call, no inline launch confirmation, no publishing progress, no raster image. Those belong to the future Meta publish PRD.
- Editing the image or layout of a library ad (OD-H: "Just the copy").
- A logo upload. The band uses an initials tile (D-25); a logo needs file storage and is an owner question for later.
- Any Realtor identity on an ad. Compliance control 9 stays in force; the flow reads no Realtor partner data.
- Instagram (D-23), radius targeting, ZIP codes, age, gender, interests, or audiences (D-18).

## Design decisions

### D1. Steps, addresses, and what is saved when

The step is in the address (`?step=1`, `2`, or `3`); `?topic=` opens step 1 filtered and `?ad=<id>` opens step 2 with that ad chosen. Nothing is saved until "Save and check" on step 2, which saves the version and runs the checks. Step 3's address carries the saved campaign reference, so a reload re-reads it. A reload on step 2 keeps the chosen ad (from the address) and its prefills. Back moves between steps without losing typed words.

### D2. Step 1 is the library

Step 1 shows 009c's cards and topic chips inside the step indicator. "Use this ad" goes straight to step 2; there is no separate Continue. On this choosing screen every card button is secondary, so no single blue button competes with the ads (design section 6.1); "Cancel" returns to where the person started.

### D3. The brand band, and three copy corrections

The band follows `design/00-direction.md` section 5.4: the bottom 270 px of the tall ad and the bottom 22 percent of the square ad; white with navy text; an initials tile (D-25) and the thin rule above the band in the brand colour (D-24); the name in bold, then title and NMLS number; the company and company NMLS number; the disclosure line along the bottom; a placeholder band ("Your name and NMLS number go here") when the person has no brand; a long name wraps to two lines, then shrinks to a floor, then truncates.

Brand gains three fields, saved beside the report brand (not inside the homeowner report contract, so homeowner reports are unaffected): **Title** (optional), **Brand colour** (one of six presets; the initials tile's letters pass 4.5:1 on each), and **Disclosure line** (default "Equal Housing Opportunity.").

Because PRD-009 has no logo upload, three design strings that promise a logo are corrected so the product never says something it cannot do:

| Where | Design string | PRD-009 string |
|---|---|---|
| Home lead | "Your name, NMLS number and logo go on it for you." | "Your name and NMLS number go on it for you." |
| Checklist brand item | "Your name, NMLS number and logo. They go on every ad automatically." | "Your name and NMLS number. They go on every ad automatically." |
| Library lead | "Your name, NMLS number and logo go on each one automatically." | "Your name and NMLS number go on each one automatically." |

### D4. Where it shows (D-18, D-23)

Places, not people: one or more cities or states, typed by name ("Austin, TX" or "Texas"), shown as chips each with a 44 px remove button, saved by name, and matched to Meta's locations only once Meta is connected (future work). The first time the field is empty; afterwards the person's last area is prefilled. "Shows in: the Facebook feed." There is no control for radius, ZIP code, age, gender, interests, or audiences. The manifest records country `US`, the states as regions, the cities, and `placements: ["facebook_feed"]`, and the existing `TARGETING_NOT_ALLOWED` rule still applies.

The hint is "Mortgage ads can't be aimed by age, gender or ZIP code, so you choose places, not people." Its second clause in the design, "Meta may also widen a small area", ships only if 009D-AC-012 confirms it.

### D5. Checks on the words, the brand, and the dates

The library-ad ruleset keeps every shared rule (disclosure, consent, images, banned phrases, claims, financing terms, housing category, targeting, budget, routing) and adds:

| Rule | Blocks when | Plain fix |
|---|---|---|
| `WORDS_TOO_LONG` | the headline or primary text exceeds the ad's `editable` limit | "Shorten the headline to 60 characters or fewer." (or the text's limit) |
| `WORDS_RATE_PAYMENT_OR_TERM_CLAIM` | the words state a rate, APR, payment, down payment amount, loan term, or a teaser such as "low rates" (`compliance-and-risk.md:48`) | "Take 'low rates' out of the headline. Ads can't state rate claims." |
| `WORDS_REALTOR_OR_BROKERAGE_NAME` | the words contain a saved Realtor partner's name or brokerage | "Take <name> out of the ad text. Paid ads show only you." |
| `NMLS_NUMBER_REQUIRED` | the frozen brand has no NMLS number | "Add your NMLS number in Brand." |
| `EQUAL_HOUSING_REQUIRED` | the disclosure line has no Equal Housing statement | "Add the Equal Housing line to your disclosure in Brand." |
| `RUN_DATES_INVALID` | the end date is not after today | "Choose an end date after today." |
| `LIBRARY_AD_RETIRED` | the ad was retired before the check ran (009c D4) | "Choose another ad. Your budget, dates and area are kept." |

The claim detector is deterministic (patterns, not a model). Whether the law requires the NMLS number on every mortgage ad is not asserted (UNVERIFIED; G7 counsel); the band prints it, so the check keeps it from printing empty.

### D6. Budget and dates (D-22)

Daily $25, "Starts: when you launch it", "Ends" 14 days out, and a total prefilled as daily times days ($350). All editable within the ruleset's bounds (`open-house-draft.ts:178-180`: $5 to $1,000 a day, at most $5,000 in total).

### D7. Launch is a separate, honest button (D-9)

In PRD-009 "Launch on Facebook" is always disabled. A pure function chooses its one sentence:

| Meta | Ad | Version | Launching for the workspace | Sentence |
|---|---|---|---|---|
| Not connected | any | any | any | Meta isn't connected yet, so connect it in Settings to launch this ad. |
| Connected | retired | any | any | This ad was taken out of the library on <date>, so this campaign can't launch. |
| Connected | active | not approved | any | Approve this version first. |
| Connected | active | approved | not turned on | Launching on Facebook isn't turned on for your workspace yet. Nothing has been published. |

In the product the Meta input is always "not connected", because nothing stores a Meta connection; the other rows are reached only in tests.

### D8. The PRD-008b states, and where each appears

Every surface reads the recorded decision, not only the stored state (008B-AC-004, 008B-AC-009 to 008B-AC-011).

| State | Step 3 | Campaign page (009e) | Campaigns list (009e) | Home (009b) |
|---|---|---|---|---|
| Ready for approval, no decision | Approve (primary) and Send back; Launch disabled with the D7 sentence | Same approve card | Chip "Ready for approval" | Under "Needs your approval" |
| Ready for approval, viewer can't approve | "You can't approve campaigns in this workspace. Send this link to an approver." with "Copy the link" | Same hand-off card | Chip "Ready for approval" | Not shown to this viewer |
| Needs changes | Chip "Needs changes", the plain fix, "Fix it" (primary); Approve disabled with its reason | Same, with "Make a new version" | Chip "Needs changes" | Not listed |
| Approved | Chip "Approved", "Approved by <name> on <date>. The approval covers this version only."; Launch disabled with the D7 sentence | Same | Chip "Approved" | Not listed |
| Sent back for changes | "It was sent back for changes, so it needs a new version before anyone can approve it." and "Make a new version" (primary); no approve, no hand-off | Same; the version list shows who sent it back | Chip "Sent back for changes" | Never listed |
| Ad retired (undecided) | Chip "Ad retired", the notice, "Choose another ad" | Same | Chip "Ad retired" | Not listed |

Existing strings are reused from `apps/web/src/copy/user-language.ts` (`CHECK_RESULT_READY` and `CHECK_RESULT_NEEDS_CHANGES` at `:194-195`, `CAMPAIGN_SENT_BACK_LABEL` and `CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION` at `:203-204`), not copied.

### D9. Targets (design section 6.4)

For a workspace owner who can approve, from Home:

- **First campaign:** 6 activations to approval (Choose an ad, Use this ad, Add, Save and check, Approve this version, Yes, approve) and 1 typed field (one city or state).
- **Every campaign after:** 5 activations and 0 typed fields, because the area is remembered.
- **0 checkboxes, 0 uploads, 0 overlay steps.**
- **Sign-up to approved in under 300 seconds** (009G-AC-008).

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009D-AC-001 | `/marketing/campaigns/new` is the three-step flow of D1 ("Choose an ad", "Set it up", "Review and launch") with the existing `Stepper` primitive showing "Step N of 3" and Done marks; `?step`, `?topic`, and `?ad` behave as D1 states; Back keeps typed words; a reload on step 3 re-reads the saved version. | Component, Browser (review) |
| 009D-AC-002 | Step 1 is D2: 009c's cards and chips inside the step indicator, filtered by `?topic`, "Use this ad" opening step 2 directly, every card button secondary, and "Cancel" returning to the page the person came from. With an empty library it shows 009C-AC-012's sentence. | Component, Integration |
| 009D-AC-003 | The Brand page saves the three fields of D3 beside the report brand, with the report brand contract unchanged; a unit test proves each colour preset's initials tile passes 4.5:1. When a person has a setup profile but no saved brand, the Brand form is prefilled from it (009B-AC-012). | Unit, Component, Postgres |
| 009D-AC-004 | The brand band renders as D3 states at both shapes; with no brand it shows the placeholder band; a name of 80 characters wraps, shrinks to the floor, and then truncates without overflowing. The band's text is navy on white in both themes. | Component, Browser (review) |
| 009D-AC-005 | Step 2's brand card is a read-only summary of what the band will carry, with "Change in Brand" and "Added for you from Brand. The image and layout come from the library and can't be changed." There is no control that changes the image or layout. | Component |
| 009D-AC-006 | Step 2's Headline and Ad text are prefilled with the ad's library words, editable within its `editable` limits, each with a live character count that a screen reader can reach, and "Use the library words" restores both. The disclosure line is shown locked. The hint "Don't add rates, payments or loan terms here. The checks will send them back for changes." sits beside the words. | Component |
| 009D-AC-007 | Step 2's budget and dates follow D6, and a total outside the ruleset's bounds is refused with the field's message. | Component, Unit |
| 009D-AC-008 | Step 2's "Where it shows" follows D4: city and state chips with 44 px remove buttons, the first-time empty field, the remembered area on later campaigns, "Shows in: the Facebook feed.", and the hint. A source scan finds no radius, ZIP, age, gender, interest, or audience control in the flow. The saved manifest records the area and `facebook_feed` as D4 states. | Component, Source scan, Postgres |
| 009D-AC-009 | A live preview of the actual ad sits beside the step 2 form at 1440 and 1180 and below it at 768 and 390, titled "Your ad so far", and updates as the words change. | Browser (review) |
| 009D-AC-010 | The rules of D5 exist in the domain's library-ad ruleset with their plain fixes. The claim detector passes a table of at least 30 cases, including "low rates", "3.5% down", "$1,200 a month", "30-year fixed", "APR", "rates as low as", and clean sentences such as "Ask me about first-time buyer programs". A Postgres test proves each rule makes a version need changes. | Unit, Postgres |
| 009D-AC-011 | "Save and check" saves a library-ad version through 009c's builder (the chosen library ad and version, the edited words, the frozen brand, the schedule, the area, the budgets) and opens step 3 for it. The server resolves the ad from the catalog by `id` and current version, refuses an unknown, replaced, or retired ad, and refuses a campaign reference from another location with the same answer as an unknown one. | Postgres route |
| 009D-AC-012 | During the run, `meta-ads-guardian` checks Meta's current official documentation for: the Special Ad Category that applies to everyday mortgage ads (Housing, or Financial products and services); the location types allowed, any minimum radius, and whether Meta widens small areas; the placements allowed; the call-to-action values; the headline and primary text limits; and the feed image sizes. It records each finding with its source address and the date read in `research/<date>-meta-special-ad-category-check.md`, marked VERIFIED or still UNVERIFIED. Any finding stricter than this PRD is applied and recorded in Amendments; the "Meta may also widen a small area" clause ships only if VERIFIED; an UNVERIFIED rule leaves the conservative default (Housing, places only, feed only) in place and its claim out of the copy. | Review, Record check |
| 009D-AC-013 | Step 3 shows the ad in a generic feed frame with no Meta logo or branding, tall (4:5) by default with a Square (1:1) switch; at 1440, 1180, 768, and 390 the measured aspect is within 0.5 percent of the chosen shape. The switch only changes the view, and one line says the approval covers both shapes. A caption says the image comes from the ads library and the band is the person's brand, and makes no claim that the frame matches Facebook exactly. | Component, Browser (review) |
| 009D-AC-014 | Step 3's "What you approve" card shows "Checks passed" or "Needs changes" with the real count of rules run and passed from the stored result (never a constant); "See what we checked" names each rule in plain words through a map exhaustive over the rule codes; then the library ad's name and version, which words were changed ("Headline changed", "Ad text unchanged"), the budget, the run dates, where it shows, "the Facebook feed", and where new leads go ("Your HighLevel account, once it's connected" while HighLevel is not connected), with one "Change" link to step 2. | Unit, Component |
| 009D-AC-015 | Step 3 reuses `CampaignApprovalControls` with the line "Approving applies to this exact version, with your words. Nothing is published or sent." (replacing the line at `campaign-approval-controls.tsx:170`), "Approve this version" with its own "Yes, approve" confirmation, and "Send back for changes"; a viewer who cannot approve gets the hand-off card. The existing approval component and integration tests run against step 3 as well as the campaign page, and 008B-AC-004 to 008B-AC-011 still pass. | Component, Integration, Browser (review) |
| 009D-AC-016 | "Launch on Facebook" renders on step 3 as its own button, separate from Approve, always disabled in PRD-009, with exactly one sentence from D7's function tied to it by `aria-describedby`; the Meta sentence links to `/settings/connections`. A unit test covers every row of D7. | Unit, Component |
| 009D-AC-017 | Nothing pretends to launch: no route under `/api/campaigns` launches or publishes; `provider_publish` stays `available: false` and `providerPublicationAuthorized` stays `false`; `META_ADAPTER_MODE` stays `"fixture-plan"`; `tests/security/provider-side-effect-default-off.test.ts` passes unchanged or strengthened; a source scan finds no screen that labels a campaign Live, Launched, or Running. | Unit, Security test, Source scan |
| 009D-AC-018 | Step 3 renders each state of D8 as the table says. Integration tests cover every state, written red first, alongside the existing 008B tests. | Integration |
| 009D-AC-019 | "Fix it" opens the step that holds what a finding names, through a map from rule code to step that is exhaustive over the rule codes: words, budget, dates, and area to step 2; brand findings to step 2 with "Change in Brand"; a retired ad to step 1. | Unit, Browser (review) |
| 009D-AC-020 | "Make a new version", from the campaign page, a sent-back version, or "Fix it", opens step 2 prefilled from the campaign's latest version (the ad and its version, the words, budget, dates, and area) with the current Brand. Saving appends version N+1 to the same campaign instead of minting a new reference (`open-house-draft.ts:76-79`); the earlier approval does not carry over. This closes PRD-008 follow-up Quality L-15. | Postgres route, Browser (review) |
| 009D-AC-021 | A library-ad version's `brandProfileVersionRef` is derived from the saved brand's revision; its `partnerProfileVersionRef` is a fixed "no partner" reference, because ads carry no Realtor; the compliance and routing references keep their constants with a comment saying no record exists yet. This closes PRD-008 follow-up Quality L-14 for the brand. | Unit, Postgres |
| 009D-AC-022 | A review-project spec drives D9's happy path from Home as a workspace owner who can approve and has a saved brand, counting through a helper: the first campaign takes exactly 6 button and link activations and 1 typed field; a second campaign takes exactly 5 activations and 0 typed fields; neither touches a checkbox or a file input. | Browser (review) |
| 009D-AC-023 | No Realtor identity reaches an ad: the flow reads no Realtor partner data except to check the words (D5); no ad component renders a partner; `evaluatePaidAdBrandBoundary` (`packages/domain/src/campaign-foundation.ts:400-470`) is unchanged. Compliance control 9 holds. | Source scan, Component |

## Files expected to change

- `apps/web/src/app/(authenticated)/marketing/campaigns/new/page.tsx`
- `apps/web/src/features/campaigns/components/` (new step components, the ad preview, the brand band, the launch button; `open-house-draft-builder.tsx` removed) and their tests
- `apps/web/src/server/open-house-draft.ts` (replaced by a library-ad save), `campaign-preflight-handler.ts`, and their tests
- `packages/domain/src/campaign-foundation.ts` and its tests
- The Brand page and editor, `apps/web/src/features/workspace/model.ts`, `apps/web/src/server/workspace-preferences.ts`
- `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx` (the approve line)
- `apps/web/src/copy/launch-messages.ts` (new)
- `tests/browser/review/review-campaign-decision.spec.ts` (extended to step 3) and a new click-count spec
- `research/<date>-meta-special-ad-category-check.md` (new, by `meta-ads-guardian`)

## Test plan

- **Unit:** colour presets (009D-AC-003), budgets (007), the rules and the claim table (010), the rule map and the fix map (014, 019), the launch function (016), profile references (021).
- **Component:** each step and the band (001 to 006, 008, 013 to 016, 023).
- **Integration:** step 1 (002), the PRD-008b states (018), the approval tests on step 3 (015).
- **Postgres (`pnpm test:db`):** brand fields (003), the saved area (008), the rules (010), the save (011), new versions (020), references (021).
- **Browser (review):** steps (001), band and preview (004, 009, 013), approval (015), "Fix it" (019), new versions (020), click and field counts (022).
- **Review and record check:** the Meta rules check (012).
- **Security test and source scan:** nothing launches (017); no Realtor on an ad (023); no forbidden targeting control (008).

## Security notes

- The save trusts no client-supplied ad, version, or campaign reference: each is resolved from the catalog or under the session's tenant context.
- The words are the only free text that reaches an ad, and the deterministic checks read them before any approval.
- The launch button cannot reach a provider: no route exists for it to call.

## Open questions

- [ ] Meta's current Special Ad Category rules, placements, labels, and limits. UNVERIFIED until 009D-AC-012 records them.
- [ ] Whether a mortgage ad must carry the NMLS number by law. Not asserted; G7 counsel.
- [ ] A logo upload for the band. Needs file storage; an owner question for a later PRD (index).

## Related

- [Design direction, sections 5.4 and 6](design/00-direction.md)
- [Open decisions D-18, D-22 to D-25](design/01-open-decisions.md)
- [Mockups: step 1](design/mockups/launch-step-1-choose.html), [step 2](design/mockups/launch-step-2-set-up.html), [step 3](design/mockups/launch-step-3-review-and-launch.html)
- [PRD-008b product correctness](../../completed/prd-008-finish-line-hardening/prd-008b-finish-line-hardening-product-correctness.md)
- [Compliance and risk](../../../knowledge/private/compliance/compliance-and-risk.md)

## Amendments

None yet.
