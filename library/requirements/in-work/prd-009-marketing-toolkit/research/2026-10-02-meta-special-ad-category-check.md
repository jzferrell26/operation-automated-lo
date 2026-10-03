# Meta Special Ad Category check (009D-AC-012)

> **Run:** PRD-009 Gauntlet, Wave 2. **Criterion:** 009D-AC-012 in [`../prd-009d-marketing-toolkit-launch-an-ad.md`](../prd-009d-marketing-toolkit-launch-an-ad.md).
> **Reader:** `meta-ads-guardian`, armed with `meta-ads-weapon`. **Date read:** 2026-10-02. **Branch:** `gauntlet9/009d-meta-check`.
> **Scope:** documentation only. No Meta account, no Ads Manager, no API call was used. Everything below comes from Meta's own public pages.

## How to read this record

- **VERIFIED** means the finding was read on a Meta page that rendered its text, and the address is given. Meta's wording is paraphrased here, not copied; field names, enum values, and numbers are kept exact.
- **UNVERIFIED** means no Meta page I could read states the finding. The conservative default in PRD-009 (Housing, places only, Facebook feed only) stays in place and the claim stays out of the product's copy.
- **Pages that rendered no text.** Meta's Business Help Center pages are built with JavaScript. The fetch returned only each page's title. These pages were not read, and nothing below relies on them:
  - `https://www.facebook.com/business/help/298000447747885` (How to choose a Special Ad Category)
  - `https://en-gb.facebook.com/business/help/2220749868045706` (About audiences for housing, employment or financial products and services campaigns)
  - `https://www.facebook.com/business/help/1157846251802527` (About ads for financial products and services)
  - `https://www.facebook.com/business/help/202297959811696` (About location targeting in Meta Ads Manager)
  - `https://www.facebook.com/business/help/407108559393196` (About ad placements across Meta technologies)
  - `https://www.facebook.com/business/help/469767027114079` (Recommended minimum image pixel requirements across placements)
  - `https://www.facebook.com/business/help/103816146375741` (Best practices for aspect ratios)
  - `https://www.facebook.com/business/help/980593475366490` (About text in ad images)
- **Not evidence.** Search-result summaries (which paraphrase the unreadable pages) and third-party blogs were seen but never counted as VERIFIED. Section 8 lists what they said, so a later reader knows what to re-check.
- Two guessed Ads Guide addresses returned HTTP 404 (`.../ads-guide/update/image/facebook-feed/lead-generation` and `.../ads-guide/image/facebook-feed/lead-generation`). The Leads page that exists is `.../outcome-leads` (S14).

## Source index (all read 2026-10-02)

| ID | Address | Page and date shown |
|---|---|---|
| S1 | `https://developers.facebook.com/docs/marketing-api/special-ad-category/` | Marketing API, Special Ad Categories. No version or date on the page. |
| S2 | `https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/` | Marketing API reference, Ad Campaign Group, v25.0 |
| S3 | `https://developers.facebook.com/docs/marketing-api/reference/ad-account/campaigns/` | Marketing API reference, Ad Account Campaigns (create), v25.0 |
| S4 | `https://developers.facebook.com/docs/graph-api/changelog/version22.0/` | Graph API and Marketing API v22.0 changelog, released 2025-01-21 |
| S5 | `https://developers.facebook.com/docs/marketing-api/audiences/reference/basic-targeting/` | Basic Targeting, v25.0 |
| S6 | `https://developers.facebook.com/docs/marketing-api/audiences/reference/placement-targeting/` | Placement Targeting, v25.0 |
| S7 | `https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data-call-to-action/` | Ad Creative Link Data Call To Action, v26.0 |
| S8 | `https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create/` | Lead Forms for Ads |
| S9 | `https://developers.facebook.com/docs/marketing-api/reference/ad-image/` | Ad Image reference |
| S10 | `https://transparency.meta.com/policies/ad-standards/` | Introduction to the Advertising Standards. No date shown. |
| S11 | `https://transparency.meta.com/policies/ad-standards/unacceptable-content/discriminatory-practices/` | Discriminatory Practices, last updated 2024-12-20 |
| S12 | `https://transparency.meta.com/policies/ad-standards/restricted-goods-services/financial-services/` | Financial and Insurance Products and Services, last updated 2026-05-01 |
| S13 | `https://www.facebook.com/business/ads-guide/update/image/facebook-feed/link-clicks` | Ads Guide, Traffic image ad specs on Facebook Feed |
| S14 | `https://www.facebook.com/business/ads-guide/update/image/facebook-feed/outcome-leads` | Ads Guide, Leads image ad specs on Facebook Feed |
| S15 | `https://www.facebook.com/business/ads-guide/update/image` | Ads Guide, Awareness image ad specs on Facebook Feed (same figures as S13 and S14) |
| S16 | `https://transparency.meta.com/policies/ad-standards/deceptive-content/prohibited-financial-products-and-services/` | Prohibited Financial Products and Services. No calendar date shown. |

