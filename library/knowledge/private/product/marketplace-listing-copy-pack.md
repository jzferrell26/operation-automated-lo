# Marketplace Listing Copy Pack

> Category: Product Operations | Version: 1.0 | Date: September 2026 | Status: Active

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
Turn one open house into an approved, on-brand Open House Boost campaign, with a named human approval on record.
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
and when.

What this release does:
- Installs into your HighLevel location and runs inside HighLevel
- Captures your brand, compliance, and partner setup once
- Creates and saves immutable Open House Boost campaign versions
- Lists and reopens your campaigns; your work persists between sessions
- Records a named human approval of the exact campaign version
- Disconnects cleanly when you uninstall

What this release does not do:
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
approval. Ad publishing, lead routing, and in-app billing are not included.
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

---

## Loom script

Target length: 3 to 4 minutes. Narrate only what is on screen.

| Beat | On screen | Say |
| --- | --- | --- |
| 1. Install | HighLevel location, Test Link install | "Automated LO installs into your HighLevel location and runs inside HighLevel. No separate login." |
| 2. Setup | Brand / compliance / partner setup | "You set up brand, compliance, and Realtor partner details once. These feed every campaign." |
| 3. Create | Open House Boost form, then submit | "Enter the open house and the property. Automated LO builds an immutable campaign version from those inputs plus your setup." |
| 4. Persist | Navigate away, return, reopen the campaign | "The campaign is saved. I am leaving the page and coming back, and the same version is still here." |
| 5. Approve | Approval action, then the recorded approval | "A named person with approval authority approves this exact version. The record keeps who approved what, and when. An edit would create a new version that needs its own approval." |
| 6. Honest state | `/overview` not-connected states | "Ad publishing and lead routing are not part of this release, so the product says not connected instead of showing numbers it does not have." |
| 7. Disconnect | Uninstall from the location | "Uninstalling from your HighLevel location ends the app's access." |

Do not say: published, boosted, spend, budget, leads delivered, appointments, cost per lead, ROI, or "automatically."

---

## Claim audit

Every customer-facing claim, and what it rests on. A claim with no row here does not ship.

| Claim | Rests on | Status |
| --- | --- | --- |
| Installs and runs inside a HighLevel location | Test Link install | BLOCKED until `GGL-B06`; do not publish the listing before it passes |
| Brand / compliance / partner setup | PRD-001B criteria, 20 of 20 `VERIFIED` | Repository-proved |
| Creates an immutable Open House Boost campaign version | PRD-003a (`70531fb`), PRD-001C criteria | Merged on `main` |
| The campaign persists across sessions | PRD-003a + PRD-003d (`26051b3`); `004A-AC-004` | Code done; observed run pending (`GGL-B03` / `GGL-B16`) |
| Named human approval of the exact version | PRD-003c (`71c371d`); `APA-004` | Merged on `main` |
| Location isolation; no cross-location reads | `APA-003`, RLS + repository contracts | Merged on `main` |
| Honest not-connected states instead of invented metrics | `GGL-001` / `GGL-002`, review mode only | VERIFIED with `OALO_REVIEW_SURFACE=authorized` |
| Uninstall ends access | HighLevel install lifecycle | Confirm during Test Link (`GGL-B06`) |
| No ad publishing, leads, or billing in this release | G3 / G5 / G6 `BLOCKED` | Accurate by construction |

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

- v1.0 (2026-09-16): Initial pack: listing fields, shot list, Loom script, claim audit, Standard listing-type default. Authored for `004E-AC-003` through `004E-AC-007`.
