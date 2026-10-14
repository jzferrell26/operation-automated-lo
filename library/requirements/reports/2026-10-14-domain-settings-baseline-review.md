# Domain Settings baseline review

Reviewer: independent `ux-ui-guardian`, October 14, 2026.

Verdict: **PASS for the eight specified Settings default-state baseline images and the intended Domains entry.** No new visual delta was found. This is a scoped image approval, not approval of the whole branch, workflow, Settings implementation, other states, provider behavior, or production deployment. No image was regenerated or adopted by this reviewer.

## Governing intent and scope

`library/knowledge/private/ux-ui/04-screens/domain-setup.md:13` states: "Settings links to Domains." The new entry at `apps/web/src/features/workspace/workspace-screen.tsx:50-58` implements that intent through `/settings/domains`, descriptive domain-control/DNS/HTTPS copy, and the governed action Link at `:93-95`.

The existing Settings directory composition is governed by the dated PRD-009 review, `library/requirements/completed/prd-009-marketing-toolkit/qa/2026-10-03-scored-baseline-review.md:542-546` (F-11, semibold in-card section titles), `:1277`, `:1342` (all eight Settings images scored 3 on all axes), and `:2403-2417` (phone header-action correction). This narrower, previously reviewed composition is retained. Design Brief sections 8-11, 14 and 18, `03-components/application-shell-and-navigation.md`, and `06-review-rubric.md` govern tokens, typography, shell, responsive behavior, focus and the scoring scale.

I opened every whole new original and every whole corresponding prior original, sixteen images total. I did not infer an unseen frame from another image. The new images came from `tmp/domain-settings-baselines-38544884852/`; prior images came from `tests/visual/screens/review/`. All eight new files differ from their corresponding prior bytes. The earlier run 38531604133's unchanged Settings artifacts are not approved as evidence for this change. The other inherited 136 images and other regenerated artifacts are excluded from adoption by this review.

## Scored default-screen evidence

Each row below applies independently to 1440 Light, 1440 Dark, 1180 Light, 1180 Dark, 768 Light, 768 Dark, 390 Light and 390 Dark. Each image scores **30/30 for the applicable default Settings composition**. State and motion scores have the expressly limited applicability stated below; they do not imply review of unseen interactive states.

| Axis | Score in each of the eight images | Criterion and observed evidence |
| --- | --- | --- |
| 1. Hierarchy | 3 | One Settings page heading, an outline refresh action and subordinate destination sections. Domains is the first destination. The directory retains its prior section-title treatment and avoids competing primary filled buttons. Desktop places three entries in the first row and the fourth beneath; tablet and phone preserve the same reading order in one column. |
| 2. Spacing rhythm | 3 | Existing `--space-5` grid gap and `--space-4` internal gap are reused (`workspace.module.css:127-135`). At 1440/1180, the new card uses the same 24px inset as its siblings. At 768, it remains 24px; at 390, the inset is 20px. Phone column edges remain 16px and header refresh spans the column. |
| 3. Typography | 3 | Existing Inter and token steps remain unchanged: 28px page title, semibold 19px directory-section titles, 14px descriptions, 16px action labels. The dated F-11 Settings ruling governs these section titles. New text wraps into three description lines at desktop/phone and one at 768 without clipping. No numeral or timestamp treatment is introduced. |
| 4. Color and contrast | 3 | New entry reuses semantic card, border, text and icon tokens with no new literal color. Light remains a pale canvas/white surface; Dark retains the existing neutral surfaces and legible ink. An independent token-contrast unit run passed all 107 cases. No status is conveyed by color alone. |
| 5. States | 3 | Applicable default directory state is complete and honest. Each destination has a visible named link; the Domains copy describes setup checks, not readiness or an already active publication. No disabled, loading, failure or connection-status region is introduced here. Those domain-screen states are outside these eight images. |
| 6. Motion | 3 | This added entry is static and introduces no motion rule or animation. Existing action wrappers remain. A screenshot cannot establish animated or reduced-motion behavior; this score covers absence of new motion in the reviewed default composition only. |
| 7. Responsiveness | 3 | 1440/1180 retain three columns with the fourth entry on the next row; 768/390 stack all four entries. All text, icons and action outlines stay inside the image width. The 390 Account action pair fits without overlap. All visible action outlines are 44px tall. Full-page height growth is the expected additional entry, not horizontal overflow. |
| 8. Dark and Light | 3 | Every width/theme pair was inspected independently. All four destination surfaces, outline controls, icon tiles, shell selection and body text resolve coherently in both themes. No Light-only or Dark-only defect was found. |
| 9. Empty and error states | 3 | No empty/error region is applicable to this static destination directory, and none is hand-built by the new entry. The entry does not manufacture connection facts, results or success. This score does not qualify domain-screen AsyncState or route-boundary states. |
| 10. Consistency with references | 3 | The Domains entry reads as a sibling of the previously reviewed Settings directory in all eight prior originals. Existing shell, card-like directory sections, icon tile, inset, heading and action treatment are retained. The narrower dated Settings composition ruling is cited above. |

No proposed visual token delta is necessary for the intended addition. The approved baseline change consists of the added Domains section, movement of the existing sections in the directory, and resulting full-page height growth.

## Source-policy observation outside the image approval

