# Schedule capture Quality self-review

## Summary

Source acceptance of the bounded capture repair, following [Security](2026-10-16-schedule-capture-security.md) on identical executable bytes. Both reviews are by the implementation author. Full new-head canonical acceptance and merge remain pending. The [weekend checkpoint](2026-10-16-weekend-release-checkpoint.md) records the larger unfinished product scope.

## Scorecard

| Axis | Result | Evidence |
| --- | --- | --- |
| Completeness | Bounded source complete | New Inter geometry regression and separate summary/header labels; complete canonical gate required |
| Correctness | Focused pass | 11 offline browser cases pass, including real RED/GREEN geometry and original10 cases |
| Alignment | Pass | Existing original PNGs, tolerance, selectors, validation, clocks and actual dates unchanged |
| Gaps | Explicit | New Linux screenshot comparison and all four required jobs pending; no completion percentage or weekend guarantee |
| Detrimental patterns | None detected | No fixture-server retry, baseline adoption, blanket mask, assert removal, provider effect or added dependency |

## Critical issues

No new source issue detected. The existing complete-run screenshot failure must clear on the actual candidate before merging. An isolated green fixture is insufficient, as demonstrated by the earlier failed repair.

## Warnings

The masked original does not establish its original date. The helper now uses a representative longer weekday/month label to preserve its wrapping. The geometry regression uses the actual vendored typography and a representative narrow column; it is not the full authenticated UI. Its width bound allows a small date-mask difference while the original full-page PNG and existing0.001 comparison tolerance retain final authority. No full-page visual pass is inferred yet.

The original October repair had normalized successfully, proven in the downloaded trace, but used a label too narrow to reproduce the original wrapping. The stronger regression caught that error. A first attempted longer October label also fit the static column and failed. These failed attempts remain in ignored logs and are not represented as acceptance.

## Suggestions

Retain the real-page canonical comparison as the final regression gate. The new font-backed test complements it and cannot replace it.

## Plan traceability

| Requirement | Evidence | Status |
| --- | --- | --- |
| Inspect original failure | Downloaded expected/actual PNGs and trace from38852290932; masks125 vs115px, document1942 vs1921px; normalization confirmed | Pass |
| Assertion-based RED | New test reports offset2, expected>=21 | Pass |
| Representative actual typography | Fixed InterVariable.woff2,14px/500,21px leading, tabular numeric time and narrow246px value column | Pass, static only |
| Summary capture repair only | design-quality.ts: summary branch separate from header; datetime/restoration unchanged | Pass |
| Original cases retained | All11 pass, including five states, negative copy, failed-capture restoration and malformed markup | Pass |
| Types/lint/audits | Tooling types, lint, formatting, secrets, zero clones | Pass |
| Security before Quality | Linked preceding author review and exact SHA256 pins | Pass |
| Real mobile selector pictures | Current-head390/light and390/dark downloaded viewport images inspected: all five choices visible, selected state readable, no horizontal clipping | Pass, synthetic evidence only |
| Current main and merge gate | Fetched main is ancestor; PR100 was MERGEABLE at3a0c212. New-head required checks must all pass | Pending |

## Files changed

- tests/browser/helpers/design-quality.ts: separate representative summary label and explanatory trace evidence.
- tests/browser/screenshot-date-stability.spec.ts: Inter geometry regression; existing static reference updated to the summary label, not a canonical product PNG.
- Weekend plan, ordered reviews and resume ledger: exact evidence, owner deadline, merge authorization and remaining live/product work.

## Prior gaps superseded by new evidence

Run38852290932 on3a0c212 passed Application verification with3934 unit cases,963 integration passes/one skip,285 browser cases and16 dashboard-preview cases plus its other checks. All60 public financing output and19 runtime cases passed on Linux. That closes the earlier local full-output verification gap for unchanged production code, while preserving the historical failed local evidence.323 real PostgreSQL route cases passed; the aggregate database job failed the one screenshot. No aggregate pass, hosted provider qualification or complete product is inferred.
