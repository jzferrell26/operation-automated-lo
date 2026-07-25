# 07 - Monorepo + metro wiring

ACTION step 7. Wire metro for a monorepo and resolve the production build gotchas. The headline: **on SDK 52+ Expo auto-configures metro for the monorepo**; do NOT paste the old `watchFolders` / `nodeModulesPaths` boilerplate. Demonstrated in the audit example, `examples/02-ota-vs-rebuild-decision.md`.

Source note: `research/monorepo-metro/2026-06-29-expo-monorepo-metro-config.md`.

## Supported workspace layout

Expo supports monorepos with Bun, npm, pnpm, and Yarn (v1 Classic and Berry). Canonical layout:

```
my-monorepo/
  apps/            // Expo applications
    mobile/
  packages/        // shared packages
    ui/
  package.json     // root, with "workspaces": ["apps/*", "packages/*"]
```

For pnpm, use `pnpm-workspace.yaml` instead of the root `package.json` `workspaces` field.

## SDK 52+ auto-configures metro (do not paste old boilerplate)

> "For SDK 52+, Expo automatically configures Metro." (official docs)

This is the most important correction to make against older tutorials. On SDK 52+ you do NOT hand-write the legacy boilerplate:

```js
// LEGACY - pre-SDK-52 only. Do NOT add this on SDK 52+.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
```

And **delete** these deprecated properties if you find them on an SDK 52+ project:
- `resolver.extraNodeModules`
- `resolver.disableHierarchicalLookup`

Older blog posts that paste the `watchFolders` / `nodeModulesPaths` block are outdated for current SDKs. Flag this as a stale-tutorial contradiction during an audit. We are pinned to SDK 56, so the default metro config handles the monorepo; a hand-written `metro.config.js` should only extend the Expo default, not reimplement it.

## The real production gotchas (these still bite on current SDKs)

1. **Duplicate React / React Native versions.** "Duplicate React Native versions are unsupported within a single monorepo." Duplicate React versions in one app cause runtime errors. Pin a single version across all workspace packages.
2. **Duplicate native modules.** "Only one version of a native module can be compiled for an app build at a time." Two workspace packages depending on different versions of the same native module will fail the build.
3. **pnpm symlink / isolated-node-modules quirks.** pnpm's isolated node_modules can confuse native build scripts. The mitigations are `node-linker=hoisted` (in `.npmrc`) or using Node's `require.resolve()` rather than hardcoded paths in native build scripts (Android Gradle, iOS Podfile) to accommodate hoisting variations.

## EAS Build in a monorepo

EAS Build understands workspaces. The build needs the workspace **root** context (set the project root correctly). Use `require.resolve()` rather than hardcoded paths in the Podfile / Gradle scripts so the build survives different hoisting layouts.

## Verify pnpm specifics before writing a troubleshooting deliverable

> TODO: re-fetch -- The official monorepo page covers SDK 52+ auto-config but is light on pnpm isolated-node-modules specifics. Before writing a detailed pnpm troubleshooting section into a deliverable, fetch a current (2026) practitioner post on pnpm-specific Expo monorepo gotchas for the verbatim symlink / `node-linker` handling. Flagged as a gap in the research note.

## Audit checklist for a monorepo

- [ ] SDK is 52+ and metro is NOT carrying hand-written `watchFolders` / `nodeModulesPaths` boilerplate (or a documented reason if it is).
- [ ] No `resolver.extraNodeModules` / `resolver.disableHierarchicalLookup` left over from an old config.
- [ ] A single React and a single React Native version across all workspace packages.
- [ ] No duplicate versions of any native module across packages.
- [ ] Native build scripts (Podfile / Gradle) use `require.resolve()`, not hardcoded paths.
- [ ] For pnpm: `node-linker=hoisted` or a verified working isolated-modules setup.
- [ ] EAS Build is given the workspace root context.
