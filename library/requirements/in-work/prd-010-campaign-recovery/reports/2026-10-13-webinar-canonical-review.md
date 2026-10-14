# Webinar canonical screenshot replacement review, October 13, 2026

Reviewer: independent UX/UI Guardian. Scope: 107 changed existing review baselines in canonical run 38498933268, capture commit 679ce978, artifact 11866380590. Current worktree source 3967adb adds test coverage only. Candidate root: `test-results/webinar-canonical-review/`; baseline root: `tests/visual/screens/review/`. Root owns replacement and subsequent comparison. Only this report was written by this reviewer. The parent brief said 108 changes; independent JSON inventory count is 107: 24 + 48 + 35.

## Decision

Approve the 24 complete original Ads library PNGs listed below with recorded SHA-256 hashes. Reject replacement of all 48 launch-step-3 candidates, whose only difference is a rolling end-date mask width. Retain the other 35 existing baselines: their differences are unrelated raster noise. Capture workflow success alone did not authorize a replacement.

Both canonical write jobs are reported successful by the parent. This classifies actual image evidence; it does not establish a fresh comparison-mode pass, provider validation, owner visual approval, or whole-project completion.

## Governing rules and source attribution

Current host authority: `library/knowledge/private/ux-ui/00-design-brief.md`, opening October 6 amendment and sections 9, 10, 14, 18 and 20; `06-review-rubric.md` sections 1-3 and 6. Governing rule: "Keep the existing AutomatedLO palette, Inter, token-based surfaces and both themes." The rubric requires 3 on every axis; this review scores the changed static composition only and does not invent interactive or measured contrast evidence. `03-components/campaign-and-artifact-workflow.md:73-87` governs the three Launch screens, including dates as one unbroken unit and governed Link actions. The existing control contract covers this small discovery action without a new palette, layout system or token.

Accepted cause: `apps/web/src/features/webinar-ads/pack.tsx:79-81` adds the governed `Link` labeled "Prepare a saved webinar ad", pointing to `/marketing/campaigns/webinar`, after the webinar introduction. Diff 5eb7fef to 679ce97 shows exactly these three added lines in that component. Existing `pack.module.css:18-25` places header children in a grid with `--space-4`; `packages/ui/src/components/Link.module.css:36-50` gives the action `--target-min-size`. Host tokens at `01-master-tokens.css:266` and `:282` are 16px and 44px. All 24 PNGs grow by exactly 60px. The page/catalog prefix remains pixel-identical, and the lower section translates down exactly 60px.

Excluded end-date cause: `apps/web/src/features/campaigns/launch-model.ts:124-152` computes a rolling 14-day end date. `components/launch-review.tsx:307-312` draws that saved end date through a readable time label; `apps/web/src/copy/launch-messages.ts:196-197` retains "From launch until". No plain-copy correction occurred. `tests/browser/helpers/design-quality.ts:930-941` normalizes specified campaign dates and the approved decision timestamp, but omits the end-date time in step 3's approval facts. Its `:1027-1038` and `:1044-1068` mask each inline date's own line box. Rolling date width therefore changes the magenta box. All 48 differences are exactly a 4px by 17px strip of added mask; content, wrapping, adjacent copy and every other RGBA pixel are identical. Do not replace these to absorb capture behavior. The capture-helper owner can address this gap separately.

Excluded noise cause: 33 unrelated candidates differ only on account-control edges at y=10-53, maximum channel delta 2. Two other candidates change six pixels on the change-password input corner and eleven pixels on sign-in input corners, maximum delta 1. No authorized product-source cause supports replacement. Their exact counts and bounds are below.

## Method and bounded rubric

Read native Guardian/configuration and UX Weapon, current host design brief, component contract and scored rubric. Compared each of the 107 pairs as decoded RGBA, checked dimensions and coordinate bounds, and computed SHA-256 of both original PNG byte streams for every approved pair. Individually opened all 24 library candidates and all 24 counterparts as whole original images. Opened the ready-for-approval 1440 Light step-3 pair and asserted exact mask-strip identity for all 48 variants by raw pixel/color comparison. Opened both original pairs for the two form-corner cases. No image was cropped, synthesized, rewritten or combined. Row alignment existed only as an in-memory comparison.

