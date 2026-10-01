# PRD-004e: Reviewable Go-Live - Listing Content and Demo Script

> **Parent:** [PRD-004](./prd-004-reviewable-go-live-index.md)
> **Status:** In work. Content authored in-repo; publication still gated by 004a smoke and 004b Test Link. Independent re-audit 2026-10-01: 3 of 8 criteria `VERIFIED`, 5 open ([report](./qa/2026-10-01-004e-re-audit.md))
> **Priority:** P0
> **Schema changes:** None
> **Owner Guardians:** `library-guardian`, `ux-ui-guardian`, `gohighlevel-guardian`

## Goal

Author, in-repo and ahead of the operator, every piece of **content** the Marketplace submission needs: the customer-facing scope statement, the customer FAQ, the paste-ready listing fields, the screenshot shot list, and the Loom demo script.

[PRD-004c](./prd-004c-reviewable-go-live-marketplace-submission.md) says what the submission must contain and holds the submit action behind operator smoke and Test Link. It does not contain the words. Before this sub-PRD, `004C-AC-002` ("listing description claims only create → persist → approve") had no artifact to audit, so the operator would have had to draft listing copy live in the portal at submission time. That is exactly when overclaiming happens.

Everything here is provable locally today. None of it requires the portal, a preview URL, or provider evidence.

## Scope

- Customer-facing scope statement under `library/knowledge/public/overview/`.
- Customer-facing FAQ under `library/knowledge/public/faqs/`.
- Internal paste-ready listing copy pack, screenshot shot list, Loom script, and a claim-by-claim audit against the demonstrated scope.
- A recorded default for listing type, with the terminology consequence of each option stated.

## Non-Goals

- Submitting the listing. That is `004C-AC-001` through `004C-AC-005`, blocked on `GGL-B09`.
- Capturing the screenshots or recording the Loom. Both need the review URL from 004a in review mode.
- Promising Meta publishing, lead delivery, appointment booking, or billing in any customer-facing sentence, in this batch or a later one, until the owning gate passes.
- Publishing the public docs anywhere. They are drafts held in the repository as the single source for listing copy.

## Content boundary (the rule every sentence obeys)

Automated LO's demonstrated scope today is: **install into a HighLevel location, set up brand and compliance inputs, create an Open House Boost campaign version, persist it, and record a named human approval of that exact version.**

| Capability | May appear in customer-facing copy | Why |
| --- | --- | --- |
| Install, embedded session, setup | Yes | Demonstrated through Test Link once `GGL-B06` passes |
| Create and persist an Open House Boost version | Yes | PRD-003a/003d on `main`; proved by 004a smoke |
| Named human approval of the exact version | Yes | PRD-003c on `main` |
| Collateral, flyer, QR, public page | **Not yet** | Rendering is repository-proved but not part of the demonstrated review flow |
| Meta ad publishing, budget, spend | **No** | G3 `BLOCKED` |
| Lead capture, routing, notifications | **No** | G5 `BLOCKED` |
| Billing, subscriptions, refunds | **No** | G6 `BLOCKED` |
| Performance, ROI, or conversion claims | **No** | No measured cohort exists; G8 is an accepted constraint |

## Acceptance criteria