## 1. Summary

| # | Question | Finding | Status | Source |
|---|---|---|---|---|
| 1a | Which categories exist | HOUSING, EMPLOYMENT, FINANCIAL_PRODUCTS_SERVICES (replaces CREDIT from 2025-01-14), ISSUES_ELECTIONS_POLITICS, NONE. The field takes an array, so several can be sent together. | VERIFIED | S1, S2, S3 |
| 1b | Which category applies to everyday mortgage ads | No readable Meta page says. A mortgage ad is inside Meta's financial products policy and so inside the Special Ad Category requirement, but Housing versus Financial products and services versus both is not stated. | UNVERIFIED | S10, S12, S16 (and the unreadable Help Center page above) |
| 1c | Do the targeting rules differ between the two categories | No. Meta states one set of audience and location rules for housing, employment, and financial products and services together. | VERIFIED | S1 |
| 2a | ZIP code targeting | Not allowed (`zips` is a prohibited location type). | VERIFIED | S1 |
| 2b | Minimum radius | The selected area must include everything within 15 miles (25 km) of any selected city, address, or dropped pin in the US and Canada (15 km in Europe). | VERIFIED | S1 |
| 2c | Cities and states | Neither is on Meta's prohibited list. Meta names only what is prohibited (subcity, neighborhood, metro_area, small_geo_area, subneighborhood, electoral_district, zips) and does not publish a positive list of allowed types on this page. Location exclusion is not supported. | VERIFIED (by the prohibited list) | S1, S5 |
| 2d | Does Meta widen a small area automatically | No readable page describes automatic widening. The nearest rule is 2b, which is a requirement on the advertiser's selection and has the same practical effect around a city. | UNVERIFIED as "automatically"; 2b is VERIFIED | S1 |
| 3a | Age | Options are fixed to include ages 18 through 65+ (no narrowing). Loan ads must be aimed at people 18 or older. | VERIFIED | S1, S12 |
| 3b | Gender | A specific gender cannot be chosen; all genders. | VERIFIED | S1 |
| 3c | Detailed targeting | Behavior and demographic targeting, interest exclusion, and detailed targeting exclusion are not permitted. Supported interests must come from a previously approved list. | VERIFIED | S1 |
| 3d | Lookalike audiences | Unavailable. | VERIFIED | S1 |
| 3e | Custom audiences | Customer-list custom audiences are allowed only when eligible (`is_eligible_for_sac_campaigns`) and when the ad set certifies compliance (`is_sac_cfca_terms_certified`), enforced from March 2025. | VERIFIED | S1, S4 |
| 3f | Advantage+ audience and detailed targeting expansion | The Marketing API page lists both among supported features for these campaigns. This conflicts with a search-result summary of an unreadable Help Center page. Not resolved. | UNVERIFIED | S1 |
| 4 | Placements | No readable page states a placement restriction for these categories. `feed` is a valid Facebook position; Instagram, Messenger, Threads, and Audience Network also exist as platforms. Certain placements depend on the campaign objective. | VERIFIED that S1 and S6 state no limit; a limit elsewhere is UNVERIFIED | S1, S6 |
| 5a | CTA values, generic | A long enum (listed in section 5). Meta says not every type works for every ad. | VERIFIED | S7 |
| 5b | CTA values on a lead-form ad | `APPLY_NOW`, `DOWNLOAD`, `GET_QUOTE`, `LEARN_MORE`, `SIGN_UP`, `SUBSCRIBE`. `CONTACT_US` is not on the list. | VERIFIED | S8 |
| 5c | Which of those the account's industry is offered | Meta says availability may depend on the advertiser's industry. | UNVERIFIED | S14 |
| 6a | Headline and primary text, recommended | Facebook feed image ad: headline 27 characters; primary text 50 to 150 characters. Meta labels these recommendations. | VERIFIED (as recommendations) | S13, S14, S15 |
| 6b | Headline and primary text, hard limits | Not stated on any readable page. | UNVERIFIED | S8, S13, S14 |
| 7a | Feed image, 4:5 | Recommended ratio 4:5, recommended 1440 x 1800, minimum width 600, minimum height 750, JPG or PNG, at most 30 MB, aspect ratio tolerance 3 percent. | VERIFIED | S13, S14, S15 |
| 7b | Feed image, 1:1 | The readable pages show only the 4:5 specification. A 1:1 size and a ratio range appeared only in a search-result summary. | UNVERIFIED | S13, S14 |
| 7c | Text in the image | Not stated on the readable Ads Guide pages. The Help Center page on text in ad images rendered no text. | UNVERIFIED | S13, S14 |

