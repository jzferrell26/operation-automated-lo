-- PRD-003a: immutable campaign versions, preflight results, and approval decisions.
-- Target: PostgreSQL 17 through the local Supabase contract.
--
-- Migration safety:
-- - Additive only. New tables are empty. ACCESS EXCLUSIVE is taken only while
--   creating new objects with no production readers.
-- - campaign.campaigns.campaign_ref is nullable so existing aggregate rows remain valid.
-- - After production use, later changes must expand, backfill, switch, and contract.
-- - Roll forward by a later migration. A destructive down migration is allowed
--   only on an unlinked local database before any durable data exists.

set role migration_owner;

alter table campaign.campaigns
  add column campaign_ref text
    check (
      campaign_ref is null
      or (
        pg_catalog.length(campaign_ref) between 8 and 128
        and campaign_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
      )
    );

create unique index campaigns_location_campaign_ref_uq
  on campaign.campaigns (location_id, campaign_ref)
  where campaign_ref is not null;

create table campaign.campaign_versions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  campaign_id uuid not null,
  campaign_ref text not null
    check (
      pg_catalog.length(campaign_ref) between 8 and 128
      and campaign_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  campaign_version_ref text not null
    check (
      pg_catalog.length(campaign_version_ref) between 8 and 128
      and campaign_version_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  version_no integer not null check (version_no > 0),
  source_campaign_ref text
    check (
      source_campaign_ref is null
      or (
        pg_catalog.length(source_campaign_ref) between 8 and 128
        and source_campaign_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
      )
    ),
  location_ref text not null
    check (
      pg_catalog.length(location_ref) between 8 and 128
      and location_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  input_versions jsonb not null check (pg_catalog.jsonb_typeof(input_versions) = 'object'),
  manifest jsonb not null check (pg_catalog.jsonb_typeof(manifest) = 'object'),
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  created_by_actor_id uuid not null,
  created_by_actor_ref text not null
    check (
      pg_catalog.length(created_by_actor_ref) between 8 and 128
      and created_by_actor_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  created_at timestamptz not null default pg_catalog.now(),
  constraint campaign_versions_location_id_id_uq unique (location_id, id),
  constraint campaign_versions_location_version_ref_uq unique (location_id, campaign_version_ref),
  constraint campaign_versions_location_campaign_version_no_uq unique (location_id, campaign_id, version_no),
  constraint campaign_versions_campaign_fk
    foreign key (location_id, campaign_id)
    references campaign.campaigns (location_id, id)
    on delete restrict
);

create index campaign_versions_location_id_idx
  on campaign.campaign_versions (location_id);
create index campaign_versions_location_campaign_id_idx
  on campaign.campaign_versions (location_id, campaign_id);
create index campaign_versions_campaign_id_idx
  on campaign.campaign_versions (campaign_id);
create index campaign_versions_location_campaign_ref_idx
  on campaign.campaign_versions (location_id, campaign_ref);

create table campaign.preflight_results (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  campaign_id uuid not null,
  campaign_version_id uuid not null,
  campaign_ref text not null
    check (
      pg_catalog.length(campaign_ref) between 8 and 128
      and campaign_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  campaign_version_ref text not null
    check (
      pg_catalog.length(campaign_version_ref) between 8 and 128
      and campaign_version_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  result_hash text not null check (result_hash ~ '^[0-9a-f]{64}$'),
  ruleset_version_ref text not null
    check (
      pg_catalog.length(ruleset_version_ref) between 8 and 128
      and ruleset_version_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  blocking boolean not null,
  findings jsonb not null check (pg_catalog.jsonb_typeof(findings) = 'array'),
  input_versions jsonb not null check (pg_catalog.jsonb_typeof(input_versions) = 'object'),
  evaluated_at timestamptz not null,
  constraint preflight_results_location_id_id_uq unique (location_id, id),
  constraint preflight_results_location_result_identity_uq
    unique (location_id, campaign_version_id, result_hash),
  constraint preflight_results_campaign_fk
    foreign key (location_id, campaign_id)
    references campaign.campaigns (location_id, id)
    on delete restrict,
  constraint preflight_results_version_fk
    foreign key (location_id, campaign_version_id)
    references campaign.campaign_versions (location_id, id)
    on delete restrict
);

create index preflight_results_location_id_idx
  on campaign.preflight_results (location_id);
create index preflight_results_campaign_id_idx
  on campaign.preflight_results (campaign_id);
create index preflight_results_campaign_version_id_idx
  on campaign.preflight_results (campaign_version_id);
create index preflight_results_location_campaign_id_idx
  on campaign.preflight_results (location_id, campaign_id);
create index preflight_results_location_version_id_idx
  on campaign.preflight_results (location_id, campaign_version_id);
create index preflight_results_location_version_ref_hash_idx
  on campaign.preflight_results (location_id, campaign_version_ref, result_hash);

create table campaign.approval_decisions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  location_id uuid not null references platform.locations (id) on delete restrict,
  campaign_id uuid not null,
  campaign_version_id uuid not null,
  approval_ref text not null
    check (
      pg_catalog.length(approval_ref) between 8 and 128
      and approval_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  location_ref text not null
    check (
      pg_catalog.length(location_ref) between 8 and 128
      and location_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  campaign_ref text not null
    check (
      pg_catalog.length(campaign_ref) between 8 and 128
      and campaign_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  campaign_version_ref text not null
    check (
      pg_catalog.length(campaign_version_ref) between 8 and 128
      and campaign_version_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  preflight_result_hash text not null check (preflight_result_hash ~ '^[0-9a-f]{64}$'),
  actor_id uuid not null,
  actor_ref text not null
    check (
      pg_catalog.length(actor_ref) between 8 and 128
      and actor_ref ~ '^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$'
    ),
  actor_kind text not null check (actor_kind = 'human'),
  actor_role text not null check (
    actor_role in ('location_admin', 'approver', 'realtor_approver', 'lender_approver')
  ),
  decided_at timestamptz not null,
  ip_audit_hash text not null check (ip_audit_hash ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('approved', 'rejected')),
  snapshot jsonb not null check (pg_catalog.jsonb_typeof(snapshot) = 'object'),
  constraint approval_decisions_location_id_id_uq unique (location_id, id),
  constraint approval_decisions_location_approval_ref_uq unique (location_id, approval_ref),
  constraint approval_decisions_campaign_fk
    foreign key (location_id, campaign_id)
    references campaign.campaigns (location_id, id)
    on delete restrict,
  constraint approval_decisions_version_fk
    foreign key (location_id, campaign_version_id)
    references campaign.campaign_versions (location_id, id)
    on delete restrict
);

create index approval_decisions_location_id_idx
  on campaign.approval_decisions (location_id);
create index approval_decisions_campaign_id_idx
  on campaign.approval_decisions (campaign_id);
create index approval_decisions_campaign_version_id_idx
  on campaign.approval_decisions (campaign_version_id);
create index approval_decisions_location_campaign_id_idx
  on campaign.approval_decisions (location_id, campaign_id);
create index approval_decisions_location_version_id_idx
  on campaign.approval_decisions (location_id, campaign_version_id);
create index approval_decisions_actor_id_idx
  on campaign.approval_decisions (actor_id);

do $tenant_rls$
declare
  tenant_table record;
begin
  for tenant_table in
    select *
    from (
      values
        ('campaign', 'campaign_versions'),
        ('campaign', 'preflight_results'),
        ('campaign', 'approval_decisions')
    ) as named_tables(schema_name, table_name)
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

create function campaign.reject_immutable_mutation()
returns trigger
language plpgsql
volatile
set search_path = ''
as $function$
begin
  raise exception using errcode = '55000', message = 'Campaign evidence rows are append-only';
end
$function$;

create trigger campaign_versions_append_only
before update or delete on campaign.campaign_versions
for each row execute function campaign.reject_immutable_mutation();

create trigger preflight_results_append_only
before update or delete on campaign.preflight_results
for each row execute function campaign.reject_immutable_mutation();

create trigger approval_decisions_append_only
before update or delete on campaign.approval_decisions
for each row execute function campaign.reject_immutable_mutation();

grant select, insert on campaign.campaign_versions to app_runtime;
grant select, insert on campaign.preflight_results to app_runtime;
grant select, insert on campaign.approval_decisions to app_runtime;

grant select on campaign.campaign_versions to support_runtime;
grant select on campaign.preflight_results to support_runtime;
grant select on campaign.approval_decisions to support_runtime;

revoke execute on function campaign.reject_immutable_mutation() from public;
grant execute on function campaign.reject_immutable_mutation() to app_runtime;

reset role;
