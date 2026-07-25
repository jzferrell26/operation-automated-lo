---
source_url: https://docs.expo.dev/versions/latest/config/app/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: app-config
weapon: expo-react-native-weapon
---

# Expo app config (app.json / app.config) fields for build-ready apps (official docs)

## Summary
The app config (`app.json`, or `app.config.js`/`app.config.ts` for dynamic config) defines the metadata and native configuration that prebuild turns into the native iOS/Android projects. The build-ready essentials: `name`, `slug`, `version`; iOS `ios.bundleIdentifier` + `ios.buildNumber`; Android `android.package` + `android.versionCode`; permission usage strings via `ios.infoPlist` (iOS) and `android.permissions` (Android); `icon`, `splash`, `scheme`; the `plugins` array (config plugins); and `runtimeVersion` + `updates` for OTA.

## Key quotations / statistics
- `name`: "The name of your app as it appears both within Expo Go and on your home screen."
- `slug`: "A URL-friendly name for your project that is unique across your account."
- `version`: "Your app version" - corresponds to iOS `CFBundleShortVersionString` and Android `versionName`.
- `ios.bundleIdentifier`: "The bundle identifier for your iOS standalone app" in reverse DNS notation (e.g. `host.exp.expo`).
- `ios.buildNumber`: "Build number for your iOS standalone app" matching Apple's format.
- `android.package`: "The package name for your Android standalone app" in reverse DNS notation (e.g. `com.example.app`).
- `android.versionCode`: "Version number required by Google Play"; "must increment with each release."
- `ios.infoPlist`: "Dictionary of arbitrary configuration to add to your standalone app's native Info.plist," including the usage description strings required by Apple (e.g. `NSCameraUsageDescription`).
- `android.permissions`: "A list of permissions to add to the app `AndroidManifest.xml` during prebuild."
- `icon`: "Local path or remote URL to an image to use for your app's icon" (recommended 1024x1024 PNG).
- `scheme`: "URL scheme(s) to link into your app" (e.g. `demo://`).
- `runtimeVersion`: compatibility indicator "between a build's native code and an OTA update."
- `plugins`: "Config plugins for adding extra functionality to your project."
- `updates`: "Configuration for the expo-updates library" controlling OTA behavior.

## Annotations for weapon-forge
- This is the source-of-truth field list for the app.json guide (Brief ACTION step 3). Show a fully-populated example app.config.ts with bundle ids, version/build, plugins array, scheme, icon/splash, and runtimeVersion.
- Underwrites directive 2: every native capability needs its permission string. iOS strings go inside `ios.infoPlist` (the `NS...UsageDescription` keys); Android into `android.permissions`. Most expo native-module config plugins ALSO accept a permission-string prop directly (e.g. expo-camera's `cameraPermission`), which is the preferred path; the raw infoPlist/permissions keys are the manual fallback. Cross-link the native-modules note.
- Recommend `app.config.ts` (dynamic config) over static `app.json` when env-dependent values (bundle id per build profile, API URLs) are needed; the static-vs-dynamic choice is a guide subsection.
- `android.versionCode` "must increment with each release" and the iOS `buildNumber` equivalent both feed directive 4; pair with eas.json `autoIncrement`.
