# Webinar preparation and raster UX review

Date: October 13, 2026. Independent reviewer: ux-ui-guardian, task `/root/webinar_visual_review`.

## Governing requirements

Design Brief section 14: "Forms become one column." Section 15: "Every disabled consequential action explains why it is disabled and gives the next safe action." Section 13: "Dashboard theme never changes" Meta creative or approved artifact hashes.

The current product design system is `library/knowledge/private/ux-ui/`, including `03-components/select-and-product-setup.md` (Shared Select), `03-components/campaign-and-artifact-workflow.md` (Artifact workspace and Approval summary), and `04-screens/campaign-lifecycle.md` (Required cross-screen invariants). Its light bordered cards, Inter, semantic theme tokens and shared product wrappers govern application presentation. CTR-002 revision 2 sections 4, 5 and 6 additionally govern the two exact raster shapes, original illustrated lettering, separate edited placement words, actual stop time, and human decision standing. Engineering acceptance is not lender creative approval.

## Verdict and scope

PASS for the supplied raster and local preparation visual evidence. Individually opened all 32 original PNGs in `test-results/product-review-frames/webinar-raster/` and all 24 original screenshots in `test-results/product-review-frames/webinar-preparation/`, 56 distinct files total. No contact sheet, regenerated replacement, baseline alteration, source mutation or commit was used for this review.

No blocking visual finding was identified within those images. This does not close the complete saved campaign journey: the separate seeded PostgreSQL browser suite and its expected 24 saved-review/approval images were not available for inspection at this checkpoint. No hosted deployment, lender acceptance, Meta activation, publication conversion or spend qualification follows from this verdict.

## Actual raster observations

Every one of the fifteen templates was inspected in its square and tall final form. The source panel remains complete, with its headline, educational subline and drawing inside its boundaries. Square is 1080 by 1080 with the original panel ending at y=842; tall is 1080 by 1350 with the panel ending at y=1080. The lender footer begins directly below that panel. No observed text or icon crosses into the footer or outside the output.

The two additional long-brand specimens were also opened individually. In `long-brand-square.png`, the name at approximately x=150, y=869 wraps into two lines; the company at x=721, y=872 wraps into two lines without colliding with the name column. The title and lender NMLS remain complete. The disclosure starts at approximately x=38, y=1009 and finishes above the lower boundary around y=1059. In `long-brand-tall.png`, the disclosure starts near x=38, y=1280 and its second line ends near y=1329, inside the 1350px image. Neither long specimen clips, ellipsizes or overlaps the disclosure.

The short synthetic Alex Morgan/Prairie Home Lending cases retain both NMLS values and Equal Housing Opportunity. Those fixtures are explicitly synthetic, not verified real licenses. The footer identity, disclosure and original illustrated lettering are visibly distinct from the edited Facebook placement wording. Color variants in original paid artwork are frozen output choices, not dashboard status colors or UI token overrides.

The renderer's fixed readable floor and complete-text rejection are at `packages/rendering/src/webinar-ad-raster.ts:198-218`. Its native footer composition is at `:227-247`; original panel and footer composition is at `:281-289`. This review confirms observed pixels, not an independently rerun byte-determinism or production runtime test.

## Actual preparation observations

For every supported width, 1440, 1180, 768 and 390, both Light and Dark were inspected in each supplied state: `choose`, `setup` and `retry`. The filenames named `setup` actually show the third-step pre-save summary after Review setup, not the editable second-step form. The evidence is therefore eight choose images, eight pre-save summary images and eight retry images.

The creative collection uses three columns at 1440/1180, two at 768 and one at 390. All fifteen choices remain within their cards, with readable topic, purpose, pending review label and Use this creative action. Filters wrap rather than forcing horizontal page expansion. At 390px the layout keeps the 16px outside gutter, a mobile Menu control and one reading column.

The summary and preview sit beside each other at 1440/1180, and stack at 768/390. Edited headline and primary words appear separately from the original illustrated lettering. The requested UTC end, budget and places remain visible, with an explanation that saving confirms the effective stop time and does not launch or spend. The preview retains the same output colors in both themes; the surrounding application surfaces and copy change theme.

In `retry-390-light.png` and `retry-390-dark.png`, the action row at approximately y=1346 is contained within x=37 through x=350. Edit setup is visibly disabled, while Retry this exact save remains a full 44px-high action. The unfinished-check explanation wraps below around y=1413 through y=1495; Inspect the recorded campaign is readable near y=1527. The subsequent preview starts below the recovery card, with no action overlay. The same recovery sequence remains contained at the other three widths.

Composition uses product `Badge`, `Button`, `Card`, `Link`, `Select`, `Stepper`, `TextArea` and `TextField` wrappers, `apps/web/src/features/webinar-ads/preparation.tsx:3`. The distinction between original lettering and edited placement copy is explicit at `:482-485`. Save/retry controls and their alert are at `:583-630`. Responsive grids use semantic spacing and surface helpers in `preparation.module.css:1-118`, without a new palette or motion bucket. Focus moves to the new step heading or material outcome at `preparation.tsx:175-184`, rather than being inferred from screenshots.

## Interaction evidence and remaining checks

Read the actual retained log `test-results/webinar-ui-browser.log`: eight Chromium cases passed in 38.6 seconds. The test source `tests/browser/webinar-preparation.spec.ts:13-95` uses explicitly synthetic context and HTTP 503 fixtures in a production-built local shell. It exercises selecting Published webinar by Home/Enter, form entry, accessibility and horizontal overflow checks, exact uncertain save, actual reload, second request equality including its UUID, disabled Edit setup and zero page errors. This reviewer inspected the source and retained result; the suite was not independently rerun here. A passing axe scan is bounded automated evidence, not a full accessibility certification.

Open evidence items:

- Retain and inspect an editable step 2 form and an open keyboard Select popup if they are claimed as independently visually qualified. The supplied screenshots do not capture those states, although the local test interacts with them.
- Run and inspect the real saved-publication/Brand, campaign persistence, RSC reload, both exact PNG downloads, current refusal, recorded approval and provenance journey in `tests/browser/review/webinar-ads.spec.ts`. All expected saved-review images remain open for independent UX inspection.
- Preserve the actual byte identity of both downloads and previews as source/renderer changes land. Download and approval source (`review.tsx:71-105`, `:233-247`) does not itself qualify unseen pixels.
- Keep owner/lender creative acceptance and hosted/provider outcomes open. The observed preparation copy is consistent with those limits.

No visual source edit is requested by this checkpoint. Any later layout or copy fix requires renewed captures for the affected states before extending this verdict. This report owns only its named review file and leaves other active Guardian work untouched.

## Exact evidence inventory

The following SHA-256 values pin the source and each individually opened original. Baseline parent commit was `5eb7fef829e6e17eaf147256f564704e46a23a7b`; the new implementation was uncommitted during this review.

### Source pins

| Source | SHA-256 |
| --- | --- |
| apps/web/src/features/webinar-ads/preparation.tsx | f9c2846b738dfce12f60b471b7e2933fb9ae47d1129f77be8cbbcd239e009091 |
| apps/web/src/features/webinar-ads/preparation.module.css | fbc519c7c09891a9936847463f7f810adedbbd88f7302d81f73ae10d97002dad |
| apps/web/src/features/webinar-ads/preparation-model.ts | ab0d5c0d3392883c77599b34ea23752b62819e644d8c7a6ae382e11f54d82133 |
| apps/web/src/features/webinar-ads/pending-save.ts | f90a988e863d51ad80550b2b1a1ccc95e6401a067233cb6378ff3123997a4261 |
| apps/web/src/features/webinar-ads/review.tsx | 0ba7711a7e021f306a040e9887aef4dde24ec13c4198047e721c0d370e0fcd6b |
| packages/rendering/src/webinar-ad-raster.ts | c7bd7d5b8bec71936094ab8a353668d9b0382d7ccc6a396c11d4ee454f111a5e |
| apps/web/src/server/webinar-ad-raster.ts | 3c209a3c03dc25c3d4f4d03af492a5d84aa89a72b1028a964be426cf86746680 |
| apps/web/src/server/webinar-ad-art.ts | 2c3129682fe77e8b794090ceb9144c5d35ffccee4a679e98254f676d9d2fd7f0 |
| tests/browser/webinar-preparation.spec.ts | 5e4bdc48b824820660a45cae864bfac6b8e8786cf252c9048db5bc34755b068c |
| tests/browser/review/webinar-ads.spec.ts | 67687a8d087905fc2148ac1dcdd00ea6a013a7939c69a5957cfea9b102a2bf02 |
| library/knowledge/private/contracts/CTR-002-webinar-ad-destination.md | 47dba3f41499d50141c2bfc5a3a7f67468524d4a3f39a1f96a8506b8ac957f28 |

