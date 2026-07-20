# PRD 001a: Tenant Installation and GHL OAuth

## Goal

Create the multi-tenant security and installation foundation for direct sub-account and agency bulk installs.

This feature depends on the database, runtime-role, session, token-envelope, command, inbox, outbox, task, and delivery foundation in [PRD-001j](prd-001j-operation-automated-lo-platform-foundation-runtime-and-delivery.md).

## Scope

- Marketplace app configuration for sub-account target, both installers, and bulk install
- Embedded Custom Page
- Signed HighLevel user-context exchange
- Application session and role mapping
- OAuth authorization-code callback
- Company-token to location-token exchange for bulk installs
- Encrypted token vault and coordinated refresh
- Install, uninstall, and app-update lifecycle events
- Per-location API client with rate-limit and retry behavior
- Self-service installer-authority, granted-scope, and token-health preflight

## Acceptance criteria

### Tenant identity

- Every tenant-owned resource has a non-null product `location_id`. Agency and install identifiers are required only where their lifecycle applies.
- Server authorization derives location from validated session context.
- A request cannot select or override `location_id` in its body or query string.
- Cross-location access tests fail closed for every repository method.

### Embedded session

- The Custom Page requests signed context from the HighLevel parent.
- The encrypted context is sent to the backend and validated there.
- Shared secret and decrypted context are never logged or stored in the browser.
- The resulting embedded application token is short-lived, held only in browser memory, and bound to the active installation, location, user, audience, nonce, and product session.
- Partitioned embedded cookies can improve compatible browsers but are not the sole session mechanism.
- Direct first-party access has an authenticated fallback that resolves the same tenant and role.

### OAuth

- Authorization uses random, signed, expiring, single-use state.
- Callback URL is exact, HTTPS, and backend-controlled.
- Authorization codes are exchanged only from the backend.
- Returned identity is matched to the expected install.
- Granted scopes and token metadata are stored with the installation.
- Tokens are envelope-encrypted and decrypted only for an outbound request.
- Token fields and secrets are redacted from logs, traces, errors, analytics, and support output.

### Refresh and failure

- Refresh begins before expiry based on returned token metadata.
- One location-scoped lock prevents parallel refresh.
- New access and refresh tokens replace the old envelope atomically.
- One request can retry once after a confirmed authentication failure.
- Failed refresh disables external commands and presents a reconnect action.

### Bulk install

- Agency install can enumerate installed locations and request a token for each selected location.
- Future-location install events create or update the correct location installation idempotently.
- Direct location install and bulk install result in the same internal tenant contract.

### Lifecycle

- Install, uninstall, and app-update webhooks verify the current HighLevel signature over the raw body.
- Duplicate webhook IDs are acknowledged but not processed twice.
- Uninstall revokes application sessions, blocks queued writes, and marks tokens unusable immediately.
- Deletion scheduling follows the tenant retention policy.

### Resilience

- The GHL client reads returned rate-limit headers.
- Requests are bounded per location.
- `429` and transient `5xx` responses retry with exponential backoff and jitter.
- Write retries require an application idempotency record.

### Self-service permission setup

- The installer sees every required permission grouped by business purpose before authorization.
- The backend compares granted scopes with the active product capabilities and stores the result with the installation.
- Missing core scopes block onboarding and identify the exact reconnect action.
- Ads publishing permission is activated only through the documented Profile C path and never inferred from read-only ad access.
- The installer receives `location_admin` only when signed HighLevel context confirms appropriate authority.
- Agency bulk install does not imply permission to complete customer attestations or configure every selected location.
- Permission and token checks are repeatable and do not create duplicate installations or role bindings.
- Onboarding can resume after reconnect, reinstall, scope upgrade, or token recovery.

## Out of scope

- Customer-facing campaign features
- Meta publishing
- Marketplace paid-plan implementation
- Agency portfolio reporting

## Verification

- HighLevel App Test proves direct install, bulk install, token refresh, uninstall, reinstall, and app-version update.
- Security tests cover OAuth CSRF, tenant swapping, token leakage, refresh races, forged context, forged webhook, and replay.
