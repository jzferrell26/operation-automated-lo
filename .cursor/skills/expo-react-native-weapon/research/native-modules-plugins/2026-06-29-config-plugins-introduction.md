---
source_url: https://docs.expo.dev/config-plugins/introduction/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: config-plugins
weapon: expo-react-native-weapon
---

# Config plugins introduction (official Expo docs)

## Summary
A config plugin is a custom configuration point (not built into the base app config) made of one or more JS plugin functions ("mods") that run during `npx expo prebuild` to modify the native iOS/Android projects in a predictable, regenerable way. They exist so that, under Continuous Native Generation (CNG), native changes live in the app config rather than in hand-edited native folders, which would be silently overwritten on the next prebuild. Plugins are referenced in the `plugins` property of the app config and conventionally named `with<Functionality>`.

## Key quotations / statistics
- A config plugin is "a top-level custom configuration point that is not built into the app config." It is "made up of one or more plugin functions."
- Why they exist (CNG): "In CNG projects, it is best to avoid modifying these native projects manually, because you cannot regenerate them safely without potentially overwriting manual modifications." Plugins let you "modify these native projects in a predictable way by consolidating your native project changes into a configuration file."
- Plugins are "referenced in the `plugins` property of the app config file."
- Naming convention: "Plugins should be named using the following convention: `with<Plugin Functionality>`" (e.g. `withFacebook`).
- The hand-editing warning: manual edits to native directories get lost during regeneration; config plugins ensure modifications occur predictably "when you run `npx expo prebuild`" rather than through manual file edits that would be overwritten.

## Annotations for weapon-forge
- This is the doctrinal source for Brief directive 1: native modules go through their config plugins, not hand-edited native code; if you must touch native it is a prebuild + a new binary, not an OTA.
- Teach the mental model: app config (declarative) -> `expo prebuild` (CNG) -> native projects (disposable, gitignorable). Editing android/ios directly breaks this and is lost.
- Most Expo SDK native modules ship a config plugin that takes props (permission strings, entitlements). The plugins array accepts either a string (plugin with defaults) or `["plugin-name", { ...props }]`.
- For capabilities with no off-the-shelf plugin, the guide can show a minimal custom plugin using `withInfoPlist` / `withAndroidManifest` mods. This satisfies the "authoring config plugins" expansion query.
- Contradiction watch: tutorials that say "run expo eject" use deprecated terminology; the current path is `npx expo prebuild` (and bare vs managed is now "CNG vs not"). Flag old eject references.
