# PRD-009d: Marketing Toolkit - The Three-Step Launch

> **Parent:** [PRD-009](./prd-009-marketing-toolkit-index.md)
> **Status:** Backlog. Authored 2026-10-01. Not started.
> **Priority:** P0. This is the product's core: "click click launch facebook ads" (OD-B).
> **Schema changes:** None in the database. The campaign manifest contract widens additively (D3).
> **Owner Guardians:** `react-guardian` (the flow); `typescript-node-guardian` (the server save, the contract and domain changes); `meta-ads-guardian` (consulted on the preview's wording only; Meta's frame and image rules stay UNVERIFIED under G3)

## Goal

One flow at `/marketing/campaigns/new`, in three steps, from a property to an approved version and a launch button that tells the truth:

1. **Property and event:** the address, the open house time, photos, an optional line about the home, one permission box.
2. **Make it yours:** the loan officer's brand, the Realtor partner (with the partner's recorded agreement to co-branded ads), the ad words, the budget.
3. **Review and launch:** the actual ad at its real shape, what the approval covers, "Approve this version" with its own confirmation, and "Launch on Facebook", disabled with one sentence until Meta is connected and launching is turned on.

Every PRD-008b truthfulness rule holds on every surface that shows a campaign's state.

## Background (honest)

1. **Today's create page** (`apps/web/src/features/campaigns/components/open-house-draft-builder.tsx`) is one long form: address (`:444`), a separate State field (`:452-469`), a required description (`:474-478`), start and end (`:483-494`), a saved-partner select and a required Realtor name (`:502-530`), two permission boxes (`:538-543`), headline, body, call to action, disclosure, consent (`:569-600`), "Where the ad runs" typed by hand (`:625-629`), and budgets (`:633-648`). It posts to `/api/campaigns/preflight` (`:187`). The result appears on the same page (`:713`) with "Open campaign" (`:779`), and approval happens on the campaign page through `CampaignApprovalControls`, which posts to `/api/campaigns/approve` (`campaign-approval-controls.tsx:105`) after "Yes, approve" (`:172-174`).
2. **The server save** (`apps/web/src/server/open-house-draft.ts`) validates a strict input (`:15-37`; the description must be at least 10 characters at `:23`), mints a new campaign reference every time (`:76-79`), records constant profile references (`:90-97`), freezes `property.permissionConfirmed` and `partner.permissionConfirmed` from the two boxes (`:107`, `:126-129`), targets `country: "US"` and one typed region (`:146-152`), and runs preflight with the ruleset minimum image size of 1200 by 630 (`:171-172`).
3. **The contract and the rules.** The manifest requires a non-empty `property.description` (`packages/contracts/src/campaign-foundation.ts:241`) and a `partner` block with a non-empty `realtorDisplayName` (`:275-280`). Preflight blocks on `PARTNER_PERMISSION_REQUIRED` and `PROPERTY_PERMISSION_REQUIRED` (`packages/domain/src/campaign-foundation.ts:305-324`) and allows only country and region targeting (`TARGETING_NOT_ALLOWED`, `:335-350`). No rule reads the description. The application layer already numbers a new version of an existing campaign from the latest one (`packages/application/src/campaign-foundation.ts:270-271`); only the web server never asks it to.
4. **No launch exists, by design.** `/api/campaigns` has only `approve` and `preflight`. `provider_publish` is always `available: false` and `providerPublicationAuthorized` is `false` (`packages/application/src/campaign-workspace-read.ts:101-107`). The Meta adapter is a plan (`packages/ghl/src/meta-adapter.ts:13`).
5. **A compliance control conflicts with the approved design.** The mockups put the Realtor partner's name and brokerage in the paid ad's band. `library/knowledge/private/compliance/compliance-and-risk.md:19` (control 9) and `:31`, PRD-001 principle 13 (`prd-001-operation-automated-lo-index.md:29`) and `:129`, PRD-001c `:48`, and PRD-001e `:7` say paid ads use loan-officer or lender identity only, and the domain's paid-ad brand boundary enforces that for the future publish path (`evaluatePaidAdBrandBoundary`, `packages/domain/src/campaign-foundation.ts:400-470`, rules `PAID_AD_REALTOR_IDENTITY` and `PAID_AD_REALTOR_ASSET`). The owner's decisions OD-B and OD-G and his acceptance of the mockups ask for co-branding. The index records this as AD-1; D5 below makes it one switch.
6. **L-14 and L-15 from PRD-008.** The close-out quality report left two follow-ups this flow can close: approval records carry constant profile references (`brandprofile_local001` and three more, Quality L-14), and no route saves a new version of an existing campaign although some sentences promise one (Quality L-15).

