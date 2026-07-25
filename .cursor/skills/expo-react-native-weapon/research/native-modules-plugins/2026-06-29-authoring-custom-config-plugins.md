---
source_url: https://docs.expo.dev/config-plugins/plugins/ | https://docs.expo.dev/config-plugins/mods/ | https://docs.expo.dev/modules/config-plugin-and-native-module-tutorial/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: medium
topic: config-plugins
weapon: expo-react-native-weapon
---

# Authoring custom config plugins with mods (official Expo docs)

## Summary
When a capability has no off-the-shelf config plugin, you write your own using MODS (modifiers): async functions imported from `expo/config-plugins` that mutate native files (Info.plist, AndroidManifest.xml, etc.) during prebuild. The two workhorses are `withInfoPlist` (iOS) and `withAndroidManifest` (Android); each receives the config, edits `config.modResults`, and returns it. Chain multiple mods in one plugin. Prefer mod plugins over touching top-level mods directly.

## Key quotations / statistics
- "Config plugins use mods (short for modifiers) to modify native project files during the prebuild process. Mods are asynchronous functions that allow you to make changes to platform-specific files such as AndroidManifest.xml and Info.plist."
- `withInfoPlist`: import `ConfigPlugin` and `withInfoPlist` from `expo/config-plugins`, define a value, edit `config.modResults` to add keys to Info.plist.
- `withAndroidManifest`: "an asynchronous function that accepts a config and a data object and modifies the value before returning an object"; use `AndroidConfig` helpers to push `meta-data` entries onto the main application.
- Combined plugins chain `withInfoPlist` and `withAndroidManifest` in a single exported `ConfigPlugin`.
- Guidance: "If you are developing a feature that requires mods, you should use mod plugins instead of interacting with top-level mods directly."

## Annotations for weapon-forge
- Satisfies the "config plugins authoring" expansion query. This is the escape hatch for Brief directive 1 when no library plugin exists: write a small custom plugin rather than hand-editing (and losing) native files.
- Minimal guide example to build: a `with<Feature>.ts` exporting a `ConfigPlugin` that adds an Info.plist key and an AndroidManifest meta-data entry, referenced in the app config `plugins` array as a local path.
- Reference pages for verbatim code before weapon-forge writes examples: `/config-plugins/plugins/`, `/config-plugins/mods/`, and the create-a-module-with-a-config-plugin tutorial. Flag: fetch these for exact import paths and the full code sample at build time.
- Keep this section MEDIUM priority - most apps only consume existing plugins; authoring is the advanced case. But it is the proof that "everything native is reachable declaratively."
