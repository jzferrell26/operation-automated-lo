# Domain setup: independent AsyncState visual closure

Reviewer: `ux-ui-guardian`, `/root/domain_visual_review`. Date: October 14, 2026. Independent of `/root/domain_async_state_repair` and the root source/copy author. Scope: DUV-01 and the final 88 original domain setup captures. This reviewer owns this new report only.

## Verdict

**DUV-01 closed. Bounded domain UI acceptance passes.** The four generic states now use the governed `AsyncState` composition. All ten required rubric axes score 3 separately for each of the 88 inspected originals. No remaining visual delta was found in this packet. This supersedes the DUV-01 disposition in the [pre-repair review](2026-10-14-domain-complete-visual-review.md), without changing that report or its evidence.

**Settings canonical approval remains pending.** The eight literal Linux Settings captures from workflow `38531604133`, source head `50c7e281f8914443f49adb219357fab00dd832d4`, were not supplied to this reviewer. Passing Settings interaction tests does not approve those images. Fresh independent Security, Quality and current-head CI remain required. This report does not declare the branch shippable or the whole domain/FUN feature complete.

## Governing sections

The source of truth is `library/knowledge/private/ux-ui/`, including the current light-interface amendments to `00-design-brief.md`, sections 9 through 16 and 18, the domain screen specification and the shared state, safe-action and dialog contracts.

> Design brief section 15: "The interface must never promise provider behavior that has not been verified."

> `04-screens/domain-setup.md:9`: "Records wrap rather than causing horizontal overflow at 390px."

> `04-screens/domain-setup.md:23`: "Ready means a current server check, not that a publication exists."

> `03-components/async-empty-error-permission-state.md:9`: "Feature code imports `AsyncState` from `@oalo/ui`."

The remainder of that component rule forbids ad hoc generic state views. Its surface contract at lines 21-25 requires the page-level card treatment. The domain contract at lines 17-19 now maps the four generic states explicitly while preserving write eligibility, safe recovery and confirmation behavior.

> `06-review-rubric.md:24`: "The bar is 3 on every axis, for every screen, at every frame, in both themes."

The managed UX Weapon enforcement procedure supplies the lookup, citation, token delta and verification method. No new aesthetic, primitive, token or motion exception is required.

## Evidence and frozen provenance

All **88 whole original PNGs** in `test-results/product-review-frames/domain-setup/` were individually opened with `view_image`, `detail: original`. Every image was inspected, including the final bottom controls of full-page captures. No montage, crop, resize, image edit or replacement was used for approval. Disconnect originals show the actual viewport after a real dialog trigger; other captures are full-page originals.

The eight frame/theme combinations are 1440x900 Light/Dark, 1180x900 Light/Dark, 768x1024 Light/Dark and 390x844 Light/Dark. `tests/browser/helpers/design-quality.ts:14-18` defines these viewports. Eleven states were inspected in each combination. Full-page image heights vary with content.

Independent hash and byte-size verification found **88 matches, zero mismatches** against `source-images.json`, SHA-256 `c5534f0060c027471105120f4adaaa66acd42169fdf5fb5fea60a72aa5ca7dc5`.

The new [author handoff](2026-10-14-domain-async-state-handoff.md) matches SHA-256 `3ada1864faab9e6b43dc2d44eac9d815812d78f459e0781617bd5992e4e69598`. The following source pins were independently verified:

| Path                                                               | SHA-256                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `apps/web/src/features/domains/domain-screen.tsx`                  | `a2498ac1355b8d3aa776be63037615aa28118b62d8e5c8ae473faeab0ec14b73` |
| `apps/web/src/features/domains/domain-screen.integration.test.tsx` | `090a5003a89f9719954f43d7accf74bec76d262e043438b10f2c20eb7690d210` |
| `tests/browser/domain-setup.spec.ts`                               | `04fc61b7a3bcefca205381d6128daf800976cee2f70d633db8dd40f8b55bbbab` |
| `library/knowledge/private/ux-ui/04-screens/domain-setup.md`       | `ce9b8bf34e36580840cbb44e59dc39d14c1caebdb604ac4e2775119595ab5685` |

The root title unit remains `6823f91b6def90a946462a3e429212879d2b7011eea075e6dea417f1b3eeb7f8`; domain CSS remains `595315ed052851d9089416fadb3d109eae540d8324b8cc2b716857067a23a718`.

Pre-repair history is preserved: `domain-setup-before-async-state/source-images.json` remains `40080d283c092b234bfbdfed8768e3d9f6df4d570b5575a3d47f8ed195b69448`, with **72 independently verified matches, zero mismatches**. The pre-repair review remains `8fdee56b81cc990e53698aa8401824fe097af2ea79ab6bd2a5016290d2650595`. It records the original failure, not acceptance of the new source.

