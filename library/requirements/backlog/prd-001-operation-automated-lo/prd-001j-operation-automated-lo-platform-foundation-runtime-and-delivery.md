# PRD-001j: Platform Foundation, Runtime, and Delivery

## Status

Backlog. This is the technical prerequisite for PRD-001a through PRD-001i. Only Phase 0 evidence-harness work is authorized while the core research gates remain blocked.

## Objective

Create the production-grade, multi-tenant platform foundation that every Operation Automated LO feature uses: monorepo, deployable units, typed boundaries, database tenant isolation, durable commands and events, provider-operation safety, deterministic rendering runtime, environment separation, continuous verification, observability, recovery, and release controls.

## User value

The customer does not buy this module directly. It ensures that installation, self-onboarding, campaign generation, PDFs, public pages, HighLevel routing, Meta publication, reporting, billing, and support behave as one reliable product instead of separate Lovable projects or fragile automations.

## Goals

- One scalable product deployment serves every authorized HighLevel location.
- A HighLevel location is enforced as the tenant boundary in application and database layers.
- Web requests stay short while durable tasks survive retries, waits, crashes, and provider outages.
- Every external write is allowlisted, idempotent, audited, and reconcilable.
- The same immutable campaign inputs produce reproducible pages, PDFs, QR codes, and creative.
- Preview, staging, and production are isolated and reproducible.
- One verification command proves types, tests, database policy, contracts, renders, builds, security checks, and package boundaries.
- Support and incident response can trace a customer outcome without reading secrets or unnecessary consumer data.

## Non-goals

- Building microservices before measured need.
- One database, Supabase project, task project, or deployment per customer.
- Replacing HighLevel as CRM, workflow, calendar, contact, opportunity, or connected-Meta system of record.
- General-purpose workflow-builder, page-builder, or AI-agent infrastructure.
- Implementing PRD-002 add-ons.
- Authorizing production feature traffic before research gates G1 through G8 close.

## Architecture contract

The implementation follows these active source-of-truth documents:

- [System build blueprint](../../../knowledge/private/architecture/system-build-blueprint.md)
- [System data model](../../../knowledge/private/architecture/system-data-model.md)
- [System runtime contracts](../../../knowledge/private/architecture/system-runtime-contracts.md)
- [System delivery and operations](../../../knowledge/private/architecture/system-delivery-and-operations.md)
- [Threat model](../../../knowledge/private/security/threat-model.md)

Any conflicting implementation requires an architecture decision and PRD revision before merge.

## Feature requirements

### Monorepo and runtime

- Scaffold pnpm workspaces and Turborepo.
- Pin Node 24 LTS and Next.js 16.2.10 or the later patched stable 16.2 release available at scaffold time.
- Prefer strict TypeScript 7.0.2 or later stable 7.0.x after the scaffold compatibility suite passes, with the TypeScript 6 compatibility package only for tooling that still needs the compiler API.
- Create `apps/web` for Vercel and `apps/tasks` for Trigger.dev.
- Create domain, application, contracts, database, auth, HighLevel, AI, billing, rendering, storage, observability, test-support, and UI packages.
- Enforce dependency direction and prohibit provider or framework imports in the domain package.
- Use strict ESM and correct NodeNext relative import extensions.

### Typed boundaries

- Validate environment variables, HTTP bodies, route parameters, query parameters, headers, cookies, HighLevel context, webhooks, provider responses, task payloads, database JSON, model output, and feature-flag values with Zod.
- Treat all external values as `unknown` until validated.
- Version every public, task, event, render, provider-fixture, and model-output schema.
- Return honest HTTP statuses and stable problem codes.
- Prohibit `any` in product code and unjustified type assertions at boundaries.

### Tenant database foundation

- Create the platform, configuration, campaign, integration, billing, and audit schemas.
- Create `app_runtime`, `scheduler_runtime`, `support_runtime`, `reporting_runtime`, and `migration_owner` with least privilege.
- Enable and force RLS on every tenant table.
- Derive location and actor from the verified session and set them transaction-locally.
- Use Supavisor transaction pooling for Vercel and Trigger.dev runtime traffic with prepared statements disabled.
- Use a separate direct migration connection unavailable to runtime.
- Add tenant-consistent foreign keys, unique indexes, command and provider idempotency, and audit constraints.
- Add pgTAP and integration tests for tenant A, tenant B, missing context, support, scheduler, reporting, and migration roles.

### Sessions and token security

- Validate signed HighLevel user context server-side.
- Issue a five-minute Ed25519-signed embedded JWT, pin `EdDSA`, issuer, audience, key ID, and required claims, and hold it only in browser memory.
- Provide a fragment-carried, single-use first-party fallback and an HttpOnly `__Host-` cookie.
- Make partitioned embedded cookies an enhancement, not the only access path.
- Store only session-secret hashes or token identifiers.
- Encrypt HighLevel access and refresh tokens with per-version AES-256-GCM data keys protected by environment-specific AWS KMS.
- Bind KMS encryption context to environment, provider, installation, and location.
- Use Vercel OIDC for AWS and a restricted rotating Trigger.dev IAM principal until workload identity exists.
- Prohibit tokens in browsers, URLs, analytics, logs, traces, task payloads, and error bodies.

