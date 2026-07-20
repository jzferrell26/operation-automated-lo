# PRD 001a: Tenant Installation and GHL OAuth

## Goal

Create the multi-tenant security and installation foundation for direct sub-account and agency bulk installs.

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

## Acceptance criteria

### Tenant identity

- Every tenant resource is bound to `company_id`, `location_id`, and `install_id`.
- Server authorization derives location from validated session context.
- A request cannot select or override `location_id` in its body or query string.
- Cross-location access tests fail closed for every repository method.

### Embedded session

- The Custom Page requests signed context from the HighLevel parent.
- The encrypted context is sent to the backend and validated there.
- Shared secret and decrypted context are never logged or stored in the browser.
- The resulting session is short-lived, secure, same-site compatible for the supported embed path, and bound to the active location and user.
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

## Out of scope

- Customer-facing campaign features
- Meta publishing
- Marketplace paid-plan implementation
- Agency portfolio reporting

## Verification

- HighLevel App Test proves direct install, bulk install, token refresh, uninstall, reinstall, and app-version update.
- Security tests cover OAuth CSRF, tenant swapping, token leakage, refresh races, forged context, forged webhook, and replay.
