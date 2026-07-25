---
source_url: https://expo.dev/changelog | https://dev.to/davekurian/react-native-ecosystem-advances-with-expo-sdk-56-and-react-192-updates-in-2026-3df5 | https://docs.expo.dev/guides/new-architecture/
retrieved_on: 2026-06-29
source_type: changelog
authority: official
relevance: critical
topic: sdk-version
weapon: expo-react-native-weapon
---

# Expo SDK version anchor and New Architecture status (mid-2026)

## Summary
As of June 2026 the current Expo SDK is **56** (beta/release dated May 21 2026), shipping React Native 0.85.2, Hermes v1 as the default JS engine, and React 19.2. The pivotal architectural fact for this weapon: starting with **SDK 55**, the legacy (old) React Native architecture was DROPPED and the New Architecture is the default and cannot be disabled. SDK 54 was the last SDK version where the New Architecture could be turned off. Any guide this weapon authors must assume New-Architecture-only for SDK 55+ and only mention `newArchEnabled` toggling as legacy advice for SDK 54 and earlier.

## Key quotations / statistics
- Expo (official X/changelog announcement): "Expo SDK 55 is here. React Native 0.83. React 19.2. Legacy Architecture dropped. New Architecture is the default. ... 75% smaller update downloads with Hermes bytecode diffing ... Expo Router v7 ... Brownfield isolation via expo-brownfield ... AI tooling: MCP + agent skills"
- "Expo SDK 56 was released as of May 21, 2026 ... Expo SDK 56 ships React Native 0.85.2, Hermes v1 as the default JavaScript engine."
- Expo New Architecture docs: "SDK 55 and later run entirely on the New Architecture, and the New Architecture is always enabled and cannot be disabled." "SDK 54 was the last SDK version where the New Architecture can be disabled."
- "React Native 0.85, released April 7, 2026, sets a new default as the first major version where the New Architecture isn't just optional, but assumed stable."
- Reported perf deltas (practitioner, treat as directional not guaranteed): "Android cold starts are 40% faster, iOS builds are 50%+ faster, and GC pause time drops 73%."

## Annotations for weapon-forge
- This is the version anchor for EVERY guide. Pin examples to SDK 54/55/56. State "New Architecture is mandatory from SDK 55" prominently.
- The OTA-relevant note "75% smaller update downloads with Hermes bytecode diffing" is an SDK 55+ EAS Update improvement; cross-reference in the EAS Update guide.
- Expo Router v7 is the SDK 55+ default router; pair with the navigation guide.
- "MCP + agent skills" and "expo-brownfield" are new SDK 55 capabilities; brownfield is out-of-scope for the app-layer greenfield focus but worth a one-line mention.
- Contradiction watch: older (SDK 53-era) blog posts still describe `newArchEnabled: true` as an opt-in flag in app.json. For SDK 55+ that flag is a no-op / removed. weapon-forge must not copy SDK-53 opt-in instructions into a current guide.