### Inspected original image pins

Paths are relative to `test-results/product-review-frames/`. Each table row denotes one original individually inspected in this review.

| Original | SHA-256 |
| --- | --- |
| webinar-raster/long-brand-square.png | d9ae5a2b780acd4a07537b1d88d51b7d1d80544815a38444869d7aa167c6e688 |
| webinar-raster/long-brand-tall.png | e3aeaf812745bcda6cc07e13cabc8adb17e666eef70fc4db2aa062f54352850d |
| webinar-raster/webinar-before-home-search-square.png | 67e47cf180a38d8c9141d5c645b043ed89ba46f41ebed5f4a1b263c93840f00e |
| webinar-raster/webinar-before-home-search-tall.png | 95ed54478b6df3ae247412dc592b03cc3f78c8b9b49168f5ad8d9ee28649e05f |
| webinar-raster/webinar-budget-beyond-price-square.png | d85007c185d10ae581061521a80df8a01a1e42825f856ed296b4a77f1b3e0c51 |
| webinar-raster/webinar-budget-beyond-price-tall.png | 1f0ba4bd4f6e5dcde8924bab09af04cc95eaa86db1ab23f1169356982b76f264 |
| webinar-raster/webinar-budget-your-life-square.png | 26c26c9c8ec6b85e45f3bfe0945c6bfe4889a232b6d423c61cc3a9d4763364ef |
| webinar-raster/webinar-budget-your-life-tall.png | e14d00b185f89236f7f744c35990db9b7f605e98c9c03ff21df3d0b11d704682 |
| webinar-raster/webinar-cash-to-close-square.png | 8109239fed973201b38e16ecacb4398f71e6cf3ca83be66338c448fad346fa14 |
| webinar-raster/webinar-cash-to-close-tall.png | f860622f47a5b44e258484aed78feebb3681833d37e0e9c814958580490e8e3b |
| webinar-raster/webinar-closing-checklist-square.png | 5fdba55b4e17debcef821beaacc1c1c873ee30a92c81b906215e07864018008b |
| webinar-raster/webinar-closing-checklist-tall.png | 5859d2e792be76d629718df8997d0cc0399cad3bc3972639c0247383d1066f2b |
| webinar-raster/webinar-credit-next-step-square.png | de897dc0fb018f03aa7e4a3c225ce366c36c2403b3ff4f6afd56201fb74f0405 |
| webinar-raster/webinar-credit-next-step-tall.png | 08d335f6fe05923d2da2c6b8ffeadf83b9dabb79f9249548534bf8b3578d8ad0 |
| webinar-raster/webinar-credit-preparation-square.png | ac73c16bf707d9d1dfd806a99b82932f2b03961856b929b5bd980ffeb0389042 |
| webinar-raster/webinar-credit-preparation-tall.png | 8f70d5a37fe6a821fc529225750dc7e213e54335713ab09eb6e2bc4b85ea8481 |
| webinar-raster/webinar-credit-questions-square.png | 11da96a78c97989b84e7d1efcf0bee8e5d97109f33387d676ef18d423b2e0d72 |
| webinar-raster/webinar-credit-questions-tall.png | 6e74b12c11c9801d2b52fc6bb4047e26eed2f03c64c267215f1d6d03b62e1f89 |
| webinar-raster/webinar-first-home-plan-square.png | 60a96fa4bdd3d83c1ffd661900c1fcdab577caeab2fcd0cfcbf52289ad8bc6e8 |
| webinar-raster/webinar-first-home-plan-tall.png | 23907921b7308bee30d210eca5ba2c353949184d7d5b966b1a9eed304541a015 |
| webinar-raster/webinar-offer-to-keys-square.png | 306823b51e225b292183e27b55d303f19b803d67fee44b3b84a64c9b113f85e0 |
| webinar-raster/webinar-offer-to-keys-tall.png | 9e4238e652d65032f213e73f838a21eda7baaa92fe0e990d85462c30c03f006f |
| webinar-raster/webinar-paperwork-path-square.png | da8c6d85849de4331f1ce9fc4d3897570b0a57518027b4f62d7e6492128b88b6 |
| webinar-raster/webinar-paperwork-path-tall.png | f53cd9058d0702488dd6922c8fda760ede38190de51df4c37ffd6e5bfaaf374d |
| webinar-raster/webinar-path-to-closing-square.png | 8f6ab946c90cef23db86aeed5efbde7f010c6e6613062096a1fa7d48cfaa3c0e |
| webinar-raster/webinar-path-to-closing-tall.png | f21e38de64c5873b1afc5335674f0bb134f7643f6dc37b03943738752530554b |
| webinar-raster/webinar-preapproval-explained-square.png | 855767054de964086c8cdc82d48be0c5d899b2a1c17747fbe5e0eac5ebdcc189 |
| webinar-raster/webinar-preapproval-explained-tall.png | 83d333a4b17f06667417ca360cce58245ba498a9be26400d74f4a8b6ba1c59b1 |
| webinar-raster/webinar-questions-first-square.png | df22d54e4573a90c2329d51fdb895f1d82cdc3e96c86b797a218daa1ff157d9a |
| webinar-raster/webinar-questions-first-tall.png | 9b11704db1de2ed989a39385abddccf180483abedd5934546b95dafb7a8d5229 |
| webinar-raster/webinar-renting-next-chapter-square.png | 1491eedc9d98964ac5bdaa7347985054708cbe2a67eefbe89435457fbc4acc65 |
| webinar-raster/webinar-renting-next-chapter-tall.png | aa971794d550af0d1d7a958e4ddc7212cd1c87887d7e990431b1124e02420c31 |
| webinar-preparation/choose-1180-dark.png | 696e6e208069789b105ac118f16886e7d7428f1a1b292c4fcd94da35fb29d1eb |
| webinar-preparation/choose-1180-light.png | c0a239ea77783b5afdcc324b9a37a92cc75e3cf3b13895c213e4b5d480c19dde |
| webinar-preparation/choose-1440-dark.png | 908438d200c7ceab374be1ee139a6aced1728e483fd073deb61b3738fe952481 |
| webinar-preparation/choose-1440-light.png | 4d808e85da3c628758af41d54bf55bf92d9d727adab9daca7ba5090a148e990e |
| webinar-preparation/choose-390-dark.png | 37132df4d56280ce546b6f7883b979fff196aecb5fb177f7a641227162d0d74c |
| webinar-preparation/choose-390-light.png | 8094000f3b233149cece6576add5d6dbca66ac592b11a94af41d1d0082fc7961 |
| webinar-preparation/choose-768-dark.png | fdfdb9ba2097fb45c2420681d4f1e307886f4795808846b07d253d9566d56233 |
| webinar-preparation/choose-768-light.png | 98c883908cf13afd0a24e3570e7802e13c8687693d902066adcfaee51a6255d7 |
| webinar-preparation/retry-1180-dark.png | 04e450f83652b855212760812e85b64681a039fe3481ec6c500a1adb0759aef2 |
| webinar-preparation/retry-1180-light.png | 82f6a6da656a85856b309046bd7d2c53bcda9dab8e550e3d188a7f635a76011b |
| webinar-preparation/retry-1440-dark.png | 3e9710b74f17eea9b32b91b5ae4597b958aade1e993a28ec3edbf3d91d3a6a65 |
| webinar-preparation/retry-1440-light.png | e834b0bc28377b006c4520fff6390ef2edd71387dfa2a386c289f9971fe8c1f1 |
| webinar-preparation/retry-390-dark.png | 277726072922fbc958fbe67a940ba3e2d2d80e75eed5aca027cfd10d11a39581 |
| webinar-preparation/retry-390-light.png | 7f2ea5565446c1276117d03cb2853fb2ca437dd01dfd03025246f2f716216122 |
| webinar-preparation/retry-768-dark.png | f719daf72fe43ec62c980cf3ed36391e5dff473c8ace19b0beb06c14f19431a9 |
| webinar-preparation/retry-768-light.png | 833bef2beff71454813b395901b8b874092cea88f62872478c8716c530562c73 |
| webinar-preparation/setup-1180-dark.png | 1e3a51cb668033157f7cc627e0e58e35e7cb4013df7e7f6fa71b8aa07e3a4736 |
| webinar-preparation/setup-1180-light.png | f90b026efbc31baae178df6f7ef5608e154b0212fd2e402a6898653b9a7c5927 |
| webinar-preparation/setup-1440-dark.png | e6e83428454aa13948d5e53353b15af45db6bb535c3b861afd17ff6255ab171d |
| webinar-preparation/setup-1440-light.png | dc6fa10a05d8698699f826b299da485b9c4cf03090beb2885421ef24d77b5b34 |
| webinar-preparation/setup-390-dark.png | b090ef4195d4b332e9a1af1f2e7b2f12b2271279bfb27222798022b3c7d7add8 |
| webinar-preparation/setup-390-light.png | 96126c41ba7dd3a1c69a90c646ce987ef9d8b0e9570278042d0cc648cf0e0419 |
| webinar-preparation/setup-768-dark.png | bb4bf66920326b01015046a410acde4c6a70b185f4d564b3677c8b58613751d9 |
| webinar-preparation/setup-768-light.png | 7a305a14e4f3735eafed0dae101ca08d8da9f918bb54c1aa531b230224123c60 |

