---
source_url: https://docs.expo.dev/eas-update/runtime-versions/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: eas-update
weapon: expo-react-native-weapon
---

# Runtime versions and updates (official Expo docs)

## Summary
The runtimeVersion is the compatibility key between a binary's native layer and an OTA update; an update is only delivered to a build with a matching runtimeVersion. You set it via a POLICY object in app config (`"runtimeVersion": { "policy": "..." }`) so it is computed rather than hand-managed. The two policies surfaced verbatim: `appVersion` (runtime version tracks the app `version`) and `fingerprint` (runtime version recomputed whenever anything that may impact the native runtime changes). The hard rule: any time native code is updated, a new BUILD is required before publishing an update.

## Key quotations / statistics
- `appVersion` policy: "The `appVersion` policy will increment the runtime version whenever the app version is incremented."
- `fingerprint` policy: "you can use the `fingerprint` policy. This will increment the runtime version whenever anything that may impact the native runtime changes."
- Core rule: "any time native code is updated, we're required to make a new build before publishing an update."
- (From the companion search result, sdk/updates docs) "by default, `eas update:configure` will set `"runtimeVersion": { "policy": "appVersion" }` in your app config, which will ensure that the runtime version of your app is always the same as the app version." The `fingerprint` policy "automatically calculates the runtime version for you, including through changes like SDK upgrades or adding custom native code" but is described as "experimental and not yet widely recommended" in mid-2026 community guidance.
- Full policy list lives in the expo-updates library docs (`/versions/latest/sdk/updates/#automatic-configuration-using-runtime-version-policies`); `nativeVersion` is the third policy (tracks app version + build number).

## Annotations for weapon-forge
- This is the safety-interlock guide content. runtimeVersion is what stops an incompatible JS update from reaching an old binary and crashing it (Brief directive 3/4).
- Recommend `appVersion` as the default policy for most apps (it is the eas update:configure default and is stable). Document `fingerprint` as the more precise but experimental option that auto-bumps on any native-affecting change (config plugin added, SDK upgraded, native dep changed) - the best fit once stable because it removes human error in deciding "was this a native change".
- The decision rule to teach: "Did my change touch native code, a config plugin, app config native fields, or the SDK? -> new build + (with appVersion) bump version. Pure JS/asset change? -> OTA, same runtimeVersion."
- Cross-link how-it-works note and the rollout note.
