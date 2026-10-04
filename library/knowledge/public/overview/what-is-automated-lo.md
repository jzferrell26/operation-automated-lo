# What Automated LO Does Today

> Category: Overview | Version: 1.2 | Date: October 2026 | Status: Draft

Automated LO is a web app for loan officers who use HighLevel. It is a marketing toolkit, not a CRM: you choose a ready-made ad from a curated library, change only its words, set where and when it runs, and a named person approves that exact version. This release ends at that approval. It does not publish or distribute anything, and HighLevel and Meta are not connected yet.

**Related:**

- [Launch an ad FAQ](../faqs/open-house-boost-faq.md)
- [Marketplace listing copy pack](../../private/product/marketplace-listing-copy-pack.md) (internal)
- [PRD-004e: listing content and demo script](../../../requirements/in-work/prd-004-reviewable-go-live/prd-004e-reviewable-go-live-listing-content-and-demo-script.md) (internal)
- [PRD-009: Marketing Toolkit](../../../requirements/completed/prd-009-marketing-toolkit/prd-009-marketing-toolkit-index.md) (internal)

---

## Status of this document

**Draft.** This is the source text for the HighLevel Marketplace listing and for customer-facing copy. It describes only what the product demonstrably does in the reviewable build. It is not published anywhere yet, and it is deliberately narrower than the long-term product plan.

_(Superseded on 2026-10-01 by PRD-009 (S-78; OD-H, D-15): this document used to describe the Open House Boost flow, a guided setup, and property details. It now describes "Launch an ad". The earlier text is in git history. PRD-009 is in pull request #75 and is not merged, so the app a reader can open today may still show the earlier screens.)_

## What it is

Automated LO adds one main flow: **Launch an ad.** You sign in with your email and password. You choose an ad from the Ads library, which holds everyday loan officer ads that we add only after they are reviewed. Your name and NMLS number go on the ad for you. You change only its headline and main text, and you set the budget, the dates, and the places where it shows. You review the actual ad, and a named person with approval authority approves that exact version. The approval is stored with it.

Once a version is saved, it is fixed: it keeps its own number and does not quietly change under you. Until the first ads are added, the library is empty and says so.

## What you can do in this release

1. **Sign in with your email and password.** Your work is saved to your workspace.
2. **Add your brand once.** Your name and NMLS number go on every ad. You can also set your title, a brand colour, your disclosure line, and the wording of your lead form.
3. **Browse the Ads library.** Ads are grouped by topic: first-time buyers, refinance, VA loans, pre-approval, and down payment help. Each one shows your own name and NMLS number.
4. **Launch an ad in three steps.** Choose an ad, set it up (the words, the budget, the dates, and the places), then review and launch. The checks tell you in plain words what to fix.
5. **Approve it as a named human.** Someone with approval authority reviews the exact version and approves it. The approval records who approved what, and when, and it covers that version and those words only.
6. **See each campaign on its own page.** It shows the ad you approved, your words, who approved them, and every version, with three results: spend, leads sent to HighLevel, and cost per lead. While nothing is running, each result says it is not live yet instead of showing a number.
7. **Keep your Realtor partners in a list.** The list never appears in an ad. Your ads show only you.
8. **Sign out any time.** Account removal is not self-serve in this release; contact support.

Homeowner reports is a separate section for branded property value and equity reports. It is outside the ad flow described here, and live valuation lookups are off unless your workspace is approved for them.

## What it does not do in this release

This list is deliberate. These capabilities are either not finished or not yet cleared, and the product does not claim them.

- It does **not** publish or distribute ads. The "Launch on Facebook" button is part of the flow, but it stays off: Meta is not connected in this release, and nothing is published or sent.
- It does **not** connect to HighLevel or Meta yet. It does not install into a HighLevel location and does not run inside HighLevel.
- It does **not** capture, route, or notify you about leads. HighLevel stays where your leads, pipelines, and follow-up live.
- It does **not** bill you through the app, and it does not process payments.
- It does **not** send email or text messages to consumers.
- It does **not** make flyers, property pages, PDFs, QR materials, or any file to upload to an ad platform.
- It does **not** put a Realtor or a brokerage on a paid ad.
- It does **not** use AI to write or check your ad. The ads come from the library, and the checks use fixed rules.
- It does **not** promise leads, appointments, closings, cost per lead, or any performance outcome.
- It does **not** replace your CRM. There are no lead lists, pipelines, contact views, or automations in Automated LO. HighLevel stays the system of record for your contacts and connected ad accounts.

If you need any of those, Automated LO is not the right fit for this release.

## How approval works, and why it matters

Mortgage marketing carries real compliance weight, so the product is built so that saving a version never amounts to approving it.

- A campaign version is **immutable**. Approving one version does not approve a later change; a change makes a new version that needs its own approval.
- Approval is **attributed**. The record holds the approver, the exact version, and the time.
- Approval is **required**, not advisory. An unapproved version is never treated as final.
- Approval is **separate from launching**. Launching has its own button, and it is off in this release.
- Approval is **where this release stops**. It records that a named person accepted an exact version. It does not publish, distribute, or send that version anywhere.

## Who it is for

A loan officer or a small lending team that works with HighLevel, wants everyday ads for Facebook without building them from scratch, and wants each ad approved by a named human on the record.

## Who it is not for

- Teams that want a CRM, a pipeline, or automations. HighLevel does that.
- Teams that want a general-purpose campaign builder, or to write every ad from scratch. This is one flow over a curated library, not a builder.
- Anyone who needs automated ad publishing or lead routing.
- Teams looking for an AI tool that decides compliance questions. This release uses no AI to decide anything; a person decides.