## WQ-01 follow-up: current-build form and Select popup qualification

Reviewed October 14, 2026 UTC, continuing the October 13 execution batch. This appendix supersedes the earlier preparation capture qualification and its form/popup evidence gap. The earlier inventory remains historical; it is not the current preparation pin set. The original raster review remains unchanged because no styling, source panel or renderer recipe changed in this correction.

PASS for all 40 current-build preparation PNGs, individually opened from the actual `test-results/product-review-frames/webinar-preparation/` files. These are five states at each of four widths (1440/1180/768/390) and two themes: choose, editable form, open keyboard popup, pre-save summary (`setup`) and exact retry. The 16 previous failed-build diagnostics in `test-results/webinar-form-capture/` were not counted as final evidence or substituted for any current image.

The governing Shared Select spec in `library/knowledge/private/ux-ui/03-components/select-and-product-setup.md` requires: "DOM focus stays on the combobox trigger." It also requires the popup to preserve theme/modal ownership and fit the viewport. The minimal shared correction at `packages/ui/src/components/Select.tsx:89-94` retains dialog/alertdialog priority, then selects the nearest main landmark before the product-shell/body fallback. Source and browser evidence now cover that real landmark boundary without filtering away the open-popup axe finding.

All eight new editable-form originals show full labels, 60/300 character hints, the original-lettering explanation, the selected published webinar, budget, UTC end, geography restrictions and Back to creatives/Review setup. The form and preview are side by side at 1440/1180 and stacked at 768/390. At 390 the fields span approximately x=37 through x=353 inside the card; the visibly focused headline ring spans about x=32 through x=358 without clipping. The form's two actions at y=1708 remain inside the available content width. The frozen illustrated lettering remains distinct from the edited placement headline and words.

All eight keyboard-popup originals show the focused trigger, selected highlighted option and checkmark in the correct theme. Approximate popup bounds are x=177 through x=683, y=532 through y=587 at 1440; x=57 through x=553, y=532 through y=587 at 1180; x=57 through x=711, y=622 through y=676 at 768; and x=37 through x=353, y=505 through y=559 at 390. Every observed option remains within the viewport and clear of the fixed top navigation. The temporary option overlay is visually separate from the form, with no cropped option text or focus ring. Selection text is readable in both themes. The single supplied eligible publication does not qualify a long-list/multiple-option layout.

Reopened all eight choose, eight summary and eight retry originals from the fresh build. Their layout, output colors, pending review standing, saving limits and recovery controls remain consistent with the earlier observations. No blocking visual regression or further source edit is requested.

Read the actual retained `test-results/webinar-select-landmark-browser.log`, eight Chromium cases passed in 48.1 seconds, and `test-results/webinar-select-landmark-build.log`, all 16 production build tasks successful. The refreshed test at `tests/browser/webinar-preparation.spec.ts:60-115` checks unfiltered axe while open, Home/Enter selection, retained trigger focus, matching active descendant/selected option, viewport geometry and Escape dismissal. It also retains exact original request body/UUID after actual reload and rejects unexpected page/console errors; the two explicit HTTP 503 fixture failures are expected. This reviewer inspected logs and source without rerunning the browser.

Producer provenance: `test-results/webinar-select-landmark/inventory.json`, captured at `2026-10-14T01:05:43.545Z`, SHA-256 `e792a0e54e7e0a6b82a131375d0ef011d23847e57a125c54facc2b1511aa1276`. Build ID `txjgUQpHXDDtupxplIJ01`, BUILD_ID file SHA-256 `068c67a0584b78683fff4d9947606375c19c6933ea4f224148fa95f7b1bdf995`. Independently compared all 40 image digests and the inventory's three changed source pins against the actual files: zero mismatches. The table below records those current originals; no image was postprocessed by this reviewer.

The earlier editable-form/open-popup visual evidence gap is CLOSED for this bounded synthetic case. Seeded real database saved-review, exact downloads, human decision and current refusal browser captures remain OPEN. Lender/provider/hosted acceptance remains OPEN. This update is released for fresh Quality after the concurrent Security recheck. Only this report was appended; no source, server, baseline or commit was changed.

### Updated source pins

| Source | SHA-256 |
| --- | --- |
| packages/ui/src/components/Select.tsx | 7dd5422cf5e56a6301fff09efa830c7d8b3d3cefc266d169554497644e0e21e8 |
| apps/web/src/features/dashboard-preview/shared-select.integration.test.tsx | b8237ac401e45dcd96453d51f5131797160ad36260f8b2a935e6f62991a278f9 |
| tests/browser/webinar-preparation.spec.ts | 65ccf6c58b715fabd0bf3827e10846c4f2d7475ca3bf2132640004c4184709b5 |

### Current-build individually inspected preparation originals