For every accepted library frame: hierarchy 3 (clear local saved-ad action below the webinar heading); spacing 3 (44px control plus 16px gap explains expansion); changed-action typography 3 (existing interface-font Link); responsive static composition 3 (same columns and coherent action at 1440, 1180, 768 and 390); both-theme presentation 3; system consistency 3. These are delta scores, not whole-screen recertification. Contrast measurements, keyboard/focus, hover/loading, reduced motion and route behavior were not rerun by this image reviewer. Existing automated gates and independent saved-journey review retain those responsibilities. The image viewer downscales long mobile PNGs, so exact RGBA/source attribution supplies detail that a fitted full-page display cannot certify by eye.

The accepted whole images include sparse antialias differences after the 60px translation: 361-912 pixels per frame, maximum channel delta 6-57. These appear on moved Stepper/badge vector glyphs, artwork-lettering edges and rounded card/control edges. No words, artwork geometry, spacing or color roles changed. Distribution and representative RGBA colors were checked. The unchanged prefix has zero differing pixels. This bounded inclusion preserves complete original browser-capture provenance; it does not authorize the 35 unrelated-only files or future unexplained glyph, font, date or body changes.

## Approved exact original PNGs

First y is the first differing raw row. Aligned N/max is the changed-pixel count and maximum absolute RGBA channel difference after comparing the old lower section with the candidate at y+60. That alignment is analysis only. Every row has the complete source cause at pack.tsx:79-81.

