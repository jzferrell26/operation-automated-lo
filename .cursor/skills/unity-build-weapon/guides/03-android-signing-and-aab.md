# 03 — Android: Signing, AAB & Play Asset Delivery

Keystores, app signing, the AAB, and PAD. **The most security-sensitive guide in this Weapon.**

> **Tier note:** keystore setup and the signing design are Tier-1 prep; the human runs the
> signed device build (`CLAUDE.md §7`). PAD is forward guidance (no shippable content in Tier 0).

## 1. Create the upload keystore

```bash
keytool -genkeypair -v \
  -keystore drift-upload.keystore \
  -alias drift-upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "<STOREPASS>" -keypass "<KEYPASS>"
```

`-validity 10000` (days, ~27 years) is conventional so the key outlives the app. See
`templates/android-keystore-setup.md` for the full runbook.

## 2. The cardinal rule: secrets never enter git

The keystore file and its passwords are **secrets**. They are:

- **Never committed** to the repo. Add `*.keystore` / `*.jks` to `.gitignore`.
- **Injected via environment variables** into the scripted build (see `templates/BuildScript.cs`):

```csharp
PlayerSettings.Android.keystoreName = Environment.GetEnvironmentVariable("DRIFT_KEYSTORE_PATH");
PlayerSettings.Android.keystorePass = Environment.GetEnvironmentVariable("DRIFT_KEYSTORE_PASS");
PlayerSettings.Android.keyaliasName = Environment.GetEnvironmentVariable("DRIFT_KEY_ALIAS");
PlayerSettings.Android.keyaliasPass = Environment.GetEnvironmentVariable("DRIFT_KEY_ALIAS_PASS");
```

- In **CI**, these come from GitHub Actions secrets; the keystore file is base64-decoded from a
  secret into a temp path at job start (`guides/10`, `templates/gameci-unity-build.yml`).

A committed keystore or a hardcoded password is a **must-fix** — it is an irreversible leak of a
signing credential.

## 3. Play App Signing (the modern model)

Under **Play App Signing**, **Google holds the app signing key**; you upload your AAB signed with
your **upload key**. Why this matters:

- The app signing key (the one users' devices verify against) never leaves Google — it can't be
  leaked by your CI.
- If your **upload** key is ever compromised, Google can **reset** it. The signing key cannot be
  reset, which is exactly why Google holds it.

So the keystore your build uses is the **upload** keystore. Enroll in Play App Signing when you
create the app in the Play Console (it is the default for new apps).

## 4. AAB output & Play Asset Delivery (forward)

- **AAB** is the upload format (`guides/02 §4`). Google splits it per-device at install.
- **Play Asset Delivery (PAD)** delivers large assets as **asset packs** outside the base AAB:
  - **install-time** — delivered with the app.
  - **fast-follow** — delivered right after install, in the background.
  - **on-demand** — fetched when the game asks for them.

  PAD raises the effective content ceiling past the base AAB size limit, and integrates with
  Addressables (`guides/07`). **This is Tier-1 forward guidance** — DRIFT has no shippable content
  yet (`CLAUDE.md §6` Rule #1: one tier at a time). Adopting PAD is a deliberate Tier-1 ADR.

## Severity

- **Must-fix:** keystore or password committed to git; hardcoded signing credentials in
  `BuildScript.cs`; shipping a debug-signed AAB to the Play Store.
- **Should-refactor:** not enrolled in Play App Signing; keystore path/passwords passed as build
  args (visible in process listings/logs) instead of env vars.
- **Style:** alias naming.

## Handoffs

- The keystore runbook → `templates/android-keystore-setup.md`.
- CI secret injection → `guides/10`, `templates/gameci-unity-build.yml`.
- Uploading the signed AAB to the store / store config → `app-store-submission-guardian`.
- Addressables + PAD content delivery → `guides/07` (forward).
