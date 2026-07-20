# Security Threat Model

## Scope

This threat model covers the proposed Marketplace installation, embedded app, public campaign pages, asset generation, GHL CRM writes, and GHL Ad Manager operations.

## Protected assets

- GHL access and refresh tokens
- Marketplace client secret and shared secret
- Tenant brand and compliance configuration
- Property photos and unpublished campaign assets
- Lead consent receipts and destination mapping
- Campaign budgets and publish authority
- GHL contact, opportunity, appointment, and campaign identifiers
- Approval and execution audit history
- Product model-provider credentials, tenant brand samples, compiled prompt snapshots, and AI usage records

## Trust boundaries

1. HighLevel parent frame to embedded application
2. Browser to application API
3. Application API to token vault and tenant database
4. Application to HighLevel API
5. HighLevel to webhook endpoint
6. Public campaign visitor to lead-capture endpoint
7. Rendering worker to object storage
8. Approval link recipient to approval command
9. Application worker to approved LLM provider

## Threats and required controls

| Threat | Control |
| --- | --- |
| Tenant swaps a location ID in a request | Derive location from a validated server session. Never authorize from a client-supplied location. |
| Forged embedded user context | Use HighLevel signed context and backend validation. Do not trust query parameters. |
| OAuth login CSRF or install confusion | Signed, random, expiring state bound to the expected installation. Exact redirect URL. Single use nonce. |
| Installer self-elevates through onboarding | Derive installer authority from validated signed HighLevel context, grant only the mapped default role, and require an authorized location administrator for local setup. |
| Browser forges checklist completion or Launch Ready | Compute completion server-side from current provider reads, validated configuration, and test evidence. Treat client progress as display state only. |
| Agency or support operator completes customer attestations | Bind attestations to the authenticated location actor, forbid support-role substitution, and show role concentration in the final setup summary. |
| Token theft | Envelope encryption, server-only access, secret redaction, restricted database role, rotation, and uninstall revocation. |
| Refresh race invalidates rotating token | Location-scoped refresh lock and atomic token-envelope update. |
| Broad `adPublishing.write` scope is abused | Separate Ads Publisher capability where feasible, strict action allowlist, no deletion or audience uploads, approval checks, and audited commands. |
| User edits campaign after approval | Content-addressed frozen versions. Any material edit creates a new version and invalidates approval. |
| Replay of publish request | Idempotency key bound to location, campaign version, operation, and approval. Provider read-back after uncertainty. |
| Forged or replayed webhook | Verify Ed25519 signature over raw body, persist webhook ID, reject duplicates, enqueue after verification. |
| Public page exposes private CRM data | Published projection allowlist, opaque public ID, output encoding, and no runtime read of raw opportunity or contact. |
| Stored or reflected script injection | Schema limits, HTML sanitization, URL allowlists, output encoding, CSP, and isolated rendering. |
| Malicious file upload | MIME sniffing, image decode and re-encode, size and dimension caps, malware scan where appropriate, object quarantine, EXIF removal. |
| Lead endpoint abuse or spam | Rate limiting, bot detection, honeypot or challenge escalation, idempotent submission ID, and tenant quotas. |
| Consent evidence is changed | Store immutable disclosure text or content hash plus rendered version, page, timestamp, and submission ID. |
| Logs leak PII or provider secrets | Structured allowlist logging, centralized redaction, no raw bodies, and automated secret-pattern tests. |
| Renderer reaches internal network | Sandboxed worker, blocked metadata endpoints, outbound allowlist, resource caps, and no tenant-provided executable code. |
| Uploaded brand sample injects model instructions | Treat samples as untrusted quoted data, use strict prompt boundaries and schemas, prohibit sample content from changing policy or tools, and run adversarial evaluation fixtures. |
| Brand or campaign context crosses tenants through caching | Use location and immutable version IDs in cache keys, keep provider organizations product-controlled, and test identical cross-location prompts for isolation. |
| Model invents license, disclosure, rate, proof, testimonial, or consent facts | Collect sensitive facts structurally, label model suggestions, require field-level confirmation, and block output through deterministic preflight and named approval. |
| Model output creates a publish or compliance decision | Keep model clients outside command authorization, expose no publish tools, and require the normal command gate after deterministic checks. |
| Model retries create unbounded spend or duplicate drafts | Per-user and per-location quotas, bounded retry classes, idempotency keys, one accepted result, token caps, and budget exceptions. |
| Prompt, response, or provider log leaks tenant or borrower data | Exclude borrower and private CRM data, minimize prompts, redact telemetry, restrict raw-output retention, disable training opt-in, and review provider retention terms. |
| Browser or tenant supplies a provider key or model override | Product credentials and model policy remain server-only; reject client-supplied provider, key, endpoint, model, or budget fields. |
| Broken object access | Private buckets by default, signed short-lived URLs, tenant-prefixed keys, and public copies only for approved projections. |
| Theme or brand input injects arbitrary CSS | Accept only `light`, `dark`, or `system` as theme values; derive the tenant brand from the authenticated location; compile allowlisted semantic tokens; never accept raw tenant CSS, selectors, scripts, or unapproved URLs. |
| Pre-paint theme script weakens CSP | Use a per-request nonce for the minimal theme bootstrap and retain a strict script policy for every other source. |
| Dependency or CI compromise | Lockfiles, provenance checks, least-privilege CI token, secret scanning, and reviewed release artifacts. |