| Original | Dimensions | SHA-256 |
| --- | --- | --- |
| choose-1180-dark.png | 1180x4314 | 696e6e208069789b105ac118f16886e7d7428f1a1b292c4fcd94da35fb29d1eb |
| choose-1180-light.png | 1180x4314 | c0a239ea77783b5afdcc324b9a37a92cc75e3cf3b13895c213e4b5d480c19dde |
| choose-1440-dark.png | 1440x4356 | 908438d200c7ceab374be1ee139a6aced1728e483fd073deb61b3738fe952481 |
| choose-1440-light.png | 1440x4356 | 4d808e85da3c628758af41d54bf55bf92d9d727adab9daca7ba5090a148e990e |
| choose-390-dark.png | 390x12028 | 37132df4d56280ce546b6f7883b979fff196aecb5fb177f7a641227162d0d74c |
| choose-390-light.png | 390x12028 | 8094000f3b233149cece6576add5d6dbca66ac592b11a94af41d1d0082fc7961 |
| choose-768-dark.png | 768x6536 | fdfdb9ba2097fb45c2420681d4f1e307886f4795808846b07d253d9566d56233 |
| choose-768-light.png | 768x6536 | 98c883908cf13afd0a24e3570e7802e13c8687693d902066adcfaee51a6255d7 |
| form-1180-dark.png | 1180x1707 | 2087de54dd39d17c4009c12ffbe04f44244041a2dc22e13760c7f06fc8d1a0d6 |
| form-1180-light.png | 1180x1707 | 7bc146c8dcf46b154c7ce5fd0d8ac0f27ec846c8dc490b5880c5a7a406e3a2d5 |
| form-1440-dark.png | 1440x1707 | 9d2702755734b63a0f767d1089b1638f5c5ce510d77fd943dc8604558693deea |
| form-1440-light.png | 1440x1707 | c5f72e4cd07e1057312326a1a76fd75bd626218425864f590b40b0f445d2400b |
| form-390-dark.png | 390x2641 | 860cd49d0d86b120822355442608538a090d9009550416ee9b5dc27126ff2430 |
| form-390-light.png | 390x2641 | c838ed45727ab93a17af5397daa476fd76ce2f4bd2e68b1fa503ab5526eec42c |
| form-768-dark.png | 768x2924 | 5af374e781faaccef756f6f4292d590062bf22d9374510f0fc9e872b7da93ae1 |
| form-768-light.png | 768x2924 | 9d0993af027075570741413d14ca03b90ddb1a6bb40eae6dc7fd90c3d94b04c7 |
| keyboard-popup-1180-dark.png | 1180x900 | f46f4932d87588341be1dcbbe8968df62cca8b1ef7a1e765b0e3212551973086 |
| keyboard-popup-1180-light.png | 1180x900 | 6b06f997648eadf0e154570fab4ab7cd306b62409b75240851e7981ab03b9a4e |
| keyboard-popup-1440-dark.png | 1440x900 | 532ade99cac8b55f0d3d9595d06ffa39465835e68f6cd1d3f08a6294eb9bd347 |
| keyboard-popup-1440-light.png | 1440x900 | f34240a62bae5c80c7f5c25ec0bf986ab5cbc22f06180569cb832d14e511a315 |
| keyboard-popup-390-dark.png | 390x844 | 610167c6080723e8d06ad0ba3d299213194764f60d419cc9dcb502ddca1999d4 |
| keyboard-popup-390-light.png | 390x844 | 088a37f6600bedc925522b797b9db0e77e82ae676f45054f9cd56687b0f6a73a |
| keyboard-popup-768-dark.png | 768x1024 | 94a14aea14206a5a01ec96b225253578e582a3f5b54b79005f046cde0765a542 |
| keyboard-popup-768-light.png | 768x1024 | e131f1136c1182847de48ab32313c741cb464311901068f3e01f882b759064f9 |
| retry-1180-dark.png | 1180x1494 | 04e450f83652b855212760812e85b64681a039fe3481ec6c500a1adb0759aef2 |
| retry-1180-light.png | 1180x1494 | e4aace980d57dce3ca3c2cd56ecf986bd90adede7542dae6462c180e71d04503 |
| retry-1440-dark.png | 1440x1507 | 3197d4b1e3e23f1932f24f841d836e9c743e315be33123c5467a965291cf8759 |
| retry-1440-light.png | 1440x1507 | e834b0bc28377b006c4520fff6390ef2edd71387dfa2a386c289f9971fe8c1f1 |
| retry-390-dark.png | 390x2435 | 277726072922fbc958fbe67a940ba3e2d2d80e75eed5aca027cfd10d11a39581 |
| retry-390-light.png | 390x2435 | 7f2ea5565446c1276117d03cb2853fb2ca437dd01dfd03025246f2f716216122 |
| retry-768-dark.png | 768x2613 | 92dfba396623ba7c895efee2bafefbe92f470b5ee45d594363205447d030e984 |
| retry-768-light.png | 768x2613 | 8abb8d87070f75c3b92f9593191b1434b59ed85b2123c5f988fd9f4a091b6301 |
| setup-1180-dark.png | 1180x1494 | 1e3a51cb668033157f7cc627e0e58e35e7cb4013df7e7f6fa71b8aa07e3a4736 |
| setup-1180-light.png | 1180x1494 | f90b026efbc31baae178df6f7ef5608e154b0212fd2e402a6898653b9a7c5927 |
| setup-1440-dark.png | 1440x1507 | e6e83428454aa13948d5e53353b15af45db6bb535c3b861afd17ff6255ab171d |
| setup-1440-light.png | 1440x1507 | dc6fa10a05d8698699f826b299da485b9c4cf03090beb2885421ef24d77b5b34 |
| setup-390-dark.png | 390x2279 | b090ef4195d4b332e9a1af1f2e7b2f12b2271279bfb27222798022b3c7d7add8 |
| setup-390-light.png | 390x2279 | 96126c41ba7dd3a1c69a90c646ce987ef9d8b0e9570278042d0cc648cf0e0419 |
| setup-768-dark.png | 768x2505 | bb4bf66920326b01015046a410acde4c6a70b185f4d564b3677c8b58613751d9 |
| setup-768-light.png | 768x2505 | 7a305a14e4f3735eafed0dae101ca08d8da9f918bb54c1aa531b230224123c60 |

## Fresh plain-copy preparation review, October 14, 2026 UTC

PASS for the bounded synthetic presentation at Build ID `XdH5zlzvUTXy-B1DVM91e`. Individually opened all 40 current originals from `test-results/product-review-frames/webinar-preparation/`: eight each of choose, editable form, keyboard-popup, pre-save summary (`setup`) and retry, across 1440/1180/768/390 and Light/Dark. No new blocking visual finding or source edit is requested. This appendix supersedes the preceding preparation image/source pin set for the latest copy correction, while preserving both earlier reviews and the original failed-build evidence history.

The governing design brief sections 10, 13, 14 and 15 require the existing text scale, both themes, readable responsive flow and truthful actions. `03-components/async-empty-error-permission-state.md`, Variant contract, requires an error to identify the last safe state and offer retry only when safe. `03-components/campaign-and-artifact-workflow.md`, Artifact workspace and Approval summary, requires exact immutable previews/downloads and version-bound approval context. These existing rules cover this copy correction; no token or styling amendment is needed.

The caption at `apps/web/src/features/webinar-ads/preparation.tsx:642-644` now says the preview uses the saved brand and the saved review shows both exact branded PNGs and saved wording before approval. All eight form, eight summary and eight retry originals render it clearly. Approximate caption starts in the summary originals are (757,1320) at 1440, (627,1306) at 1180, (57,2316) at 768 and (37,2061) at 390. At 390 it wraps over three lines inside x=37 through x=353, without cutting off the following contact or publication wording. The original art remains visibly separate from the edited Facebook words, and its white branded footer remains readable in the local preview in both application themes. This caption describes a later saved review; the local summary itself is not evidence that the real saved-review journey works.

All eight retry originals keep the disabled Edit setup control, Retry this exact save, the unfinished-checks explanation and Inspect the recorded campaign visible. At 390 the retry action spans approximately x=159 through x=350, y=1346 through y=1390; the status begins at (37,1413) and wraps within the card through approximately y=1496. The words state that the version is recorded, its checks are unfinished and approval is unavailable. Neither theme loses the explanation or crowds the inspection link. The setup summary retains its distinct Save and check action and explicit save/approval/publication/spend boundaries.

The conflict and no-response strings were inspected in source at `preparation.tsx:273-297` and `apps/web/src/features/http/user-messages.ts:47-55`. They provide latest-version review or exact-save retry in plain language. No conflict screenshot is in this 40-image set, so this is a source wording observation, not a rendered conflict-state qualification. The changed saved-review wording at `apps/web/src/features/webinar-ads/review.tsx:38-41,65-77,138-139,248-249` and approval explanation at `apps/web/src/features/campaigns/components/campaign-approval-controls.tsx:269-272` likewise receive source-only observation here. Seeded real database saved-review/approval/refusal captures remain OPEN and require independent inspection of their eventual CI originals. No local RSC or synthetic fixture substitutes for that evidence.

Reopened all eight choose and eight editable-form originals: the 15-card catalog, topic filters, review badges, form labels, limits, original-lettering explanation, webinar selection, budgets, UTC end, geography restrictions and actions remain contained. Reopened all eight keyboard-popup originals: trigger focus ring, selected text and checkmark remain readable, with popup inside the viewport at the previously recorded coordinates. This single-publication fixture still gives no long-list qualification. The viewing tool automatically downsampled only the full-page choose originals at 768 (768x6536 to 705x6000) and 390 (390x12028 to 195x6000). Each actual original was opened individually; no crop, composite, replacement or pixel edit was made. That automatic display scaling limits fine-detail judgment on those four long captures; the unchanged native raster review and all shorter form/summary/retry/popup originals retain their earlier, separate qualifications.

