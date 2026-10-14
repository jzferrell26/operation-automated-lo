# Financing photographs: independent UX review

Reviewer: ux-ui-guardian. Date: October 13, 2026. Branch: `codex/financing-photos`.

## Verdict

Approve the bounded private photo/facts presentation after the output owner corrected the identified deltas. Rechecked the rebuilt eight-case browser run, all replaced captures and rendered final PDFs. No required finding remains in this bounded presentation scope. This is not complete D9, owner visual acceptance, lender approval, hosted qualification or full ListReports parity.

The review owns this report only. Product code, tests and screenshot baselines remain with their assigned owners. Security and Quality closeout are separate.

## Governing rules

The current host design system is `library/knowledge/private/ux-ui/`, rather than the generic Weapon's example folder. Consulted the master brief, canonical tokens, card/surface and campaign/artifact specifications, campaign-studio screen, and `06-review-rubric.md`.

> Design brief section 13: "Dashboard theme never changes" PDFs and public campaign pages.

> Design brief section 14: "Tables become labeled cards or explicitly scrollable data regions."

> Card and Surface, Anatomy inside a card: "a card's children stand `--space-4` (16px) apart".

> CTR-001 revision 1, Output consumers: "Long descriptions can continue on supporting pages."

The accepted contract's output section requires actual saved photograph bytes, separate saved property facts, a photo-led portrait comparison through three options, an explicit extended/landscape report for four/five, and complete amounts/disclosures. It permits supporting pages; it does not authorize truncation, stock replacement, public distribution or a one-page promise.

## Evidence and scope

The final capture-corrected production-build log `test-results/financing-photo-browser.log` records eight passing Chromium cases in 1.2 minutes. The source `tests/browser/financing-photos.spec.ts` runs local synthetic authentication with actual upload/save/read/site/PDF HTTP routes and filesystem adapters. These are original fictional fixtures, not customer photographs or a production account session. The save uses HTTP after the UI upload/rights/hero interactions; it does not prove the complete form submission flow.

Reviewed all 24 PNGs in `test-results/product-review-frames/financing-photos`: `report`, `site` and `hero`, each at 1440, 1180, 768 and 390 in Light and Dark. The eight hero images are top viewport captures of the report, not upload-form captures. Prior misplaced sticky-header captures are not accepted evidence. Full-page overviews plus detailed lower-section crops were inspected. The report's final corrected header appears at the top only.

All eight downloaded PDFs were parsed for page size, complete text and two image objects. Both final PDF variants were rendered with the bundled PDFium runtime and every page inspected. The three-option portrait fixture has seven 612 by 792 pt pages. The five-option fixture at 1180 has eight 792 by 612 pt pages after correction. The long description, long option names and near-limit alt text are retained. These page counts are evidence from the current fixture, not fixed product guarantees. Long-copy continuations leave some sparsely populated pages; that is permitted by the extended-report contract and is not a one-page flyer claim. Complete notice paragraphs now stay together, and the supporting photograph, caption and both appendix notices share one page.

The saved output consistently shows list price $420,000.00, illustrated purchase price $400,000.00, three bedrooms, 2.5 bathrooms and 1,800 sq ft. Complete financial tables retain principal and interest $1,918.56, monthly housing $2,568.56, cash at closing $80,000.00, supplied APR 6.250%, and all three accounting groups. Both photograph placements appear in the report/site and PDF. The report/site browser assertions compare actual image bytes to upload hashes, check image decoding, require no horizontal overflow and zero axe violations in the report main region and entire private site. The source also requires no page errors and no external HTTP origins.

The private site stays Light under both application themes, as required for an output. App report surfaces adapt to Light/Dark; images retain their original colors. No broken photograph, clipped financial value, hidden disclosure or text overlap was visible in the successful-state frames.

## Scored observations

Use the host rubric's 0 to 3 scale. `U` means the required state was not fully reviewed, and is not a passing score. This bounded matrix does not average away defects.

