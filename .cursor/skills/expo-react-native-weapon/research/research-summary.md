# Research Summary: expo-react-native-weapon

Authored by loremaster (Phase 1.5). Handoff to weapon-forge.

## Depth tier consumed
**deep**. Official-docs-heavy domain (Brief said lean fully on official Expo/RN docs; no Cuantico prior art). Result: a high-authority, official-source-dominant sweep (15 of 20 notes are official Expo docs) rather than a community-thread-heavy one. This is the correct shape for a "general mobile capability, official docs are the primary authority" Brief.

## Time window covered
2026-06-29 back ~6 months. Official Expo/React Native docs are versionless/living so they reflect the current SDK band (54/55/56); practitioner blogs used were dated 2026 (Jan-Jun). Window NOT extended beyond 6 months; no need arose. No 12-month-cap pressure.

## Files written (20 source notes + plan + index + this summary), by subfolder
- `sdk-new-architecture/` - 2 (version anchor, New Architecture official)
- `eas-build/` - 4 (eas.json config, EAS Build intro, development builds, env vars/secrets)
- `eas-update-ota/` - 4 (how-it-works, runtimeVersion policies, getting-started/channels, rollout/rollback playbook)
- `native-modules-plugins/` - 5 (config plugins intro, authoring custom plugins, secure-store, camera, notifications)
- `app-config/` - 1 (app config fields)
- `navigation/` - 1 (Expo Router vs React Navigation)
- `offline-first/` - 2 (library landscape, expo-sqlite local store)
- `monorepo-metro/` - 1 (monorepo + metro config)

## Version anchor established (most important single finding)
- **Current Expo SDK is 56** (May 2026): React Native 0.85.2, Hermes v1 default, React 19.2.
- **New Architecture is mandatory from SDK 55** (always on, cannot be disabled). SDK 54 is the last that can disable it. Every guide must be written New-Architecture-only for SDK 55+ and must NOT copy SDK-51/52-era `newArchEnabled` opt-in instructions.
- Expo Router v7 is the SDK 55+ default router.

## The 5 most influential sources
1. `sdk-new-architecture/2026-06-29-expo-sdk-version-anchor.md` + `new-architecture-official.md` - the version band that every other guide is pinned to. Without this, weapon-forge would risk writing SDK-53-era instructions. Cite the verbatim "SDK 55+ cannot disable New Architecture" line.
2. `eas-update-ota/2026-06-29-eas-update-how-it-works.md` - the channel-vs-branch model and the JS/assets-only boundary, which is the conceptual core of Brief directives 3 and 4. Everything OTA flows from here.
3. `native-modules-plugins/2026-06-29-config-plugins-introduction.md` + `expo-camera.md` - the config-plugin doctrine (Brief directive 1) with a clean worked example (camera) showing permission strings landing via plugin props, not hand-edited native code (directive 2).
4. `eas-build/2026-06-29-eas-json-configuration.md` + `eas-update-getting-started-channels.md` - the dev/preview/production profile spine plus the `channel` wiring that enforces build-profile <-> update-channel parity (directive 4, ACTION step 1).
5. `native-modules-plugins/2026-06-29-expo-secure-store.md` - the verbatim Keychain/Keystore source for directive 5 (secrets in SecureStore, never AsyncStorage), plus the ~2048-byte limit gotcha.

## Query coverage (all 7 Brief queries + refining queries)
- EAS build profiles eas.json dev/preview/production -> COVERED (eas-build x4, official).
- Native modules expo-camera/SecureStore/notifications -> COVERED (native-modules x5, official).
- Offline-first sync patterns -> COVERED (offline-first x2; official store anchor + practitioner library landscape).
- app.json bundle id / permission strings -> COVERED (app-config + camera/notifications permission props, official).
- OTA EAS Update rollout -> COVERED (eas-update x4; official + production playbook).
- Monorepo metro production gotchas -> COVERED (monorepo-metro x1, official) - see gap below.
- Expo Router vs React Navigation -> COVERED (navigation x1, official + 2026 consensus).
- Refining queries also run: current SDK version, New Architecture default, config-plugin authoring, EAS env vars/secrets, runtimeVersion fingerprint policy.

## Open questions for the USER to resolve (not for weapon-forge to invent)
1. Is there a real current Cuantico RN app target, or is this a build-ahead capability for a future app? The Brief flags this as operator input. The weapon was researched generically (teach patterns + trade-offs), which is correct either way, but a concrete target would let weapon-forge pick defaults (which offline store, which nav, iOS+Android vs one).
2. Offline-first store default: the research teaches the trade-offs (TanStack Query cache / expo-sqlite+Drizzle / WatermelonDB / PowerSync-ElectricSQL). If the operator has a backend-of-record (e.g. Supabase Postgres, which Cuantico uses elsewhere), a sync-engine path (PowerSync/ElectricSQL streaming Postgres -> SQLite) becomes the strong default. Confirm the backend before weapon-forge commits an offline example.

## Sources weapon-forge should re-fetch with deeper context at build time
- EAS CLI reference (`docs.expo.dev/eas/cli/`) - to confirm exact current flag names for `eas update`, `eas update:edit`, `eas update:republish`, `eas update:rollback`, `--rollout-percentage`, `--branch` before hardcoding commands. The rollout/rollback playbook is a practitioner source; verify CLI verbs against official before publishing.
- expo-sqlite + TanStack Query (or hand-rolled push/pull) SYNC example - the store layer is anchored (expo-sqlite official) but the sync-loop code needs a current verbatim example.
- WatermelonDB README + `@nozbe/watermelondb` sync API - for verbatim code if weapon-forge writes a WatermelonDB example.
- Config-plugin authoring pages (`/config-plugins/plugins/`, `/config-plugins/mods/`, the create-a-module tutorial) - for the exact `withInfoPlist` / `withAndroidManifest` import paths and full code sample.
- pnpm-specific Expo monorepo gotchas (current 2026 practitioner post) - for verbatim symlink/node-linker handling in the troubleshooting section. The official monorepo page covers SDK 52+ auto-config but is light on pnpm isolated-node-modules specifics.

## Notes / caveats
- Two notes are practitioner (blog) sourced: the offline-first library landscape (one vendor, PowerSync, among the sources - weighted as opinion) and the OTA rollout/rollback playbook (agency blog - CLI commands flagged verify-before-publish). All other notes are official Expo docs.
- No em dashes used in any note (per Brief directive 7 and global rules).
- Lane boundaries respected: store submission/ASO/IAP flagged as app-store-submission-guardian; React web as react-guardian; native games as Unity cohort. Notes mark the handoff seams (e.g. `--auto-submit`, Apple/Google account setup) without crossing into them.
