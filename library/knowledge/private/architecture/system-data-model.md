# System Data Model

> Category: Architecture | Version: 1.0 | Date: July 2026 | Status: Active

The construction-level PostgreSQL model for tenant isolation, campaign versioning, external operations, billing, AI usage, and auditability.

**Related:**

- [System build blueprint](system-build-blueprint.md)
- [System runtime contracts](system-runtime-contracts.md)
- [System delivery and operations](system-delivery-and-operations.md)
- [Threat model](../security/threat-model.md)

---

## Data design rules

1. A HighLevel location is the tenant security boundary.
2. Every tenant-owned row has a non-null `location_id`.
3. Every externally meaningful identifier is unique within its provider and tenant scope.
4. Mutable resources keep optimistic concurrency through `version_no` or `row_version`.
5. Campaign inputs, profiles, blueprints, approvals, artifacts, token envelopes, entitlements, and consequential audit events are versioned or append-only.
6. JSONB is reserved for versioned snapshots, provider-safe normalized fragments, and forward-compatible metadata. Searchable, constrained, related, or security-sensitive fields use typed columns.
7. Raw provider payloads have a short, explicit retention period. Normalized fields are the durable record.
8. Every timestamp is `timestamptz` in UTC. Business display time zones are explicit IANA identifiers.
9. Monetary values use integer minor units plus ISO currency.
10. Deletion is a workflow. Soft deletion is not a substitute for executing retention and provider deletion obligations.

## Database schemas and roles

| Schema | Purpose |
| --- | --- |
| `platform` | Agencies, locations, installations, users, roles, support grants, sessions |
| `configuration` | Brand, compliance, partner, routing, channel, prompt, and blueprint versions |
| `campaign` | Campaign aggregates, immutable versions, artifacts, approvals, launches, attribution |
| `integration` | OAuth envelopes, webhooks, commands, provider operations, outbox, job references |
| `billing` | Customers, subscriptions, entitlements, usage ledger, billing events |
| `audit` | Append-only security, access, configuration, approval, and publication events |

Runtime roles:

| Role | Access rule |
| --- | --- |
| `app_runtime` | Product reads and writes under transaction-local tenant and actor context, no table ownership, no `BYPASSRLS` |
| `scheduler_runtime` | Reads only safe work-discovery columns and creates task leases, then switches to tenant-scoped application transactions |
| `support_runtime` | Access only when an active support grant exists, always tenant-scoped and audited |
| `reporting_runtime` | Reads approved de-identified aggregates and security-invoker views only |
| `migration_owner` | Owns DDL and migrations, available only to deployment automation and break-glass administration |

The product does not use Supabase `service_role` for normal web or worker traffic. Supabase documents that service keys can bypass RLS, so they are limited to explicit platform administration if they are used at all. Source: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Identifier conventions

- Internal primary keys: UUIDv7 where the selected library and database extension pass compatibility tests, otherwise random UUIDv4.
- Public identifiers: independent 128-bit random values encoded as URL-safe strings. Never expose sequential IDs, provider IDs, or internal UUIDs by default.
- Provider IDs: text because HighLevel, Meta, Stripe, and model providers own their formats.
- Idempotency keys: SHA-256 of a namespaced canonical input, stored as 64-character lowercase hex.
- Content hashes: SHA-256 of canonical bytes, stored separately from object-provider ETags.

## Platform tables

### `platform.agencies`

| Column | Rule |
| --- | --- |
| `id` | Primary key |
| `ghl_agency_id` | Unique provider identifier when known |
| `display_name` | Safe display label |
| `status` | `active`, `suspended`, `deleted` |
| `created_at`, `updated_at` | Audit timestamps |

Agency membership never grants implicit location access.

### `platform.locations`

| Column | Rule |
| --- | --- |
| `id` | Product primary key |
| `agency_id` | Optional parent agency |
| `ghl_location_id` | Unique active HighLevel location identifier |
| `display_name` | Safe display label |
| `time_zone` | IANA identifier |
| `status` | `pending`, `active`, `suspended`, `uninstalled`, `deleting`, `deleted` |
| `data_region` | Selected product region |
| `created_at`, `updated_at` | Audit timestamps |

