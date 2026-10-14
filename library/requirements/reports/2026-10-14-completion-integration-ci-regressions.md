# Combined CI regression diagnosis

## Scope

This packet investigates the webinar preparation integration failure in run `38511521620` and the earlier top-bar review failure in run `38507742358`. Base integration head: `03dcfef7ca26547cdd843eaabd338b50857a06af`.

Only `apps/web/src/features/webinar-ads/preparation.integration.test.tsx` and this report are changed. The form component, shared Select, authentication policy, browser orchestration, CI configuration, timeouts, worker counts, coverage thresholds and visual baselines remain unchanged. No commit, push, provider action, hosted migration or deployment was performed.

## Preparation selection race: established and corrected

The completed application job `115680890594` reports four failures in `preparation.integration.test.tsx`, all at its common setup's immediate option query: retained copy from another account, incomplete uncertainty, malformed uncertainty and definitive validation refusal. Integration totals were 918 passing, four failing and one existing skipped test. Its preceding 3,100-test unit coverage pass confirms the earlier PDF assertion correction passed that unchanged CI gate.

All four error dumps show the publication combobox with `aria-expanded="false"`. There is no accessible option because the popup is closed. Replacing the query with an asynchronous option query alone would not address that state.

The actual form's `move()` schedules `heading.current?.focus()` in `requestAnimationFrame`. The setup helper previously selected a creative and immediately opened the next control. Delivery of that queued focus after the popup opens blurs the Select trigger; its actual `onBlur` closes the popup. This is a test interaction-order race around the intended step-focus behavior.

The setup helper now waits for the real step heading to have focus before opening the real Select by pointer. It still clicks the named visible option, and additionally asserts the combobox displays the selected webinar. All existing account isolation, exact request retry, retained-copy, validation, selected publication and navigation assertions remain.

A regression case controls delivery of the actual animation-frame callback. It delivers any outstanding frame just after a combobox pointer click, with a normal delayed fallback so a correctly waiting helper can settle focus first. The original helper deterministically failed with the same missing-option error as CI. The corrected helper passes through actual pointer selection, visible review content and a save whose body contains the expected publication ID. Temporary timers and the event listener are cleared in `finally`; existing global restoration remains intact.

Evidence and qualification:

- Original focused file: 15 passed locally. This does not contradict the intermittent CI failure.
- Controlled regression before helper correction: one failed, 15 deselected, matching CI's missing-option error. Evidence: `test-results/integration/ci-regressions/preparation-focus-race-red.log`.
- Corrected entire focused file: all 16 passed, 18.54 seconds. Evidence: `test-results/integration/ci-regressions/preparation-focus-green.log`.
- Typecheck: all 16 workspace tasks and the tooling compiler passed.
- Scoped lint, formatting and diff checks passed.
- Final test file SHA-256: `f5fc9a93fcce57869348f248ee7fe643bedf80e074e061030720a25195049588`.
- Completed application log retained at `test-results/integration/ci-regressions/app-38511521620.log`.

The controlled scheduler exists only in the regression test. No production focus or Select behavior is replaced or changed. Full combined CI remains required after independent Security and fresh Quality review.

## Top-bar browser failure: observed boundary and missing evidence

The earlier completed PostgreSQL job `115669012432` passed all pgTAP checks and 317 actual PostgreSQL tests. Its first browser catalog pass reports 162 passing review cases and one failing top-bar case, including its retry. Both failures consumed the existing 300,000 ms test budget in `signInExisting()` at `page.waitForURL`, before any viewport, shape or axe assertion in the top-bar test ran.

The stack names `tests/browser/review/helpers/guided-setup-journey.ts:225`. The failed run log names both error-context Markdown files and trace ZIPs under `test-results/browser/top-bar-the-review-top-bar-80478-axe-clean-in-Light-and-Dark-review*`. However, the database trace upload later reported: `No files were found with the provided path: test-results/browser`. The run has only the three product/webinar/synthetic frame artifacts, and no database failure trace artifact. Therefore no actual failed-page screenshot, response status or request trace was available for this diagnosis.

The evidence loss has a concrete orchestration cause. `review-browser-run.mjs` invokes Playwright for the sample catalog and then the real catalog with the same configured output directory. The installed Playwright 1.63.0 runner (`lib/runner/index.js:6404` through `6406`) clears configured output directories when a new test run starts. The second pass cleared the first pass's failures before the final CI upload. Ordinary product frame artifacts are stored elsewhere and survived.

The existing sign-in helper submits the real UI form but then waits only for a navigation. A non-successful sign-in response can therefore consume the whole browser test budget without preserving an immediate HTTP diagnosis.

## Top-bar hypotheses and proposed bounded follow-up

Shared quota exhaustion is a leading inference, not an established cause. The real `sign_in_ip` policy allows 20 attempts per fixed 900-second window. Both failed attempt starts, around 04:08 and 04:13 UTC, fall inside the 04:00 to 04:15 window; later webinar sign-ins succeeded after that window. Existing review fixture comments already warn against exhausting shared authentication budgets. No failed response status or rate counter from this run survives to confirm a 429.

The same seeded creator successfully signed in for the six preceding top-bar review cases, immediately before the failure. Those cases inspect navigation and themes; they do not change the creator's password. This inspection found no intervening credential mutation in that file. Missing authentication response evidence also leaves other refusal or network causes open.

