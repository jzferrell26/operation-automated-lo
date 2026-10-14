# Domain setup: independent scored visual review

Reviewer: `ux-ui-guardian`, `/root/domain_visual_review`, independent of the UI author and the root copy-repair author. Date: October 14, 2026. Scope: the domain setup UI and its 72 original synthetic API screenshots. This reviewer owns this report only.

## Verdict

**Changes requested.** The nine pictured states are visually coherent at all four required frames in both themes. Required finding DUV-01 prevents acceptance under the product's all-axes-at-3 rule: generic loading, error, permission and unavailable regions bypass `AsyncState`. No source, image, canonical baseline or prior report was changed by this review.

**Settings baseline approval remains pending.** The eight literal Linux Settings captures from Screen baselines run `38531604133`, source head `50c7e281f8914443f49adb219357fab00dd832d4`, have not been supplied to or inspected by this reviewer. The Settings card is not approved by this report. No unrelated regenerated baseline is in scope.

## Governing sections

The current October 1 amendments and October 6 campaign-first amendment govern over the historical navy shell and Claude canvas descriptions in `library/knowledge/private/ux-ui/00-design-brief.md`. This review applies that brief's sections 9 through 16 and 18, the domain screen specification, shared component specifications and `06-review-rubric.md`.

> Design brief section 15: "The interface must never promise provider behavior that has not been verified."

> Domain setup, Composition and tokens: "Records wrap rather than causing horizontal overflow at 390px."

> Domain setup, Accessibility and output truth: "Ready means a current server check, not that a publication exists."

> Review rubric section 1: "The bar is 3 on every axis, for every screen, at every frame, in both themes."

> Async, Empty, Error, and Permission State, Canonical export: "Feature code imports `AsyncState` from `@oalo/ui`."

The component specification additionally forbids ad hoc state views. Rubric axis 9 requires `AsyncState` variants. The domain screen specification introduces no explicit, dated exception to those rules.

## Evidence and provenance

All 72 PNGs were individually opened as whole original images using `view_image` with `detail: original`. No montage, crop, image rewrite or replacement was used. Each full-page image includes its final bottom controls; disconnect captures intentionally show the modal in the actual viewport after the real trigger is clicked.

Original directory: `test-results/product-review-frames/domain-setup/`. Manifest: `source-images.json`, SHA-256 `40080d283c092b234bfbdfed8768e3d9f6df4d570b5575a3d47f8ed195b69448`. Independent file verification found 72 entries and **zero hash mismatches**. Original captures are synthetic API outcomes on the production-rendered local application, not provider or database evidence.

The required viewport dimensions are `1440x900`, `1180x900`, `768x1024` and `390x844`, defined at `tests/browser/helpers/design-quality.ts:14-18`. Full-page heights vary with content; the viewport dimensions remain those values. Both Light and Dark were inspected for every state.

Frozen source inspected:

