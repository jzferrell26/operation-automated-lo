---
name: expo-react-native-weapon
description: Gets an Expo / React Native app build-ready (the app layer, not the listing). Configures EAS build profiles in eas.json (dev / preview / production with matching update channels), wires native modules through their config plugins (expo-camera, expo-secure-store, expo-notifications) with the required iOS Info.plist usage strings and Android permissions, sets app.json / app.config (bundle id / package, version + build number, icons / splash, scheme, plugins array), structures navigation (Expo Router file-based vs React Navigation), implements offline-first patterns (local store + sync queue, optimistic updates, conflict handling), manages OTA via EAS Update (channels per profile, staged rollout, the JS-and-assets-only boundary, runtimeVersion), and wires metro for a monorepo. Pinned to Expo SDK 56 (RN 0.85.2, Hermes v1, React 19.2); New Architecture is mandatory at SDK 55+. Use when the user says "set up EAS", "configure eas.json build profiles", "wire expo-camera / expo-notifications / secure-store", "set up app.json / app.config", "Expo Router or React Navigation", "make this app work offline", "configure OTA / EAS Update", "ship an OTA update", "fix my Expo monorepo metro build", "audit my Expo config", or when expo-react-native-guardian is invoked. Do NOT use for app-store listing / ASO / IAP / submission (app-store-submission-guardian), React WEB architecture (react-guardian), or native game development (the Unity cohort).
---

# Expo / React Native Weapon

You get an Expo / React Native app **build-ready**: the configuration and code that turns an RN codebase into a correctly building, OTA-updatable, store-ready binary. You hand the finished build to `app-store-submission-guardian` for listing, ASO, IAP, and submission. You do not own React web (route to `react-guardian`) or native games (route to the Unity cohort).

Read `guides/00-principles.md` FIRST. It carries the version pin and the seven critical directives that govern every other guide. Do not author config against an SDK band you have not confirmed.

## The version pin (load-bearing, non-negotiable)

Pin everything to **Expo SDK 56** (current as of June 2026): React Native 0.85.2, Hermes v1, React 19.2. The **New Architecture is mandatory at SDK 55+** (always on, cannot be disabled; SDK 54 was the last that could disable it). Expo Router v7 is the SDK 55+ default router. Source: `research/sdk-new-architecture/2026-06-29-expo-sdk-version-anchor.md`, `research/sdk-new-architecture/2026-06-29-new-architecture-official.md`.

Anti-pattern, flag on sight: copying SDK-51/52-era `newArchEnabled: true` opt-in instructions into a current config. On SDK 55+ that flag is a no-op / removed. There is no `newArchEnabled: false`. See `guides/00-principles.md`.

## The seven critical directives (summary; full text in `guides/00-principles.md`)

1. Native modules go through their **config plugins**, never hand-edited native code. If you must touch native, that is a `prebuild` + a new binary, not an OTA.
2. Every native capability needs its **permission string**: iOS Info.plist usage descriptions and Android permissions, supplied in app config.
3. OTA (EAS Update) ships **JS and assets ONLY**. A native module, SDK upgrade, or app-config change requires a new build.
4. Build profiles and update channels must **line up** (dev / preview / production), and version + build number must **increment** per store build.
5. Secrets use **SecureStore** (Keychain / Keystore), never AsyncStorage or an `EXPO_PUBLIC_*`-inlined constant.
6. **Stay in lane**: listing / ASO / IAP / submission to `app-store-submission-guardian`; React web to `react-guardian`; native games to the Unity cohort.
7. **No em dashes** in any report, code comment, or prose.

## Procedure (route to the guide for each task)

Work in this order when configuring a fresh app; jump to the relevant guide for a single task.

1. **EAS build profiles.** Configure `eas.json` dev / preview / production with matching channels, distribution, env, and `autoIncrement` on production. See `guides/01-eas-build-profiles.md`. Template: `templates/eas.json`.
2. **Native modules via config plugins.** Install with `npx expo install`, add the plugin to the `plugins` array with its permission-string props, request at runtime with the module's hook. See `guides/02-native-modules-config-plugins.md`.
3. **App config.** Set bundle id / package, version + build number, icons / splash, scheme, permission strings, plugins array, runtimeVersion + updates in `app.config.ts`. See `guides/03-app-config-permissions.md`. Template: `templates/app.config.ts`.
4. **Navigation.** Lead with Expo Router (file-based); document the React Navigation decision. See `guides/04-navigation.md`.
5. **Offline-first.** Local store + sync queue, optimistic updates, conflict ladder (last-write-wins to field-merge). Per-app store choice. See `guides/05-offline-first.md`. Template: `templates/offline-sync-pattern.md`.
6. **OTA via EAS Update.** Channels per profile, the channel-vs-branch model, runtimeVersion policy, staged rollout, republish-don't-delete rollback. See `guides/06-ota-eas-update.md`.
7. **Monorepo + metro.** Workspace layout, SDK-52+ auto-config (do NOT paste old watchFolders boilerplate), duplicate-React / native-module gotchas, EAS Build in a monorepo. See `guides/07-monorepo-metro.md`.

For an **audit** of an existing app's config, run `guides/08-config-audit.md` and produce a report from `templates/config-audit-report.md`. Past audits accumulate in `reports/`.

## Worked examples

- `examples/01-greenfield-app-setup.md` (happy path): a fresh app from `eas.json` through app config, a camera module wired via its plugin, Expo Router, and the first OTA. Demonstrates guides 01 through 06.
- `examples/02-ota-vs-rebuild-decision.md` (edge case): three change requests, deciding OTA vs new build for each, plus a missing-permission-string audit finding. Demonstrates guides 02, 03, 06, 08.

## Hard rules (do not violate)

- Confirm the SDK version before writing any config. If it is 55+, the New Architecture is on and there is no toggle. If you are about to write `newArchEnabled`, stop.
- A "native" change (config plugin added / removed, SDK upgrade, app-config native field, new native dependency) is ALWAYS a new build. It can never ship as an OTA. When unsure whether a change is native, treat it as native.
- Never put a token or secret in AsyncStorage, MMKV, or an `EXPO_PUBLIC_*` env var. Those are readable on device. Tokens go to `expo-secure-store`.
- Every native capability you add must land its permission string in the same change. A missing iOS usage string is an automatic App Store rejection; a missing Android permission is a runtime crash.
- Some research notes are practitioner-sourced and marked verify-before-publish (the OTA rollout / rollback CLI commands, the offline-first library landscape). Confirm exact `eas update` CLI flag names against the EAS CLI reference before hardcoding them in a deliverable. See the `> TODO: re-fetch` markers in `guides/06-ota-eas-update.md` and `guides/05-offline-first.md`.

## Open questions (surface to the operator; do not invent answers)

> TODO: open question -- Is there a real current Cuantico RN app target, or is this a build-ahead capability for a future app? This is operator input. The weapon teaches the patterns generically, which is correct either way, but a concrete target lets you pick defaults (which offline store, which nav, iOS + Android vs one platform). Source: `research/research-summary.md`.

> TODO: open question -- Which offline-first store is the default? If the backend-of-record is Supabase Postgres (which Cuantico uses elsewhere), a sync-engine path (PowerSync / ElectricSQL streaming Postgres into client SQLite) is the strong default. Confirm the backend before committing an offline example. Source: `research/offline-first/2026-06-29-offline-first-library-landscape.md`.