Indexes: unique active `ghl_location_id`, `(agency_id, status)`, and `(status, updated_at)`.

### `platform.marketplace_installs`

Tracks installation lifecycle, distribution channel, application identifier, granted scopes, installer, install and uninstall timestamps, and latest health state. A location can have historical installs but only one active install per application.

Required unique keys:

- `(location_id, marketplace_app_id, active_flag)` for the active row.
- `(marketplace_app_id, external_install_id)` when HighLevel supplies an install identifier.

### `platform.app_users`

Maps one product user to a HighLevel user identity and safe profile label. Email is stored only if required for first-party access or notification and is encrypted or normalized according to the data policy.

### `platform.role_bindings`

| Field | Purpose |
| --- | --- |
| `location_id` | Tenant scope |
| `user_id` | Product actor |
| `role` | `location_admin`, `creator`, `approver`, `publisher`, `analyst`, `realtor_collaborator` |
| `campaign_id` | Optional restriction for collaborators |
| `granted_by`, `granted_at`, `revoked_at` | Authority history |

An exclusion constraint or application transaction prevents overlapping duplicate active bindings.

### `platform.support_grants`

Time-boxed, reason-bound, location-specific support access. Required fields include requester, approver, support actor, scope, reason code, ticket reference, start, expiry, revocation, and last-use time. Reading a support grant never authorizes access by itself. The database policy and application authorization must both confirm it.

### `platform.sessions`

Stores a hash of the session secret or token identifier, never the bearer token. Fields include user, location, installation, session mode, issued time, idle expiry, absolute expiry, last activity, revoked time, bootstrap nonce, and risk state.

### `platform.onboarding_runs` and `platform.onboarding_steps`

One resumable run per location and onboarding schema version. Step rows hold verifier version, status, safe evidence references, blocking code, remediation owner, checked time, and expiry time. Technical completion comes from verifiers, not a browser checkbox.

## Integration tables

### `integration.oauth_token_envelopes`

Append-only encrypted token versions:

| Column | Purpose |
| --- | --- |
| `location_id`, `install_id`, `provider` | Tenant and provider binding |
| `version_no` | Monotonic per installation |
| `access_ciphertext`, `refresh_ciphertext` | AES-256-GCM ciphertext |
| `access_nonce`, `refresh_nonce` | Unique nonce per encrypted value |
| `access_tag`, `refresh_tag` | Authentication tag |
| `encrypted_data_key` | KMS-encrypted data-encryption key |
| `kms_key_arn`, `kms_key_version` | Key traceability |
| `scope_set` | Normalized safe scopes |
| `issued_at`, `access_expires_at`, `refresh_expires_at` | Lifecycle |
| `retired_at`, `revoked_at`, `failure_code` | Health and retirement |

Unique key: `(install_id, provider, version_no)`. Only one non-retired current token is selected under a transaction lock.

### `integration.webhook_receipts`

Durable inbox for HighLevel, Stripe, and approved future providers.

Required fields:

- Provider and environment.
- Provider event ID when supplied.
- Event type and provider API version.
- Body SHA-256.
- Signature verification result and verified timestamp.
- Resolved location and install when known.
- Received, accepted, processed, failed, quarantined, and retention timestamps.
- Normalized payload or encrypted raw-body object reference with short retention.
- Correlation ID and processing error code.

Unique keys:

- `(provider, provider_event_id)` when event ID exists.
- `(provider, event_type, body_sha256, replay_window_bucket)` as a bounded fallback.

### `integration.command_executions`

One durable record for every user or system command:

- `id`, `location_id`, command name, schema version.
- Actor, session, source, aggregate type and ID.
- Idempotency key and canonical input hash.
- Expected aggregate version.
- Status: `accepted`, `committed`, `dispatched`, `completed`, `failed`, `uncertain`, `canceled`.
- Safe result summary, problem code, correlation ID, and timestamps.

