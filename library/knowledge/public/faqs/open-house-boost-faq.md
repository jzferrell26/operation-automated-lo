# Open House Boost FAQ

> Category: FAQ | Version: 1.1 | Date: September 2026 | Status: Draft

Answers to the questions a loan officer asks before installing Automated LO, scoped to what the reviewable build actually does.

**Related:**

- [What Automated LO does today](../overview/what-is-automated-lo.md)
- [Marketplace listing copy pack](../../private/product/marketplace-listing-copy-pack.md) (internal)

---

## Status of this document

**Draft.** Source text for the Marketplace listing FAQ and future help content. Every answer below is limited to demonstrated behavior. Where something is not available yet, the answer says so plainly instead of hedging.

---

## Installing and access

**Where does Automated LO run?**
Inside your HighLevel location, as a page in the HighLevel interface. You install it from HighLevel and use it there. There is no separate account to create.

**Do I need to give it access to my ad accounts?**
No. This release does not publish ads, so it does not need publishing access to your connected ad assets.

**How do I remove it?**
Uninstall it from your HighLevel location. That ends the app's access.

**Can my whole team use it?**
Anyone in the location can open it. Approving a campaign is different: that requires approval authority, because the approval is a named record.

---

## Using Open House Boost

**What does it actually produce?**
An Open House Boost campaign version: a fixed, saved record built from your open house details plus your brand, compliance, and partner settings, ready for a human to approve.

**What happens if I edit a campaign after it is approved?**
An edit creates a new version. The approval you already gave applies to the version you approved, not to the new one, so the new version needs its own approval. This is intentional.

**Will my work still be there tomorrow?**
Yes. Campaigns are saved to the database, not held in your browser.

**Can I see a list of my campaigns?**
Yes. The workspace shows your campaigns and lets you open any one of them for detail.

**Does it write the copy for me?**
Where AI assistance is involved, the output is a draft for a person to review. It does not decide compliance, targeting, budget, or whether something is approved.

---

## Realtor partners and compliance

**Can I co-brand with the listing agent?**
Not in this release. Co-branded collateral, meaning the public campaign page, flyer, PDF, and QR materials, is not part of the reviewable build, so there is nothing to co-brand yet. Your Realtor partner details are captured during setup so they are ready when those surfaces arrive.

The separation of identities, Realtor and brokerage on approved collateral and loan officer or lender only on paid advertising, is built into how campaigns are modeled. Neither surface ships in this release, so treat it as a design commitment for later rather than something you can exercise today.

**Does it handle mortgage advertising rules for me?**
No, and it does not claim to. It gives you a consistent, approval-gated process and keeps brand and compliance inputs in one place. You and your compliance owner remain responsible for what you approve.

---

## What is not in this release

**What happens after I approve a campaign?**
Nothing automatic. This release records the approval and stops there. It does not publish, distribute, print, or send the approved version anywhere, and it does not hand it to another system. Publishing is a later release.

**Does it run my Facebook or Instagram ads?**
No. This release does not publish ads, set budgets, or spend money.

**Does it collect and route leads to me?**
No. Lead capture, routing, and notifications are not part of this release.

**Does it text or email my contacts?**
No.

**How much does it cost?**
Pricing for the founding scope is listed on the Marketplace listing. The app does not bill you inside itself in this release.

**Will it get me more leads or closings?**
We do not make that claim. There is no measured customer cohort behind such a number yet, and quoting one would be dishonest.

---

## Data and support

**What data does it store?**
Your location's configuration, your campaign versions and their approval records, and audit history. HighLevel stays the system of record for your contacts and connected ad accounts; the product does not keep a duplicate borrower database.

**Can another HighLevel location see my campaigns?**
No. Your location is the security boundary. Access is derived server-side from your verified session, and the browser cannot ask for another location's data.

**How do I get help?**
Use the support contact on the Marketplace listing. *(Operator: insert the support email here before submission. Do not ship this sentence with a placeholder.)*