| Exact filename | Width x old/new height | First y | Aligned N/max | Existing SHA-256 | Approved actual SHA-256 |
|---|---|---:|---|---|---|
| `ads-library--all--1180--dark.png` | 1180 x 6632/6692 | 2690 | 394/36 | `46eed5141a8ebe7edd72431976541983af50a859c4776347affcb40339156cc7` | `f34ed1208bc604d5bc7b7f244584140f8d27369c5bcdd2c4d80efe7ad08e0bd9` |
| `ads-library--all--1180--light.png` | 1180 x 6632/6692 | 2691 | 361/43 | `d74028b91373a177aa1251cf9812b6da300dc836b74e1ca5396aa78dc3b535dd` | `646ba16aa4a27eeeb35532f6a020361782358143b76486082d4944419a5c4624` |
| `ads-library--all--1440--dark.png` | 1440 x 5792/5852 | 1809 | 583/6 | `b71df470570695000e3144e1c46dbc237c295b8c4b6a98e6d37e374f6ec9a5e2` | `8e7ef4f7af7acd6066cea6f81469e91cf457e3602e95637fa967a543295ad2b0` |
| `ads-library--all--1440--light.png` | 1440 x 5792/5852 | 1810 | 538/6 | `a2db2f29c156df0c7162e0b7f71740b101c0e65ddf0d183cd607c78ffe40de16` | `6ad2bc0e7903241d71e4f2c4b0a4110b78b695c1d77c6e6f3b03a41d5dc14b10` |
| `ads-library--all--390--dark.png` | 390 x 17417/17477 | 6175 | 525/57 | `10040add0d3ab963b2fe256558e5e0ff0d51a559cc508b5abfdf2e8024e53a75` | `51805b02373f723cb6c16f076890e1a40298956c57da913b351cc135a0e49e51` |
| `ads-library--all--390--light.png` | 390 x 17417/17477 | 6176 | 486/6 | `1221aa9547c7ac45f67b09de8a622705eadebe7478db510b2d938aa0e775e303` | `911072b7db2b335ff6f313de0d6dbe280130ff7ab7a0592512af788f232410a8` |
| `ads-library--all--768--dark.png` | 768 x 9390/9450 | 3458 | 864/13 | `11867133299a6eef3bcfe45ef79a57b15b34942b2e37c28fba87445e64b8e22f` | `4b84e4700e2dd1ccef3563d81763606667ceec6bb5a69536a19e11399a872fcd` |
| `ads-library--all--768--light.png` | 768 x 9390/9450 | 3459 | 849/13 | `8d7c6e434c10c2001cf39debddf706b49733ddc93a35d2ef19a4c14fe2603c94` | `ed64c1ab2cca9bee63c4f424d59dee9d4bd0e903b25c79ee94608d965a70307b` |
| `ads-library--one-topic--1180--dark.png` | 1180 x 5216/5276 | 1274 | 665/11 | `623b650c21a7be4c2955f37f4c5ff6be87dd7920ac407af742f67797e293fbdd` | `395259af93f6b6088f584250fee0e921ecdaed11987da2c2d073a95cec919ba4` |
| `ads-library--one-topic--1180--light.png` | 1180 x 5216/5276 | 1275 | 596/11 | `a246f2b3ad7245f1aae0c5e63170dad63dc3d1f658ef514b0c96f9decd530956` | `3fcda7cd7c32548a1a0cbdaf3bd9117bed3a6fc8355ea8a58daa011f3bad12b8` |
| `ads-library--one-topic--1440--dark.png` | 1440 x 5186/5246 | 1203 | 399/16 | `07a14b0b5904e37b72b3189114618011d220803889caf5d44f03d17f2c9f20e6` | `ad6b4a9ece4d8c97fa21ef87c03c26fe4d6ea34aea30a91c5d2117808efdaa7d` |
| `ads-library--one-topic--1440--light.png` | 1440 x 5186/5246 | 1204 | 376/6 | `59904ccbf81961893df9e2687e0a3f8d8b592dbfe5e5b99a66322a40e64f584e` | `0f8881cf1bbd4aef9655aad96f14a2f7000b433b9b204eba051e5fcc42e24766` |
| `ads-library--one-topic--390--dark.png` | 390 x 13283/13343 | 2041 | 722/31 | `f5520051c3961918469e500a6accb70670f8417213eb17888ba4e9da9f03c478` | `1eba383b96aa9054415839979908c4b8eb84361bba8db7c57c7cfe3f6816cc44` |
| `ads-library--one-topic--390--light.png` | 390 x 13283/13343 | 2042 | 680/12 | `b818b25c4908fcdd0367975bf15808d6727e77a0fdcda4a187aee46348d8b1e9` | `e2eedbb168aec571256454aae0be13a3a5e43884f2e209064d9ee864bdbde50f` |
| `ads-library--one-topic--768--dark.png` | 768 x 7315/7375 | 1383 | 768/13 | `06fada572b49aeee80aa96f0e5860c2cb53b0ff3c912bc882dcaf6263eb6678e` | `b50356481f6d78a17688b7a6c37c86c612945f22f3abd7f8274641de37bffdf3` |
| `ads-library--one-topic--768--light.png` | 768 x 7315/7375 | 1384 | 734/13 | `1e03449fc9f322c5bc34ad602fbc3d0535809ac68d137b1e5a8fc6fa9cb1603a` | `41ed6d715c81e0a4865120ed4c481472e11bb00a55b578bef289600c40222d12` |
| `ads-library--real-catalog--1180--dark.png` | 1180 x 4555/4615 | 613 | 533/12 | `95666e171c8a7a97d05bca770d6c3034cb1d7fa26428e8f60ff3b830c0f7c0fd` | `bba46178d24c0897ae008772ccac6ecfe13cda309b6229cbaac9c8a699cc4ce0` |
| `ads-library--real-catalog--1180--light.png` | 1180 x 4555/4615 | 614 | 489/12 | `f4f4b96341a9a5b629715e5f05674fd9eaca37a61c5579d57cf49d901ce38c93` | `813c0d281895a264f339321d97b961b5d0598eb16dd095a3bf405370796d60ef` |
| `ads-library--real-catalog--1440--dark.png` | 1440 x 4596/4656 | 613 | 508/11 | `63a4cf372b094060efa23a4a53efad77713eb5f6fe7519bb41ddd381e5d4d9ca` | `070f2bf0b747f7d70b61f449262ab87b73dba462fb9e79507088ada419b813ff` |
| `ads-library--real-catalog--1440--light.png` | 1440 x 4596/4656 | 614 | 460/12 | `9d45d90fa68b697df2844e5c64989c13979edfcfe7b09fb56c36423abfef2819` | `fe800c112385126226dfce619b32ea3889e2d5a98fa45f00e214a0cb8af33f85` |
| `ads-library--real-catalog--390--dark.png` | 390 x 11943/12003 | 701 | 912/27 | `86cef9f37c1b1ba4e6d0398937350a7c8e2758b708e60d3445a13326f789af5f` | `75990299cfaf663d2a1377ccbb17327b38b640302024342d240c7e21f5a14d76` |
| `ads-library--real-catalog--390--light.png` | 390 x 11943/12003 | 702 | 838/12 | `3bd3f6c2c2be9644ea7345f7f871baab0d1c400d1d85c7d37348bdab09a697a8` | `9c7a63a582866d2c84998fa930c1b1ff21cd5bc61a3dc29d0d372aba9833b311` |
| `ads-library--real-catalog--768--dark.png` | 768 x 6622/6682 | 690 | 693/12 | `8e19ac78b575d46af8c51e95a4aa0676c8ceefa44ee31b199c22cdb27b11cc0c` | `149a68b6e8f90040486edde43ac30a1a9b198936c4e391d6fbf3e21a0f2f5f02` |
| `ads-library--real-catalog--768--light.png` | 768 x 6622/6682 | 691 | 651/12 | `77ddd7e6a845663a4f38e9a28458b0b74bb4baba4ad41e2f71a534d23b329edf` | `a21946d98bf7e5b78f2f810a137860bd18f1ce5398ecb50b230be33a5022f2d9` |

