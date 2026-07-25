# 01 - EAS build profiles (eas.json)

ACTION step 1. Configure `eas.json` with dev / preview / production build profiles, matching update channels, distribution, env, and build-number increment. Keep the three profiles in parity. Template: `templates/eas.json`. Demonstrated in `examples/01-greenfield-app-setup.md`.

Source notes: `research/eas-build/2026-06-29-eas-json-configuration.md`, `research/eas-build/2026-06-29-eas-build-introduction.md`, `research/eas-build/2026-06-29-development-builds.md`, `research/eas-build/2026-06-29-eas-environment-variables-secrets.md`, `research/eas-update-ota/2026-06-29-eas-update-getting-started-channels.md`.

## What eas.json is

`eas.json` lives at the project root and configures EAS Build and EAS Submit. All build configuration sits under the top-level `"build"` key as named **profiles**. Running `eas build:configure` on a new project generates three defaults: `development`, `preview`, `production`.

> "A build profile is a named group of configurations that describes the necessary parameters to perform a certain type of build." (official docs, `eas-json-configuration.md`)

Default generated config (verbatim from the docs):

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

## The three profiles and what each is for

- **development** (`developmentClient: true`, `distribution: "internal"`): produces a **development build**, a Debug build that includes the `expo-dev-client` launcher. This is the first build a real app should create. The moment an app needs any custom native module, push notifications, or a changed app config (icon / name / splash), Expo Go can no longer run it and a development build is required. (Source: `development-builds.md`.)
- **preview** (`distribution: "internal"`): a release-style build for QA / stakeholders, shared via an install URL (APK for Android, ad-hoc for iOS). No app store.
- **production** (`{}` by default, but you add `channel`, `autoIncrement`, and store distribution): the binary you submit to the stores.

EAS Build runs Android builds on Linux runners (GCP) and iOS builds on macOS runners in Expo's cloud, so no local Xcode / Android Studio is needed. It can generate and manage the Android keystore and iOS signing assets for you, or use ones you provide. (Source: `eas-build-introduction.md`.)

## Profile inheritance with `extends`

Profiles inherit via `"extends"`. You can chain up to depth 5 with no circular dependencies. Put shared config in a base profile and override per profile.

> "You can keep chaining profile extensions up to the depth of 5 as long as you avoid making circular dependencies." (official docs)

Platform-specific `"android"` / `"ios"` objects can sit inside a profile; options valid for both platforms can sit at the profile root, and platform-specific values override root values.

## Channel parity (directive 4)

Each build profile must set a `"channel"` that matches its EAS Update channel so dev / preview / production stay in parity. This is what wires a binary to the correct update stream. (Source: `eas-update-getting-started-channels.md`; full OTA model in `guides/06-ota-eas-update.md`.)

```json
{
  "build": {
    "preview":    { "channel": "preview" },
    "production": { "channel": "production" }
  }
}
```

The channel name in the build profile and the channel you publish to with `eas update --channel <name>` must be the same name. Mismatched channels ship the wrong JS to the wrong binary.

## Build-number increment (directive 4)

The production profile should auto-increment the store build number so every store build is unique. Set `autoIncrement` on the production profile. The iOS `buildNumber` and Android `versionCode` both must increment per store release, or the store rejects the build. (App-config side of this: `guides/03-app-config-permissions.md`. Source: `app-config/2026-06-29-app-config-fields.md`: "android.versionCode ... must increment with each release.")

> TODO: re-fetch -- Confirm the exact `autoIncrement` key spelling and accepted values (`true` vs `"version"` vs `"buildNumber"`) against the EAS Build reference page (`docs.expo.dev/build-reference/`) before hardcoding it in a deliverable. The eas.json note flagged that the verbatim fetch did not surface this key.

## Environment variables and secrets per profile

The `env` field on a build profile both evaluates `app.config.js` locally during `eas build` AND is set on the EAS Build builder. EAS env vars have three visibility types: **plain text**, **sensitive**, **secret**. (Source: `eas-environment-variables-secrets.md`.)

Rules to enforce:
- A value prefixed for client exposure (`EXPO_PUBLIC_*`) is **inlined into the JS bundle and is NOT secret**. Anyone who unpacks the app can read it. This is the RN equivalent of the `NEXT_PUBLIC` inlining footgun.
- True build-time secrets (e.g. `NPM_TOKEN` for private packages, signing material) use **secret-visibility** EAS vars. These live only on EAS servers, are not pullable locally, and are not bundled into JS for updates.
- **Cloud EAS builds can read EAS Secrets; local EAS builds cannot.** Use plain env vars for local builds.
- EAS CLI does **not** auto-load `.env` files when resolving app config. Use the EAS env-var management system instead.
- Device-side runtime secrets (auth tokens) are a different problem entirely: those go to `expo-secure-store` at runtime, never into env vars or the bundle. (Directive 5; `guides/02-native-modules-config-plugins.md`.)

## Audit checklist for an existing eas.json

- [ ] Three profiles present (development / preview / production) or a documented reason for a different set.
- [ ] `development` has `developmentClient: true`.
- [ ] Each profile that ships an OTA has a `channel`, and the channel name matches the publish target.
- [ ] Production increments the build number (`autoIncrement` or manual + verified).
- [ ] No real secret sits in a plain or `EXPO_PUBLIC_*` env var.
- [ ] `extends` chains are under depth 5 and acyclic.

Findings go into `templates/config-audit-report.md` per `guides/08-config-audit.md`.