| File                                               | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/features/domains/domain-screen.tsx`  | `a78ce77b00474e7f21c0931ae9affa4b76114585294fc2d4d81d8ca486011c40` |
| `apps/web/src/copy/page-titles.unit.test.ts`       | `6823f91b6def90a946462a3e429212879d2b7011eea075e6dea417f1b3eeb7f8` |
| `tests/browser/domain-setup.spec.ts`               | `265dc96564183f64fdb05649eb1fee0cac12c4988a7291f8bc8a9f0837d4f15b` |
| `apps/web/src/features/domains/domains.module.css` | `595315ed052851d9089416fadb3d109eae540d8324b8cc2b716857067a23a718` |

The first three match the copy-and-frame handoff. That handoff supersedes the earlier three-file pins while preserving the earlier UI implementation and review history.

## Scoring matrix

Axes in order: hierarchy, spacing, typography, color/contrast, states, motion, responsiveness, Light/Dark, empty/error/state composition, consistency. Each row below applies separately to each of its eight inspected originals: four required widths multiplied by two themes. This explicitly scores all 72 captures, rather than accepting a representative subset. A score below 3 is blocking under the rubric, even where the copy and layout look calm.

| Capture suffix, after `{width}-{theme}-` | Originals inspected | Axis scores 1 through 10 | Result                             |
| ---------------------------------------- | ------------------- | ------------------------ | ---------------------------------- |
| `empty-synthetic.png`                    | 8                   | `3,3,3,3,3,3,3,3,3,3`    | Pictured task composition on brief |
| `ownership_needed-synthetic.png`         | 8                   | `3,3,3,3,3,3,3,3,3,3`    | On brief                           |
| `dns_needed-synthetic.png`               | 8                   | `3,3,3,3,3,3,3,3,3,3`    | On brief                           |
| `certificate_needed-synthetic.png`       | 8                   | `3,3,3,3,3,3,3,3,3,3`    | On brief                           |
| `ready-synthetic.png`                    | 8                   | `3,3,3,3,3,3,3,3,3,3`    | On brief                           |
| `stale-synthetic.png`                    | 8                   | `3,3,3,3,3,3,3,3,3,3`    | On brief                           |
| `provider-disabled-synthetic.png`        | 8                   | `3,3,3,3,3,3,3,3,1,3`    | DUV-01                             |
| `read-only-synthetic.png`                | 8                   | `3,3,3,3,3,3,3,3,1,3`    | DUV-01                             |
| `disconnect-synthetic.png`               | 8                   | `3,3,3,3,3,3,3,3,3,3`    | Pictured modal on brief            |

The empty capture contains the ordinary connection task and labeled setup form. Its form should remain a form; it does not need replacement by an empty-state notice. Generic loading and error presentations are not pictured in this 72-image packet, so they receive no screenshot-derived passing score. Their source composition also fails DUV-01.

## Axis evidence

1. **Hierarchy:** one page heading followed by one active connection task or saved-host status card. The three ordered checks subordinate the exact TXT and hosting records. Only Review connection, Check domain or the modal confirmation is the decisive enabled blue action. Load latest saved state and Disconnect domain remain outline actions. See `domain-screen.tsx:223-240,264-310,312-427,429-457`. The disabled and read-only frames retain a separate explanation above the saved record.
2. **Spacing:** `domains.module.css:1-34,41-52,63-94` uses `--space-2` through `--space-6` for page, task, record and action grouping. Record surfaces use the shared hairline, sunken surface and control radius. Whole originals show consistent separation at 1440 and 1180, and deliberate stacked actions at 390.
3. **Typography:** page, section and card steps consume `--text-page-size`, `--text-section-size` and `--text-card-size`; metadata labels use `--text-secondary-size` (`domains.module.css:16-29,83-86`). Inter and tabular numerals come from `apps/web/src/app/globals.css:20,44-53`; no data font or private font is introduced. Long TXT values wrap without ellipsis or missing characters.
4. **Color and contrast:** local CSS uses semantic color tokens only. Badge text plus a status glyph accompanies amber, green or neutral status (`domain-screen.tsx:316-324`). Independent contrast and delivered-color source tests passed, as documented below. Existing button/field focus tokens remain independent of the action accent. Pictured scoped axe results are supplied by the author, not independently rerun by this reviewer.
5. **States:** expired proof turns amber and says routing is unavailable; current ready shows checked-at and valid-until dates. Provider-disabled leaves disconnect available, while the read-only session blocks both writes. Unconfirmed writes require GET reload and preserve typed input. Exact-input confirmation, duplicate prevention, clipboard failure, cooldown and focus return have independent passing interaction evidence below. The presence of these states is distinct from their shared-component composition defect.
6. **Motion:** no new motion is declared in the domain module. Shared Button uses `--motion-fast` and `--ease-standard`; Dialog uses the shared opacity transition and `--motion-slow`, both with reduced-motion blocks (`Button.module.css:18-20,210-216`, `overlay.module.css:28-30,204-206`). Static images do not prove motion; this score is based on unchanged shared wrapper source and its passing component tests. No independent domain-specific computed reduced-motion browser sweep was performed.
7. **Responsiveness:** actual originals show the six-link desktop header, two-row tablet header, and mobile Menu control. The 390 records retain names and full values, with independently named copy controls stacked. No sticky action is introduced. The modal fits inside the 390 viewport with both confirmation and cancellation visible. Target dimensions derive from shared Button minimum inline/block tokens (`Button.module.css:2-3`), with the checkbox's labeled row at the shared minimum (`domains.module.css:47-62`). The author browser spec checks document overflow, but does not perform a domain-specific exhaustive target measurement; this limitation is preserved.
8. **Light/Dark:** every one of the nine states is inspected in both themes at every required frame. Sunken record wells, disabled controls, status badges, labels and confirmation scrims remain legible. Themes use shared semantic values; no feature theme override is present.
9. **Empty/error/state composition:** ordinary connection setup and saved-host data status are correctly task-specific. The provider-disabled and read-only notices, generic loading span and generic error paragraph bypass `AsyncState`, hence DUV-01. Inline field errors may remain attached to TextField; successful concise notices may remain the existing polite live region.
10. **Consistency:** the domain screen follows the current light AutomatedLO shell, shared Card, Button, Link, FormField, TextField, Badge and Dialog. Its nearest governed siblings are Settings and the PRD-009 Home/campaign setup mockups, rather than the superseded navy canvases. The feature imports wrappers from `@oalo/ui` (`domain-screen.tsx:2`), adds no raw library dependency, font, palette or token. Actual Settings comparison remains unapproved until its eight literal originals are inspected.

## Required finding DUV-01: generic states bypass the shared state component

Severity: **required, blocks scored UI acceptance**. Screen: Domains. Frames: all four required sizes. Themes: both. Pictured affected states: provider-disabled and read-only. Additional affected source states: loading and generic error. Axis: 9.

Current locations in `apps/web/src/features/domains/domain-screen.tsx`:

| State                               | Current value/structure                                          | Required delta                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading, line 239                   | Hand-built `<span role="status">Loading domain settings.</span>` | Import `AsyncState`; render `kind="loading"`, `surface="card"`, title `Domain settings`, description preserving the existing progress wording. Keep disabled-write conditions and the current refresh label.                                                                                                                                                                                          |
| Generic error, lines 241-245        | Hand-built alert paragraph                                       | Render `kind="error"`, `surface="card"`, a plain affected-region title and the existing sanitized `error` description. Preserve `SupportReference` and GET-only recovery. Field errors remain attached to their field.                                                                                                                                                                                |
| Read-only, lines 250-254            | Hand-built Card and paragraph                                    | Render `kind="permission_restricted"`, `surface="card"`, with the existing view-only explanation, a reason naming this session's edit restriction, `requiredRole` wording describing the signed-in loan officer's editable session and `responsibleParty` wording identifying the loan officer or account support. These API property names must not introduce customer roles or a role-selection UI. |
| Provider unavailable, lines 255-263 | Hand-built Card, title and paragraph                             | Render `kind="degraded"`, `surface="card"`, preserving the exact current platform-setup explanation and saved-record/disconnect distinction. Keep the saved record visible and disconnect deliberately confirmed. Do not convert missing platform setup into a false ready state.                                                                                                                     |

The available component API is `packages/ui/src/components/async-state.tsx:28-53`; permission-specific fields are required by that existing discriminated union. The state wrapper owns the shared glyph, surface, status/alert semantics and busy announcement (`async-state.tsx:104-131`). The replacement needs no new token, animation or third-party primitive. Avoid wrapping `AsyncState surface="card"` inside another Card, which would duplicate the surface.

Required behavioral boundaries: do not change `loadDomain`, `writeDomain`, current-state parsing, revision payload, `inFlight`, edit eligibility, cooldown, `mustReload`, server capability or confirmation behavior. No new provider operation follows from this presentation correction. Successful notices remain concise live feedback. No customer-role feature is authorized. Capture replacement originals for the changed states and preserve this 72-image set as pre-repair history. Add a focused composition regression that checks the affected shared state kinds without weakening existing interaction assertions.

Gate implication: the current domain screenshot suite checks scoped axe and overflow but does not assert shared-state composition (`tests/browser/domain-setup.spec.ts:42-58`). Existing source guards and passing interaction tests did not catch this design contract violation. Its fix should be held at the feature's state-rendering seam, not through a global language or design-guard exemption.

## Independent verification

This reviewer ran the following against the frozen source:

- Four unit suites for token contrast, delivered semantic surfaces, global type defaults and defined type tokens: **120 passed**, four files.
- Shared state, overlay/feedback and interactive-control component suites: **28 passed**, three files.
- Domain interaction suite: **22 passed**, one file, 40.94 seconds. Tests run without DNS or provider effects.
- SHA-256 verification of all 72 original files: **72 match**, zero mismatches.

The copy/frame author reports eight production-server Playwright cases passing in 1.6 minutes, with no page errors or external requests and scoped axe/overflow checks. `domain-setup.spec.ts:63-74,119-127` performs real DOM confirmation triggers and Escape/focus-return checks. This reviewer inspected that source and its captured originals but did not rerun the browser or represent author evidence as independent execution. The browser spec's axe includes the domain region and excludes the separately mounted dialog; modal behavior is additionally supported by the independently passing shared component suite.

## Boundaries and next review

This is a source/UI review, not proof of owned DNS, hosting attachment, HTTPS qualification, saved-database browser behavior, production activation, default hostname-root routing, automatic rechecks, HighLevel delivery or completion of all FUN criteria. Connecting remains separate from publishing. No QR manager, role UI or unsupported root address promise appears in the inspected images.

Root may proceed with the narrowly scoped wrapper repair, then a fresh scored closure on new original captures, fresh Security and Quality, and current-head CI. A later independent inspection must explicitly name and hash the eight actual Linux Settings originals before baseline approval. This review grants no unrelated baseline update, merge, deploy, DNS mutation or provider action.