## 2. Question 1: which Special Ad Category applies to everyday mortgage ads

| Finding | Status | Source (address) | Read |
|---|---|---|---|
| Category values for the `special_ad_categories` field are HOUSING, EMPLOYMENT, FINANCIAL_PRODUCTS_SERVICES, ISSUES_ELECTIONS_POLITICS, NONE. The page says FINANCIAL_PRODUCTS_SERVICES was introduced in October 2024 and replaces CREDIT as of 2025-01-14. | VERIFIED | `https://developers.facebook.com/docs/marketing-api/special-ad-category/` | 2026-10-02 |
| The campaign reference (v25.0) still lists CREDIT and ONLINE_GAMBLING_AND_GAMING in the enum beside the values above, and the create call types the field as an array of that enum, so more than one category can be sent in one campaign. | VERIFIED | `https://developers.facebook.com/docs/marketing-api/reference/ad-account/campaigns/` and `https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/` | 2026-10-02 |
| Any US advertiser, or advertiser aiming at the US, Canada, or parts of Europe, who runs financial products and services, housing, or employment ads must self-identify as a Special Ad Category and use the approved targeting options. | VERIFIED | `https://transparency.meta.com/policies/ad-standards/` | 2026-10-02 |
| Mortgages are named as a product that may require a license, in the policy titled Financial and Insurance Products and Services (last updated 2026-05-01). That page does not use the words "Special Ad Category" and does not say which category a mortgage ad takes. | VERIFIED (what the page says) | `https://transparency.meta.com/policies/ad-standards/restricted-goods-services/financial-services/` | 2026-10-02 |
| The Prohibited Financial Products and Services policy lists payday loans, paycheck advances, short-term loans of 90 days or less, and others. It does not mention mortgages and does not use "Special Ad Category". | VERIFIED | `https://transparency.meta.com/policies/ad-standards/deceptive-content/prohibited-financial-products-and-services/` | 2026-10-02 |
| Which of Housing, Financial products and services, or both applies to an everyday mortgage ad. The Business Help Center page built to answer this rendered only its title. | UNVERIFIED | `https://www.facebook.com/business/help/298000447747885` | 2026-10-02 |

**What can be said.** A mortgage ad is a financial products ad (S12) and so is inside the Special Ad Category requirement (S10). That chain is why PRD-009 treats every library ad as a Special Ad Category campaign. Meta's readable pages do not choose between the two categories. Because the audience and location rules are the same for both (S1), the product's targeting posture does not depend on the answer. Only the category value the future publish step sends is at stake.

**Conservative default stays.** Housing, as PRD-009 already enforces (D-19, 009C-AC-001). The question for counsel and the lender (009F-AC-014 part c) stays open: Housing only, Financial products and services only, or both. The field accepts both, so sending both is technically possible; whether it is right is not verified. If the publish PRD sends a financial category at all, it should send FINANCIAL_PRODUCTS_SERVICES, which Meta introduced to replace CREDIT.

## 3. Question 2: location types

