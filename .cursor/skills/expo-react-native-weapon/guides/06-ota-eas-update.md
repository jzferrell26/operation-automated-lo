# 06 - OTA via EAS Update

ACTION step 6 and directives 3, 4. Manage over-the-air updates: channels per build profile, the channel-vs-branch model, the runtimeVersion safety interlock, staged rollout, and the republish-don't-delete rollback. The headline rule: **an OTA ships JS and assets ONLY**. Demonstrated in `examples/02-ota-vs-rebuild-decision.md`.

Source notes: `research/eas-update-ota/2026-06-29-eas-update-how-it-works.md`, `research/eas-update-ota/2026-06-29-runtime-versions-policies.md`, `research/eas-update-ota/2026-06-29-eas-update-getting-started-channels.md`, `research/eas-update-ota/2026-06-29-ota-rollout-rollback-playbook.md` (practitioner; CLI commands flagged verify-before-publish).

## The JS-and-assets-only boundary (directive 3)

EAS Update splits an app into two layers:
- a **native layer** baked into the binary, and
- an **update layer** (JavaScript + assets) that is swappable with other compatible updates.

> "Native code changes require new builds. Updates cannot alter the binary's native layer." (official docs, `eas-update-how-it-works.md`)

So: a native module, a config-plugin change, an app-config native field, an SDK upgrade, or any native dependency change is a **new build**, never an OTA. Pushing a "native" change as an OTA does nothing on the old binary, or crashes it. This is the OTA-vs-new-build rule from `guides/00-principles.md`.

## Channel vs branch (the #1 concept to teach)

- A **channel** is what a binary subscribes to. It is set in `eas.json` and is **immutable per build**: once a binary ships subscribed to `production`, that is fixed.
- A **branch** is what you publish updates to (a list of updates, Git-branch-like).
- By default, a channel is linked to the branch of the same name. A channel can be re-pointed to any branch **without rebuilding**.

This is what lets you "promote the staging branch to the production channel" without a new binary. (Source: `eas-update-how-it-works.md`.)

For an update to reach a build, three things must match exactly: **platform**, **runtime version**, and the **channel-to-branch link**.

## Channels per build profile (directive 4)

Setup:

```sh
npx install-expo-modules@latest
eas update:configure
```

`eas update:configure` sets the default `runtimeVersion` policy (`appVersion`) and the `updates.url` in app config. Then add a `channel` to each build profile in `eas.json` (also in `guides/01-eas-build-profiles.md`):

```json
{
  "build": {
    "preview":    { "channel": "preview" },
    "production": { "channel": "production" }
  }
}
```

Publish:

```sh
eas update --channel [channel-name] --message "[message]" --environment [environment-name]
```

The channel name locates the linked branch to publish from. dev / preview / production parity is enforced by name-matching: the build profile's channel and the publish target must be the same name. `--branch` also exists (publish directly to a branch) for the advanced staging-then-promote path; `--channel` is the simple path.

## The runtimeVersion safety interlock (directives 3 and 4)

`runtimeVersion` is the compatibility key between a binary's native layer and an update. An update is only delivered to a build with a matching runtimeVersion. This is what stops an incompatible JS update from reaching an old binary and crashing it. Set it via a **policy** so it is computed (Source: `runtime-versions-policies.md`):

- **`appVersion`** (recommended default): runtime version tracks the app `version`. It is the `eas update:configure` default and is stable.
- **`fingerprint`**: recomputes the runtime version whenever anything that may impact the native runtime changes (config plugin added, SDK upgraded, native dep changed). The most precise option because it removes the human "was this a native change?" judgment, but described as experimental and not yet widely recommended in mid-2026. Adopt once stable.
- **`nativeVersion`**: tracks app version + build number.

The hard rule, verbatim:

> "any time native code is updated, we're required to make a new build before publishing an update." (official docs)

The decision rule to apply (also in `guides/00-principles.md`): touched native, a config plugin, an app-config native field, a native dep, or the SDK? -> new build + (with `appVersion`) bump `version`. Pure JS / asset change? -> OTA, same runtimeVersion.

## Staged rollout (ACTION step 6)

Publish at 0%, then ramp while watching health metrics. Practitioner cadence (Source: `ota-rollout-rollback-playbook.md`):

- 1% for ~1 hour (catch boot loops / crashes)
- 10% for 4 to 8 hours (OS / locale issues)
- 50% overnight (full timezone profile)
- 100%

Health gates before advancing the percentage: crash-free session-rate drop (> 0.3 pp), new error spikes (Sentry), login / checkout success-rate changes.

```bash
eas update --channel production-2-5 --message "fix: cart total rounding" --rollout-percentage 0
eas update:edit --rollout-percentage 1
eas update:edit --rollout-percentage 10
eas update:edit --rollout-percentage 100
```

## Rollback: republish, do not delete (the single most important OTA gotcha)

To roll back, **republish the last-good update group**. Do NOT delete the bad update, and do NOT just drop the rollout percentage.

```bash
eas update:list --branch production-2-5
eas update:republish --group <good-update-group-id> --message "rollback: revert cart rounding fix"
```

Why: users who already cached the bad bundle will not receive fixes from deleting it or lowering the percentage. Only a **newer good update** published to their channel reaches them. (Source: `ota-rollout-rollback-playbook.md`.)

## Per-release-train channels (mature pattern)

For apps that keep old binaries alive in the wild, use per-release-train channel names (`production-2-5`, `production-2-4`) rather than a single `production` channel. This lets you hotfix an older version while a new build is in store review. Present both: the simple env-named channel for small apps, the release-train pattern for apps with a long binary tail.

## Verify the CLI verbs before hardcoding

> TODO: re-fetch -- The rollout / rollback commands above (`eas update:edit`, `eas update:republish`, `eas update:rollback`, `--rollout-percentage`, `--branch`, `--group`) come from a practitioner agency blog. CLI flag names evolve. Confirm the exact current verbs and flags against the EAS CLI reference (`docs.expo.dev/eas/cli/` and `docs.expo.dev/eas-update/`) before hardcoding them in a deliverable. Flagged verify-before-publish in the research summary.

## SDK 55+ note

SDK 55+ ships ~75% smaller update downloads via Hermes bytecode diffing (Source: SDK anchor note). No config change needed; mention as a benefit when justifying the OTA path on a current SDK.

## Audit checklist for OTA

- [ ] `eas update:configure` has been run; `updates.url` and `runtimeVersion` policy present in app config.
- [ ] Each build profile has a `channel`; names match the publish targets.
- [ ] runtimeVersion policy is `appVersion` (or a documented reason for `fingerprint` / `nativeVersion`).
- [ ] The team knows the OTA-vs-new-build rule and applies it (no native changes shipped as OTA).
- [ ] Rollback procedure is republish-the-last-good, not delete.
- [ ] Staged rollout is used for production updates (not a blind 100%).
