# PRD-006b: First-Party Sign-In and Guided Experience - User Language, Not Operator Language

> **Parent:** [PRD-006](./prd-006-first-party-sign-in-and-guided-experience-index.md)
> **Status:** Draft
> **Priority:** P0 (owner requirement 2)
> **Schema changes:** None
> **Owner Guardians:** `technical-writing-craft-guardian` (the review step and the contract's prose), `react-guardian` (component and page edits), `library-guardian` (the durable contract document and the public docs), `ux-ui-guardian` (copy fits the screens)

## Goal

Every word a signed-in loan officer reads, and every word on the sign-in, sign-up, forgot-password, reset, and verification pages, is written for a mortgage loan officer: plain, warm, specific, in the second person, with none of the engineering or operator vocabulary the product currently shows. Honesty is preserved in that language: the not-connected states of PRD-004 stay true, but they read like "HighLevel and Meta aren't connected yet, so these numbers aren't live" rather than like an internal status report. A contract defines the rules, an inventory names every string to change, an automated guard keeps the vocabulary out, and a writing review confirms the result.

## Background (honest)

Verified in the worktree at `a3b06e6` on 2026-09-19.

**Where copy lives.** There is no copy module, string table, or i18n layer. User-facing strings sit in four places: inline JSX in every screen component under `apps/web/src/features/**/components/*.tsx` and every `page.tsx`; the review-mode string table in `apps/web/src/server/authenticated-workspace-data.ts:28-99` (the only centralized copy in the product, and it is exclusively review-mode strings); fixture data files (`apps/web/src/fixtures/ui-foundation/synthetic-ui.ts`, `apps/web/src/features/brand/model/synthetic-brand-profile.ts`, `apps/web/src/features/reporting/model/*.ts`); and presentation-state maps (`apps/web/src/features/overview/model/overview-state.ts:10-77`, `apps/web/src/server/runtime-authentication.ts:419-426`, `packages/ui/src/components/metric.tsx:19-28`, `async-state.tsx:12-20`, `onboarding-checklist.tsx:12-16`).

**The vocabulary a loan officer sees today**, by surface, with the strings verified line by line:

- The shell banner: `REVIEW_SURFACE_DISCLOSURE` at `authenticated-workspace-data.ts:31-32` reads "REVIEW SURFACE. Demo fixtures only. Not connected to HighLevel, Meta, or Stripe. These numbers are not live customer data." It renders at `apps/web/src/features/shell/components/app-shell.tsx:171` and `review-not-connected-screen.tsx:48`. The headline "REVIEW / DEMO / NOT CONNECTED" is a literal duplicated at `app-shell.tsx:173` and `review-not-connected-screen.tsx:47` with no shared constant. The banner's `aria-label` is "Review surface. Demo, not connected" (`app-shell.tsx:160-163`). The topbar eyebrow is "Current HighLevel location" (`app-shell.tsx:147`) even when the line beneath says "No verified location".
- Identity: with a verified session the shell renders the canonical references as names, `principal.actorRef` and `principal.locationRef` (`runtime-authentication.ts:494,499`), so a real user would see `actor_<32 hex>` as their name. PRD-006a closes that gap (006A-AC-028). Without a session the layout renders "Not signed in", "No verified session on this request", "No verified location", "No first-party session was presented, so no location was resolved." (`layout.tsx:35-42`), "No verified session was presented with this request." and "Go to review sign-in" (`layout.tsx:97-99`), and "Sign out of the review session" (`layout.tsx:93`). Restricted navigation says "Requires <role>. Ask an authorized resolver for access." (`apps/web/src/features/shell/model/navigation.ts:49-50`).
- Role tokens rendered raw: "location_admin or campaign_approver" as `requiredRole` at `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:119,128,138,147,157`, and in prose at line 137 ("Only a verified human with campaign_approver or location_admin may approve."); `campaign.approval.actorRole` rendered unmapped at `persisted-campaign-screen.tsx:120`. The role label map at `runtime-authentication.ts:419-426` is prose but says "Location administrator" and "Platform support".
- Error codes rendered raw: `record.error` such as `CAMPAIGN_APPROVAL_CONFLICT`, `FORBIDDEN`, `UNAUTHENTICATED`, `WORKSPACE_UNAVAILABLE`, `INVALID_CAMPAIGN_COMMAND` reach the status line at `campaign-approval-controls.tsx:63,72,102`, and `INVALID_CAMPAIGN_DRAFT`, `CAMPAIGN_PREFLIGHT_FAILED` reach the create page at `open-house-draft-builder.tsx:67,217`.
- Hashes and references rendered raw under "Immutable evidence": `open-house-draft-builder.tsx:278-283` and `persisted-campaign-screen.tsx:157-162` (`campaignVersionRef`, `manifestHash`, `preflightResultHash`); "Exact version <ref>" at `persisted-campaign-screen.tsx:77-78`; rule codes as headings at `open-house-draft-builder.tsx:267` and `persisted-campaign-screen.tsx:100`.
- Engineering register on the campaign screens: "Build one frozen campaign version and run the same deterministic preflight contract used by the production application layer." (`open-house-draft-builder.tsx:84-86`), "Persisted campaign draft" (:92), "This flow freezes an immutable campaign version..." (:94-97), "Freeze draft and run preflight" (:210), "Could not compile draft" (:216), "Frozen version" (:232), "Preflight passed" (:233), "The frozen draft passed the deterministic founding ruleset." (:262); "Persisted tenant campaign record" (`persisted-campaign-screen.tsx:26-28`), "The immutable campaign version, deterministic preflight evidence, and legal state are stored for this location. Provider publication remains disabled." (:31-33), "Deterministic gate" (:85), "Human decision" (:114), "Role-aware next step" (:131); "Only campaigns for the verified location are listed. Provider publication is disabled." (`marketing/campaigns/page.tsx:25`), "Create an Open House Boost to persist a tenant-backed campaign record." (:32), "Open persisted campaign" (:46); the approval control's "Approval binds to this exact campaign version and preflight hash..." (`campaign-approval-controls.tsx:81-84`) and "Recorded approved. Provider publication remains disabled." (:35,68-69).
- Overview: "Last system verification: none. The review surface performs no live verification." (`apps/web/src/features/overview/components/overview-screen.tsx:46`), "Last safe server-shaped evidence" (:74), "Authority-aware shortcuts" (:94), "Synthetic leads are excluded..." (:110), "Create an Open House Boost to persist a tenant-backed campaign." (:159), "Source-bearing metrics" (:243), "Exception code" and "Correlation ID" as visible labels (:313,317); "Overview edge-state matrix" and "Deterministic evidence" (`overview-edge-state-matrix.tsx:17-18`); the review metric source "Not connected. Review surface has no live spend, leads, or CRM feed." (`authenticated-workspace-data.ts:41`); and on every review-mode metric the design-system row "Data type: Synthetic data" (`packages/ui/src/components/metric.tsx:162-163`, because `notConnectedReviewMetric` sets `synthetic: true` at `authenticated-workspace-data.ts:220`).
- Reports: eyebrow "Review surface" (`apps/web/src/app/(authenticated)/reports/page.tsx:28`); in synthetic mode "Authorized synthetic projection" and "Synthetic authorization evidence only" (`reports-screen.tsx:21,33`).
- Onboarding: "Self-onboarding command center" (`apps/web/src/features/onboarding/components/onboarding-screen.tsx:29`), "Progress is a read-only server-shaped projection for..." (:32-33), "Authenticated first-party fallback projection" (:47), "Read-only synthetic readiness evidence" (:52), "Complete these five outcomes with current server-verified evidence." (:65), "Open completion surface" (:128); the review reasons "Review surface. No install, provider read, or verification has been attempted here." and "Unassigned. The review surface has no live seat." (`authenticated-workspace-data.ts:55-57`).
- Settings and connections: "This synthetic read-only view separates required access from granted, missing, and optional capabilities." (`permission-screen.tsx:18-19`), the raw category token rendered at line 37; the review group descriptions at `authenticated-workspace-data.ts:70-75`.
- Brand: "Canonical profile" and "Current canonical profile" (`brand-profile-screen.tsx:30,51`), "Suggestion-only synthetic assistance" (:43), the profile id `synthetic-brand-profile-demo-review` rendered at line 54, raw field state tokens at line 80, and the review strings at `authenticated-workspace-data.ts:77-89`.
- Route boundaries: "The <route> fixture could not be rendered...", "Correlation ID", "Frozen synthetic fixture remains unchanged", "synthetic-route-error" (`apps/web/src/features/shell/components/route-boundary.tsx:23,31-33,49`).
- The landing page and metadata: "Phase 0 evidence harness", "scaffold, contract, and deterministic fixture checks", "Runtime state", and the environment variable name `OALO_REVIEW_SURFACE=authorized` in a code element (`apps/web/src/app/page.tsx:22-32`); the site description "Phase 0 evidence harness and platform scaffold" (`apps/web/src/app/layout.tsx:18`).
- Design-system default labels: "Degraded" (`async-state.tsx:12-20`), "Stale" (`onboarding-checklist.tsx:12-16`), "Verifier version" and "Provider reference" (`onboarding-checklist.tsx:128-134`), "Required role", "Authorized resolver", "Access path", "Last safe state" (`Button.tsx:300-332`).
- URLs a user can see: `/marketing/campaigns/synthetic-open-house-001`, `/public/synthetic-open-house-v3`, `/onboarding/synthetic-lead`.

**Tests that pin the current strings**, which must be updated with the copy, not deleted:

- The review-surface honesty suites: `apps/web/src/app/(authenticated)/overview/overview-review-surface.integration.test.tsx:247-314`, `onboarding/onboarding-review-surface.integration.test.tsx:185-206`, `settings/connections/connections-review-surface.integration.test.tsx:128-154`, `brand/brand-review-surface.integration.test.tsx:93-123`, `reports/reports-review-surface.integration.test.tsx:78-81`, `marketing/campaigns/campaigns-review-surface.integration.test.tsx:175-207` (line 207 pins the `/review/sign-in` redirect target that PRD-006a renames), all driven by the sweep engine `apps/web/src/app/(authenticated)/review-surface-sweep.ts` (`collectFixtureStrings`, `forbiddenReviewStrings`, the per-suite allowances, and `inspectedAttributes` at line 33).
- `apps/web/src/server/authenticated-workspace-data.unit.test.ts:27-287` (the review string table).
- Feature suites: `features/shell/components/app-shell.integration.test.tsx:110-136`, `route-boundary.integration.test.tsx:22-24`, `features/overview/components/overview-screen.integration.test.tsx:47-84` (line 47 pins eight "Synthetic data" rows), `features/onboarding/components/onboarding-screen.integration.test.tsx:49-90`, `features/brand/components/brand-profile-screen.integration.test.tsx:12-38`, `features/reporting/components/reporting-screen.integration.test.tsx:61-94`, `features/campaigns/components/persisted-campaign-screen.integration.test.tsx:41,58`.
- Design system: `packages/ui/src/components/state-primitives.test.tsx:103-105`.

**Already in user language**, and the register to copy: `library/knowledge/public/overview/what-is-automated-lo.md` (for example lines 21-32) and `library/knowledge/public/faqs/open-house-boost-faq.md` (lines 38-48). Two statements there are now wrong: "you do not manage a separate login" (`what-is-automated-lo.md:27`) and "There is no separate account to create" (`open-house-boost-faq.md:23`). PRD-006a creates exactly that account; D9 corrects both.

**Constraints.** No em dash or en dash in any string or document line. The PRD-004 honesty rule (`RGL-002`, `library/requirements/in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md:57`) requires honest not-connected states on the review URL; this sub-PRD changes their wording, never their truth. `docs/operations/review-surface.md:72-79` says the banner "must remain" the current two strings; the index records that PRD-006b supersedes that wording and PRD-005e's proof point 6 (`005E-AC-010`) is satisfied by the replacement banner, whose purpose (no live figure presented as live) is unchanged.

## Scope

- A durable copy contract document and the rules in D1 through D4.
- The copy inventory in D5: every string to change with its file and line, and its replacement or replacement rule.
- A source-level guard and a rendered-output guard (D6).
- Error-code mapping to sentences (D7) and the treatment of references and hashes (D8).
- The public docs (D9).
- The auth pages, emails, and guided-setup steps (D10 gives their strings; PRD-006a and PRD-006c consume them).
- Updating every pinned test.
- The writing review (D11).

## Non-Goals

- Localization or a translation pipeline. One language, English, one register.
- Rewriting the synthetic-mode fixture prose that only local development sees (`apps/web/src/fixtures/ui-foundation/synthetic-ui.ts`, `founding-offer-*`), except where the same component renders in review mode or where a string is a design-system default. Those files are recorded here as out of scope, not forgotten.
- Renaming the synthetic-only demo routes. Review-mode navigation must never link to a `synthetic-*` path (D5), but the demo slugs themselves stay.
- Changing any data model, state name, or acceptance status. The internal vocabulary stays internal.
- Marketing copy, the Marketplace listing, or the public docs beyond the two corrections in D9.

## Design decisions

### D1. Audience, voice, and tone

The reader is a mortgage loan officer who runs open houses with Realtor partners and has never seen this codebase. Rules:

- Second person, present tense, active voice. "You can approve this" not "Approval may be recorded by an authorized approver."
- Plain words over precise-sounding words. "Saved" not "persisted"; "checks" not "preflight"; "your workspace" not "location"; "approver" not "campaign_approver".
- Specific over abstract. Name what the product did, will do, or cannot do yet. "Meta isn't connected yet, so this campaign won't run as an ad" not "Provider publication remains disabled."
- Warm but not chatty. No exclamation marks in status copy. One idea per sentence.
- Sentence case for headings, buttons, and labels. Product names keep their casing: Open House Boost, HighLevel, Meta, Stripe, Automated LO.
- Numbers, dates, and money in the user's format (already the case for currency).
- Honesty is a tone rule, not an exception to one. A not-connected state, a locked action, or an error says what is true and what the user can do next, in the same voice as everything else.

### D2. Forbidden vocabulary

Never rendered to a user, in any case, tense, or compound, in text nodes, `aria-label`, `title`, `alt`, `placeholder`, `<meta name="description">`, page titles, or emails:

| Group | Terms |
|---|---|
| Deployment and testing | review surface, review mode, demo mode, workspace mode, synthetic, fixture, harness, scaffold, stub, contract (as a software noun), deterministic, projection, server-shaped, evidence, verifier, runtime, composition, handler, payload, route (as a noun for a page), region (as a noun for a page area) |
| People and access | operator, persona, principal, tenant, resolver, authorized resolver, seat, entitlement, capability (as an access noun), grant state |
| Sessions and security | session ref, sessionRef, session id, first-party session, verified session, CSRF, correlation, correlation ID, exception code, idempotent, row version, manifest hash, preflight result hash, canonical, definer |
| Data words | provider (say the name: HighLevel, Meta, Stripe), provider mode, preflight (say "checks" or "campaign check"), persisted, persist, immutable, frozen, freeze, compile, mutation, read-only projection, observation, no live observation |
| Identifiers | any `location_`, `actor_`, `principal_`, `installation_`, `session_`, `campaign_`, `correlation_`, `syn-` or `synthetic-` prefixed reference; any UUID; any 64-hex hash; any `OALO_*` or `NEXT_PUBLIC_*` name; any `SCREAMING_SNAKE` code; any `snake_case` state or role token (`location_admin`, `campaign_creator`, `campaign_approver`, `campaign_publisher`, `platform_support`, `realtor_collaborator`, `awaiting_approval`, `not_started`, `permission_restricted`, and the rest) |

References and hashes may appear only inside the collapsed "Details for support" region defined in D8, with plain labels, never as headings, names, or inline prose.

### D3. Preferred vocabulary

| Instead of | Say |
|---|---|
| location, tenant, workspace mode | your workspace |
| principal, actor, user id | you, your name |
| location_admin | workspace owner |
| campaign_creator | campaign creator |
| campaign_approver | approver |
| campaign_publisher | publisher |
| viewer, analyst | viewer |
| platform_support | support |
| persisted, frozen, immutable version | saved, this version |
| preflight, deterministic gate | the checks, campaign check |
| preflight passed / blocked | Ready for approval / Needs changes |
| finding, rule code | what to fix (with the plain explanation first) |
| provider publication remains disabled | This campaign won't run as an ad yet. HighLevel and Meta aren't connected. |
| not connected (kept), no live observation | not connected yet, not live yet |
| synthetic data, demo fixtures | not live data (review mode), sample data (local demo only) |
| review surface | this workspace (with the not-connected notice) |
| correlation ID, exception code | support reference |
| session, sign-in session | you're signed in, sign out |
| verified first-party session | signed in with your email |
| authorized resolver, responsible party | who can do this |
| required role | who can do this |
| next safe action | what to do next |
| evidence, verification | what was checked, checked on <date> |
| degraded | having trouble |
| stale | needs a refresh |
| entitlement, plan restricted | not included in your plan |
| permission restricted | you don't have access to this |

### D4. Honesty in user language: the exact not-connected strings

These replace the review-mode string table in `authenticated-workspace-data.ts:28-99` and the two banner literals. Meaning is unchanged; only the register moves.

| Today | Replacement |
|---|---|
| Banner headline "REVIEW / DEMO / NOT CONNECTED" (`app-shell.tsx:173`, `review-not-connected-screen.tsx:47`) | "Not connected yet", as one shared constant `NOT_CONNECTED_HEADLINE` |
| `REVIEW_SURFACE_DISCLOSURE` (`:31-32`) | "HighLevel, Meta, and Stripe aren't connected to this workspace yet, so nothing here is live and nothing can be published." |
| Banner `aria-label` "Review surface. Demo, not connected" (`app-shell.tsx:161`) | "Not connected yet: HighLevel, Meta, and Stripe" |
| `REVIEW_NOT_CONNECTED_DETAIL` (`:38`) | "Not connected yet." |
| `REVIEW_NOT_CONNECTED_SOURCE` (`:39-40`) | "HighLevel, Meta, and Stripe aren't connected." |
| `REVIEW_METRIC_SOURCE` (`:41`) | "Not live yet. Connect Meta and HighLevel to see spend and leads here." |
| `REVIEW_NO_OBSERVATION` (`:42`) | "Not live yet" |
| `REVIEW_NEXT_SAFE_ACTION` (`:43-44`) | "Connect HighLevel, Meta, and Stripe when you're ready. Nothing here changes until you do." |
| `REVIEW_NAVIGATION_STATE_DETAIL` (`:45-46`) | "Available once your accounts are connected." |
| `REVIEW_ONBOARDING_REASON` (`:55-56`) | "Nothing to check yet. This step waits for a connected account." |
| `REVIEW_ONBOARDING_RESPONSIBLE_PARTY` (`:57`) | "You, once you connect" |
| `REVIEW_PERMISSION_GROUP_LABELS` (`:63-69`) | "Access this app needs", "Access this app confirms after you connect", "Access this app tells you about when something is blocked", "Optional access" |
| `REVIEW_PERMISSION_GROUP_DESCRIPTION` (`:70-71`) | "You haven't connected HighLevel yet, so there's nothing to confirm here." |
| `REVIEW_PERMISSION_EVIDENCE` (`:72-73`) | "Nothing checked yet." |
| `REVIEW_PERMISSION_IMPACT` (`:74-75`) | "No effect until you connect." |
| `REVIEW_BRAND_PROFILE_SOURCE` (`:79-80`) | "You haven't saved your brand details yet." |
| `REVIEW_BRAND_FIELD_VALUE` (`:81`) | "Not saved yet" |
| `REVIEW_BRAND_FIELD_SOURCE` (`:82`) | "Not confirmed yet" |
| `REVIEW_BRAND_MISSING_REASON` (`:83-84`) | "You haven't confirmed this yet." |
| `REVIEW_BRAND_MISSING_NEXT_ACTION` (`:85`) | "Add it when you're ready." |
| `REVIEW_BRAND_SUGGESTION_VALUE` (`:87-88`) | "No suggestion yet. Add a sample of your marketing first." |
| `REVIEW_BRAND_CONFIDENCE_LABEL` (`:89`) | "No suggestion yet" |
| `REVIEW_LOCATION_DISPLAY_NAME` (`:91`), `REVIEW_USER_DISPLAY_NAME` (`:92`), `REVIEW_ROLE_LABEL` (`:93`) | Replaced by the verified names from PRD-006a (006A-AC-028); the fixture persona is not rendered in review mode |
| Overview heading "Review dashboard (demo, not connected)" (`:236`) | "Overview" with the not-connected notice beneath |
| "Approved sample slot N. None attached on the review surface." (`:352`) | "Sample N: nothing added yet" |
| Unauthenticated shell (`layout.tsx:35-42,97-99`) | The layout redirects to `/sign-in` (PRD-006a); when it must render, "You're signed out", "Sign in to see your workspace" |
| "Sign out of the review session" (`layout.tsx:93`) | "Sign out" |
| "Current HighLevel location" (`app-shell.tsx:147`) | "Your workspace" |
| Metric row "Data type: Synthetic data" (`metric.tsx:162-163`) | "Not live data" (the `synthetic` prop keeps its meaning: the value is not a live observation, in either mode) |

`docs/operations/review-surface.md:72-79` is updated to the two new banner strings.

### D5. Copy inventory: every string to change

Replacement rule R1: rewrite in the D1 voice using D3; R2: move the identifier or hash into "Details for support" (D8); R3: map the code through `user-messages.ts` (D7); R4: render a label from a map, never the token. Rows marked "exact" carry the replacement verbatim.

| File and line | Current | Rule or replacement |
|---|---|---|
| `apps/web/src/app/(authenticated)/layout.tsx:35-42,93,97-99` | see D4 | D4 exact |
| `apps/web/src/features/shell/components/app-shell.tsx:147,160-163,171,173` | see D4 | D4 exact |
| `apps/web/src/features/shell/components/review-not-connected-screen.tsx:47-48` | banner literals | D4 exact, shared constant |
| `apps/web/src/features/shell/model/navigation.ts:49-50` | "Requires <role>. Ask an authorized resolver for access." / "Your validated role does not include this capability. Ask an authorized resolver." | exact: "Only a <role label> can do this. Ask your workspace owner." / "You don't have access to this. Ask your workspace owner." |
| `apps/web/src/server/runtime-authentication.ts:419-426` | "Location administrator", "Platform support" | exact: "Workspace owner", "Campaign creator", "Approver", "Publisher", "Viewer", "Support" |
| `apps/web/src/server/runtime-authentication.ts:434-435` | "Verified first-party session. No HighLevel, Meta, or Stripe connection on this deployment." | exact: "Signed in with your email. HighLevel, Meta, and Stripe aren't connected yet." |
| `apps/web/src/features/overview/components/overview-screen.tsx:46,74,94,110,159,243,313,317` | listed in Background | R1; line 313 "Exception code" and 317 "Correlation ID" become one "Support reference" line (R2) |
| `apps/web/src/features/overview/components/overview-edge-state-matrix.tsx:17-18,20,23-25,50-52,74,80,82` | "Deterministic evidence", "Overview edge-state matrix", role tokens, "Retry safe read", "Route error" | R1; roles R4; "Retry safe read" becomes "Try again"; the matrix is a synthetic-mode design gallery and does not render in review mode, so it is rewritten for consistency, not for the review URL |
| `apps/web/src/features/overview/components/projected-safe-action.tsx:10-14` | "synthetic evidence route", "verified runtime", "production provider path" | R1 |
| `apps/web/src/features/overview/model/overview-state.ts:14,61,75` | "cross-tenant placeholders", "idempotent synthetic read" | R1 |
| `apps/web/src/features/overview/components/activity-feed.tsx:23,49` | "Audit-friendly timeline", "· Synthetic" | R1: "Recent activity", "Not live" |
| `apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx:23,25,32,46` | "Campaigns in this location", "Only campaigns for the verified location are listed. Provider publication is disabled.", "...persist a tenant-backed campaign record.", "Open persisted campaign" | exact: "Your campaigns", "Every Open House Boost you've created in this workspace.", "Create your first Open House Boost. It's saved as you go.", "Open campaign" |
| `apps/web/src/features/campaigns/components/open-house-draft-builder.tsx:81-86,92-97,103,143,179,210,216-217,232-237,241-257,261-262,267-271,275-283` | listed in Background | exact for the key ones: heading "Create an Open House Boost"; lead "Tell us about the open house. We'll check it against the rules before anyone approves it."; notice "This is saved to your workspace. It doesn't publish, spend, or send anything."; fieldsets "The property and the open house", "What the ad says", "Budget and area"; button "Save and run the checks" (loading "Running the checks"); error heading "We couldn't save this yet" with R3 body; result heading "Ready for approval" or "Needs changes"; each finding shows the plain description first, the fix second, and the rule code only in "Details for support" (R2); "Open campaign"; the `<details>` becomes "Details for support" with "Version ID", "Content fingerprint", "Check fingerprint" (R2) |
| `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx:26-33,77-78,85-88,94-95,100-103,114,120,123,131,138,157-162` | listed in Background | exact for the key ones: notice "Saved to your workspace. This campaign won't run as an ad yet: HighLevel and Meta aren't connected."; "Approval scope" card body "Approval applies to this exact version. If you change the campaign, the new version needs its own approval." with the reference under R2; section "Campaign check" with "Ready for approval" or "Needs changes"; "Approval" section; line 120 renders "<Approved|Rejected> by <role label>" (R4); "What to do next" (amended 2026-09-20, see Amendments); "Available"/"Not available" |
| `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:35,63,68-69,72,80-84,87,89,99,102,116-163` | listed in Background | exact for the key ones: card heading "Approve this campaign"; body "Approving applies to this exact version. Nothing is published or sent."; `SafeAction` label "Approve this version", confirm "Yes, approve"; status "Approved. This campaign won't run as an ad until HighLevel and Meta are connected." and "Already approved."; reject control "Send back for changes"; every `requiredRole` "An approver or the workspace owner"; `responsibleParty` "The campaign creator" / "Your workspace owner"; explanations R1; errors R3 |
| `apps/web/src/app/(authenticated)/reports/page.tsx:28-33` | "Review surface", "Reporting is not connected", lead | exact: eyebrow "Reports"; heading "Reports aren't live yet"; lead "Once Meta and HighLevel are connected, spend, leads, and results show up here." |
| `apps/web/src/features/reporting/components/reports-screen.tsx:21,25-26,33,107-109` and `campaign-detail-screen.tsx:18,30`, `artifact-workspace.tsx:25,79,90,133`, `campaign-launch-review.tsx:33,120-123`, `reporting-acceptance-surface.tsx:170,194-199,251,322` | synthetic-mode reporting prose | R1 and R2; synthetic-mode only, rewritten for consistency and because the components are the ones PRD-006d reviews |
| `apps/web/src/features/onboarding/components/onboarding-screen.tsx:29,32-33,46-47,52,55-56,65,75,77,88-89,94,118,128` | listed in Background | exact for the key ones: eyebrow "Setup"; heading "Get <workspace> ready"; lead "Here's what's connected and what's left."; the mode line is removed; notice "We only mark a step done after we've checked it."; checklist descriptions "Five things to connect" and "Four things to confirm before you launch"; "Locked until everything above is connected"; item action "Open this step" / "See what we checked"; "Checked on" for freshness |
| `apps/web/src/features/onboarding/components/permission-screen.tsx:15,18-19,27,37` | listed in Background | R1; line 37 R4 ("Needed", "Confirmed", "Missing", "Optional") |
| `apps/web/src/features/brand/components/brand-profile-screen.tsx:30,37,43,51,54,71,80,101,110,131,147-148` | listed in Background | exact for the key ones: eyebrow "Your brand"; heading "Brand and compliance details"; version badge "Current" (the version string under R2); "Suggestions only. You decide what's saved."; "Your current details"; the profile id removed from view (R2); line 80 R4; "Suggested from your approved samples"; "Nothing saved from a suggestion yet." |
| `apps/web/src/features/shell/components/route-boundary.tsx:23,31-33,42,49` | "fixture", "Correlation ID", "synthetic-route-error", "Validating the frozen <route> fixture" | exact: "We couldn't load this page. Nothing was changed."; "Support reference" (R2); loading "Loading <page name>" |
| `apps/web/src/app/(authenticated)/{error,loading}.tsx`, `overview/{error,loading}.tsx`, `onboarding/{error,loading}.tsx` route names | "authenticated workspace", "Platform Overview", "Onboarding" | exact: "your workspace", "Overview", "Setup" |
| `apps/web/src/app/page.tsx:19-32` and `apps/web/src/app/layout.tsx:17-18` | "Phase 0 evidence harness", env name, "scaffold" | in review mode `/` already redirects to `/overview`; in synthetic mode the page becomes a plain local landing: "Automated LO", "Local demo", "This is a local demo with sample data. Nothing is connected."; description "Automated LO: Open House Boost campaigns with a named approval on the record." |
| `packages/ui/src/components/metric.tsx:157,162-163` | "Freshness", "Data type: Synthetic data" | exact: "Last updated"; "Not live data" |
| `packages/ui/src/components/async-state.tsx:12-20` | "Degraded" | exact: "Having trouble" |
| `packages/ui/src/components/onboarding-checklist.tsx:12-16,128-134` | "Stale", "Verifier version", "Provider reference" | exact: "Needs a refresh"; the two identifier rows move under "Details for support" (R2) |
| `packages/ui/src/components/Button.tsx:300-332` | "Required role", "Authorized resolver", "Access path", "Last safe state", "Safe to retry" | exact: "Who can do this", "Ask", "How to get access", "Where things stand", "You can try again" |
| `apps/web/src/features/ui-foundation/model/synthetic-ui.ts` and `apps/web/src/fixtures/ui-foundation/synthetic-ui.ts` | fixture prose | out of scope (synthetic mode only), except `completionHref: "/onboarding/synthetic-lead"` (`fixtures/.../synthetic-ui.ts:607`) which review-mode navigation must not link to |
| `apps/web/src/app/(authenticated)/marketing/campaigns/synthetic-open-house-001/page.tsx:24-38` | review not-connected strings | exact per D4 register: eyebrow "Campaign"; heading "This campaign isn't connected yet"; regions title "What you'll see here"; no review-mode link points at this slug |

### D6. Automated guards

Two guards, both in `pnpm verify:offline`:

1. **Source guard** `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts`: reads every `.tsx` and `.ts` under `apps/web/src/app/**`, `apps/web/src/features/**`, `apps/web/src/server/authenticated-workspace-data.ts`, `apps/web/src/server/runtime-authentication.ts`, `apps/web/src/server/email/**`, and `packages/ui/src/components/**`, excluding `*.test.*`, `apps/web/src/fixtures/**`, `apps/web/src/components/demo/**`, and `apps/web/src/app/demo/**`; extracts JSX text nodes, string literals passed to the props `title`, `label`, `description`, `explanation`, `reason`, `nextAction`, `responsibleParty`, `requiredRole`, `prerequisite`, `aria-label`, `placeholder`, `alt`, `heading`, `lead`, `eyebrow`, and every string in the review table and the email templates; and fails on any D2 term (word-boundary, case-insensitive), any D2 identifier pattern, or any U+2013 or U+2014. It ships with a self-test that plants one forbidden string in a fixture and asserts the guard reports it with file and line.
2. **Rendered-output guard**: `review-surface-sweep.ts`'s `forbiddenReviewStrings` gains the D2 term list and identifier patterns, and `inspectedAttributes` (line 33) gains `aria-describedby` targets and `<code>` content, so the six review-surface integration suites fail on any forbidden word in what the page actually renders. The per-suite allowances are re-derived and each remaining allowance names why it is not user-facing.

### D7. Error codes become sentences

`apps/web/src/features/http/user-messages.ts` maps every code the campaign and auth routes can return (`INVALID_CAMPAIGN_DRAFT`, `CAMPAIGN_PREFLIGHT_FAILED`, `CAMPAIGN_APPROVAL_CONFLICT`, `CAMPAIGN_APPROVAL_NOT_READY`, `CAMPAIGN_STORE_UNAVAILABLE`, `INVALID_CAMPAIGN_COMMAND`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `WORKSPACE_UNAVAILABLE`, and PRD-006a's codes) to a sentence pair: what happened and what to do. Examples: `CAMPAIGN_APPROVAL_CONFLICT` "This campaign changed since you opened it. Refresh the page and look again before approving." `UNAUTHENTICATED` "You've been signed out. Sign in again to continue." `WORKSPACE_UNAVAILABLE` "We can't reach your workspace right now. Try again in a minute." An unmapped code renders "Something went wrong on our side. Try again, and contact support if it keeps happening." plus the support reference; a unit test asserts every code the routes export has a mapping.

### D8. References and hashes: "Details for support"

Wherever the product shows a version reference, a hash, a rule code, or a support reference, it appears in one collapsed `<details>` region titled "Details for support", closed by default, with plain labels ("Version ID", "Content fingerprint", "Check fingerprint", "Rule", "Support reference") and monospace values. Nothing in that region is a heading, a name, or inline prose, and nothing outside it shows an identifier. The correlation reference from PRD-005c is labeled "Support reference".

### D9. Public docs

- `library/knowledge/public/overview/what-is-automated-lo.md:27`: "Automated LO runs as a page inside HighLevel; you do not manage a separate login." becomes "Sign in with your email and password. Your work is saved to your workspace." and item 2 gains "A short guided setup walks you through it the first time."
- `library/knowledge/public/faqs/open-house-boost-faq.md:22-32`: "Where does Automated LO run?" answers "In your browser. Sign in with your email and password."; "There is no separate account to create." is removed; a new question "I forgot my password." answers "Click Forgot your password? on the sign-in page. We'll email you a link that works for 30 minutes."; "Can my whole team use it?" keeps its approval sentence.
- Neither file claims HighLevel single sign-on. Both keep the "not in this release" list unchanged.

### D10. The auth pages, emails, and guided-setup steps

Exact strings for PRD-006a's pages and emails (PRD-006c's step copy follows the same voice and is listed there):

| Surface | Strings |
|---|---|
| Sign-in | Title "Sign in". Lead "Welcome back. Sign in to your Automated LO workspace." Fields "Email", "Password". Checkbox "Keep me signed in for 30 days". Button "Sign in". Link "Forgot your password?". Footer (when sign-up is enabled) "New here? Create your account." Honesty line "This sign-in is separate from HighLevel. Connecting HighLevel comes later." Generic error "That email and password don't match. Try again, or reset your password." Rate limited "Too many attempts. Wait a few minutes and try again." |
| Choose workspace | Title "Where do you want to work today?". Each option "<Workspace name>, as <role label>". Button "Continue". |
| Sign-up | Title "Create your account". Lead "Takes about a minute. Then we'll set up your first Open House Boost together." Fields "Your name", "Email", "Password" with helper "At least 12 characters. A short phrase works well.", "Company or team name (optional)". Button "Create account". Existing "That email already has an account. Sign in, or reset your password." Policy reasons "Use at least 12 characters.", "Use at most 128 characters.", "Choose a password that isn't your name or email.", "That password is too common. Try a short phrase instead." |
| Forgot password | Title "Reset your password". Lead "Enter your email and we'll send you a link to choose a new one." Field "Email". Button "Send reset link". Confirmation (always) "If there's an account for that email, a reset link is on its way. It works for 30 minutes. Check your spam folder if it doesn't arrive." |
| Reset password | Title "Choose a new password". Fields "New password", "Confirm new password". Button "Save new password". Expired or used "This reset link has expired or was already used. Request a new one." Mismatch "Those passwords don't match." Success: the user lands in the workspace with the notice "Your password is saved. You're signed in." |
| Verify email | Title "Confirm your email". Body "Click confirm and you're done." Button "Confirm". Done "Thanks, your email is confirmed." Expired "This link has expired. We'll send a new one when you sign in." |
| Change password | Title "Change your password". Fields "Current password", "New password", "Confirm new password". Button "Save". Wrong current "That doesn't match your current password." Success "Your password is updated. You've been signed out everywhere else." |
| Unverified notice (only when email is configured) | "Confirm your email so you can reset your password later. Resend the link." |
| Reset email | Subject "Reset your Automated LO password". Body "Hi <name>, click the link below to choose a new password. It works for 30 minutes. If you didn't ask for this, you can ignore this email; your password won't change." |
| Verification email | Subject "Confirm your email for Automated LO". Body "Hi <name>, confirm your email so you can reset your password if you ever need to." |
| Sign-out | Shell control "Sign out". After sign-out the sign-in page shows "You're signed out." |

### D11. The writing review

`technical-writing-craft-guardian` reads every changed string against D1 through D4 and the reader-lens diagnostic (a loan officer who has never seen the codebase), records findings in the pull request with file and line, and the batch does not merge with a blocking finding open. The durable contract document is reviewed the same way.

## Acceptance criteria

| ID | Criterion | Owner requirement |
|---|---|---|
| 006B-AC-001 | `library/knowledge/private/standards/user-language-contract.md` exists with the audience, the D1 tone rules, the D2 forbidden list, the D3 preferred list, the D4 honesty rule with examples, and the D8 "Details for support" rule; `technical-writing-craft-guardian` reviewed it with no blocking finding. | 2 |
| 006B-AC-002 | The source guard in D6 exists, runs in `pnpm test:unit`, scans exactly the named globs, fails on every D2 term and identifier pattern and on U+2013 or U+2014, and its self-test proves it reports a planted string with file and line; it passes on the final tree. | 2 |
| 006B-AC-003 | `review-surface-sweep.ts` carries the D2 terms and patterns in `forbiddenReviewStrings` and inspects `aria-describedby` targets and `<code>` content; all six review-surface integration suites pass with the extended list; every remaining allowance states why it is not user-facing. | 2 |
| 006B-AC-004 | The banner headline, disclosure, and `aria-label` are the D4 strings, the headline is one shared constant used by both files, and `docs/operations/review-surface.md:72-79` records the new strings; no review-mode page renders the old ones. | 2 |
| 006B-AC-005 | Every D4 row is applied in `authenticated-workspace-data.ts`, and the review-mode overview, onboarding, connections, brand, reports, and campaign-detail pages render only D4 vocabulary for their not-connected states, proven by the updated honesty suites. | 2 |
| 006B-AC-006 | No page renders a canonical reference, UUID, hash, rule code, environment name, or role token outside "Details for support"; `campaign.approval.actorRole` renders a role label; every `requiredRole` and `responsibleParty` string is a D3 phrase; proven by the rendered-output guard and by the updated `persisted-campaign-screen` and `campaign-approval-controls` tests. | 2 |
| 006B-AC-007 | Every route error code the campaign and auth handlers export has an entry in `user-messages.ts`; the create page and the approval control render the mapped sentence, never the code; the unmapped fallback renders with a support reference; a unit test asserts total coverage. | 2 |
| 006B-AC-008 | Every row of D5 is applied, with the "exact" rows matching verbatim; a checklist in the pull request lists each row with its commit. | 2 |
| 006B-AC-009 | The design-system defaults in D5 (`metric.tsx`, `async-state.tsx`, `onboarding-checklist.tsx`, `Button.tsx`) are changed and their component tests updated; `packages/ui/src/components/state-primitives.test.tsx:103-105` asserts "Not live data". | 2 |
| 006B-AC-010 | The sign-in, choose, sign-up, forgot, reset, verify, and change-password pages and both emails render exactly the D10 strings, proven by PRD-006a's component and route tests. | 1, 2 |
| 006B-AC-011 | `apps/web/src/app/page.tsx` and the site description contain no D2 term; the synthetic-mode landing reads as D5 specifies. | 2 |
| 006B-AC-012 | No review-mode navigation item, link, or `completionHref` points at a path containing `synthetic`, proven by a test that walks the review navigation and the review onboarding projection. | 2 |
| 006B-AC-013 | Every test listed in the Background is updated to the new strings and none is deleted or skipped; the number of test files under `apps/web/src` and `packages/ui/src` is unchanged or higher; the string-pinning assertions remain assertions (no `expect.anything()` substitutions). | 2 |
| 006B-AC-014 | The two public docs are updated as D9 specifies and make no HighLevel single sign-on claim. | 2 |
| 006B-AC-015 | No em dash or en dash appears in any added line of code, copy, or documentation (scan of `git diff --diff-filter=AM` added lines for U+2013 and U+2014). | Constraint |
| 006B-AC-016 | `technical-writing-craft-guardian`'s review is recorded in the pull request with zero blocking findings; `security-guardian` then `quality-guardian` include the copy in the batch close-out. | Constraint |
| 006B-AC-017 | The PRD-004 honesty rule still holds on the review URL: no spend, lead, or CRM figure is presented as live, proven by the updated honesty suites and by PRD-005e proof point 6 read against the D4 banner. | Constraint |

## Files expected to change

- `library/knowledge/private/standards/user-language-contract.md` (new).
- `apps/web/src/server/authenticated-workspace-data.ts:28-99,236,352` (D4).
- `apps/web/src/server/runtime-authentication.ts:419-426,434-435`.
- `apps/web/src/app/(authenticated)/layout.tsx:28-43,91-102` (with PRD-006a).
- `apps/web/src/features/shell/components/app-shell.tsx:147,160-175`, `review-not-connected-screen.tsx:44-50`, `route-boundary.tsx:20-50`, `apps/web/src/features/shell/model/navigation.ts:46-52`.
- `apps/web/src/features/overview/components/overview-screen.tsx`, `overview-edge-state-matrix.tsx`, `projected-safe-action.tsx`, `activity-feed.tsx`, `apps/web/src/features/overview/model/overview-state.ts` (lines in D5).
- `apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx:19-53`, `synthetic-open-house-001/page.tsx:24-38`, `reports/page.tsx:22-38`, `{error,loading}.tsx` files.
- `apps/web/src/features/campaigns/components/open-house-draft-builder.tsx`, `persisted-campaign-screen.tsx`, `campaign-approval-controls.tsx` (lines in D5).
- `apps/web/src/features/onboarding/components/onboarding-screen.tsx`, `permission-screen.tsx`, `onboarding-guidance.tsx`; `apps/web/src/features/brand/components/brand-profile-screen.tsx`; `apps/web/src/features/reporting/components/*.tsx` (lines in D5).
- `apps/web/src/app/page.tsx:14-35`, `apps/web/src/app/layout.tsx:17-18`.
- `packages/ui/src/components/metric.tsx:19-28,153-174`, `async-state.tsx:12-20`, `onboarding-checklist.tsx:12-16,120-136`, `Button.tsx:296-334`.
- `apps/web/src/features/http/user-messages.ts` (new) and its unit test.
- `apps/web/src/app/(authenticated)/review-surface-sweep.ts:33` and the six review-surface suites; every test in the Background list.
- `tooling/tests/unit/user-language/forbidden-vocabulary.test.ts` (new) and its planted-string fixture.
- `docs/operations/review-surface.md:72-79`.
- `library/knowledge/public/overview/what-is-automated-lo.md:27`, `library/knowledge/public/faqs/open-house-boost-faq.md:22-32`.

## Test plan

- **Unit** (`pnpm test:unit`): the source guard and its self-test; `user-messages.ts` coverage; the review string table (`authenticated-workspace-data.unit.test.ts`) updated to D4.
- **Integration** (`pnpm test:integration`): the six review-surface suites with the extended sweep; every feature suite in the Background list updated; the review-navigation path test (006B-AC-012).
- **Components** (`pnpm test:components`): `state-primitives.test.tsx` and `interactive-controls.test.tsx` updated for the new default labels.
- **Route-level** (`pnpm test:db`): PRD-006a's tests assert the D10 strings in responses where the route returns copy (the generic error and the confirmation).
- **Browser** (`pnpm test:browser`): the existing `ui-foundation-ux.spec.ts` assertions that read text (for example the onboarding checklist order at lines 207-218) updated; PRD-006d's screenshots capture the new copy.
- **Docs**: the dash scan and a relative-link check on the contract document and the two public docs.

## Security notes

- Generic sign-in and forgot-password copy is a security control (no account enumeration); the strings in D10 are part of PRD-006a's 006A-AC-013 and 017 proofs and must not be "improved" into something specific later without `security-guardian` review.
- "Details for support" exposes version references, fingerprints, and the support reference. None of those is secret (PRD-005c D3 already returns the support reference in a response header); no session value, token, or hash of one ever appears there.
- Error sentences never include a stack trace, a variable name, or a value.

## Open questions

- [ ] Whether "evidence" may remain in the one heading "Approval" as "Approval record", or whether every use goes. Recommendation: "Approval" for the section and "Approved by <role> on <date>" for the body.
- [ ] Whether the onboarding checklist phase names "Get Connected" and "Launch Readiness" (fixed in the design brief and pinned by `ui-foundation-ux.spec.ts:207-218`) change to "Connect your accounts" and "Ready to launch". Recommendation: yes, with `design-system-guardian` updating `03-components/onboarding-checklist.md:17-18`.
- [ ] Terms and privacy links on sign-up (shared with PRD-006a).

## Exact operator ask

None. Everything in this sub-PRD is provable in CI, except the writing review, which `technical-writing-craft-guardian` performs.

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| PRD-006a's pages must exist before their strings can be asserted | Engineering | Land the D10 strings with PRD-006a; this sub-PRD's guard and contract can land first |
| The rendered-output guard depends on the sweep engine's allowance model | Engineering | Re-derive allowances per suite when the terms are added |

## Related

- [PRD-006a: email and password sign-in](./prd-006a-first-party-sign-in-and-guided-experience-email-password-auth.md) (consumes D10)
- [PRD-006c: guided setup](./prd-006c-first-party-sign-in-and-guided-experience-guided-setup.md) (step copy in this voice)
- [PRD-006d: design quality bar](./prd-006d-first-party-sign-in-and-guided-experience-design-quality-bar.md) (copy is one of the things a screen is reviewed for)
- [PRD-004 index, RGL-002](../../in-work/prd-004-reviewable-go-live/prd-004-reviewable-go-live-index.md) (the honesty rule this sub-PRD rewords and keeps)
- [PRD-005e: deployed qualification](../../in-work/prd-005-authenticated-review-runtime/prd-005e-authenticated-review-runtime-deployed-qualification.md) (proof point 6 and the banner)
- [What Automated LO does today](../../../knowledge/public/overview/what-is-automated-lo.md)
- [Open House Boost FAQ](../../../knowledge/public/faqs/open-house-boost-faq.md)
- [Labeled HighLevel review surface](../../../../docs/operations/review-surface.md)
- [Design brief](../../../knowledge/private/ux-ui/00-design-brief.md)

## Amendments

- **2026-09-20, D5 and 006B-AC-008, the persisted-campaign "next steps" heading.** Text said: D3's preferred-vocabulary table maps "next safe action" to "what to do next" (lowercase, D3's own casing convention for the table); D5's row for `persisted-campaign-screen.tsx` listed the exact string "What you can do next" for the same heading. Code does: the heading renders "What to do next" at `apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx:146`, matching the five other render sites that follow D3 (`apps/web/src/features/overview/components/overview-screen.tsx:170,180,195,313`, `apps/web/src/features/onboarding/components/permission-screen.tsx:61`, `apps/web/src/features/brand/components/brand-profile-screen.tsx:92`). Why: D5's row was the one place that disagreed with D3 and with the rest of the tree; six sites already agreed on "What to do next" and none had shipped "What you can do next", so D5 is corrected to match D3 rather than the other way around. Decision recorded during verification, 2026-09-20. Touches: 006B-AC-008.
