# Financing PDF assertion correction Security review

**Reviewer:** independent security-guardian. **Date:** October 13, 2026, America/Chicago. **Branch:** `codex/completion-integration`, PR 95. **Base head:** `26ace47516e5c250e931b6d042d8c8942422188e`, plus the bounded uncommitted correction below.

## Executive summary

PASS for fresh Quality on this test-only correction. No new Critical, High, Medium or Low security finding detected. Independent execution passed all 16 existing financing output cases. Five independent negative controls using real production PDF rendering and PNG decoding each failed at the corrected comparison, proving sensitivity to first, middle and final byte changes, truncation and extension. No tracked source or test was changed by this reviewer.

This clearance does not turn a failed CI run into a pass. Corrected-head combined CI remains required. The previously qualified combined production source is unchanged; the prior Security review and stale CVE-intelligence qualification remain applicable, without claiming a new dependency, hosted or whole-product audit.

## Scope and ordering

Read the native Security configuration, retained managed Weapon/procedures, exact Git diff, complete affected PDF test and the implementation owner's diagnosis/evidence. The sole executable delta at `apps/web/src/server/financing-output-layout.unit.test.ts:240-241` adds an explanatory comment and replaces generic Buffer deep equality with:

```ts
expect(Buffer.from(decodePDFRawStream(png!).decode()).equals(pixels)).toBe(true);
```

The previous combined Quality report certifies an earlier tree and does not certify this new assertion. The parent explicitly sequences this fresh Security pass before a new Quality pass. No production remediation occurred after that prior Quality report. Ownership is only this new report and ignored audit scratch; other agents' files were preserved. No commit, push, hosted/provider operation or deployment occurred.

## Scorecard and findings

| Category                           | Disposition                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Financial/payment security         | None detected. Saved financial calculations and text assertions remain unchanged.                                       |
| PII and secrets                    | None detected. Images, names and records in these tests remain synthetic; no new logging or client storage.             |
| Authentication/authorization       | None detected. Actual handler/page auth and media revocation cases are preserved.                                       |
| Injection/input handling           | None detected. No new request, query, URL or rendering sink.                                                            |
| Dependency/configuration/transport | None detected or changed. No dependency, timeout, worker policy, coverage threshold, CI gate or response-header change. |
| Data integrity                     | None detected. Whole decoded byte equality is preserved and independently challenged.                                   |

Critical findings: None detected. High findings: None detected. Medium findings: None detected. Low findings: None detected. No remediation or exception was required.

## Exactness and independent negative proof

The source `pixels` remains the full independently decoded normalized PNG Buffer from `sharp(media[1]!.bytes).removeAlpha().raw().toBuffer()`. The actual PDF image stream remains decoded by `decodePDFRawStream(png!).decode()` before the complete resulting Buffer is compared. Neither side is sampled, sliced, rounded, tolerated or replaced with a mocked renderer. Equality requires the entire byte sequence and length to match.

All five parameterized scenario counts still render the actual PDF twice, check PDF byte determinism, portrait/landscape dimensions, exact two image XObjects, embedded JPEG hash, complete financial text, disclosure, validity and creator metadata. Only the PNG equality mechanism changes. The surrounding 16-case suite retains legacy output hashes, ordered/inert HTML bytes, missing/corrupt/reordered bundle refusal, authenticated private output and revocation, zero-photo behavior, output/concurrency limits and connected-account storage refusal.

Independent negative testing used a copy of the reviewed test in the ignored audit directory, preserving actual fixture construction, production imports, both PDF renders and PDF decode. Relative imports were resolved to the original production modules. A scratch configuration selected only the five XObject cases; no tracked configuration or test was edited. The expected pixels were deliberately changed once per scenario:

| Scenario | Deliberate mutation | Actual result                      |
| -------- | ------------------- | ---------------------------------- |
| 1        | First byte flipped  | Comparison false; assertion failed |
| 2        | Middle byte flipped | Comparison false; assertion failed |
| 3        | Final byte flipped  | Comparison false; assertion failed |
| 4        | One byte removed    | Comparison false; assertion failed |
| 5        | One byte appended   | Comparison false; assertion failed |

The actual negative run reports five failed cases at `expected false to be true`, 1.95 seconds test time, exit 1. Its eleven unselected cases are test-name-filter exclusions in this deliberately RED scratch run, not skips added to the reviewed suite. An initial scratch invocation failed module resolution for the web-only `pdf-lib` dependency and executed no tests. That invocation is retained separately and supplies no negative-test credit. Resolving that same dependency from the original web test module produced the actual five-case RED evidence. The original reviewed file hash stayed unchanged throughout.

## Independently executed checks

| Check                                                 | Result                                                                                                        | Ignored evidence                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Actual reviewed financing output file, two workers    | One file, all 16 cases passed, 19.00 seconds total, exit 0                                                    | `test-results/security-integration/pdf-correction-focused.log` |
| Actual PDF negative controls in isolated scratch copy | Five intended assertion failures, 1.95 seconds test time, exit 1                                              | `pdf-correction-negative-red-resolved.log`                     |
| Initial scratch resolution attempt                    | No tests executed; failed module resolution, not credited                                                     | `pdf-correction-negative-red.log`                              |
| Production/conflict/baseline provenance recheck       | All 45 prior production/consequential pins, four conflict pins and 24 released baseline originals still match | `source-provenance.json`                                       |
| Frozen correction and diagnosis pins                  | Both supplied SHA-256 digests independently match                                                             | Table below                                                    |
| Diff hygiene and scope                                | `git diff --check` passed; executable diff exactly two added lines/one removed line in the one test file      | Git inspection                                                 |

The implementation owner's measured comparison timing is diagnostic evidence, not an independently repeated performance benchmark. The reviewer inspected the retained full bounded-coverage log: 207 files and 3,100 cases passed in 117.58 seconds with unchanged package thresholds. It also inspected the separately retained default-worker failure, which reports four other 5,000 ms timeouts and is not presented as a pass. These broader runs belong to the implementation owner; this reviewer ran the 16-case selection and independent negative controls above.

## Remaining gates and handoff

No new architectural security follow-up is required. The original CI App failure remains failed evidence. This report does not certify the original PostgreSQL job's current result, a corrected-head combined CI pass, hosted storage, provider effects or project completion. Fresh Quality must review this exact assertion and diagnosis packet, followed by the root's actual final-head CI and repository/mergeability gates.

| Frozen file                                                                            | SHA-256                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/server/financing-output-layout.unit.test.ts`                             | `95052e3300737235a7c14dff2e8d6dd664de71ee2b352dfa5dbf827a6ce2509f` |
| `library/requirements/reports/2026-10-13-completion-integration-pdf-test-diagnosis.md` | `57e282cc8ce556598c75bb5d984e59491de5c4f0e193d1e37498c797cc7cc65c` |

Only this new report was authored. Report and scratch-runner ownership are released to the parent for fresh Quality.