## Scope

- `apps/web/src/app/(authenticated)/marketing/campaigns/new/**` and new components under `apps/web/src/features/campaigns/` for the three steps, the ad preview, and the launch button.
- `apps/web/src/server/open-house-draft.ts`, `apps/web/src/server/campaign-preflight-handler.ts`, and their tests.
- `packages/contracts/src/campaign-foundation.ts` and `packages/domain/src/campaign-foundation.ts` (the widenings of D3, the rule of D6).
- `apps/web/src/features/workspace/model.ts` and the partner editor (the consent of D4), and the brand editor (the ad color of D4).
- A new `apps/web/src/copy/launch-messages.ts`.

## Non-Goals

- Publishing anything. No launch route, no Meta or HighLevel call, no inline launch confirmation, no publishing progress states: those belong to the future Meta publish PRD, behind G3 and the counsel review.
- A raster ad image for Meta upload (the future Meta publish PRD).
- Changing `evaluatePaidAdBrandBoundary`. It stays as it is until the Meta publish PRD reconciles it with AD-1's answer.
- Targeting by radius around the property. Targeting stays country and region (Background 2).

## Design decisions

### D1. Steps, addresses, and what is saved when

The step is in the address (`?step=1`, `2`, or `3`). Steps 1 and 2 hold the person's typing in the page; nothing is saved until "Save and check" on step 2, which saves the version and runs the checks (today's "Save and run the checks"). Step 3's address carries the saved campaign reference, so a reload re-reads it. A reload on step 1 or 2 starts again at step 1 with the profile prefills and one line saying nothing was saved yet. Back moves between steps without losing what was typed. Photos are stored as they are added (009c), so a photo can outlive an abandoned draft; that is recorded in the retention documents (009C-AC-016).

### D2. The state comes from the address

There is no State field. A pure parser reads the two-letter state from the address ("418 Sample Oak Drive, Austin, TX 78701"), checked against the list of US states, the District of Columbia, and the territories. With no state, the field says so and gives an example. Link import supplies the state directly.

### D3. Additive contract widenings

- `property.description` accepts an empty string (D-13). No rule reads it.
- `partner` becomes optional, so "No partner" is a true record, and gains an optional `brokerage`. `PARTNER_PERMISSION_REQUIRED` applies only when a partner is present.
- A new optional `advertiser` block freezes what the ad shows about the loan officer: name, company, NMLS number, and the ad color. New versions always carry it. Versions saved before PRD-009 still parse.

Each widening admits every manifest the old contract admitted, which is the same reasoning PRD-008b used when it removed `.min(1)` from `images` (008b Amendments).

### D4. The partner's agreement and the brand's ad color live on their records

- **Partner (D-7).** `PartnerSchema` (`apps/web/src/features/workspace/model.ts`) gains `coBrandedAdsConsent`: null, or the time it was recorded and who recorded it. The partner form asks with one explicit box ("<Name> agreed to appear in co-branded ads.") and shows who recorded it and when. Recording or withdrawing it writes an `audit.events` row (`app_runtime` may insert, `supabase/migrations/20260721010000_platform_foundation.sql:1760`). At save, `partner.permissionConfirmed` is the chosen partner's consent, and step 1 no longer asks about the Realtor's materials.
- **Brand.** The brand gains one ad color chosen from six presets, each passing 4.5:1 with white text. It is stored beside the brand, not inside the homeowner report brand contract, so homeowner reports are unaffected. A logo is out of scope (index Non-Goals).

