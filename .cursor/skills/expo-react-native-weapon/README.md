# expo-react-native-weapon

The Weapon wielded by `expo-react-native-guardian`, the Expo / React Native app-layer specialist. It gets an RN codebase build-ready: EAS build profiles, native modules wired through their config plugins, app config and permission strings, navigation, offline-first patterns, OTA via EAS Update, and monorepo / metro wiring, all pinned to Expo SDK 56 with the New Architecture mandatory at SDK 55+. It hands the finished build to `app-store-submission-guardian` and stays out of React web (`react-guardian`) and native games (the Unity cohort).

Forged by `weapon-forge` (Phase 2) from the Command Brief at `ai-tools/command-briefs/expo-react-native-guardian-command-brief.md` and the research authored by `loremaster` at `research/research-summary.md`. Start with `SKILL.md`, then `guides/00-principles.md` for the version pin and the seven critical directives.

## Layout

- `SKILL.md` - the triggering skill definition and procedure router.
- `guides/` - `00-principles` (version pin + directives) through `08-config-audit`, one per ACTION verb.
- `examples/` - a greenfield happy-path setup and an OTA-vs-rebuild edge case.
- `templates/` - `eas.json`, `app.config.ts`, the offline-sync stub, and the config-audit report shape.
- `reports/` - accumulates past config audits.
- `research/` - loremaster's audit trail (read-only).
