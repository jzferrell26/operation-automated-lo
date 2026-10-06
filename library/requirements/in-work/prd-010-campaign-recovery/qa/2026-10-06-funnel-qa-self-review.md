# QA self-review: five-funnel studio

Date: October 6, 2026. Base: `37fc0566`, merged PR #81.
Reviewer: Chief, direct sequential quality review after [security self-review](2026-10-06-funnel-security-self-review.md). No independent-agent review or owner visual approval is claimed.
Scope: [five-funnel increment](../five-funnel-studio-increment.md) and [screen specification](../../../../knowledge/private/ux-ui/04-screens/five-funnel-studio.md).

## Summary

All five owner-selected funnel designs, their fourteen page surfaces, field-only editing, photo replacements and private draft persistence are implemented. The resume preserved the existing build rather than generating a duplicate branch or starting over. The complete local offline gate and canonical Linux generation/real-database qualification passed on `5e895cf3`, and the corrected Vercel gallery plus all five preview routes returned HTTP 200. The final no-update screenshot comparison is being closed out separately below; this review does not describe private page previews as live lead-generation funnels.

## Scorecard

| Axis | Status and scope |
| --- | --- |
| Completeness | Designed journeys and saved editing implemented. Live lead capture, domain activation, consent/HighLevel delivery and real booking/resource delivery remain outside this private increment. |
| Correctness | Strict field schemas, author-bound persistence, conflict/retry tests, saved image-byte stability and calendar/video destination tests cover the implemented behavior. |
| Alignment | Exact five-kind roster; no general page editor, drag/drop, client-written code or arbitrary embed markup. The financing report remains an additional campaign feature. |
| Gaps | Public operation and owner-supplied media/destinations need later qualification. A client can personalize the five designs now but cannot publish a functioning public lead path from this increment. |
| Detrimental patterns | No new dependency, unsupported framework, hidden activation, invented loan results, source-client testimonial, leaked private collaboration link or rule-suppressing test adjustment. |

## Critical issues and release holds

No new Critical defect was found in the reviewed private-design/editor scope after the listed repairs. This is not a full-product release approval. **Apply the additive funnel migration before any hosted release that must save drafts.** Keep this change unmerged while its final configured checks are incomplete. The inherited data-lifecycle and distributed-quota restrictions in the security report also remain.

The public-funnel promise is explicitly unfinished: the form dialog is a designed preview with disabled personal fields, not a functioning registration. Book/resource/video URLs require the owner's actual destinations. No design-preview transition confirms an appointment or creates a lead. This distinction is visible in the application and documented in the implementation brief.

## Warnings and resolutions

**QA-FUN-001, test dependency placement:** the interrupted full gate passed the browser suites and then failed `audit:boundaries` because a new rendering-source test imported Vitest as an undeclared package dependency. Moving that test to the existing root tooling test tree retained all coverage and restored the original Vitest inclusion. No runtime/test package or audit exception was added.

**QA-FUN-002, image control overlap:** the cover's caption card overlapped the bottom photo-edit control in the desktop editor. `surface.module.css` now gives the edit control clearance; the eight frame/theme editor cases click that exact control, assert the Photos section and file-input focus, then return to editing. The control is not merely present in the DOM.

**QA-FUN-003, small-screen composition:** the guide-book artwork could be cropped by a short mobile image frame, and the refinance art caption could sit under its rounded top. The guide keeps a portrait frame, and the refinance caption sits inside the arch. Booking pages no longer repeat the same heading/description twice, and shared external links draw only their built-in external glyph.

**QA-FUN-004, delivery scope:** schema-valid HTTPS links are not proof of reliable playback, an accessible caption track, an available guide or an appointment handoff. This increment does not activate or verify those external resources. Do not turn its successful preview navigation into a claim of successful customer delivery.

**QA-FUN-005, Dark-editor hover contrast:** clicking the real cover-edit button exposed inherited secondary-button hover paint from the Dark application shell inside a fixed-light marketing preview. The scoped template now supplies foreground/background/border values for CTA and photo/outline/text-action hover states. The actual failing axe check is retained and landing-page cases also hover their CTA before the accessibility scan. No contrast rule, theme, interaction or test was disabled.

**QA-FUN-006, serverless preview import, resolved:** the first actual Vercel read returned 500 because the rendering barrel loaded Playwright's test entry and its missing browser-manifest file. A dedicated raster-only export removes that request-time browser/test import; the boundary has two regression cases. Authorized reads of the corrected deployment now return HTTP 200 and the expected component at the gallery and all five preview routes. This is actual render evidence, not only a Ready build status. Hosted saving is not tested or enabled by those read-only requests.

## Suggestions

The next public-activation increment should keep these fixed templates and explicit editable fields. Attach the existing domain/approved-public-version, consent and HighLevel handoff work to this saved content rather than introducing a second builder or silently activating the preview form. Reusable brand/media libraries can subsequently replace repeat photo selection without changing the layout contract.

## Plan-item traceability

