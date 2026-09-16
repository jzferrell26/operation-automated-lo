# What Automated LO Does Today

> Category: Overview | Version: 1.1 | Date: September 2026 | Status: Draft

Automated LO is a HighLevel app for loan officers that turns one open house into an on-brand campaign version with a named human approval on the record. This release ends at that approval: it does not publish or distribute anything.

**Related:**

- [Open House Boost FAQ](../faqs/open-house-boost-faq.md)
- [Marketplace listing copy pack](../../private/product/marketplace-listing-copy-pack.md) (internal)
- [PRD-004e: listing content and demo script](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004e-reviewable-go-live-listing-content-and-demo-script.md) (internal)

---

## Status of this document

**Draft.** This is the source text for the HighLevel Marketplace listing and for customer-facing copy. It describes only what the product demonstrably does in the reviewable build. It is not published anywhere yet, and it is deliberately narrower than the long-term product plan.

## What it is

Automated LO installs into your HighLevel location and adds one focused workflow: **Open House Boost.**

You tell it about the open house and the property. It assembles a campaign version from your brand, compliance, and partner settings. That version is immutable: once created, it is a fixed record with its own identity, not a document that quietly changes under you. Before anything is treated as final, a named person with approval authority has to approve that exact version, and the approval is stored with it.

## What you can do in this release

1. **Install it into your HighLevel location.** Automated LO runs as a page inside HighLevel; you do not manage a separate login.
2. **Set up your inputs once.** Brand details, compliance requirements, and Realtor partner information.
3. **Create an Open House Boost campaign.** Enter the open house and property details and generate a campaign version.
4. **Come back to it later.** The campaign is saved. Close the tab, return tomorrow, and it is still there with the same version identity.
5. **Approve it as a named human.** Someone with approval authority reviews the exact version and approves it. The approval records who approved what, and when.
6. **Disconnect at any time.** Uninstalling from your HighLevel location ends the app's access.

## What it does not do in this release

This list is deliberate. These capabilities are either not finished or not yet cleared, and the product does not claim them.

- It does **not** publish or distribute approved campaign versions. Approval is where this release ends; nothing is sent, posted, printed, or handed to another system afterward.
- It does **not** produce the co-branded collateral (public page, flyer, PDF, QR materials). Those surfaces are not part of this release.
- It does **not** publish ads to Facebook or Instagram, set budgets, or spend money.
- It does **not** capture, route, or notify you about leads.
- It does **not** bill you through the app, and it does not process payments.
- It does **not** send email or text messages to consumers.
- It does **not** promise leads, appointments, closings, cost per lead, or any performance outcome.
- It does **not** replace your CRM. HighLevel stays the system of record for your contacts and your connected ad accounts.

If you need any of those today, Automated LO is not the right fit yet.

## How approval works, and why it matters

Mortgage marketing carries real compliance weight, so the product is built so that creating a version never amounts to approving it.

- A campaign version is **immutable**. Approving one version does not approve a later edit; an edit produces a new version that needs its own approval.
- Approval is **attributed**. The record holds the approver, the exact version, and the time.
- Approval is **required**, not advisory. An unapproved version is never treated as final.
- Approval is **where this release stops**. It records that a named person accepted an exact version. It does not publish, distribute, or send that version anywhere.

## Who it is for

A loan officer or a small lending team that already works inside HighLevel, runs open houses with Realtor partners, and wants each open house campaign version to be consistent, on-brand, and approved by a named human on the record.

## Who it is not for

- Teams that want a general-purpose campaign builder. This is one workflow, not a builder.
- Anyone who needs automated ad publishing or lead routing in place today.
- Teams looking for an AI tool that decides compliance questions. Model output here is an untrusted draft; a person decides.