| Surface and frames                                | Hierarchy | Spacing | Typography | Color/contrast | States | Motion | Responsive | Themes | Empty/error | Consistency |
| ------------------------------------------------- | --------- | ------- | ---------- | -------------- | ------ | ------ | ---------- | ------ | ----------- | ----------- |
| Report, all four widths, Light                    | 3         | 3*      | 3          | 3              | U      | 3      | 3          | 3      | U           | 3*          |
| Report, all four widths, Dark                     | 3         | 3*      | 3          | 3              | U      | 3      | 3          | 3      | U           | 3*          |
| Private site, all four widths, entered from Light | 3         | 3*      | 3*         | 3              | U      | 3      | 3          | 3      | U           | 3*          |
| Private site, all four widths, entered from Dark  | 3         | 3*      | 3*         | 3              | U      | 3      | 3          | 3      | U           | 3*          |

The report's starred scores apply to the new photo/facts projection, using the current host token/card conventions and the accepted contract. They do not reapprove every unchanged summary/card spacing rule in the legacy report. The starred private-output scores use the accepted fixed output layout contract, not application UI tokens or a new public-page mockup. They mean the additive photographs/facts preserve the original private output's composition, readable text and financial hierarchy. They do not approve its inherited Arial/raw-CSS output style as a new application design system. Hover, focus, error, missing/revoked media and permission states are not fully scored from successful-state captures. No motion was added to the reviewed photo projection.

## Findings corrected and rechecked

### FP-UX-01: new property section heading gap

Report, all four frames, both themes, saved v2 state. Originally `apps/web/src/features/financing/financing.module.css:19-22` supplied `margin-block-end: var(--space-3)` to the new property section headings. The 12px gap failed the card/surface requirement for `--space-4`, 16px. Original axis 2 score: 2.

Closed October 13: `.page h2.propertySectionTitle` now sets `margin-block-end: var(--space-4)` at `financing.module.css:239-243`. Rebuilt facts/gallery captures in both themes were rechecked. No shared component or unrelated legacy card rule changed.

### FP-UX-02: v2 PDF orphan fragments

PDF, portrait three-option fixture and landscape five-option fixture, fixed Light output, long-copy state. The original renderer reserved lines separately and reserved photograph height without its complete caption or trailing appendix notice. The original portrait fixture left the final word `customers.` on a separate page after its private notice (pages 5/6). The original landscape fixture left normalization/usage notice on its own page after the supporting photograph (pages 8/9). Original axis 2 score: 1 for those page transitions.

Closed October 13: `financing-pdf.ts:87-103` reserves ordinary v2 paragraphs together while allowing over-page-height descriptions to continue. `:154-174` budgets the caption, and `:285-296` reserves both appendix notices before scaling the photograph. Rerendered final portrait page 6 contains the complete private notice, rather than its orphan final word. Final landscape page 8 contains the supporting photograph, full caption, normalization and usage notice, eliminating the old page 9. All amounts, text and both image objects remain. No footer overlap was visible.

### FP-UX-03: inherited type drift avoided for v2

`financing.module.css:13-21`, `:75-80` and `:94-98` originally supplied inherited raw/clamped type sizes to the new v2 report. Closed October 13 by the narrow `.versionTwo` selectors at `:244-256`, and the explicit version class in `apps/web/src/features/financing/report.tsx:27-30`. Heading/amount use `--text-page-size`; section/cash/caption use `--text-section-size`; option titles use `--text-card-size`. The fresh eight-case browser suite asserts all rendered authenticated report text uses the host's six steps. Legacy v1 declarations and exact output bytes remain intact. Remaining historical v1 styling is not newly accepted by this report.

## Independent verification

Ran `pnpm exec vitest run --project unit` against token contrast, delivered semantic surfaces, defined type tokens and financing output layout: four files, 124 tests passed. This independently covers the v1 exact HTML/PDF hashes, actual image embeddings, complete saved accounting text, output caps and the applied token source checks. The output owner's separate fresh 36 output/legacy tests and the final rebuilt eight browser cases also passed. No runtime edits or new test were authored by this reviewer.

## Open qualification

No new tokens, external libraries or motion buckets were introduced by this review. Property photo input controls are source-inspected but have no final form screenshots in this artifact set. Complete keyboard, 200% zoom, reduced-motion, all empty/error/revoked states, canonical Linux pixel comparison, real photographs and permissions, R2 storage, real account/hosted behavior, identity photographs/logos, reviewed presets, public release/QR/domain, and customer/lender visual acceptance remain open. Unit evidence for one through five options and six images supports structural completeness but is not six-photo visual acceptance.

