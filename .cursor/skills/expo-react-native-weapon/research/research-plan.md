# Research Plan: expo-react-native-weapon

- **Depth tier:** deep
- **Time window:** 2026-06-29 back to ~2025-12 (6 months), with the official Expo/RN docs treated as living-current authority regardless of publish date
- **Page budget target:** ~30-60 consumed pages distilled into per-source notes (deep tier; official-docs-heavy domain, so fewer but higher-authority sources than a community-heavy sweep)
- **Source breadth target:** official Expo docs (primary), official React Native docs, Expo changelog/blog, authoritative practitioner blogs, GitHub READMEs for offline-first libraries (WatermelonDB / op-sqlite / drizzle / PowerSync / TanStack Query), Expo Router vs React Navigation guidance
- **Tooling:** Firecrawl/Exa NOT connected this run. Using WebSearch + WebFetch. Official docs fetched and quoted verbatim.

## Version anchor (established up front)
- **Current Expo SDK: 56** (beta/release May 21 2026; ships React Native 0.85.2, Hermes v1 default, React 19.2).
- **SDK 55** dropped the legacy architecture: New Architecture is the default and cannot be disabled from SDK 55 onward. SDK 54 was the last SDK where New Architecture could be disabled.
- Notes written against SDK 54/55/56 as the live band; older SDK-53-era material flagged as such.

## Initial queries (from session-zero / Command Brief)
- "Expo EAS build profiles eas.json dev preview production 2026"
- "Expo SDK native modules expo-camera SecureStore expo-notifications 2026"
- "React Native offline-first sync patterns 2026"
- "Expo app.json config bundle id permission strings 2026"
- "Expo OTA updates EAS Update rollout 2026"
- "Expo React Native monorepo metro config production gotchas 2026"
- "Expo Router vs React Navigation decision 2026"

## Expansion queries (authored by loremaster, deep tier)
### Branch from "current SDK / New Architecture"
- "current Expo SDK version 2026 release New Architecture default"
- "Expo SDK 56 changelog React Native 0.85 Hermes v1"

### Branch from "EAS Update OTA"
- "Expo OTA updates EAS Update channels branches rollout 2026"
- "EAS Update runtimeVersion policy fingerprint native boundary"

### Branch from "native modules / plugins"
- "Expo config plugins authoring withPlugins mods 2026"
- "expo-secure-store vs AsyncStorage Keychain Keystore secrets"
- "expo-camera expo-notifications permission usage strings iOS Android"

### Branch from "offline-first"
- "WatermelonDB vs op-sqlite vs PowerSync vs TanStack Query offline sync 2026"
- "React Native offline-first conflict resolution optimistic update queue"

### Branch from "monorepo / metro"
- "Expo monorepo metro config watchFolders nodeModulesPaths pnpm symlink"
- "Expo metro production build gotchas EAS monorepo"

### Branch from "navigation"
- "Expo Router v7 file-based routing vs React Navigation 2026"

## Subfolder map
- `eas-build/` - eas.json profiles, build configuration, EAS CLI
- `eas-update-ota/` - EAS Update, channels/branches, rollouts, runtimeVersion
- `native-modules-plugins/` - config plugins, expo-camera/secure-store/notifications, permissions
- `app-config/` - app.json / app.config, bundle ids, permission strings, icons/splash, plugins array
- `navigation/` - Expo Router vs React Navigation
- `offline-first/` - local store + sync libraries and patterns
- `monorepo-metro/` - metro config, monorepo wiring, production gotchas
- `sdk-new-architecture/` - SDK version anchor, New Architecture, RN release cadence
