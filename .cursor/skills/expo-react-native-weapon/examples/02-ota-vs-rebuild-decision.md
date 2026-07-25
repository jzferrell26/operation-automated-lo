# Example 02 - OTA vs rebuild decision + a missing-permission audit (edge case)

Demonstrates `guides/02`, `guides/03`, `guides/06`, and `guides/08`: applying the OTA-vs-new-build rule to three changes, and catching a missing-permission-string finding during an audit.

## Input (what the Guardian receives)

> Existing SDK 56 app. Three changes are queued. For each, decide: OTA or new build? Also audit the config first.

1. Fix a typo in a button label.
2. Add `expo-location` to show nearby events.
3. Bump the SDK from 56 to a future 57.

## Audit pass first (guide 08)

Running the audit pass, the config has `expo-camera` wired but its `cameraPermission` prop is present. However, a screen already calls the microphone via the camera module for video, and **`microphonePermission` is missing**.

**Finding [C-1] Critical** -- File: `app.config.ts`. Violates directive 2 (every native capability needs its permission string). The camera plugin records audio but `microphonePermission` (iOS `NSMicrophoneUsageDescription`) is absent. This is an automatic App Store rejection. Fix: add the prop:

```ts
["expo-camera", {
  cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
  microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone",
  recordAudioAndroid: true,
}],
```

Because this changes a config plugin's native output, the fix is a **new build**, not an OTA (directive 3).

## The OTA-vs-new-build decision (guide 06, guide 00 rule)

Apply the rule: did the change touch native code, a config plugin, an app-config native field, a native dep, or the SDK?

| Change | Touches native? | Decision |
|---|---|---|
| 1. Button label typo | No (pure JS) | **OTA**. `eas update --channel production --message "fix: button label"`. Same runtimeVersion. |
| 2. Add `expo-location` | Yes (new native module + config plugin + permission string) | **New build**. Add the plugin with `NSLocationWhenInUseUsageDescription`, prebuild, rebuild. Cannot be an OTA. |
| 3. SDK 56 -> 57 bump | Yes (SDK upgrade) | **New build**. Run `npx expo-doctor` and check `reactnative.directory` for native-module compatibility first. With `appVersion` policy, bump `version` so runtimeVersion changes. |

If change 2 or 3 were shipped as an OTA, the update would either do nothing on the existing binary or crash it, because the binary's native layer does not contain the new module / SDK. runtimeVersion is the interlock that stops an incompatible update from reaching the old binary.

## Rollback note (guide 06)

If the change-1 OTA itself were bad, the rollback is to **republish the last-good update group**, not to delete the bad update or drop the rollout percentage. Devices that cached the bad bundle only heal from a newer good update.

```bash
eas update:list --branch production
eas update:republish --group <good-update-group-id> --message "rollback: revert button label change"
```

> TODO: re-fetch -- confirm `eas update:republish` / `eas update:list` flags against the EAS CLI reference before using verbatim (guide 06).

## Output (what the Guardian produces)

An audit report (`templates/config-audit-report.md`) with the Critical microphone finding, plus a decision table: change 1 = OTA, changes 2 and 3 = new build. The microphone fix and `expo-location` addition are batched into the next build; the typo ships immediately as an OTA.