### D5. AD-1 as one switch

`REALTOR_ON_PAID_AD_POLICY` is one exported constant with two values:

- `with_recorded_consent` (the default, per the owner's decisions): the ad band shows the partner's name and brokerage only when the chosen partner's consent is recorded.
- `never`: the ad shows no Realtor identity whatever the partner choice; the partner is still recorded on the campaign.

If the owner or counsel answers AD-1 the other way, the change is this one value plus its baseline pictures.

### D6. One new rule: the NMLS number is on the ad

Preflight gains `NMLS_NUMBER_REQUIRED`, blocking when a version's `advertiser` block has an empty NMLS number. The ad band always prints the number, so the check keeps the band from printing an empty one. Versions with no `advertiser` block are unaffected. Whether a mortgage ad must carry the NMLS number by law is not asserted here (UNVERIFIED; G7 counsel).

### D7. The ad preview

An HTML component, not an image: a generic feed post (page name from the brand, "Sponsored", the ad text, the image, the headline, the call to action) with no Meta logo or Meta branding. The image area is exactly 4:5 (1080 by 1350) by default, with a Square (1:1, 1080 by 1080) switch (D-10). The image is the first photo with a band in the brand's ad color carrying the open house time, the address, the loan officer's name and NMLS number, the partner per D5, and the Equal Housing Opportunity line from the disclosure. With no photo it shows a plain "No photo yet" panel, never a stock or placeholder photo. The shape switch only changes the view: both shapes render from the same saved version, and one line says the approval covers both. The caption says this is a preview of how the ad can look in a feed and that its colors are the brand's; it does not claim to match Facebook exactly.

### D8. Launch is a separate, honest button

Approve and Launch are two acts with two buttons (D-9). In PRD-009 "Launch on Facebook" is always disabled. A pure function chooses its one sentence:

| Meta | Version | Launching for the workspace | Sentence |
|---|---|---|---|
| Not connected | any | any | Meta isn't connected yet, so connect it in Settings to launch this ad. |
| Connected | not approved | any | Approve this version first. |
| Connected | approved | not turned on | Launching on Facebook isn't turned on for your workspace yet. Nothing has been published. |

In the product, the Meta input is always "not connected" because nothing stores a Meta connection; the other rows are reached only in tests.

### D9. The PRD-008b states, and where each appears

Every surface reads the recorded decision, not only the stored state (008B-AC-004, 008B-AC-009 to 008B-AC-011).

| State | Step 3 | Campaign page (009e) | Campaigns list (009e) | Home (009b) |
|---|---|---|---|---|
| Ready for approval, no decision | Approve (primary) and Send back; Launch disabled with the D8 sentence | Same approve card; chip "Ready for approval" | Chip "Ready for approval" | Under "Needs your approval" |
| Ready for approval, viewer can't approve | "You can't approve campaigns in this workspace. Send this link to an approver." with "Copy the link" | Same hand-off card | Chip "Ready for approval" | Not shown to this viewer |
| Needs changes | Chip "Needs changes", what to fix in one plain line, "Fix it" (primary); Approve disabled with its reason | Same chip and fix list; "Make a new version" | Chip "Needs changes" | Not listed |
| Approved | Chip "Approved", "Approved by <name> on <date>. The approval covers this version only."; Launch disabled with the D8 sentence | Status "Approved"; Launch disabled with the same sentence | Chip "Approved" | Not listed |
| Sent back for changes | Chip "Sent back for changes", "It was sent back for changes, so it needs a new version before anyone can approve it.", "Make a new version" (primary); no approve, no hand-off | Same chip; the version list shows who sent it back and when | Chip "Sent back for changes" | Never listed |

The quoted strings that exist today come from `apps/web/src/copy/user-language.ts` (`CHECK_RESULT_READY` and `CHECK_RESULT_NEEDS_CHANGES` at `:194-195`, `CAMPAIGN_SENT_BACK_LABEL` and `CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION` at `:203-204`) and are reused, not copied.

### D10. Targets from the design

For a workspace owner who can approve, has a saved brand, and has used a consented partner before, the happy path from Home is (design section 5.4):

- **6 clicks to approval:** Start, Add photos, Continue, Save and check, Approve this version, Yes, approve. Changing the preselected partner adds 1.
- **3 typed fields:** the address, the date, the start time.
- **1 checkbox** and **1 photo upload**.
- **No overlay steps.**
- **Sign-up to approved in under 300 seconds.**

009g measures these (009G-AC-008, 009G-AC-009).

## Acceptance criteria

| ID | Criterion | Test |
|---|---|---|
| 009D-AC-001 | `/marketing/campaigns/new` is the three-step flow of D1, with the existing `Stepper` primitive showing "Step N of 3" and Done marks. The step is in the address; Back keeps typed values; a reload on step 3 re-reads the saved version; a reload on step 1 or 2 returns to step 1 with prefills and the "nothing saved yet" line. | Component, Browser (review) |
| 009D-AC-002 | Step 1 holds: Property address (prefilled from Home), Date, Starts, Ends (prefilled two hours after Starts, with the hint saying so), Photos (009c upload; the first photo is labelled "In the ad", and the stated limits show before a file is picked), "About the home" (optional, one line, at most 200 characters), the link import control as a secondary action (009c), and one box "I have permission to market this property and to use these photos in ads." Actions: Cancel (secondary, back to Campaigns, nothing saved) and Continue (primary). There is no State field and no Realtor box. | Component |
| 009D-AC-003 | The parser of D2 returns the state for at least 20 table cases (commas, ZIP and ZIP+4, extra spaces, lower case, DC, a territory) and none for addresses without a state. With none, Continue does not advance and the field says to add the state, with an example. | Unit, Component |
| 009D-AC-004 | The contract and the save accept an empty description (D3); `open-house-draft.ts` no longer requires 10 characters; a Postgres test saves and approves a version with an empty description. | Unit, Postgres |
| 009D-AC-005 | Step 2's brand card shows the saved brand's name, company, NMLS number, and ad color with "Change in Brand". With no saved brand it is the short brand form in place, prefilled from `setup_profile.v1` (009B-AC-012); saving it writes the brand through the existing preference command and keeps the person in the flow. The ad color is one of six presets, and a unit test proves each preset gives white text at least 4.5:1. | Component, Postgres, Unit |
| 009D-AC-006 | Step 2's partner choice shows each saved partner as a radio card that states the consent ("Agreed to co-branded ads on <date>." or "Hasn't agreed to co-branded ads yet."), plus "No partner" and "Add a Realtor partner", which adds a partner (with the consent box) without leaving the flow. The partner on this person's most recent campaign version is preselected. | Component, Integration |
| 009D-AC-007 | The partner record and form carry the consent of D4: recording and withdrawing both work from `/partners` and from step 2, show who recorded it and when, and each writes one `audit.events` row naming the actor, location, partner, and action. A unit test proves 25 partners, each with consent, fit the 16 KiB preference row limit (`supabase/migrations/20260919160000_user_preferences.sql`). | Unit, Postgres |
| 009D-AC-008 | At save, `partner.permissionConfirmed` equals the chosen partner's consent at that moment; "No partner" saves no partner block; `PARTNER_PERMISSION_REQUIRED` fires only when a partner without consent is chosen. The per-campaign Realtor box (`open-house-draft-builder.tsx:542-543`) is gone. | Unit, Postgres |
| 009D-AC-009 | `REALTOR_ON_PAID_AD_POLICY` exists as D5 states with the default `with_recorded_consent`. Component tests render the ad under both values with a consented partner, an unconsented partner, and no partner, and assert where Realtor identity appears and where it never does. | Unit, Component |
| 009D-AC-010 | Step 2's ad words are prefilled from the starter text (`apps/web/src/features/guided-setup/model/profile.ts:49-56`) and this open house, and are editable: Headline, Ad text, and the call to action. The disclosure is shown locked under the label "Disclosure". The lead form's consent wording is prefilled behind a "Lead form wording" disclosure. Daily $25 and total $125 are prefilled (`profile.ts:94-95`). | Component |
| 009D-AC-011 | "Where the ad runs" is prefilled with the full name of the address's state and is editable inside a disclosure. The sentence under the budget names that area ("The ad runs in <area> until the open house ends. Housing ads have their own rules. We apply them for you, every time.") and never says "around the property", because targeting is country and region only (Background 2). | Component |
| 009D-AC-012 | A live preview (D7) sits beside the step 2 form at 1440 and 1180 and below it at 768 and 390, titled "Your ad so far", and updates as the fields change. | Browser (review) |
| 009D-AC-013 | "Save and check" posts the version (address, state, description, times, photo references, partner, ad words, budgets, area, the property box, and an optional import receipt) and, on success, opens step 3 for the saved version. The server accepts only photo references whose rows belong to the session's location, refusing any other with the same 400 whether or not it exists; it records each photo as an image with its stored width and height, alt text "Photo of the home at <address>", and `approvalStatus` `approved` when the property box is ticked, otherwise `pending`. It records the `advertiser` block of D3 from the saved brand. | Postgres route |
| 009D-AC-014 | The version's `brandProfileVersionRef` is derived from the saved brand's revision and its `partnerProfileVersionRef` from the chosen partner and its consent time, or a fixed "no partner" reference; the compliance and routing references keep their constants, with a comment saying no record exists yet. This closes PRD-008 follow-up Quality L-14 for brand and partner. | Unit, Postgres |
| 009D-AC-015 | Step 3 renders the ad of D7. At 1440, 1180, 768, and 390 the image area's measured aspect is within 0.5 percent of 4:5 by default and of 1:1 after choosing Square. The band's text passes 4.5:1 on the ad color. With no photo, the "No photo yet" panel shows. | Component, Browser (review) |
| 009D-AC-016 | The preview's caption and labels make no claim that the ad matches Facebook exactly, show no Meta logo, and say the colors are the brand's. No raster image is produced. | Component |
| 009D-AC-017 | Step 3's "What you approve" card shows the chip "Checks passed" or "Needs changes", the real count of rules run and passed from the stored check result (never a constant), a "See what we checked" list naming each rule in plain words, the budget, the run dates, who sees the ad (the area), and where new leads go ("Your HighLevel account, once it's connected" while HighLevel is not connected), with one "Change" link to step 2. The plain names come from a map that is exhaustive over the domain's rule codes, so an unmapped code fails the typecheck. | Unit, Component |
| 009D-AC-018 | Preflight has the `NMLS_NUMBER_REQUIRED` rule of D6, explained as "Add your NMLS number in Brand." A Postgres test proves a version whose brand has no NMLS number needs changes, and a pre-PRD-009 version without an `advertiser` block is unaffected. | Unit, Postgres |
| 009D-AC-019 | Step 3 reuses `CampaignApprovalControls` with its copy, "Approving applies to this exact version. Nothing is published or sent.", "Approve this version" with its own "Yes, approve" confirmation, and "Send back for changes"; a viewer who cannot approve gets the hand-off card. The existing approval component and integration tests run against step 3 as well as the campaign page, and 008B-AC-004 to 008B-AC-011 still pass. | Component, Integration, Browser (review) |
| 009D-AC-020 | "Launch on Facebook" renders on step 3 as its own button, separate from Approve, always disabled in PRD-009, with exactly one sentence from D8's function tied to it by `aria-describedby`; the Meta sentence links to `/settings/connections`. A unit test covers every row of D8. | Unit, Component |
| 009D-AC-021 | Nothing pretends to launch: no route under `/api/campaigns` launches or publishes; `provider_publish` stays `available: false` and `providerPublicationAuthorized` stays `false`; `META_ADAPTER_MODE` stays `"fixture-plan"`; `tests/security/provider-side-effect-default-off.test.ts` passes unchanged or strengthened; a source scan finds no screen that labels a campaign Live, Launched, or Running. | Unit, Security test, Source scan |
| 009D-AC-022 | Step 3 renders each state of D9 as the table says. Integration tests cover every state, written red first, alongside the existing 008B tests. | Integration |
| 009D-AC-023 | "Fix it" opens the step that holds the field a finding names, through a map from rule code to step that is exhaustive over the rule codes (property, dates, photos, and the property box to step 1; brand, partner, words, budget, and area to step 2). | Unit, Browser (review) |
| 009D-AC-024 | "Make a new version", from the campaign page, a sent-back version, or "Fix it", opens step 1 prefilled from the campaign's latest version (address, times, description, photos, partner, words, budgets, area). Saving it appends version N+1 to the same campaign: the server passes the existing campaign reference instead of minting one (`open-house-draft.ts:76-79`) and refuses a reference from another location with the same answer as an unknown one. The earlier version's approval does not carry over. This closes PRD-008 follow-up Quality L-15. | Postgres route, Browser (review) |

## Files expected to change

- `apps/web/src/app/(authenticated)/marketing/campaigns/new/page.tsx`
- `apps/web/src/features/campaigns/components/` (new step components, the ad preview, the launch button; `open-house-draft-builder.tsx` replaced) and their tests
- `apps/web/src/server/open-house-draft.ts`, `apps/web/src/server/campaign-preflight-handler.ts`, and their tests
- `packages/contracts/src/campaign-foundation.ts`, `packages/domain/src/campaign-foundation.ts`, and their tests
- `apps/web/src/features/workspace/model.ts`, `apps/web/src/features/workspace/preference-editors.tsx`, `apps/web/src/server/workspace-preferences.ts`
- `apps/web/src/copy/launch-messages.ts` (new)
- `tests/browser/review/review-campaign-decision.spec.ts` (extended to step 3)

## Test plan

- **Unit:** the parser (003), ad color contrast (005), the consent size bound (007), the manifest mapping (008, 013, 014), the policy (009), the rule map and the NMLS rule (017, 018), the launch function (020), the fix map (023).
- **Component:** each step (001, 002, 005, 006, 010, 011), the preview (009, 015, 016), the approval card (017, 019), the launch button (020).
- **Integration:** the PRD-008b states on step 3 (022) and the existing approval tests (019).
- **Postgres (`pnpm test:db`):** empty description (004), brand and partner writes and audit rows (005, 007), the save with photos and the advertiser block (013, 014), the NMLS rule (018), new versions (024).
- **Browser (review):** steps and reloads (001), preview placement and shape (012, 015), approval on step 3 (019), "Fix it" (023), a new version (024).
- **Security test and source scan:** nothing launches (021).

## Security notes

- The save trusts no client-supplied photo, partner, or campaign reference: each is resolved under the session's tenant context.
- The consent record is per person in `platform.user_preferences` and is mirrored to `audit.events`, which is append-only; the campaign version freezes the consent state it was saved with.
- The launch button cannot reach a provider: no route exists for it to call.

## Open questions

- [ ] **AD-1 (index).** Whether the Realtor partner appears in the paid ad. Default `with_recorded_consent`; counsel reviews before any live launch (009F-AC-014). Not blocking for the run.
- [ ] Meta's feed frame, button labels, and image text rules are UNVERIFIED (G3). The preview says it is a preview; the Meta publish PRD owns exactness.

## Related

- [Design direction, section 5](design/00-direction.md)
- [Mockups: step 1](design/mockups/create-step-1-property.html), [step 2](design/mockups/create-step-2-make-it-yours.html), [step 3](design/mockups/create-step-3-review-and-launch.html)
- [PRD-008b product correctness](../../completed/prd-008-finish-line-hardening/prd-008b-finish-line-hardening-product-correctness.md)
- [PRD-008 follow-ups L-14 and L-15](../../completed/prd-008-finish-line-hardening/prd-008-finish-line-hardening-index.md)
- [Compliance and risk](../../../knowledge/private/compliance/compliance-and-risk.md)

## Amendments

None yet.
