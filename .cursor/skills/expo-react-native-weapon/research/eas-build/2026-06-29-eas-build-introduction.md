---
source_url: https://docs.expo.dev/build/introduction/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: eas-build
weapon: expo-react-native-weapon
---

# EAS Build introduction (official Expo docs)

## Summary
EAS Build is Expo's hosted cloud service that compiles app binaries (standalone apps) for Expo and React Native projects. Android builds run on Linux runners (GCP); iOS builds run on macOS runners in Expo's cloud. It is driven by eas.json build profiles and can manage credentials (keystores, provisioning profiles, certificates) for you or use ones you supply. Two distribution models: internal (shareable URL, APK/ad-hoc) and store (production binaries, optional auto-submit).

## Key quotations / statistics
- EAS Build is "a hosted Expo Application Services (EAS) service that builds app binaries (also called standalone apps) for your Expo and React Native projects."
- "Android builds run on Linux runners hosted in Google Cloud Platform, and iOS builds run on macOS runners hosted in Expo's macOS cloud."
- Profiles are "named sets of build settings"; "Automate builds with build profiles in eas.json and integrations with EAS Workflows or CI pipelines."
- Internal Distribution: "Set `"distribution": "internal"` in your build profile in eas.json to generate installable Android Package (APK) files for Android or ad hoc builds for iOS." Share via URL.
- Store builds: production binaries "for app stores"; can "Auto-submit successful builds to app stores via `--auto-submit` and EAS Submit."
- Credentials: "EAS Build can generate and manage Android keystores, iOS provisioning profiles and distribution certificates, or use credentials you provide."

## Annotations for weapon-forge
- Frames the EAS Build guide: cloud build (no local Xcode/Android Studio needed), profile-driven, credential-managed. Distinguishes internal distribution (dev/preview/QA) from store builds (production).
- The `--auto-submit` / EAS Submit path is where this Guardian HANDS OFF to app-store-submission-guardian (Brief lane boundary). This Guardian configures the build and can trigger submit, but listing/ASO/review live with the submission Guardian.
- Managed credentials are a major selling point to document: EAS generates and stores the Android keystore and iOS signing assets, removing a classic pain point. Note the option to bring-your-own for teams with existing certs.
- Pair with the eas.json config note (profiles) and the development-builds note (the dev profile produces the dev build).
