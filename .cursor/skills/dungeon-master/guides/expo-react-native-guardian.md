# Routing guide: `expo-react-native-guardian`

**Guardian:** [`ai-tools/agents/expo-react-native-guardian.md`](../../agents/expo-react-native-guardian.md)
**Weapon:** [`ai-tools/skills/expo-react-native-weapon/`](../../skills/expo-react-native-weapon/)
**Command Brief:** [`ai-tools/command-briefs/expo-react-native-guardian-command-brief.md`](../../../command-briefs/expo-react-native-guardian-command-brief.md)
**Trigger policy:** proactive

## Domain
Expo / React Native APP-layer specialist that gets a mobile app build-ready: the app, not the listing.
It owns the configuration and code that turns an RN codebase into a correctly building,
OTA-updatable, store-ready binary. That means EAS build profiles in `eas.json` (dev / preview /
production with matching update channels), native modules wired through their config plugins
(expo-camera, expo-secure-store, expo-notifications) with the required iOS Info.plist usage strings
and Android permissions, app config (`app.json` / `app.config`: bundle id / package, version + build
number, icons / splash, scheme, plugins array), navigation (Expo Router v7 file-based vs React
Navigation), offline-first patterns (local store + sync queue, optimistic updates, conflict handling),
OTA via EAS Update (channels per profile, staged rollout, the JS-and-assets-only boundary,
runtimeVersion), and metro / monorepo wiring. It is pinned to Expo SDK 56 (RN 0.85.2, Hermes v1,
React 19.2), where the New Architecture is mandatory (SDK 55+). It gets the app build-ready and then
hands off; it does not publish the app, own the web app, or build native games.

## Trigger phrases (route here)
- "set up EAS", "configure eas.json build profiles"
- "wire expo-camera / expo-notifications / secure-store"
- "set up app.json / app.config"
- "Expo Router or React Navigation"
- "make this app work offline"
- "configure OTA / EAS Update", "ship an OTA update"
- "fix my Expo monorepo metro build"
- "audit my Expo config"
- Or when the request implicitly involves an Expo / React Native app being configured, built, or
  audited (EAS profiles, native-module plugins, app config, navigation, offline-first, OTA, or
  metro / monorepo wiring).

## Do NOT route here
- App-store listing / ASO / IAP / submission -> `app-store-submission-guardian`. This Guardian gets the
  app build-ready; it does not publish it. Once a build exists, hand it off there.
- React WEB architecture -> `react-guardian`. This Guardian owns the RN app layer, not the web app.
- Native game development -> the Unity cohort. This Guardian builds RN apps, not Unity games.

If a request straddles two domains, prefer the narrower-scoped Guardian and let this one act as the
app-layer backup.

## Inputs the Guardian needs
Before invoking, ensure the user has provided (or you can infer):
- The task: set up EAS, wire a native module, configure OTA, fix a build, or audit the config.
- The app to configure / build / audit: the repo, and the monorepo layout if any.
- The target platforms (iOS / Android).
- The desired build profile (dev / preview / production).
- The native modules needed (camera, secure storage, notifications, etc.).
- The current state: greenfield vs existing app, and the SDK version (confirm the SDK band before
  writing config; the New Architecture is mandatory at 55+).

If a required input is missing, do not invoke yet; ask the user to supply it. Two open items are carried
as operator inputs the Guardian does not invent: (1) whether there is a real current Cuantico RN app
target or this is a build-ahead capability, and (2) the default offline-first store, which depends on the
backend-of-record (a Supabase Postgres backend points to a sync-engine path such as PowerSync /
ElectricSQL). Surface these rather than guessing the nav or offline defaults.

## Outputs the Guardian produces
- A build-ready Expo / RN app: configured `eas.json` plus `app.json` / `app.config`, native modules wired
  via their plugins, navigation, offline-first where needed, and OTA channels, written into the app repo.
- Or a config audit of an existing app with severity-ranked findings, via the weapon's
  `templates/config-audit-report.md`, accumulated in the weapon's `reports/`.
- For a build-ahead task: the patterns and config taught generically, with the open questions surfaced to
  the operator.

## Multi-Guardian sequences this Guardian participates in
- `expo-react-native-guardian` -> `app-store-submission-guardian`: this Guardian gets the app
  build-ready (EAS profiles, native modules, app config, OTA), then hands the finished build off for
  listing, ASO, IAP, and store submission.
- `react-guardian` <-> `expo-react-native-guardian`: shared RN / React patterns; web architecture stays
  with react-guardian while the RN app layer stays here.
- Operator hand-off -> `expo-react-native-guardian`: an operator or peer Guardian requests an EAS setup,
  native-module wiring, OTA configuration, build fix, or config audit, which this Guardian executes.

## Critical directives the orchestrator should respect
- Native modules go through their config plugins, never hand-edited native code; if you must touch
  native, it is a `prebuild` + a new binary, not an OTA. Hand-editing native breaks the managed workflow
  and is silently lost on the next prebuild.
- Every native capability lands its permission string in the same change: iOS Info.plist usage
  descriptions and Android permissions, supplied in app config. A missing iOS usage string is an
  automatic App Store rejection and a missing Android permission is a runtime crash.
- OTA (EAS Update) ships JS and assets ONLY. A native module, SDK upgrade, or app-config native field
  requires a new build; when unsure whether a change is native, treat it as native. Pushing a native
  change as an OTA does nothing or crashes the app on the old binary.
- Build profiles and update channels must line up (dev / preview / production), and version + build number
  must increment per store build. Mismatched channels ship the wrong JS to the wrong binary, and a
  non-incremented build number is rejected.
- Secrets use SecureStore (Keychain / Keystore), never AsyncStorage, MMKV, or an `EXPO_PUBLIC_*`-inlined
  constant. AsyncStorage and `EXPO_PUBLIC_*` values are plaintext and readable on device.
- Stay in lane: store listing / ASO / IAP / submission -> `app-store-submission-guardian`; React web
  architecture -> `react-guardian`; native game dev -> the Unity cohort.
- No em dashes in any report, code comment, or prose, ever.

(Full list lives in the Guardian file's `## Critical directives` section.)

## Paired Weapon
`ai-tools/skills/expo-react-native-weapon/` (read `SKILL.md` first as the master index, since it carries
the load-bearing version pin (Expo SDK 56) and the seven critical directives, then
`guides/00-principles.md` before any config, native-module, OTA, or audit action).

---

*Part of Dungeon Master's roster. See [`SKILL.md`](../SKILL.md) for the full Guild.*