Read the actual `test-results/webinar-final-preparation-capture/browser.log`: all eight Chromium preparation cases passed in 50.7 seconds. The existing source assertions cover unfiltered closed/open axe, Home/Enter/Escape, trigger focus, active descendant/selection agreement, popup geometry, no horizontal overflow, exact original body/UUID after reload, and expected 503 refusals. The build log records 16 successful tasks, 10 cached. These are producer-run logs inspected here, not a fresh reviewer browser run or broader provider approval.

Inventory `test-results/webinar-final-preparation-capture/inventory.json` is captured at `2026-10-14T01:28:58.435Z`, SHA-256 `dba3b56373017c3cca0b39686a883322154cb12e7d23b2f03d9e1f3a587fbc4c`. The application BUILD_ID file hash is `297f3c745355d3c7a5cb95f3606f11f367d92a6d4c21ca4e9f791bc7300cc105`, written at `2026-10-14T01:27:03.324Z`. Independently recomputed all 40 PNG hashes and IHDR dimensions, 10 correction source hashes, four supporting source hashes and both log hashes against the current files: zero mismatches. The inventory count is 40, and this reviewer individually inspected 40 current preparation originals. The original 32 native raster review is retained without new raster acceptance credit or recapture in this appendix.

Release this bounded visual review for Security and fresh Quality on the corrected source. Seeded saved-review/approval capture, lender/provider acceptance and hosted qualification remain open. Only this report is appended; source, baselines, servers, tests and commits were untouched by this reviewer.

### Plain-copy correction and supporting source pins

| Source | SHA-256 |
| --- | --- |
| apps/web/src/features/webinar-ads/preparation.tsx | 7dfc24bc7ac509e3271c06bbbf68e13cb6d76f6f6219a5d5c67ebb1034a31507 |
| apps/web/src/features/webinar-ads/review.tsx | 07491245c68938ca1f5993cea13f83626e6dab9018674b1d06891ae2a9c7e3ec |
| apps/web/src/features/campaigns/components/campaign-approval-controls.tsx | ea4268376542c733209b43aefec99dba03b1ea2b8a5fc10eb36c4775f8d40bff |
| apps/web/src/features/webinar-ads/review.integration.test.tsx | 7fc99fd8ffa61affda5f9c68e0018648f7734d684e19bc4497042f9520a014ec |
| packages/domain/src/webinar-ad-ruleset.ts | baf788e4fd9c1718614c2297f578f16119a76bcb8450be426f2b92a8e5ccaf4a |
| tests/security/provider-side-effect-default-off.test.ts | 435dd8282b4999e657932dfbf45d80bf2585e6727108628daf509883b41f7911 |
| apps/web/src/features/campaigns/launch-model.unit.test.ts | 3d123a4c3e6b7e98c0a3de6434e120a0b5edd601732a5014fbda9dc3ed6bcad9 |
| apps/web/src/features/http/user-messages.ts | 5962b8a5aa7af638c6a4fa9a89ecdc1fb0035685e8400190c33f2d3ee9af4824 |
| apps/web/src/features/http/user-messages.unit.test.ts | da70aa666dce2ce4a5bc913a8fed704d204f2e0cd613c10d1e0159a02e75676c |
| apps/web/src/copy/campaign-image-messages.unit.test.ts | 962c5e4578ef4c94e46728c035adbad8a2b83b2ffc5ba180eaecd3771738b559 |
| packages/ui/src/components/Select.tsx | 7dd5422cf5e56a6301fff09efa830c7d8b3d3cefc266d169554497644e0e21e8 |
| apps/web/src/features/dashboard-preview/shared-select.integration.test.tsx | b8237ac401e45dcd96453d51f5131797160ad36260f8b2a935e6f62991a278f9 |
| tests/browser/webinar-preparation.spec.ts | 65ccf6c58b715fabd0bf3827e10846c4f2d7475ca3bf2132640004c4184709b5 |
| apps/web/src/features/webinar-ads/preparation.test-support.ts | a2b9ecfa0f2201ffc8bdd4acbc19a778c120394211c7529b69552d95080ada14 |

### Latest individually inspected preparation originals

All originals are under `test-results/product-review-frames/webinar-preparation/`.

| Original | Dimensions | SHA-256 |
| --- | --- | --- |
| choose-1180-dark.png | 1180x4314 | 696e6e208069789b105ac118f16886e7d7428f1a1b292c4fcd94da35fb29d1eb |
| choose-1180-light.png | 1180x4314 | c0a239ea77783b5afdcc324b9a37a92cc75e3cf3b13895c213e4b5d480c19dde |
| choose-1440-dark.png | 1440x4356 | 908438d200c7ceab374be1ee139a6aced1728e483fd073deb61b3738fe952481 |
| choose-1440-light.png | 1440x4356 | 4d808e85da3c628758af41d54bf55bf92d9d727adab9daca7ba5090a148e990e |
| choose-390-dark.png | 390x12028 | 37132df4d56280ce546b6f7883b979fff196aecb5fb177f7a641227162d0d74c |
| choose-390-light.png | 390x12028 | 8094000f3b233149cece6576add5d6dbca66ac592b11a94af41d1d0082fc7961 |
| choose-768-dark.png | 768x6536 | fdfdb9ba2097fb45c2420681d4f1e307886f4795808846b07d253d9566d56233 |
| choose-768-light.png | 768x6536 | 98c883908cf13afd0a24e3570e7802e13c8687693d902066adcfaee51a6255d7 |
| form-1180-dark.png | 1180x1707 | efc016790ae18b40b89a3921b847676852cc97594c4c422bde878ab7fd131a0a |
| form-1180-light.png | 1180x1707 | f618cb26e75463ef38627ddb87109eec8c212b9fafa14410a7415c01492aa9a7 |
| form-1440-dark.png | 1440x1707 | 4ee524184b563a8321c601940cb29ff85a4aaddf114ff5cdc809cdf8d97b27b9 |
| form-1440-light.png | 1440x1707 | 178ba40d9d3fe415e13a04428a30ffc506b14a983ae94d7766ce4316734b1579 |
| form-390-dark.png | 390x2641 | 8b7854d95d8466e8121969ff50231fab64c26b6e1fe41bb4f0c3d7117dcf8395 |
| form-390-light.png | 390x2641 | c290bb925d69d2eba99bb065924d38c20147ce9420530dcf13f2ea5991ee234b |
| form-768-dark.png | 768x2924 | 732b53475dd16ee6931b195176ff9d3724788ebdee4def658d325ce03748e5ac |
| form-768-light.png | 768x2924 | b38d692c468e7829a9f13f1cbf44c894b0c9fba5d0ca16ad81a2c698ba9414b3 |
| keyboard-popup-1180-dark.png | 1180x900 | f89e11e77c3155c350d792747a69c1e8bd87d7e427f2aea0de281d139a2ef134 |
| keyboard-popup-1180-light.png | 1180x900 | d068f0739041e58e0119df4f206c6e2e9f592d2ac13b6f70de7358c64c4d5e18 |
| keyboard-popup-1440-dark.png | 1440x900 | 2fd37d7ef2a97df9dfb0d8cdca7bef5e1f79b0b53607f7141a5945ca4e709dc2 |
| keyboard-popup-1440-light.png | 1440x900 | cd5db72749dfe7b1ed659b95fd1713d952c327084111cc797a54acce49af6315 |
| keyboard-popup-390-dark.png | 390x844 | 681bdcea8138c8cdad2f996358ab35dff97ccd09b14a3d6bd6ea7dced0c7e6e7 |
| keyboard-popup-390-light.png | 390x844 | 088a37f6600bedc925522b797b9db0e77e82ae676f45054f9cd56687b0f6a73a |
| keyboard-popup-768-dark.png | 768x1024 | 94a14aea14206a5a01ec96b225253578e582a3f5b54b79005f046cde0765a542 |
| keyboard-popup-768-light.png | 768x1024 | e131f1136c1182847de48ab32313c741cb464311901068f3e01f882b759064f9 |
| retry-1180-dark.png | 1180x1494 | 2b889edc00fd0df382d267b9545c27e65eab082b0fda613a8bf2394ed5f1256d |
| retry-1180-light.png | 1180x1494 | 46d0f045138ec26f75b4380ca4b1ab813947f57c0f5828fb49c14ba018ce1cc4 |
| retry-1440-dark.png | 1440x1507 | 7747a4a357806e2dfac2e82565b06ace5ea14e174f7431dd7b60aa17b3267921 |
| retry-1440-light.png | 1440x1507 | 509ed5de4fed8d7cdc7805a0a4888a21926e834efadf2a0218c5a4a88520280d |
| retry-390-dark.png | 390x2435 | 3050c54486769311f71e87e9313bc0fc32a582846f1e94de84e53adf4b096f27 |
| retry-390-light.png | 390x2435 | f9c09d014b390cf4134421f410bbab0fe5e9e95c0fb3c9c48e515d5b5cbc0f8e |
| retry-768-dark.png | 768x2613 | 818a84c925b69aa8e64f289759bfbd5419d1527b4ecebb805c0791354441b113 |
| retry-768-light.png | 768x2613 | 7b7df0c68ab1e83d6ee608d9e997ac4a8c19f0cde37f33aae8b197cac630378f |
| setup-1180-dark.png | 1180x1494 | 95ae4bc2d929d9b57b0e78156796ae9aabcec42cf830b54b081e31d51ac33dad |
| setup-1180-light.png | 1180x1494 | bda2bc883cbbf0863c81e9b241310baaabca49793378f0cbe76365fbb3becabd |
| setup-1440-dark.png | 1440x1507 | e81a446c34dc4ec871a03225d218de5979be46c59b9e83146395ed82b1aeb741 |
| setup-1440-light.png | 1440x1507 | 2a1c5b68d66d1b8c65528b2458b02b0ac190b323fef299b2f7080a92f240a909 |
| setup-390-dark.png | 390x2279 | 30b50b1bbf91886eeea1685bfe3a4576699b60c664fda478061ff459e947b963 |
| setup-390-light.png | 390x2279 | 42fa9c01797df07ea2f34e1b0dc0bd167bb85015c809cfd85f1634ac2fd11e63 |
| setup-768-dark.png | 768x2505 | 1fa2f466e32ba4bf03039b680a1071a2ebe63e56ac7011626e4c0f254451707c |
| setup-768-light.png | 768x2505 | 101a26b6b8840fcfac97ae04e13d1b92fafa0c89d2a99137a8d9c4a0a438b196 |

