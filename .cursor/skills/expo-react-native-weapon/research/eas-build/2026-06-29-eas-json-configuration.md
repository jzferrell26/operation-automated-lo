---
source_url: https://docs.expo.dev/build/eas-json/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: eas-build
weapon: expo-react-native-weapon
---

# Configure EAS Build with eas.json (official Expo docs)

## Summary
`eas.json` is the configuration file for EAS Build and EAS Submit, living at the project root. All build configuration sits under the top-level `"build"` key as a set of named build PROFILES. A new project's `eas build:configure` generates three default profiles: `development`, `preview`, `production`. Profiles can inherit from each other via `"extends"` (max chain depth 5, no circular deps). Each profile may carry platform-specific `"android"` and `"ios"` objects; options valid for both platforms can sit at the profile root, and platform-specific values override root values.

## Key quotations / statistics
- "A build profile is a named group of configurations that describes the necessary parameters to perform a certain type of build."
- Default generated config:
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
- "You can keep chaining profile extensions up to the depth of 5 as long as you avoid making circular dependencies." (via `"extends"`)
- "Options that are available to both platforms can be provided on the platform-specific configuration object or the root of a profile." Platform-specific options take precedence over root-level ones.
- `developmentClient: true` indicates dependency on `expo-dev-client`; `distribution: "internal"` enables direct device distribution (no app store); iOS `simulator` builds are configured within the `ios` object; `env` sets per-profile environment variables used during build and app config evaluation.

## Annotations for weapon-forge
- This is the canonical source for the eas.json guide. The three-profile dev/preview/production scaffold is the spine of the EAS build profiles guide the Brief's ACTION step 1 demands.
- The `channel` property (links a build to an EAS Update branch/channel) is documented separately (see eas-update notes); this page confirms profiles exist but the verbatim fetch did not surface `channel` here. weapon-forge should cross-link: each build profile should set `"channel"` matching its update channel so dev/preview/production parity holds (Brief ACTION step 1 + directive 4).
- `autoIncrement` (build-number auto-increment) belongs in the production profile to satisfy directive 4 ("version + build number must increment per store build"); confirm exact key when fetching the build-reference page.
- The `extends` depth-5 rule and platform-override precedence are concrete, citable facts for the guide's "profile inheritance" section.
- Pair with eas-json submit config (eas.json also configures EAS Submit under a `"submit"` key) but submission itself routes to app-store-submission-guardian per the Brief lane boundary.
