# Marketplace Listing Copy Pack

> Category: Product Operations | Version: 1.1 | Date: September 2026 | Status: Active

Paste-ready listing fields, screenshot shot list, Loom script, and claim-by-claim audit for the Automated LO HighLevel Marketplace listing. Authored ahead of the operator so no copy has to be invented live in the portal at submission time.

**Related:**

- [HighLevel Marketplace submission packet](highlevel-marketplace-submission.md) (process, inspection checklist, prohibitions)
- [PRD-004e: listing content and demo script](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004e-reviewable-go-live-listing-content-and-demo-script.md)
- [PRD-004c: Marketplace submission](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004c-reviewable-go-live-marketplace-submission.md)
- [What Automated LO does today](../../public/overview/what-is-automated-lo.md) (customer-facing source)
- [Open House Boost FAQ](../../public/faqs/open-house-boost-faq.md) (customer-facing source)
- [Production tonight operator runbook](../operations/production-tonight-operator-runbook.md)

---

## How to use this pack

The two public documents are the source of truth for wording. This pack maps that wording onto portal fields, adds the capture instructions, and records what each claim rests on. If you change a claim here, change it in the public source too, or they drift.

Placeholders are written as `<< … >>`. Every one of them is a value nobody in the repository is entitled to invent. Do not submit with a placeholder still in place.

---

## Listing fields

### App name

```
Automated LO
```

### Short description (one line)

```
Turn one open house into an on-brand Open House Boost campaign version with a named human approval on the record. No ad publishing in this release.
```

### Long description

```
Automated LO adds one focused workflow to your HighLevel location: Open House Boost.

Enter the open house and property details. Automated LO assembles a campaign version
from your brand, compliance, and Realtor partner settings, and saves it. The version is
immutable, so it does not quietly change under you, and an edit produces a new version
rather than altering an approved one.

Before a campaign is treated as final, a named person with approval authority approves
that exact version. The approval is stored with the version, including who approved it
and when. That approval is where this release ends: Automated LO does not publish or
distribute the approved version.

What this release does:
- Installs into your HighLevel location and runs inside HighLevel
- Captures your brand, compliance, and partner setup once
- Creates and saves immutable Open House Boost campaign versions
- Lists and reopens your campaigns; your work persists between sessions
- Records a named human approval of the exact campaign version
- Disconnects cleanly when you uninstall

What this release does not do:
- It does not publish or distribute the approved campaign version anywhere
- It does not produce co-branded collateral (public page, flyer, PDF, QR materials)
- It does not publish ads to Facebook or Instagram, set budgets, or spend money
- It does not capture, route, or notify you about leads
- It does not bill you inside the app
- It does not send email or text messages to consumers
- It does not promise leads, appointments, closings, or any performance outcome

HighLevel stays the system of record for your contacts and connected ad accounts.
Automated LO does not keep a duplicate borrower database.
```

### Category

```
Marketing  ( << confirm the exact category name offered by the portal >> )
```

### Support email

```
<< operator-supplied support email >>
```

### Publisher / company display name

```
<< operator-supplied publisher name as it should appear in the listing >>
```

### Pricing

```
<< operator-supplied: founding-scope price, or "Contact us" >>
```

### OAuth callback and Custom Page URL

```
https://<< verified review hostname, GGL-B05 >>/...
```

Both must point at the hostname that 004a actually deployed and smoked. Do not enter an aspirational domain.

### Scope disclaimer (include verbatim in the description or the FAQ section)

```
This release covers Open House Boost campaign creation, persistence, and named human
approval, and it ends there. Publishing or distributing the approved version, co-branded
collateral, ad publishing, lead routing, and in-app billing are not included.
```

---

## Screenshot shot list

**Hard prerequisite:** capture from the review URL with server-only `OALO_REVIEW_SURFACE=authorized` set. Without that flag, the surfaces still render labeled synthetic demo metrics, and a screenshot of those numbers in a Marketplace listing is exactly what `004C-AC-004` forbids.

| # | Route | What the frame must show | Must not contain |
| --- | --- | --- | --- |
| 1 | `/onboarding` | Get Connected and Launch Readiness checklists in an honest state | Fabricated completed steps |
| 2 | `/marketing/campaigns/new` | The Open House Boost creation form with plausible non-PII inputs | A real borrower or Realtor name, a real address you do not control |
| 3 | `/marketing/campaigns` | The campaign list with the newly created campaign present | Spend, leads, or ROI columns showing invented numbers |
| 4 | `/marketing/campaigns/[campaignRef]` | Campaign detail with the immutable version identity visible | Provider IDs from a live account |
| 5 | `/marketing/campaigns/[campaignRef]` | The recorded approval: approver, version, timestamp | A real person's email; use the test operator identity |
| 6 | `/overview` | Honest not-connected states for spend and leads | Any unlabeled synthetic metric |