| Finding | Status | Source (address) | Read |
|---|---|---|---|
| ZIP codes (`zips`) are a prohibited location type, with `subcity`, `neighborhood`, `metro_area`, `small_geo_area`, `subneighborhood`, and `electoral_district`. | VERIFIED | `https://developers.facebook.com/docs/marketing-api/special-ad-category/` | 2026-10-02 |
| Location exclusion is not supported. | VERIFIED | same | 2026-10-02 |
| The selection must include every area within 15 miles (25 km) of any selected city, address, or dropped pin in the US and Canada, and within 15 km in Europe. For comparison, ordinary city targeting allows a radius of 10 to 50 miles. | VERIFIED | `https://developers.facebook.com/docs/marketing-api/special-ad-category/` and `https://developers.facebook.com/docs/marketing-api/audiences/reference/basic-targeting/` | 2026-10-02 |
| Regions (state, province, or region) and cities are ordinary geo types in Marketing API targeting, and neither is on the prohibited list. The page does not publish a positive list of permitted types. | VERIFIED (by the prohibited list) | same two addresses | 2026-10-02 |
| The restrictions apply to advertisers based in the US or reaching the US, Canada, or Europe. | VERIFIED | `https://developers.facebook.com/docs/marketing-api/special-ad-category/` | 2026-10-02 |
| Targeting options a campaign may not use must be removed, or the ad shows a delivery problem marked with error code 2909035. | VERIFIED | same | 2026-10-02 |
| Meta automatically widens a small area. No readable page says this. | UNVERIFIED | none | 2026-10-02 |

**What can be said in the product.** The 15-mile rule is stated by Meta. For a city it means the area the ad is aimed at includes everything within 15 miles of the city. For a state the rule changes nothing in practice. The design's clause "Meta may also widen a small area" is not what Meta says (a minimum area the advertiser must include, not an automatic widening), so it does not ship as worded. The verified rule replaces it (see section 8).

## 4. Question 3: age, gender, detailed targeting, lookalike and custom audiences

| Finding | Status | Source (address) | Read |
|---|---|---|---|
| Age options are generally fixed to include ages 18 through 65+ for housing, employment, and financial products and services. (Credit ads in Europe have a different range.) | VERIFIED | `https://developers.facebook.com/docs/marketing-api/special-ad-category/` | 2026-10-02 |
| Specific gender cannot be chosen; the default (all genders) applies. | VERIFIED | same | 2026-10-02 |
| Behavior targeting, demographic targeting, interest exclusion, and detailed targeting exclusion are not permitted. Supported interests must come from a previously approved list. | VERIFIED | same | 2026-10-02 |
| Lookalike audiences are unavailable for housing, employment, and financial products and services ads. | VERIFIED | same | 2026-10-02 |
| A customer-list custom audience can be used only if it is eligible for these campaigns (the `is_eligible_for_sac_campaigns` field tells), and since v22.0 the ad set must certify compliance (`is_sac_cfca_terms_certified`). Per the changelog, creating or updating an ad set that uses an ineligible customer-list audience is refused from March 2025. | VERIFIED | `https://developers.facebook.com/docs/graph-api/changelog/version22.0/` and the Special Ad Categories page above | 2026-10-02 |
| The Special Ad Categories page lists Advantage+ audience and detailed targeting expansion among supported features for category-tuned campaigns. A search-result summary of an unreadable Help Center page said the opposite. | UNVERIFIED (sources conflict; the Help Center side was not read) | `https://developers.facebook.com/docs/marketing-api/special-ad-category/` | 2026-10-02 |
| Ads must not discriminate on personal attributes (race, ethnicity, color, national origin, religion, age, sex, sexual orientation, gender identity, family status, disability, medical or genetic condition). Targeting options must not be used to discriminate. | VERIFIED | `https://transparency.meta.com/policies/ad-standards/unacceptable-content/discriminatory-practices/` (updated 2024-12-20) and `https://transparency.meta.com/policies/ad-standards/` | 2026-10-02 |

**Loan-specific rules on Meta's financial products policy** (`https://transparency.meta.com/policies/ad-standards/restricted-goods-services/financial-services/`, updated 2026-05-01, read 2026-10-02, VERIFIED):

