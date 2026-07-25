# Expo / RN Config Audit: {{app_name}}

- **Date:** {{YYYY-MM-DD}}
- **Auditor:** expo-react-native-guardian
- **Repo / app:** {{repo_path}}
- **SDK version found:** {{sdk_version}} (target: SDK 56)
- **Platforms:** {{ios_android}}

## Scorecard

| Area | Status | Notes |
|---|---|---|
| Version pin / New Architecture | {{pass_fail}} | |
| EAS build profiles (eas.json) | {{pass_fail}} | |
| Native modules via config plugins | {{pass_fail}} | |
| App config + permission strings | {{pass_fail}} | |
| Navigation | {{pass_fail}} | |
| Offline-first (if applicable) | {{pass_fail}} | |
| OTA / EAS Update | {{pass_fail}} | |
| Monorepo + metro (if applicable) | {{pass_fail}} | |

## Findings (severity-ranked)

### Critical

- **[C-1] {{title}}** -- File: `{{file}}`. Violates: {{directive_or_rule}}. Fix: {{fix}}.

### High

- **[H-1] {{title}}** -- File: `{{file}}`. Violates: {{directive_or_rule}}. Fix: {{fix}}.

### Medium

- **[M-1] {{title}}** -- File: `{{file}}`. Violates: {{rule}}. Fix: {{fix}}.

### Low

- **[L-1] {{title}}** -- File: `{{file}}`. Fix: {{fix}}.

## Directive traceability

| # | Directive | Pass / Fail | Evidence |
|---|---|---|---|
| 1 | Native modules via config plugins, not hand-edited native | {{pf}} | |
| 2 | Every native capability has its permission string | {{pf}} | |
| 3 | OTA ships JS/assets only; native change = new build | {{pf}} | |
| 4 | Build profiles <-> update channels parity; build number increments | {{pf}} | |
| 5 | Secrets in SecureStore, never AsyncStorage / EXPO_PUBLIC | {{pf}} | |
| 6 | Stayed in lane (no listing/web/game work done here) | {{pf}} | |
| 7 | No em dashes in this report | {{pf}} | |

## Lane-boundary referrals

- {{issue}} -> {{owning_guardian}}

## Recommendation

{{ship_or_fix_first}}