Six frames is enough. Extra frames widen the claim surface for no benefit.

### Plan budget figures in frames 2 through 5

The draft builder and the campaign detail screen both show **planned** daily and total budget dollars, because a budget is one of the campaign inputs. Those are numbers the operator typed, not money anyone spent, but a reviewer skimming a listing screenshot cannot tell the difference.

For any frame that shows a budget figure, do one of the following:

- crop the plan budget fields out of frame; or
- keep the in-app disclosure in frame, which reads "This flow freezes an immutable campaign version and stores it for this location. It does not publish, spend, or call HighLevel or Meta."

Either satisfies `004E-AC-004`. Do not caption a budget figure as spend, results, or performance, and do not pair one with a metric tile.

---

## Loom script

Target length: 3 to 4 minutes. Narrate only what is on screen.

| Beat | On screen | Say |
| --- | --- | --- |
| 1. Install | HighLevel location, Test Link install | "Automated LO installs into your HighLevel location and runs inside HighLevel. No separate login." |
| 2. Setup | Brand / compliance / partner setup | "You set up brand, compliance, and Realtor partner details once. These feed every campaign." |
| 3. Create | Open House Boost form, then submit | "Enter the open house and the property. Automated LO builds an immutable campaign version from those inputs plus your setup." |
| 4. Persist | Navigate away, return, reopen the campaign | "The campaign is saved. I am leaving the page and coming back, and the same version is still here." |
| 5. Approve | Approval action, then the recorded approval | "A named person with approval authority approves this exact version. The record keeps who approved what, and when. An edit would create a new version that needs its own approval. Approving does not publish or send anything; this release stops at the approval record." |
| 6. Honest state | `/overview` not-connected states | "Ad publishing and lead routing are not part of this release, so the product says not connected instead of showing numbers it does not have." |
| 7. Disconnect | Uninstall from the location | "Uninstalling from your HighLevel location ends the app's access." |

Do not narrate any of these as something the product does: published, boosted, spend, budget, leads delivered, appointments, cost per lead, ROI, "goes out", "sent", "distributed", "flyer", "collateral", "automatically." Saying them in the negative is fine and encouraged, as beat 6 does.

---

## Claim audit

Every customer-facing claim, and what it rests on. A claim with no row here does not ship.

**The gating rule.** A positive claim may appear in the listing only when its gate below is cleared. A row whose gate is still open means one of two things must happen before submission: the gate passes, or the sentence comes out of the copy. It is never acceptable to leave a claim stated unconditionally in customer-facing copy while its row here shows an unmet gate. That is the exact defect a quality audit reopened on 2026-09-16, and this table is the control that prevents it.

Negative claims ("it does not publish") need no gate: they are true by construction and get safer, not riskier, as gates close.

### Positive claims

| # | Claim as stated in copy | Rests on | Gate before submission |
| --- | --- | --- | --- |
| P1 | Installs into your HighLevel location and runs as a page inside HighLevel, with no separate login | HighLevel install and Custom Page lifecycle; PRD-001A live-auth rows are still `DEFERRED: LIVE HIGHLEVEL AUTH` | **Open:** Test Link install must succeed (`GGL-B06`). The whole listing is blocked on this, so no separate copy edit is needed; if Test Link fails, nothing is submitted. |
| P2 | Set up brand, compliance, and Realtor partner details once | PRD-001B, 20 of 20 criteria `VERIFIED` | Cleared: repository-proved |
| P3 | Creates an Open House Boost campaign version from those inputs | PRD-003a (`70531fb`); PRD-001C, 30 of 30 `VERIFIED` | Cleared: merged on `main` |
| P4 | The version is immutable; an edit creates a new version needing its own approval | PRD-001C immutable-version criteria; `APA-001` | Cleared: merged on `main` |
| P5 | Your campaign is still there when you come back | PRD-003a + PRD-003d (`26051b3`); `004A-AC-004` | **Open:** code is merged but no run has been observed. Clears on operator smoke (`GGL-B03`) or the PRD-004d run (`GGL-B16`). Both precede submission, so the claim is safe by sequencing, not by assumption. |
| P6 | You can list your campaigns and open one for detail | PRD-003d (`26051b3`); `APA-006` | Cleared: merged on `main` |
| P7 | A named human with approval authority approves the exact version, and the record holds who, what, and when | PRD-003c (`71c371d`); `APA-004` | Cleared: merged on `main` |
| P8 | Another HighLevel location cannot see your campaigns | `APA-003`; RLS plus repository contracts | Cleared: merged on `main` |
| P9 | Uninstalling ends the app's access | HighLevel install lifecycle | **Open:** observe during Test Link (`GGL-B06`). If uninstall is not exercised, cut the sentence from the FAQ rather than assuming it. |
| P10 | Where AI assistance is involved, output is a draft a person reviews and never decides compliance, targeting, budget, or approval | Project-map hard boundary 9; PRD-001I metering and boundary criteria | Cleared: stated as a limit on the product, not as a feature |
| P11 | It stores your configuration, campaign versions, approval records, and audit history; HighLevel stays the system of record | PRD-003a schema; project-map hard boundary 8 | Cleared: merged on `main` |
| P12 | Surfaces show honest not-connected states rather than invented metrics | `GGL-001` / `GGL-002` | **Conditional:** true in review mode only. Every screenshot and the Loom must be captured with `OALO_REVIEW_SURFACE=authorized` (`004E-AC-004`). |