Unique key: `(location_id, command_name, idempotency_key)`.

### `integration.outbox_events`

Written in the same transaction as state changes. Fields include event name, schema version, aggregate references, opaque payload references, available time, dispatch attempts, last error code, lease owner, lease expiry, dispatched time, and processed time.

Indexes:

- Partial index on `(available_at, created_at)` where `dispatched_at is null`.
- `(location_id, aggregate_type, aggregate_id, created_at)`.
- Unique `(location_id, event_name, idempotency_key)`.

### `integration.provider_operations`

Every consequential HighLevel, Meta-through-HighLevel, Stripe, R2, model, or future licensed-data operation receives a row.

Fields include provider, operation, command ID, aggregate and version, idempotency key, safe request hash, provider request ID, provider object ID, attempt count, rate-limit state, status, response class, uncertain-write flag, reconciliation state, and timestamps. Raw secrets and raw bodies are excluded.

### `integration.job_runs`

Maps a product job to Trigger.dev run identifiers without making Trigger.dev authoritative. It stores task name, task schema version, location, aggregate, command, trigger run ID, queue key, attempt, state, heartbeat, last progress, terminal code, and timestamps.

## Configuration tables

### Versioned profile pattern

The following tables use the same pattern:

- `configuration.brand_profile_versions`
- `configuration.compliance_profile_versions`
- `configuration.brand_prompt_snapshots`
- `configuration.brand_rule_set_versions`
- `configuration.ghl_routing_profile_versions`
- `configuration.channel_connection_snapshots`
- `configuration.campaign_blueprint_versions`

Each row includes location where tenant-owned, logical resource ID, monotonic version, immutable snapshot fields, schema version, content hash, creator, source, created time, and superseded time. The logical resource table points to the current version. Updating means inserting a version and moving the pointer in one transaction.

### `configuration.partner_profiles`

Stores Realtor business identity, public contact fields, brand assets, relationship status, permission attestations, and optional HighLevel contact reference. Campaign versions copy an immutable partner snapshot so later profile changes do not alter approved artifacts.

### `configuration.feature_flags`

Server-evaluated flags scoped to platform, cohort, agency, or location. Fields include key, value schema, scope, start, expiry, reason, approver, and audit reference. Client flags contain no secrets and grant no authority.

## Campaign tables

### `campaign.campaigns`

The mutable aggregate root:

| Column | Purpose |
| --- | --- |
| `id`, `location_id`, `public_id` | Identity |
| `campaign_type` | Initially `open_house_boost` only |
| `status` | Domain state machine |
| `current_input_version_id` | Current frozen input |
| `current_draft_version_id` | Current generated campaign version |
| `approved_version_id` | Exact approved version, nullable |
| `published_version_id` | Exact live version, nullable |
| `row_version` | Optimistic concurrency |
| `event_starts_at`, `event_ends_at` | Campaign timing |
| `archived_at`, `created_at`, `updated_at` | Lifecycle |

Indexes: `(location_id, status, updated_at desc)`, `(location_id, event_starts_at)`, unique `(location_id, public_id)`, and search indexes for normalized property address and partner when those fields are added.

### `campaign.campaign_input_versions`

Immutable property, event, loan-officer, partner, routing, and rights-attestation inputs. Each version references exact configuration versions and stores canonical content hash. It excludes borrower, application, and opportunity-note data.

### `campaign.campaign_versions`

Immutable compiled campaign package. Fields include input version, blueprint version, brand version, compliance version, partner snapshot, prompt snapshot, generated copy, targeting request, budget request, dates, destination, form mapping, disclosure block, schema version, and content hash.

### `campaign.render_manifests`

Immutable, fully expanded inputs for deterministic rendering. A manifest contains no unresolved "current" pointer. Unique key: `(location_id, campaign_version_id, renderer_contract_version)`.