The existing renderer at `workspace-screen.tsx:83-105` uses `section.toolCard` rather than the Card wrapper. Its border, radius, background and shadow remain in `workspace.module.css:132-155`. The generic `03-components/card-and-surface.md:13-16` requires Card/Surface wrappers; `:26-29` names `--shadow-card`. The renderer presently uses `--shadow-rest`. These are inherited implementation differences, also present in the prior approved eight images, and the new entry reuses them. The dated visual review supplies the specific Settings composition/section-title precedent; it does not establish blanket source-wrapper compliance. I surfaced this distinction to the parent. This scoped baseline approval does not independently clear or waive that generic source-policy discrepancy, authorize an exception or replace a source-compliance review.

## Capture provenance and verification

Completed workflow [38544884852](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38544884852) ran at `4209bbfeea4ce97b2693741afb85e72b6839434e`. The authenticated review job is 115788370802. Its actual new-account capture cases passed at 09:57:26 UTC (Light) and 09:58:23 UTC (Dark). `tests/browser/review/helpers/new-account-pages.ts:142` includes Settings; `empty-account.spec.ts:240-256` invokes the shared capture for all frames. `tests/browser/helpers/design-quality.ts:873-901` applies axe, overflow, target and type checks during capture. This uses the disposable authenticated PostgreSQL composition, not a customer production session.

The **overall workflow and authenticated review job failed**. The later webinar-ad beforeAll sign-in returned 429, reported from `tests/browser/review/webinar-ads.spec.ts:66`. The log reports 154 browser cases passed, with failure retained. Synthetic job 115788370534 succeeded. The passing Settings captures support this specific image review; they do not turn the failed workflow green. Canonical CI and the authenticated-fixture consumer correction remain required.

Independent local checks: token contrast, 107 passed; workspace-screen integration, 13 passed. The first combined invocation selected incompatible Vitest project group orders and ran no tests; the two explicit project invocations then passed. No configuration or source was changed to obtain these results.

## Image manifest

Filenames below are relative to the new/prior directories stated above. SHA-256 is over each original file's exact bytes.

| Image | New dimensions | Prior dimensions | New SHA-256 | Prior SHA-256 |
| --- | --- | --- | --- | --- |
| settings--default--1440--light.png | 1440 x 900 | 1440 x 900 | `79dd66ab0ac12bf60d3dbe764395032adaaf85a95dd1fcce987117acd3f8dbda` | `d6cbca5f8f420c77ffb15f43d4e6cc549e43913033b9231b8eccdad9a6536558` |
| settings--default--1440--dark.png | 1440 x 900 | 1440 x 900 | `3674bca7736eb12d412c039bdbe4544a64593d91d5979d851c549e061a3b0ebc` | `3dd419fe8fafd7afdbbea02370a7aab0eae205fed53d06ff0642ddc478f1cf6a` |
| settings--default--1180--light.png | 1180 x 900 | 1180 x 900 | `e63ad778c613804f19a989960b6302d4b213255625ff4198e2ab4a753babcc21` | `9aa668a87e94b84dfbe5d483134ce03d753f4d95dc359b612507e832795b946f` |
| settings--default--1180--dark.png | 1180 x 900 | 1180 x 900 | `6f9542c0bb5256d22c7a9cf0454eefda6d3fbbb34df684e8c68fdc0e71f71674` | `36a348964a84f16231b9a0569c24526aea212df1763db65d6b3f507635517df6` |
| settings--default--768--light.png | 768 x 1285 | 768 x 1034 | `1b79c967199340b777400dbf02eac22d851042833f2ce543305462a4a5b2e7ca` | `adc4bd4d5e8dadf4bf8d885be5f482ff83a6429bd9ae16c933ebc5c440d21e99` |
| settings--default--768--dark.png | 768 x 1285 | 768 x 1034 | `5805c6b2e7087a0634ca73f055e2aee1642515be486bd281f5edf231728ff107` | `6cfbfd0d3e682c3e5e9efa4a320f8fd2deb0ad09b73937d4f94f33dff9d3dd31` |
| settings--default--390--light.png | 390 x 1377 | 390 x 1092 | `9735b67a93ba656ba1838ecfd104f165f097d8ee7c43a7f12a591f2b4994ceb2` | `ab78e6cddd9ee0fac5238701880970f4df6472fd74afbbff4c3133f39b127456` |
| settings--default--390--dark.png | 390 x 1377 | 390 x 1092 | `07b8de773d255e3a62db0ac79ad073422c37fa30c8825b7e9a798ad5ff9801fe` | `41a8db1dba0b7c46e2b5b0fe299fb0063bb0828617f482482df83775aac49342` |

## Source/spec pins

| File | SHA-256 |
| --- | --- |
| apps/web/src/features/workspace/workspace-screen.tsx | `6121760e1490050168e1625c4590c40e5996427572b41ed852e68d4ca4f808fb` |
| apps/web/src/features/workspace/workspace.module.css | `558aa4485f502d724ae0512c12f365a1edb8c80aac3692ebc2a6929e5fdc3242` |
| library/knowledge/private/ux-ui/04-screens/domain-setup.md | `ce9b8bf34e36580840cbb44e59dc39d14c1caebdb604ac4e2775119595ab5685` |
| library/knowledge/private/ux-ui/06-review-rubric.md | `4815f6399f9da8bab5fb76f9e09d2db77a5e5c6eb65d3599f167fc866e4ef7dc` |

Ownership: only this report was written. PNGs, application code, specifications, snapshots, workflows and Git state were not edited by this reviewer.
