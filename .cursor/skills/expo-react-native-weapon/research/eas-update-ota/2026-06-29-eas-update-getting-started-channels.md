---
source_url: https://docs.expo.dev/eas-update/getting-started/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: eas-update
weapon: expo-react-native-weapon
---

# Get started with EAS Update: channels in eas.json + publishing (official docs)

## Summary
Setup is: install the updates module, run `eas update:configure`, add a `channel` to each build profile in eas.json, then publish with `eas update`. The `channel` per build profile is what wires dev/preview/production binaries to their matching update streams (Brief directive 4). Publishing locates the branch via the channel name.

## Key quotations / statistics
- Channel per build profile in eas.json:
```json
{
  "build": {
    "preview": {
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  }
}
```
- Install + configure commands:
```sh
npx install-expo-modules@latest
eas update:configure
```
- Publish command:
```sh
eas update --channel [channel-name] --message "[message]" --environment [environment-name]
```
- "generates a new update bundle and uploads it to the EAS servers. The channel name is used to locate the correct branch to publish a new update from other update branches."

## Annotations for weapon-forge
- This closes the loop on Brief ACTION step 1 + directive 4: each eas.json build profile gets a matching `channel`, and the same names appear when publishing. dev/preview/production parity is enforced by name-matching channel <-> branch.
- Note for the guide: `eas update:configure` also sets the default `runtimeVersion` policy (`appVersion`) and the `updates.url` in app config. Show the full before/after of eas.json and app.config.
- A `--branch` flag also exists on `eas update` (publish directly to a branch); the docs getting-started path emphasizes `--channel`, which resolves to the linked branch. weapon-forge can present `--channel` as the simple path and `--branch` as the advanced (staging-branch-then-promote) path.
- Cross-link the rollout note for the staged `--rollout-percentage` deploy.