### `campaign.artifacts`

| Column | Purpose |
| --- | --- |
| `artifact_type` | `public_page_projection`, `pdf`, `qr`, `meta_square`, `meta_story`, `email_pack`, `sms_pack` |
| `campaign_version_id`, `render_manifest_id` | Immutable source |
| `renderer_version`, `template_version` | Reproducibility |
| `object_bucket`, `object_key` | Storage address |
| `sha256`, `mime_type`, `byte_size`, `width`, `height`, `page_count` | Integrity |
| `status`, `failure_code` | Lifecycle |
| `created_at`, `retained_until`, `deleted_at` | Retention |

Unique key prevents duplicate output for the same manifest, type, renderer, and template.

### `campaign.preflight_runs` and `campaign.preflight_findings`

One run binds exact campaign, artifact, rule-set, and provider-contract versions. Findings are stable codes with severity, field path, source rule, message template, remediation owner, and blocking state. A preflight is never overwritten.

### `campaign.approval_decisions`

Append-only approval or rejection of an exact campaign version. Fields include actor, role, decision, decision reason, terms or policy version, IP or session evidence where lawful, and timestamp. A campaign edit creates another version and clears the aggregate's `approved_version_id`.

### `campaign.channel_launches`

One launch per channel and campaign version. Fields include requested provider objects, approved budget and dates, status, provider operation references, live identifiers, last confirmed provider state, uncertain-write state, and reconciliation timestamps.

### `campaign.published_projections`

The only table read by public campaign-page queries. It contains approved public data, opaque public ID, published version, immutable asset URLs, consent text version, active window, cache version, and withdrawn time. No internal or provider credentials are present.

### `campaign.attribution_links` and `campaign.outcome_events`

`attribution_links` connects an opaque visitor or submission ID to campaign, channel, provider identifiers, and HighLevel object IDs. `outcome_events` is append-only and normalized to milestones such as lead submitted, contact linked, opportunity created, appointment booked, application received, funded, closed, or disqualified.

Do not overwrite first or last attribution into one field. Keep the event chain and compute reporting projections.

## Billing and AI tables

### `billing.customers` and `billing.subscriptions`

Local projections of Stripe identifiers and current subscription state. They contain no card, bank, or full payment-method data.

### `billing.entitlement_versions`

Append-only feature and allowance projection with source event, plan, effective window, status, campaign allowance, generation allowance, and override reason. The current pointer changes only inside the verified billing transaction.

### `billing.usage_ledger`

Append-only debits and credits for campaign packs, regeneration allowances, storage, or other product meters. Unique source reference prevents duplicate charges. Raw model tokens remain an internal cost measure, not the customer-facing unit.

### `billing.llm_generation_runs`

Stores model request identity, version references, output hash, validation status, and disposition. Prompt and output bodies are held only where product need and retention policy allow. Full prompts are not copied into traces.

### `billing.ai_usage_events`

Append-only provider usage and cost facts: input tokens, cached input tokens, output tokens, provider price version, estimated cost, actual reconciled cost, latency, retry, cache outcome, and refusal state.

## Audit tables

### `audit.events`

Append-only security and consequential business events:

- Authentication success and failure.
- Role and support-grant changes.
- Installation, scope, token, and channel health changes.
- Configuration version creation and activation.
- Campaign command, preflight, approval, publication, pause, resume, and deletion.
- Provider uncertain writes and reconciliation.
- Export, retention, legal hold, and deletion activity.
- Billing and entitlement changes.

Each event has location, agency when relevant, actor type and ID, subject, action, result, safe before and after hashes, correlation ID, source IP hash when allowed, user-agent class, event schema version, and timestamp. Audit events never contain token plaintext, raw lead data, full prompts, or provider secrets.

## Row-level security contract

Every tenant table enables and forces RLS. The migration owner is not used by runtime. Policies follow this shape:

