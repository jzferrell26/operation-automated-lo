---
source_url: https://docs.expo.dev/eas-update/how-it-works/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: eas-update
weapon: expo-react-native-weapon
---

# How EAS Update works (official Expo docs)

## Summary
EAS Update splits an app into two layers: a NATIVE layer baked into the binary and an UPDATE layer (JavaScript + assets) that is swappable with other compatible updates. This is the JS-only boundary central to the Brief (directive 3). A binary subscribes to a CHANNEL (set in eas.json); a channel is linked to a BRANCH (an update repository, Git-branch-like). Default linkage: a channel is linked to the branch of the same name. For an update to be delivered to a build, three things must match exactly: platform, runtime version, and the channel-to-branch link.

## Key quotations / statistics
- EAS Update separates an app into "a native layer that's built into the app's binary, and an update layer, that is swappable with other compatible updates."
- Workflow: create builds with `eas build`; publish updates via `eas update --auto`; updates are matched to compatible builds through policy rules.
- Channel: "a name we can give to multiple builds to identify them easily." Branch: an EAS Update repository containing a list of updates, similar to a Git branch.
- "A channel can be linked to any branch. By default, a channel is linked to a branch of the same name."
- Matching requirements: "The platform of the build and the target platform of an update must match exactly" and "The runtime version of the build and the target runtime version of an update must match exactly."
- Runtime version "describes the JS-native interface defined by the native code layer." It must change only when "changes to our native code that change our app's JS-native interface" occur.
- Boundary: updates modify only the update layer (JS + assets). "Native code changes require new builds—updates cannot alter the binary's native layer." The native `expo-updates` library checks for and downloads updates matching the build's platform, runtime version, and linked channel.

## Annotations for weapon-forge
- Directly underwrites Brief directive 3 (OTA ships JS/assets ONLY; native/SDK/app-config change requires a new build) and directive 4 (channels must line up with build profiles).
- The channel-vs-branch distinction is the #1 conceptual thing the OTA guide must teach: channel = what a binary subscribes to (immutable per build); branch = what you publish to (re-pointable without rebuilding). This enables "promote staging branch to production channel" without a new binary.
- runtimeVersion is the safety interlock: a native change that alters the JS-native interface MUST bump runtimeVersion, otherwise an incompatible JS update could be served to an old binary and crash it. Cross-link the fingerprint runtimeVersion policy note.
- Pair with the practitioner rollout note for the 5% -> 100% staged-rollout production pattern (Brief ACTION step 6).
