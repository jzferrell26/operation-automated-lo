# QA Report: PRD-009 Authoring Change Set (documentation only)

**Plan document:** the product owner's decisions OD-A to OD-H and his answers on the design proposal ([`research/2026-10-01-owner-direction.md`](../research/2026-10-01-owner-direction.md), [`research/2026-10-01-owner-direction-od-h.md`](../research/2026-10-01-owner-direction-od-h.md)), plus the Gauntlet's own bar (100% of a PRD set's criteria driven to VERIFIED inside the repository, genuine external blockers parked only with an exact ask). No PRD governs the authoring itself.
**Audit date:** 2026-10-01
**Base branch:** `origin/main` at `e89058e` (PRD-008 merged as #74; confirmed equal to the merge base)
**Head:** `claude/prd-009-marketing-toolkit` at `1b9a113`. 22 commits, 43 files, 6,925 added lines, all documentation and 17 PNG previews. Nothing is pushed by this audit.
**Auditor:** `quality-guardian` (Sonnet, authoring-time review)

## Arming confirmation

Armed before any review work. In this order I read `quality-weapon/SKILL.md`, `upstream-v2/GUIDE.md`, `guides/00-principles.md`, `guides/04-five-axis-evaluation.md`, and `guides/05-severity-classification.md`. The report shape follows the PRD-008 authoring QA report named in the brief. Guides 01 to 03, 06, and 07 and the templates were not opened: the brief supplied the plan, the base, and the report shape. Severity words follow the brief: **Blocking** (the Weapon's Critical: following the plan to the letter gives a wrong product outcome or an unsatisfiable run that the criteria themselves will not catch), **Warning** (should fix before the run), **Info** (optional).

**Ordering.** `security-guardian` ran first and its final re-review at `1b9a113` is **PASS** ([`2026-10-01-authoring-security-review.md`](2026-10-01-authoring-security-review.md), "Re-review 3": twelve Medium findings closed, one Low open, N-8). No `*-qa-report.md` existed before this one. No ordering violation. One stale record follows from it (I-2).

## Scope

Documentation-only change set: `library/requirements/backlog/prd-009-marketing-toolkit/` (index, 009a to 009g, `README.md`, `design/` with 7 mockups and 17 previews, `research/` with 4 inputs, `qa/` with the security review) and one row in `library/requirements/backlog/README.md`.

Method:
- Read every PRD, design, and research file in full; viewed two previews (Home at 1440, step 3 at 390).
- Read the Weapon and the PRD-008 authoring QA report.
- Checked 120 criteria for definition, contiguity, counts, and cross-references with a script (all 120 defined once, per-file ranges contiguous, every cited ID resolves).
- Ran a relative-link and anchor check over all 26 Markdown and HTML files (203 links, 0 broken, 0 broken anchors).
- Scanned all 6,925 added lines for U+2013, U+2014, and hidden Unicode (0 hits; every added character is ASCII).
- Checked more than 100 file:line citations against the worktree (table below), all 81 register rows against their files, and the design's contrast table by recomputing every ratio (all within 0.02).
- Scanned the 7 mockups' text nodes and attributes (about 930) and every quoted PRD sentence against the real 57-term guard list in `apps/web/src/copy/forbidden-vocabulary.ts`.
- Read-only `gh api` calls and one raw GET against `rsms/inter` for the font claims. Nothing in the document set was edited.

## Summary

**Verdict: FIX FIRST.** The set is strong: all eight owner decisions land as criteria and nothing contradicts them; counts, IDs, links, and every one of more than 100 spot-checked citations hold; all 81 register rows match their sources; the scope contract, model routing, and operator boundary are right. But one Blocking gap would ship the old blue, 14 px type, and old Dark surfaces on four of the six menu pages while every 009a criterion passes (B-1: `packages/ui/src/product-tokens.css` is in no criterion). Ten Warnings follow: an unsatisfiable font-integrity criterion, an incomplete supersession register, a removal footprint that stops where the recon stops, file collisions between parallel lanes, Wave 1 criteria that cannot be proved until later waves, three run rules the contract omits (heavy suite, expected red CI, ledger writer), a sample guard that would block the Playwright synthetic server, a rule count that is not stored, an unphotographed hosted first impression, and a design sample entry that contradicts 009c. All are short document edits. Apply B-1 and W-1 to W-10, add one row to `qa/README.md` for this report, then launch.

## Scorecard

| Category | Status | Notes |
|---|---|---|
| Completeness | Partial | Owner decisions 8 of 8 covered. Gaps: `product-tokens.css` (B-1), register misses 15 criteria and 6 knowledge files (W-2), footprint beyond the recon (W-3), hosted empty-library pictures (W-9). |
| Correctness | Partial | More than 100 citations VERIFIED (one with a precision note). Four factual defects: the Inter release digest is null (W-1), the stored result has no rule count (W-8), `OpaqueReferenceSchema` rejects the "derived" asset reference as written (I-6), the design sample entry contradicts 009c (W-10). |
| Alignment | Partial | House style, schema v2 naming, header blocks, relative links, and the dash rule all hold. Lane ownership collides in Waves 2 and 3 (W-4, W-5). |
| Gaps | Partial | No heavy-suite rule, no expected-red-CI rule, ledger-writer contradiction (W-6); sample guard vs Playwright (W-7). |
| Detrimental | Pass | No secret, hidden Unicode, dash, broken link, or banned user-facing word. Stale prose in `design/` and `qa/README.md` (I-2). |

## Blocking (must fix)

- [ ] **B-1. The light look never reaches Brand, Realtor partners, Settings, or Homeowner reports, because `packages/ui/src/product-tokens.css` is in no criterion.**

  Location: `prd-009a-...md:30-36` (Scope), `:69` (009A-AC-001), `:72` (009A-AC-004), `:14` and `:112` (Goal, "the action blue is `#005fcc` everywhere"). Code: `packages/ui/src/product-tokens.css:2-12` and `:40-51`; loaded by `apps/web/src/features/workspace/workspace-screen.tsx:7,385` (every catch-all page: Partners, Settings, routing, billing, and in review mode the Brand page at `apps/web/src/app/(authenticated)/brand/page.tsx:17-18`), `apps/web/src/features/homeowners/workspace.tsx:28,831`, the shared report pages, and the dashboard preview shell. `apps/web/src/theme/type-tokens-defined.unit.test.ts:20` already names the three features ("their tokens come from that file").

  Owner decision OD-E ("one action blue", bordered cards, 16 px body, the light bar) cannot hold there. The file re-declares, on the element carrying `data-product-shell="true"`, which beats anything inherited from `html`:

  ```text
  product-tokens.css:6   --text-body-size: 0.875rem;      (new target 1rem)
  product-tokens.css:10  --ac-primary: #2856d9;           (new target #005fcc; hover :11, active :12)
  product-tokens.css:41  --sf-canvas: #101827;            (Dark block :40-51 also sets --sf-card, --tx-*, --bd-input #445771, --ac-primary #3e67dd)
  ```

  Followed to the letter, 009A-AC-001 (parity of two files), 009A-AC-004 ("the computed `--ac-primary` on a signed-in page", page unspecified, so Home passes), and 009A-AC-003 (contrast of `tokens.css` pairs) all pass while four of the six menu pages draw `#2856d9` buttons, 14 px body text, 17 px section titles, and the old Dark values. 009G-AC-006 ("every installed picture scores 3 on every axis") then fails at the end of Wave 4, after the single redraw 009G-AC-004 allows, and the run must redraw twice. This is the same shape as the defect the PRD exists to prevent: the first impression of the pages a new account must visit (Brand is checklist item 3) is wrong and no earlier check sees it.

  Suggested fix, folded into existing criteria so the count stays 120:
  1. `prd-009a:32` Scope: add "`packages/ui/src/product-tokens.css`".
  2. Add a design decision D5 to 009a: "`product-tokens.css` stops re-declaring global tokens. Its `[data-product-shell]` block keeps only the `--product-*` and print names; it no longer sets `--ac-primary*`, `--text-*-size`, or `--weight-semibold`. Its Dark block no longer sets `--sf-*`, `--tx-*`, `--bd-*`, or `--ac-primary*`. Brand, Realtor partners, Settings and its sub-pages, Homeowner reports, the shared report, and the dashboard preview then read `tokens.css`. The dashboard preview's own navy rail (`--product-nav*`) stays: it is the local-only demo that the Non-Goals leave alone, and 009A-AC-009 names only the review and synthetic shells."
  3. 009A-AC-001: append "`product-tokens.css` declares none of the tokens in section 2.4 or 2.6; the same unit test fails if it does."
  4. 009A-AC-002: append "`type-tokens-defined.unit.test.ts` no longer excludes `homeowners` and `workspace` (`:20`)."
  5. 009A-AC-004: replace "on a signed-in page" with "on Home, `/brand`, `/partners`, `/settings`, and `/homeowners`, and the computed body font size on each is 16 px".

## Warnings (should fix)

- [ ] **W-1. 009A-AC-006 cannot pass as written: GitHub reports no digest for the Inter release, and the release asset is a zip, not the font.**

  Location: `prd-009a-...md:25` (Background 3), `:74` (009A-AC-006); `prd-009-...-index.md:166` ("Download the Inter release archive").

  The criterion records "the digest GitHub's release API reports for the exact release asset" and compares it "with the vendored file's own SHA-256". Read with `gh api repos/rsms/inter/releases/latest` on 2026-10-01: tag `v4.1`, one asset `Inter-4.1.zip` (33,707,794 bytes), `"digest": null`. A zip digest could not equal the WOFF2's SHA-256 in any case. The upstream git tree does hold the file: `docs/font-files/InterVariable.woff2` (352,240 bytes, blob `5a8d3e72ad7ffb62af3b146e1b1f54ab5813a212`) at the tag commit `e3a3d4c57d5ecc01453a575621882a384c1995a3`, and `LICENSE.txt` there reads "Copyright (c) 2016 The Inter Project Authors" and "SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007" with no Reserved Font Name, so the licence assertion in the same criterion holds.

  Suggested: replace the second sentence of the README clause with: "The README also records, as sources that are not the lane's own hash: the commit the release tag points to, and the git blob SHA-1 of `docs/font-files/InterVariable.woff2` and of `LICENSE.txt` in the upstream tree at that commit (`gh api 'repos/rsms/inter/contents/docs/font-files?ref=<tag>'`). The unit test recomputes the git blob SHA-1 of each vendored file (`sha1('blob <bytes>\0' + content)`) and compares it with that record. If the release API reports a digest for the archive it is recorded too; if it reports null, the README says so." Index `:166` can then allow downloading the two files from the tag instead of the 33 MB archive.

- [ ] **W-2. The supersession register is accurate but incomplete: 15 criteria and 6 knowledge files that PRD-009 makes untrue have no row.**

  Location: `prd-009f-...md:79-166` (register), `:190` (009F-AC-011), `:191` (009F-AC-012), `:173` (the "Kept" list).

  Every one of the 81 rows I opened matches its cited line (table below; the three whole-file rows were checked for existence and content), and D3's rule keeps the original text and every status cell. The gap is what the register never names. Each row below is VERIFIED or DONE in the ledger today and describes something PRD-009 removes:

  | Criterion | Source line | Ledger | What it says that stops being true |
  |---|---|---|---|
  | `FSG-003` | `prd-006-...-index.md:78` | `CRR-091`, `EXECUTION_LEDGER.md:590` | A first-time loan officer "completes the guided setup" and gets "a persisted first Open House Boost draft" in under 300 s |
  | `FSG-005` | `prd-006-...-index.md:80` | `CRR-093`, `:592` | Guided setup auto-opens, "Finish setup" reminder, resume, "Show me around again" |
  | `FSG-006` | `prd-006-...-index.md:81` | `CRR-094`, `:593` | Baselines for every 006d D3 screen (rail, walkthrough steps, reports) |
  | `006B-AC-004` | `prd-006b-...md:251` | `CRR-134`, `:633` | The banner headline, disclosure, and label constants (the banner is deleted by 009A-AC-013 and 009F-AC-008) |
  | `006B-AC-005` | `prd-006b-...md:252` | `CRR-135`, `:634` | D4 vocabulary on the overview, onboarding, reports pages |
  | `006D-AC-004` | `prd-006d-...md:136` | `CRR-173`, `:672` | Font decision "self-hosted Geist or the system stack" (Inter is a third outcome; S-81 covers only the README) |
  | `008B-AC-010` | `prd-008b-...md:74` | `FLR-072`, `:832` | Half of it: "the guided walkthrough" never tells a person to approve a decided version |
  | `008B-AC-011` | `prd-008b-...md:75` | `FLR-073`, `:833` | Every guided-walkthrough statement about the campaign |
  | `008D-AC-007` | `prd-008d-...md:54` | `FLR-052`, `:812` | S-1, S-2, S-3 captured as the open house create states |
  | `008D-AC-008` | `prd-008d-...md:55` | `FLR-053`, `:813` | Guided setup steps 1 and 2 photographed |
  | `008D-AC-010` | `prd-008d-...md:57` | `FLR-055`, `:815` | Sign-off re-signed with the guided steps and the create screen |
  | `RGL-003` | `prd-004-...-index.md:58` | `GGL-B03`, `:271` | "an operator creates an Open House Boost, reloads, and approves it" |
  | `004A-AC-004` | `prd-004a-...md:36` | `GGL-008`, `:259` | "Create Open House Boost, navigate away, reload" |
  | `ARR-002` and `005E-AC-006` | `prd-005-...-index.md:74`, `prd-005e-...md:64` | `CRR-002`, `:413`; `CRR-078`, `:489` | "creates an Open House Boost through the exported `POST /api/campaigns/preflight`" (the route now saves a library-ad version) |

  The "Kept" list says `006D-AC-011` (`CRR-180`) is unchanged, but its text names "the create page, and the guided-setup steps" (`prd-006d-...md:143`). Knowledge files with no row: `user-language-contract.md:13` (Related link "Open House Boost FAQ") and `:19` (section 1 reads the reader as someone who "runs open houses with Realtor partners" and "opened the product to get one open house campaign made and approved", which is the lens the writing review of MTK-008 judges strings against); `ux-ui/04-screens/dashboard-preview.md:7,9,11` (navy and cobalt family, pipeline visualization, the deep navigation surface from `product-tokens.css`, and a seven-step `/onboarding` journey); `ux-ui/03-components/icon-and-icon-button.md:24` ("deep navy surface"); `ux-ui/03-components/stepper.md:16` ("six-stage Open House Boost stepper"); `ux-ui/02-surfaces-and-borders.css:20` (maps `.ui-nav` to `.desktopSidebar`). The second pass in 009F-AC-011 ("checks each row against its file") cannot find a row that is not there.

  Suggested: add rows S-82 onward for the table above (fate "Superseded", "Re-scoped", or "Amended" as in S-31 and S-32; `FSG-003` re-scoped to 009G-AC-008, `FSG-005` superseded, `FSG-006` re-scoped to 009G-AC-001 to 003, `RGL-003`, `004A-AC-004`, `ARR-002`, `005E-AC-006` re-scoped to the library-ad save), add the six knowledge files as rows (the five `ux-ui/` ones fall under 009A-AC-015, whose range then reads S-45 to S-71 and the new `ux-ui/` rows), extend the table in 009F-AC-012 with `CRR-002`, `078`, `091`, `093`, `094`, `134`, `135`, `173`, `GGL-008`, `GGL-B03`, `FLR-052`, `053`, `055`, `072`, `073` (status cells unchanged, MTK-006), and correct the `006D-AC-011` entry in the "Kept" list. Add to 009F-AC-011 a sweep so the next gap is found by a command: "`git grep -n -i -E 'guided setup|walkthrough|Finish setup|Show me around|Open House Boost|/reports|/leads|/automations|/marketplace|Expand Marketing|Geist|deep navy' -- library/requirements library/knowledge docs EXECUTION_LEDGER.md` returns only lines that are in the register, in the Kept list, or in a document the register names as history."

- [ ] **W-3. The removal footprint stops where the recon stops. 009F-AC-005 and AC-007 delegate to it, and it omits about half of the removed addresses.**

  Location: `prd-009f-...md:19` (Background 3), `:184` (009F-AC-005), `:186` (009F-AC-007), `prd-009b-...md:83-89` (Files expected); `research/2026-10-01-oalo-toolkit-recon.md:7-86` (section 1 covers `/leads`, `/leads/pipeline`, `/automations`, `/marketplace`, `/reports` only).

  009f D1 also redirects `/marketing`, five Marketing Suite sub-pages, `/onboarding`, `/settings/profile`, and `/settings/team`, and the code behind them is real:
  - **`/onboarding`** has its own route file (`apps/web/src/app/(authenticated)/onboarding/page.tsx`) and a feature tree: `features/onboarding/components/onboarding-screen.tsx`, `onboarding-guidance.tsx`, `onboarding.module.css`, `model/readiness.ts`, two integration tests (`onboarding-review-surface.integration.test.tsx`, `onboarding-screen.integration.test.tsx`), and a use in `guided-setup/anchor-registry.integration.test.tsx:6,129`. `permission-screen.tsx` is used by `settings/connections/page.tsx:1` and must stay. Eight `chromium/onboarding--default--*` baselines sit under it.
  - **The Marketing Suite hub and five sub-pages** (`marketing`, `property-sites`, `creative`, `ads`, `messaging`, `blueprints`): views at `workspace-screen.tsx:404,447-505`, read gates at `server/workspace-page-data.ts:41-47`, keys at `features/workspace/model.ts:5-10`. Also `/settings/profile` and `/settings/team` (`:566`). The `profile` view is the one `/brand` renders (`brand/page.tsx:17-18`), so only the `/settings/profile` key goes, not the view.
  - **Dashboard preview:** `new/page.tsx:23` renders the open house builder there and the builder posts to `/api/preview/campaigns/check` (`open-house-draft-builder.tsx:187`); `product-walkthrough.tsx:12` imports `guided-setup/model/panel-placement.js` and `product-guides.ts:2` imports the anchor registry, both of which 009B-AC-011 says must not exist; `setup-wizard.tsx` serves the preview's `/onboarding`; `tests/browser/product-onboarding.spec.ts` drives it. Nothing says whether the demo walkthrough is retired or what the preview's create page becomes.
  - **Guided-setup surroundings:** `copy/guided-setup-messages.ts`, the progress half of `server/setup-preferences.ts` (`:16-27,337-341,391-412`), and the walkthrough dismissals in `tests/browser/design-quality.spec.ts`, `tests/browser/helpers/design-quality.ts`, and `tests/browser/review/{design-quality,homeowner-language-sweep,review-campaign-decision,review-change-password-saved,workspace-pages}.spec.ts` and `helpers/review-session.ts` (all import `guided-setup`).
  - **Baselines:** of the 376 committed pictures (120 `chromium`, 256 `review`), 144 belong to removed screens: 8 reports, 8 onboarding, 32 `campaign-create--*` in `chromium`; 80 `guided-setup--*`, 8 `shell--finish-setup-chip`, 6 `shell--collapsed-rail`, 2 `shell--mobile-drawer` in `review`. R-9 (`index:148`, "about 256 rail pictures change") counts them as changed; 009G-AC-003 deletes only "removed screens" without naming the 96 review ones.

  Suggested: add a "Footprint addendum" to 009f under D1 that lists the bullets above as files and keys, and change AC-005 to "as recon section 1 and the addendum list". Add the guided-setup surroundings to 009b's Files expected. State the dashboard preview's fate in one sentence: "The preview's walkthrough, setup wizard, and `/onboarding` view are retired with the product's (D-15); its `/marketing/campaigns/new` renders the same flow over the sample catalog; `/api/preview/campaigns/check` is removed." Change R-9 to "about 232 pictures change and 144 are deleted".

- [ ] **W-4. Parallel lanes edit the same files in Waves 2 and 3.**

  Location: `prd-009-...-index.md:109-110`; `prd-009c-...md:152`; `prd-009e-...md:72`; `prd-009d-...md:160`.

  (a) **Wave 3.** 009c part 2 lists "the Campaigns tabs in `apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx`" (`009c:152`) and 009e lists the same file (`009e:72`); both run in Wave 3 (`index:110`), and 009C-AC-010 and 009E-AC-009 both define the tabs. Fix: 009e owns `page.tsx` and the tab strip (009E-AC-009); 009c part 2 owns `library/page.tsx` and the grid, chips, and cards; 009C-AC-010 keeps the library-specific clauses (chips with counts, four-three-two-one grid, no search, no sort).
  (b) **Wave 2.** 009d owns `apps/web/src/features/campaigns/**` (`index:109`), but removing guided setup (009b, same wave) must edit three files inside it: `campaign-approval-controls.tsx:12-13,80,158,168` (anchors and `useGuidedSetup`), `campaign-hand-off.tsx:6-7,37,45-54` (its label, copied notice, and body come from `copy/guided-setup-messages.ts`, `GUIDED_SETUP_STEPS.approveOrHandOff`), and `persisted-campaign-screen.tsx:18,125,142`. The hand-off card is kept by 009d D8 and 009D-AC-015, so deleting that copy file breaks it. Fix: 009d (Wave 2) moves those three strings into `launch-messages.ts` and strips the anchors and hook from the three files; 009b deletes the rest and `guided-setup-messages.ts` only after 009d's change lands; add `app/(authenticated)/layout.tsx` and `server/setup-preferences.ts` to 009b's Files expected (009a edits `layout.tsx` in Wave 1, so the order is safe).
  (c) **Step 1.** 009D-AC-002 (Wave 2) builds "009c's cards and chips inside the step indicator", yet `index:110` puts the chips and grid (009C-AC-010, 011) in Wave 3 and says part 2 reuses only "009d's card and band". Fix: assign "topic chips with counts and the card grid" to 009d in Wave 2 in `index:109`, and say part 2 reuses them.

- [ ] **W-5. Criteria placed in Wave 1 cannot be proved until a later wave, so the Wave 1 verify pass cannot close them.**

  Location: `prd-009-...-index.md:105` (009c part 1 = 009C-AC-001 to 009, 014 to 016), `:183` (V1); `prd-009c-...md:134,137,138`; `prd-009f-...md:184`.
  - **009C-AC-005** needs the labelled sample on step 2 and 3 previews, the campaign page, and the list (009d, Wave 2; 009e, Wave 3) and the library card (Wave 3).
  - **009C-AC-009** ("Use the new version", asks first, saves a new campaign version) needs 009d's save and UI (Wave 2).
  - **009C-AC-008** has a UI half (retired ads never appear in the library or step 1) and a launch half (009D-AC-016), both later; its approval-command half is fine in Wave 1.
  - **009F-AC-005**'s scan ("no `href` to a removed address in `apps/web/src`") fails on `features/overview/components/overview-screen.tsx:139-144`, which links `/leads` and `/leads/pipeline` and is rewritten by 009b in Wave 2.

  Suggested: in `index:105` move 009C-AC-005, 009, and the UI half of 008 to part 2 (Wave 3); in `index:105` and `009f` say 009F-AC-005's href scan and 009F-AC-007's "no remaining test asserts a removed page" are verified after Wave 2, and that the ledger rows for those criteria stay OPEN until then; keep the removal itself in Wave 1.

- [ ] **W-6. Three run rules the contract needs are missing: the heavy-suite rule, expected-red CI, and who writes the ledger.**

  Location: `prd-009-...-index.md:108` and `:155-221` (scope contract and wave plan).

  (1) **Heavy suites.** The house rule is in the ledger: "Only one lane at a time may run `pnpm test:db`, because the local Supabase stack binds fixed ports" (`EXECUTION_LEDGER.md:561`). PRD-009 has no equivalent, and Wave 1 has two lanes with Postgres criteria (009c part 1: 009C-AC-007, 008; 009f code: 009F-AC-006) and a third, 009a, with review-project browser criteria; Wave 2 has two (009b: 009B-AC-004, 010, 011, 012; 009d: most of its table). (2) **Expected red.** `ci.yml` runs `pnpm test:browser` and the `review` project inside `pnpm test:db` with `CI` set, so screenshot comparison is live from the first push (`tests/visual/screens/README.md`, "Where they run"). With the look changing in Wave 1, `Application verification` and `Real PostgreSQL migrations and pgTAP` are red until the Wave 4 redraw. `index:108` says only "No baseline is redrawn before Wave 4", while `index:183` says the Wave 1 verify "reads CI". PRD-008 closed this with "the orchestrator records those failures as attributed to the lane" (`prd-008-...-index.md:98-99`). (3) **Ledger writer.** `index:108` says "Wave lanes never edit `EXECUTION_LEDGER.md`", but 009F-AC-012 and `index:216` have the Wave 3 records lane write the `MKR-` rows and the marker sentences (haiku for the markers). PRD-008's own QA made the same catch (its W-2).

  Suggested: add after `index:108`: "**Heavy suites.** Only one lane at a time runs `pnpm test:db` or the review browser run, because the local Supabase stack binds fixed ports (`EXECUTION_LEDGER.md:561`). The orchestrator names the gate owner per wave (Wave 1: 009c part 1; Wave 2: 009d; Wave 3: 009e; Wave 4: 009g); other lanes run unit, component, and integration suites and hand Postgres and review-project criteria to the gate owner. **Expected red.** From the first Wave 1 push until the Wave 4 redraw, screenshot comparisons fail in `Application verification` and `Real PostgreSQL migrations and pgTAP`; the orchestrator records each failing picture against the lane that changed it, and a wave verification reads every other check. **Ledger.** Wave 1 and Wave 2 lanes never edit `EXECUTION_LEDGER.md`; the 009f records lane (Wave 3) and the orchestrator are its only writers." Change "Wave lanes" to "Wave 1 and Wave 2 lanes" in `index:108`.

- [ ] **W-7. The sample guard, as specified, would starve the Playwright synthetic server, and the allowlist would fail the fix.**

  Location: `prd-009c-...md:133` (009C-AC-004 allowlist: "the loader, `review-browser-run.mjs`, the test helpers, the README, `docs/production-environments.md`"), `:147-154` (Files expected), `:84-88` (D3); `prd-009b-...md:78` (009B-AC-014); `prd-009g-...md:58` (009G-AC-003). Code: `playwright.config.ts:101-107` (the synthetic `webServer` env is `{ OALO_LOCAL_CAMPAIGN_STORE }`, with `OALO_ENVIRONMENT` unset), `playwright.dashboard-preview.config.ts:41` (`OALO_ENVIRONMENT: "preview"`), `tooling/tests/database/review-browser-run.test.ts:24-45` (pins the review run's environment).

  D3 requires the raw `OALO_ENVIRONMENT` to be exactly `local` ("unset is not local") and the flag exactly `enabled`. The synthetic Playwright project, which 009B-AC-014 and 009G-AC-003 need to show sample ads and which draws `campaigns--populated`, `overview`, and the rest, sets neither. Adding them to `playwright.config.ts` fails the source-scan allowlist in the same criterion. Fix: add `playwright.config.ts` (synthetic `webServer` env only, setting `OALO_ENVIRONMENT: "local"` and `OALO_ADS_LIBRARY_SAMPLES: "enabled"`) to the allowlist and to 009c's Files expected; add `tooling/tests/database/review-browser-run.test.ts` (an assertion for the flag) beside it; state that the dashboard preview config sets neither, so its library is empty.

- [ ] **W-8. 009D-AC-014 asks for a "real count of rules run and passed from the stored result (never a constant)", and the stored result has no such field.**

  Location: `prd-009d-...md:172` (009D-AC-014); the design draws "12 of 12" (`design/mockups/launch-step-3-review-and-launch.html`). Code: `packages/contracts/src/campaign-foundation.ts:393-404` (`PreflightResultSchema`: `findings`, `blocking`, `resultHash`, `rulesetVersionRef`, no count), `supabase/migrations/20260915180000_campaign_activation.sql:99-110` (`campaign.preflight_results` columns: `findings`, `blocking`, `ruleset_version_ref`, no count). A column would be a migration, which the PRD forbids.

  An agent has two bad options: invent a count or add a column. Suggested: replace "from the stored result (never a constant)" with: "rules run is the number of rule codes in the ruleset registry for the stored `rulesetVersionRef`; rules passed is that number minus the distinct `ruleCode` values in the stored findings. No schema or column changes. A unit test pins the registry length to the number of rules the evaluator runs, so the number cannot be typed by hand."

- [ ] **W-9. The hosted first impression is still not photographed, and the empty-library sentence leaves the person with nothing to do.**

  Location: `prd-009g-...md:27` (Background 6), `:56` (009G-AC-001); `prd-009c-...md:141` (009C-AC-012); `user-language-contract.md:29` (section 2, rule 7) and `:114` (section 5, rule 3).

  The empty-account captures run in the review test run, which sets the samples flag, so Home shows five topic buttons and the library and step 1 show eight ads. The real catalog ships empty (R-1), so the hosted first visit shows none of that: Home's start card is the sentence in place of the buttons, the library tab and step 1 show the sentence and no chips. 009G Background 6 hands that to an integration test. That is the exact gap the PRD exists to close: the page a real sign-up lands on is not in a baseline. Also, `tooling/tests/database/review-browser-run.test.ts:36-40` pins no email at all, so the unverified-email notice that `layout.tsx:197` renders above Home for a real sign-up with email configured is not in the pictures either. Finally, 009C-AC-012's sentence, "No ads in the library yet. New ads are added after they're reviewed.", ends without a next step, which the contract asks of a locked action.

  Suggested: add to 009G-AC-001: "and Home, the Ads library tab, and step 1 against the real (empty) catalog, from a second server start in the same review run with `OALO_ADS_LIBRARY_SAMPLES` unset, at the four frames in both themes with axe at zero; and Home with the unverified-email notice above it at 1440 and 390 in Light." Change 009C-AC-012's sentence to "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then."

- [ ] **W-10. The design's sample catalog entry contradicts 009c D1, and 009c cites the design as its source.**

  Location: `design/00-direction.md:394-395` (`"tall": { "art": ..., "width": 1080, "height": 1350 }`, `"square": ... "height": 1080`), `:410` (`"approvedBy": "Jonathan Ferrell"`); `prd-009c-...md:52` ("as `design/00-direction.md` section 5.3 lists, with these exact rules"), `:62-64` and `:71`.

  The design's table at `:370-371` is right and agrees with 009c (art files 1080 by 1080 and 1080 by 842, composed to 1080 by 1350 and 1080 by 1080). The JSON sample next to it gives the composed sizes as `width` and `height`, which 009C-AC-001's strict schema refuses; it also has no `sample` or `sha256` field, and `approvedBy` is a real name where D1 requires the handle `jzferrell26`. An agent copying it into the catalog README template (009C-AC-014) writes an entry that fails the schema test. Fix: replace the sample with one in D1's shape (art path, `sha256` for both images, `sample: false`, `approvedBy: "jzferrell26"`) or add a line "Illustrative. 009c D1 governs the format." above it.

## Suggestions (Info)

- [ ] **I-1. Security Low N-8: the exact edit.** `prd-009d-...md:105` and `:168`. "#1200 monthly" passes because a bare "#" is a license keyword and "monthly" is not in the adjacency list. Dropping the bare "#" is the root fix: the amount then has no keyword, so the digit rule refuses it, and "Acme #5000 Grant Lending" is refused too (the review's own example that no adjacency word can catch). The adjacency additions close the same path through the "NMLS" keyword. In D5 "What is checked":
  - Replace `"NMLS", "NMLS #", "NMLS ID", "license", "license #", "lic", "lic.", or "#"` with `"NMLS", "NMLS ID", "license", "lic", or "lic." (each optionally followed by "#" or ":"); a bare "#" is not a keyword`.
  - Replace `year, yr, years, month, mo, payment, payments, percent, pct, down, fixed, arm, apr, rate` with `year, years, yr, yrs, month, months, mo, mos, monthly, payment, payments, pmt, percent, pct, down, fixed, arm, apr, rate, rates, points`. The review also suggested `term` and `terms`; leave them out, because "NMLS 1234567. Terms apply." is ordinary disclosure text that "terms" would refuse.
  - In 009D-AC-010 add refusals: company "Acme #1200 monthly Lending", company "Acme #5000 Grant Lending", company "NMLS 1200 monthly Lending"; add passes: disclosure line "NMLS #1234567", "Lic #12-3456", and "NMLS ID: 1234567". Keep every existing case: "Acme #30yr Lending" is still refused (two digits, no keyword), "Lic. 12-3456" and "NMLS 0000000" still pass.
  - Add one line to the index Amendments: "N-8 closed (bare "#" removed as a keyword; monthly, months, mos, yrs, pmt, rates, points added)."

- [ ] **I-2. Stale citations and prose.** (a) `design/01-open-decisions.md:5` cites `prd-009-marketing-toolkit-index.md:87-89` for AD-1 to AD-3; those lines are now the 009d, 009e, and 009f table rows, and the AD decisions are recorded as moot at `index:74`. (b) `:24` cites `index.md:73-79` for the owner's answers; they are at `index:70` (answers), `:72` (the designer's recommendations), and `:74` (moot decisions); lines 73 to 79 are a blank line, the moot paragraph, a rule, and the "Sub-features" heading. (c) `:31` cites "index line 79" for "follow the designer's recommendation"; it is `index:72`. (d) `design/00-direction.md:9` still says 009c and 009d "predate OD-H; `library-guardian` revises them", which is now untrue. (e) `README.md:5` says "six mockups"; the folder and `design/00-direction.md:12` say seven. (f) `qa/README.md:14` records the security review as "FIX FIRST, nine Medium" and does not mention the three re-reviews; the report ends PASS with twelve Medium findings closed (`qa/2026-10-01-authoring-security-review.md:365`). A Gauntlet agent reading only the README would think the set is unreviewed. Add one row for this report there. (g) `prd-009a-...md:112` cites "design section 10" for the unverified HighLevel frame; it is section 11 (and 2.1).

- [ ] **I-3. 009A-AC-009 and AC-014 do not name the role they assert for.** `prd-009a-...md:77,82`. `projectNavigationForSession` marks an item the role lacks a capability for as `permission_restricted` rather than removing it (`features/shell/model/navigation.ts:67-95`); only `location_admin` holds `settings:read` and `platform_support` lacks `reports:read` (`server/runtime-authentication.ts:464-492`). "Exactly the six links" is true for a workspace owner. Say so, and add "a role without access shows the same six labels, the restricted one as non-interactive text with its reason".

- [ ] **I-4. 009B-AC-004 seeds three of the six installation statuses.** `prd-009b-...md:68`. The migration allows `pending`, `active`, `missing_scope`, `reconnect_required`, `revoked`, `uninstalled` (`20260721010000_platform_foundation.sql:170-171`). D2 names two statuses for "Needs attention" and says "Otherwise Not connected yet". Seed all six and state the result of `revoked` and `uninstalled`.

- [ ] **I-5. 009D-AC-004's "floor" has no number.** `prd-009d-...md:57,162`. Say "to 14 px" (the card-secondary step) so the truncation test is measurable.

- [ ] **I-6. The "derived" references in 009c D5 must satisfy the schema.** `prd-009c-...md:105-116`. `OpaqueReferenceSchema` is `^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$`, 8 to 128 characters (`packages/contracts/src/campaign-foundation.ts:3-7`); `first-home-start-here/v3/tall` and the `creativeVersionRef` family cannot be written that way. Name the encoding (for example `libimg_` plus the first 40 hex characters of SHA-256 over `id:version:shape:digest`). The new Brand preference key must also match `^[a-z][a-z0-9_.]{1,63}$` (`20260919160000_user_preferences.sql:43`), so not `workspace.adBrand.v1`.

- [ ] **I-7. 009G-AC-008 overwrites a history record.** `prd-009g-...md:63`. The timed spec writes `docs/operations/evidence-packs/guided-setup-timing.md` under the regenerate flag, and `CRR-162` (`EXECUTION_LEDGER.md:661`) cites that file for the walkthrough's 77.8 s measurement. D3 says nothing is deleted. Keep the old table under a dated "PRD-006c, retired" heading.

- [ ] **I-8. "synthetic" is a banned word in the sample identity.** `prd-009c-...md:79,132` ("NMLS 0000000, synthetic"). It is allowed inside art pixels only. Say the word never appears in alt text, names, or default words, which the review-surface sweep reads.

- [ ] **I-9. Mockup strings would fail the PRD's own copy rules if copied.** `design/mockups/home-first-run.html` (lead and checklist item: "name, NMLS number and logo", corrected by 009d D3 but not in the mockup); `launch-step-3-review-and-launch.html` ("Approved by Jordan Rivera on Oct 1, 2026." with no role, against 009E-AC-004; "Housing ads have their own rules. We apply them for you, every time.", a promise about Meta's unverified rules); `campaigns-list.html` (a "Draft" row with "Dates not set yet", but 009d D1 saves nothing before "Save and check", so no draft exists). Add a one-line header to each mockup, "Strings and states are illustrative; the sub-PRD governs", or fix them. The previews render in Segoe UI; Inter is the target.

- [ ] **I-10. Owner decision "no link import or photo uploads" has no failing test outside the happy path.** `prd-009d-...md:175` (009D-AC-017) asserts the `api/campaigns` directory set. Add to it: "a source scan finds no route under `apps/web/src/app/api` that reads `multipart/form-data` or fetches a URL taken from a request body, and no `type="file"` input in `apps/web/src/features/campaigns`".

- [ ] **I-11. 009D-AC-008 should pin whole-word matching.** `prd-009d-...md:166`. "the words zip, radius, mile, miles, within, age, male, female, men, or women" invites substring matching that would refuse "Page, AZ" and "Savage, MN". Add passes "Page, AZ", "Mendota Heights, MN", "St. Louis, MO" to the table.

- [ ] **I-12. Smaller consistency items.** (a) `prd-009e-...md:71-74` omits the files that record the approver's name (`packages/application/src/campaign-approval-command.ts`, `apps/web/src/server/campaign-approval-handler.ts`) and the two documents 009E-AC-004 edits (`docs/operations/retention-and-deletion.md`, `export.md`, both exist). (b) `prd-009f-...md:94` (S-14) says `PRD-001g:69-70` "still hold in behaviour"; `:70` says choosing System "clears the manual override" and 009A D4 now stores `system`. Mark `:70` Amended. (c) `prd-009-...-index.md:96` lists the PRD-008 follow-ups it closes; Quality L-17 (the onboarding page's raw ISO timestamp) also closes when `/onboarding` is retired. (d) `prd-009-...-index.md:166-167`: "setting `OALO_ADS_LIBRARY_SAMPLES` anywhere but a local run" would read as forbidding the CI jobs that start the review server with it; add "a disposable CI run that `review-browser-run.mjs` starts is a local run for this purpose". (e) `NEXT_BATCH_LEDGER.md` (Branch and Current park rows) goes stale at PRD-009 start, as PRD-008 QA S-13 found; add it to 009F-AC-013. (f) The Meta check (009D-AC-012) runs beside 009d in Wave 2; run it at Phase 0 or first in Wave 2 so a stricter finding is applied before the code is written. (g) MTK-003's `pnpm audit` window: a newly published High advisory on the final head is in scope (PRD-008 QA S-18); MTK-010 allows version bumps of existing packages. (h) Design 2.2 says a Latin-subset `inter-latin.woff2`; 009A vendors the unmodified 352,240-byte variable file (`docs/font-files/InterVariable.woff2` upstream), correctly per its Non-Goals; say the size.

- [ ] **I-13. Wording that is not measurable.** `MTK-011` ("the scored review led by Light": say "009G-AC-006 records Light first and every picture scores 3 in Light and in Dark"); `009F-AC-004` ("keeps its own honest not-set-up state": name the sentence or the existing test); `009F-AC-011` ("describe the real first run ... as a current feature": use the W-2 sweep); `009A-AC-015` ("stays readable": a script can check that each row's file contains "by PRD-009" within 3 lines of the cited line).

## Owner fidelity

Every decision lands as at least one criterion. "Contradicts" means a criterion that, followed, produces the opposite.

| Decision | Where it lands | Result |
|---|---|---|
| OD-A not a CRM; HighLevel stays system of record | 009A-AC-014 (six labels), 009F-AC-001 to 005 (gone page, redirects, removals), 009B-AC-001 (footer sentence, no CRM region), 009E-AC-008 (no contact, lead, pipeline on campaign pages) | Covered. "No CRM pages remain": the three CRM addresses answer 404, `/reports` and `/marketplace` redirect, and the Reports, Leads, Automations code is deleted (footprint gap W-3 for the surrounding files). |
| OD-B click click launch | 009D-AC-022 counts 6 activations and 1 typed field, then 5 and 0, no checkbox or file input; 009G-AC-008 under 300 s | Covered and measurable. |
| OD-C sections that stay | 009A D2, 009F-AC-003, 009F-AC-004 (Settings: Account, Connections, where leads go) | Covered. |
| OD-D sections that go; results per campaign | 009F-AC-001, 002, 005, 007; 009E-AC-002 (three figures, "Not live yet", no digit) | Covered. |
| OD-E lighter look, one blue, Light default, toggle stays | 009A-AC-001 to 013 | **Contradicted on four pages by B-1.** |
| OD-F calm one-question start | 009B-AC-002, 003 | Covered. |
| OD-G Listing Studio as model | 009A (tokens), 009D-AC-013 to 015 (real output, confirm) | Covered. |
| OD-H curated library, platform-wide, repo-curated, copy-only, supplied by owner, no admin screen | 009C D1 to D7, 009C-AC-001 to 003, 014; 009D-AC-005, 006 (only headline and primary text edit); 009F-AC-014(b) | Covered. Copy-only holds on the ad; Brand text (title, disclosure, lead form wording) is a separate Brand edit and is checked (009D-AC-024). |
| Two buttons, each with its own confirmation (D-9) | 009D-AC-015 (Approve then "Yes, approve"), 009D-AC-016 (separate, disabled Launch) | Covered. The Launch confirmation is deferred with the launch itself (index Non-Goals). |
| Homeowner reports always in the menu (D-4) | 009A-AC-010 (flag set and unset) | Covered; role projection still marks it restricted for `platform_support` (I-3). |
| Light look and top menu "as shown" (D-2) | 009A-AC-009, 011, 012 | Covered; see B-1. |
| Realtor partners kept | 009F-AC-010, 009F D2, 009B (checklist item removed), WORDS_CO_BRAND name list | Covered, and the page now has one job (keeping partner names out of ads). |
| No link import, no photo upload | Non-Goals; 009D-AC-005, 022; index API section | Covered by non-goals and the happy-path count; no failing test elsewhere (I-10). |

## Testability

All 120 criteria carry a named test type from the PRD-008 vocabulary (Unit, Component, Integration, Postgres, Browser (synthetic or review), Visual baseline, Source scan, Record check, Review, CI). Click and field counts are measurable (009D-AC-022: a helper counts activations and typed fields; 009D-AC-001 opens three bad addresses). Size and layout claims carry numbers: 44 px, four frames, 720 px, 0.5 percent aspect, 300 s, 4:5 and 1:1. No criterion uses "fast", "looks good", or "consistent". The unmeasured exceptions are in I-3, I-4, I-5, I-11, and I-13. Two criteria are unsatisfiable or unstored as written (W-1, W-8).

## Gauntlet readiness

| Check | Result |
|---|---|
| Scope contract | Right. Base, prerequisites, ledger, authorized and unauthorized actions, verification commands, lifecycle, and the "ship the documents and the code as one pull request if the authoring branch is still open" answer to PRD-008's W-1 are all present. |
| Wave plan | Four waves with disjoint ownership in Wave 1, an orchestrator-only ledger rule, one redraw, and `security-guardian` then `quality-guardian` last. Collisions: W-4, W-5. Missing rules: W-6. |
| Model routing | Stated per lane with a one-line reason (`index:206-221`). The user-level matrix file the table cites was not opened by this audit. |
| Human dependencies | Only the operator checklist items (supply ads, counsel and lender review, owner sign-off, the post-deploy check) and two owner questions with defaults. `gh` scope and Docker are Phase 0 checks, with the CI fallback. No criterion silently needs a credential, a provider, or an owner answer: 009D-AC-012 may end UNVERIFIED, 009A-AC-006 needs only a public download (W-1 aside), the Inter and Meta reads need no account. |
| Meta's rules | Marked UNVERIFIED in the index (R-3), 009c, 009d, and the design; 009D-AC-012 is the in-run criterion with a conservative default and a rule that no unverified clause ships. |
| Ordering | Security PASS precedes this report; the close-out order is fixed in MTK-003 and MTK-004. |

## Consistency

| Check | Result |
|---|---|
| Index counts | 15 + 15 + 16 + 24 + 12 + 15 + 12 = 109, plus 11 = 120. Matches every sub-PRD table, the backlog README row, and both Amendments. "81-row register" is S-01 to S-81. |
| IDs and references | 120 IDs defined once each; every `009X-AC-NNN` and `MTK-NNN` mention resolves; all 203 relative links and anchors resolve. |
| Design vs PRD | Names (D-16), five topics, step titles, targets (6 and 5 activations, 1 and 0 fields), budget ($25, 14 days, $350), image sizes (art 1080 by 1080 composed to 1080 by 1350; art 1080 by 842 composed to 1080 by 1080; band 270 px and 22 percent), the Light token values and every contrast ratio agree. The disagreements are W-10 and the "logo" strings (I-9). |
| Stale citations in `design/01-open-decisions.md` | Confirmed: lines 5, 24, 31 (I-2). |

## User language

The 7 mockups (about 930 text nodes and attributes) and every quoted PRD sentence were scanned against the 57 forbidden terms: no user-visible hit. The only literal matches are internal prose and the sample identity string "NMLS 0000000, synthetic" (I-8). The plain-fix sentences in 009d D5 and D7, the PRD-008b state sentences, and 009b to 009f strings pass the contract's rules (second person, no dashes, a next step), except the empty-library sentence (W-9). Contract section 1 and the Related link are stale (W-2). Dash scan of added lines: 0.

## Verified claims

Result key: VERIFIED, PRECISION (true with a wording note), INACCURATE.

| # | Claim | Evidence | Result |
|---|---|---|---|
| V-01 | `tokens.css` anchors (`:root` :5, `--sf-nav` :12, `--ac-primary` :27, `--ac-secondary` :30, `--font-interface` :77, `--font-data` :79, dark :125) | read | VERIFIED |
| V-02 | Master tokens mirror (:109, :196, `prefers-color-scheme` :242) | read | VERIFIED |
| V-03 | `globals.css:33-43`, `tenant-accent.ts:15-27` carry the old blue | read; a second `oalo-teal` accent entry also exists | VERIFIED |
| V-04 | `theme-bootstrap.ts:10` resolves the OS preference; `theme-preference.ts:23-26` removes the key for System | read | VERIFIED |
| V-05 | Shell: `.desktopSidebar` 17rem fixed (`app-shell.module.css:8-22`), sticky `.topbar` (:208), banner `<aside>` (`app-shell.tsx:140-158`), "Expand Marketing" (:256), `SIGNED_IN_SOURCE` (`user-language.ts:142-143`) | read | VERIFIED |
| V-06 | Nav in three places: `synthetic-ui.ts:33-123`, `navigation.ts:10-28`, `layout.tsx:161-177`, `product-shell.tsx:14-36`; nine-item test `synthetic-ui.unit.test.ts:39-59`; origin gate `ui-foundation-ux.spec.ts:21-25` | read | VERIFIED |
| V-07 | 009b: handler `:1037`, `:1024`; `toReviewOverview` `:276-293`; `notConnectedReviewMetric` `:254`; overview `:106-111,123,131,230`; `progress.ts:52,146-150`; `profile.ts:19,25-34` | read | VERIFIED |
| V-08 | `marketplace_installations` is selectable by `app_runtime` (`20260721010000_platform_foundation.sql:161-180`, grant `:1744`) | read | VERIFIED |
| V-09 | 009c: manifest literal and blocks (`campaign-foundation.ts:236-247,260-280`), snapshot (`:405-420`), domain image rules (`:217-238`), `open-house-draft.ts:171-172`, review run env (`review-browser-run.mjs:66,74`), schema defaults to `local` (`authenticated-workspace-data.ts:136`, `environment.ts:152,259`), `CODEOWNERS:2` | read | VERIFIED |
| V-10 | `executeHumanCampaignApproval` `:187`, role check `:213-228`; `createApprovalDecision` `:354-372`; `getLatestVersionNo` `:270-271`; paid-ad boundary only at `:175` | read | VERIFIED |
| V-11 | No database check on the blueprint (no `blueprint` in any migration) | grep | VERIFIED |
| V-12 | 009d: preflight handler `request.json()` `:34`; `readBoundedJson(...)` `workspace-preferences.ts:206`; rules `:253-268`, `normalizedText` `:378-383`, `evaluatePaidAdBrandBoundary` `:400` | read | VERIFIED |
| V-13 | Meta: `META_ADAPTER_MODE` `:13`, geo kinds `:287-293`, placements `:299-302`; `providerPublicationAuthorized: false` `campaign-workspace-read.ts:101-107` | read | VERIFIED |
| V-14 | Copy constants `user-language.ts:194-195,203-204,287`; approval controls `:105,170,172-174,238`; `HomeBrandSchema` `homeowner-reports.ts:16-26`; `readBoundedJson` `homeowners/errors.ts:19`; `profile.ts:53-55,85-97` | read | VERIFIED |
| V-15 | Builder lines `open-house-draft-builder.tsx:187,444,452,474,483,502,538,569,625,633`; draft `:76,90,112,130,146,175` | read | VERIFIED |
| V-16 | 009e: `approval_decisions` columns and `snapshot` check (`campaign_activation.sql:136-180`, `:176`), append-only trigger (`:266-268`), `app_users` (`platform_foundation.sql:127-134,130`), `resolve_session_display` (`first_party_sessions.sql:498`), pgTAP `:299-300`, `displayName` `runtime-authentication.ts:645` | read | VERIFIED |
| V-17 | `created_by_actor_id` exists, so "by you" is derivable (`campaign_activation.sql:59`) | read | VERIFIED |
| V-18 | 009g: `sign_up_ip` 10 per 3,600 s (`password-authentication-handler.ts:121`), `freshEmail` `:34`, `signUpFreshAccount` `:171`, `CEILING_SECONDS` `:43`, `NOTE_MARKER` `:32`, UX contract test `ui-foundation-ux.spec.ts:218-232` | read | VERIFIED |
| V-19 | 009f: catch-all `[...workspacePath]/page.tsx:10-27`, `workspaceRoutes` `model.ts:4-21`, `previewPaths` keys | read; the keys run :182-196, the PRD says :185-195 | PRECISION |
| V-20 | 009f: "Open House Boost" in `layout.tsx:18`, `auth-messages.ts:41`, `campaigns/page.tsx:27-41`; public docs `what-is-automated-lo.md:21,28,29` | read | VERIFIED |
| V-21 | Compliance lines `:19,31,48,50,55,61,63,65,72,74,98,154`; product definition `:15,17,47,77,90`; project map `:144,178,192,199,277` | read | VERIFIED |
| V-22 | Design contrast tables (every pair in 2.5) | recomputed with the repo's formula; all within 0.02, Dark field edge on the real `#1b1e25` card 3.51 | VERIFIED |
| V-23 | Baseline counts: 120 `chromium`, 256 `review`; recon's 112 and 144 changed-rail counts | counted by name | VERIFIED |
| V-24 | Recon: 16 repeats, 9 metrics, panel placement, rail gap | read against `overview-screen.tsx`, `guided-setup.module.css` | VERIFIED |
| V-25 | PRD-008 follow-ups L-1, L-2, L-3, L-4, L-14, L-15, L-18 as mapped in the index | `prd-008-...-index.md:216-226` | VERIFIED |
| V-26 | Security review: all twelve Mediums closed in the criteria text | read against D5 and 009D-AC-010; re-checked "Acme #30yr Lending", "NMLS 123", "Lic. 12-3456"; one Low (N-8) open | VERIFIED (I-1) |
| V-27 | Inter `LICENSE.txt` is OFL 1.1, no Reserved Font Name | `raw.githubusercontent.com/rsms/inter/v4.1/LICENSE.txt` | VERIFIED |
| V-28 | GitHub reports the release asset digest | `gh api repos/rsms/inter/releases/latest`: `digest: null` | INACCURATE (W-1) |
| V-29 | Stored preflight result carries a rule count | `PreflightResultSchema`, `preflight_results` columns | INACCURATE (W-8) |
| V-30 | `product-tokens.css` is outside every criterion | grep of `product-tokens` across PRD-009 returns nothing | INACCURATE (B-1) |
| V-31 | Heavy-suite rule is in the PRD | not found in the index; the house rule is `EXECUTION_LEDGER.md:561` | INACCURATE (W-6) |
| V-32 | Every ID cross-reference, link, and anchor resolves; counts hold | scripts | VERIFIED |

Total: more than 100 file:line citations opened (V-01 to V-21); one precision note (V-19); five claims inaccurate (V-28 to V-31 and the design sample in W-10).

## Register spot-check (all 81 source rows opened)

Result: every source line exists and says what the register says. Rows by file:

| Rows | Source | Result |
|---|---|---|
| S-01 to S-09 | `prd-001-...-index.md:9,13,24,52,58,75,87,108-109,112,140,148` | VERIFIED, 12 lines |
| S-10 to S-14 | `prd-001g-...md:19-28,30-34,44-49,51-55,68-70` | VERIFIED; S-14 PRECISION (I-12b) |
| S-15 | `prd-005e-...md:68`; `CRR-082` BLOCKED at `EXECUTION_LEDGER.md:493,514` | VERIFIED |
| S-16 to S-18 | `prd-006b-...md:28,186-187,259,264`; `CRR-142` `:641`, `CRR-147` `:646` | VERIFIED |
| S-19 to S-35 | `prd-006c-...md:147-166`; `CRR-148` to `CRR-167` `:647-666` (17 rows, ledger row numbers all match) | VERIFIED |
| S-36 to S-42 | `prd-006d-...md:74,78,139,140,141,144,149`; `CRR-176` `:675`, `CRR-177` `:676`, `CRR-178` `:677`, `CRR-181` `:680`, `CRR-186` `:685` | VERIFIED |
| S-43, S-44 | `prd-008b-...md:65,67`; `FLR-031` `:791`, `FLR-033` `:793` | VERIFIED |
| S-45 to S-57 | `00-design-brief.md:5,7,11-17,23-28,44,55-78,82-100,106-117,136-142,148-149,165-172,180-184,220,248-256` | VERIFIED |
| S-58 to S-67 | `application-shell-and-navigation.md`, `onboarding-checklist.md`, `campaign-and-artifact-workflow.md`, `metric-source-and-freshness.md`, `platform-overview.md`, `campaign-lifecycle.md`, `marketing-suite-campaign-performance.md`, `onboarding-brand-and-platform-settings.md`, `workspace-page-completion.md`, `homeowner-reports.md` at the cited lines | VERIFIED |
| S-68 to S-71 | `06-review-rubric.md:57-60,75-93,174-198,227-255` | VERIFIED |
| S-72 to S-77 | `product-definition.md`, `project-map.md`, `compliance-and-risk.md:55,154`, `user-language-contract.md:27,97-99,101,104` | VERIFIED |
| S-78 to S-81 | `what-is-automated-lo.md:21,28,29`, the FAQ and listing copy pack (files exist), the fonts README ruling | VERIFIED |
| Ledger table (009F-AC-012) | every ID listed has a row at the cited line; statuses `VERIFIED` (`GGL-001`, `GGL-002`, `FLR-031`, `FLR-033`), `BLOCKED` (`CRR-082`), others VERIFIED or DONE; the 009F-AC-012 list matches the register | VERIFIED |
| "Nothing is deleted" | D3 keeps original text and every status cell; MTK-006 bars status changes; deletions are code, tests, and baselines only (I-7 for one evidence file) | VERIFIED |

## Plan Item Traceability

| # | Plan requirement (brief item) | Status | Location | Notes |
|---|---|---|---|---|
| T-01 | Owner fidelity OD-A to OD-H and design answers | Partial | table above | OD-E contradicted on four pages (B-1) |
| T-02 | Testability and named test types | Pass | all 120 criteria | W-1 and W-8 unsatisfiable or unstored; I-3, I-4, I-5, I-11, I-13 wording |
| T-03 | Removal footprint fully covered | Partial | 009F-AC-005, 007; 009G-AC-003 | W-3 |
| T-04 | Register accurate; nothing deleted | Pass | `prd-009f:79-166` | 81 of 81 sources match |
| T-05 | Register complete; CRR and ledger history preserved | Partial | 009F-AC-011, 012 | W-2 |
| T-06 | New empty-account baselines exist as criteria | Partial | 009G-AC-001, 002, 009 | Present; the hosted empty-library and email-notice pictures are missing (W-9) |
| T-07 | 009g covers every sub-PRD | Pass | 009G-AC-001 to 012 | Home (009b), library and steps (009c, 009d), campaign page and list (009e), gone page (009f), top bar and Menu sheet (009a) |
| T-08 | Design and PRD agree | Partial | design sections 2, 5, 6; 009a to 009d | W-10, I-9 |
| T-09 | Index counts match tables | Pass | index, backlog README | 120 |
| T-10 | Cross-references resolve; stale `01-open-decisions.md` citations | Pass | link script | Stale citations confirmed (I-2) |
| T-11 | Scope contract right | Pass | `index:155-169` | |
| T-12 | Wave plan, parallelism, heavy-suite rule | Partial | `index:100-112,171-221` | W-4, W-5, W-6 |
| T-13 | Model routing stated | Pass | `index:206-221` | |
| T-14 | Only operator-checklist items are human dependencies | Pass | 009F-AC-014 | |
| T-15 | No criterion silently needs a credential or live provider | Pass | all criteria | W-7 is an environment gap, not a credential |
| T-16 | Meta rules UNVERIFIED with an in-run criterion | Pass | 009D-AC-012, R-3 | I-12(f) on timing |
| T-17 | Security Low N-8: exact edit | Pass | I-1 | |
| T-18 | User language of sample sentences | Pass | scans | W-9 sentence; I-8, I-9 |
| NG-1 | Documentation-only change set | Pass | `git diff --stat` | 43 files, no code, no migration, no workflow |
| NG-2 | No em or en dash, no hidden Unicode in added text | Pass | scan of 6,925 added lines | 0 hits |

## Files Changed

Audited, not modified by this report:
- `library/requirements/backlog/README.md` (M): one PRD-009 row
- `library/requirements/backlog/prd-009-marketing-toolkit/prd-009-marketing-toolkit-index.md` (A): module index, MTK criteria, risks, scope contract, wave plan, amendments
- `prd-009a` to `prd-009g` (A): seven sub-PRDs, 109 criteria
- `README.md` (A), `qa/README.md` (A), `qa/2026-10-01-authoring-security-review.md` (A)
- `design/00-direction.md`, `design/01-open-decisions.md`, 7 mockup HTML files, 17 preview PNGs (A)
- `research/README.md` and four research inputs (A)

Added by this audit:
- `library/requirements/backlog/prd-009-marketing-toolkit/qa/2026-10-01-authoring-qa-report.md` (A): this report

Not done here, by the one-file rule: a row for this report in `qa/README.md`, which also needs its security row refreshed (I-2f).
