---
source_url: https://docs.expo.dev/guides/new-architecture/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: new-architecture
weapon: expo-react-native-weapon
---

# React Native New Architecture in Expo (official Expo docs)

## Summary
The New Architecture is a complete refactor of React Native's internals (Fabric renderer, TurboModules, JSI, Bridgeless mode). The SDK-by-SDK enablement is the load-bearing fact for this weapon: SDK 55+ runs ENTIRELY on the New Architecture with no off-switch; SDK 54 is the LAST SDK that can disable it; SDK 53/54 enable it by default; SDK 52 needs an explicit `newArchEnabled` flag. Library compatibility is checked at reactnative.directory and validated with `npx expo-doctor`.

## Key quotations / statistics
- "SDK 55 and later run entirely on the New Architecture. The New Architecture is always enabled and cannot be disabled." "There is no option to disable it. SDK 55 uses React Native 0.83."
- "SDK 54 is the last SDK version where the New Architecture can be disabled."
- "The New Architecture is enabled by default in SDK 53 and SDK 54."
- SDK 52: "To enable it on both Android and iOS, use the `newArchEnabled` at the root of the `expo` object in your app config."
- Compatibility: use React Native Directory (reactnative.directory) to track New-Architecture compatibility; run `npx expo-doctor@latest` to validate project dependencies.

## Annotations for weapon-forge
- Pair with the SDK version anchor note; together they fix the version band for every guide. State plainly: "On SDK 55+ the New Architecture is mandatory - there is no `newArchEnabled: false`."
- The practical risk to flag: a third-party native library that hasn't migrated to the New Architecture will break on SDK 55+. The audit step is `npx expo-doctor` + checking reactnative.directory before upgrading. This belongs in an "upgrade / audit" guide section.
- Contradiction watch (repeat from anchor note): SDK 51/52-era tutorials show `newArchEnabled` as opt-in; that is obsolete for current SDKs. weapon-forge must not present it as a choice for SDK 55+.
- Define the four pillars briefly for the guide even though this page defers: Fabric (new renderer), TurboModules (lazy native modules), JSI (direct JS<->native, replaces the bridge), Bridgeless (no legacy bridge).
