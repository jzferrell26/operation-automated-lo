---
source_url: https://docs.expo.dev/versions/latest/sdk/camera/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: expo-camera
weapon: expo-react-native-weapon
---

# expo-camera (official Expo docs)

## Summary
expo-camera is installed via `npx expo install expo-camera` and wired through its built-in config plugin (CNG). The plugin accepts permission-string props that set the iOS Info.plist usage descriptions and toggle Android permissions, plus runtime permission via the `useCameraPermissions` hook. This is the canonical worked example for Brief directive 2 (every native capability needs its permission string, supplied via the config plugin, not hand-edited native code).

## Key quotations / statistics
- Install: `npx expo install expo-camera` (also yarn/pnpm/bun `expo install`).
- Config plugin in app.json:
```json
{
  "expo": {
    "plugins": [
      ["expo-camera", {
        "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera",
        "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone",
        "recordAudioAndroid": true,
        "barcodeScannerEnabled": true
      }]
    ]
  }
}
```
- Plugin props: `cameraPermission` (iOS, sets `NSCameraUsageDescription`), `microphonePermission` (iOS, sets `NSMicrophoneUsageDescription`), `recordAudioAndroid` (Android, enables `RECORD_AUDIO`), `barcodeScannerEnabled` (all).
- iOS Info.plist keys set: `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`.
- Android permissions: `CAMERA` (required), `RECORD_AUDIO` (for video with audio).
- Runtime hook: `const [status, requestPermission] = useCameraPermissions();` - manages requesting and checking camera permissions across platforms.

## Annotations for weapon-forge
- Use this as THE template for the "wire a native module via its config plugin" guide section (Brief ACTION step 2). It cleanly shows: install -> add plugin with permission-string props -> permission strings land in Info.plist/AndroidManifest at prebuild -> request at runtime with the hook.
- Reinforces directive 2: the `cameraPermission`/`microphonePermission` props ARE the iOS usage strings; you do not hand-edit Info.plist. A missing usage string is an App Store rejection (iOS) and a runtime crash (Android).
- The `$(PRODUCT_NAME)` interpolation token is worth noting - it auto-fills the app name in the permission prompt.
- Pattern generalizes to other media/sensor modules (location, media-library, microphone); the same install -> plugin-prop -> runtime-hook shape repeats.
