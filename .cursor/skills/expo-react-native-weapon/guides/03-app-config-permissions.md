# 03 - App config and permission strings (app.json / app.config.ts)

ACTION step 3 and directive 2. Set the app config that prebuild turns into the native iOS / Android projects: bundle id / package, version + build number, icons / splash, scheme, permission strings, the plugins array, and `runtimeVersion` + `updates` for OTA. Template: `templates/app.config.ts`. Demonstrated in `examples/01-greenfield-app-setup.md` and the audit finding in `examples/02-ota-vs-rebuild-decision.md`.

Source note: `research/app-config/2026-06-29-app-config-fields.md`. Cross-links: `guides/02-native-modules-config-plugins.md` (permission props), `guides/06-ota-eas-update.md` (runtimeVersion / updates).

## Static app.json vs dynamic app.config.ts

`app.json` is static. `app.config.js` / `app.config.ts` is dynamic config (a function that returns the config object), which you need when values depend on the environment (bundle id per build profile, API URLs, build-time secrets read from `env`).

Recommendation: prefer `app.config.ts` once any value is env-dependent. The EAS build profile `env` (from `guides/01-eas-build-profiles.md`) is what feeds the dynamic config at build time. The template ships as `app.config.ts` for this reason.

## The build-ready field checklist

From the official app-config field list (`app-config-fields.md`):

| Field | Purpose |
|---|---|
| `name` | App name on the home screen and in Expo Go. |
| `slug` | URL-friendly project name, unique across the account. |
| `version` | App version; iOS `CFBundleShortVersionString`, Android `versionName`. |
| `ios.bundleIdentifier` | iOS bundle id in reverse DNS (e.g. `com.cuantico.app`). |
| `ios.buildNumber` | iOS build number (Apple format). |
| `android.package` | Android package in reverse DNS. |
| `android.versionCode` | Google Play version number; **must increment with each release**. |
| `ios.infoPlist` | Arbitrary Info.plist keys, including `NS...UsageDescription` strings. |
| `android.permissions` | Permissions added to AndroidManifest.xml at prebuild. |
| `icon` | App icon (recommended 1024x1024 PNG). |
| `splash` | Splash screen config. |
| `scheme` | URL scheme(s) for deep linking (e.g. `cuantico://`). |
| `plugins` | Config plugins array. |
| `runtimeVersion` | OTA compatibility key between native code and an update. |
| `updates` | `expo-updates` (OTA) configuration. |

## Bundle id / package and build number (directive 4)

- `ios.bundleIdentifier` and `android.package` are the app's stable identity; set them once, in reverse DNS, and do not change them after a store release (changing them is a new app to the stores).
- `ios.buildNumber` and `android.versionCode` must **increment per store build** or the store rejects it. The eas.json production profile's build-number auto-increment (from `guides/01-eas-build-profiles.md`) is the mechanism; the app-config fields are what it touches.

## Permission strings (directive 2) - the two paths

Every native capability needs its permission string, or it is an App Store rejection (iOS) or a runtime crash (Android).

1. **Preferred path: the module's config plugin prop.** e.g. `expo-camera`'s `cameraPermission` prop sets `NSCameraUsageDescription` for you. Use this whenever the module exposes it (`guides/02-native-modules-config-plugins.md`).
2. **Manual fallback: raw keys in app config.** When a capability has no plugin prop, add the iOS usage string directly to `ios.infoPlist` and the Android permission to `android.permissions`:

   ```ts
   ios: {
     infoPlist: {
       NSLocationWhenInUseUsageDescription: "We use your location to show nearby events."
     }
   },
   android: {
     permissions: ["ACCESS_FINE_LOCATION"]
   }
   ```

The iOS usage string must be a real, human-readable sentence describing why the app needs the capability. Apple rejects empty or placeholder strings.

## runtimeVersion and updates (OTA hooks live in app config)

`runtimeVersion` is the compatibility key between a binary's native layer and an OTA update; set it via a policy so it is computed, not hand-managed:

```ts
runtimeVersion: { policy: "appVersion" }
```

`eas update:configure` sets this default and adds the `updates.url`. Full treatment of policies and the OTA model is in `guides/06-ota-eas-update.md`. The point here: these two fields live in app config, and changing a native-affecting field is a new build (directive 3).

## Audit checklist for app config

- [ ] `ios.bundleIdentifier` and `android.package` set, reverse-DNS, stable.
- [ ] `version` set; build-number increment wired (eas.json `autoIncrement` or manual).
- [ ] Every native module / capability in use has its permission string (plugin prop or raw `infoPlist` / `permissions`).
- [ ] No empty or placeholder iOS usage strings.
- [ ] `icon`, `splash`, `scheme` set.
- [ ] `plugins` array matches the installed native modules.
- [ ] `runtimeVersion` policy present; `updates.url` present if OTA is used.
- [ ] No `newArchEnabled` flag on SDK 55+ (`guides/00-principles.md`).