## Excluded: 48 rolling date-mask candidates

Keep every existing file below. Bounds are inclusive zero-based x1,y1,x2,y2. Each row has 68 changed pixels, maximum channel delta 228 Dark or 255 Light. All candidate changed pixels equal RGBA (255,0,255,255); old pixels are the uniform card background, (27,30,37,255) Dark or (255,255,255,255) Light. Every other pixel and the dimensions match.

| Exact filename | Bounds |
|---|---|
| `launch-an-ad--step-3-ad-retired--1180--dark.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-ad-retired--1180--light.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-ad-retired--1440--dark.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-ad-retired--1440--light.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-ad-retired--390--dark.png` | (287, 1772, 290, 1788) |
| `launch-an-ad--step-3-ad-retired--390--light.png` | (287, 1772, 290, 1788) |
| `launch-an-ad--step-3-ad-retired--768--dark.png` | (447, 1838, 450, 1854) |
| `launch-an-ad--step-3-ad-retired--768--light.png` | (447, 1838, 450, 1854) |
| `launch-an-ad--step-3-approved--1180--dark.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-approved--1180--light.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-approved--1440--dark.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-approved--1440--light.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-approved--390--dark.png` | (287, 1794, 290, 1810) |
| `launch-an-ad--step-3-approved--390--light.png` | (287, 1794, 290, 1810) |
| `launch-an-ad--step-3-approved--768--dark.png` | (447, 1819, 450, 1835) |
| `launch-an-ad--step-3-approved--768--light.png` | (447, 1819, 450, 1835) |
| `launch-an-ad--step-3-cannot-approve--1180--dark.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-cannot-approve--1180--light.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-cannot-approve--1440--dark.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-cannot-approve--1440--light.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-cannot-approve--390--dark.png` | (287, 1794, 290, 1810) |
| `launch-an-ad--step-3-cannot-approve--390--light.png` | (287, 1794, 290, 1810) |
| `launch-an-ad--step-3-cannot-approve--768--dark.png` | (447, 1819, 450, 1835) |
| `launch-an-ad--step-3-cannot-approve--768--light.png` | (447, 1819, 450, 1835) |
| `launch-an-ad--step-3-needs-changes--1180--dark.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-needs-changes--1180--light.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-needs-changes--1440--dark.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-needs-changes--1440--light.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-needs-changes--390--dark.png` | (287, 1774, 290, 1790) |
| `launch-an-ad--step-3-needs-changes--390--light.png` | (287, 1774, 290, 1790) |
| `launch-an-ad--step-3-needs-changes--768--dark.png` | (447, 1819, 450, 1835) |
| `launch-an-ad--step-3-needs-changes--768--light.png` | (447, 1819, 450, 1835) |
| `launch-an-ad--step-3-ready-for-approval--1180--dark.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-ready-for-approval--1180--light.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-ready-for-approval--1440--dark.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-ready-for-approval--1440--light.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-ready-for-approval--390--dark.png` | (287, 1794, 290, 1810) |
| `launch-an-ad--step-3-ready-for-approval--390--light.png` | (287, 1794, 290, 1810) |
| `launch-an-ad--step-3-ready-for-approval--768--dark.png` | (447, 1819, 450, 1835) |
| `launch-an-ad--step-3-ready-for-approval--768--light.png` | (447, 1819, 450, 1835) |
| `launch-an-ad--step-3-sent-back--1180--dark.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-sent-back--1180--light.png` | (1010, 811, 1013, 827) |
| `launch-an-ad--step-3-sent-back--1440--dark.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-sent-back--1440--light.png` | (1142, 811, 1145, 827) |
| `launch-an-ad--step-3-sent-back--390--dark.png` | (287, 1794, 290, 1810) |
| `launch-an-ad--step-3-sent-back--390--light.png` | (287, 1794, 290, 1810) |
| `launch-an-ad--step-3-sent-back--768--dark.png` | (447, 1838, 450, 1854) |
| `launch-an-ad--step-3-sent-back--768--light.png` | (447, 1838, 450, 1854) |

