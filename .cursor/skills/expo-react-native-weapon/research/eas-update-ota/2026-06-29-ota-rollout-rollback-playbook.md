---
source_url: https://www.72technologies.com/blog/eas-update-ota-strategy-channels-rollouts-rollbacks
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: high
topic: eas-update
weapon: expo-react-native-weapon
---

# EAS Update production OTA playbook: rollouts, rollbacks, channels (2026 practitioner)

## Summary
A concrete production OTA discipline: publish at 0%, then ramp staged rollout percentages while watching health metrics, and roll back by REPUBLISHING the last-good update (never by deleting the bad one). Use per-release-train channel names rather than environment names so you can hotfix old binaries while a new build is in store review. This operationalizes Brief ACTION step 6.

## Key quotations / statistics
- Staged rollout cadence: "1% for 1 hour" (catch boot loops/crashes) -> "10% for 4-8 hours" (OS/locale issues) -> "50% overnight" (full timezone profile) -> "100%".
- Publish then ramp:
```bash
eas update --channel production-2-5 --message "fix: cart total rounding" --rollout-percentage 0
eas update:edit --rollout-percentage 1
eas update:edit --rollout-percentage 10
eas update:edit --rollout-percentage 100
```
- Rollback - DON'T delete bad updates; republish the previous good group:
```bash
eas update:list --branch production-2-5
eas update:republish --group <good-update-group-id> --message "rollback: revert cart rounding fix"
```
- "users who cached the bad bundle won't receive fixes from simply rolling back percentages - they need a newer update published to their channel."
- Channel architecture: "Use per-release-train naming (`production-2-5`, `production-2-4`) rather than environment-based channels. This allows hotfixes to older versions while newer builds are in review."
- Health gates before advancing %: crash-free session drop (>0.3 pp), new Sentry error spikes, login/checkout success-rate changes.

## Annotations for weapon-forge
- This is the OTA "safe deploy" guide content. The republish-don't-delete rollback rule is the single most important operational gotcha: deleting a bad update or dropping the rollout % does NOT heal devices that already cached the bad bundle; only a NEW good update reaches them.
- Pair the staged-rollout ladder with the runtimeVersion safety note and the how-it-works channel/branch note.
- Per-release-train channels (`production-2-5`) vs simple env channels (`production`): present both; the release-train pattern is the mature option for apps that keep old binaries alive in the wild.
- This is a practitioner (agency blog) source; commands like `eas update:edit`, `eas update:republish`, `eas update:rollback` should be confirmed against the EAS CLI reference before weapon-forge hardcodes them in a guide (CLI flag names evolve). Flag as verify-before-publish.