### Retained producer log pins

| Log | SHA-256 |
| --- | --- |
| test-results/webinar-final-preparation-capture/build.log | 8398322274ef7cd5d1e0dbe5dc0ef887baf936f862183b525771f1d77dafaad7 |
| test-results/webinar-final-preparation-capture/browser.log | fceb0bae344dc10a463a86931362d0f3a58cde8b01e3791db4f13ce0043484aa |

## Canonical Chromium difference classification, October 14, 2026 UTC

Bounded visual equivalence PASS; approve zero baseline replacements. Independently compared all 74 original PNG files in `test-results/webinar-canonical-chromium/` from canonical run `38498933268`, artifact `11865835228`, captured at `679ce978dd86011120bdab5da3db95e38d881531`, against the same exact names in `tests/visual/screens/chromium/`. Current source head is `3967adbbd2dee1ac282bf1deb89de6a6f418a942`; its subsequent correction is test-only. Before this appendix, the worktree was clean. Sixty-four PNGs match SHA-256 exactly. The ten remaining candidates were each opened as a whole original, then compared with the whole tracked counterpart, 20 individually inspected images total. All original dimensions match their counterpart. No image was changed, copied, transformed, composited or substituted.

The governing `04-screens/campaign-studio.md` UX-007 requires screenshot updates limited to intended screen changes on canonical Linux; UX-005 preserves layout and both themes. None of these ten images contains an intended visual change. Raw RGBA comparison using the installed Sharp decoder finds only 15 to 80 changed pixels per image, every channel difference at most 2 out of 255. The nine account-pill differences are confined to antialiased rounded-border edges. The campaign list difference is confined to 15 pixels on its top-right rounded corner. Every other pixel, including glyphs, dates and masks, layout, content, artwork and the Ads library region, matches exactly. These are observable raster/compositing noise, not evidence of changed date/time, font, copy or intended Ads library link styling.

The account pill's unchanged border source is `apps/web/src/features/shell/components/app-shell.module.css:232-247`, with `--bd-hairline` and `--radius-pill`; the campaign table's unchanged border is `apps/web/src/features/campaigns/components/campaign-list.module.css:129-131`, with `--bd-hairline` and `--radius-control`. Neither stylesheet changed between the pre-feature head `5eb7fef` and `679ce97`. The Home start card likewise has no source diff in that range. The pixel locations identify those rounded borders, but this review does not establish the exact browser raster mechanism. The capture helper waits for fonts and settled transitions at `tests/browser/helpers/design-quality.ts:775-817`; `playwright.config.ts:92-101` disables screenshot animations and retains the existing 0.001 difference ratio. Calling this transient transition timing or font loading would exceed this evidence.

Recommendation: retain all ten tracked baselines. No intended whole-image replacement is approved, and no product or capture normalization fix is justified by these tiny edge differences alone. If a stricter exact-image policy later requires normalization, discuss a bounded capture change before implementing or accepting it. The successful snapshot-update job by itself does not approve these differences. This assessment does not relax screenshot thresholds, change acceptance criteria or grant seeded review/approval journey, live provider, lender or product-completion credit. The pending reviewer artifact and 24 saved-journey originals remain open for their own inspection. Independent source pins from prior Security/Quality remain intact.

### Exact changed-pixel measurements

Bounds use original image coordinates, inclusive `(x0,y0)-(x1,y1)`. Counts include any raw RGBA byte difference, without tolerance.

| Original | Dimensions | Changed pixels | Bounds | Maximum channel delta | Classification |
| --- | --- | --- | --- | --- | --- |
| campaign-detail--default--1440--dark.png | 1440x3508 | 80 | (1210,10)-(1287,53) | 2 | Account-pill rounded border |
| campaign-detail--default--768--dark.png | 768x5551 | 52 | (658,10)-(735,39) | 2 | Account-pill rounded border |
| campaign-detail--permission-restricted--1440--light.png | 1440x1693 | 76 | (1210,10)-(1287,53) | 2 | Account-pill rounded border |
| campaigns--populated--1180--light.png | 1180x900 | 15 | (1139,529)-(1146,537) | 2 | Table rounded corner |
| overview--default--1180--dark.png | 1180x1772 | 80 | (1070,10)-(1147,53) | 2 | Account-pill rounded border |
| overview--default--1180--light.png | 1180x1772 | 76 | (1070,10)-(1147,53) | 2 | Account-pill rounded border |
| overview--default--1440--dark.png | 1440x1772 | 80 | (1210,10)-(1287,53) | 2 | Account-pill rounded border |
| overview--default--1440--light.png | 1440x1772 | 76 | (1210,10)-(1287,53) | 2 | Account-pill rounded border |
| overview--default--768--dark.png | 768x2411 | 52 | (658,10)-(735,39) | 2 | Account-pill rounded border |
| overview--default--768--light.png | 768x2411 | 51 | (658,10)-(735,40) | 2 | Account-pill rounded border |

### Exact originals and tracked counterpart pins

Actual files are under `test-results/webinar-canonical-chromium/`; baseline files are under `tests/visual/screens/chromium/`. These pins preserve the originals reviewed here, without authorizing replacements.