- Ads for credit cards, loans, or insurance must be aimed at people 18 or older.
- Advertisers may be required to be licensed in the country they aim at, and Meta may check; mortgages are named among products that may require a license.
- Disclosures required by law must be provided.
- Ads that directly request the input of personally identifiable information or certain financial information are prohibited (under Meta's fraud and privacy policies, which that page points to).
- Payday loans, paycheck advances, bail bonds, and loans of 90 days or less are prohibited. This does not touch mortgages.

## 5. Question 4: placements, and question 5: call-to-action values

**Placements.** `https://developers.facebook.com/docs/marketing-api/audiences/reference/placement-targeting/` (v25.0, read 2026-10-02, VERIFIED):

- `publisher_platforms`: `facebook`, `instagram`, `threads`, `messenger`, `audience_network`.
- `facebook_positions`: `feed`, `right_hand_column`, `marketplace`, `video_feeds`, `story`, `search`, `instream_video`, `facebook_reels`, `facebook_reels_overlay`, `profile_feed`, `notification`.
- `instagram_positions`: `stream`, `story`, `explore`, `explore_home`, `reels`, `profile_feed`, `ig_search`, `profile_reels`.
- Which placements work depends on the campaign objective (for example the right-hand column is limited to Traffic, Conversions, and Product Catalog Sales).
- Neither this page nor the Special Ad Categories page states a placement restriction for housing or financial products. The Help Center page that would say so rendered no text, so a limit stated there is UNVERIFIED.

**Call-to-action values.**

- Generic list, `https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data-call-to-action/` (v26.0, VERIFIED): the enum is a long list. Those that mean "talk to a person" include `LEARN_MORE`, `CONTACT_US`, `GET_QUOTE`, `APPLY_NOW`, `INQUIRE_NOW`, `GET_IN_TOUCH`, `ASK_ABOUT_SERVICES`, `BOOK_A_CONSULTATION`, `MAKE_AN_APPOINTMENT`, `MESSAGE_PAGE`, `CALL_NOW`, `SIGN_UP`. The page says not every type works for every ad and sends the reader to the Ads Guide for the per-objective list.
- Lead-form ads, `https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create/` (VERIFIED): `link_data.call_to_action` must be one of `APPLY_NOW`, `DOWNLOAD`, `GET_QUOTE`, `LEARN_MORE`, `SIGN_UP`, `SUBSCRIBE`. `CONTACT_US` and the message buttons are not on this list.
- Ads Guide, Leads image on Facebook Feed, `https://www.facebook.com/business/ads-guide/update/image/facebook-feed/outcome-leads` (VERIFIED): lists many button names including "Learn more", "Contact us", "Send message", "Get quote", and "Apply now", and says not all calls to action may be available depending on the advertiser's industry. This is the generic list; the Marketing API page above is the narrower source for a lead-form ad.

**Fit for "talk to a loan officer."**

| Button | Allowed on a lead-form ad | Fit |
|---|---|---|
| `LEARN_MORE` ("Learn more") | Yes (S8) | Fits and is neutral. It is the PRD default and the button in the design's feed frame. |
| `GET_QUOTE` ("Get quote") | Yes (S8) | Fits the meaning, but a quote suggests terms. Counsel and lender decision before any library ad uses it. |
| `APPLY_NOW` ("Apply now") | Yes (S8) | Fits the meaning, but implies an application. Counsel and lender decision. |
| `SIGN_UP`, `SUBSCRIBE`, `DOWNLOAD` | Yes (S8) | Do not fit "talk to a loan officer". |
| `CONTACT_US` ("Contact us") | Not on the lead-form list (S8) | Closest in meaning, but not available on a lead-form ad per Meta's Marketing API page. |
| `MESSAGE_PAGE` ("Send message") | Not on the lead-form list (S8) | A messaging destination, not a lead form. The mapping of the button name to this enum value is not stated on a page I read. |

Which of the six a given account's industry is offered is UNVERIFIED until a connected account shows its live list.

## 6. Questions 6 and 7: text limits and feed image specifications

`https://www.facebook.com/business/ads-guide/update/image/facebook-feed/link-clicks` (S13), `.../outcome-leads` (S14), and `https://www.facebook.com/business/ads-guide/update/image` (S15), all read 2026-10-02, show the same figures under the headings "Design Recommendations", "Text Recommendations", and "Technical Requirements".

| Item | Figure | Status |
|---|---|---|
| Aspect ratio (shown) | 4:5 | VERIFIED |
| Recommended resolution (4:5) | 1440 x 1800 pixels | VERIFIED (recommendation) |
| Minimum width | 600 pixels | VERIFIED (requirement) |
| Minimum height (4:5) | 750 pixels | VERIFIED (requirement) |
| File types | JPG or PNG | VERIFIED |
| Maximum file size | 30 MB | VERIFIED |
| Aspect ratio tolerance | 3 percent | VERIFIED |
| Primary text | 50 to 150 characters, labelled a recommendation | VERIFIED (recommendation) |
| Headline | 27 characters, labelled a recommendation | VERIFIED (recommendation) |
| Description length | not given | UNVERIFIED |
| Hard maximum for headline and primary text | not given on any readable page (S8 gives no text limit either) | UNVERIFIED |
| 1:1 recommended size, 1:1 minimum height, feed ratio range | the readable pages show only 4:5; the figures appeared only in a search-result summary | UNVERIFIED |
| Text in the image (any limit or guidance) | not on the readable pages; the Help Center page rendered no text | UNVERIFIED |

The Marketing API Ad Image reference (S9) states no size limits and sends the reader to the Ads Guide.

## 7. Comparison with PRD-009

| # | Meta finding | PRD-009 position | Verdict | Action |
|---|---|---|---|---|
| C1 | ZIP codes not allowed | D4 and D-18: no ZIP | Same | None. |
| C2 | Selection must include everything within 15 miles of a selected city | No radius control; step 3 lists the place as chosen ("Austin, TX"); the design hint says Meta "may also widen a small area" | **Stricter and VERIFIED.** The PRD did not carry this rule, and its copy implies the area is the city. | **Applied.** Amendment and 009d edits E1 and E2. |
| C3 | Age fixed to 18 through 65+, no gender choice, no detailed-targeting demographics or behaviors | No age, gender, or interest control | Same | None. Hint clause "Mortgage ads can't be aimed by age, gender or ZIP code" is VERIFIED and ships (E1). |
| C4 | Location exclusion unsupported | No exclusion control | Same | None. |
| C5 | Lookalike unavailable | None offered | Same | None. |
| C6 | Approved-list interests permitted | None offered ("no interests") | Meta looser than the PRD | Recorded. Not applied without counsel. |
| C7 | Eligible, certified customer-list custom audiences permitted | None offered (compliance control 6, D-18) | Meta looser than the PRD | Recorded. Not applied without counsel. |
| C8 | Advantage+ audience and detailed targeting expansion listed as supported (sources conflict) | "No audiences" | UNVERIFIED | Conservative default stays. The publish PRD must leave both off and read back the ad set. |
| C9 | Category for everyday mortgage ads not stated | Housing for every library ad (D-19) | UNVERIFIED | Default stays. Counsel and lender decide under 009F-AC-014 part c. |
| C10 | No placement limit stated for these categories; many placements exist | Facebook feed only (D-23) | PRD stricter than anything Meta states. A limit elsewhere is UNVERIFIED | Default stays. |
| C11 | Lead-form CTA list is six values; `CONTACT_US` is not one | 009c D1: one value from a fixed list, `LEARN_MORE` default, "list UNVERIFIED" | **Stricter and VERIFIED** than an unspecified list. The default is on the list. | **Applied.** Amendment and 009c edit E4. |
| C12 | Headline 27 and primary text 50 to 150 characters are recommendations, no hard limit read | Product limits 60 and 300 (009C-AC-001); the design's sample headline is 52 characters | Numerically stricter than the PRD, but a recommendation, not a rule | Recorded. Not applied as a check (it would refuse the design's own sample ads). Authoring guidance only, see section 8. |
| C13 | 4:5 recommended at 1440 x 1800; minimum 600 wide and 750 high; 3 percent tolerance | Library art 1080 x 1080 on top of a 270 px band (a 4:5 ad of 1080 x 1350) and 1080 x 842 on top of a band (a 1:1 ad of 1080 x 1080); art at most 1 MiB | The PRD meets every verified minimum and the 4:5 ratio exactly. It is below the recommended resolution, which is not a rule. | Recorded. No action. The publish PRD decides whether to export larger. |
| C14 | Ads must not directly request personal information or certain financial information | No word rule covers it (the rules block digits, `%`, `$`, contact details, and links, but not a request that has none of those) | **Stricter and VERIFIED.** | **Applied.** Amendment and 009d edit E3. |
| C15 | Loan ads must be aimed at 18+ | Covered by the fixed 18 through 65+ range; no age control | Same | None. |
| C16 | Advertisers may need a license where they aim; mortgages named | NMLS number printed on the band and required by `NMLS_NUMBER_REQUIRED`; whether law requires it on the ad is UNVERIFIED (G7) | Same. Meta's wording is about the advertiser's authorization, not about printing a number on the ad | None. G7 stays open. |
| C17 | Disclosures required by law must be provided | Locked disclosure, Equal Housing check | Same | None. |
| C18 | Text in the image: nothing readable | Band text fills about 20 percent of the tall ad and about 22 percent of the square ad | UNVERIFIED | Default stays. No claim about text in images in the copy. |