## DUV-01 closure evidence

The current value at `apps/web/src/features/domains/domain-screen.tsx:240-278` is the required shared component, imported from `@oalo/ui`. Every instance is `surface="card"` directly on the page, without a nested Card. This closes rubric axis 9 and the component contract violation across all four widths and both themes.

| State                | Current mapping and evidence                                                              | Visual and behavioral result                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading              | `kind="loading"`, lines 240-247; named Domain settings region and preserved progress text | Shared blue glyph/Loading label, busy announcement, disabled refresh and no initial write form                                                           |
| Failed read          | `kind="error"`, lines 248-255; sanitized failure as description                           | Shared critical glyph/Error label, clear affected-region title, enabled safe GET recovery and no initial write form                                      |
| Session read-only    | `kind="permission_restricted"`, lines 260-270                                             | Shared lock/No access label; reason, editable signed-in LO session and account support explain access. Saved host stays visible; changes stay disabled   |
| Platform unavailable | `kind="degraded"`, lines 271-278                                                          | Shared warning/Having trouble label; setup and saved-record impact remain explicit. Check stays disabled; editable deliberate disconnect stays available |

The permission API property `requiredRole` describes the current LO session. The pictured captions contain no customer role selector, administrator requirement or multi-user product assumption. `AsyncState` owns the semantic glyph, state text, busy flag and status/alert announcement (`packages/ui/src/components/async-state.tsx:104-131`). `SupportReference`, attached field errors and concise successful live feedback retain their existing seams (`domain-screen.tsx:256-259,301`). The direct card surface uses `--sf-card` and `--shadow-card` (`primitives.css:344-363`).

The repair adds no authority. Existing check/disconnect eligibility and deliberate confirmation remain at `domain-screen.tsx:418-472`, and the independent interaction suite retains concurrency, revision, cooldown, uncertainty, clipboard, typed-input and focus assertions. No new provider write, customer role, QR manager or root-routing promise follows from the wrapper mapping.

## Scoring matrix

Axes in order: hierarchy, spacing, typography, color/contrast, states, motion, responsiveness, Light/Dark, empty/error/state composition, consistency. Each row's scores apply **individually to all eight named originals** formed by `{1440,1180,768,390}-{light,dark}-` plus its suffix. This records 880 axis scores over 88 inspected images; no representative subset substitutes for the required frames.

| Capture suffix                     | Originals inspected | Axes 1 through 10     | Result                  |
| ---------------------------------- | ------------------- | --------------------- | ----------------------- |
| `empty-synthetic.png`              | 8                   | `3,3,3,3,3,3,3,3,3,3` | On brief                |
| `ownership_needed-synthetic.png`   | 8                   | `3,3,3,3,3,3,3,3,3,3` | On brief                |
| `dns_needed-synthetic.png`         | 8                   | `3,3,3,3,3,3,3,3,3,3` | On brief                |
| `certificate_needed-synthetic.png` | 8                   | `3,3,3,3,3,3,3,3,3,3` | On brief                |
| `ready-synthetic.png`              | 8                   | `3,3,3,3,3,3,3,3,3,3` | On brief                |
| `stale-synthetic.png`              | 8                   | `3,3,3,3,3,3,3,3,3,3` | On brief                |
| `provider-disabled-synthetic.png`  | 8                   | `3,3,3,3,3,3,3,3,3,3` | DUV-01 closed           |
| `read-only-synthetic.png`          | 8                   | `3,3,3,3,3,3,3,3,3,3` | DUV-01 closed           |
| `disconnect-synthetic.png`         | 8                   | `3,3,3,3,3,3,3,3,3,3` | Pictured modal on brief |
| `loading-synthetic.png`            | 8                   | `3,3,3,3,3,3,3,3,3,3` | DUV-01 closed           |
| `error-synthetic.png`              | 8                   | `3,3,3,3,3,3,3,3,3,3` | DUV-01 closed           |

## Axis evidence

