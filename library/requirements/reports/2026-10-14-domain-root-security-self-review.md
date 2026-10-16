# Customer-domain root Security self-review

Scope: the domain-root increment after87ad9b2, reviewed inline by its author under the sequential-work instruction. This is not an independent review. Earlier Quality receipts cover their original snapshots. This new Security pass precedes a fresh Quality pass for the current delta.

Result: no blocking Security finding in this source increment. Actual DNS, TLS, owned-host behavior and deployment remain unqualified. No hosted migration or configuration changed.

- `supabase/migrations/20261014180000_funnel_domain_root.sql:7`: the only new capability is a read-only definer returning one UUID. Its empty search_path and fully qualified objects preserve the existing trusted domain binding and snapshot checks. PUBLIC execution is revoked; app_runtime alone receives execute. The owner location, user and chosen kind come only from the current verified binding, never request-supplied tenant/actor IDs. It selects the newest publication first, then checks current publication validity, so expiry/revocation cannot silently restore an older root destination.
- `apps/web/src/server/funnel-domain-routing.ts:125`: the host is normalized and exact authority checked before the finite domainDefault capability. Both domain and public-publication flags/configuration must qualify. The strict result schema permits only a UUID and builds a relative `/f/` path, preventing open redirects and arbitrary URL/tenant fields. The platform-host branch performs no domain database query.
- `apps/web/src/app/page.tsx:22`: a customer destination or refusal is handled before workspace/demo selection. A session cookie or forwarded-host hint never selects a private root destination. Missing/failed resolution invokes notFound. Platform-root overview and local-demo behavior remain covered. The actual `/f/` reader independently rechecks the binding and publication at navigation time.
- `apps/web/src/proxy.ts:50`: GET/HEAD root shape is admitted to that independent consumer. POST is refused. Existing private customer-host paths remain blocked. Customer root responses get no-store, no-referrer and noindex headers. Nonce/CSP construction and sealed financing policy remain unchanged. No new provider/network transport, customer data, credential, write capability or paid effect is introduced.

Evidence:109 focused domain/proxy/security unit cases pass;3 server-page integration cases pass; all29 real homeowner/domain route cases pass on PostgreSQL17.11 under a NOINHERIT non-superuser login, plus the five shared-budget native cases. Domain tests exercise owner/kind separation, latest publication selection, no older fallback after revocation, expiry, disconnect and reassignment. The original runtime UPDATE denial initially failed under the vanilla superuser fixture; it was rerun under the restricted login with the denial assertion preserved. No product permission was weakened.

All158 contracts,16 package typechecks plus tooling,16 production builds, lint, formatting, boundary/type/secret and zero-clone checks pass. The deterministic scanner completed, with zero production dependency vulnerabilities and clean Unicode; its unchanged Guild-template CORS hit, root-only Next-config discovery and stale CVE-catalog limitations remain as previously disclosed. No baseline changed.

| Source | SHA256 (raw bytes) |
| --- | --- |
| Root migration | 8554874ebf9a20c1a7b1454deb2da68f85cfb6496c29d609c9c413a7735829d9 |
| funnel-domain-routing.ts | c4f200b390369f4dd36d2ad3bc332f8705b98721f157e7fc5895e267df033a33 |
| funnel-public-store.ts | 8a60f27b6644e52150ea8cf98ffb2e6cda05d004db0fced45a7df6035cb1115f |
| app/page.tsx | 002358d6a6f92435d851ad2f2e570f83e3d0b27af10df25e7d72f349cb7b7bc6 |
| proxy.ts | 19b45fc099843731322e005fdb1bfa9836fae10fd3613fa05ff481b6b9458677 |

Whole-product release remains HOLD. The earlier enabled fixture-only whole-app startup was rejected by automatic approval review as blocked by policy and was not repackaged or retried. The new route has source/native/component evidence, not a claimed live custom-host journey.