## 8. What was applied and what was not

**Applied (stricter than PRD-009).** Recorded as a dated entry in the index Amendments. The exact 009d and 009c edits are for the lanes that own those files; this check did not change any sub-PRD.

- **E1 (009d D4, hint).** The hint reads "Mortgage ads can't be aimed by age, gender or ZIP code, so you choose places, not people. Around a city, Meta requires the area to include everything within 15 miles." The design's clause "Meta may also widen a small area" does not ship.
- **E2 (009D-AC-008 and 009D-AC-014).** Step 3 lists each city as "<City, ST> and everything within 15 miles" and each state by name; a component test pins the hint string.
- **E3 (009d D5, 009D-AC-010, 009D-AC-014, 009D-AC-019).** A new library-ad rule `WORDS_PRIVATE_INFO_REQUEST` refuses words that name a private identifier a person could be told to type in.
- **E4 (009c D1 and 009C-AC-001).** `callToAction` is one of the six lead-form values with `LEARN_MORE` as default; `CONTACT_US` and message buttons are refused.

**Recorded, not applied.**

- Meta permits approved-list interests (C6) and eligible, certified customer-list custom audiences (C7). PRD-009 forbids both. Loosening needs counsel.
- Meta lists Advantage+ audience among supported features (C8). Unresolved.
- Headline 27 and primary text 50 to 150 are recommendations (C12). The 60 and 300 product limits stand. Optional authoring guidance for the catalog README and 009F-AC-014 part b: "Meta recommends about 27 characters for a headline and 50 to 150 for primary text on a Facebook feed ad; write to those where the idea allows." No check, no criterion.
- Recommended image resolution 1440 x 1800 (C13). Library art is smaller. A publish-time decision.

