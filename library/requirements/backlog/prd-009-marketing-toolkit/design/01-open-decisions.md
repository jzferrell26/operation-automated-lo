# PRD-009 open decisions for the owner

> Date: 2026-10-01, revision 2 (after OD-H, the curated ads library) | Author: `design-system-guardian` | Companion to [`00-direction.md`](00-direction.md)
>
> The IDs D-1 to D-25 are local to this file; they are not the review rubric's deltas D-001 onward. AD-1 to AD-3 were the first PRD-009 draft's own decisions; the index records them as moot under OD-H ([PRD-009 index](../prd-009-marketing-toolkit-index.md), section "Owner decisions", paragraph "Made moot by OD-H"). Citations below name the index section and paragraph rather than line numbers, because the index is still being edited.

## 1. Applied by default (new with OD-H): the owner may still overrule

The index applies the designer's recommendation on every open decision unless the owner says otherwise, and lists D-16 to D-25 there ([PRD-009 index](../prd-009-marketing-toolkit-index.md), section "Owner decisions", paragraph "The designer's recommendations, applied"). Each stays here with its reasoning so the owner can overrule it.

| ID | Question | Recommendation, applied | Blocks |
|---|---|---|---|
| D-16 | Naming: what do we call the library, the flow and the thing a loan officer sets up? | "Ads library", "Launch an ad", steps "Choose an ad", "Set it up", "Review and launch"; a set-up ad is a "campaign"; keep the menu item "Campaigns"; retire "Open House Boost" | All copy |
| D-17 | Library filters | Topic chips with counts, five topics, one topic per ad; no search or sorting until the library passes about 24 ads | The library and step 1 |
| D-18 | What "Where it shows" offers under Meta's Special Ad Category rules | Places only: cities and states, typed by name and remembered; Facebook feed only; no radius control, no ZIP, no age, gender, interests or audiences. Exact current Meta rules UNVERIFIED | Step 2 |
| D-19 | Which Special Ad Category each library ad uses | The curator sets it per ad in the catalog; Housing for now, as the product enforces today, until Meta's current classification is checked (UNVERIFIED) | The catalog, the checks |
| D-20 | What Realtor partners is for now | Keep it as a plain partner list with one honest line; no new features in PRD-009; out of the setup checklist and the launch flow | The Realtor partners page, Home |
| D-21 | What retiring an ad does to campaigns already using it | Undecided and approved-not-launched versions must choose another ad; running ones finish their run with a notice; finished ones never change | Campaign page, step 3 |
| D-22 | Default budget and run length for an everyday ad | $25 a day for 14 days ($350 total), all editable | Step 2 |
| D-23 | Instagram as well as Facebook? | Facebook feed only in PRD-009 | Step 2 and 3 |
| D-24 | How much of the loan officer's brand colour goes on the ad | A thin rule and the initials tile only; the band stays white with navy text | The ad renderer |
| D-25 | Can an ad go out without a logo? | Yes, with an initials tile; the NMLS number stays required. PRD-009 has no logo upload at all (009d Non-Goals) | Brand, the checks |

## 2. Answered by the owner

From the [PRD-009 index](../prd-009-marketing-toolkit-index.md), section "Owner decisions":

| ID | Question | Answer | Where in the index |
|---|---|---|---|
| D-2 | Top bar or left rail | "Yes, as shown": the light top bar. OD-H keeps it unchanged | Paragraph "His answers on the design proposal" |
| D-4 | Homeowner reports in the menu | "Always show it" | Same paragraph |
| D-9 | Approve and launch as two acts | Two buttons, Approve then "Launch on Facebook", each with its own confirmation | Same paragraph |
| D-3, D-5, D-6, D-8, D-10, D-11, D-12, D-14, D-15 | Partners in the menu; Light on first visit; the other Marketing Suite pages; Stripe and billing; tall 4:5 by default; remove the shell banner; keep addresses; the wordmark; retire the walkthrough | The designer's recommendation. Two consequences of OD-H: D-10 now means the library supplies both shapes and the preview opens on tall; D-15's checklist drops to three items (`00-direction.md` 4.2) | Paragraph "The designer's recommendations, applied" |