| Requirement | Implementation and proof |
| --- | --- |
| Exact roster and page flow | `features/funnels/catalog.ts` defines Live webinar (2 pages), On-demand (3), Buyer (3), Refinance (3), Lead magnet (3). Model and browser tests reject unknown kinds and walk all fourteen surfaces. |
| Field-only editing | `fields.ts` enumerates labelled editable content; `studio.tsx` selects field groups and updates the actual preview. Strict save schemas reject layout/HTML/authority fields; tests find no contenteditable or draggable canvas. |
| Saved identity and content | `funnel-http.ts` reads Brand on the server. `funnel-store.ts` uses principal-bound transactions and forced RLS. Exported-route tests cover other authors/workspaces, read-only roles, request-origin/CSRF and brand changes. |
| Photos editable from the page | Preview photo actions focus the editor's relevant upload field. Server normalizes raster pixels/metadata, save rechecks the bytes, alt text/permission are required, and a later text-only save preserves normalized bytes. |
| Future webinar and calendar | `calendar.ts` preserves the supplied instant/duration and time zone; downloads and links are marked previews. Missing/past dates do not turn into fake countdowns or confirmed registration. |
| On-demand, booking and guide | `video.ts` permits known player shapes. `surface.tsx` checks unsaved destinations as well as saved data, requires deliberate playback/navigation, and preserves clear missing-link states. |
| Concurrency and failure recovery | Exact last-request retries reuse a revision; changed/stale writes return conflict. Four simultaneous first writes return one revision. Browser drafts survive failed/uncertain saves and do not autosave while typing. |
| Responsive and accessible UI | All five first and follow-through pages are exercised at 1440 and 390 with unfiltered axe and overflow checks; the editor is exercised at 1440/1180/768/390 in both themes. Focus moves to the next-page heading and to the requested photo field. |
| Source respect and original work | The three provided pages were reviewed from saved actual-browser captures. Their portraits, unfinished placeholders, testimonial text and claimed savings are not imported. Original CSS imagery and generic educational copy supply usable defaults. |
| Public truthfulness | Drafts and pages explicitly state preview status; API/storage `publicationAuthorized` remains false. No live traffic, domain, email/SMS, billing or external account write is introduced. |

## Visual inspection

Desktop captures show a navy/mint live event, centered cinematic on-demand, ivory/forest buyer, dark teal refinance, and warm plum resource design. Their confirmation/watch/booking/thanks pages are part of the same design, not blank placeholders. Page structure follows the requested outcome-led direct-response direction; this is a design interpretation, not a measured conversion claim or proof of a $3,000 market valuation.

The source-review screenshots remain private local inputs. Demonstration captures use the real running components with fictional local account data; no source-client artwork or personal data is committed. The owner's visual review remains separate from this self-review and the automated checks.

## Verification record

Before the resumed final gate, the interrupted aggregate passed 2,847 unit, 857 integration (one existing skip), 112 contract/security, 77 component, eight visual-contract and one preview-contract tests, plus 247 synthetic browser and 16 preview-browser tests. It then failed the boundary issue described above; that run is **not** reported as a passing aggregate.

After the repair, the boundary audit and all three relocated photo tests passed. All six PostgreSQL route cases passed again. The recorded clean migration/pgTAP run contains 759 assertions across sixteen files with no failure.

**Complete local gate: `pnpm verify:offline`, exit 0, on `5e895cf3`.** The actual retained log is `tmp/funnel-final-qualified.log`. It records 2,849 unit tests, 857 integration tests with one existing skip, 112 contract/security, 77 component, eight visual-contract and one preview-contract test, 247 synthetic browser cases with 22 existing skips, and all 16 dashboard-preview browser cases. Formatting, lint, types, duplication, boundary/product-type/secret/dependency audits, builds and the sample-ad build scan also passed. The final application implementation is not being changed merely to refresh that evidence.

Canonical run `37466661841` identified inherited stale visual references: populated campaign-list columns differ from their pre-normalization references, and the authenticated `home--with-campaigns` reference still predates the merged Home studio. The current branch changes neither Home's rendered layout nor campaign-list typography. The retained trace confirms capture labels normalize to `Oct 16`/`Oct 2` as intended. These are not failures of the new funnel save/preview paths, but they still prevent the complete gate from passing until the references agree with their intended implemented states.

**Both jobs of canonical Linux run [37469858775](https://github.com/jzferrell26/operation-automated-lo/actions/runs/37469858775) passed on the unchanged application implementation `5e895cf3`.** This includes the synthetic screenshot suite, clean migration/pgTAP qualification, 287 web/PostgreSQL cases, 150 authenticated sample-catalog browser cases, and four real-catalog browser cases. It is generation and functional qualification, not the final comparison against refreshed references.

Exactly **18 existing Linux reference images** are refreshed after inspecting decoded pixel differences: eight `chromium/campaigns--populated` references for the already-implemented capture-only normalized date widths; eight `review/home--with-campaigns` references for the merged Home hero; and two `review/shell--menu-sheet-open--390` references for that same Home visible behind the unchanged menu. The synthetic failure's actual 1180-Light image is pixel-identical to the newly generated reference; 1440-Dark differs only in a few antialiased border pixels outside the repaired text geometry.

No screenshot comparator, tolerance, date mask, application layout, test assertion or skip changes in this closeout. Unrelated settings/account-button rasterization and campaign-detail date differences are not accepted. The final PR comparison must now pass with no snapshot update flag; its run/result will be recorded after it completes. New-gallery captures remain illustrations of the actual private designs, separate from these pre-existing golden files.

## Change inventory

The feature adds the private funnel pages/API, `features/funnels/`, funnel server store/read/save modules, raster normalizer, strict catalog models and their tests; one additive migration and pgTAP file; scoped design tokens and finite video-frame CSP handling; a studio entry link and matching error vocabulary; and owner-direction/design/review documentation. Existing financing calculations, ad flows, pricing, dependencies and public/provider controls remain unchanged. Exact paths and counts are the PR's file diff. Ignored logs, source references, local stores and credentials are not staged.