| ID | Criterion | Status |
|---|---|---|
| 004E-AC-001 | A customer-facing scope statement exists, describes only install → setup → create → persist → approve, and does not imply distribution of the approved version. | OPEN. Re-audit 2026-10-01 FAIL ([report](./qa/2026-10-01-004e-re-audit.md), F-01 to F-04): the distribution phrases are gone, but the overview says the product installs into HighLevel, builds campaigns from saved brand and compliance settings, creates a new version on edit, and is "one focused workflow" with no PDF, public page, or lead capture ([what-is-automated-lo](../../../knowledge/public/overview/what-is-automated-lo.md)) |
| 004E-AC-002 | A customer-facing FAQ exists and contains no Meta publish, lead delivery, billing, collateral, or performance claim. | OPEN. Re-audit 2026-10-01 FAIL ([report](./qa/2026-10-01-004e-re-audit.md), F-03, F-05, F-06): "Publishing is a later release" breaks the non-goal, and the lead, data, edit, uninstall, team, and AI answers do not match the code ([open-house-boost-faq](../../../knowledge/public/faqs/open-house-boost-faq.md)) |
| 004E-AC-003 | Paste-ready listing fields exist (short description, long description, category, scope disclaimer) with every operator-supplied value marked as a placeholder rather than invented. | OPEN. Re-audit 2026-10-01 FAIL ([report](./qa/2026-10-01-004e-re-audit.md)): placeholders are correct, but the long description and the scope disclaimer carry the F-01 to F-03 claims, so they are not paste-ready ([listing copy pack](../../../knowledge/private/product/marketplace-listing-copy-pack.md)) |
| 004E-AC-004 | A screenshot shot list exists, requires `OALO_REVIEW_SURFACE=authorized`, and forbids frames containing synthetic spend or lead numbers. | VERIFIED 2026-10-01 ([report](./qa/2026-10-01-004e-re-audit.md)). One Warning stays open for the author (F-10): the budget note quotes an in-app sentence that no longer exists |
| 004E-AC-005 | A Loom script exists whose beats are install → setup → create → approve → disconnect and which narrates no ungated capability. | OPEN. Re-audit 2026-10-01 FAIL ([report](./qa/2026-10-01-004e-re-audit.md), F-01, F-02, F-04): beats 1, 2, 5, and 7 narrate install, "no separate login", settings feeding campaigns, edit, and uninstall |
| 004E-AC-006 | The listing-type default is recorded as **Standard**, with the White-label terminology consequence stated, and is marked as confirm-against-portal rather than decided. | VERIFIED 2026-10-01 ([report](./qa/2026-10-01-004e-re-audit.md)); checked against HighLevel's listing-type article. Whether a type can change after creation is UNVERIFIED |
| 004E-AC-007 | Every customer-facing claim is traceable to a criterion or merged PR in the claim audit table, and no claim is stated unconditionally in copy while its audit row shows an unmet gate. | OPEN. Re-audit 2026-10-01 FAIL ([report](./qa/2026-10-01-004e-re-audit.md), F-01 to F-09): rows P1, P2, P4, P9, P11, N2, N4, and N8 do not hold, about a dozen shipped claims have no row, and Homeowner reports have no row ([copy pack, claim audit section](../../../knowledge/private/product/marketplace-listing-copy-pack.md)) |
| 004E-AC-008 | No customer-facing or listing artifact contains a token, client secret, connection string, support credential, or real contact PII. | VERIFIED 2026-10-01 ([report](./qa/2026-10-01-004e-re-audit.md)); pattern scan of all 004E artifacts was clean. `pnpm audit:secrets` was not run in this audit |
| 004E-AC-009 | Screenshots and Loom recorded from the review URL match this content before submission. | BLOCKED: needs 004a smoke and 004b Test Link (`GGL-B09`). Unchanged by the re-audit; capture should wait for the open criteria above |

`quality-guardian` re-audited the content on 2026-10-01 ([report](./qa/2026-10-01-004e-re-audit.md)): three criteria are `VERIFIED` (`004E-AC-004`, `006`, `008`) and five stay open (`001`, `002`, `003`, `005`, `007`). The report lists exact replacement wording (R-1 to R-6) for the owner to apply; the copy pack and the public drafts were not edited by the audit. The open criteria need a second re-audit after those edits. `004E-AC-001` and `004E-AC-005` name install and disconnect as steps, which the product cannot demonstrate today (no HighLevel install, no framing, no uninstall handler); `library-guardian` should decide whether to amend the criterion text or keep the listing blocked until the G2 track passes.