Proposed file scopes for the orchestrator to route before any edits:

1. `tests/browser/review/helpers/guided-setup-journey.ts`: observe the real same-origin POST `/api/auth/sign-in` response and assert its successful status before waiting for navigation. Failure evidence should contain only method, path and HTTP status, without credentials, cookies, query values or bodies. Retain real UI sign-in and navigation.
2. `tooling/scripts/database/review-browser-run.mjs`, with focused orchestration tests: preserve each catalog pass's browser output before starting the next Playwright pass, under an ignored per-pass artifact directory. Preserve both attempts' actual traces and error context; propagate original failures.
3. `.github/workflows/ci.yml`: include those preserved per-pass directories in the database failure artifact upload, retaining existing verification gates and retention.

These proposed paths were not modified by this task. There is no recommendation to increase the navigation timeout, bypass authentication, invent a navigation or loosen the real rate limit. A later trace/status must establish the actual refusal before a fixture budget correction is attributed to this historical failure.

The new run's PostgreSQL job was still in progress when this investigation began; no conclusion is inferred from the completed application job or the earlier run.

## Approved diagnostic and artifact follow-up

This appended section supersedes the initial proposal's unmodified status. The original report, SHA-256 `7b65198c7cdcd071b692fd3cedfb51a1e510c5997fe5261bb5fbcf7ef30cb8ce`, is retained byte-for-byte as this document's prefix. The preparation test remains frozen at its original qualified `f5fc9a93fcce57869348f248ee7fe643bedf80e074e061030720a25195049588` digest.

The orchestrator approved these additional paths:

- `tests/browser/review/helpers/guided-setup-journey.ts` now observes the real same-origin POST `/api/auth/sign-in` before clicking, requires HTTP 200, then retains the existing actual navigation and workspace-choice handling. Its failure assertion exposes only method, path and numeric status. No request or response body, credential, cookie or URL query is logged.
- `tooling/scripts/database/review-browser-run.mjs` preserves whole completed browser output before the next catalog pass can clear it. The fixed destinations are `test-results/browser-passes/samples` and `test-results/browser-passes/real`. The original Playwright output is copied without changes. The helper rejects unrecognized pass names, source/destination junctions or symbolic links, nested source links and nonregular entries; it refuses overwriting prior retained output. It performs no directory deletion or move. A preservation error joins the existing failure list; original pass failures remain failures.
- `tooling/scripts/database/review-browser-run.d.mts` adds only the artifact directory constant and preservation function declarations.
- `.github/workflows/ci.yml` changes only the existing database failure artifact's path to include both `test-results/browser` and `test-results/browser-passes`. The condition, step, pinned action, seven-day retention, missing-file handling, gates, jobs, events and permissions remain intact.
- New `tooling/tests/unit/database/review-browser-evidence.test.ts` covers preservation and sanitized authentication status. All fixture directories and checked recursive cleanup paths are inside ignored `test-results/integration/ci-regressions/fixtures`. No canonical image changes occur.

Verification:

1. With missing preservation represented by a no-op helper, the real-files regression failed with `ENOENT` when reading the first pass's original synthetic trace bytes after the second pass cleared browser output. This is the recorded RED control, `test-results/integration/ci-regressions/pass-preservation-red.log`.
2. Fourteen final tests pass, proving byte-exact retention of both passes' synthetic trace/error-context files, absent-output handling, fixed names, source/destination/nested link refusal, prior-evidence protection, exact producer/CI-consumer path agreement, same-origin POST matching and HTTP 401/429/503 refusal before navigation without leaking supplied email, password or query marker. These file and browser-client boundary tests do not claim an actual hosted authentication or recorded historical trace run. Final evidence: `test-results/integration/ci-regressions/evidence-preservation-final-qualified.log`, 14 passed in 2.87 seconds.
3. Both existing browser/database orchestration files pass all 38 tests in 5.25 seconds. Initial attempts had two child-process import failures because application and then the direct auth test fixture's distribution files were not built. Building only the required database and auth package chains fixed that setup issue; no existing test or gate changed. Evidence: `test-results/integration/ci-regressions/existing-review-orchestration-final.log`.
4. Full 16-workspace/tooling typecheck, scoped lint, formatting and diff checks pass. The paired declaration signatures were required for the new exports. No full unit or browser suite was run concurrently with other heavy agent work.

Final follow-up source digests:

- CI workflow: `17f16c3fe351d7995fa86aa480022d820bddbab90466fa75ffbf765f53196aff`.
- Browser run implementation: `5b27c4f1136a92d885e499ba273dae94e3baaf1b99a87bd6c11658648e33164a`.
- Browser run declarations: `642c38b762e914e3e1434b5131b09c604cddcbda7f3f6469d252d5af375b0336`.
- Sign-in helper: `caa7e842a9793858c53f188ed998d3b1c0c09e696429b7c6d22477af700efd41`.
- Evidence tests: `72b6925169dfaf3e90510f3199445e25bf136cd187aca61fb0562d5b9da23c39`.

The historical top-bar refusal remains unproven. This follow-up makes a future refusal immediate and inspectable; it does not change real authentication, rate limits, timing policies, navigation expectations or global timeout/worker/coverage settings. The complete packet is frozen for independent Security followed by fresh Quality before any commit or push. Actual combined CI and browser qualification remain open.