### Negative and boundary claims

| # | Claim as stated in copy | Rests on |
| --- | --- | --- |
| N1 | Does not publish or distribute the approved version | No publish path is reachable; `GGL-005` / `GGL-006` prove providers are default-off |
| N2 | Does not produce co-branded collateral in this release | Collateral surfaces are outside the demonstrated review flow (see the capability boundary in PRD-004e) |
| N3 | Does not publish ads, set budgets, or spend money | G3 `BLOCKED`; provider default-off proof |
| N4 | Does not capture, route, or notify about leads | G5 `BLOCKED` |
| N5 | Does not bill inside the app or process payments | G6 `BLOCKED` |
| N6 | Does not send email or text messages to consumers | No consumer messaging path in the demonstrated flow |
| N7 | Makes no promise of leads, appointments, closings, or cost per lead | No measured cohort exists; G8 is an accepted constraint |
| N8 | Does not replace your CRM | Project-map hard boundary 8 |
| N9 | Does not decide mortgage advertising compliance for you | Project-map hard boundary 9 |

### Forward-looking statements, and how far they may go

Exactly one forward-looking statement appears in customer-facing copy: that identity separation (Realtor and brokerage confined to approved collateral, paid-ad identity loan officer or lender only) is built into how campaigns are modeled. It is worded as a **design commitment for a later release**, not as something a customer can exercise today, because neither collateral nor paid advertising ships in this release. The underlying separation is genuinely implemented and repository-proved (PRD-001C paid-ad brand-boundary criteria and PRD-001E field separation), which is why the statement is allowed to exist at all. Do not upgrade it to present-tense enforcement language, and do not add a second forward-looking statement without adding a row here.

---

## Listing type

**Recorded default: Standard.** Standard is the right choice for the first reviewable listing, and the reason is concrete rather than a preference: a White-label listing requires zero "HighLevel" or "GHL" terminology across the listing, screenshots, OAuth screens, embedded UI, support copy, and company site. Today's shell, onboarding copy, and this pack all reference HighLevel factually, so a White-label audit would fail without a dedicated terminology pass.

**This is a default, not a decision.** Listing type is fixed when the app entry is created. If the Automated LO app already exists in the portal, keep its current type and record it during inspection (`GGL-B04`). Only if the app must be created fresh does Standard get chosen here. If the product owner wants White-label instead, the terminology pass is prerequisite work, not a submission-time edit.

---

## Prohibited in this pack and in the listing

- Tokens, client secrets, connection strings, signed-context JWTs
- Real borrower, Realtor, or contact PII in any screenshot or example
- Any capability from a `BLOCKED` gate (Meta publish, leads, billing)
- Performance, ROI, or volume numbers of any kind
- A submitted placeholder

## Changelog

- v1.1 (2026-09-16): Copy-overclaim remediation after a quality audit reopened `004E-AC-001`, `004E-AC-002`, and `004E-AC-007`. Claim audit rebuilt as gated positive claims plus negative and boundary claims, with a stated gating rule and one labeled forward-looking statement. Long description now says the release does not publish, distribute, or produce collateral. Shot list gained the plan-budget note. `004E-AC-004` unchanged.
- v1.0 (2026-09-16): Initial pack: listing fields, shot list, Loom script, claim audit, Standard listing-type default. Authored for `004E-AC-003` through `004E-AC-007`.