```sql
alter table campaign.campaigns enable row level security;
alter table campaign.campaigns force row level security;

create policy campaigns_location_select
on campaign.campaigns
for select
to app_runtime
using (
  location_id = nullif(current_setting('app.location_id', true), '')::uuid
);

create policy campaigns_location_write
on campaign.campaigns
for all
to app_runtime
using (
  location_id = nullif(current_setting('app.location_id', true), '')::uuid
)
with check (
  location_id = nullif(current_setting('app.location_id', true), '')::uuid
);
```

Additional rules:

- Missing tenant context yields no rows and failed writes.
- `location_id` is indexed on every tenant table and leads composite indexes.
- Views use `security_invoker = true` unless a reviewed exception exists.
- Security-definer functions set an empty trusted `search_path`, schema-qualify every object, and have an explicit grant allowlist.
- Foreign keys include tenant consistency where practical, such as `(location_id, campaign_id)` referencing a matching composite unique key.
- A database test tries every operation with tenant A, tenant B, missing context, support context, scheduler context, and migration context.

Supabase notes that exposed tables require RLS, update policies need both `USING` and `WITH CHECK` behavior, RLS columns should be indexed, and views otherwise bypass underlying policies unless configured as security invoker. Source: [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Integrity constraints

Database constraints enforce the campaign rules that must survive application defects:

- One active install per location and marketplace app.
- One current profile version per logical profile.
- One current token version per active installation and provider.
- An approved version belongs to the same campaign and location.
- A published version must equal an approved version at launch time.
- Artifact source versions all belong to the same campaign and location.
- Provider object IDs are unique within provider, location, and object type.
- Budget minor units are non-negative and within product hard limits.
- Event end occurs after event start.
- Published projections reference only ready artifacts.
- Entitlement-effective windows do not overlap for the same plan slot.

Complex cross-row invariants use a transaction and deferred constraint trigger only when a normal foreign key, check, exclusion constraint, or unique index cannot express them.

## Retention defaults

These are engineering defaults pending counsel and lender approval:

| Data | Default |
| --- | --- |
| Verified webhook raw body | Encrypted object, 7 days, then normalized record only |
| Failed upload quarantine | 7 days |
| Session | 30 days after expiry or revocation |
| OAuth envelope history | Current plus prior rotation evidence, delete after uninstall retention expires |
| Public lead transient payload | Delete after confirmed HighLevel routing and bounded recovery period, keep consent receipt and normalized link |
| Trigger task payload | Opaque IDs only, provider retention must be approved |
| Generated draft not published | 180 days after account inactivity unless policy requires less |
| Published artifacts and approvals | Contract, lender, legal, and campaign retention schedule |
| Audit event | Seven years is a proposal only, counsel must approve final duration |

Legal hold overrides deletion but never grants broader access. Every retention rule is encoded as data and processed through audited jobs.

## Migration rules

- Migrations are forward-only after production use.
- Use expand, backfill, switch, and contract for destructive or high-volume changes.
- No migration mixes an unbounded backfill with a blocking DDL change.
- Every migration includes a rollback or roll-forward note, lock-risk estimate, and verification query.
- Preview branches start without production data and use deterministic synthetic seeds.
- Production schema changes run before code only when backward compatible. Contract migrations run after all old code is gone.
- RLS and grant diff tests run on every migration.

## Scaling thresholds

Do not partition tables or split databases on day one. Revisit when measured evidence reaches one of these thresholds:

- `audit.events`, `outcome_events`, or `webhook_receipts` exceeds 10 million live rows or routine retention deletes cause sustained bloat.
- Database CPU remains above 60 percent for 15 minutes during normal traffic after query and index tuning.
- Runtime database p95 exceeds 200 ms for normal indexed product queries.
- Connection wait exceeds 100 ms at p95 after pool tuning.
- Reporting workloads materially affect command latency, at which point use a read replica or separate analytics projection.
- Regulatory or enterprise contracts require physically separate data stores.

## Changelog

- v1.0 (2026-07): Defined the initial schemas, tables, roles, RLS contract, retention defaults, and scale triggers.