1. **Hierarchy:** one page heading, subordinate generic state, and one connection task or saved-host section. Ordered ownership/DNS/HTTPS checks remain secondary to the decisive action. Refresh and disconnect use outline treatment; modal confirmation is the primary action (`domain-screen.tsx:223-278,279-325,327-472`). Loading/error initial-read captures offer only the appropriate safe refresh state.
2. **Spacing:** local grouping uses `--space-2` through `--space-6` (`domains.module.css:1-34,41-94`). Shared states use `--space-3` gap and `--space-5` padding (`primitives.css:344-352`). The new cards sit consistently with saved-host cards at all frames; no duplicated inset card appears.
3. **Typography:** page, section and card headings use the named type steps (`domains.module.css:16-29`); record labels use the secondary step (lines 83-86). Inter and tabular numerals come from `globals.css:20,44-53`. Full TXT strings and readable date lines wrap without ellipsis or private data-font styling.
4. **Color and contrast:** semantic text, surface and border tokens govern local CSS and shared state tones (`primitives.css:214-234,344-363`). Glyph plus text carries each status. The independent 107-case token contrast suite passes. The author's page-state scoped axe checks pass; that is not a claim of exhaustive dialog or all-page accessibility inspection.
5. **States:** blocked loading retains its label and busy semantics; failure shows sanitized recovery text. Read-only and unavailable cards explain disabled behavior; saved-host checks distinguish ownership, DNS, HTTPS, current proof and expiry. Current proof visibly lasts 48 hours, and stale timestamps precede the current date. Wrapper tests and 39 interaction checks pass independently. The production browser exercises actual form/confirmation clicks and Escape/focus return.
6. **Motion:** no feature animation or duration is added. Named shared transitions and reduced-motion rules govern Button and Dialog (`Button.module.css:18-20,210-216`, `overlay.module.css:28-30,204-206`). AsyncState is static; its reduced-motion rule disables animation and transition (`primitives.css:436-444`). This is source/shared-component evidence, not a newly executed domain browser reduced-motion sweep.
7. **Responsiveness:** every whole original was inspected. Long ownership and hosting values wrap; copy actions stack at 390; final bottom actions remain present. Shared targets use `--target-min-size` (`Button.module.css:2-3`), with the labeled checkbox row at that minimum (`domains.module.css:47-62`). No sticky surface obscures fields or focus. The 390 dialog fits both actions inside the actual viewport. The author checks document overflow; this packet does not claim a new exhaustive target-size measurement.
8. **Light/Dark:** all eleven states were checked separately in both themes at all four frames. Card fills, record wells, disabled controls, purple restriction status, error/warning labels and dialog scrims remain legible with shared semantic tokens. No feature-specific theme override appears.
9. **Empty/error/state composition:** all four generic states now use the required wrapper and card surface, closing DUV-01. The normal new-account setup form remains the task, rather than becoming an informational empty-state card. Saved-host data status uses the existing Badge contract; attached field errors and polite success feedback remain appropriate exceptions under the domain specification.
10. **Consistency:** the new cards read as siblings of the current light AutomatedLO Settings/setup composition and PRD-009 Home/campaign setup direction. They consume the established UI wrappers, type and surface tokens. The applicable domain, AsyncState, safe-action and dialog specifications govern this feature. This finding does not approve the still-unseen canonical Settings capture set.

## Independent verification and author evidence

This reviewer executed **174 passing tests across six files** against the frozen source:

- Domain and existing workspace/Settings interaction suites: **39 passed**, two files, 31.86 seconds. The four new composition regressions at `domain-screen.integration.test.tsx:26-81` pass alongside the original domain behavior checks.
- Shared state primitives: **5 passed**. Overlay/feedback and interactive controls: **23 passed**, two files.
- Token contrast: **107 passed**.
- All 88 current and 72 retained image hashes and byte sizes match their manifests. The four source pins, new handoff, unchanged CSS/title-unit and old review pins match.

The author handoff separately records four meaningful RED failures against the old source, then GREEN; 83 copy/client/refusal unit tests; nine design guards; TypeScript, scoped lint/format checks; and **eight actual production-server browser cases passing in 1.3 minutes**. The initial browser invocation exited before build/test because of a variadic project option; the corrected invocation passed without a source change. This reviewer inspected the captured originals and browser source, but did not rerun that browser gate or present its results as independent execution.

`domain-setup.spec.ts:49-64` checks document overflow and axe within the domain region. Disconnect screenshots at lines 127-135 use the actual modal trigger and Escape/focus-return check but do not run axe on the separately mounted modal. Loading/error captures at lines 142-166 use an actual blocked GET followed by its failing response and recovery, not a cosmetic forced state. Page errors and external hosts are asserted empty at lines 167-168. Those limits are preserved explicitly.

## Remaining acceptance boundaries

This closes the bounded shared-state visual defect only. Owned-host DNS/hosting attachment, real HTTPS qualification, actual saved-database browser behavior, production activation, visitor journey and remaining whole-FUN acceptance must be established separately. Synthetic ready captures do not establish those outcomes. No canonical baseline, source file, prior report, provider resource or deployment was changed by this review. Parent may proceed to fresh Security and Quality, and obtain a separate literal Settings-original review when that evidence arrives.
