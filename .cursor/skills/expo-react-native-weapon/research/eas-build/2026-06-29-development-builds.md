---
source_url: https://docs.expo.dev/develop/development-builds/introduction/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: eas-build
weapon: expo-react-native-weapon
---

# Development builds vs Expo Go (official Expo docs)

## Summary
A development build is a Debug build that includes the `expo-dev-client` library (a launcher UI + dev tooling). It is a full development environment for production-grade apps, in contrast to Expo Go, which is a fixed-library playground. The moment an app needs ANY custom native module, push notifications, or changed app config (icon/name/splash, deep links), Expo Go cannot run it and a development build is required. This maps directly to the eas.json `development` profile (`developmentClient: true`).

## Key quotations / statistics
- A development build is "a 'Debug' build of an app that includes the `expo-dev-client` library." It provides "inspecting network requests and a launcher UI for switching between development servers and app deployments."
- "Expo Go is a playground app for students and learners to get started quickly" with a fixed set of native libraries; "a development build is a fully featured development environment for working on your production-grade Expo apps."
- When required: (1) custom native libraries not in Expo Go (e.g. `react-native-firebase`) - "the required native code simply doesn't exist in Expo Go and cannot be added without rebuilding"; (2) remote push - "Remote push notifications ... are not [available in Expo Go]"; (3) app config changes - app icons/names/splash are "native assets ... shipped with the native bundle and are immutable once the app is installed"; (4) App/Universal Links.

## Annotations for weapon-forge
- Connects the EAS build profiles guide to the dev workflow: the `development` profile with `developmentClient: true` (from the eas.json note) PRODUCES a development build. Make this the first build a new app creates.
- Crucial teaching point: Expo Go is a starter sandbox; any serious app graduates to a development build the moment it adds a real native dependency. Do not let users believe their Expo-Go-tested app reflects the real binary - icons, push, native modules all behave differently.
- Reinforces directive 3: app config changes (icon/name/splash) are baked into the native bundle and immutable post-install -> they are a new BUILD, never an OTA.
- The `react-native-firebase` push case ties to the expo-notifications note's "needs a dev build" gotcha.
