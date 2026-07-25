---
source_url: https://docs.expo.dev/guides/monorepos/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: monorepo-metro
weapon: expo-react-native-weapon
---

# Expo monorepo + metro config (official Expo docs)

## Summary
Expo supports monorepos with Bun, npm, pnpm, and Yarn (v1 and Berry) workspaces. The canonical layout is `apps/*` (Expo apps) + `packages/*` (shared packages) with a root `package.json` `workspaces` field (or `pnpm-workspace.yaml` for pnpm). For SDK 52+, Expo AUTOMATICALLY configures Metro for the monorepo; manual `metro.config.js` tuning (watchFolders, resolver.nodeModulesPaths) is only needed on older SDKs. The big production gotchas are duplicate React / React Native versions and duplicate native modules, which are unsupported and cause runtime/build errors.

## Key quotations / statistics
- "For SDK 52+, Expo automatically configures Metro."
- Manual (pre-SDK-52) settings: `config.watchFolders = [monorepoRoot]`; `config.resolver.nodeModulesPaths` typically `[path.resolve(projectRoot, 'node_modules'), path.resolve(monorepoRoot, 'node_modules')]`.
- Deprecated properties to delete if present on SDK 52+: `resolver.extraNodeModules`, `resolver.disableHierarchicalLookup`.
- Supported workspace managers: "Bun, npm, pnpm, and Yarn (v1 Classic and Berry)."
- Layout: `apps/` (Expo applications), `packages/` (shared packages), root `package.json` with `"workspaces": ["apps/*", "packages/*"]`; for pnpm use `pnpm-workspace.yaml`.
- Critical warnings: "Duplicate React Native versions are unsupported within a single monorepo." Duplicate React versions in one app cause runtime errors. "Only one version of a native module can be compiled for an app build at a time." Use Node's `require.resolve()` rather than hardcoded paths in native build scripts (Android Gradle, iOS Podfile) to accommodate hoisting variations.

## Annotations for weapon-forge
- Satisfies Brief ACTION step 7 (wire metro for a monorepo) and the "production gotchas" expansion query.
- Headline guidance: on SDK 52+ DO NOT hand-write the old watchFolders/nodeModulesPaths boilerplate; Expo's default metro config handles it. Older blog posts that paste that boilerplate are now outdated for current SDKs. Flag this as a contradiction with pre-SDK-52 tutorials.
- The real monorepo failure modes to document: (1) duplicate React/React Native from bad hoisting or mismatched versions across workspace packages -> pin a single version; (2) duplicate native module versions -> only one compiles; (3) pnpm symlink/isolated-node-modules quirks -> may need `node-linker=hoisted` or `require.resolve()` in native scripts.
- For EAS Build in a monorepo: the build needs the workspace root context; document setting the project root and that EAS Build understands workspaces, plus the `require.resolve()` rule for Podfile/Gradle.
- Gap: fetch a current (2026) practitioner post on pnpm-specific Expo monorepo gotchas for verbatim symlink-handling detail before writing the troubleshooting section.