| Filename | Actual SHA-256 | Tracked baseline SHA-256 |
| --- | --- | --- |
| campaign-detail--default--1440--dark.png | 3e547dfed5add8c9400d47b71705fc33530142a27355f2a02840181a9f3c6ce1 | d87242527f656a02aaef4b04f1ac011de899356c552f0716a26d908b2b70493d |
| campaign-detail--default--768--dark.png | 635c7f47b76cc3b76916647343d2fd664158f938e151b6705eb0707a9c6cb2ae | 1a6dcc2c40fa7ecff212dc48c66b31aaa9d230a5cdf32f107964af713a4a3b4f |
| campaign-detail--permission-restricted--1440--light.png | 71538b36e79f586d3fb05dade653da8559f64141f9483150fa9a197f7cf48e7e | 1b1c8fd2f662f4d6d40a2f30516d49a25f45e41d9ee738a158161864d5a15d4f |
| campaigns--populated--1180--light.png | dae71512184204c6fa4c947baa065f632d9709b1e8c934be43d70e37bb9464ef | 2cb021d0e120f8a9e256075917ae933f22b65fe7e28e7f53e09a22a7d05661e3 |
| overview--default--1180--dark.png | 831bed348f0e1ddb97404687cf2f8fd31872a49afcd332770cc49f1713abae6d | 14e1179da2a5b4a2b61b5197185cada060f17d64c9f5f58ed503c1e00030a2ee |
| overview--default--1180--light.png | 41caab419ae1b2364227b082c6537289c05c8fc7cd7272e48aded475f55da5ea | 3fd0fd92e5dbeee1dce341d294ba1b3b8097c736af460e41e90734c30ac29d8a |
| overview--default--1440--dark.png | 932f15d9410ce78b2574ea2edde85d489448443b8ef905ae47799425142800ed | 33eb3a5250dda5c004c307b6ebd7f31a1c5765e7c639a0e362eebed77074901c |
| overview--default--1440--light.png | 35a77615fdc88186c8a9d49b6edc124cb67165d03937bc904eaa7484f78560f1 | 6ab3b1e02b025e8065b6e42f77503697558682333ab25db11824a1e1e4275158 |
| overview--default--768--dark.png | d2a91251bac003c2e68d09d1e775ed770f99791f5c4ae0dc3f9f227a13f1b6aa | 2c80dd6dcbba68222d23c8ce547968bb3497873704ca229ffb0815b2df1a3ae4 |
| overview--default--768--light.png | 4d9ca79bc6ee78023b3f89943d418041ae3f6370e2fc6decb703477f6824637e | 5546ecf294c0c2bba7f9e14db4288bedd9c67022fe10d70a0c3ff1e8a9ba04f0 |

### Classification source pins

| Source | SHA-256 |
| --- | --- |
| apps/web/src/features/shell/components/app-shell.module.css | fbe1f513197b2e6cad2bf7809c0b33f12faef99478d001bad93277339694c76f |
| apps/web/src/features/campaigns/components/campaign-list.module.css | cd3b71c0b0c32fcc1a6da9513e7c95d4e03d59d67c5d3c5c75e42748258622ae |
| apps/web/src/features/overview/components/home-start-card.tsx | 6141730dc6b230a4e0573f3b03f0ce7a5a63f521609737bbf4f04ffe2d4aee9a |
| tests/browser/helpers/design-quality.ts | 60459303c3deb7558e7c68a2446acdc50c30bc26b54dda6e9783e247f7ac23bc |
| playwright.config.ts | 40d0dab1adcead7ea5ebd493056c4ddf5d53dd262a736fe7bf9d15202501a1f9 |

Only this report was appended. No source, test, baseline, original image, server, commit or prior review text was changed.

## Actual saved-review and download UX qualification, October 14, 2026 UTC

PASS for the real disposable-database, authenticated seeded-account journey shown by artifact `11865965933` from CI run `38498931146` at `679ce978dd86011120bdab5da3db95e38d881531`. Individually opened every actual original in `test-results/webinar-ci-saved-review/`: 24 whole screenshots (eight setup, eight saved review and eight approval recorded) plus 16 native downloaded PNGs. This closes the earlier pending actual saved-review/download/recorded-decision visual gap for these eight seeded journeys. It does not qualify every refusal state, live providers, owner approval or lender review.

Source comparison `git diff 679ce978 3967adb --name-only` shows only the foundation unit test, ledger and Security/Quality reports changed. Production application and browser source are identical at current `3967adbbd2dee1ac282bf1deb89de6a6f418a942`. Existing UX governance applies: design brief sections 13-16, campaign/artifact workflow's exact immutable preview/download and approval-summary rules, and campaign lifecycle's version/approval/public-output invariants.

All eight setup originals retain edited Facebook headline, requested end and saved brand. The actual saved review then names version 1 and renders both exact shape labels and download links, immutable original lettering, separately saved Facebook headline/body/CTA/disclosure/consent, published webinar, destination, expiry and capped stop time. The requested 2090 end is replaced by the displayed actual publication expiry in 2027, with a plain explanation of the cap. At 1440/1180 the image/copy card and context cards sit side by side; at 768 context stacks below; at 390 the two shapes also stack. The long destination wraps inside its card, and all facts and actions remain contained in both themes.

At 390, the review's tall preview spans approximately x=37 through x=353, y=518 through y=913, and the square spans x=37 through x=353, y=1025 through y=1341. Shape labels and their separate download actions remain under the correct image. Saved body, disclosure and consent are readable in the full-width text column. Native footer details are small in these reduced previews; the full 1080px downloads, independently inspected, provide the complete identity/disclosure image. No claim is made that thumbnail-sized licensing text substitutes for examining the original.

All eight approved originals replace the amber awaiting-review label with the green Approval recorded label and retain textual decision identity/date in Your recorded decision and the saved version entry. They remove the approval controls after the seeded authorized decision. At 390 the recorded-decision card remains inside approximately x=16 through x=374, y=3160 through y=3341; the text wraps without clipping. Launch unavailable and its no-publication/no-spend explanation remain visible. The creator's earlier review has disabled approval plus account-access guidance, using account wording rather than customer team-role setup. These captures verify recorded test-account decisions, not Jonathan's approval of an ad.

All 16 downloaded native originals retain the original headline/illustration plus seeded Review creator identity, NMLS 1234567, Review location (not connected), NMLS 7654321 and Equal Housing Opportunity disclosure. The company wraps to two lines without touching the creator name or NMLS. Square is 1080x1080 and tall is 1080x1350. Square footer begins near y=842, with disclosure near y=1035; tall footer begins at y=1080, with disclosure near y=1305. Both retain bottom inset and complete lettering. Every square download has the same SHA-256, and every tall download has the same SHA-256 across all four viewports and both themes. The artwork and footer match the saved-review previews visually and are never recolored by dashboard theme. The saved review uses the same art URL for preview and download at `apps/web/src/features/webinar-ads/review.tsx:79-95`; the CI test at `tests/browser/review/webinar-ads.spec.ts:177-204` verifies both response and actual downloaded bytes against each immutable manifest digest. This is a producer-run assertion inspected alongside the originals, not a fresh reviewer request.

Actual retained log `test-results/webinar-ci-failed.log:3172-3179` records all eight seeded persistence/reload/review/download/approval journeys passing, with the exact individual durations below. It also records 28 webinar destination pgTAP assertions passing at lines 2622-2627 and 11 actual PostgreSQL tests (five prepare plus six destination) passing at lines 2775 and 2786. These are separate counts and do not describe the whole product or the whole job. The overall PostgreSQL job failed: the sample-catalog and real-empty-catalog screenshot expectations stopped on separate outdated Ads library baselines. The passing webinar journeys and retained originals do not convert that job result into a full green report. Those catalog captures await their own independent qualification.

The saved-review implementation's exact-image/copy and review-standing explanation is now rendered evidence at `review.tsx:74-139`; decision and launch boundaries are rendered at `review.tsx:213-249`. Copy saved Facebook words is visible, but these eight browser cases do not click it or verify clipboard contents. No new clipboard qualification is granted. The on-demand publication is a seeded local-origin destination, with fixture external video URL, and no evidence here verifies playback, conversion, hosted delivery, lender authorization, external creative acceptance, paid launch or spend. Other current-unavailable, withdrawal, historical-version and image-load-refusal visual cases remain outside this 40-original set.

No new blocking visual finding or source edit is requested. Release this bounded artifact review to the orchestrator for the remaining canonical catalog qualification and Security/Quality closeout. Historical RED diagnostics, prior native raster evidence, all existing source pins and earlier report text remain preserved. Only this report is appended; no image, source, test, server, baseline or commit was changed by this reviewer.

### Actual seeded journey timings

All cases are `tests/browser/review/webinar-ads.spec.ts:118:7`, PASS. Durations are individual cases, not an aggregate suite claim.

