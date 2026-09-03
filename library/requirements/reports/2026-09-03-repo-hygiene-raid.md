# GitHub Repo Health + Hygiene Raid

**Date:** 2026-09-03
**Auditor / implementer:** `github-repo-health-guardian` (audit) + orchestrator (in-repo fixes)
**Repo:** `jzferrell26/operation-automated-lo`
**Data collection:** local clone + `gh` CLI
**Base tip before raid:** `56d90f6`

## Scope

Close reverse-review Mediums that are pure hygiene while Wave 1 remains parked on HighLevel app approval:

| ID | Item | Outcome |
| --- | --- | --- |
| M3 | Broken ledger generator path | Fixed to `library/requirements/in-work/...`; default output is `tmp/generated-production-execution-ledger.md` (requires `--write-canonical` to overwrite the live ledger) |
| M4 | Next.js middleware deprecation | Renamed to `apps/web/src/proxy.ts` (`export function proxy`) |
| M5 | Security follow-ups untracked | Watchdog + process table in `NEXT_BATCH_LEDGER.md` |
| M20 | Templates / Dependabot / squash story | PR + issue templates + Dependabot YAML added |

## Dimension snapshot (post-fix)

| Dimension | Notes |
| --- | --- |
| Branch protection | Ruleset `Repository hygiene baseline` active; requires 4 CI contexts; linear history; PR required |
| Merge settings | Squash + rebase allowed; merge commits disabled; auto-delete on. **Human:** disable rebase + set ruleset `allowed_merge_methods: ["squash"]` (agent PATCH returned 403) |
| Templates | PR template + bug/feature issue forms + `config.yml` |
| Dependabot | `.github/dependabot.yml` for npm + GitHub Actions weekly |
| CODEOWNERS | Still solo `@jzferrell26` (honest for current ownership; no invented teams) |
| CI density | Phase 0 CI present and required |

## Human actions still required

1. GitHub Settings > General: disable **Allow rebase merging**.
2. Ruleset `Repository hygiene baseline`: set allowed merge methods to **squash only**.
3. Confirm Dependabot alerts/security updates enabled for the private repo (org/security product dependent).
4. Unchanged critical path: HighLevel app approval, then Wave 1 App Test.

## Honesty bounds

No deferred ACs flipped. No production traffic. No invented live evidence.