## 3. Closed as moot by OD-H

Recorded in the [PRD-009 index](../prd-009-marketing-toolkit-index.md), section "Owner decisions", paragraph "Made moot by OD-H".

| ID | Was | Why it is moot |
|---|---|---|
| D-1 | Zillow or Redfin link import (owner had answered "Yes, include it") | No property step exists. Import, its fetch guards and its counsel item go with it |
| D-7 | The Realtor's permission recorded once per partner | No Realtor appears in any paid ad, so there is nothing to permit. Compliance control 9 stays in force (`compliance-and-risk.md:19`) |
| D-13 | Making the property description optional | No property step |
| AD-1 | A Realtor partner co-branded in the paid ad | Never: library ads carry only the loan officer's identity, and control 9 stands |
| AD-2 | Where property photos are stored | No photo upload, so no storage |
| AD-3 | Listing Studio's Firecrawl fallback | No link import |

---

## 4. The decisions in full

### D-16. Naming

"Open House Boost" no longer describes the ads (OD-H). The owner's own examples were "Launch an ad" and "Ads library".

**Recommendation:**

| Thing | Name |
|---|---|
| The collection | Ads library |
| One entry | an ad |
| The flow and its button | Launch an ad |
| The three steps | Choose an ad, Set it up, Review and launch |
| An ad a loan officer has set up | a campaign, named after the ad ("First home, start here") |
| The menu item | Campaigns (unchanged; the owner approved the menu as shown) |

- **If yes:** every new string in `00-direction.md` section 9 stands; "Open House Boost" survives only in history documents.
- **The alternative:** rename the menu item "Campaigns" to "Ads", so the menu, the button and the library all say "ad". Simpler for a loan officer, but it changes the menu the owner just approved, and "Ads" then holds both the library and the person's own campaigns.
- **Blocks:** all copy.

### D-17. Library filters

**Recommendation:** one row of topic chips with counts ("All 8", "First-time buyers 2", ...), one topic per ad, and these five topics to start: First-time buyers, Refinance, VA loans, Pre-approval, Down payment help. No search box and no sorting while the library fits on one or two screens; add search when it passes about 24 ads. Newest ads first within a topic.

- **If yes:** the simplest browse there is; the topic is also the campaign list's Topic column.
- **If the owner wants more:** a second filter (for example "Language: English, Spanish") or tags with several topics per ad. Each adds a catalog field and a row of chips.
- **Blocks:** the library page and step 1.

### D-18. What "Where it shows" offers under the Special Ad Category rules

Meta requires a Special Ad Category for housing and financial products (`compliance-and-risk.md:63`), and the product's own rules already block age, gender, marital and parental status, ZIP, protected-class proxies, custom and lookalike audiences, and contact uploads (`compliance-and-risk.md:65-72`). **The exact current Meta rules for these ads are UNVERIFIED in this pass:** which location types are allowed, whether a minimum radius applies around a city, whether Meta widens small areas on its own, and which placements are allowed.

**Recommendation:**

- Offer **places only**: one or more cities or states, typed by name, saved by name, and matched to Meta's locations once Meta is connected (the connection already models country, region and city, `packages/ghl/src/meta-adapter.ts:287-293`).
- Prefill the last area used, so only the first ad needs typing.
- **No** radius control, ZIP codes, age, gender, interests, or audiences of any kind.
- **Facebook feed only** in PRD-009 (D-23).
- Show the area in the approval summary, as the compliance rules require (`compliance-and-risk.md:72`).
- Before build, `meta-ads-guardian` confirms the current rules against Meta's documentation; the step 2 hint "Meta may also widen a small area" ships only if confirmed.

- **If yes:** one field the first time, none after; nothing on screen invites a targeting choice the rules forbid.
- **If the owner wants a radius control:** only after Meta's minimum is confirmed, and the control can never go below it.
- **Blocks:** step 2.

### D-19. Which Special Ad Category each ad uses

The product only knows `HOUSING` or `NONE` today (`packages/domain/src/campaign-foundation.ts:36`, `packages/contracts/src/campaign-foundation.ts:298`), and the checks fail anything that is not Housing (`campaign-foundation.ts:325-334`). Everyday loan officer ads (refinance, pre-approval) may belong in Meta's financial products category instead of, or as well as, Housing. UNVERIFIED.