## Excluded: 35 unrelated raster-only candidates

Keep every existing file below. N counts every different RGBA pixel; max is maximum absolute channel difference. Bounds are inclusive and zero-based.

| Exact filename | N/max | Bounds |
|---|---|---|
| `campaign-detail--already-decided--1180--dark.png` | 106/2 | (1035, 10, 1147, 53) |
| `campaign-detail--already-decided--768--light.png` | 51/2 | (636, 10, 735, 40) |
| `campaign-detail--approved--1180--dark.png` | 106/2 | (1035, 10, 1147, 53) |
| `campaign-detail--approved--1180--light.png` | 101/2 | (1035, 10, 1147, 53) |
| `campaign-detail--approved--1440--dark.png` | 80/2 | (1188, 10, 1287, 53) |
| `campaign-detail--approved--768--dark.png` | 52/2 | (636, 10, 735, 39) |
| `campaign-detail--approved--768--light.png` | 51/2 | (636, 10, 735, 40) |
| `campaign-detail--ready--1180--light.png` | 101/2 | (1035, 10, 1147, 53) |
| `campaign-detail--ready--1440--dark.png` | 80/2 | (1188, 10, 1287, 53) |
| `campaign-detail--ready--768--dark.png` | 52/2 | (636, 10, 735, 39) |
| `campaign-page--ad-retired--1180--dark.png` | 80/2 | (1062, 10, 1147, 53) |
| `campaign-page--ad-retired--1180--light.png` | 76/2 | (1062, 10, 1147, 53) |
| `campaign-page--ad-retired--768--dark.png` | 52/2 | (650, 10, 735, 39) |
| `campaign-page--approved--1440--dark.png` | 80/2 | (1202, 10, 1287, 53) |
| `campaign-page--approved--768--light.png` | 51/2 | (650, 10, 735, 40) |
| `campaign-page--library-notice--1440--dark.png` | 80/2 | (1202, 10, 1287, 53) |
| `campaign-page--library-notice--1440--light.png` | 76/2 | (1202, 10, 1287, 53) |
| `campaign-page--library-notice--768--light.png` | 51/2 | (650, 10, 735, 40) |
| `campaign-page--newer-version--1180--dark.png` | 80/2 | (1062, 10, 1147, 53) |
| `campaign-page--newer-version--768--dark.png` | 52/2 | (650, 10, 735, 39) |
| `campaign-page--newer-version--768--light.png` | 51/2 | (650, 10, 735, 40) |
| `campaign-page--sent-back--1180--dark.png` | 80/2 | (1062, 10, 1147, 53) |
| `campaign-page--sent-back--768--dark.png` | 52/2 | (650, 10, 735, 39) |
| `campaigns--all-states--1440--light.png` | 76/2 | (1202, 10, 1287, 53) |
| `campaigns--all-states--768--dark.png` | 52/2 | (650, 10, 735, 39) |
| `change-password--saved--1440--dark.png` | 6/1 | (157, 269, 159, 270) |
| `home--first-run--768--light.png` | 51/2 | (650, 10, 735, 40) |
| `launch-an-ad--step-1-all--1440--light.png` | 76/2 | (1202, 10, 1287, 53) |
| `launch-an-ad--step-1-filtered--1180--light.png` | 76/2 | (1062, 10, 1147, 53) |
| `launch-an-ad--step-1-filtered--768--light.png` | 51/2 | (650, 10, 735, 40) |
| `reset-password--saved-notice--768--dark.png` | 52/2 | (636, 10, 735, 39) |
| `reset-password--saved-notice--768--light.png` | 51/2 | (636, 10, 735, 40) |
| `settings-connections--empty-account--768--dark.png` | 52/2 | (650, 10, 735, 39) |
| `shell--help-menu-open--768--light.png` | 51/2 | (636, 10, 735, 40) |
| `sign-in--refused--1440--light.png` | 11/1 | (537, 392, 544, 488) |

## Remaining qualification

The 402-image artifact and 107-name inventory do not prove final comparison against the selected baselines. Root must preserve these whole-image hashes, replace only the approved 24, retain the excluded 83, and run required canonical comparison or explicitly carry the end-date harness issue. Existing captures do not establish live HighLevel/Meta delivery, lender/owner creative acceptance, custom-domain readiness or full D9 completion. The separate 40-image saved-webinar journey review remains owned by its assigned reviewer and is not overwritten here.
