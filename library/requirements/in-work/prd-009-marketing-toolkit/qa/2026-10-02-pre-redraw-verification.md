# PRD-009 pre-redraw verification (independent pass)

> **Verifier:** `quality-guardian` (sonnet), a fresh agent that built none of this.
> **Tree:** `claude/prd-009-marketing-toolkit` at `58e8be60`, Node v24.18.0 (every command run through a login shell whose `cd` switches to the pinned Node), pnpm 11.15.1.
> **Date:** 2026-10-02. **Scope:** the criteria still awaiting proof before the single screenshot redraw (009G-AC-004): 009B-AC-002, 003, 008, 011; 009D-AC-008, 015, 020; 009E-AC-009; 009F-AC-005, 007.
> **Rule followed:** evidence over opinion. Nothing was committed, pushed, or written to `EXECUTION_LEDGER.md`. This file is the only change to the worktree, and it is untracked. Every planted fault was restored with `git checkout -- <file>` (or the created file removed) and `git status --short` was empty after each one.

## 1. Verdict

| Criterion | Verdict | One line of evidence |
|---|---|---|
| 009B-AC-002 | **VERIFIED** | CI run 37021392421 review tests 152 and 153 pass; my live read of Home shows the five topic links with `?topic=`, one primary, three step labels, and the empty-library sentence when the flag is off. |
| 009B-AC-003 | **VERIFIED** | CI review tests 154 to 158 pass (focus order, two columns at 1440 and 1180, stack at 768 and 390) and the 5 tests after them ran; I measured the same on the synthetic server. |
| 009B-AC-008 | **VERIFIED** | CI review test 159 passes; the live page says "Not connected yet" only inside "Get set up"; planted a sentence outside the card and 5 tests went red. |
| 009B-AC-011 | **VERIFIED** | CI review tests 150 (first render after a real sign-up) and 151 (404) pass; Postgres `setup-preferences-handler` 13 pass; the source scan and my own grep find no walkthrough code. |
| 009D-AC-008 | **VERIFIED, with two Warnings (W-1, W-2)** | The Michigan defect is gone end to end in a real browser; 714 sweep checks and 83 refusal cases behave; 11 real places are still refused and a radius spelled in words still gets in. |
| 009D-AC-015 | **NOT VERIFIED** | Component and integration proof is strong (4 faults red). The review spec failed at its first screenshot (line 123), so the step 3 approval lines (205 to 229) have never run in CI. |
| 009D-AC-020 | **VERIFIED** | CI Postgres `library-ad-save` 52 pass; the review page spec passes lines 97 to 111 (new version joins the same campaign, V2 "Ready for approval", V1 "Approved"); synthetic "Fix it" passes and a +2 fault goes red. |
| 009E-AC-009 | **NOT VERIFIED (review half pending CI)** | Integration (20 tests) and synthetic browser (5 tests) pass and 5 faults go red; no review-project spec has run the Campaigns list in CI yet. |
| 009F-AC-005 | **VERIFIED** | My own scan: no link under `apps/web/src` to any D4 address; every D4 view, key, gate and only-serving file is gone. |
| 009F-AC-007 | **VERIFIED** | 144 baselines gone (base 376, now 232); `baselines-follow-the-screens` passes and 3 faults turn it red; my grep finds no test asserting a removed route, menu item, toggle, walkthrough or create form. |

Counts: 10 criteria checked, 8 VERIFIED, 2 NOT VERIFIED. Defects: 0 Critical, 5 Warnings, 6 Suggestions (section 8).