## Remediation log

A read-only quality audit on 2026-09-16 reopened three of the eight authored criteria for copy overclaim. All three findings were correct. What changed:

| Finding | Where | Defect | Fix |
| --- | --- | --- | --- |
| H1 | FAQ, Realtor co-branding answer | Claimed co-branding "belongs on approved collateral such as the public page, flyer, PDF, and QR materials" and that the identity separation "is enforced in the product", both present tense, while the capability boundary in this PRD marks collateral **Not yet**. A customer would have read a shipped feature. | The answer now opens with "Not in this release" and states plainly that collateral surfaces are not part of the reviewable build. The identity separation survives only as an explicitly labeled design commitment for a later release, never as present-tense enforcement. |
| H2 | Overview | Three phrases implied distribution: approval "before anything goes out", "Nothing downstream treats an unapproved version as final", and needing marketing that "comes out" of open houses "before it is used". This release publishes nothing, so each phrase implied a delivery path that does not exist. | All three phrases removed. The document now states in three places that approval is where the release ends: in the opening line, as the first bullet of "What it does not do", and as a bullet in the approval section. A second bullet states that co-branded collateral is not produced. |
| H3 | Copy pack, claim audit | The table was incomplete and, worse, listed claims as `BLOCKED` while the copy asserted them unconditionally, so the control that was supposed to catch overclaim was itself the overclaim. | Rebuilt as 12 positive claims with an explicit gate each, 9 negative and boundary claims, and one labeled forward-looking statement. A stated gating rule now forbids a claim from appearing unconditionally in copy while its row shows an unmet gate. |

`004E-AC-004` was **not** changed. The hard prerequisite of `OALO_REVIEW_SURFACE=authorized` and the ban on synthetic spend, lead, and ROI frames both stand as originally authored. The shot list gained one note, which tightens rather than relaxes it: frames 2 through 5 can show planned daily and total budget dollars, since a budget is a campaign input, so each such frame must either crop those fields or keep the in-app disclosure ("It does not publish, spend, or call HighLevel or Meta") in frame.

No live HighLevel, Meta, or Stripe evidence was introduced, no deferred G2 criterion was flipped, and no criterion row in `PRODUCTION_EXECUTION_LEDGER.md` was touched.

## Operator-supplied values still missing

These are placeholders in the copy pack. None of them was invented.

| Value | Needed for | Owner |
| --- | --- | --- |
| Support email address | Portal profile, FAQ contact line | Product owner |
| Company or publisher display name as it should appear | Portal profile | Product owner |
| Pricing for the founding scope, or "contact us" | Portal profile | Product owner |
| Verified review hostname | OAuth callback, Custom Page URL, screenshots | Operator (`GGL-B05`) |
| Existing app's current listing type, if the app already exists | Listing type confirmation | Human in portal (`GGL-B04`) |

## Blockers (honest)

| Blocker | Owner | Unblock |
|---|---|---|
| Screenshots and Loom need a live review URL in review mode | Operator | `GGL-B01` through `B03`, then record with `OALO_REVIEW_SURFACE=authorized` |
| Listing type cannot be confirmed without portal sign-in | Human | `GGL-B04` |
| Content corrections after the 2026-10-01 re-audit (five criteria open) | `library-guardian` | Apply R-1 to R-6 from the [re-audit report](./qa/2026-10-01-004e-re-audit.md), decide Option A or B for Homeowner reports, then request a second re-audit |

## Related

- [PRD-004c: Marketplace submission](./prd-004c-reviewable-go-live-marketplace-submission.md)
- [HighLevel Marketplace submission packet](../../../knowledge/private/product/highlevel-marketplace-submission.md)
- [Marketplace listing copy pack](../../../knowledge/private/product/marketplace-listing-copy-pack.md)
- [Production tonight operator runbook](../../../knowledge/private/operations/production-tonight-operator-runbook.md)
