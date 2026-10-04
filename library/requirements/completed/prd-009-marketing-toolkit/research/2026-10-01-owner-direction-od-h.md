> Research input for [PRD-009](../prd-009-marketing-toolkit-index.md). The OD-H section the product owner's direction gained on 2026-10-01, after the first PRD-009 draft (`69b60ea`), copied here unchanged from the authoring session's scratch folder. The earlier copy, [`2026-10-01-owner-direction.md`](2026-10-01-owner-direction.md), is kept as history; where the two disagree, this one wins.

## OD-H: a curated ads library replaces the ad builder (owner, 2026-10-01, after PRD-009 draft `69b60ea`)
His words: "Ok so here is what is going to happen. We are just going to create a curated ads library. They select the one they want and launch. Nothing crazy."

His answers:
- **What the library holds: "Everyday loan officer ads".** First-time buyers, refinance, VA, pre-approval and the like. No property, address, open house date or photos.
- **Who supplies the ads: "You supply them".** The owner provides the approved ads (image plus words). The product holds the library.
  - The orchestrator's default: the library lives in the repository as a versioned catalog of data plus image assets. Adding an ad is a small reviewed change.
  - There is no admin upload screen in PRD-009. That is a possible later project.
- **Editing: "Just the copy".** A loan officer can edit the ad's words (headline and primary text) but not the image or design. Because the words can change, the per-version approval step stays before launch, and approval binds the exact edited version.
- **Curator: "Only you (platform-wide)".** One library for every loan officer. No per-company libraries.

Consequences for PRD-009:
- **Dropped:**
  - Zillow/Redfin link import (this reverses the earlier "Yes, include it", now moot);
  - photo upload and the storage bucket migration;
  - the property and event step;
  - the Realtor-in-the-ad question (AD-1 is moot: library ads carry only the loan officer's identity, and compliance control 9, "Paid advertising is never co-branded with a Realtor or brokerage", stays in force);
  - the Firecrawl question (AD-3 is moot).
- **The new flow:**
  1. Choose an ad from the library, which can be browsed and filtered by topic.
  2. Set it up. The loan officer's name, NMLS number and logo are applied automatically from Brand. They can edit the words, and they set the budget, dates and where it shows, within Meta's Special Ad Category rules for credit or housing ads; verify the exact current rules and mark them UNVERIFIED until checked.
  3. Review, approve (its own confirmation), then Launch on Facebook. Launch stays disabled until Meta is connected, with one honest sentence.
- **Naming.** "Open House Boost" no longer describes the product's ads. The designer proposes plain naming (for example "Launch an ad", "Ads library").
- **Realtor partners stays in the menu (OD-C).** Its purpose without co-branded ads is an open question for the owner: the PRD records it, and it does not block.