## Authorization roles

Minimum roles:

- `location_admin`: install settings, routing, team roles, billing, and deletion
- `campaign_creator`: create and edit drafts
- `campaign_approver`: approve frozen versions
- `campaign_publisher`: publish, pause, and resume
- `viewer`: read dashboards and campaign history
- `platform_support`: time-limited, audited support access with no publish authority by default

Tenant policy can require separation between creator, approver, and publisher. A platform operator must never silently assume a customer's approval role.

## Command gate

Every external write command must pass these checks in order:

1. Active installation and healthy token
2. Authenticated tenant and authorized role
3. Valid request schema
4. Existing frozen campaign version
5. Current successful preflight
6. Current required approvals
7. Operation allowlist
8. Budget and tenant limits
9. Idempotency reservation
10. Durable execution and provider read-back
11. Safe audit event

## Security release gates

- Cross-tenant access tests cover every repository query and object-storage path.
- OAuth state, token refresh, uninstall, and reconnect tests pass.
- Signed HighLevel user context is verified server-side.
- Installer authority, application-role assignment, and role-escalation tests pass for direct and agency install paths.
- Launch Ready cannot be produced from browser state, stale evidence, or a support-role action.
- Webhook Ed25519 verification and replay tests pass.
- No token, secret, lead payload, phone, email, or property-photo URL leaks into logs unexpectedly.
- Public-page injection, upload, SSRF, CSRF, clickjacking, and open-redirect tests pass.
- Publish command cannot run without current approval and exact version match.
- Destructive ad and audience endpoints are unreachable from product code.
- Theme values and tenant brand keys are server-validated enums, and no arbitrary CSS reaches the browser.
- The pre-paint theme bootstrap passes strict CSP nonce tests and exposes no tenant or user data.
- Rate limits, retries, idempotency, and uncertain-write reconciliation are tested.
- Prompt injection, cross-tenant cache isolation, structured-output, model-failover, token-cap, and budget-exhaustion tests pass.
- Provider training opt-in is disabled, prompt content excludes borrower data, and retention and data-processing terms are approved before production.
- Tenant export, uninstall, retention, and deletion procedures are tested.

## Open security decisions

- Whether the public Marketplace release uses a separate Ads Publisher app ID
- Production secrets and envelope-encryption provider
- Retention duration for consent, approval, and ad execution evidence
- Whether approval links require a passwordless one-time challenge or authenticated account
- Exact iframe `frame-ancestors` allowlist for HighLevel and white-label domains
- Whether public campaign pages support tenant custom domains in the first release
