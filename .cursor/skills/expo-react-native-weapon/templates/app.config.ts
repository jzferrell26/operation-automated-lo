// app.config.ts template. See guides/03-app-config-permissions.md. Pinned to Expo SDK 56.
// Dynamic config (function form) so env-dependent values resolve at build time from the eas.json profile env.
// Do NOT add `newArchEnabled` on SDK 55+: the New Architecture is mandatory and the flag is a no-op. See guides/00-principles.md.

import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "{{app_name}}",
  slug: "{{app_slug}}",
  version: "{{semver_version}}", // CFBundleShortVersionString / Android versionName
  scheme: "{{deep_link_scheme}}", // e.g. cuantico
  icon: "./assets/icon.png", // recommended 1024x1024 PNG
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "{{splash_bg_hex}}",
  },

  ios: {
    bundleIdentifier: "{{ios_bundle_id}}", // reverse DNS, e.g. com.cuantico.app
    buildNumber: "{{ios_build_number}}", // must increment per store build (or use eas.json autoIncrement)
    infoPlist: {
      // Manual fallback for capabilities with no plugin prop. Prefer the module's plugin prop where it exists.
      // "NSLocationWhenInUseUsageDescription": "We use your location to show nearby events."
    },
  },

  android: {
    package: "{{android_package}}", // reverse DNS, e.g. com.cuantico.app
    versionCode: 1, // must increment with each release
    permissions: [
      // Manual fallback. e.g. "ACCESS_FINE_LOCATION"
    ],
  },

  plugins: [
    // Native modules via their config plugins (NOT hand-edited native code). See guides/02.
    // Permission-string props ARE the iOS usage strings; you do not hand-edit Info.plist.
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone",
      },
    ],
    // "expo-secure-store",     // tokens/secrets go here, never AsyncStorage (directive 5)
    // "expo-notifications",    // remote push needs a development build, not Expo Go
  ],

  runtimeVersion: { policy: "appVersion" }, // OTA compatibility key. See guides/06.
  updates: {
    url: "{{eas_update_url}}", // set by `eas update:configure`
  },
});