### HTTP, browser, and action security

- Authenticate and authorize inside every route handler, Server Action, command, and task entry point. Do not treat middleware as the authorization boundary.
- Derive location, actor, role, installation, and entitlement server-side and recheck current state for privileged commands.
- Require exact Origin and Host checks plus a session-bound CSRF token for cookie mutations.
- Require an allowlisted non-null browser origin for embedded bearer mutations and prohibit wildcard credentialed CORS.
- Apply actor, session, location, action, and risk-class rate limits to authenticated commands.
- Send distinct CSP and framing rules for embedded, first-party, handoff, and public routes.
- Generate CSP nonces server-side, strip untrusted inbound CSP headers, reject framework-internal request headers, and test the deployed edge behavior.
- Use explicit server-to-client DTOs and prevent server-only data modules from entering client bundles.

### Command, inbox, outbox, and job foundation

- Persist every command with actor, resource, expected version, input hash, idempotency key, result, problem code, and correlation ID.
- Write state, audit, and outbox events in one transaction.
- Dispatch after commit and recover missed dispatch through a scheduled leased sweeper.
- Inbox HighLevel and Stripe webhooks after raw-body signature verification and replay checks.
- Deduplicate provider events and process them asynchronously.
- Persist Trigger.dev run references without making the task platform authoritative.
- Send opaque identifiers only in task payloads.
- Implement bounded global and per-location queues.

### Provider operation safety

- Centralize HighLevel and other provider access behind allowlisted adapters.
- Validate provider responses and rate-limit headers.
- Classify retryable, terminal, reconnect-required, policy, product-conflict, and uncertain-write failures.
- Apply exponential backoff with jitter and provider reset times.
- Never blindly retry a timeout after a possible write.
- Reconcile provider truth before retrying an uncertain ad, contact, opportunity, workflow, or billing operation.
- Store safe request hashes and normalized results, not raw credentials or unnecessary payloads.

### Durable rendering and object storage

- Install pinned Chromium through the Trigger.dev Playwright build extension.
- Bundle fonts, templates, and styles in the task image.
- Render from an immutable validated `RenderManifest` only.
- Deny arbitrary network access and user-supplied HTML.
- Compute SHA-256 and store immutable artifact metadata.
- Create one private and one published R2 bucket per environment.
- Use short-lived constrained signed upload or download URLs for private objects.
- Validate file type, size, dimensions, decompression, and policy before promotion.
- Serve public pages from a limited published projection and immutable asset URLs.

### Environment and delivery foundation

- Support local, preview, staging, and production environments.
- Use data-less Supabase preview branches, Trigger.dev preview branches, and Vercel previews.
- Keep fixed HighLevel App Test and Meta contract testing in staging.
- Fail startup when required environment configuration is absent or invalid.
- Deploy backward-compatible database migrations before tasks and web.
- Record build, commit, migration, task, template, renderer, and contract versions.
- Make feature and provider kill switches server-side and audited.

### Verification and observability

- Provide `pnpm verify` as the canonical local and CI gate.
- Include formatting, lint, TypeScript, unit, integration, database, contract, visual, end-to-end, duplication, boundary, secret, vulnerability, and build checks.
- Add OpenTelemetry correlation across HTTP, command, transaction, outbox, task, provider, webhook, and outcome.
- Use structured redacted logs and an error aggregator.
- Disable product-analytics autocapture and allow only approved safe events.
- Build dashboards and alerts for web, database, outbox, tasks, rendering, HighLevel, Stripe, R2, AI, customer activation, security, and retention.

### Recovery and operations

- Enable daily database backups and point-in-time recovery before production.
- Prove monthly database restores and quarterly full-system recovery exercises.
- Meet a 15-minute database RPO and four-hour core-product RTO for the founding beta.
- Provide incident severity, kill-switch, credential-revocation, provider-reconciliation, export, uninstall, retention, and deletion runbooks before beta.
- Keep an auditable correlation ID on every consequential path.

## Acceptance criteria

### Repository and builds

- [ ] A new developer can install, start local database, run web, run tasks, and execute the complete verification suite from documented commands.
- [ ] Node, pnpm, Next.js, TypeScript, Trigger.dev, Playwright, and database tooling versions are pinned.
- [ ] `apps/web` and `apps/tasks` build from the same tested packages without copied business logic.
- [ ] Import-boundary checks fail a deliberate reverse dependency.
- [ ] No product `any`, unhandled promise, or unvalidated external boundary remains.

### Tenant isolation

