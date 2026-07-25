# 02 - Native modules via config plugins

ACTION step 2 and directives 1, 2, 5. Wire native modules through their **config plugins**, not by hand-editing the native iOS / Android projects. Supply the required iOS permission usage strings and Android permissions as plugin props. Demonstrated in `examples/01-greenfield-app-setup.md` (camera) and `examples/02-ota-vs-rebuild-decision.md`.

Source notes: `research/native-modules-plugins/2026-06-29-config-plugins-introduction.md`, `research/native-modules-plugins/2026-06-29-authoring-custom-config-plugins.md`, `research/native-modules-plugins/2026-06-29-expo-camera.md`, `research/native-modules-plugins/2026-06-29-expo-notifications.md`, `research/native-modules-plugins/2026-06-29-expo-secure-store.md`.

## The doctrine: config plugins, not hand-edited native code (directive 1)

A config plugin is a custom configuration point made of one or more plugin functions ("mods") that run during `npx expo prebuild` to modify the native iOS / Android projects in a predictable, regenerable way.

> "In CNG projects, it is best to avoid modifying these native projects manually, because you cannot regenerate them safely without potentially overwriting manual modifications." (official docs, `config-plugins-introduction.md`)

The mental model to teach:

```
app config (declarative)  ->  expo prebuild (CNG)  ->  native projects (disposable, gitignorable)
```

Editing `android/` or `ios/` directly breaks this chain. Your edit is silently lost on the next prebuild. If a change must touch native, it is a `prebuild` + a **new binary**, never an OTA (directive 1 + directive 3).

Plugins are referenced in the `plugins` array of the app config. Each entry is either a string (plugin with defaults) or `["plugin-name", { ...props }]`. Plugins are conventionally named `with<Functionality>`.

Deprecated-terminology watch: tutorials that say "run `expo eject`" are stale. The current path is `npx expo prebuild`.

## The canonical wiring pattern (install -> plugin props -> runtime hook)

Every Expo native module follows the same three-step shape. Camera is the clean worked example (Source: `expo-camera.md`):

1. **Install** with the version-aware installer:

   ```sh
   npx expo install expo-camera
   ```

2. **Add the plugin with permission-string props** in app config. The permission props ARE the iOS usage strings; you do not hand-edit Info.plist:

   ```json
   {
     "expo": {
       "plugins": [
         ["expo-camera", {
           "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera",
           "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone",
           "recordAudioAndroid": true
         }]
       ]
     }
   }
   ```

   `cameraPermission` sets iOS `NSCameraUsageDescription`; `microphonePermission` sets `NSMicrophoneUsageDescription`; `recordAudioAndroid` enables the Android `RECORD_AUDIO` permission. The `$(PRODUCT_NAME)` token auto-fills the app name in the prompt.

3. **Request at runtime** with the module's hook:

   ```tsx
   const [status, requestPermission] = useCameraPermissions();
   ```

This shape generalizes to other media / sensor modules (location, media-library, microphone): install -> plugin-prop -> runtime-hook.

## Permission strings are mandatory (directive 2)

A missing iOS usage string is an **automatic App Store rejection**. A missing Android permission is a **runtime crash**. Every native capability you add must land its permission string in the same change. The preferred path is the module's plugin prop (e.g. `cameraPermission`); the manual fallback is the raw `ios.infoPlist` key and `android.permissions` entry in app config (see `guides/03-app-config-permissions.md`).

## expo-notifications (push has a development-build gotcha)

Install `npx expo install expo-notifications`, wire via its config plugin (`icon`, `color`, `defaultChannel`, `sounds`, `enableBackgroundRemoteNotifications`). (Source: `expo-notifications.md`.)

Critical 2026 fact to flag prominently: **remote push does NOT work in Expo Go** (from SDK 53 on Android; treat as both platforms). A **development build is required**. Local notifications still work in Expo Go; remote push does not. This is the frequent "why doesn't my push work" support question, and the fix is the EAS `development` profile build from `guides/01-eas-build-profiles.md`.

Token APIs to choose between:
- `getExpoPushTokenAsync()` -> Expo Push Service (simplest, recommended default).
- `getDevicePushTokenAsync()` -> raw FCM / APNs token (bring-your-own sender).

Cross-dependency: iOS push needs a real Apple Developer account + APNs key; Android needs a Firebase project + `google-services.json` (added via the plugin / app config). The account setup touches `app-store-submission-guardian` territory, but the wiring (plugin props, FCM file, entitlement) is this weapon's lane. A physical device is required to acquire a push token; simulators cannot receive remote push.

## expo-secure-store (directive 5: secrets go here, never AsyncStorage)

`expo-secure-store` provides encrypted, per-project key-value storage for sensitive data: iOS Keychain (`kSecClassGenericPassword`), Android `SharedPreferences` encrypted with the Android Keystore. This is the correct and only home for tokens / secrets. (Source: `expo-secure-store.md`.)

API: `setItemAsync(key, value, options)`, `getItemAsync(key, options)`, `deleteItemAsync(key, options)`.

The contrast to teach:
- **AsyncStorage** = plaintext, unencrypted. Fine for non-sensitive UI state. Never for tokens.
- **MMKV** = fast, but not encrypted by default. Not for secrets.
- **SecureStore** = Keychain / Keystore-backed. Tokens, secrets, sensitive PII. Always.

Gotchas:
- **~2048-byte size limit** (historically, some iOS releases rejected values above roughly 2048 bytes). A long JWT or large refresh-token blob can hit it; chunk, or store only a token reference. SecureStore is not a general database.
- **High-security pattern**: `requireAuthentication: true` gates retrieval behind biometric auth; default `WHEN_UNLOCKED` restricts retrieval to when the device is unlocked. Check `canUseBiometricAuthentication()` first. Worth a callout for finance / health apps.
- Deep credential-lifecycle / threat-model audits route to `security-guardian`. This weapon wires SecureStore correctly; it does not own the full threat model.

## Authoring a custom config plugin (advanced; when no off-the-shelf plugin exists)

When a capability has no published config plugin, write your own using **mods** (modifiers): async functions imported from `expo/config-plugins` that mutate native files during prebuild. The two workhorses are `withInfoPlist` (iOS) and `withAndroidManifest` (Android); each receives the config, edits `config.modResults`, and returns it. Chain multiple mods in one exported `ConfigPlugin`. (Source: `authoring-custom-config-plugins.md`.)

> "Config plugins use mods (short for modifiers) to modify native project files during the prebuild process. Mods are asynchronous functions that allow you to make changes to platform-specific files such as AndroidManifest.xml and Info.plist." (official docs)

This is the escape hatch for directive 1: write a small custom plugin rather than hand-editing (and losing) native files. Keep it as the advanced case; most apps only consume existing plugins.

> TODO: re-fetch -- Before writing a custom-plugin code example into a deliverable, fetch `docs.expo.dev/config-plugins/plugins/`, `docs.expo.dev/config-plugins/mods/`, and the create-a-module-with-a-config-plugin tutorial for the exact `withInfoPlist` / `withAndroidManifest` import paths and full verbatim code sample. The research note carried these as a build-time re-fetch target.
