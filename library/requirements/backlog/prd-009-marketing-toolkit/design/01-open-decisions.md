# PRD-009 open decisions for the owner

> Date: 2026-10-01 | Author: `design-system-guardian` | Companion to [`00-direction.md`](00-direction.md)
>
> Each item needs Jonathan's call. Each has a recommendation, what happens if he says yes, what happens if he says no, and what it blocks. The IDs D-1 to D-15 are local to this file; they are not the review rubric's deltas D-001 onward.

## Summary

| ID | Question | Recommendation | Blocks |
|---|---|---|---|
| D-1 | Turn on Zillow or Redfin link import? | No, not until a Terms of Use review and a photo-rights answer exist. Manual entry is the default | Step 1 build only if yes |
| D-2 | Light top bar or light left rail? | Top bar | The shell rebuild |
| D-3 | Realtor partners in the menu, or inside Campaigns? | In the menu | The menu |
| D-4 | Homeowner reports in the menu by default? | No: keep it behind its switch, off for new self-serve accounts | The menu, first-run Home |
| D-5 | Light on first visit even when the device is set to dark? | Yes | Theme start-up |
| D-6 | What happens to Email and SMS drafts, Campaign templates, Property sites, Creative and Ads Manager? | Remove from the menu, redirect, keep saved drafts | The removal lane |
| D-7 | Record the Realtor's permission once on the partner, instead of a box on every campaign? | Yes, with a compliance sign-off | Step 1 and the partner form |
| D-8 | Where do Stripe and billing go, and do the not-connected sentences still name Stripe? | Billing under Settings > Account; drop Stripe from ad-related sentences | Copy constants, Settings |
| D-9 | Keep Approve and Launch as two separate acts? | Yes | Step 3 |
| D-10 | Default ad shape: tall 4:5 or square 1:1? | Tall 4:5, with square as an option, pending the Meta specs check | The ad image renderer |
| D-11 | Remove the shell-wide "Not connected yet" banner? | Yes | Home, the shell |
| D-12 | Keep today's addresses (`/overview`, `/marketing/campaigns`) or rename? | Keep | Redirect table |
| D-13 | Make the property description optional? | Yes, if the checks do not depend on it | Step 1 |
| D-14 | Product mark in the top bar | Use the "Automated LO" wordmark until a logo exists | The shell |
| D-15 | Retire the floating guided-setup walkthrough (PRD-006c)? | Yes, for the inline checklist and step indicator | Home, PRD-006c criteria |

---

## D-1. Zillow or Redfin link import (legal)

**The question.** Should step 1 offer "paste a Zillow or Redfin link" to fill in the property?

**What we know.** Listing Studio has a working import (recon, "Property import"). Its own security review says a public fetch "is not a license" and that live Redfin import is "not qualified"; live Redfin returns 403; Listing Studio's PRD flags photo copyright risk (VHT v. Zillow) for listing photos; no document reviews Zillow's or Redfin's Terms of Use. Here the photos would run in **paid ads**, which raises the stakes compared with a flyer.

**Recommendation: no, for now.** Manual entry is the default and is already short (one address field). If the owner wants import later, turn it on only after (1) a Terms of Use review for both sites and (2) a decision that imported photos are never used in an ad unless the loan officer or the Realtor confirms they hold the rights.

- **If yes now:** step 1 gains a second way in; a few seconds faster per campaign; legal and copyright exposure on paid ads without a review; the import breaks whenever the sites change or block requests.
- **If no:** nothing to build; the step 1 mockup already shows the manual path, with a dashed note marking where import would go.
- **Blocks:** only the import variant of step 1.

## D-2. Light top bar or light left rail

**Recommendation: top bar.** Measured on the mockups: six labels take 592px; one row at 1440 and 1180 with 147px and 127px to spare; a second row at 768; a Menu button at 390. No collapse toggle at any width.

