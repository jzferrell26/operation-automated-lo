# Financing fixture clean-import repair

Date: 2026-10-14. Implementation owner: db-guardian. Base: `5f7f0511fbb26558a1da2d8ed6ad410c060fcdea`, branch `codex/property-marketing-release`, PR #98.

The shared financing test fixture now imports `@oalo/application` and `@oalo/contracts`. The existing Vitest aliases resolve these packages to source before builds; ordinary Node execution resolves their existing package exports to compiled output after the established build sequence. Only these two import specifiers and the formatter-required layout of the application import changed. Fixture functions, synthetic evidence, assertions, runtime source, migrations, scripts, dependencies, and gates are unchanged.

## Observed CI failure

[Application verification job 115741733050, run 38530731265](https://github.com/jzferrell26/operation-automated-lo/actions/runs/38530731265/job/115741733050) failed on the clean Linux checkout. Job metadata and its raw log were retrieved using:

```powershell
gh api repos/jzferrell26/operation-automated-lo/actions/jobs/115741733050
gh api repos/jzferrell26/operation-automated-lo/actions/jobs/115741733050/logs
```

The job log records `tooling/tests/unit/financing-release-database.test.ts` failing to import `../../application/dist/index.js` from `packages/db/test/financing-release-fixture.mjs` at 07:50:43 UTC. It reports 209 passed suites, one failed suite, and 3213 passed tests. The second eager relative dependency on contracts output had the same build-order dependency. Raw log copy: `tmp/financing-clean-import-2026-10-14/ci-115741733050.log`, lines 907-933.

## Isolated RED and GREEN proof

An ignored temporary tree contains an exact fixture copy at `tmp/financing-clean-import-2026-10-14/isolated/packages/db/test/financing-release-fixture.mjs`. Its relative application, contracts, and database `dist` directories do not exist. Shared generated outputs were never removed, moved, or rebuilt during this repair.

The temporary configuration imports the root `vitest.config.ts` and reuses its `resolve` object unchanged. It selects only the temporary probe in the existing Node environment. The probe imports actual fixture functions, constructs and schema-validates a calculated financing source, verifies the manifest hash and calculation version, binds a preparation request to source authority, and constructs admission provenance for every evidence kind. Its first assertion verifies absence of all three relative output directories. This verifies actual module evaluation and fixture behavior, beyond matching import text.

The identical command was run before and after the source edit:

```powershell
pnpm exec vitest run --config tmp/financing-clean-import-2026-10-14/vitest.config.ts
```

- RED: original fixture copy, exit 1, missing `../../application/dist/index.js`, zero tests collected. This reproduces the CI failure without changing shared outputs.
- GREEN: updated exact fixture copy, exit 0, four tests passed. Repeated after import formatting, four tests passed again.

Temporary probe pins:

| File                                                     | SHA-256                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `tmp/financing-clean-import-2026-10-14/vitest.config.ts` | `8e048e1054e13481f53a6e2e6cbafef74d6ebdf5bc055a20fc16dcbc81b5a9b4` |
| `tmp/financing-clean-import-2026-10-14/probe.test.ts`    | `40151aa739378e9555a9333f4a38c54e297e8c4d34f8ee10e0813213e1939a45` |

## Existing qualification checks

All commands ran in the property-marketing-release worktree on Node 24.18.0, pnpm 11.15.1, and Vitest 4.1.11:

| Command                                                                                     | Result                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `pnpm exec vitest run --project unit tooling/tests/unit/financing-release-database.test.ts` | Exit 0, 27 tests passed                  |
| `node --test packages/db/test/financing-release-repository.test.mjs`                        | Exit 0, 21 tests passed, zero skipped    |
| `pnpm --filter @oalo/db typecheck`                                                          | Exit 0                                   |
| `pnpm exec tsc --noEmit -p tsconfig.tooling.json`                                           | Exit 0                                   |
| `pnpm exec prettier --check packages/db/test/financing-release-fixture.mjs`                 | Exit 0 after import layout normalization |
| `pnpm exec oxlint packages/db/test/financing-release-fixture.mjs`                           | Exit 0                                   |
| `git diff --check`                                                                          | Exit 0                                   |

The nine other original persistence implementation/test pins and the original persistence handoff match HEAD byte-for-byte. Prior Security and Quality reports and the frozen policy foundation were not edited. Other agents' untracked output implementation files were preserved.

## Release pin and remaining verification

`packages/db/test/financing-release-fixture.mjs` SHA-256:

```text
4a4238d57ed3719549a493370593c7e11b524509639a3c7e4db04c8ae020ba46
```

Previous fixture SHA-256: `057bba6e70dba4f09d70a9c88fc58131e021a33fd2fe1b3bb7a086a1f6b066c4`.

This bounded test-only change is ready for the parent's fresh Security review, then Quality review, then full CI rerun. The recorded CI run is still failed; local checks do not claim a successful rerun or actual PostgreSQL qualification. No commit, push, provider operation, or deployment was performed.
