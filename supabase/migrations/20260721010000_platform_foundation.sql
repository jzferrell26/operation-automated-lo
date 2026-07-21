-- Operation Automated LO production database foundation.
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- Migration safety:
-- - This is a greenfield migration. Every ACCESS EXCLUSIVE lock is taken only
--   while creating a new object with no rows and no production readers.
-- - All indexes are created normally because their tables are new and empty.
-- - After production use, changes to these objects are forward-only and must
--   use expand, backfill, switch, and contract where a rewrite or long lock is
--   possible.
-- - Roll forward by correcting a later migration. A destructive down migration
--   is allowed only on an unlinked local database before any durable data exists.
--
-- Verification queries are implemented in supabase/tests/*.pgtap.sql.

do $roles$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'migration_owner') then
    create role migration_owner nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'scheduler_runtime') then
    create role scheduler_runtime nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'support_runtime') then
    create role support_runtime nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'reporting_runtime') then
    create role reporting_runtime nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
  end if;
end
$roles$;

do $role_guard$
begin
  if exists (
    select 1
    from pg_catalog.pg_roles
    where rolname in (
      'migration_owner', 'app_runtime', 'scheduler_runtime', 'support_runtime', 'reporting_runtime'
    )
      and (rolsuper or rolcreatedb or rolcreaterole or rolinherit or rolreplication or rolbypassrls or rolcanlogin)
  ) then
    raise exception 'Foundation roles must remain NOLOGIN, NOINHERIT, and without elevated attributes';
  end if;
end
$role_guard$;

do $migration_membership$
begin
  execute pg_catalog.format(
    'grant migration_owner to %I with set true, inherit false',
    current_user
  );
  execute pg_catalog.format(
    'grant app_runtime, scheduler_runtime, support_runtime, reporting_runtime to %I with set true, inherit false',
    current_user
  );
  if current_user <> 'postgres' then
    grant migration_owner, app_runtime, scheduler_runtime, support_runtime, reporting_runtime
      to postgres with set true, inherit false;
  end if;
end
$migration_membership$;

create schema if not exists platform authorization migration_owner;
create schema if not exists configuration authorization migration_owner;
create schema if not exists campaign authorization migration_owner;
create schema if not exists integration authorization migration_owner;
create schema if not exists billing authorization migration_owner;
create schema if not exists audit authorization migration_owner;

alter schema platform owner to migration_owner;
alter schema configuration owner to migration_owner;
alter schema campaign owner to migration_owner;
alter schema integration owner to migration_owner;
alter schema billing owner to migration_owner;
alter schema audit owner to migration_owner;

revoke all on schema platform, configuration, campaign, integration, billing, audit from public;

set role migration_owner;

alter default privileges in schema platform, configuration, campaign, integration, billing, audit
  revoke all on tables from public;
alter default privileges in schema platform, configuration, campaign, integration, billing, audit
  revoke all on sequences from public;
alter default privileges in schema platform, configuration, campaign, integration, billing, audit
  revoke execute on functions from public;

create table platform.agencies (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  ghl_agency_id text,
  display_name text not null check (pg_catalog.length(display_name) between 1 and 200),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create unique index agencies_ghl_agency_id_active_uq
  on platform.agencies (ghl_agency_id)
  where ghl_agency_id is not null and status <> 'deleted';

create table platform.locations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  agency_id uuid references platform.agencies (id) on delete restrict,
  ghl_location_id text,
  display_name text not null check (pg_catalog.length(display_name) between 1 and 200),
  time_zone text not null default 'UTC' check (pg_catalog.length(time_zone) between 1 and 100),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'uninstalled', 'deleting', 'deleted')),
  data_region text not null default 'us' check (pg_catalog.length(data_region) between 1 and 32),
  row_version bigint not null default 1 check (row_version > 0),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create index locations_agency_id_idx on platform.locations (agency_id);
create index locations_status_updated_at_idx on platform.locations (status, updated_at desc);
create unique index locations_ghl_location_id_active_uq
  on platform.locations (ghl_location_id)
  where ghl_location_id is not null and status <> 'deleted';

create table platform.app_users (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  ghl_user_id text,
  safe_display_name text not null check (pg_catalog.length(safe_display_name) between 1 and 200),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create unique index app_users_ghl_user_id_active_uq
  on platform.app_users (ghl_user_id)
  where ghl_user_id is not null and status <> 'deleted';

create table platform.role_bindings (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  user_id uuid not null references platform.app_users (id) on delete restrict,
  role text not null check (
    role in ('location_admin', 'creator', 'approver', 'publisher', 'analyst', 'realtor_collaborator')
  ),
  granted_by uuid,
  granted_at timestamptz not null default pg_catalog.now(),
  revoked_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  constraint role_bindings_location_id_id_uq unique (location_id, id),
  constraint role_bindings_revocation_order_ck check (revoked_at is null or revoked_at >= granted_at)
);

create index role_bindings_location_id_idx on platform.role_bindings (location_id);
create index role_bindings_user_id_idx on platform.role_bindings (user_id);
create unique index role_bindings_active_uq
  on platform.role_bindings (location_id, user_id, role)
  where revoked_at is null;

create table platform.marketplace_installations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  provider text not null default 'ghl' check (provider in ('ghl')),
  marketplace_app_id text not null check (pg_catalog.length(marketplace_app_id) between 1 and 200),
  external_install_id text,
  scope_set text[] not null default '{}'::text[],
  status text not null default 'pending'
    check (status in ('pending', 'active', 'missing_scope', 'reconnect_required', 'revoked', 'uninstalled')),
  installed_at timestamptz,
  uninstalled_at timestamptz,
  health_checked_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint marketplace_installations_location_id_id_uq unique (location_id, id),
  constraint marketplace_installations_lifecycle_ck check (
    uninstalled_at is null or installed_at is null or uninstalled_at >= installed_at
  )
);

create index marketplace_installations_location_id_idx
  on platform.marketplace_installations (location_id);
create unique index marketplace_installations_active_uq
  on platform.marketplace_installations (location_id, marketplace_app_id)
  where status in ('pending', 'active', 'missing_scope', 'reconnect_required');
create unique index marketplace_installations_external_id_uq
  on platform.marketplace_installations (provider, external_install_id)
  where external_install_id is not null;

create table platform.support_grants (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  support_actor_id uuid not null,
  requested_by_actor_id uuid not null,
  approved_by_actor_id uuid not null,
  scope text not null check (scope in ('read', 'diagnose', 'export')),
  reason_code text not null check (pg_catalog.length(reason_code) between 1 and 100),
  ticket_reference text not null check (pg_catalog.length(ticket_reference) between 1 and 200),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  constraint support_grants_location_id_id_uq unique (location_id, id),
  constraint support_grants_window_ck check (expires_at > starts_at),
  constraint support_grants_revocation_ck check (revoked_at is null or revoked_at >= starts_at)
);

create index support_grants_location_id_idx on platform.support_grants (location_id);
create index support_grants_active_lookup_idx
  on platform.support_grants (location_id, support_actor_id, scope, starts_at, expires_at)
  where revoked_at is null;

create table configuration.feature_flags (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  flag_key text not null check (flag_key ~ '^[a-z][a-z0-9._-]{1,99}$'),
  value_schema_version integer not null check (value_schema_version > 0),
  value_json jsonb not null check (pg_catalog.jsonb_typeof(value_json) in ('boolean', 'number', 'string', 'object', 'array')),
  reason text not null check (pg_catalog.length(reason) between 1 and 500),
  starts_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz,
  created_by_actor_id uuid not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint feature_flags_location_id_id_uq unique (location_id, id),
  constraint feature_flags_window_ck check (expires_at is null or expires_at > starts_at),
  constraint feature_flags_location_key_version_uq unique (location_id, flag_key, starts_at)
);

create index feature_flags_location_id_idx on configuration.feature_flags (location_id);
create index feature_flags_active_lookup_idx
  on configuration.feature_flags (location_id, flag_key, starts_at desc)
  where expires_at is null;

create table campaign.campaigns (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  public_id uuid not null default pg_catalog.gen_random_uuid(),
  campaign_type text not null default 'open_house_boost'
    check (campaign_type in ('open_house_boost')),
  status text not null default 'draft'
    check (status in (
      'draft', 'preflight_failed', 'awaiting_approval', 'approved', 'publishing',
      'uncertain', 'live', 'paused', 'completed', 'archived', 'withdrawn'
    )),
  row_version bigint not null default 1 check (row_version > 0),
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  archived_at timestamptz,
  created_by_actor_id uuid not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint campaigns_location_id_id_uq unique (location_id, id),
  constraint campaigns_location_public_id_uq unique (location_id, public_id),
  constraint campaigns_event_window_ck check (
    event_starts_at is null or event_ends_at is null or event_ends_at > event_starts_at
  )
);

create index campaigns_location_id_idx on campaign.campaigns (location_id);
create index campaigns_location_status_updated_idx
  on campaign.campaigns (location_id, status, updated_at desc);
create index campaigns_location_event_start_idx
  on campaign.campaigns (location_id, event_starts_at)
  where event_starts_at is not null;

create table integration.command_executions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  command_name text not null check (pg_catalog.length(command_name) between 1 and 150),
  schema_version integer not null check (schema_version > 0),
  actor_id uuid not null,
  actor_type text not null check (actor_type in ('user', 'support', 'system', 'webhook')),
  resource_type text not null check (pg_catalog.length(resource_type) between 1 and 100),
  resource_id text not null check (pg_catalog.length(resource_id) between 1 and 200),
  expected_version bigint check (expected_version is null or expected_version >= 0),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  status text not null default 'accepted'
    check (status in ('accepted', 'committed', 'dispatched', 'completed', 'failed', 'uncertain', 'canceled')),
  result_summary jsonb not null default '{}'::jsonb
    check (pg_catalog.jsonb_typeof(result_summary) = 'object'),
  problem_code text,
  correlation_id text not null check (pg_catalog.length(correlation_id) between 1 and 200),
  committed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint command_executions_location_id_id_uq unique (location_id, id),
  constraint command_executions_idempotency_uq unique (location_id, command_name, idempotency_key),
  constraint command_executions_terminal_ck check (
    status not in ('completed', 'failed', 'canceled') or completed_at is not null
  )
);

create index command_executions_location_id_idx on integration.command_executions (location_id);
create index command_executions_actor_idx
  on integration.command_executions (location_id, actor_id, created_at desc);
create index command_executions_status_idx
  on integration.command_executions (location_id, status, created_at)
  where status in ('accepted', 'committed', 'dispatched', 'uncertain');

create table integration.outbox_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  command_id uuid not null,
  event_name text not null check (event_name in (
    'onboarding.verification-requested.v1',
    'campaign.generation-requested.v1',
    'campaign.render-requested.v1',
    'campaign.publish-requested.v1',
    'campaign.pause-requested.v1',
    'campaign.resume-requested.v1',
    'lead.routing-requested.v1',
    'provider.reconciliation-requested.v1',
    'location.export-requested.v1',
    'location.deletion-requested.v1'
  )),
  schema_version integer not null check (schema_version > 0),
  aggregate_type text not null check (pg_catalog.length(aggregate_type) between 1 and 100),
  aggregate_id text not null check (pg_catalog.length(aggregate_id) between 1 and 200),
  aggregate_version bigint not null check (aggregate_version >= 0),
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  payload_ref text not null check (pg_catalog.length(payload_ref) between 1 and 300),
  correlation_id text not null check (pg_catalog.length(correlation_id) between 1 and 200),
  available_at timestamptz not null default pg_catalog.now(),
  dispatch_attempts integer not null default 0 check (dispatch_attempts >= 0),
  last_error_code text,
  lease_owner text,
  lease_expires_at timestamptz,
  dispatched_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  constraint outbox_events_location_id_id_uq unique (location_id, id),
  constraint outbox_events_command_fk foreign key (location_id, command_id)
    references integration.command_executions (location_id, id) on delete restrict,
  constraint outbox_events_idempotency_uq unique (location_id, event_name, idempotency_key),
  constraint outbox_events_event_version_ck check (
    event_name ~ ('\.v' || schema_version::text || '$')
  ),
  constraint outbox_events_lease_ck check (
    (lease_owner is null and lease_expires_at is null) or
    (lease_owner is not null and lease_expires_at is not null)
  )
);

create index outbox_events_location_id_idx on integration.outbox_events (location_id);
create index outbox_events_command_fk_idx
  on integration.outbox_events (location_id, command_id);
create index outbox_events_dispatch_idx
  on integration.outbox_events (available_at, created_at)
  where dispatched_at is null;
create index outbox_events_aggregate_idx
  on integration.outbox_events (location_id, aggregate_type, aggregate_id, created_at);

create table integration.provider_operations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  command_id uuid not null,
  provider text not null check (provider in ('ghl', 'meta_via_ghl', 'stripe', 'r2', 'model')),
  operation_name text not null check (pg_catalog.length(operation_name) between 1 and 150),
  aggregate_type text not null check (pg_catalog.length(aggregate_type) between 1 and 100),
  aggregate_id text not null check (pg_catalog.length(aggregate_id) between 1 and 200),
  aggregate_version bigint check (aggregate_version is null or aggregate_version >= 0),
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  safe_request_hash text not null check (safe_request_hash ~ '^[0-9a-f]{64}$'),
  provider_request_id text,
  provider_object_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'in_progress', 'uncertain', 'reconciling', 'confirmed', 'failed', 'blocked')),
  response_class text check (response_class is null or response_class in (
    'AUTH_REFRESHABLE', 'AUTH_RECONNECT_REQUIRED', 'RATE_LIMITED', 'TRANSIENT_PROVIDER',
    'VALIDATION_TERMINAL', 'POLICY_TERMINAL', 'UNCERTAIN_WRITE', 'PRODUCT_CONFLICT',
    'DEPENDENCY_BLOCKED', 'CONFIRMED'
  )),
  uncertain_write boolean not null default false,
  reconciliation_state text not null default 'not_required'
    check (reconciliation_state in ('not_required', 'required', 'in_progress', 'confirmed_success', 'confirmed_absent', 'escalated')),
  normalized_result jsonb not null default '{}'::jsonb
    check (pg_catalog.jsonb_typeof(normalized_result) = 'object'),
  rate_limit_reset_at timestamptz,
  authority_checked_at timestamptz,
  last_attempt_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint provider_operations_location_id_id_uq unique (location_id, id),
  constraint provider_operations_command_fk foreign key (location_id, command_id)
    references integration.command_executions (location_id, id) on delete restrict,
  constraint provider_operations_idempotency_uq unique (
    location_id, provider, operation_name, idempotency_key
  ),
  constraint provider_operations_uncertain_ck check (
    not uncertain_write or status in ('uncertain', 'reconciling', 'confirmed', 'failed')
  ),
  constraint provider_operations_reconciliation_ck check (
    not uncertain_write or reconciliation_state <> 'not_required'
  )
);

create index provider_operations_location_id_idx on integration.provider_operations (location_id);
create index provider_operations_command_fk_idx
  on integration.provider_operations (location_id, command_id);
create index provider_operations_reconciliation_idx
  on integration.provider_operations (location_id, status, updated_at)
  where status in ('uncertain', 'reconciling');
create unique index provider_operations_provider_object_uq
  on integration.provider_operations (location_id, provider, operation_name, provider_object_id)
  where provider_object_id is not null;

create table integration.webhook_receipts (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  provider text not null check (provider in ('ghl', 'stripe')),
  environment text not null check (environment in ('local', 'preview', 'staging', 'production')),
  provider_event_id text,
  event_type text not null check (pg_catalog.length(event_type) between 1 and 150),
  provider_api_version text not null check (pg_catalog.length(provider_api_version) between 1 and 100),
  body_sha256 text not null check (body_sha256 ~ '^[0-9a-f]{64}$'),
  signature_verified boolean not null,
  signature_verified_at timestamptz,
  replay_window_bucket timestamptz not null,
  normalized_payload jsonb not null default '{}'::jsonb
    check (pg_catalog.jsonb_typeof(normalized_payload) = 'object'),
  status text not null default 'accepted'
    check (status in ('accepted', 'processed', 'failed', 'quarantined')),
  correlation_id text not null check (pg_catalog.length(correlation_id) between 1 and 200),
  received_at timestamptz not null default pg_catalog.now(),
  processed_at timestamptz,
  retention_expires_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint webhook_receipts_location_id_id_uq unique (location_id, id),
  constraint webhook_receipts_signature_ck check (
    not signature_verified or signature_verified_at is not null
  ),
  constraint webhook_receipts_retention_ck check (retention_expires_at > received_at)
);

create index webhook_receipts_location_id_idx on integration.webhook_receipts (location_id);
create unique index webhook_receipts_provider_event_uq
  on integration.webhook_receipts (provider, provider_event_id)
  where provider_event_id is not null;
create unique index webhook_receipts_fallback_uq
  on integration.webhook_receipts (provider, event_type, body_sha256, replay_window_bucket)
  where provider_event_id is null;
create index webhook_receipts_processing_idx
  on integration.webhook_receipts (location_id, status, received_at)
  where status = 'accepted';

create table integration.delivery_claims (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  delivery_kind text not null check (delivery_kind in ('command', 'event', 'task', 'webhook')),
  external_delivery_id text not null check (pg_catalog.length(external_delivery_id) between 1 and 300),
  business_outcome_key text not null check (pg_catalog.length(business_outcome_key) between 1 and 300),
  status text not null default 'claimed'
    check (status in ('claimed', 'completed', 'released', 'completion_uncertain')),
  claimed_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  released_at timestamptz,
  completion_uncertain_at timestamptz,
  problem_code text,
  constraint delivery_claims_location_id_id_uq unique (location_id, id),
  constraint delivery_claims_external_uq unique (location_id, delivery_kind, external_delivery_id),
  constraint delivery_claims_outcome_uq unique (location_id, delivery_kind, business_outcome_key),
  constraint delivery_claims_state_ck check (
    (status = 'claimed' and completed_at is null and released_at is null
      and completion_uncertain_at is null and problem_code is null)
    or (status = 'completed' and completed_at is not null and released_at is null
      and completion_uncertain_at is null and problem_code is null)
    or (status = 'released' and completed_at is null and released_at is not null
      and completion_uncertain_at is null and problem_code is null)
    or (status = 'completion_uncertain' and completed_at is null and released_at is null
      and completion_uncertain_at is not null and problem_code = 'DELIVERY_COMPLETION_UNCERTAIN')
  )
);

create index delivery_claims_location_id_idx on integration.delivery_claims (location_id);

create table integration.ai_usage_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  usage_event_ref text not null check (pg_catalog.length(usage_event_ref) between 1 and 300),
  actor_ref text not null check (pg_catalog.length(actor_ref) between 1 and 300),
  correlation_ref text not null check (pg_catalog.length(correlation_ref) between 1 and 300),
  feature text not null check (feature in ('brand_extraction', 'campaign_pack', 'repair', 'regeneration')),
  occurred_at timestamptz not null,
  payload jsonb not null check (pg_catalog.jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default pg_catalog.now(),
  constraint ai_usage_events_ref_uq unique (usage_event_ref),
  constraint ai_usage_events_location_id_id_uq unique (location_id, id)
);

create index ai_usage_events_location_occurred_idx
  on integration.ai_usage_events (location_id, occurred_at desc);

create table integration.ai_trace_records (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  trace_ref text not null check (pg_catalog.length(trace_ref) between 1 and 300),
  actor_ref text not null check (pg_catalog.length(actor_ref) between 1 and 300),
  correlation_ref text not null check (pg_catalog.length(correlation_ref) between 1 and 300),
  feature text not null check (feature in ('brand_extraction', 'campaign_pack', 'repair', 'regeneration')),
  occurred_at timestamptz not null,
  payload jsonb not null check (pg_catalog.jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default pg_catalog.now(),
  constraint ai_trace_records_ref_uq unique (trace_ref),
  constraint ai_trace_records_location_id_id_uq unique (location_id, id)
);

create index ai_trace_records_location_occurred_idx
  on integration.ai_trace_records (location_id, occurred_at desc);

create table integration.ai_telemetry_reconciliation_queue (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  usage_event_ref text not null check (pg_catalog.length(usage_event_ref) between 1 and 300),
  trace_ref text not null check (pg_catalog.length(trace_ref) between 1 and 300),
  usage_payload jsonb not null check (pg_catalog.jsonb_typeof(usage_payload) = 'object'),
  trace_payload jsonb not null check (pg_catalog.jsonb_typeof(trace_payload) = 'object'),
  problem_code text not null check (problem_code = 'AI_TELEMETRY_PERSISTENCE_FAILED'),
  status text not null default 'pending' check (status in ('pending', 'reconciling', 'completed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default pg_catalog.now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_attempt_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint ai_telemetry_reconciliation_pair_uq unique (usage_event_ref, trace_ref),
  constraint ai_telemetry_reconciliation_location_id_id_uq unique (location_id, id),
  constraint ai_telemetry_reconciliation_lease_ck check (
    (lease_owner is null and lease_expires_at is null)
    or (lease_owner is not null and lease_expires_at is not null)
  ),
  constraint ai_telemetry_reconciliation_completed_ck check (
    status <> 'completed' or completed_at is not null
  )
);

create index ai_telemetry_reconciliation_pending_idx
  on integration.ai_telemetry_reconciliation_queue (location_id, available_at, created_at)
  where status = 'pending';

create table integration.publication_cleanup_intents (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  location_ref text not null check (location_ref ~ '^[A-Za-z0-9_-]{8,128}$'),
  public_bucket text not null check (
    pg_catalog.length(public_bucket) between 3 and 63
    and public_bucket ~ '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$'
  ),
  public_campaign_id text not null check (public_campaign_id ~ '^[A-Za-z0-9_-]{8,128}$'),
  campaign_version_ref text not null check (pg_catalog.length(campaign_version_ref) between 8 and 128),
  published_version integer not null check (published_version > 0),
  attempted_keys text[] not null check (
    pg_catalog.cardinality(attempted_keys) between 1 and 100
    and pg_catalog.array_position(attempted_keys, null) is null
  ),
  quarantined_keys text[],
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  maximum_attempts integer not null check (maximum_attempts between 1 and 20),
  problem_code text not null check (problem_code = 'PUBLICATION_PARTIAL_FAILURE'),
  status text not null default 'pending'
    check (status in ('pending', 'reconciling', 'completed', 'dead_lettered')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default pg_catalog.now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_attempt_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  completed_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint publication_cleanup_idempotency_uq unique (idempotency_key),
  constraint publication_cleanup_location_id_id_uq unique (location_id, id),
  constraint publication_cleanup_lease_ck check (
    (lease_owner is null and lease_expires_at is null)
    or (lease_owner is not null and lease_expires_at is not null)
  ),
  constraint publication_cleanup_completed_ck check (
    status <> 'completed'
    or (completed_at is not null and quarantined_keys is not null
      and pg_catalog.cardinality(quarantined_keys) >= 1)
  ),
  constraint publication_cleanup_dead_letter_ck check (
    status <> 'dead_lettered'
    or (dead_lettered_at is not null and lease_owner is null and lease_expires_at is null)
  )
);

create index publication_cleanup_pending_idx
  on integration.publication_cleanup_intents (location_id, available_at, created_at)
  where status = 'pending';

create index publication_cleanup_dead_letter_idx
  on integration.publication_cleanup_intents (location_id, dead_lettered_at desc)
  where status = 'dead_lettered';

create table integration.job_runs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  command_id uuid,
  outbox_event_id uuid,
  task_name text not null check (pg_catalog.length(task_name) between 1 and 150),
  task_schema_version integer not null check (task_schema_version > 0),
  trigger_run_id text,
  queue_key text not null check (pg_catalog.length(queue_key) between 1 and 300),
  attempt integer not null default 1 check (attempt > 0),
  state text not null default 'queued'
    check (state in ('queued', 'running', 'waiting', 'completed', 'failed', 'canceled')),
  heartbeat_at timestamptz,
  last_progress_at timestamptz,
  terminal_code text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint job_runs_location_id_id_uq unique (location_id, id),
  constraint job_runs_command_fk foreign key (location_id, command_id)
    references integration.command_executions (location_id, id) on delete restrict,
  constraint job_runs_outbox_fk foreign key (location_id, outbox_event_id)
    references integration.outbox_events (location_id, id) on delete restrict
);

create index job_runs_location_id_idx on integration.job_runs (location_id);
create index job_runs_command_fk_idx on integration.job_runs (location_id, command_id);
create index job_runs_outbox_fk_idx on integration.job_runs (location_id, outbox_event_id);
create unique index job_runs_trigger_run_id_uq
  on integration.job_runs (trigger_run_id)
  where trigger_run_id is not null;
create index job_runs_active_queue_idx
  on integration.job_runs (location_id, queue_key, state, created_at)
  where state in ('queued', 'running', 'waiting');

create table integration.queue_limits (
  queue_class text primary key check (queue_class in ('provider', 'renderer', 'ai')),
  global_limit integer not null check (global_limit between 1 and 10000),
  default_per_location_limit integer not null check (default_per_location_limit between 1 and 1000),
  constraint queue_limits_order_ck check (default_per_location_limit <= global_limit)
);

insert into integration.queue_limits (queue_class, global_limit, default_per_location_limit)
values ('provider', 32, 1), ('renderer', 8, 2), ('ai', 16, 2);

create table integration.location_queue_limits (
  location_id uuid not null references platform.locations (id) on delete restrict,
  queue_class text not null references integration.queue_limits (queue_class) on delete restrict,
  per_location_limit integer not null check (per_location_limit between 1 and 1000),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (location_id, queue_class)
);

create index location_queue_limits_location_id_idx
  on integration.location_queue_limits (location_id);
create index location_queue_limits_queue_class_fk_idx
  on integration.location_queue_limits (queue_class);

create table integration.queue_leases (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  queue_class text not null references integration.queue_limits (queue_class) on delete restrict,
  work_ref text not null check (pg_catalog.length(work_ref) between 1 and 300),
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  lease_owner text not null check (pg_catalog.length(lease_owner) between 1 and 200),
  leased_at timestamptz not null default pg_catalog.now(),
  lease_expires_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  constraint queue_leases_location_id_id_uq unique (location_id, id),
  constraint queue_leases_idempotency_uq unique (location_id, queue_class, idempotency_key),
  constraint queue_leases_window_ck check (lease_expires_at > leased_at),
  constraint queue_leases_release_ck check (released_at is null or released_at >= leased_at)
);

create index queue_leases_location_id_idx on integration.queue_leases (location_id);
create index queue_leases_queue_class_fk_idx on integration.queue_leases (queue_class);
create index queue_leases_global_active_idx
  on integration.queue_leases (queue_class, lease_expires_at)
  where released_at is null;
create index queue_leases_location_active_idx
  on integration.queue_leases (location_id, queue_class, lease_expires_at)
  where released_at is null;

create table billing.entitlement_versions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  feature_key text not null check (feature_key ~ '^[a-z][a-z0-9._-]{1,99}$'),
  version_no integer not null check (version_no > 0),
  source_event_ref text not null check (pg_catalog.length(source_event_ref) between 1 and 300),
  status text not null check (status in ('active', 'grace', 'suspended', 'canceled', 'expired')),
  effective_at timestamptz not null,
  expires_at timestamptz,
  allowance integer check (allowance is null or allowance >= 0),
  override_reason text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint entitlement_versions_location_id_id_uq unique (location_id, id),
  constraint entitlement_versions_location_feature_version_uq unique (location_id, feature_key, version_no),
  constraint entitlement_versions_window_ck check (expires_at is null or expires_at > effective_at)
);

create index entitlement_versions_location_id_idx on billing.entitlement_versions (location_id);
create index entitlement_versions_active_lookup_idx
  on billing.entitlement_versions (location_id, feature_key, effective_at desc)
  where status in ('active', 'grace');
create unique index entitlement_versions_current_uq
  on billing.entitlement_versions (location_id, feature_key)
  where status in ('active', 'grace') and expires_at is null;

create table audit.events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  support_grant_id uuid,
  actor_type text not null check (actor_type in ('user', 'support', 'system', 'webhook')),
  actor_id uuid not null,
  subject_type text not null check (pg_catalog.length(subject_type) between 1 and 100),
  subject_id text not null check (pg_catalog.length(subject_id) between 1 and 300),
  action text not null check (action ~ '^[a-z][a-z0-9.-]+$'),
  result text not null check (result in ('success', 'denied', 'failed', 'uncertain')),
  safe_before_hash text check (safe_before_hash is null or safe_before_hash ~ '^[0-9a-f]{64}$'),
  safe_after_hash text check (safe_after_hash is null or safe_after_hash ~ '^[0-9a-f]{64}$'),
  correlation_id text not null check (pg_catalog.length(correlation_id) between 1 and 200),
  event_schema_version integer not null default 1 check (event_schema_version > 0),
  created_at timestamptz not null default pg_catalog.now(),
  constraint audit_events_location_id_id_uq unique (location_id, id),
  constraint audit_events_support_grant_fk foreign key (location_id, support_grant_id)
    references platform.support_grants (location_id, id) on delete restrict,
  constraint audit_events_support_actor_ck check (
    (actor_type = 'support' and support_grant_id is not null) or
    (actor_type <> 'support' and support_grant_id is null)
  )
);

create index audit_events_location_id_idx on audit.events (location_id);
create index audit_events_support_grant_fk_idx
  on audit.events (location_id, support_grant_id);
create index audit_events_timeline_idx
  on audit.events (location_id, created_at desc, id);
create index audit_events_correlation_idx
  on audit.events (location_id, correlation_id, created_at);

create function platform.current_location_id()
returns uuid
language sql
stable
set search_path = ''
as $function$
  select nullif(pg_catalog.current_setting('app.location_id', true), '')::uuid
$function$;

create function platform.current_actor_id()
returns uuid
language sql
stable
set search_path = ''
as $function$
  select nullif(pg_catalog.current_setting('app.actor_id', true), '')::uuid
$function$;

create function platform.current_actor_type()
returns text
language sql
stable
set search_path = ''
as $function$
  select nullif(pg_catalog.current_setting('app.actor_type', true), '')
$function$;

create function platform.current_correlation_id()
returns text
language sql
stable
set search_path = ''
as $function$
  select nullif(pg_catalog.current_setting('app.correlation_id', true), '')
$function$;

create function platform.tenant_matches(row_location_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $function$
  select row_location_id is not null
    and platform.current_location_id() is not null
    and row_location_id = platform.current_location_id()
$function$;

create function platform.support_context_allowed(row_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select platform.current_actor_type() = 'support'
    and row_location_id = platform.current_location_id()
    and exists (
      select 1
      from platform.support_grants as grant_row
      join audit.events as audit_row
        on audit_row.location_id = grant_row.location_id
       and audit_row.support_grant_id = grant_row.id
       and audit_row.id = nullif(
         pg_catalog.current_setting('app.support_access_event_id', true), ''
       )::uuid
      where grant_row.id = nullif(
              pg_catalog.current_setting('app.support_grant_id', true), ''
            )::uuid
        and grant_row.location_id = row_location_id
        and grant_row.support_actor_id = platform.current_actor_id()
        and grant_row.scope in ('read', 'diagnose', 'export')
        and grant_row.revoked_at is null
        and grant_row.starts_at <= pg_catalog.statement_timestamp()
        and grant_row.expires_at > pg_catalog.statement_timestamp()
        and audit_row.actor_type = 'support'
        and audit_row.actor_id = platform.current_actor_id()
        and audit_row.action = 'support.access.started'
        and audit_row.result = 'success'
        and audit_row.correlation_id = platform.current_correlation_id()
    )
$function$;

alter table platform.locations enable row level security;
alter table platform.locations force row level security;

create policy locations_migration_owner_all on platform.locations
  for all to migration_owner using (true) with check (true);
create policy locations_app_tenant on platform.locations
  for all to app_runtime
  using (id = platform.current_location_id())
  with check (id = platform.current_location_id());
create policy locations_support_read on platform.locations
  for select to support_runtime
  using (platform.support_context_allowed(id));

do $tenant_rls$
declare
  tenant_table record;
begin
  for tenant_table in
    select namespace.nspname as schema_name, class.relname as table_name
    from pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    join pg_catalog.pg_attribute as attribute on attribute.attrelid = class.oid
    where namespace.nspname in ('platform', 'configuration', 'campaign', 'integration', 'billing', 'audit')
      and class.relkind = 'r'
      and attribute.attname = 'location_id'
      and not attribute.attisdropped
  loop
    execute pg_catalog.format(
      'alter table %I.%I enable row level security',
      tenant_table.schema_name,
      tenant_table.table_name
    );
    execute pg_catalog.format(
      'alter table %I.%I force row level security',
      tenant_table.schema_name,
      tenant_table.table_name
    );
    execute pg_catalog.format(
      'create policy %I on %I.%I for all to migration_owner using (true) with check (true)',
      tenant_table.table_name || '_migration_owner_all',
      tenant_table.schema_name,
      tenant_table.table_name
    );
    execute pg_catalog.format(
      'create policy %I on %I.%I for all to app_runtime using (platform.tenant_matches(location_id)) with check (platform.tenant_matches(location_id))',
      tenant_table.table_name || '_app_tenant',
      tenant_table.schema_name,
      tenant_table.table_name
    );
    execute pg_catalog.format(
      'create policy %I on %I.%I for select to support_runtime using (platform.support_context_allowed(location_id))',
      tenant_table.table_name || '_support_read',
      tenant_table.schema_name,
      tenant_table.table_name
    );
  end loop;
end
$tenant_rls$;

create policy campaigns_reporting_status_only on campaign.campaigns
  for select to reporting_runtime using (true);

create function platform.set_app_context(
  requested_location_id uuid,
  requested_actor_id uuid,
  requested_correlation_id text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  if requested_location_id is null or requested_actor_id is null then
    raise exception using errcode = '22004', message = 'Tenant and actor context are required';
  end if;
  if requested_correlation_id is null or pg_catalog.length(requested_correlation_id) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'A valid correlation ID is required';
  end if;
  if not exists (
    select 1
    from platform.locations as location_row
    join platform.role_bindings as binding
      on binding.location_id = location_row.id
     and binding.user_id = requested_actor_id
     and binding.revoked_at is null
    join platform.app_users as actor
      on actor.id = binding.user_id
     and actor.status = 'active'
    where location_row.id = requested_location_id
      and location_row.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Verified actor is not active for the requested tenant';
  end if;

  perform pg_catalog.set_config('app.location_id', requested_location_id::text, true);
  perform pg_catalog.set_config('app.actor_id', requested_actor_id::text, true);
  perform pg_catalog.set_config('app.actor_type', 'user', true);
  perform pg_catalog.set_config('app.correlation_id', requested_correlation_id, true);
  perform pg_catalog.set_config('app.support_grant_id', '', true);
  perform pg_catalog.set_config('app.support_access_event_id', '', true);
end
$function$;

create function platform.set_scheduler_context(
  requested_location_id uuid,
  requested_actor_id uuid,
  requested_correlation_id text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  if requested_location_id is null or requested_actor_id is null then
    raise exception using errcode = '22004', message = 'Tenant and scheduler actor context are required';
  end if;
  if requested_correlation_id is null or pg_catalog.length(requested_correlation_id) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'A valid correlation ID is required';
  end if;
  if not exists (
    select 1 from platform.locations
    where id = requested_location_id and status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Scheduler tenant is not active';
  end if;

  perform pg_catalog.set_config('app.location_id', requested_location_id::text, true);
  perform pg_catalog.set_config('app.actor_id', requested_actor_id::text, true);
  perform pg_catalog.set_config('app.actor_type', 'system', true);
  perform pg_catalog.set_config('app.correlation_id', requested_correlation_id, true);
  perform pg_catalog.set_config('app.support_grant_id', '', true);
  perform pg_catalog.set_config('app.support_access_event_id', '', true);
end
$function$;

create function platform.begin_support_access(
  requested_location_id uuid,
  requested_support_actor_id uuid,
  requested_correlation_id text,
  requested_subject_type text default 'location',
  requested_subject_id text default 'support-session'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  matching_grant_id uuid;
  access_event_id uuid := pg_catalog.gen_random_uuid();
begin
  if requested_location_id is null or requested_support_actor_id is null then
    raise exception using errcode = '22004', message = 'Support tenant and actor are required';
  end if;
  if requested_correlation_id is null or pg_catalog.length(requested_correlation_id) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'A valid correlation ID is required';
  end if;

  select grant_row.id
    into matching_grant_id
  from platform.support_grants as grant_row
  where grant_row.location_id = requested_location_id
    and grant_row.support_actor_id = requested_support_actor_id
    and grant_row.scope in ('read', 'diagnose', 'export')
    and grant_row.revoked_at is null
    and grant_row.starts_at <= pg_catalog.statement_timestamp()
    and grant_row.expires_at > pg_catalog.statement_timestamp()
  order by grant_row.expires_at
  limit 1
  for update;

  if matching_grant_id is null then
    raise exception using errcode = '42501', message = 'Active matching support grant is required';
  end if;

  insert into audit.events (
    id, location_id, support_grant_id, actor_type, actor_id,
    subject_type, subject_id, action, result, correlation_id
  ) values (
    access_event_id, requested_location_id, matching_grant_id, 'support', requested_support_actor_id,
    requested_subject_type, requested_subject_id, 'support.access.started', 'success', requested_correlation_id
  );

  update platform.support_grants
     set last_used_at = pg_catalog.statement_timestamp()
   where id = matching_grant_id;

  perform pg_catalog.set_config('app.location_id', requested_location_id::text, true);
  perform pg_catalog.set_config('app.actor_id', requested_support_actor_id::text, true);
  perform pg_catalog.set_config('app.actor_type', 'support', true);
  perform pg_catalog.set_config('app.correlation_id', requested_correlation_id, true);
  perform pg_catalog.set_config('app.support_grant_id', matching_grant_id::text, true);
  perform pg_catalog.set_config('app.support_access_event_id', access_event_id::text, true);

  return access_event_id;
end
$function$;

create function platform.reset_transaction_context()
returns void
language plpgsql
volatile
set search_path = ''
as $function$
begin
  perform pg_catalog.set_config('app.location_id', '', true);
  perform pg_catalog.set_config('app.actor_id', '', true);
  perform pg_catalog.set_config('app.actor_type', '', true);
  perform pg_catalog.set_config('app.correlation_id', '', true);
  perform pg_catalog.set_config('app.support_grant_id', '', true);
  perform pg_catalog.set_config('app.support_access_event_id', '', true);
end
$function$;

create function integration.authority_active(
  requested_location_id uuid,
  requested_feature_key text default 'campaign.publish'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select platform.tenant_matches(requested_location_id)
    and exists (
      select 1 from platform.locations
      where id = requested_location_id and status = 'active'
    )
    and exists (
      select 1 from platform.marketplace_installations
      where location_id = requested_location_id and status = 'active'
    )
    and exists (
      select 1 from billing.entitlement_versions
      where location_id = requested_location_id
        and feature_key = requested_feature_key
        and status in ('active', 'grace')
        and effective_at <= pg_catalog.statement_timestamp()
        and (expires_at is null or expires_at > pg_catalog.statement_timestamp())
    )
$function$;

create function integration.mark_delivery_completion_uncertain_v1(
  requested_delivery_kind text,
  requested_external_delivery_id text,
  requested_business_outcome_key text,
  requested_problem_code text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  affected_count integer;
begin
  if requested_problem_code <> 'DELIVERY_COMPLETION_UNCERTAIN' then
    raise exception using errcode = '22023', message = 'Invalid delivery completion problem code';
  end if;

  update integration.delivery_claims
     set status = 'completion_uncertain',
         completion_uncertain_at = pg_catalog.statement_timestamp(),
         problem_code = requested_problem_code
   where location_id = platform.current_location_id()
     and delivery_kind = requested_delivery_kind
     and external_delivery_id = requested_external_delivery_id
     and business_outcome_key = requested_business_outcome_key
     and status = 'claimed';

  get diagnostics affected_count = row_count;
  return affected_count = 1;
end
$function$;

create function integration.assert_ai_telemetry_pair_v1(
  requested_usage jsonb,
  requested_trace jsonb
)
returns void
language plpgsql
immutable
set search_path = ''
as $function$
declare
  reference_pattern constant text := '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$';
begin
  if requested_usage is null or pg_catalog.jsonb_typeof(requested_usage) <> 'object'
    or requested_trace is null or pg_catalog.jsonb_typeof(requested_trace) <> 'object' then
    raise exception using errcode = '22023', message = 'AI telemetry pair must contain JSON objects';
  end if;
  if not requested_usage ?& array[
    'usageEventRef', 'locationRef', 'actorRef', 'feature', 'brandVersionRef',
    'correlationRef', 'providerRef', 'modelRef', 'modelPolicyVersionRef',
    'promptPolicyVersionRef', 'tokenUsage', 'estimatedCostUsd', 'latencyMs',
    'retryCount', 'outcome', 'chargedPlanUnit', 'occurredAt'
  ] or not requested_trace ?& array[
    'traceRef', 'locationRef', 'actorRef', 'correlationRef', 'feature', 'routeRef',
    'modelPolicyVersionRef', 'promptPolicyVersionRef', 'promptContextHash',
    'latencyMs', 'outcome', 'occurredAt'
  ] then
    raise exception using errcode = '22023', message = 'AI telemetry pair is missing required fields';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_object_keys(requested_usage) as field_name
    where field_name not in (
      'usageEventRef', 'locationRef', 'actorRef', 'feature', 'campaignRef',
      'brandVersionRef', 'correlationRef', 'providerRef', 'modelRef',
      'modelPolicyVersionRef', 'promptPolicyVersionRef', 'providerRequestRef',
      'tokenUsage', 'estimatedCostUsd', 'latencyMs', 'retryCount', 'outcome',
      'chargedPlanUnit', 'failureClassification', 'occurredAt'
    )
  ) or exists (
    select 1 from pg_catalog.jsonb_object_keys(requested_trace) as field_name
    where field_name not in (
      'traceRef', 'locationRef', 'actorRef', 'correlationRef', 'feature', 'routeRef',
      'modelPolicyVersionRef', 'promptPolicyVersionRef', 'promptContextHash',
      'acceptedOutputHash', 'providerRequestRef', 'latencyMs', 'outcome',
      'failureClassification', 'occurredAt'
    )
  ) then
    raise exception using errcode = '22023', message = 'AI telemetry pair contains unknown fields';
  end if;
  if requested_usage->>'usageEventRef' !~ reference_pattern
    or requested_trace->>'traceRef' !~ reference_pattern
    or pg_catalog.length(requested_usage->>'usageEventRef') not between 8 and 160
    or pg_catalog.length(requested_trace->>'traceRef') not between 8 and 160 then
    raise exception using errcode = '22023', message = 'AI telemetry references are invalid';
  end if;
  if requested_usage->>'locationRef' <> requested_trace->>'locationRef'
    or requested_usage->>'actorRef' <> requested_trace->>'actorRef'
    or requested_usage->>'correlationRef' <> requested_trace->>'correlationRef'
    or requested_usage->>'feature' <> requested_trace->>'feature'
    or requested_usage->>'modelPolicyVersionRef' <> requested_trace->>'modelPolicyVersionRef'
    or requested_usage->>'promptPolicyVersionRef' <> requested_trace->>'promptPolicyVersionRef'
    or requested_usage->>'latencyMs' <> requested_trace->>'latencyMs'
    or requested_usage->>'outcome' <> requested_trace->>'outcome'
    or requested_usage->>'occurredAt' <> requested_trace->>'occurredAt'
    or coalesce(requested_usage->>'providerRequestRef', '')
      <> coalesce(requested_trace->>'providerRequestRef', '')
    or coalesce(requested_usage->>'failureClassification', '')
      <> coalesce(requested_trace->>'failureClassification', '') then
    raise exception using errcode = '22023', message = 'AI usage and trace records do not describe one provider attempt';
  end if;
  if requested_usage->>'feature' not in ('brand_extraction', 'campaign_pack', 'repair', 'regeneration')
    or requested_usage->>'outcome' not in ('accepted', 'rejected', 'failed', 'reconciled')
    or requested_usage->>'chargedPlanUnit' not in ('none', 'campaign_pack', 'regeneration')
    or pg_catalog.jsonb_typeof(requested_usage->'tokenUsage') <> 'object'
    or requested_trace->>'promptContextHash' !~ '^[0-9a-f]{64}$'
    or (requested_trace ? 'acceptedOutputHash'
      and requested_trace->>'acceptedOutputHash' !~ '^[0-9a-f]{64}$') then
    raise exception using errcode = '22023', message = 'AI telemetry field values are invalid';
  end if;
  perform (requested_usage->>'occurredAt')::timestamptz;
  perform (requested_trace->>'occurredAt')::timestamptz;
  if (requested_usage->>'latencyMs')::numeric < 0
    or (requested_usage->>'retryCount')::numeric not between 0 and 3
    or (requested_usage->>'estimatedCostUsd')::numeric not between 0 and 1000 then
    raise exception using errcode = '22023', message = 'AI telemetry numeric values are invalid';
  end if;
end
$function$;

create function integration.record_ai_telemetry_pair_v1(
  requested_usage jsonb,
  requested_trace jsonb
)
returns table (usage_event_ref text, trace_ref text)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform integration.assert_ai_telemetry_pair_v1(requested_usage, requested_trace);
  if requested_usage->>'correlationRef' <> platform.current_correlation_id() then
    raise exception using errcode = '42501', message = 'AI telemetry correlation context mismatch';
  end if;

  insert into integration.ai_usage_events (
    location_id, usage_event_ref, actor_ref, correlation_ref, feature, occurred_at, payload
  ) values (
    platform.current_location_id(), requested_usage->>'usageEventRef',
    requested_usage->>'actorRef', requested_usage->>'correlationRef',
    requested_usage->>'feature', (requested_usage->>'occurredAt')::timestamptz,
    requested_usage
  );

  insert into integration.ai_trace_records (
    location_id, trace_ref, actor_ref, correlation_ref, feature, occurred_at, payload
  ) values (
    platform.current_location_id(), requested_trace->>'traceRef',
    requested_trace->>'actorRef', requested_trace->>'correlationRef',
    requested_trace->>'feature', (requested_trace->>'occurredAt')::timestamptz,
    requested_trace
  );

  return query select requested_usage->>'usageEventRef', requested_trace->>'traceRef';
end
$function$;

create function integration.mark_ai_telemetry_reconciliation_required_v1(
  requested_usage jsonb,
  requested_trace jsonb,
  requested_problem_code text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  marker_status text;
begin
  perform integration.assert_ai_telemetry_pair_v1(requested_usage, requested_trace);
  if requested_usage->>'correlationRef' <> platform.current_correlation_id() then
    raise exception using errcode = '42501', message = 'AI telemetry correlation context mismatch';
  end if;
  if requested_problem_code <> 'AI_TELEMETRY_PERSISTENCE_FAILED' then
    raise exception using errcode = '22023', message = 'Invalid AI telemetry reconciliation problem code';
  end if;

  insert into integration.ai_telemetry_reconciliation_queue (
    location_id, usage_event_ref, trace_ref, usage_payload, trace_payload, problem_code
  ) values (
    platform.current_location_id(), requested_usage->>'usageEventRef', requested_trace->>'traceRef',
    requested_usage, requested_trace, requested_problem_code
  )
  on conflict (usage_event_ref, trace_ref) do update
     set updated_at = integration.ai_telemetry_reconciliation_queue.updated_at
   where integration.ai_telemetry_reconciliation_queue.location_id = platform.current_location_id()
     and integration.ai_telemetry_reconciliation_queue.usage_payload = excluded.usage_payload
     and integration.ai_telemetry_reconciliation_queue.trace_payload = excluded.trace_payload
     and integration.ai_telemetry_reconciliation_queue.problem_code = excluded.problem_code
  returning status into marker_status;

  if marker_status is null then
    raise exception using errcode = '23505', message = 'AI telemetry reconciliation identity conflicts with different evidence';
  end if;
  return marker_status;
end
$function$;

create function integration.enqueue_publication_cleanup_v1(requested_intent jsonb)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  inserted_status text;
  existing_row integration.publication_cleanup_intents%rowtype;
  attempted text[];
begin
  if requested_intent is null or pg_catalog.jsonb_typeof(requested_intent) <> 'object'
    or not requested_intent ?& array[
      'locationRef', 'publicBucket', 'publicCampaignId', 'campaignVersionRef', 'publishedVersion',
      'attemptedKeys', 'idempotencyKey', 'maximumAttempts', 'problemCode'
    ] or exists (
      select 1 from pg_catalog.jsonb_object_keys(requested_intent) as field_name
      where field_name not in (
        'locationRef', 'publicBucket', 'publicCampaignId', 'campaignVersionRef', 'publishedVersion',
        'attemptedKeys', 'idempotencyKey', 'maximumAttempts', 'problemCode'
      )
    ) then
    raise exception using errcode = '22023', message = 'Publication cleanup intent is invalid';
  end if;
  if requested_intent->>'idempotencyKey' !~ '^[0-9a-f]{64}$'
    or requested_intent->>'locationRef' !~ '^[A-Za-z0-9_-]{8,128}$'
    or requested_intent->>'publicCampaignId' !~ '^[A-Za-z0-9_-]{8,128}$'
    or requested_intent->>'problemCode' <> 'PUBLICATION_PARTIAL_FAILURE'
    or pg_catalog.jsonb_typeof(requested_intent->'attemptedKeys') <> 'array'
    or pg_catalog.jsonb_array_length(requested_intent->'attemptedKeys') not between 1 and 100
    or (requested_intent->>'maximumAttempts')::integer not between 1 and 20
    or (requested_intent->>'publishedVersion')::integer <= 0 then
    raise exception using errcode = '22023', message = 'Publication cleanup intent fields are invalid';
  end if;
  if not exists (
    select 1
      from platform.locations as active_location
     where active_location.id = platform.current_location_id()
       and active_location.ghl_location_id = requested_intent->>'locationRef'
       and active_location.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Publication cleanup tenant identity is invalid';
  end if;
  select pg_catalog.array_agg(value order by ordinal)
    into attempted
    from pg_catalog.jsonb_array_elements_text(requested_intent->'attemptedKeys')
      with ordinality as attempted_key(value, ordinal);
  if exists (select 1 from pg_catalog.unnest(attempted) as attempted_key where pg_catalog.length(attempted_key) not between 1 and 1024) then
    raise exception using errcode = '22023', message = 'Publication cleanup attempted key is invalid';
  end if;

  insert into integration.publication_cleanup_intents (
    location_id, location_ref, public_bucket, public_campaign_id, campaign_version_ref,
    published_version, attempted_keys, idempotency_key, maximum_attempts, problem_code
  ) values (
    platform.current_location_id(), requested_intent->>'locationRef', requested_intent->>'publicBucket',
    requested_intent->>'publicCampaignId', requested_intent->>'campaignVersionRef',
    (requested_intent->>'publishedVersion')::integer, attempted,
    requested_intent->>'idempotencyKey', (requested_intent->>'maximumAttempts')::integer,
    requested_intent->>'problemCode'
  )
  on conflict (idempotency_key) do nothing
  returning status into inserted_status;
  if inserted_status is not null then
    return 'enqueued';
  end if;

  select * into existing_row
    from integration.publication_cleanup_intents
   where idempotency_key = requested_intent->>'idempotencyKey'
   for update;
  if existing_row.location_id <> platform.current_location_id()
    or existing_row.location_ref <> requested_intent->>'locationRef'
    or existing_row.public_bucket <> requested_intent->>'publicBucket'
    or existing_row.public_campaign_id <> requested_intent->>'publicCampaignId'
    or existing_row.campaign_version_ref <> requested_intent->>'campaignVersionRef'
    or existing_row.published_version <> (requested_intent->>'publishedVersion')::integer
    or existing_row.attempted_keys <> attempted
    or existing_row.maximum_attempts <> (requested_intent->>'maximumAttempts')::integer
    or existing_row.problem_code <> requested_intent->>'problemCode' then
    raise exception using errcode = '23505', message = 'Publication cleanup identity conflicts with different evidence';
  end if;
  if existing_row.status = 'completed' then
    return 'already_completed';
  end if;
  if existing_row.status = 'dead_lettered' then
    return 'already_dead_lettered';
  end if;
  return 'already_pending';
end
$function$;

create function integration.claim_publication_cleanup_batch_v1(
  requested_lease_owner text,
  requested_limit integer,
  requested_lease_until timestamptz
)
returns table (
  location_ref text,
  public_bucket text,
  public_campaign_id text,
  campaign_version_ref text,
  published_version integer,
  attempted_keys text[],
  idempotency_key text,
  problem_code text,
  attempt_count integer,
  maximum_attempts integer,
  lease_owner text,
  lease_until timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  if requested_lease_owner is null or pg_catalog.length(requested_lease_owner) not between 1 and 200
    or requested_limit not between 1 and 100
    or requested_lease_until <= pg_catalog.statement_timestamp()
    or requested_lease_until > pg_catalog.statement_timestamp() + interval '15 minutes' then
    raise exception using errcode = '22023', message = 'Publication cleanup lease request is invalid';
  end if;

  update integration.publication_cleanup_intents as cleanup
     set status = 'dead_lettered',
         dead_lettered_at = pg_catalog.statement_timestamp(),
         lease_owner = null,
         lease_expires_at = null,
         last_error_code = case
           when cleanup.status = 'reconciling' then 'PUBLICATION_CLEANUP_LEASE_EXHAUSTED'
           else coalesce(cleanup.last_error_code, 'PUBLICATION_QUARANTINE_RETRY_FAILED')
         end,
         last_error_at = coalesce(cleanup.last_error_at, pg_catalog.statement_timestamp()),
         updated_at = pg_catalog.statement_timestamp()
   where cleanup.location_id = platform.current_location_id()
     and cleanup.attempt_count >= cleanup.maximum_attempts
     and (
       (cleanup.status = 'pending'
         and cleanup.available_at <= pg_catalog.statement_timestamp())
       or (cleanup.status = 'reconciling'
         and cleanup.lease_expires_at <= pg_catalog.statement_timestamp())
     );

  return query
  with candidates as (
    select source.id
      from integration.publication_cleanup_intents as source
     where source.location_id = platform.current_location_id()
       and source.attempt_count < source.maximum_attempts
       and (
         (source.status = 'pending' and source.available_at <= pg_catalog.statement_timestamp())
         or (source.status = 'reconciling'
           and source.lease_expires_at <= pg_catalog.statement_timestamp())
       )
     order by source.available_at, source.created_at
     for update skip locked
     limit requested_limit
  )
  update integration.publication_cleanup_intents as target
     set status = 'reconciling',
         attempt_count = target.attempt_count + 1,
         last_attempt_at = pg_catalog.statement_timestamp(),
         lease_owner = requested_lease_owner,
         lease_expires_at = requested_lease_until,
         last_error_code = case
           when target.status = 'reconciling' then 'PUBLICATION_CLEANUP_LEASE_EXPIRED'
           else target.last_error_code
         end,
         last_error_at = case
           when target.status = 'reconciling' then pg_catalog.statement_timestamp()
           else target.last_error_at
         end,
         updated_at = pg_catalog.statement_timestamp()
    from candidates
   where target.id = candidates.id
  returning target.location_ref, target.public_bucket, target.public_campaign_id, target.campaign_version_ref,
            target.published_version, target.attempted_keys, target.idempotency_key,
            target.problem_code, target.attempt_count, target.maximum_attempts,
            target.lease_owner, target.lease_expires_at;
end
$function$;

create function integration.complete_publication_cleanup_v1(
  requested_idempotency_key text,
  requested_lease_owner text,
  requested_quarantined_keys jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  affected_count integer;
  quarantined text[];
begin
  if requested_idempotency_key !~ '^[0-9a-f]{64}$'
    or requested_lease_owner is null
    or pg_catalog.length(requested_lease_owner) not between 1 and 200
    or pg_catalog.jsonb_typeof(requested_quarantined_keys) <> 'array'
    or pg_catalog.jsonb_array_length(requested_quarantined_keys) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Publication cleanup completion is invalid';
  end if;
  select pg_catalog.array_agg(value order by ordinal)
    into quarantined
    from pg_catalog.jsonb_array_elements_text(requested_quarantined_keys)
      with ordinality as quarantined_key(value, ordinal);
  if exists (
    select 1 from pg_catalog.unnest(quarantined) as quarantined_key
    where pg_catalog.length(quarantined_key) not between 1 and 1024
  ) then
    raise exception using errcode = '22023', message = 'Publication cleanup quarantined key is invalid';
  end if;

  update integration.publication_cleanup_intents
     set status = 'completed',
         quarantined_keys = quarantined,
         completed_at = pg_catalog.statement_timestamp(),
         lease_owner = null,
         lease_expires_at = null,
         updated_at = pg_catalog.statement_timestamp()
   where location_id = platform.current_location_id()
     and idempotency_key = requested_idempotency_key
     and status = 'reconciling'
     and lease_owner = requested_lease_owner
     and pg_catalog.cardinality(attempted_keys) = pg_catalog.cardinality(quarantined)
     and attempted_keys @> quarantined
     and quarantined @> attempted_keys;
  get diagnostics affected_count = row_count;
  return affected_count = 1;
end
$function$;

create function integration.release_publication_cleanup_after_failure_v1(
  requested_idempotency_key text,
  requested_lease_owner text,
  requested_problem_code text,
  requested_available_at timestamptz
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  released_status text;
begin
  if requested_idempotency_key !~ '^[0-9a-f]{64}$'
    or requested_lease_owner is null
    or pg_catalog.length(requested_lease_owner) not between 1 and 200
    or requested_problem_code <> 'PUBLICATION_QUARANTINE_RETRY_FAILED'
    or requested_available_at <= pg_catalog.statement_timestamp()
    or requested_available_at > pg_catalog.statement_timestamp() + interval '24 hours' then
    raise exception using errcode = '22023', message = 'Publication cleanup release is invalid';
  end if;

  update integration.publication_cleanup_intents
     set status = case
           when attempt_count >= maximum_attempts then 'dead_lettered'
           else 'pending'
         end,
         available_at = requested_available_at,
         lease_owner = null,
         lease_expires_at = null,
         last_error_code = requested_problem_code,
         last_error_at = pg_catalog.statement_timestamp(),
         dead_lettered_at = case
           when attempt_count >= maximum_attempts then pg_catalog.statement_timestamp()
           else null
         end,
         updated_at = pg_catalog.statement_timestamp()
   where location_id = platform.current_location_id()
     and idempotency_key = requested_idempotency_key
     and status = 'reconciling'
     and lease_owner = requested_lease_owner
  returning status into released_status;
  if released_status is null then
    raise exception using errcode = '55000', message = 'Publication cleanup intent is not actively leased';
  end if;
  return released_status;
end
$function$;

create function integration.acquire_queue_lease(
  requested_location_id uuid,
  requested_queue_class text,
  requested_work_ref text,
  requested_idempotency_key text,
  requested_lease_owner text,
  requested_lease_expires_at timestamptz
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  queue_config integration.queue_limits%rowtype;
  effective_location_limit integer;
  existing_lease_id uuid;
  global_active integer;
  location_active integer;
  created_lease_id uuid := pg_catalog.gen_random_uuid();
begin
  if not platform.tenant_matches(requested_location_id) then
    raise exception using errcode = '42501', message = 'Queue lease tenant context mismatch';
  end if;
  if requested_idempotency_key !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Queue idempotency key must be a SHA-256 hex digest';
  end if;
  if requested_lease_expires_at <= pg_catalog.statement_timestamp() then
    raise exception using errcode = '22023', message = 'Queue lease expiry must be in the future';
  end if;

  select * into queue_config
  from integration.queue_limits
  where queue_class = requested_queue_class;
  if not found then
    raise exception using errcode = '22023', message = 'Unknown queue class';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oalo.queue.' || requested_queue_class, 0)
  );

  select id into existing_lease_id
  from integration.queue_leases
  where location_id = requested_location_id
    and queue_class = requested_queue_class
    and idempotency_key = requested_idempotency_key;
  if existing_lease_id is not null then
    return existing_lease_id;
  end if;

  select coalesce(
    (
      select per_location_limit
      from integration.location_queue_limits
      where location_id = requested_location_id and queue_class = requested_queue_class
    ),
    queue_config.default_per_location_limit
  ) into effective_location_limit;

  select pg_catalog.count(*)::integer into global_active
  from integration.queue_leases
  where queue_class = requested_queue_class
    and released_at is null
    and lease_expires_at > pg_catalog.statement_timestamp();

  select pg_catalog.count(*)::integer into location_active
  from integration.queue_leases
  where location_id = requested_location_id
    and queue_class = requested_queue_class
    and released_at is null
    and lease_expires_at > pg_catalog.statement_timestamp();

  if global_active >= queue_config.global_limit then
    raise exception using errcode = '53300', message = 'Global queue capacity reached';
  end if;
  if location_active >= effective_location_limit then
    raise exception using errcode = '53300', message = 'Tenant queue capacity reached';
  end if;

  insert into integration.queue_leases (
    id, location_id, queue_class, work_ref, idempotency_key,
    lease_owner, lease_expires_at
  ) values (
    created_lease_id, requested_location_id, requested_queue_class, requested_work_ref,
    requested_idempotency_key, requested_lease_owner, requested_lease_expires_at
  );

  return created_lease_id;
end
$function$;

create function integration.lease_outbox_batch(
  requested_lease_owner text,
  requested_lease_seconds integer,
  requested_limit integer
)
returns table (
  event_id uuid,
  location_ref uuid,
  event_name text,
  schema_version integer,
  aggregate_type text,
  aggregate_ref text,
  aggregate_version bigint,
  command_ref uuid,
  correlation_id text,
  available_at timestamptz,
  lease_owner text
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  if requested_lease_owner is null or pg_catalog.length(requested_lease_owner) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'A valid lease owner is required';
  end if;
  if requested_lease_seconds not between 5 and 900 then
    raise exception using errcode = '22023', message = 'Lease seconds must be between 5 and 900';
  end if;
  if requested_limit not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Lease batch limit must be between 1 and 100';
  end if;

  return query
  with candidates as (
    select source.id
    from integration.outbox_events as source
    where source.dispatched_at is null
      and source.available_at <= pg_catalog.statement_timestamp()
      and (source.lease_expires_at is null or source.lease_expires_at <= pg_catalog.statement_timestamp())
    order by source.available_at, source.created_at
    for update skip locked
    limit requested_limit
  )
  update integration.outbox_events as target
     set lease_owner = requested_lease_owner,
         lease_expires_at = pg_catalog.statement_timestamp() + pg_catalog.make_interval(secs => requested_lease_seconds),
         dispatch_attempts = target.dispatch_attempts + 1
    from candidates
   where target.id = candidates.id
  returning target.id, target.location_id, target.event_name, target.schema_version,
            target.aggregate_type, target.aggregate_id, target.aggregate_version,
            target.command_id, target.correlation_id, target.available_at, target.lease_owner;
end
$function$;

create function audit.reject_event_mutation()
returns trigger
language plpgsql
volatile
set search_path = ''
as $function$
begin
  raise exception using errcode = '55000', message = 'Audit events are append-only';
end
$function$;

create trigger audit_events_append_only
before update or delete on audit.events
for each row execute function audit.reject_event_mutation();

create view campaign.reporting_campaign_status_counts
with (security_invoker = true)
as
select status, pg_catalog.count(*)::bigint as campaign_count
from campaign.campaigns
group by status;

revoke all on all tables in schema platform, configuration, campaign, integration, billing, audit from public;
revoke all on all sequences in schema platform, configuration, campaign, integration, billing, audit from public;
revoke execute on all functions in schema platform, configuration, campaign, integration, billing, audit from public;

grant usage on schema platform, configuration, campaign, integration, billing, audit to app_runtime;
grant select on platform.locations, platform.role_bindings, platform.marketplace_installations to app_runtime;
grant select, insert, update on configuration.feature_flags to app_runtime;
grant select, insert, update, delete on campaign.campaigns to app_runtime;
grant select, insert, update on integration.command_executions to app_runtime;
grant select, insert, update on integration.outbox_events to app_runtime;
grant select, insert, update on integration.provider_operations to app_runtime;
grant select, insert, update on integration.webhook_receipts to app_runtime;
grant select, insert, update on integration.delivery_claims to app_runtime;
grant select on integration.ai_usage_events, integration.ai_trace_records,
  integration.ai_telemetry_reconciliation_queue, integration.publication_cleanup_intents
  to app_runtime;
grant select, insert, update on integration.job_runs to app_runtime;
grant select on integration.queue_limits to app_runtime;
grant select on integration.location_queue_limits to app_runtime;
grant select, insert, update on integration.queue_leases to app_runtime;
grant select on billing.entitlement_versions to app_runtime;
grant select, insert on audit.events to app_runtime;

grant usage on schema platform, integration to scheduler_runtime;
grant select on integration.queue_limits to scheduler_runtime;

grant usage on schema platform, configuration, campaign, integration, billing to support_runtime;
grant select on platform.locations, platform.marketplace_installations to support_runtime;
grant select on configuration.feature_flags to support_runtime;
grant select on campaign.campaigns to support_runtime;
grant select on billing.entitlement_versions to support_runtime;

grant usage on schema campaign to reporting_runtime;
grant select (status) on campaign.campaigns to reporting_runtime;
grant select on campaign.reporting_campaign_status_counts to reporting_runtime;

grant execute on function platform.current_location_id() to app_runtime, scheduler_runtime, support_runtime;
grant execute on function platform.current_actor_id() to app_runtime, scheduler_runtime, support_runtime;
grant execute on function platform.current_actor_type() to app_runtime, scheduler_runtime, support_runtime;
grant execute on function platform.current_correlation_id() to app_runtime, scheduler_runtime, support_runtime;
grant execute on function platform.tenant_matches(uuid) to app_runtime, scheduler_runtime;
grant execute on function platform.support_context_allowed(uuid) to support_runtime;
grant execute on function platform.set_app_context(uuid, uuid, text) to app_runtime;
grant execute on function platform.set_scheduler_context(uuid, uuid, text) to scheduler_runtime;
grant execute on function platform.begin_support_access(uuid, uuid, text, text, text) to support_runtime;
grant execute on function platform.reset_transaction_context() to app_runtime, scheduler_runtime, support_runtime;
grant execute on function integration.authority_active(uuid, text) to app_runtime, scheduler_runtime;
grant execute on function integration.mark_delivery_completion_uncertain_v1(text, text, text, text)
  to app_runtime;
grant execute on function integration.record_ai_telemetry_pair_v1(jsonb, jsonb) to app_runtime;
grant execute on function integration.mark_ai_telemetry_reconciliation_required_v1(jsonb, jsonb, text)
  to app_runtime;
grant execute on function integration.enqueue_publication_cleanup_v1(jsonb) to app_runtime;
grant execute on function integration.claim_publication_cleanup_batch_v1(text, integer, timestamptz)
  to app_runtime;
grant execute on function integration.complete_publication_cleanup_v1(text, text, jsonb) to app_runtime;
grant execute on function integration.release_publication_cleanup_after_failure_v1(text, text, text, timestamptz)
  to app_runtime;
grant execute on function integration.acquire_queue_lease(uuid, text, text, text, text, timestamptz)
  to app_runtime, scheduler_runtime;
grant execute on function integration.lease_outbox_batch(text, integer, integer) to scheduler_runtime;

comment on schema platform is 'Tenant identity, installation, role, support, and context foundation.';
comment on schema configuration is 'Versioned tenant configuration foundation.';
comment on schema campaign is 'Tenant campaign aggregates and approved reporting projections.';
comment on schema integration is 'Commands, inbox, outbox, jobs, queues, and provider-operation safety.';
comment on schema billing is 'Tenant entitlement and usage authority projections.';
comment on schema audit is 'Append-only tenant security and consequential business events.';
comment on table integration.provider_operations is
  'Stores safe hashes and normalized results only. Credentials and raw provider bodies are prohibited.';
comment on table integration.ai_telemetry_reconciliation_queue is
  'Durable recovery evidence for atomic usage and trace persistence failures. Raw prompts are prohibited.';
comment on table integration.publication_cleanup_intents is
  'Durable tenant-scoped cleanup work for partially published public artifacts.';
comment on table audit.events is
  'Append-only. Token plaintext, raw lead data, full prompts, and provider secrets are prohibited.';

reset role;