- **If top bar:** the product reads like automatedre.com; inside HighLevel there is no second side menu next to HighLevel's own (UNVERIFIED until checked in a sandbox location); about 256 screenshots that show the rail are redrawn.
- **If left rail:** matches Listing Studio's signed-in app (its rail is light, `automatedre-components.css:26`); costs about 240 to 272px of every frame, including the 1180 HighLevel frame; keeps the collapse-toggle rules from rubric D-008. Same redraw cost.
- **Blocks:** the shell rebuild, which every screen sits inside.

## D-3. Realtor partners in the menu, or inside Campaigns

**Recommendation: in the menu.** The owner kept it explicitly (OD-C); a partner is reused across campaigns and is one of the four setup items; step 2 also lets a person add a partner without leaving the flow.

- **If in the menu:** six items (five when homeowner reports is off).
- **If inside Campaigns:** five items; partners become a tab on Campaigns; slightly harder to find for someone setting up before any campaign.
- **Blocks:** the menu.

## D-4. Homeowner reports in the menu by default

**Recommendation: keep the existing switch, off for new self-serve accounts.** It is a separate product line (PRD-007) that depends on valuation lookups and their allowance; a new loan officer who came for Facebook ads should see five calm items.

- **If off by default:** five items for new accounts; workspaces that use reports keep it.
- **If on for everyone:** six items; reports show an honest not-connected state until valuations are set up.
- **Blocks:** the menu and the first-run Home.

## D-5. Light on first visit

The brief today follows the device setting on first visit (brief section 13). OD-E makes Light "the default that everything is designed and checked against".

**Recommendation: Light on first visit; Dark and System stay one click away in the account menu.**

- **If yes:** every new person sees the look the owner chose; brief section 13's first bullet changes.
- **If no:** a person whose device is set to dark sees Dark first, which is checked but not the design target.
- **Blocks:** the theme start-up script (`apps/web/src/theme/theme-bootstrap.ts`).

## D-6. The other Marketing Suite pages

OD-D names Leads and Pipeline, Automations, Reports and Workspace tools. It does not name the five Marketing Suite sub-pages, which the new six-item menu has no room for: Email and SMS drafts (a working editor that saves drafts), Campaign templates, Property sites, Creative, Ads Manager.

**Recommendation:** take all five out of the menu and redirect them (`00-direction.md` section 3.3). Keep saved message drafts in the database; delete nothing.

- **If yes:** a smaller, clearer product; Email and SMS drafts disappear from view (HighLevel sends email and SMS anyway).
- **If the owner wants Email and SMS drafts kept:** it becomes a section inside each campaign ("Follow-up messages"), not a menu item.
- **Blocks:** the removal lane.

## D-7. The Realtor's permission, once per partner

Today every campaign asks for two boxes: permission to market the property, and permission to use the Realtor's materials (`open-house-draft-builder.tsx:538-543`). Listing Studio records co-marketing consent once per agent and lender pair (`src/lib/co-marketing/types.ts:33-120`).

**Recommendation: yes.** Record the Realtor's agreement to co-branded ads on the partner record (who agreed, when), show it in step 2 ("Agreed to co-branded ads"), and keep one box per campaign for the property and its photos. A compliance owner signs off before build.

- **If yes:** one box instead of two per campaign; the step 3 check "the Realtor partner agreed to co-branded ads" reads the partner record.
- **If no:** two boxes stay on step 1.
- **Blocks:** step 1 and the partner form.

## D-8. Stripe and billing

The approved not-connected sentences name Stripe ("HighLevel, Meta, and Stripe aren't connected ...", user-language contract section 5; `apps/web/src/copy/user-language.ts:17-41`). Stripe is how the workspace pays for the product (`library/knowledge/private/architecture/system-architecture.md:345`), not a connection a loan officer makes to run an ad. OD-C's Settings lists Account, HighLevel, Meta and where new leads go; it does not list billing.