The bounded deltas above are closed by source and fresh artifact evidence. Do not mark the entire host rubric or D9 complete from this report.

## Final input correction addendum

The subsequent broad governed-control gate found a raw file input in the new photograph component. The input owner replaced it with `TextField type="file"` from `@oalo/ui`, retaining its label, file ref, JPEG/PNG accept values, disabled condition, file-change handler and cancellation behavior. The reviewer re-opened only this input projection and this report. Earlier report/site/PDF runtime and layout findings remain closed; this addendum does not expand to the legacy financing form.

The governing form-field specification states: "Feature code imports `FormField`, `TextField`, `TextArea`, and `PasswordField` from `@oalo/ui`." It requires affected-field errors connected through `aria-describedby`, visible labels and the shared control/focus tokens. The button/safe-action specification supplies the 44px control minimum and adjacent disabled explanations.

Two narrow source findings were corrected by the input owner. `apps/web/src/features/financing/media-input.tsx:108-109` now applies the existing `propertySectionTitle`, avoiding the legacy raw 20px h2 and using `--text-section-size`/`--space-4`. At `:117-133`, chooser MIME/size validation reaches `TextField.error`; at `:156-165`, missing/invalid upload alt text reaches that field's own error. The shared primitive supplies `aria-invalid`, `aria-describedby` and the visible error glyph. General uncertain-upload results remain in the component alert; file, rights and retry identity are retained.

The central plain-language message catalog at `apps/web/src/features/http/user-messages.ts:90-128` has a what-happened/next-action pair for all nine media error codes. This is source coverage, not proof that every provider/error state was visually exercised. The review independently ran the corrected media-input integration suite: four passed, including chooser accessible descriptions, alt-field invalid wiring, uncertain retry preservation, reorder/removal and six-placement cap. It also ran user-message and governed-control units: two files, 39 passed.

Initial scoped-element setup captures were rejected: their sticky shell header appeared midway down the card and covered upload controls/status. That was invalid capture evidence, not a scored product state. The input owner is replacing them with warmed full-page screenshots taken after returning scroll to zero; no CSS hiding or image cropping changes the app presentation. Final eight-frame source and capture recheck is pending in this addendum until the rebuilt browser run completes.

### Final input recheck completed

The pending statement above is superseded by the final rebuilt run. The input owner confirmed session 59900 completed on the corrected source; `test-results/financing-input-final-browser.log` records eight passed in 1.1 minutes. The new media card asserts zero scoped axe violations, no page overflow, both actual uploaded image loads and the exact governed 19px section heading before the direct HTTP save. The earlier report/PDF paths still pass in the same journey.

Inspected all eight final `photos-setup-{1440,1180,768,390}-{light,dark}.png` full-page captures, focusing on the new photograph card. The sticky header now appears only at the top of each original capture, and no upload/status/control is obscured. Diagnostic crops used for close inspection are derivatives in `tmp/ux-financing-pdf`, not altered acceptance screenshots. The mobile chooser, permission selector/checkbox, alt fields and all reorder/removal buttons fit within the card. Controls wrap vertically at 390, the checkbox sentence remains legible, and both thumbnails retain their proportions. Single-line alt fields expose their editable long value through normal text-input scrolling; the complete saved caption remains covered by the prior report/PDF checks.

The new card's successful-state projection scores 3 on hierarchy, named heading/field typography, semantic color, responsive containment, both themes and consistency with the governed form primitives at all four widths. Its field and action spacing uses the existing shared control and named layout rules. This is scoped input acceptance, not a fresh score for every historical section on the complete form. Error/uncertain/cap/reorder states have source and focused interaction evidence; they have not all been captured as a full visual matrix. The addendum therefore retains `U` for full states/empty-error visual qualification and does not claim complete D9.

The narrow input findings are closed: governed chooser, heading tokens and affected-field error wiring. No remaining required finding was observed in the bounded input correction. The earlier statement that form controls had no setup screenshots is superseded for this new photograph card by these eight actual captures. Hosted/provider/customer-image/rights qualification and owner/lender approval remain open. Security will review this final input delta before Quality closeout.