**Still UNVERIFIED, conservative default in force, claim kept out of the copy.**

1. Which category an everyday mortgage ad takes (Housing, Financial products and services, or both). Default Housing.
2. Whether Meta restricts placements for these categories beyond what S1 and S6 state. Default Facebook feed only.
3. Whether Meta widens an area automatically (beyond the 15-mile rule). The clause is out of the copy.
4. Which of the six lead-form buttons the account's industry is offered. Default `LEARN_MORE`.
5. Hard maximums for headline and primary text.
6. 1:1 recommended size, the feed ratio range, and any text-in-image guidance.
7. Advantage+ audience and detailed targeting expansion under these categories.

**Seen in search-result summaries and third-party pages, not relied on.** A summary of the unreadable Help Center audience page agreed with S1 on age 18 to 65, all genders, no postal code, no location exclusion, and no lookalike, but said Advantage detailed targeting is unavailable (conflict, row 3f). A summary of an Ads Guide page gave a 1:1 size of 1440 x 1440 and a 600 pixel minimum height. A summary of the text-in-ad-images page said Meta no longer limits text in images but recommends little text. Several third-party blogs said mortgage loans belong under Housing. None of these is Meta's own readable text, so none counts.

## 9. Re-check list for the publish PRD and before launch

Meta's Business Help Center cannot be read by a fetch tool. Before any live launch, an operator with a browser should open the eight unreadable pages in the section "How to read this record" and record, for each, what it says. The first four matter most: the category choice, the audience page, the financial products page, and the location page. A connected ad account will also show which category and which call-to-action buttons it is offered. This record must be re-read before the publish PRD, because Meta changes these rules (the CREDIT to FINANCIAL_PRODUCTS_SERVICES change took effect 2025-01-14).
