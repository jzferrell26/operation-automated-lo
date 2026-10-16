# Public report import Quality self-review

## Summary

The import boundary in the [plan](2026-10-15-public-report-import-plan.md) is repaired and its focused regressions pass. Full real-output verification is incomplete because local browser-backed tests time out. This author review follows [Security](2026-10-15-public-report-import-security.md) on the same pinned executable bytes; it is neither independent approval nor a shippable verdict.

## Scorecard

| Axis | Result | Evidence |
| --- | --- | --- |
| Completeness | Partial verification | Both new boundary cases and the existing rendering boundary pass. Full real-output acceptance remains open. |
| Correctness | Focused pass, broader failures open | Actual disabled GET/HEAD/POST safely refuse without a browser, database or fetch. Three consecutive actual render attempts require the browser and release capacity after failed import. |
| Alignment | Source aligned | Only dependency timing and equivalent Browser typing change; all rendering, financial, media and authorization code remains. |
| Gaps | Blocking acceptance | Serial real-output selection:60 pass,4 fail,54 skipped and one setup-hook failure. Exact-head canonical evidence required. |
| Detrimental patterns | None added | No fallback output, bypass, configurable destination, new dependency, unbounded retry or relaxed guard. Zero clones across834 files. |

## Critical issues

Full browser-backed output verification remains unresolved. `financing-release-output.unit.test.ts:45,124,283` and the setup at309 time out, as does `financing-release-public-runtime.unit.test.ts:241`. The failed-test count is four; the failed setup skips54 PDF security cases. Do not represent those skipped security cases as passing or ship this delta based solely on import tests. Require a fresh complete canonical run on the pushed candidate and address any actual output failure it reports.

## Warnings

Ignored offline controls reproduce slow local browser shutdown with both import styles. Dynamic import probe: PDF generated at855ms, browser closed at28339ms. Static import: PDF at366ms, closure exceeded15seconds. Explicit context closure also left the browser-close delay. This is evidence of an environment limitation independent of the lazy import, not proof that all four report timeouts have only that cause. Full output/financial/security parity remains unverified for this increment.

The earlier combined selection was interrupted through its own exec session after a timeout and lack of progress. A separate serial run with one worker completed in318.24seconds and produced the failure counts above. No unrelated process, test timeout, browser configuration, assertion, baseline or tolerance was changed. The local whole-app fixture startup previously rejected by policy was not retried.

## Suggestions

Use the canonical Linux verification environment to establish full output behavior. Investigate local Chromium shutdown separately if recurring. Playwright documents explicit context closure before browser closure for graceful lifecycle handling ([Browser.close](https://playwright.dev/docs/api/class-browser#browser-close)); the probe found that recommendation insufficient to remove this machine's delay, so no speculative lifecycle change is included.

## Plan item traceability

| Requirement | Evidence | Result |
| --- | --- | --- |
| RED before implementation | Actual public route imports fail at the eager renderer import with the unavailable-browser cause | Pass |
| Safe unavailable GET/HEAD/POST | New import-boundary test:21, exact404/503 text, no-store/CSP, empty HEAD, no database/fetch | Pass |
| Rendering still needs a real browser | New test:48, exact wrapped unavailable-browser cause over three actual attempts, no substituted bytes | Pass |
| Capacity released on import failure | Three attempts exceed the two-slot ceiling if cleanup leaks; all retain the browser-import cause | Pass |
| Defer value import inside current operation | financing-release-render.ts:4,95,97, existing finally retained | Pass |
| Retain real output/parity/security behavior | Serial output/runtime cases time out and54 parser cases skip after setup failure | Open, blocks full acceptance |
| Types/build and static audits | Web types/build, lint, formatting, secrets, boundaries, zero clones pass | Pass |
| Security then Quality | Linked preceding author review and identical SHA256 pins | Pass, same author |
| PR/current main/exact-head CI | Current main ancestry and mergeability must be checked on final candidate; canonical run on87f7643 predates this delta | Open |

## Files changed

- financing-release-render.ts: type-only Browser/Page import, browser value import inside the existing protected operation.
- financing-release-import-boundary.unit.test.ts: actual public route refusal and real-operation positive control with a deliberately absent browser runtime.
- Plan, ordered closeout reports and completion ledger: exact evidence, failed attempts and remaining gaps.

## PR self-review

Keep the source delta reviewable in draft PR100 with this failed-verification record. Reviewer focus: module-load refusal before activation gates, constant import specifier, unchanged browser/security/output behavior and finally-protected capacity. The output renderer still needs hosted Chromium/storage qualification. Owner source setup, public approval/release UI, HighLevel delivery and QR qualification remain unfinished. No merge, deployment, lender approval or provider activation occurred.