No suite failed locally for a reason other than a screenshot comparison, and no screenshot comparison ran locally (no `CI`). One non-screenshot flake: `pnpm test:integration` with the default worker count timed out once (W-5, carried over from the earlier verifier's S-3).

## 2. Method

1. Ran each command of the list on its own, in order, under Node 24.18.0 (`node.txt` in the run folder records `v24.18.0`). I ran the integration project with `--maxWorkers=3` as allowed, then once more with the default.
2. Read the PRD set, the ledger rows and raid log, and `qa/2026-10-02-wave-3-verification.md` (defects D-1 to D-4).
3. Read CI run 37021392421 (head `8b283a5`) through `gh run view --log-failed`, once, with no artifact download. The log holds both failed jobs, so the review project's passing tests are in it.
4. Measured Home on the synthetic server on port 3100 (samples on, then samples off), in Light and Dark.
5. Ran my own place sweep against the built contract and domain modules (bundled with esbuild into the scratchpad from `packages/contracts/src/ad-places.ts` and `packages/domain/src/library-ad-places.ts`, nothing built into the repository), then end to end in a real browser through step 2 and step 3.
6. Planted 38 single faults and 2 controls (batteries in the scratchpad), restoring each.
7. Checked real place names against Wikipedia (read only, no file saved).

## 3. Suite table (each command alone)

| Command | Result | Notes |
|---|---|---|
| `pnpm format:check` | pass | |
| `pnpm lint` | pass | oxlint printed nothing, exit 0 |
| `pnpm typecheck` | pass | 16 of 16 Turborepo cache hits in the chain (FULL TURBO). I then forced it: `turbo run typecheck --force` ran 16 tasks, 0 cached, pass; `tsc -p tsconfig.tooling.json` exit 0 |
| `pnpm test:unit` | pass | 155 files, 2118 tests; coverage gate met (statements 89.2%, branches 84.71%, functions 92.85%, lines 90.07%) |
| `pnpm test:integration` | **pass with `--maxWorkers=3`; one timeout flake with the default** | `--maxWorkers=3`: 52 files, 629 passed, 1 skipped. Default workers: 51 of 52 files passed, 1 failed with `Test timed out in 5000ms` on the first test of `persisted-campaign-screen.integration.test.tsx`; that file passes alone in 7 s (56 tests). See W-5 |
| `pnpm test:components` | pass | 4 files, 39 tests |
| `pnpm test:contracts` | pass | 13 files, 112 tests |
| `pnpm test:visual` | pass | 2 files, 8 tests |
| `pnpm test:e2e:preview` | pass | 1 file, 1 test |
| `pnpm test:browser` | pass | 196 passed, 22 skipped, 11.6 min, port 3100. The 22 skips are the 9 empty-library tests (they need a server without the samples flag) and 13 dashboard-project tests (7 `dashboard-preview`, 1 AVM, 5 `homeowner-reports`). I did not run the 9, which belong to 009C-AC-012 |
| `pnpm test:browser:dashboard` | pass | 16 passed, 2.8 min, port 3210 |
| `pnpm jscpd` | pass | 0 clones in 562 files |
| `pnpm audit:boundaries` | pass | 16 packages, reject fixture still rejects |
| `pnpm audit:product-types` | pass | |
| `pnpm audit:secrets` | pass | |
| `pnpm audit:dependencies` | pass | No known vulnerabilities |
| `pnpm test:db` | **not run** | See section 9: the Docker engine answers now, but the gate downloads `supabase@2.109.1` first, which I was not asked to do |

## 4. CI run 37021392421 on `8b283a5` (read once)

| Job | Conclusion | Detail |
|---|---|---|
| Release and recovery contract | success | |
| Preview smoke contract | skipped | |
| Application verification | failure | Unit 2105, integration 607, contracts 112, components 39, visual 8, preview 1 pass. Synthetic browser: 116 passed, 54 failed, 22 skipped. All 54 failures are `toHaveScreenshot` (162 error lines with retries); no other error class |
| Real PostgreSQL migrations and pgTAP | failure | Postgres integration 57, route suites 262 (18 files), pgTAP all pass. Review browser run, first pass (samples): 122 tests, 54 passed, 68 failed, 0 did not run. 67 of the 68 are `toHaveScreenshot`. **1 is not:** `review-campaign-page.spec.ts:112` (strict mode, `getByRole('main').getByText('Version 2')` resolved to 4 elements). The second pass (real, empty catalog) did not start |

HEAD `58e8be60` is 8 commits past `8b283a5`. The files that matter to the CI evidence I rely on did not change: nothing under `apps/web/src/features/overview/`, and `tests/browser/review/home-first-run.spec.ts` is untouched. `app-shell.tsx` changed (`d1474fd8`, the sticky bar's reserved height); I re-measured Home after it. The helper `guided-setup-journey.ts` changed only its timing-evidence functions, not `signUpFreshAccount`.

## 5. Criteria, with evidence

### 5.1 Home: 009B-AC-002, 003, 008, 011

**CI, review project, `review/home-first-run.spec.ts` (the file is `describe.serial`, so a failure would have stopped the rest).** All 14 tests passed and none was skipped:

| Test (CI index, spec line) | Result |
|---|---|
| 150, :72 first render has no dialog, no floating panel, no walkthrough control (009B-AC-011) | pass |
| 151, :91 `POST /api/setup/progress` answers 404 (009B-AC-011) | pass |
| 152, :101 start card: question, topics, one primary, three steps (009B-AC-002) | pass |
| 153, :125 a topic opens step 1 filtered, "Choose an ad" opens it unfiltered (009B-AC-002) | pass |
| 154, :144 "Choose an ad" first of Home's controls, then the topics (009B-AC-003) | pass |
| 155 and 156, :175 at 1440 and 1180 the checklist sits beside the start card and the lists sit side by side | pass |
| 157 and 158, :201 at 768 and 390 the cards stack: start, checklist, running, approval | pass |
| 159, :227 a connection is missing once, inside "Get set up" (009B-AC-008) | pass |
| 160, :254 the checklist links go where D2 says (009B-AC-007) | pass |
| 161, :270 the two honest empty states (009B-AC-009, 010) | pass |
| 162 and 163, :284 machine checks at every frame in Light and Dark (009B-AC-013) | pass |

The earlier D-2 (768 stayed two columns) is fixed: test 157 passes. The sign-up first-render check for 009B-AC-011 is test 150. Postgres `setup-preferences-handler.postgres.test.ts` (13 tests) passed in the same run, and it holds the `guided_setup.v1` row test (`:77`, `:209`).

**My measurement on the synthetic server (port 3100, samples on, build from this head).** The synthetic principal is a creator, so "Needs your approval" is not drawn (D3); the review run proves that card.

| Frame | Layout read | Widths (start / checklist / running) | y of the three cards |
|---|---|---|---|
| 1440 | two columns; checklist shares the start card's top edge; Running now under the start card at half width | 676 / 436 / 326 | 160 / 160 / 691 |
| 1180 | two columns, same shape | 664 / 428 / 320 | 160 / 160 / 691 |
| 1099 | stacked | 1035 / 1035 / 1035 | 213 / 692 / 1191 |
| 768 | stacked in order | 704 / 704 / 704 | 213 / 744 / 1285 |
| 720 | stacked | 656 / 656 / 656 | 213 / 744 / 1285 |
| 390 | stacked in order | 358 / 358 / 358 | 152 / 775 / 1647 |

Light and Dark give identical numbers; no horizontal overflow at any frame. The two-column rule starts at 1100 px (`overview.module.css:54`).

**Live read of Home (1440).** One `h1` "Launch an ad"; links in order: "Choose an ad" (`/marketing/campaigns/new`), then First-time buyers, Refinance, VA loans, Pre-approval, Down payment help (each `/marketing/campaigns/new?topic=...`); steps "1 Choose an ad, 2 Set it up, 3 Review and launch"; 0 dialogs, 0 fixed-position elements, 0 metrics. Tab order after the skip link and the top bar: "Choose an ad", then the five topics. With the samples flag off the topic list is replaced by "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then." and "Choose an ad" is still there; the "Get set up" intro reads "Launching an ad on Facebook isn't turned on yet, and it needs HighLevel and Meta connected." (W-2 of the earlier report is fixed). "Not connected yet" appears twice, both inside "Get set up"; no other sentence on the page says a connection is missing.

**Planted faults (all RED unless noted).**

| Id | Fault | Result |
|---|---|---|
| H2 | two-column rule starts at 700 px | RED, 4 tests (unit and integration); synthetic browser E2 also RED |
| H3 | "HighLevel and Meta aren't connected." outside the card | RED, 5 tests |
| H5 | topic buttons moved before "Choose an ad" in the document | RED, 1 test |
| H6 | a "Show me around again" button on Home | RED, 2 tests |
| H7 | `POST /api/setup/progress` answers 200 | RED, 5 tests |
| H8 | a `role="dialog"` element on Home | GREEN in unit and integration; **RED in the synthetic browser (E1)**, which asserts `[role='dialog']` count 0 at `tests/browser/home-first-run.spec.ts:61` |

**Source scan for 009B-AC-011 (my own).** `apps/web/src` holds no guided-setup provider, panel, step, chip, placement, anchor registry or "Show me around again" code. What matches the words is: comments recording the retirement, the kept `features/guided-setup/model/profile.ts` (and its test), `setup-preferences.ts` (the profile half), the 404 stub `api/setup/progress/route.ts`, and an unrelated marketing demo (`components/demo/founding-offer-demo.*`, "Founder walkthrough"). `apps/web/src/features/guided-setup/` holds only `model/profile.ts` and its test.

### 5.2 009D-AC-008 (places, after D-1)

**The Michigan defect is fixed, end to end.** In a real browser on the synthetic server (a probe spec I planted and removed, 28 tests, all pass): typing "Michigan", "MI" or "mi" adds the chip "Michigan", "Save and check" reaches step 3 with "Checks passed", and step 3 lists "Michigan". "Lansing, MI" and "Detroit, mi" (stored "Detroit, MI") do the same and step 3 says "Lansing, MI and everything within 15 miles". Also accepted and passed to step 3: Texas, tx, Austin TX, Page AZ, Mendota Heights MN, Savage MN, "St. Louis, MO", Miles City MT, Mission TX, Milan MI. Refused in the field with no chip: 78701, "Austin 78701", "10 miles around Austin", "within 5 miles", "women 25-40", "men", "Austin", "Austin, ZZ", "Gay, TX", "Seniors, TX", "Miles, WA", "Zip City, AL".

**My sweep through both checks** (the contract's `parseAdPlace` and the domain's `libraryAdPlacesProblem`, applied to what the contract produced):

| Part | Cases | Result |
|---|---|---|
| All 50 states and DC: code, lower-case code, full name, lower-case name, upper-case name, name with spaces (6 forms) and "Springfield, ST" in 4 forms | 510 | 0 failures. The contract stores the code; the domain accepts it |
| The state capital and the largest city of every state (as "City, ST" and "City, st") | 204 | 0 false refusals ("Lansing, MI", "Detroit, MI", "Saint Paul, MN", "Washington, DC" included) |
| New refusal cases: digits beside units ("5mi around Austin", "Austin 5 mi", "10mi, TX", "Austin +25 km", "20kms around Austin"), "within" (4 forms), plural units ("Austin miles, TX", "Austin kms, TX", "Austin kilometres, TX"), a unit closing the name, radius, zip, postal, and 40 age, gender, family and status words in names, plus the PRD's own list | 83 | 82 refused. One accepted: "Texas, TX", which was my wrong expectation (a legal "Name, ST" form), not a miss |
| Contract and domain agree on every value above and below (refused by one and accepted by the other) | all | 0 disagreements |

**False refusals** (real places the rules refuse). Each of the first seven I confirmed on its own Wikipedia article; the next four are listed on the "Miles" and "Gay" disambiguation pages, which I did not open one by one:

| Place | What it is | Why refused |
|---|---|---|
| Seven Mile, OH | village, Butler County | name ends in the unit "Mile" |
| Miles, WA | unincorporated community, Lincoln County | name is the unit "Miles" |
| Miles, WI | unincorporated community, Marinette County | same |
| Gay, WV | unincorporated community, Jackson County | audience word "gay" |
| Gay, OK | unincorporated community, Choctaw County | same |
| Veteran, WY | census-designated place, Goshen County | audience word "veteran" (not in D4's list) |
| Zip City, AL | unincorporated community, Lauderdale County | "zip" (in D4's list, so by design) |
| Miles, NC / VA / WV, Gay, NC | on the disambiguation pages | same two causes |

The exception list holds 13 names (Gay GA and MI, Miles TX and IA, and nine more) and covers only 2 of 7 "Miles" and 2 of 5 "Gay". D4's regex `^[A-Za-z][A-Za-z .'-]{1,59}, [A-Z]{2}$` is ASCII only, so "Cañon City, CO", "Doña Ana, NM" and "Española, NM" are refused too (by D4's own wording; "Canon City" works). Everything else I tried passed: Miles City, Mission, Milan, Kingsmill, Mile High, Miami, Milwaukee, Hamilton, Savage (MN and MD), Page, Pageland, Menomonie, Menlo Park, Mentor, Mendota Heights, Radisson, Zippelton, Withee, Mi-Wuk Village, Nine Mile Falls, Seven Mile Beach, Eleven Mile Corner, Winston-Salem, O'Fallon, Coeur d'Alene, St. Louis, Ft. Worth, Port St. Lucie, Young Harris, White Plains and about 55 more (90 of my 104 first-pass names passed. The 14 refused were: Seven Mile OH, Gay WV, Zip City AL and Veteran WY, which I confirmed and list above; the three accented names; and seven names I could not confirm as places, which I leave out of every claim here: Woman Lake MN, Ladies Island SC, Gay Mills WI, Gay Head MA, Christian AK, Poor Fork KY and Gay TX. The other confirmed refusals in the tables, Miles WA and WI and Gay OK, came from a second list of 15 that I checked on Wikipedia afterward.)

**Misses** (probes that should be refused and are accepted; 25 evasion probes, 13 got in):

| Probe | Why it matters |
|---|---|
| "ten miles around Austin, TX" and "Five Miles From Austin, TX" | D4 refuses the whole words mile and miles; the lane narrowed units to "beside a digit, after within, or the last word". End to end, step 3 then says "ten miles around Austin, TX and everything within 15 miles". **W-1** |
| "Austin Mi., TX", "Austin Miles., TX" | the "unit closes the name" rule does not see a unit followed by a period |
| "Austin w i t h i n, TX", "w-i-t-h-i-n", "Wi thin", "wom-en", "Z I P" | split-letter evasions, the class the earlier verifier logged as W-1 and the PRD accepts under R-4 |
| "Austin and nearby", "Young professionals, TX", "Over fifty Austin, TX", "First time buyers, TX" | plain words outside any list |

Caught as intended: "Fifteen Mile Radius Austin", "Austin wo men", "Austin one mile", "Austin Wom3n", "Austin, TX miles", "Austin_miles", "Austin.miles", and the soft hyphen, zero-width space, no-break space and tab variants.

**Records.** D4 (`prd-009d`, line 82) still says the refused words are zip, radius, mile, miles, within, age, male, female, men and women. The code refuses about 100 audience words, narrows the units, and carries a 13-name exception list. No PRD document records any of it (I searched the PRD set, the design folder and both writing reviews). **W-2**.

**Planted faults** (tests: `tooling/tests/unit/library-ad-checks/places.test.ts`, 196 tests):

| Id | Fault | Result |
|---|---|---|
| P1 | "mi" back on both audience lists (the D-1 defect) | RED, 3 tests |
| P1b | "mi" on the domain list only | RED, 2 |
| P2 | domain skips the exception list | RED, 2 |
| P3 | domain drops the unit-closes-name rule | RED, 2 |
| P4 | contract drops the audience-word rule | RED, 17 |
| P5 | contract drops the unit-closes-name rule | RED, 7 |
| P6 | a sixth state allowed | RED, 1 |
| P7 | domain accepts any stored state string | RED, 1 |
| P8 | contract accepts "Austin, ZZ" | RED, 1 |
| P10 | Michigan missing from the contract table | RED, 16 |
| P11 | Michigan missing from the domain list | RED, 6 |
| P9 | domain digit check removed | GREEN, an equivalent mutant: a digit already fails the state-code and city-pattern checks, only the reason text differs |

CI: `library-ad-save.postgres.test.ts` (52 tests) passed in run 37021392421; it posts the PRD's eight refused values (400, nothing stored) and a stored "Women, TX" is refused by `TARGETING_NOT_ALLOWED`. No Postgres or review test saves a Michigan place; the unit table and my browser probe carry that.

### 5.3 009D-AC-015 and 009D-AC-020

**`review/review-campaign-decision.spec.ts` did not pass in CI run 37021392421.** It failed (and failed again on retry) with `toHaveScreenshot` for `campaign-detail--ready--1440--light.png` ("Expected an image 1440px by 1519px, received 1440px by 1647px"), thrown at `tests/browser/helpers/design-quality.ts:900` from `review-campaign-decision.spec.ts:123`. That is a screenshot comparison, expected red until Wave 4, but it ends the test. What that does and does not prove:

- **Ran and passed** (lines 65 to 122): the seeded creator saves a Brand (`saveBrandDetails`), saves a campaign, step 3 reads "Checks passed" (D-3 is fixed), the hand-off card is visible with "Copy the link", there is no "Approve this version" button for the creator, "Launch on Facebook" is disabled; a second campaign is saved; the approver signs in and "Approve this version" is enabled.
- **Never ran** (lines 126 to 229): approving on the campaign page, the decided state and its three pictures, and the whole step 3 half of 009D-AC-015 (the sentence "Approving applies to this exact version, with your words. Nothing is published or sent.", "Send back for changes", the separate disabled "Launch on Facebook", "Yes, approve" on step 3, and the reload that reads the decision back, `:205` to `:229`).

I read the spec and the assertions are all still there; none is weakened. They simply sit behind the first picture comparison, so with stale baselines they cannot run. After the redraw the baselines will match and they will run, but 009G-AC-004 asks for VERIFIED before the redraw.

**Component and integration proof for 009D-AC-015 (strong).** `launch-review.integration.test.tsx` (`:196`) checks the sentence, "Send back for changes", that "Approve this version" calls no network until "Yes, approve" is pressed, and the request body; `campaign-approval-controls.integration.test.tsx` runs every approval-control test twice, on the campaign page and inside step 3 (`:60`); 008B-AC-004 to 011 are named in 4, 1, 1, 4, 4, 3, 2 and 4 test files, all green.

| Id | Fault | Result (79 tests in the two files) |
|---|---|---|
| Q1 | step 3's sentence changed | RED, 1 |
| Q2 | a viewer who cannot approve is drawn the ready controls | RED, 1 |
| Q3 | confirmation button no longer says "Yes, approve" | RED, 26 |
| Q4 | hand-off card not drawn for a viewer who cannot approve | RED, 1 |

**009D-AC-020 is VERIFIED, and its review proof is in a different spec from the one the ledger names.** The row points at `review-campaign-decision.spec.ts`. The criterion is exercised in `review-campaign-page.spec.ts`, whose lines 97 to 111 passed in CI before the failure at :112: the creator opens "Make a new version", step 2 "Set it up" appears, one headline is changed, `saveAndCheck` returns the same campaign reference (`:100`), the page lists 2 versions, version 2 "Ready for approval" and version 1 "Approved ... by Review approver" (so the earlier approval did not carry over). The rest of that spec, `:112` to `:143` (older version read-only, `/versions/3` not found), has not run. Also: Postgres `library-ad-save.postgres.test.ts` 52 pass; synthetic `launch-an-ad.spec.ts:289` ("Fix it opens step 2 at the words, and the next save is version 2 of the same campaign") and `campaign-pages.spec.ts:267` (prefilled ad, headline and area) pass in my `test:browser` run; budget and dates prefill is `launch-flow.integration.test.tsx:684`. Faults: E4 (demo store numbers a new version +2) RED in the synthetic browser. R1 (the same fault) is GREEN in `local-campaign-store.unit.test.ts`, which does not pin the numbering; the browser spec does.

### 5.4 009E-AC-009

**Verified (integration and synthetic browser).** `campaigns-list.integration.test.tsx` and `campaigns-tabs.integration.test.tsx` (together 20 tests) and `campaign-pages.spec.ts` (list tests `:47`, `:97`, `:134` x2, `:152`) pass in my run and in CI. The list is a table from 720 px with six columns (Ad with a decorative thumbnail and the name as the link, Topic, Dates, Where it shows, Status, Last change), cards below 720 px (`campaign-list.module.css:198`, `max-width: 719.98px`), one primary "Launch an ad", no results column, no search, no filters.

| Id | Fault | Result |
|---|---|---|
| L2 | a "Results" column added | RED, 2 |
| L3 | a search input added | RED, 1 |
| L4 | the Ad link goes to /leads | RED, 2 (the page's source scan and the list test) |
| L5 | the Status column dropped | RED, 1 |
| E3 | the table appears from 600 px, not 720 px | RED in the synthetic browser |

**What remains for CI.** (1) `review-campaign-page.spec.ts:112` is being fixed by another lane; `:112` to `:143` must run. (2) The ledger blames that spec for this row, but it does not look at the Campaigns list. The first review-project proof of the list is in `review/empty-account.spec.ts` (`:348` and `:432` assert `[data-campaign-table]` with all four chips; the three photographs are in the same file), which is new at HEAD and has not run in CI. So the review half needs one CI review run on a head that holds both. (3) Note for the library: the column is "Dates" in code (W-33 amendment, `prd-009e` amendments list, line 105) while the criterion row (line 66) and ledger row MKR-090 still say "Runs" (S-3).

### 5.5 009F-AC-005

**My link scan.** No `href`, `Link`, redirect target or string in `apps/web/src` or `packages/*/src` points at `/leads`, `/leads/pipeline`, `/automations`, `/marketplace`, `/reports`, `/onboarding`, `/marketing`, `/marketing/property-sites`, `/marketing/creative`, `/marketing/ads`, `/marketing/messaging`, `/marketing/blueprints`, `/settings/profile` or `/settings/team`, apart from: comments recording the removal; `next.config.ts` (the redirect table, which is the fate D1 assigns); and the tests that assert the redirect, the gone page or the absence of a link. I also scanned `apps/web/public`, both `vercel.json` files and the Markdown under `apps/web/src`: nothing.

**D4's removals, checked one by one.** Gone: `app/(authenticated)/reports` and `onboarding`, the three `reporting` components and `reporting-acceptance.ts`, the five `onboarding` screen files and `readiness.ts`, `setup-wizard.tsx`, `setup.module.css`, `workspace-report.ts`, `product-walkthrough.tsx`, `product-guides.ts`, `guided-setup-messages.ts`, `api/preview/campaigns/check`, `open-house-draft-builder.tsx`, `product-onboarding.spec.ts`, and every `guided-setup.*.spec.ts`. Kept and present: `synthetic-reporting.ts`, `sample-data-notice.tsx`, `campaign-detail-screen.tsx`, `artifact-workspace.tsx`, `campaign-launch-review.tsx`, `review-not-connected-screen.tsx`, `reporting-messages.ts`, `packages/ghl/src/lead-routing.ts`, `permission-screen.tsx`, `guided-setup/model/profile.ts`. Keys: `workspaceRoutes` and `previewPaths` hold only `/partners`, `/settings`, `/settings/routing`, `/settings/billing` (`profile` is the `/brand` view). Views and cases: no `Leads()`, `Reports()`, `AutomationsWorkspace`, `ExploreWorkspace`, no `onboarding`, `leads`, `reports`, `automations` or `marketplace` case. Read gates: `workspace-page-data.ts` keys its reads on `settings`, `profile`, `partners`, `routing`, `billing` only. Preview directory: every non-test file has an importer (heuristic over import strings); `walkthrough.module.css` holds one class, `.helpNote`, used by `product-help.tsx`.

**There is no standing scan for the whole rule.** I planted a link to `/leads` (a string, and a governed `Link`) in an unrendered module and the whole unit, integration, contracts and components run stayed green (F1s, F1k). The same link in a file a scan covers goes red (L4, F1m: a link to `/marketing/ads` in `campaigns-tabs.tsx`, F1b: a link to `/reports` in `app-shell.tsx`). The coverage is per feature (Home, the Campaigns pages, the library, navigation), not tree-wide. Today's tree is clean; see S-1.

### 5.6 009F-AC-007

| Check | Result |
|---|---|
| The 144 baselines D4 lists | all gone. At base `e89058e` the seven sets held 8, 8, 32, 80, 8, 6 and 2 files; now 0 each. Folder totals: base 120 + 256 = 376, now 72 + 160 = 232 |
| `baselines-follow-the-screens.test.ts` (5 tests) | passes. Faults: F2 (a deleted `reports--default--1440--light.png` back) RED, 2; F3 (a spec that captures `screen: "reports"`) RED, 1; F4 (a `shell--finish-setup-chip` picture back) RED, 2 |
| Tests D4 says to delete | `reports-review-surface`, `reporting-screen`, `workspace-report`, both onboarding integration tests, `readiness.unit.test.ts`: all gone |
| Tests D4 says to edit | `workspace-screen.integration`, `connections-review-surface.integration`, `tests/browser/workspace-pages.spec.ts` (and the review twin), `dashboard-preview.spec.ts`, `design-quality.spec.ts`: no removed route or view is asserted as present |
| My grep for a test asserting a removed route, menu item, "Expand Marketing", the walkthrough or the create form | every hit is an absence assertion (`toBeNull`, `toHaveCount(0)`, a regex that must not match), a redirect or gone-page check, or a stored-data helper (`open-house-draft.test-support.ts`, which builds earlier-flow versions for 009E-AC-012). One neutral fixture: `packages/ui/src/components/form-primitives.test.tsx:224` renders a `Link` with `href: "/onboarding"` and text "Finish setup" to check variants (S-4) |

## 6. Planted faults (38 plus 2 controls and 1 probe)

Batteries in the session scratchpad (`battery-a.json` to `battery-f.json`), run by `mutate.mjs`; each restored and the worktree checked clean after each.

| Group | Faults | RED | GREEN |
|---|---|---|---|
| Places (P1 to P11, P1b) | 12 | 11 | 1 (P9, equivalent) |
| Step 3 approval (Q1 to Q4) | 4 | 4 | 0 |
| New version (R1, E4) | 2 | 1 (E4, browser) | 1 (R1, unit; see 5.3) |
| Home (H2, H3, H5, H6, H7, H8, E1, E2) | 8 | 7 | 1 (H8 in unit and integration only; its browser twin E1 is RED) |
| Campaigns list (L2 to L5, E3) | 5 | 5 | 0 |
| Removed screens and links (F2, F3, F4, F1b, F1m, F1s, F1k) | 7 | 5 | 2 (F1s, F1k: no tree-wide link scan) |

Controls: `F1n` (an innocuous export in an unrendered module) GREEN; `E0` (no fault, the four synthetic browser tests) GREEN. Note: my first F1 and F1b plants were a raw `<a href>`, which three unrelated security and governed-control tests also reject; the results above come from the later `Link` and string variants.

## 7. Orchestrator notes the ledger can use

- MKR-028, 029, 034, 037 (009B-AC-002, 003, 008, 011): the review half is proven by CI run 37021392421, tests 150 to 163.
- MKR-077 (009D-AC-020): the review proof is `review-campaign-page.spec.ts:97-111`, not the decision spec.
- MKR-072 (009D-AC-015) and MKR-090 (009E-AC-009) stay open on the CI points above.
- The earlier defects: D-1 fixed (section 5.2); D-2 fixed (test 157); D-3 fixed for the decision spec's creator half and the page spec up to `:111`; D-4 fixed (`workspace-pages.spec.ts:133` is test 186, pass).

## 8. Defects

| ID | Severity | Where | What | Owner |
|---|---|---|---|---|
| W-1 | Warning | `packages/contracts/src/ad-places.ts:242,276`; `packages/domain/src/library-ad-places.ts:119,136` | A radius spelled in words gets in: "ten miles around Austin, TX" and "Five Miles From Austin, TX" are stored and step 3 prints "...and everything within 15 miles" after them. D4 refuses the whole words mile and miles. A unit followed by a period ("Austin Mi., TX") also passes the "closes the name" rule. Fix: strip trailing punctuation before the unit test, and refuse a unit word next to a number word (one to twenty, "a few"), or amend D4 to say what is done | 009d fix lane (react-guardian) |
| W-2 | Warning | `prd-009d` D4 (line 82) and 009D-AC-008 | The PRD names ten refused words and "mile, miles" as whole words; the code refuses about 100 words, narrows the units, and keeps a 13-name exception list. None of it is recorded, and the exception list is incomplete: 7 real places confirmed refused (Seven Mile OH, Miles WA and WI, Gay WV and OK, Veteran WY, Zip City AL) plus 4 from the disambiguation pages. A person who serves one of them can add the state instead. Either amend D4 and the AC with the list rule, or widen the exceptions | `library-guardian` (record), 009d lane (list) |
| W-3 | Warning, blocks MKR-072 | `tests/browser/review/review-campaign-decision.spec.ts:118-124` before `:200-229` | The 009D-AC-015 step 3 approval half sits behind the first `toHaveScreenshot`. With stale baselines the test ends at `:123` and the half never runs in CI. Fix: move the `:200-229` block before the capture loop, or make it its own `test(...)`; or run the review run locally with comparisons skipped (section 9) | 009d fix lane |
| W-4 | Warning, blocks MKR-090 | `tests/browser/review/review-campaign-page.spec.ts:112`; ledger row MKR-090 | `getByRole('main').getByText('Version 2')` matches 4 elements (the caption span, the `strong`, two `dd`). Another lane is fixing it. The row's review half also depends on `empty-account.spec.ts`, which has not run in CI | 009e lane |
| W-5 | Warning | `pnpm test:integration` default workers; `persisted-campaign-screen.integration.test.tsx` | One `Test timed out in 5000ms` on the first test of a file under load, as the earlier verifier's S-3 found. The file passes alone in 7 s and the project passes with `--maxWorkers=3`. Raise `testTimeout` for the integration project or cap the workers in the script | orchestrator |
| S-1 | Suggestion | whole tree | No standing test for 009F-AC-005's "no href to a removed address in `apps/web/src`" (F1s and F1k stay green). A 20-line scan of `apps/web/src` for the 14 addresses outside `next.config.ts` and the three tests that assert them would keep it true | 009f lane |
| S-2 | Suggestion | `apps/web/src/features/dashboard-preview/product-shell.tsx:81`; `setup-model.ts` | The `selected()` helper still special-cases `href === "/marketing"` (no nav item has it). `setup-model.ts` exports `setupStepIds`, `guideIds` and `ProductSetup`, which nothing imports | 009f lane |
| S-3 | Suggestion | `prd-009e` row 009E-AC-009 (line 66), ledger MKR-090 | The row still says the column is "Runs"; code and the amendments list (line 105) say "Dates". Add the inline amendment mark | `library-guardian` |
| S-4 | Suggestion | `packages/ui/src/components/form-primitives.test.tsx:224` | A fixture link to `/onboarding` named "Finish setup". Use a neutral address and label so a grep for removed things stays empty | 009f lane |
| S-5 | Suggestion | `apps/web/src/features/http/user-messages.ts:176`; `apps/web/src/server/correlation-boundary.ts:36`; `packages/ui/src/components/Stepper.tsx:63` | `SETUP_PREFERENCE_FAILED` still says "where you got to in the setup" (the progress it described is gone; the message now answers the profile save). The `"setupProgress"` route name has no user. The Stepper's default label is "Guided setup progress" (Launch an ad passes its own) | 009b lane |
| S-6 | Suggestion | `apps/web/src/server/local-campaign-store.unit.test.ts` | Does not pin the "next version number" rule (R1 green); only the browser spec does (E4 red). One unit assertion would catch it without a build | 009d lane |

## 9. What I could not verify, and what remains

- **The review project's tail for 009D-AC-015** (step 3 approval, `:205-229`) and the rest of `review-campaign-page.spec.ts` (`:112-143`): they need a real database. **Docker's engine answers now** (Docker Desktop 29.4.3; 15 containers of two other projects are running). This project's stack uses its own ports (55421 to 55429, project id `operation-automated-lo-phase-0`) and has no container up, so it would not collide. But `pnpm test:db` begins with `pnpm dlx supabase@2.109.1` (`run-real-database-tests.mjs:509`), a download of a tool and its images, and I was not asked to do that. If the orchestrator approves it, `pnpm test:db` locally would run the review browser run with screenshot comparisons skipped (no `CI`), which executes both tails and settles MKR-072 and, for the page half, MKR-090. I held port 3100 free for it.
- The second review pass (the real, empty catalog, `review/real-catalog/first-impression.spec.ts`) and `review/empty-account.spec.ts`: never reached in CI at `8b283a5` (the first pass failed first); both are new at HEAD.
- The 9 samples-off synthetic tests (009C-AC-012): skipped in `test:browser`, not in my scope.
- Wikipedia is the source for the real-place checks; four of the eleven places come from disambiguation pages only.

## 10. Housekeeping

Servers I started on 3100 are stopped; ports 3100 and 3210 are free. The worktree's `git status` was empty before and after every planted fault; the only new file is this report. `apps/web/.next` was last built from the clean tree (the probe run). The scratchpad holds the batteries, `mutate.mjs`, the sweep scripts and logs.
