# Example 01 - Greenfield app setup (happy path)

Demonstrates `guides/00` through `guides/06`: version pin, EAS build profiles, a native module wired via its config plugin, app config + permission strings, Expo Router, a first offline cache, and the first OTA.

## Input (what the Guardian receives)

> New Expo app, greenfield. iOS + Android. Needs a camera scan screen and must remember the last-synced event list offline. Set up EAS (dev / preview / production), wire the camera, configure app.json, navigation, and OTA.

## Step 1 - Confirm the version pin (guide 00)

Confirm the project is on **Expo SDK 56** (RN 0.85.2, Hermes v1, React 19.2). The New Architecture is mandatory; do NOT add `newArchEnabled`. Expo Router v7 is the default router.

## Step 2 - EAS build profiles (guide 01)

Run `eas build:configure`, then shape `eas.json` from `templates/eas.json`: `development` (dev client, internal), `preview` (internal), `production` (store + `autoIncrement`). Each profile gets a `channel` matching its name so OTA parity holds.

First build is the **development build** (`developmentClient: true`), because the camera module is a native dependency Expo Go cannot run.

## Step 3 - Wire the camera via its config plugin (guide 02, directives 1 + 2)

```sh
npx expo install expo-camera
```

In `app.config.ts`, add the plugin with permission-string props (these ARE the iOS usage strings):

```ts
plugins: [
  ["expo-camera", {
    cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
  }],
],
```

Request at runtime with `useCameraPermissions()`. No hand-editing of `ios/` or `android/`.

## Step 4 - App config (guide 03, directive 4)

From `templates/app.config.ts`: set `ios.bundleIdentifier` and `android.package` (reverse DNS), `version`, `scheme`, `icon`, `splash`, `runtimeVersion: { policy: "appVersion" }`. Build-number increment is handled by `autoIncrement` in the production profile.

## Step 5 - Navigation (guide 04)

Lead with **Expo Router v7** (file-based). Create `app/_layout.tsx`, `app/index.tsx`, and `app/(tabs)/scan.tsx` for the camera screen. The `scheme` from app config gives automatic deep linking. Decision documented: Expo Router chosen because it is a new app wanting universal routing and automatic deep links.

## Step 6 - Offline cache (guide 05)

Read-mostly event list, server already exists -> TanStack Query with a persister + optimistic updates and a durable mutation queue. Conflict policy: last-write-wins (users do not share records). Tokens go to `expo-secure-store`, not the cache.

> TODO: open question -- if the backend is Supabase Postgres, switch the default to a sync engine (PowerSync / ElectricSQL). Confirm with the operator.

## Step 7 - First OTA (guide 06, directives 3 + 4)

```sh
npx install-expo-modules@latest
eas update:configure
eas update --channel production --message "first JS update"
```

Channel `production` matches the production build profile. A pure-JS copy fix later ships as an OTA; adding a new native module later is a new build, not an OTA.

## Output (what the Guardian produces)

A configured `eas.json` + `app.config.ts`, camera wired via its plugin with the permission string present, Expo Router structure, a TanStack-Query offline cache, and a `production` OTA channel live. The build is handed to `app-store-submission-guardian` for listing and submission (out of this weapon's lane).
