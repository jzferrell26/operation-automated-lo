-- PRD-010 Batch B. Private, text/vector-only draft packages, not published artifacts.
-- Additive: creates one empty table and its policies/indexes; no existing data rewrite.
-- Locks: new-table creation takes ACCESS EXCLUSIVE on the new object; FK creation
-- takes SHARE ROW EXCLUSIVE on the referenced tables. Apply in the normal migration window.
-- The sealed JSON payload is size-bounded. Images and production publication remain in object storage.
-- Roll forward; never drop this table as part of application rollback after use.
set role migration_owner;

create table campaign.property_campaign_packages (
  location_id uuid not null references platform.locations(id) on delete restrict,
  campaign_version_ref text not null,
  campaign_ref text not null,
  source_manifest_hash text not null check (source_manifest_hash ~ '^[a-f0-9]{64}$'),
  template_version text not null check (template_version = '1.0.0'),
  generated_by_actor_id uuid not null references platform.app_users(id) on delete restrict,
  created_at timestamptz not null default pg_catalog.now(),
  package jsonb not null,
  primary key (location_id, campaign_version_ref, template_version),
  foreign key (location_id, campaign_version_ref)
    references campaign.campaign_versions(location_id, campaign_version_ref) on delete restrict,
  constraint property_package_object check (pg_catalog.jsonb_typeof(package) = 'object'),
  constraint property_package_size check (pg_catalog.octet_length(package::text) <= 1500000),
  constraint property_package_private check ((package->'reviewOnly' = 'true'::jsonb) is true),
  constraint property_package_version check ((package->>'campaignVersionRef' = campaign_version_ref) is true),
  constraint property_package_campaign check ((package->>'campaignRef' = campaign_ref) is true),
  constraint property_package_source check ((package->>'sourceManifestHash' = source_manifest_hash) is true),
  constraint property_package_template check ((package->>'templateVersion' = template_version) is true)
);

create index property_packages_actor_idx on campaign.property_campaign_packages(generated_by_actor_id);
create index property_packages_campaign_idx on campaign.property_campaign_packages(location_id, campaign_ref);

alter table campaign.property_campaign_packages enable row level security;
alter table campaign.property_campaign_packages force row level security;
create policy property_packages_owner on campaign.property_campaign_packages
  for all to migration_owner using (true) with check (true);
create policy property_packages_read on campaign.property_campaign_packages
  for select to app_runtime using (platform.tenant_matches(location_id));
create policy property_packages_insert on campaign.property_campaign_packages
  for insert to app_runtime with check (
    platform.tenant_matches(location_id)
    and generated_by_actor_id = platform.current_actor_id()
    and exists (
      select 1 from platform.role_bindings as binding
      where binding.location_id = property_campaign_packages.location_id
        and binding.user_id = platform.current_actor_id()
        and binding.revoked_at is null
        and binding.role in ('location_admin', 'creator')
    )
    and exists (
      select 1 from campaign.campaign_versions as source
      where source.location_id = property_campaign_packages.location_id
        and source.campaign_version_ref = property_campaign_packages.campaign_version_ref
        and source.campaign_ref = property_campaign_packages.campaign_ref
        and source.manifest_hash = property_campaign_packages.source_manifest_hash
        and source.manifest->>'blueprintId' = 'open-house-boost'
        and source.manifest ? 'preparation'
    )
  );

create trigger property_packages_append_only before update or delete
  on campaign.property_campaign_packages for each row
  execute function campaign.reject_immutable_mutation();
grant select, insert on campaign.property_campaign_packages to app_runtime;
-- No public, reporting, support, update, or delete grant is added.
reset role;
