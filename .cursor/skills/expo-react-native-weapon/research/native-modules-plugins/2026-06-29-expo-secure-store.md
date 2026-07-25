---
source_url: https://docs.expo.dev/versions/latest/sdk/securestore/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: secure-store
weapon: expo-react-native-weapon
---

# expo-secure-store (official Expo docs)

## Summary
expo-secure-store provides encrypted, per-project key-value storage for SENSITIVE data: iOS Keychain (`kSecClassGenericPassword`), Android `SharedPreferences` encrypted with the Android Keystore system. This is the correct home for tokens/secrets and the direct answer to Brief directive 5 (secrets use SecureStore, never AsyncStorage which is plaintext). API: `setItemAsync` / `getItemAsync` / `deleteItemAsync`. It carries a small-payload limit (~2048 bytes historically on iOS) and is explicitly NOT a general database.

## Key quotations / statistics
- iOS: values stored using "keychain services as `kSecClassGenericPassword`". Android: "SharedPreferences, encrypted with Android's Keystore system."
- Per-project isolation: each Expo project has isolated storage with no access to other projects' data.
- API: `setItemAsync(key, value, options)`, `getItemAsync(key, options)`, `deleteItemAsync(key, options)`.
- Size limit: "Large payloads can be rejected by the underlying platform. Historically, some iOS releases refused values above roughly 2048 bytes."
- Not a DB: "designed to provide a persistent data storage solution" for sensitive credentials, not "a single source of truth for irreplaceable, critical data."
- `requireAuthentication` option: when enabled, biometric auth is required to access stored data. Default access level `WHEN_UNLOCKED` restricts retrieval to "when the device is unlocked by the user." Use `canUseBiometricAuthentication()` to verify device capability first.

## Annotations for weapon-forge
- Cite verbatim for directive 5. The contrast to teach: AsyncStorage = plaintext, unencrypted, fine for non-sensitive UI state; SecureStore = Keychain/Keystore-backed, for tokens/secrets/PII; MMKV = fast but also not encrypted by default. Tokens -> SecureStore, always.
- Document the ~2048-byte limit as a real gotcha: a long JWT or a large refresh-token blob can hit it; chunking or storing only a token reference is the workaround.
- `requireAuthentication` + `WHEN_UNLOCKED` is the high-security pattern (biometric-gated token) worth a callout for finance/health apps.
- Note: this Guardian is the app-layer owner; deep credential-lifecycle / threat-model audits route to security-guardian per the Brief lane boundary. Mention but do not over-build the security section.
