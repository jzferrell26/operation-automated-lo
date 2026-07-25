# 08 - Config audit procedure

The audit path. When the task is "audit my Expo config" rather than "configure this app", run this procedure and produce a report from `templates/config-audit-report.md`. Past audits accumulate in `reports/`. Demonstrated in `examples/02-ota-vs-rebuild-decision.md`.

This guide does not introduce new facts; it sequences the per-guide audit checklists into one pass and ranks findings by severity.

## Severity ranking

- **Critical**: ships broken or rejected. Examples: a native capability with no permission string (App Store rejection / Android crash, directive 2); a secret in AsyncStorage or an `EXPO_PUBLIC_*` var (directive 5); a native change being shipped as an OTA (directive 3); `newArchEnabled` on SDK 55+.
- **High**: works now but will break or be rejected soon. Examples: build number not incrementing (directive 4); channel name mismatch between build profile and publish target (directive 4); duplicate React / native-module versions in a monorepo; rollback procedure that deletes updates instead of republishing.
- **Medium**: correctness / maintainability risk. Examples: static `app.json` where dynamic config is warranted; hand-written legacy metro boilerplate on SDK 52+; navigation choice undocumented.
- **Low**: polish. Examples: missing `scheme` when no deep links are needed yet; placeholder app name.

## The audit pass (run in order)

1. **Version pin** (`guides/00-principles.md`). Confirm the SDK version. If 55+, flag any `newArchEnabled` as Critical. If below 55, flag as a migration candidate.
2. **EAS build profiles** (`guides/01-eas-build-profiles.md`). Run that guide's checklist: three profiles, dev client, channels present and name-matched, build-number increment, no secrets in plain env.
3. **Native modules + plugins** (`guides/02-native-modules-config-plugins.md`). Every installed native module is in the `plugins` array; SecureStore (not AsyncStorage) holds tokens; no hand-edited `android/` `ios/` directories.
4. **App config + permissions** (`guides/03-app-config-permissions.md`). Run that guide's checklist: bundle id / package, version, every capability has its permission string, no placeholder iOS usage strings.
5. **Navigation** (`guides/04-navigation.md`). Choice documented; Expo Router version matches SDK.
6. **Offline-first** (`guides/05-offline-first.md`), if applicable. Durable queue, conflict policy stated, parameterized SQL, no secrets in the store.
7. **OTA** (`guides/06-ota-eas-update.md`). runtimeVersion policy present, channels match, republish-not-delete rollback, staged rollout.
8. **Monorepo + metro** (`guides/07-monorepo-metro.md`), if applicable. No legacy boilerplate on SDK 52+, single React / native-module versions, `require.resolve()` in native scripts.

## Lane-boundary findings

If the audit surfaces an issue outside this weapon's lane, record it as a finding and name the owning Guardian rather than fixing it:
- listing / ASO / IAP / submission -> `app-store-submission-guardian`
- React web architecture -> `react-guardian`
- deep credential threat model -> `security-guardian`
- native game work -> the Unity cohort

## Output

Fill `templates/config-audit-report.md`: a scorecard, a severity-tagged findings list (each with file, the rule it violates, and the fix), and a directive-traceability table mapping each of the seven critical directives to a pass / fail. Save the completed report to `reports/<date>-<app>-config-audit.md`.