**Recommendation:** the curator sets the category per ad in the catalog (`00-direction.md` 5.3). Until `meta-ads-guardian` confirms Meta's current classification, every library ad is Housing, which the product already enforces.

- **If confirmed as Housing for all:** nothing changes.
- **If some ads need the financial products category:** the domain enum and the check gain a value, and the catalog field already holds it.
- **Blocks:** the catalog and the checks.

### D-20. What Realtor partners is for now

The owner kept Realtor partners in the menu (OD-C) and said its purpose without co-branded ads is open (OD-H). Compliance control 9 allows a Realtor's identity only on collateral that isn't paid advertising (property pages, flyers, PDFs, QR materials).

**Recommendation:** keep the page as it is (a plain list: name, brokerage, email, phone) with one honest line at the top, "Your ads show only you. Realtor partners never appear in paid ads.", and build nothing new for it in PRD-009. Take "Add a Realtor partner" out of the Home setup checklist and out of the launch flow. Decide its future job later, for example co-branded flyers or property pages, which control 9 permits.

- **If yes:** the menu stays as approved; the page is honest about what it does.
- **If the owner would rather hide it until it has a job:** five menu items; saved partners stay in the database.
- **Blocks:** the Realtor partners page and the Home checklist.

### D-21. Retiring an ad

**Recommendation** (the full table is in `00-direction.md` 5.5):

- A draft or an undecided version on a retired ad cannot be approved; "Choose another ad" keeps its budget, dates and area.
- An approved campaign that has not launched cannot launch; the approval does not carry over to a new ad.
- A running campaign finishes its run with a one-line notice; a retirement marked as a compliance withdrawal flags it "Needs attention". Stopping a live ad needs the future Meta publish work.
- A finished campaign never changes.
- New versions of an ad never change existing campaigns; drafts are offered the new version.

- **If yes:** the library can change without silently changing anything a person approved.
- **If the owner wants retirement to stop running ads automatically:** it needs a Meta write, so it belongs to the publish PRD, not PRD-009.
- **Blocks:** the campaign page and step 3.

### D-22. Default budget and run length

With no open house date there is no natural end. Today's floor is $25 a day and $125 in total (`features/guided-setup/model/profile.ts:94-95`).

**Recommendation:** start when launched, run 14 days, $25 a day, total prefilled as daily times days ($350). All editable.

- **If yes:** zero typing for budget and dates.
- **If the owner prefers another default:** one constant each; the mockup and copy change with it.
- **Blocks:** step 2.

### D-23. Instagram

The connection can describe Instagram placements (`packages/ghl/src/meta-adapter.ts:299-301`), but the owner's ask was Facebook ads and the button says "Launch on Facebook".

**Recommendation:** Facebook feed only in PRD-009. Revisit with the publish PRD.

- **If yes:** one placement, one preview, one honest button label.
- **If Instagram too:** a second preview frame and a placement choice in step 2; the button becomes "Launch on Facebook and Instagram".
- **Blocks:** steps 2 and 3.

### D-24. Brand colour on the ad

**Recommendation:** the brand band is white with navy text; the loan officer's brand colour appears only as the thin rule above the band and behind the initials tile. Contrast then never depends on a colour the loan officer picked, and every ad in the library still looks like the library.

- **If yes:** no per-colour contrast check is needed on the band.
- **If the whole band takes the brand colour:** the text colour must be chosen per brand and checked at 4.5:1, and a pale brand colour fails.
- **Blocks:** the ad renderer.

### D-25. An ad without a logo

**Recommendation:** allowed. The band shows an initials tile in the brand colour. PRD-009 has no logo upload (009d Non-Goals), so in PRD-009 every ad uses the tile. The name and the NMLS number stay required: without them the checks send the version back with "Add your NMLS number in Brand".

- **If yes:** a new loan officer can launch before finding a logo file.
- **If a logo is required:** Brand's "Done" state needs a logo too, and the first launch waits for one.
- **Blocks:** Brand and the checks.
