# Launch an ad FAQ

> Category: FAQ | Version: 1.2 | Date: October 2026 | Status: Draft

Answers to the questions a loan officer asks before using Automated LO, scoped to what the reviewable build actually does.

**Related:**

- [What Automated LO does today](../overview/what-is-automated-lo.md)
- [Marketplace listing copy pack](../../private/product/marketplace-listing-copy-pack.md) (internal)

---

## Status of this document

**Draft.** Source text for the Marketplace listing FAQ and future help content. Every answer below is limited to demonstrated behavior. Where something is not available yet, the answer says so plainly instead of hedging.

_(Superseded on 2026-10-01 by PRD-009 (S-79; OD-H): this FAQ used to answer for the Open House Boost flow. It now answers for "Launch an ad" over the curated library. The file name is kept, so inbound links resolve, and the earlier text is in git history. PRD-009 is in pull request #75 and is not merged, so the app a reader can open today may still show the earlier screens.)_

---

## Installing and access

**Where does Automated LO run?**
In your browser. Sign in with your email and password. This release does not install into a HighLevel location and does not run inside HighLevel.

**I forgot my password.**
Click Forgot your password? on the sign-in page. We'll email you a link that works for 30 minutes.

**Do I need to give it access to my ad accounts?**
No. This release does not publish ads, so it does not need publishing access to your connected ad assets.

**How do I remove it?**
There is no install to remove and no self-serve account removal in this release. Contact support to close your account.

**Can my whole team use it?**
Each sign-up creates its own workspace, and this release has no screen for inviting teammates. Approving a campaign needs an account with approval authority, because the approval is a named record.

---

## Using Launch an ad

**What does it actually produce?**
A saved campaign: one ad from the library with your name and NMLS number on it, your own words, your budget, dates, and places, and a record of the checks. Once saved it is a fixed version, ready for a person to approve.

**What is the Ads library?**
A set of everyday loan officer ads, grouped by topic: first-time buyers, refinance, VA loans, pre-approval, and down payment help. Everyone sees the same library, and we add an ad only after it is reviewed. Until the first ads are added, the library is empty and says so.

**What can I change on an ad?**
Only its headline and main text, plus the budget, the dates, and the places where it shows. Your name, NMLS number, and disclosure line come from your Brand page, and the ad's picture is the library's.

**What do the checks look for?**
They check your words and your setup against fixed rules: no rates, payments, or terms, no numbers, no Realtor or brokerage names, and no requests for private details. Mortgage ads can't be aimed by age, gender or ZIP code, so you choose places, not people. Each finding says what to fix.

**What happens if I change a campaign after it is approved?**
"Make a new version" creates a new version. The approval you already gave applies to the version you approved, not to the new one, so the new version needs its own approval. This is intentional.

**Will my work still be there tomorrow?**
Yes. Campaigns are saved to the database, not held in your browser.

**Can I see a list of my campaigns?**
Yes. Your campaigns lists each one with its status, and you can open any of them for its own page.

**Does it write the copy for me?**
No. The ads come from the library and you edit the words yourself. This release does not use AI to write, check, or approve your ad.

**What is Homeowner reports?**
A separate section for branded property value and equity reports. It is not part of Launch an ad. Live valuation lookups are off unless your workspace is approved for them.

---

## Realtor partners and compliance

**Can I put a Realtor or the listing agent on my ad?**
No. Paid ads show only you. Your Realtor partners stay in a plain list that no ad uses, and the checks refuse a Realtor or brokerage name in your words.

**Does it handle mortgage advertising rules for me?**
No, and it does not claim to. It gives you a consistent, approval-gated process and keeps brand and compliance inputs in one place. You and your compliance owner remain responsible for what you approve.

---

## What is not in this release

**What happens after I approve a campaign?**
Nothing automatic. This release records the approval and stops there. The "Launch on Facebook" button stays off, and nothing is published, distributed, printed, or sent anywhere.

**Does it run my Facebook or Instagram ads?**
No. This release does not publish ads, connect to Meta, or spend money. The budget and dates you choose are saved with the campaign and sent nowhere.

**Does it collect and route leads to me?**
No. Lead capture, routing, and notifications are not part of this release. HighLevel stays where your leads, pipelines, and follow-up live.

**Is it a CRM?**
No. There are no lead lists, pipelines, contact views, or automations. HighLevel is your CRM.

**Does it text or email my contacts?**
No.

**How much does it cost?**
Pricing for the founding scope is listed on the Marketplace listing. The app does not bill you inside itself in this release.

**Will it get me more leads or closings?**
We do not make that claim. There is no measured customer cohort behind such a number yet, and quoting one would be dishonest.

---

## Data and support

**What data does it store?**
Your workspace settings, your brand, your Realtor partner list, your campaign versions and their approval records, and audit history. HighLevel stays the system of record for your contacts and connected ad accounts; the product does not keep a duplicate borrower database.

**Can another HighLevel location see my campaigns?**
No. Your location is the security boundary. Access is derived server-side from your verified session, and the browser cannot ask for another location's data.

**How do I get help?**
Use the support contact on the Marketplace listing. *(Operator: insert the support email here before submission. Do not ship this sentence with a placeholder.)*
