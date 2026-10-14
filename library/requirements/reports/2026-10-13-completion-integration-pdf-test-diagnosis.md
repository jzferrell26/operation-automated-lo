# Financing PDF assertion timeout diagnosis

## Scope and outcome

This correction belongs to PR 95's combined integration branch, based on `26ace47516e5c250e931b6d042d8c8942422188e`. It changes one assertion and adds one explanatory comment in `apps/web/src/server/financing-output-layout.unit.test.ts`. No renderer, fixture construction, production code, global test configuration, timeout budget or coverage threshold changes.

Application verification in CI run `38507742358` timed out in four of the five image XObject cases at their unchanged 5,000 ms test budget. The failure affected scenario counts 1, 2, 4 and 5. That job reported 3,096 passing tests. The release job succeeded; the separate PostgreSQL job was still running during diagnosis.

## Measured cause

Each case normalizes and saves two real synthetic images, creates a financing report, renders the actual PDF twice to check determinism, parses the PDF, and compares its decoded PNG bytes against independently decoded normalized source pixels. The PNG fixture is 600 by 400 pixels with three channels, or exactly 720,000 bytes.

The old comparison used Vitest's generic deep object equality on that Buffer. The installed `@vitest/expect` 4.1.11 implementation enumerates object keys and recursively compares members (`dist/index.js`, lines 359 to 374 and 398 to 406). Temporary stage probes measured this assertion, including the actual PDF PNG decode, as the dominant cost. All diagnostic probes were removed from the final file.

| Scenario count | Old assertion milliseconds | Exact Buffer comparison milliseconds | Old fixture milliseconds | New fixture milliseconds |
| -------------- | -------------------------: | -----------------------------------: | -----------------------: | -----------------------: |
| 1              |                    1,748.0 |                                  4.8 |                    255.0 |                    248.4 |
| 2              |                    1,581.3 |                                  2.9 |                    149.0 |                    162.6 |
| 3              |                    1,305.6 |                                  1.5 |                    161.4 |                    175.4 |
| 4              |                    1,416.2 |                                  1.7 |                    151.4 |                    146.3 |
| 5              |                    1,195.7 |                                  1.9 |                    139.3 |                    144.3 |

Both profiles ran the same five real PDF cases with CLI `--maxWorkers=2`. The old test bodies took 8.79 seconds total; corrected test bodies took 1.49 seconds total. Import/startup times differ, so those are not used to claim a rendering speed improvement. The production renderer is unchanged. The profile isolates the assertion overhead and supports CPU contention as the explanation for those cases crossing their budget in the full runner.

Logs: `test-results/integration/pdf-timeout-diagnosis/old-profile.log` and `new-profile.log`.

## Exactness and negative controls

The corrected assertion calls `Buffer.equals` on the entire decoded image and independently decoded source Buffer, then asserts `true`. This still compares every byte and the complete length. It uses no sampling, tolerance, partial hash or mock of the renderer.

All existing image count, JPEG content hash, PDF determinism, portrait/landscape, saved text, disclosure, validity and metadata assertions remain intact for all five scenario counts. Both actual PDF renders remain in each case. Fixture isolation and cleanup remain intact.

Five temporary negative controls were applied to the expected pixels while the actual production PDF decode remained real:

1. Flip the first byte.
2. Flip the middle byte.
3. Flip the final byte.
4. Remove one byte.
5. Append one byte.

All five cases failed at the corrected exact-byte assertion with `expected false to be true`, in 1.88 seconds total test time. The negative-control invocation is deliberately RED and is not counted as a passing suite. The temporary mutations were removed before final verification. Evidence: `test-results/integration/pdf-timeout-diagnosis/native-mutation-red.log`.

## Broader verification and limits

The exact default `pnpm test:unit` invocation was then run alone on this local machine, which exposes 16 available processors. It reported 3,096 passing tests and four different 5,000 ms timeouts across three files: two filesystem source-scan cases and two financing rights/output cases. The five original image XObject cases did not fail. This separate invocation is retained as a failure, not presented as a pass. An additional integrity refusal appeared in the same timed-out test invocation; its separate cause was not established in this bounded correction. Evidence: `test-results/integration/pdf-timeout-diagnosis/full-unit-coverage.log`.

A serial `pnpm exec vitest run --project unit --coverage --maxWorkers=2` retry passed all 3,100 tests across 207 files in 117.58 seconds, exit 0. All unchanged per-package coverage thresholds passed. Aggregate coverage remains 88.87% statements, 85% branches, 91.59% functions and 89.85% lines. All 16 financing output tests passed, including the four differing local timeout cases in their owning files. Evidence: `test-results/integration/pdf-timeout-diagnosis/bounded-unit-coverage.log`.

Typecheck passed all 16 workspace tasks plus the tooling compiler. Scoped lint passed. The final file contains no timing probes or mutation controls. Its SHA-256 is `95052e3300737235a7c14dff2e8d6dd664de71ee2b352dfa5dbf827a6ce2509f`.

All assertions, timeouts and coverage thresholds remain unchanged. No global worker policy was changed. At final observation, the original run's PostgreSQL job remained in progress, its release job had passed and its application job had failed. Combined CI qualification remains required after independent Security and fresh Quality review; this diagnosis does not claim that run is green.

No commit, push, provider operation, hosted migration or deployment was performed by this correction task.