| Retained log line | Width | Theme | Duration |
| --- | --- | --- | --- |
| 3172 | 1440 | Light | 11.6s |
| 3173 | 1440 | Dark | 11.2s |
| 3174 | 1180 | Light | 11.0s |
| 3175 | 1180 | Dark | 11.1s |
| 3176 | 768 | Light | 11.0s |
| 3177 | 768 | Dark | 10.9s |
| 3178 | 390 | Light | 10.3s |
| 3179 | 390 | Dark | 10.3s |

### Individually inspected actual screenshot and native-download pins

All files are the original artifact files under `test-results/webinar-ci-saved-review/`. Dimensions and SHA-256 were independently read from each original, including all 16 duplicate-by-shape downloads.

| Original | Dimensions | SHA-256 |
| --- | --- | --- |
| approved-1180-dark.png | 1180x1815 | f0573d9864bbb3d8bc848bd5c240ed89ebdad84df042a21aa74376d422db20e1 |
| approved-1180-light.png | 1180x1815 | a97d1dda32967303e21d54ceeb193574aadeb88b2a1f831d871b314d2038bea4 |
| approved-1440-dark.png | 1440x1811 | 732e8a812add2c18c3dfd5c85249bafa7818152e0c17511e4d84f4d0a4dd5a5f |
| approved-1440-light.png | 1440x1811 | cedeb8209cbd50cb3670657aaf78447ae6356bdd76df2d642a43bd78ae9f3c67 |
| approved-390-dark.png | 390x3789 | d6cbdb50f9411267d488575ad99f17314b04666c594a2a49c6000abb1dedcc54 |
| approved-390-light.png | 390x3789 | a10e39de1602cda57c069a22076e4224b4e5420ac41a4847765f8b6817af1a3a |
| approved-768-dark.png | 768x3067 | 5f2baea8d9c70349abf934a284bd68c384c05ca420f766a81eaa48b9e101c11e |
| approved-768-light.png | 768x3067 | e9848fcf4046fb7b4c0f27c24452aa7a0fb0785a372de99d3e51beb2b6fe9d2d |
| download-1180-dark-square.png | 1080x1080 | dc608f7e7b57d25c7ddd4bb683af565b3d1db5ef184eeeff9675f8a7d36c245c |
| download-1180-dark-tall.png | 1080x1350 | bf8cacf4f049691f36b444e71d9e9deb1949677143b5500bb94d783b6268def4 |
| download-1180-light-square.png | 1080x1080 | dc608f7e7b57d25c7ddd4bb683af565b3d1db5ef184eeeff9675f8a7d36c245c |
| download-1180-light-tall.png | 1080x1350 | bf8cacf4f049691f36b444e71d9e9deb1949677143b5500bb94d783b6268def4 |
| download-1440-dark-square.png | 1080x1080 | dc608f7e7b57d25c7ddd4bb683af565b3d1db5ef184eeeff9675f8a7d36c245c |
| download-1440-dark-tall.png | 1080x1350 | bf8cacf4f049691f36b444e71d9e9deb1949677143b5500bb94d783b6268def4 |
| download-1440-light-square.png | 1080x1080 | dc608f7e7b57d25c7ddd4bb683af565b3d1db5ef184eeeff9675f8a7d36c245c |
| download-1440-light-tall.png | 1080x1350 | bf8cacf4f049691f36b444e71d9e9deb1949677143b5500bb94d783b6268def4 |
| download-390-dark-square.png | 1080x1080 | dc608f7e7b57d25c7ddd4bb683af565b3d1db5ef184eeeff9675f8a7d36c245c |
| download-390-dark-tall.png | 1080x1350 | bf8cacf4f049691f36b444e71d9e9deb1949677143b5500bb94d783b6268def4 |
| download-390-light-square.png | 1080x1080 | dc608f7e7b57d25c7ddd4bb683af565b3d1db5ef184eeeff9675f8a7d36c245c |
| download-390-light-tall.png | 1080x1350 | bf8cacf4f049691f36b444e71d9e9deb1949677143b5500bb94d783b6268def4 |
| download-768-dark-square.png | 1080x1080 | dc608f7e7b57d25c7ddd4bb683af565b3d1db5ef184eeeff9675f8a7d36c245c |
| download-768-dark-tall.png | 1080x1350 | bf8cacf4f049691f36b444e71d9e9deb1949677143b5500bb94d783b6268def4 |
| download-768-light-square.png | 1080x1080 | dc608f7e7b57d25c7ddd4bb683af565b3d1db5ef184eeeff9675f8a7d36c245c |
| download-768-light-tall.png | 1080x1350 | bf8cacf4f049691f36b444e71d9e9deb1949677143b5500bb94d783b6268def4 |
| review-1180-dark.png | 1180x2151 | 32e70fc81b3461265825b8001794adff19229f8eb487c4e01aedc3630213856e |
| review-1180-light.png | 1180x2151 | c6786670721f60facab6e160cd787e6ca60a0491199d7c29ce9ec050df7d3395 |
| review-1440-dark.png | 1440x2147 | afa91d0cabbc8f227621983490c8d44ccc18182c35cf1c8bf829eb19a7cab954 |
| review-1440-light.png | 1440x2147 | d45749c7612c526f5aa188791663e3070271d119b447c133f51b7be08bb408f3 |
| review-390-dark.png | 390x4114 | f9b921d0d937e3ea4c3e1817ae9d7acfea9c6dcde61ed27bd2cbbd14185cd80b |
| review-390-light.png | 390x4114 | 5f9e2fcf506a97e8ddca30581a6c61295744718bdb8cddb00d4fd2394b0b5539 |
| review-768-dark.png | 768x3382 | 3b7ce050f844fe86aa8014ba371a6c940e1dd886244a8398ac8f27a09f839ff3 |
| review-768-light.png | 768x3382 | 4ebd2e4551f97d00d2c44293f8f5e8883f09da91dde3bfd0eb6080eb29c77c82 |
| setup-1180-dark.png | 1180x1485 | 2ffdc0950bd7f61b8617c62f287940a6b8474711e0f0f8a704069c7a7e351e6b |
| setup-1180-light.png | 1180x1485 | d52637f124744cf5be2ed0c2a9752a64c46a095614ca0e294a6855aef0206af7 |
| setup-1440-dark.png | 1440x1498 | 27d899f97dfb963c29da8d587e89c073f19e1d03b50be2d931592b34b35e9898 |
| setup-1440-light.png | 1440x1498 | 19a3d4cedd99f75680ff85b60a8347332e9bb50a83e151d9de405ffa5d6a0de1 |
| setup-390-dark.png | 390x2294 | 250168bd386615151965f1e976e2eabd17048df5b06b2b76cd7754272dc30c31 |
| setup-390-light.png | 390x2294 | 916931f7bd77bfd3d607e7a8c99ad00929383db39b1c3ad8d99d777c3137aafe |
| setup-768-dark.png | 768x2475 | 5be26466f11c7d4e79a3bce840d08f37e6f7bb74e46779e48ac971a482aa877b |
| setup-768-light.png | 768x2475 | 276288f39eb2845f4ea57e471194c01afc736ad391bbba084182a9db55000690 |

### Current saved-review source and producer log pins

| Source or log | SHA-256 |
| --- | --- |
| apps/web/src/features/webinar-ads/preparation.tsx | 7dfc24bc7ac509e3271c06bbbf68e13cb6d76f6f6219a5d5c67ebb1034a31507 |
| apps/web/src/features/webinar-ads/review.tsx | 07491245c68938ca1f5993cea13f83626e6dab9018674b1d06891ae2a9c7e3ec |
| apps/web/src/features/webinar-ads/preparation.module.css | fbc519c7c09891a9936847463f7f810adedbbd88f7302d81f73ae10d97002dad |
| apps/web/src/features/campaigns/components/campaign-approval-controls.tsx | ea4268376542c733209b43aefec99dba03b1ea2b8a5fc10eb36c4775f8d40bff |
| tests/browser/review/webinar-ads.spec.ts | 67687a8d087905fc2148ac1dcdd00ea6a013a7939c69a5957cfea9b102a2bf02 |
| test-results/webinar-ci-failed.log | dc55730f236b8f2dc53a03854195497a9a6ac7ce86737bc79d22cc1487549820 |
