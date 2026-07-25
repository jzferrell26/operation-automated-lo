---
source_url: https://docs.expo.dev/eas/environment-variables/ | https://docs.expo.dev/eas/environment-variables/usage/ | https://expo.dev/blog/environment-variables
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: eas-build
weapon: expo-react-native-weapon
---

# Environment variables and secrets in EAS Build (official Expo docs)

## Summary
EAS environment variables are managed per build profile (and per "environment": development/preview/production) with three VISIBILITY types: plain text, sensitive, and secret. The `env` field on an eas.json build profile both evaluates app.config.js locally during `eas build` AND is set on the EAS Build builder. Secret-visibility variables live only on EAS servers (not pullable locally, not bundled into JS for updates). Local EAS builds cannot read EAS Secrets - use plain env vars there. EAS CLI does NOT auto-load `.env` files when resolving app config; use the EAS env-var management system instead.

## Key quotations / statistics
- "You can configure environment variables on your build profiles using the `env` field. These environment variables will be used to evaluate app.config.js locally when you run eas build, and they will also be set on the EAS Build builder."
- Visibility types: "plain text, sensitive, secret" - "so only the right surfaces can read each value." Secret type is "intended to provide values to an EAS Build or Workflows job" (e.g. `NPM_TOKEN` for private packages).
- "Build jobs: The environment comes from the build profile in eas.json (build.<profile>.environment). If that field is missing, the automatic defaults ... apply."
- "Cloud EAS Builds have access to EAS Secrets, but local EAS Builds don't ... use environment variables for local EAS Builds instead."
- "Environment variables with secret visibility are not readable outside of EAS servers, and can't be pulled locally for development or to bundle your app's JavaScript code for updates."
- "EAS CLI itself does not support loading .env files to set environment variables when resolving the app config. Instead, it's recommended to use the EAS environment variables management system."

## Annotations for weapon-forge
- Underwrites the dev/preview/production parity requirement (Brief ACTION step 1): each profile carries its own `env` / environment, so the same build profile + channel + env triplet stays consistent.
- Critical secrets distinction that complements directive 5: SERVER-side secrets (NPM_TOKEN, signing) use EAS secret-visibility vars (never in the bundle); DEVICE-side secrets (auth tokens at runtime) use expo-secret-store. A "secret" baked into the JS bundle via a plain/public env var is readable by anyone who unpacks the app - this is the RN equivalent of the NEXT_PUBLIC inlining footgun the Brief warns about.
- Teach: anything prefixed for client exposure (e.g. `EXPO_PUBLIC_*`) is inlined into the bundle and is NOT secret. True secrets must be secret-visibility (build-time only) or fetched at runtime from a backend.
- The ".env files are not auto-loaded by EAS CLI" point is a common gotcha; document the EAS env-var management commands as the supported path.
