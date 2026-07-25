# Android Keystore Setup — Runbook

Creating the DRIFT **upload** keystore, enrolling in Play App Signing, and injecting the secret
into builds. **The most security-sensitive runbook in this Weapon.**

> **Tier note:** keystore setup is Tier-1 prep; the human runs the signed device build
> (`CLAUDE.md §7`). Do it once, before the first store-bound build.

## 1. Create the upload keystore (once, on a trusted machine)

```bash
keytool -genkeypair -v \
  -keystore drift-upload.keystore \
  -alias drift-upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=PROJECT DRIFT, OU=Games, O=DRIFT, C=US"
# You will be prompted for the keystore password and the key password. Use STRONG, DISTINCT values.
```

- `-validity 10000` (~27 years) — the key must outlive the app.
- Record the **keystore password**, **key alias** (`drift-upload`), and **key password** in a
  password manager. **If you lose the upload key, Google can reset it** (that's the point of Play
  App Signing) — but losing the *credentials* still blocks releases until reset.

## 2. The cardinal rule

The keystore file and its passwords are **secrets**:

- [ ] Add `*.keystore` and `*.jks` to `.gitignore`. **Never commit the keystore.**
- [ ] Never hardcode passwords in `BuildScript.cs` — read from env (`guides/03 §2`).
- [ ] Store the keystore outside the repo; back it up encrypted in a vault/password manager.

A committed keystore or a hardcoded password is a **must-fix** — an irreversible signing-credential leak.

## 3. Enroll in Play App Signing

When you create the app in the **Google Play Console**, opt into **Play App Signing** (default for
new apps):

- **Google holds the app signing key** (the one devices verify) — it never leaves Google.
- **You hold the upload key** (the keystore from §1) — used to sign the AAB you upload.
- If the upload key is compromised, request an upload-key reset in the Console.

## 4. Local build: inject via environment variables

```bash
export DRIFT_KEYSTORE_PATH="/secure/path/drift-upload.keystore"
export DRIFT_KEYSTORE_PASS="<keystore-password>"
export DRIFT_KEY_ALIAS="drift-upload"
export DRIFT_KEY_ALIAS_PASS="<key-password>"

# Then the human runs the build (CLAUDE.md §7), e.g. via the editor menu (guides/06) or:
# Unity -batchmode -nographics -quit -projectPath . \
#   -executeMethod Drift.Build.BuildScript.BuildAndroidRelease -logFile -
```

`templates/BuildScript.cs` reads exactly these four variables (`ApplyAndroidSigning`).

## 5. CI: store as secrets, base64 the file

GitHub Actions can't store a binary, so base64-encode the keystore into a secret:

```bash
base64 -w0 drift-upload.keystore   # paste the output into the DRIFT_KEYSTORE_B64 repo secret
```

Repo secrets to create (used by `templates/gameci-unity-build.yml`):

| Secret | Contents |
|---|---|
| `DRIFT_KEYSTORE_B64` | base64 of `drift-upload.keystore` |
| `DRIFT_KEYSTORE_PASS` | keystore password |
| `DRIFT_KEY_ALIAS` | `drift-upload` |
| `DRIFT_KEY_ALIAS_PASS` | key password |

The workflow base64-decodes the keystore to `runner.temp` at job start and points
`DRIFT_KEYSTORE_PATH` at it — the file never lives in the repo.

## 6. Verification checklist

- [ ] Keystore created with a long validity and strong, distinct passwords.
- [ ] `*.keystore` / `*.jks` in `.gitignore`; keystore NOT in git history (`git log --all -- '*.keystore'`).
- [ ] Play App Signing enrolled (Google holds the signing key).
- [ ] Passwords in env / CI secrets only; none in `BuildScript.cs`.
- [ ] CI keystore stored as base64 secret, decoded at runtime.

## Handoffs

- Signing config in the build script → `guides/03`, `templates/BuildScript.cs`.
- CI secret wiring → `guides/10`, `templates/gameci-unity-build.yml`.
- Uploading the signed AAB to the Play Console → `app-store-submission-guardian`.
