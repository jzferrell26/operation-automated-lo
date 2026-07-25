// BuildScript.cs — DRIFT scripted build (editor build menu + BuildPipeline.BuildPlayer).
//
// TIER NOTE: PROJECT-DRIFT is mid-Tier-0. AGENTS.md states the Tier 0 deliverable has NO SCENE
// to build, and CLAUDE.md §7 assigns device builds to the HUMAN. This file is TIER-1 PREP: it
// should compile cleanly (editor C#, co-owned with unity-csharp-guardian), but you do NOT run it
// to "verify" Tier 0, and you do NOT add a placeholder scene to force a green build.
//
// Placement (Tier 1): Assets/Scripts/Drift/Editor/Build/BuildScript.cs inside an Editor asmdef.
// Signing + version values come from ENVIRONMENT VARIABLES (CI secrets) — never hardcode them.
//
// CI calls the public no-arg methods via game-ci/unity-builder `buildMethod:` (see
// templates/gameci-unity-build.yml). The [MenuItem] methods are the human's editor entry points;
// both route through the same core so CI and local never diverge.

#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;            // BuildFailedException, NamedBuildTarget
using UnityEditor.Build.Reporting;  // BuildReport, BuildSummary, BuildResult
using UnityEngine;

namespace Drift.Build
{
    public static class BuildScript
    {
        // --- Editor menu entry points (human) -----------------------------------------------

        [MenuItem("DRIFT/Build/Android AAB (Release)")]
        public static void BuildAndroidReleaseMenu() => BuildAndroid(development: false, appBundle: true);

        [MenuItem("DRIFT/Build/Android APK (Dev)")]
        public static void BuildAndroidDevMenu() => BuildAndroid(development: true, appBundle: false);

        [MenuItem("DRIFT/Build/iOS Xcode Project (Release)")]
        public static void BuildIosReleaseMenu() => BuildIos(development: false);

        // --- CI entry points (game-ci/unity-builder buildMethod / -executeMethod) ------------

        public static void BuildAndroidRelease() => BuildAndroid(development: false, appBundle: true);
        public static void BuildIosRelease()     => BuildIos(development: false);

        // --- Android ------------------------------------------------------------------------

        public static void BuildAndroid(bool development, bool appBundle)
        {
            // Player Settings in CODE, not editor state (guides/05, guides/02).
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetApiCompatibilityLevel(NamedBuildTarget.Android, ApiCompatibilityLevel.NET_Standard_2_1);
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android, ManagedStrippingLevel.High);
            PlayerSettings.SetIl2CppCodeGeneration(NamedBuildTarget.Android, Il2CppCodeGeneration.OptimizeSize);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            EditorUserBuildSettings.buildAppBundle = appBundle;

            ApplyVersion(NamedBuildTarget.Android);
            ApplyAndroidSigning();

            string ext = appBundle ? "aab" : "apk";
            string outPath = Path.Combine("build", "Android", $"drift.{ext}");
            RunBuild(BuildTarget.Android, outPath, development);
        }

        private static void ApplyAndroidSigning()
        {
            // Secrets from ENV (CI secrets / shell), NEVER committed (guides/03). The keystore is
            // the UPLOAD key; Google holds the app signing key under Play App Signing.
            string ksPath = Env("DRIFT_KEYSTORE_PATH");
            if (string.IsNullOrEmpty(ksPath))
            {
                Debug.LogWarning("[BuildScript] No DRIFT_KEYSTORE_PATH set — building UNSIGNED (CI/dev only). " +
                                 "A store release must inject the upload keystore via secrets.");
                PlayerSettings.Android.useCustomKeystore = false;
                return;
            }
            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = ksPath;
            PlayerSettings.Android.keystorePass = Env("DRIFT_KEYSTORE_PASS");
            PlayerSettings.Android.keyaliasName = Env("DRIFT_KEY_ALIAS");
            PlayerSettings.Android.keyaliasPass = Env("DRIFT_KEY_ALIAS_PASS");
        }

        // --- iOS (design-level; the Xcode project is built/signed on macOS — guides/04) ------

        public static void BuildIos(bool development)
        {
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.iOS, ManagedStrippingLevel.High);
            ApplyVersion(NamedBuildTarget.iOS);

            // Emits an Xcode project; fastlane (match/gym/pilot) turns it into a signed .ipa on macOS.
            string outPath = Path.Combine("build", "iOS");
            RunBuild(BuildTarget.iOS, outPath, development);
        }

        // --- Shared core --------------------------------------------------------------------

        private static void ApplyVersion(NamedBuildTarget target)
        {
            // Single-source version derivation from CI (guides/09).
            PlayerSettings.bundleVersion = Env("DRIFT_VERSION", "0.0.0");
            int buildNumber = int.TryParse(Env("DRIFT_BUILD_NUMBER", "0"), out var n) ? n : 0;
            if (target == NamedBuildTarget.Android)
                PlayerSettings.Android.bundleVersionCode = buildNumber;   // monotonic; store rejects non-increasing
            else if (target == NamedBuildTarget.iOS)
                PlayerSettings.iOS.buildNumber = buildNumber.ToString();
        }

        private static void RunBuild(BuildTarget target, string outPath, bool development)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(outPath) ?? "build");

            // TIER-0 TRAP (guides/06 §1): in Tier 0 the scene list is EMPTY (no scene — AGENTS.md).
            // That is EXPECTED. Do NOT add a placeholder scene to force a green build.
            string[] scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
            if (scenes.Length == 0)
                Debug.LogWarning("[BuildScript] No enabled scenes — Tier 0 has no buildable scene (AGENTS.md). " +
                                 "This build is Tier-1 work; this script is prep that should compile, not run-to-verify.");

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = outPath,
                target = target,
                options = development ? BuildOptions.Development : BuildOptions.None,
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;

            if (summary.result != BuildResult.Succeeded)
                throw new BuildFailedException(
                    $"[BuildScript] {target} build {summary.result}: {summary.totalErrors} errors, {summary.totalWarnings} warnings.");

            Debug.Log($"[BuildScript] {target} build SUCCEEDED: {summary.totalSize} bytes at {outPath}");
            LogLargestAssets(report);   // build-size teardown (guides/08, co-owned with mobile-game-perf-guardian)
        }

        private static void LogLargestAssets(BuildReport report)
        {
            var top = report.packedAssets
                .SelectMany(p => p.contents)
                .OrderByDescending(c => (long)c.packedSize)
                .Take(15);
            Debug.Log("[BuildScript] === Top build-size contributors ===");
            foreach (var c in top)
                Debug.Log($"  {c.sourceAssetPath}: {c.packedSize} bytes");
        }

        private static string Env(string key, string fallback = null) =>
            Environment.GetEnvironmentVariable(key) ?? fallback;
    }
}
#endif