**Recommendation:** billing lives under Settings > Account as "Plan and usage" (today's `/settings/billing`, with its own honest "Billing isn't set up yet" state); ad-related sentences name only HighLevel and Meta.

- **If yes:** the contract's section 5 strings are revised through the normal copy review; the Home checklist stays at four items.
- **If no:** Stripe joins the checklist as a fifth item, and every not-connected sentence keeps naming it.
- **Blocks:** the copy constants and the Settings page.

## D-9. Approve and launch as two acts

**Recommendation: keep them separate.** Approval is a compliance act on one exact version and, by today's rule, "Nothing is published or sent." Launching spends money. Keeping them as two buttons, each with its own confirmation, keeps the record honest.

- **If separate:** 6 clicks to approval, 8 to launch.
- **If combined ("Approve and launch") for a person who can approve:** 6 clicks to launch; the approval record and the spend decision become one act; harder to explain if Meta rejects the ad after approval.
- **Blocks:** step 3.

## D-10. Default ad shape

**Recommendation: tall 4:5 (1080 by 1350) by default, square 1:1 (1080 by 1080) as the other option,** pending `meta-ads-guardian`'s check of the current feed specs (UNVERIFIED). The tall shape leaves room for the brand band under the photo without shrinking the home.

- **If 4:5:** more of the phone screen; the band carries the open house time, both people and the disclosure.
- **If 1:1:** the photo gets less height; text in the band gets smaller.
- **Blocks:** the ad image renderer (Listing Studio's drawing pieces reuse; the layout is new).

## D-11. Remove the shell-wide banner

The shell shows "Not connected yet" on every page (`features/shell/components/app-shell.tsx:140-158`), and the identity card repeats it (`copy/user-language.ts:142-143`).

**Recommendation: remove both.** State each fact once, where it changes what the person can do: the Home checklist, the disabled "Launch on Facebook", the results card. PRD-004 RGL-002 (an honest Home with no unlabelled demo data) still holds.

- **If yes:** "connection status appears once" becomes true on every page, not only Home.
- **If no:** every page carries the banner, and Home says it twice.
- **Blocks:** Home and the shell.

## D-12. Addresses

**Recommendation: keep today's addresses** for pages that survive (`/overview` is Home, `/marketing/campaigns` is Campaigns). Inside HighLevel nobody sees the address bar, and every test and baseline uses these.

- **If keep:** no new redirects for surviving pages.
- **If rename** (`/home`, `/campaigns`): cleaner addresses; one more redirect per page; the sign-up redirect (`password-authentication-handler.ts:1037`) and any Custom Page address registered in the HighLevel developer portal must be checked.
- **Blocks:** the redirect table only.

## D-13. The property description

Today "Property description" is required. Step 1 makes it an optional single line used in the ad words.

**Recommendation: optional,** if the existing campaign checks do not require it (to be confirmed in the code before build).

- **If optional:** one fewer field; the ad words come from the profile, the address and the date.
- **If required:** four fields to fill instead of three.
- **Blocks:** step 1.

## D-14. The product mark

The repo has no Automated LO logo file. The mockups use a small navy "ALO" mark and the "Automated LO" wordmark.

**Recommendation:** ship the wordmark; swap in a real logo when the owner supplies one (Listing Studio's brand pass used supplied SVG masters, `screens/automatedre-brand-release.md:13`).

- **Blocks:** nothing; a logo is a later swap.

## D-15. Retire the floating walkthrough

PRD-006c built a seven-step floating walkthrough because the owner asked for guided setup under five minutes. It floats over the page and covers content (the owner saw it cover the numbers).

**Recommendation: retire the floating panel.** Replace it with the inline "Get set up" checklist on Home, the "Step 1 of 3" indicator in the launch flow, and hints beside the fields. Keep the saved setup profile that prefills the ad, and keep the five-minute target, measured on the new flow.

- **If yes:** nothing ever covers content; the criteria listed in `00-direction.md` section 4.4 are retired or rewritten in PRD-009.
- **If no:** the panel must be re-placed so it never covers content, which at 390 and inside HighLevel means it can only dock in the page, which is what the inline checklist already is.
- **Blocks:** Home and the PRD-006c criteria.
