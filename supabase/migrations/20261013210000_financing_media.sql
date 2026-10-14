-- CTR-001 revision 1. PostgreSQL 17, additive empty-table expansion.
-- ACCESS EXCLUSIVE applies only to new tables for creation/RLS/triggers;
-- SHARE for indexes on new empty tables. Referenced FK tables receive
-- SHARE ROW EXCLUSIVE during constraint creation. No rewrite/backfill/drop.
-- Roll forward: retain immutable records after first use; never destructive down.
set role migration_owner;
create table campaign.financing_media (
  location_id uuid not null references platform.locations(id) on delete restrict,
  media_ref text not null check (media_ref ~ '^media_[a-f0-9]{32}$'),
  location_ref text not null check (length(location_ref) between 8 and 128 and location_ref ~ '^[a-z][a-z0-9]*(_[A-Za-z0-9]+)+$'),
  created_by uuid not null references platform.app_users(id) on delete restrict,
  created_by_ref text not null check (length(created_by_ref) between 8 and 128 and created_by_ref ~ '^[a-z][a-z0-9]*(_[A-Za-z0-9]+)+$'),
  request_id uuid not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text not null check (mime_type in ('image/jpeg','image/png')),
  byte_size integer not null check (byte_size between 1 and 2097152),
  width integer not null check (width between 400 and 6000),
  height integer not null check (height between 400 and 6000),
  normalization_version text not null check (normalization_version = '1.0.0'),
  rights_basis text not null check (rights_basis in ('owned','licensed','permission')),
  created_at timestamptz not null,
  primary key(location_id, media_ref),
  unique(location_id, created_by, request_id),
  check (width::bigint * height <= 12000000)
);
create index financing_media_created_by_idx on campaign.financing_media(created_by);
create table campaign.financing_media_revocations (
  location_id uuid not null,
  media_ref text not null,
  revoked_by uuid not null references platform.app_users(id) on delete restrict,
  revoked_by_ref text not null check (length(revoked_by_ref) between 8 and 128 and revoked_by_ref ~ '^[a-z][a-z0-9]*(_[A-Za-z0-9]+)+$'),
  revoked_at timestamptz not null default pg_catalog.now(),
  primary key(location_id, media_ref),
  foreign key(location_id, media_ref) references campaign.financing_media(location_id, media_ref) on delete restrict
);
create index financing_media_revocations_actor_idx on campaign.financing_media_revocations(revoked_by);

alter table campaign.financing_media enable row level security;
alter table campaign.financing_media force row level security;
alter table campaign.financing_media_revocations enable row level security;
alter table campaign.financing_media_revocations force row level security;
create policy financing_media_owner on campaign.financing_media to migration_owner using(true) with check(true);
create policy financing_media_revocations_owner on campaign.financing_media_revocations to migration_owner using(true) with check(true);
create policy financing_media_read on campaign.financing_media for select to app_runtime using(platform.tenant_matches(location_id));
create policy financing_media_revocations_read on campaign.financing_media_revocations for select to app_runtime using(platform.tenant_matches(location_id));
create policy financing_media_insert on campaign.financing_media for insert to app_runtime with check(
  platform.tenant_matches(location_id) and created_by = platform.current_actor_id()
  and exists(select 1 from platform.role_bindings b where b.location_id = financing_media.location_id
    and b.user_id = platform.current_actor_id() and b.revoked_at is null and b.role in ('location_admin','creator'))
);
create policy financing_media_revoke on campaign.financing_media_revocations for insert to app_runtime with check(
  platform.tenant_matches(location_id) and revoked_by = platform.current_actor_id()
  and exists(select 1 from platform.role_bindings b where b.location_id = financing_media_revocations.location_id
    and b.user_id = platform.current_actor_id() and b.revoked_at is null and b.role in ('location_admin','creator'))
);
create trigger financing_media_append_only before update or delete on campaign.financing_media
for each row execute function campaign.reject_immutable_mutation();
create trigger financing_media_revocations_append_only before update or delete on campaign.financing_media_revocations
for each row execute function campaign.reject_immutable_mutation();
grant select, insert on campaign.financing_media, campaign.financing_media_revocations to app_runtime;
reset role;