- [ ] Runtime credentials do not own product tables and cannot bypass RLS.
- [ ] Tenant A cannot read, infer, insert, modify, delete, approve, publish, export, or support-access tenant B data through application or direct runtime-role tests.
- [ ] Missing transaction tenant context fails closed.
- [ ] A pooled connection cannot retain location or actor context after commit or rollback.
- [ ] Support access requires an active matching grant and produces an audit event.

### Durable work and providers

- [ ] A command transaction failure creates neither state nor outbox work.
- [ ] A post-commit dispatch failure is recovered by the sweeper.
- [ ] Duplicate command, event, task, and webhook delivery produces one business outcome.
- [ ] Tenant queue limits prevent one location from exhausting provider or renderer capacity.
- [ ] A timeout-after-write enters reconciliation and does not issue a duplicate provider write.
- [ ] Uninstall or entitlement loss blocks new work and causes active work to recheck authority before a provider side effect.

### Rendering and storage

- [ ] The same manifest, renderer, template, fonts, and browser version produce matching golden output.
- [ ] Artifact records include source versions, renderer, template, checksum, size, MIME type, storage key, and status.
- [ ] Private objects are not publicly readable.
- [ ] Published objects contain approved public data only and are withdrawn correctly.
- [ ] Malicious image, SVG, HTML, URL, oversized, and decompression inputs are rejected or isolated.

### Sessions and tokens

- [ ] Embedded access works without depending solely on third-party cookies.
- [ ] First-party fallback works when embedding or partitioned cookies are unavailable.
- [ ] OAuth state, signed context, one-time exchange, expiry, refresh, revocation, and replay tests pass.
- [ ] Token plaintext never appears in database rows, task payloads, URLs, logs, traces, analytics, fixtures, or errors.
- [ ] KMS rotation and recovery restore current tokens without cross-environment decryption.
- [ ] Algorithm confusion, bad issuer, bad audience, unknown key ID, stale role version, revoked session, and cross-location token tests fail closed.
- [ ] Cookie CSRF, null origin, cross-origin bearer, middleware-bypass, clickjacking, and handoff-referrer tests fail closed.

### Delivery and recovery

- [ ] Preview, staging, and production have isolated databases, tasks, secrets, storage, Stripe mode, and provider app configuration.
- [ ] Production data is never seeded into preview.
- [ ] Expand and contract migration compatibility is tested against prior web and task versions.
- [ ] `pnpm verify`, production build, security review, and quality review pass for the release commit.
- [ ] Production smoke, synthetic, rollback, database restore, and provider reconciliation exercises pass.
- [ ] Operational alerts link to a correlation ID and documented response.

## Test fixtures

Required deterministic fixtures:

- Two agencies, three locations, and overlapping user identities to prove authorization boundaries.
- Admin, creator, approver, publisher, analyst, Realtor collaborator, support, scheduler, and revoked actors.
- Healthy, expired, revoked, missing-scope, uninstalled, and reconnect-required installations.
- Draft, preflight-failed, awaiting-approval, approved, publishing, uncertain, live, paused, completed, archived, and withdrawn campaigns.
- Short and long brand, address, disclosure, property, and partner content.
- HighLevel success, rate limit, transient error, validation error, policy error, and uncertain-write fixtures.
- Stripe duplicate, out-of-order, cancellation, delayed, and reinstall fixtures.
- Safe, malicious, oversized, mislabeled, corrupt, and high-decompression media.

## Planned code paths

```text
apps/web/
apps/tasks/
packages/application/
packages/auth/
packages/config/
packages/contracts/
packages/db/
packages/domain/
packages/ghl/
packages/ai/
packages/billing/
packages/rendering/
packages/storage/
packages/observability/
packages/test-support/
packages/ui/
supabase/migrations/
supabase/tests/
tests/e2e/
tests/fixtures/
tests/visual/
tooling/
```

## Delivery sequence

1. Scaffold versions, workspaces, packages, verification, and previews.
2. Implement roles, migrations, RLS, transaction context, and tenancy tests.
3. Implement signed context, sessions, roles, support grants, and token envelopes.
4. Implement commands, audits, inbox, outbox, dispatch, tasks, and provider-operation records.
5. Implement R2, Playwright task image, render manifests, checksums, and golden tests.
6. Implement observability, alerts, kill switches, backup, restore, and incident controls.
7. Run security review.
8. Run quality review against this PRD and the construction documents.

## Release blockers

- Any open cross-tenant, token, approval-bypass, unauthorized-spend, or lead-loss finding.
- Any runtime credential with table ownership or RLS bypass.
- Any provider write without uncertain-write reconciliation.
- Any unversioned external contract or unvalidated boundary.
- Any production dependency on a Next.js preview, a release older than the current security floor, or a lockfile with an unaccepted High or Critical advisory.
- Any production environment sharing database, secret, provider, task, or storage state with preview.
- Missing restore evidence, correlation path, kill switch, or named operational owner.

## Related

- [PRD-001 index](prd-001-operation-automated-lo-index.md)
- [2026 build readiness and research gate](../../../knowledge/private/research/2026-build-readiness-and-research-gate.md)
