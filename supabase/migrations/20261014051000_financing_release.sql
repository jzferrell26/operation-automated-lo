-- CTR-004 revision 1. PostgreSQL 17. Additive empty-table expansion only.
-- CREATE TABLE / RLS / trigger DDL: ACCESS EXCLUSIVE on new tables only.
-- CREATE INDEX: SHARE on new empty tables. FKs: SHARE ROW EXCLUSIVE on
-- referenced tables while constraints are installed. No rewrite/backfill/drop.
-- After first use retain evidence, source, publication and sanitized audit.
-- Roll forward with a compatible binary; disable new public writes on rollback.
-- Dedicated service admission cannot alter tables, roles or triggers. No membership
-- is granted to app_runtime or the application login by this migration.
do $f$ begin
 if not exists(select 1 from pg_roles where rolname='financing_verifier_runtime') then
  create role financing_verifier_runtime nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
 end if;
 if not exists(select 1 from pg_roles where rolname='financing_public_runtime') then
  create role financing_public_runtime nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
 end if;
 if exists(select 1 from pg_roles where rolname in ('financing_verifier_runtime','financing_public_runtime') and (rolsuper or rolcreatedb or rolcreaterole or rolinherit or rolreplication or rolbypassrls or rolcanlogin)) then
  raise exception 'Financing verifier role must be unprivileged NOLOGIN';
 end if;
 execute format('grant financing_verifier_runtime to %I with set true, inherit false',current_user);
 execute format('grant financing_public_runtime to %I with set true, inherit false',current_user);
end $f$;
set role migration_owner;
grant usage on schema campaign to financing_verifier_runtime;
grant usage on schema campaign,platform to financing_public_runtime;
grant execute on function platform.current_location_id(),platform.current_actor_id(),platform.current_correlation_id() to financing_public_runtime;

create table campaign.financing_release_evidence (
 location_id uuid not null references platform.locations(id) on delete restrict,
 record_ref text not null,
 revision_ref text not null,
 kind text not null check(kind in ('property','partner-identity','lender-identity','preset','quote','disclosure','public-media','template','routing','consent','origin')),
 evidence jsonb not null check(jsonb_typeof(evidence)='object' and octet_length(evidence::text)<=8000),
 provenance jsonb not null check(jsonb_typeof(provenance)='object' and octet_length(provenance::text)<=4000),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 revoked_by_actor_id uuid references platform.app_users(id) on delete restrict,
 revoked_correlation_ref text,
 superseded_by_revision_ref text,
 primary key(location_id,record_ref,revision_ref),
 check((evidence->>'recordRef'=record_ref and evidence->>'revisionRef'=revision_ref and evidence->>'revokedAt' is null) is true),
 check((evidence->>'contentHash' ~ '^[a-f0-9]{64}$') is true),
 check((provenance->>'receiptHash' ~ '^[a-f0-9]{64}$') is true),
 check((revoked_at is null and revoked_by_actor_id is null and revoked_correlation_ref is null and superseded_by_revision_ref is null)
  or (revoked_at is not null and revoked_correlation_ref is not null and ((revoked_by_actor_id is not null and superseded_by_revision_ref is null) or (revoked_by_actor_id is null and superseded_by_revision_ref is not null))))
);
create index financing_release_evidence_expiry_idx on campaign.financing_release_evidence(expires_at);
create index financing_release_evidence_revoker_idx on campaign.financing_release_evidence(revoked_by_actor_id);

create table campaign.financing_release_sources (
 location_id uuid not null references platform.locations(id) on delete restrict,
 source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
 campaign_version_ref text not null,
 evidence_hash text not null check(evidence_hash ~ '^[a-f0-9]{64}$'),
 source jsonb not null check(jsonb_typeof(source)='object' and octet_length(source::text)<=950000),
 created_at timestamptz not null default clock_timestamp(),
 primary key(location_id,source_hash),
 unique(location_id,campaign_version_ref,evidence_hash),
 foreign key(location_id,campaign_version_ref) references campaign.campaign_versions(location_id,campaign_version_ref) on delete restrict
);
-- Unique index above starts with the complete campaign-version FK.
create table campaign.financing_release_source_evidence (
 location_id uuid not null,
 source_hash text not null,
 record_ref text not null,
 revision_ref text not null,
 primary key(location_id,source_hash,record_ref,revision_ref),
 foreign key(location_id,source_hash) references campaign.financing_release_sources(location_id,source_hash) on delete restrict,
 foreign key(location_id,record_ref,revision_ref) references campaign.financing_release_evidence(location_id,record_ref,revision_ref) on delete restrict
);
create index financing_release_source_evidence_ref_idx on campaign.financing_release_source_evidence(location_id,record_ref,revision_ref);

create table campaign.financing_releases (
 location_id uuid not null references platform.locations(id) on delete restrict,
 release_ref text not null,
 owner_id uuid not null references platform.app_users(id) on delete restrict,
 source_hash text not null,
 publication_id uuid not null unique,
 canonical_origin text not null check(canonical_origin ~ '^https://[a-z0-9.-]+(:[0-9]+)?$'),
 revision integer not null check(revision>0),
 state text not null check(state in ('prepared','approved','published','rejected','revoked')),
 valid_until timestamptz not null,
 record jsonb not null check(jsonb_typeof(record)='object' and octet_length(record::text)<=950000),
 primary key(location_id,release_ref),
 foreign key(location_id,source_hash) references campaign.financing_release_sources(location_id,source_hash) on delete restrict,
 check((record->'snapshot'->>'releaseRef'=release_ref and record->>'state'=state and (record->>'revision')::integer=revision) is true)
);
create index financing_releases_owner_idx on campaign.financing_releases(owner_id);
create index financing_releases_source_idx on campaign.financing_releases(location_id,source_hash);
create index financing_releases_owner_list_idx on campaign.financing_releases(location_id,owner_id,valid_until desc);

-- Protected per-transaction capability. Custom settings are caller-editable and
-- are never evidence of anonymous scope. Only the validated context function may
-- insert a binding; it cannot retarget an existing binding in the same transaction.
create table campaign.financing_release_public_scopes (
 backend_pid integer not null,
 transaction_id xid8 not null,
 location_id uuid not null references platform.locations(id) on delete restrict,
 owner_id uuid not null references platform.app_users(id) on delete restrict,
 release_ref text not null,
 publication_id uuid not null,
 canonical_origin text not null,
 primary key(backend_pid,transaction_id),
 foreign key(location_id,release_ref) references campaign.financing_releases(location_id,release_ref) on delete restrict
);
create index financing_release_public_scopes_release_idx on campaign.financing_release_public_scopes(location_id,release_ref);
create index financing_release_public_scopes_owner_idx on campaign.financing_release_public_scopes(owner_id);
alter table campaign.financing_release_public_scopes enable row level security;
alter table campaign.financing_release_public_scopes force row level security;
create policy financing_release_public_scopes_owner on campaign.financing_release_public_scopes to migration_owner using(true) with check(true);
-- A deferred trigger removes only its own ephemeral row during commit. Rollback
-- removes the insert naturally; no reusable token or committed scope survives.
create function campaign.financing_release_clean_public_scope()
returns trigger language plpgsql security definer set search_path='' as $f$
begin
 delete from campaign.financing_release_public_scopes where backend_pid=new.backend_pid and transaction_id=new.transaction_id;
 return null;
end $f$;
create constraint trigger financing_release_public_scope_cleanup after insert on campaign.financing_release_public_scopes
deferrable initially deferred for each row execute function campaign.financing_release_clean_public_scope();

create table campaign.financing_release_operations (
 location_id uuid not null references platform.locations(id) on delete restrict,
 command text not null check(command in ('prepare','approve','publish','reject','revoke')),
 request_id uuid not null,
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 release_ref text,
 state text not null check(state in ('pending','completed')),
 created_at timestamptz not null default clock_timestamp(),
 primary key(location_id,command,request_id),
 foreign key(location_id,release_ref) references campaign.financing_releases(location_id,release_ref) on delete restrict,
 check((state='pending' and release_ref is null) or (state='completed' and release_ref is not null))
);
create index financing_release_operations_release_idx on campaign.financing_release_operations(location_id,release_ref);

create table campaign.financing_release_inquiries (
 location_id uuid not null references platform.locations(id) on delete restrict,
 inquiry_id uuid not null unique,
 release_ref text not null,
 publication_id uuid not null references campaign.financing_releases(publication_id) on delete restrict,
 request_id uuid not null,
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 consent_hash text not null check(consent_hash ~ '^[a-f0-9]{64}$'),
 consent_version_ref text not null,
 routing_profile_version_ref text not null,
 highlevel_location_ref text not null,
 payload_cipher text not null check(length(payload_cipher) between 40 and 48000 and payload_cipher ~ '^v1\.[A-Za-z0-9_-]{1,40}\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$'),
 accepted_at timestamptz not null,
 expires_at timestamptz not null,
 primary key(location_id,publication_id,request_id),
 foreign key(location_id,release_ref) references campaign.financing_releases(location_id,release_ref) on delete restrict,
 check(expires_at=accepted_at+interval '30 days')
);
comment on column campaign.financing_release_inquiries.payload_cipher is 'PII: AES-256-GCM encrypted normalized inquiry, consent text/time and immutable attribution. Named server-only keyring, publication/request/location AAD. No plaintext contact columns.';
comment on column campaign.financing_release_inquiries.request_hash is 'Keyed HMAC of application content hash. Stable independent server key prevents offline contact dictionary matching and preserves dedupe through encryption rotation.';
create index financing_release_inquiries_release_idx on campaign.financing_release_inquiries(location_id,release_ref);
create index financing_release_inquiries_publication_idx on campaign.financing_release_inquiries(publication_id);
create index financing_release_inquiries_latest_idx on campaign.financing_release_inquiries(location_id,accepted_at desc,inquiry_id desc);
create index financing_release_inquiries_expiry_idx on campaign.financing_release_inquiries(expires_at);

-- Sanitized source-of-truth delivery operation survives ciphertext purge/removal.
-- No provider mutation, blind retry, plaintext contact or guessed mapping is implied.
create table campaign.financing_release_delivery (
 location_id uuid not null references platform.locations(id) on delete restrict,
 inquiry_id uuid not null,
 release_ref text not null,
 publication_id uuid not null,
 request_id uuid not null,
 state text not null check(state in ('pending','in_progress','delivered','failed','uncertain','blocked')),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(location_id,inquiry_id),
 unique(location_id,publication_id,request_id),
 foreign key(location_id,release_ref) references campaign.financing_releases(location_id,release_ref) on delete restrict
);
create index financing_release_delivery_release_idx on campaign.financing_release_delivery(location_id,release_ref);
create index financing_release_delivery_pending_idx on campaign.financing_release_delivery(location_id,state,updated_at);

create function campaign.financing_release_immutable_evidence()
returns trigger language plpgsql set search_path='' as $f$
begin
 if tg_op='DELETE' or (to_jsonb(new)-array['revoked_at','revoked_by_actor_id','revoked_correlation_ref','superseded_by_revision_ref']) is distinct from (to_jsonb(old)-array['revoked_at','revoked_by_actor_id','revoked_correlation_ref','superseded_by_revision_ref'])
    or old.revoked_at is not null or new.revoked_at is null then
  raise exception using errcode='55000',message='Immutable financing evidence';
 end if;
 return new;
end $f$;
create trigger financing_release_evidence_immutable before update or delete on campaign.financing_release_evidence for each row execute function campaign.financing_release_immutable_evidence();
create trigger financing_release_sources_immutable before update or delete on campaign.financing_release_sources for each row execute function campaign.reject_immutable_mutation();
create trigger financing_release_source_evidence_immutable before update or delete on campaign.financing_release_source_evidence for each row execute function campaign.reject_immutable_mutation();

do $f$ declare tab text; begin
 foreach tab in array array['financing_release_evidence','financing_release_sources','financing_release_source_evidence','financing_releases','financing_release_operations','financing_release_inquiries','financing_release_delivery'] loop
  execute format('alter table campaign.%I enable row level security',tab);
  execute format('alter table campaign.%I force row level security',tab);
  execute format('create policy %I on campaign.%I to migration_owner using(true) with check(true)',tab||'_owner',tab);
  execute format('create policy %I on campaign.%I for select to app_runtime using(platform.tenant_matches(location_id))',tab||'_read',tab);
  execute format('grant select on campaign.%I to app_runtime',tab);
 end loop;
end $f$;

create function campaign.financing_release_authorize(wanted_role text,wanted_version bigint,wanted_mode text,wanted_session uuid)
returns boolean language plpgsql security definer set search_path='' as $f$
begin
 if current_setting('role',true) is distinct from 'app_runtime' then return false; end if;
 if wanted_role<>'location_admin' or not campaign.webinar_destination_authorized(wanted_role,wanted_version,wanted_mode,wanted_session) then return false; end if;
 -- Freeze owner, location, binding and session through this transaction. No customer role UI.
 perform 1 from platform.locations where id=platform.current_location_id() and status='active' for share;
 if not found then return false; end if;
 perform 1 from platform.app_users where id=platform.current_actor_id() and status='active' for share;
 if not found then return false; end if;
 perform 1 from platform.role_bindings where location_id=platform.current_location_id() and user_id=platform.current_actor_id() and role='location_admin' and revoked_at is null for share;
 if not found then return false; end if;
 if wanted_mode='first_party' then
  perform 1 from platform.first_party_sessions where id=wanted_session and revoked_at is null and expires_at>clock_timestamp() for share;
  if not found then return false; end if;
 end if;
 perform set_config('app.financing_authorized','yes',true);
 perform set_config('app.financing_public_release','',true);
 return true;
end $f$;
create function campaign.financing_release_public_scope()
returns jsonb language plpgsql security definer set search_path='' as $f$
declare scope campaign.financing_release_public_scopes%rowtype; release jsonb;
begin
 if current_setting('role',true) is distinct from 'financing_public_runtime' then
  raise exception using errcode='42501',message='Anonymous financing scope unavailable';
 end if;
 select * into scope from campaign.financing_release_public_scopes where backend_pid=pg_backend_pid() and transaction_id=pg_current_xact_id() for share;
 if not found then raise exception using errcode='42501',message='Anonymous financing scope unavailable'; end if;
 release:=campaign.financing_release_publication(scope.publication_id,scope.canonical_origin);
 if release is null or release->'snapshot'->>'releaseRef'<>scope.release_ref then
  raise exception using errcode='42501',message='Anonymous financing scope unavailable';
 end if;
 return jsonb_build_object('locationId',scope.location_id,'ownerId',scope.owner_id,'releaseRef',scope.release_ref,
  'publicationId',scope.publication_id,'canonicalOrigin',scope.canonical_origin,'record',release);
end $f$;
create function campaign.financing_release_guard(allow_public boolean default false) returns void language plpgsql security definer set search_path='' as $f$
begin
 if current_setting('role',true)='financing_public_runtime' then
  if not allow_public then raise exception using errcode='42501',message='Anonymous financing command denied'; end if;
  perform campaign.financing_release_public_scope();
  return;
 end if;
 if current_setting('role',true) is distinct from 'app_runtime' then
  raise exception using errcode='42501',message='Financing authority unavailable';
 end if;
 if current_setting('app.financing_authorized',true) is distinct from 'yes' or platform.current_actor_type()<>'user'
 or not exists(select 1 from platform.role_bindings where location_id=platform.current_location_id() and user_id=platform.current_actor_id() and role='location_admin' and revoked_at is null) then
  raise exception using errcode='42501',message='Financing authority unavailable';
 end if;
end $f$;

-- Kind and exact revision bind every required property/identity/quote/channel authority.
create function campaign.financing_release_evidence_members(authority jsonb)
returns table(kind text,proof jsonb) language sql immutable set search_path='' as $f$
 select 'property',authority->'propertyAuthority' union all
 select 'partner-identity',authority->'partnerIdentity'->'authority' union all
 select 'lender-identity',authority->'lenderIdentity'->'authority' union all
 select 'preset',authority->'preset' union all
 select 'quote',value->'authority' from jsonb_array_elements(authority->'quoteEvidence') union all
 select 'disclosure',authority->'disclosure' union all
 select 'public-media',value->'authority' from jsonb_array_elements(authority->'mediaAuthorizations') union all
 select 'template',authority->'template' union all
 select 'routing',authority->'routing' union all
 select 'consent',authority->'consent' union all
 select 'origin',authority->'origin'->'authority'
$f$;
create function campaign.financing_release_assert_source(wanted_location uuid,wanted_source jsonb)
returns boolean language plpgsql security definer set search_path='' as $f$
declare member record; row campaign.financing_release_evidence%rowtype; v campaign.campaign_versions%rowtype; source_version jsonb:=wanted_source->'sourceVersion'; t timestamptz;
begin
 select * into v from campaign.campaign_versions where location_id=wanted_location and campaign_version_ref=source_version->>'campaignVersionRef' for share;
 if not found or v.campaign_ref<>source_version->>'campaignRef' or v.manifest<>source_version->'manifest'
  or v.manifest_hash<>source_version->>'manifestHash' or v.location_ref<>source_version->>'locationRef'
  or v.input_versions<>source_version->'inputVersions' or v.version_no<>(source_version->>'versionNo')::integer
  or v.created_by_actor_ref<>source_version->>'createdBy' or v.created_at<>(source_version->>'createdAt')::timestamptz then return false; end if;
 for member in select * from campaign.financing_release_evidence_members(wanted_source->'authority') order by proof->>'recordRef',proof->>'revisionRef' loop
  select * into row from campaign.financing_release_evidence where location_id=wanted_location and record_ref=member.proof->>'recordRef' and revision_ref=member.proof->>'revisionRef' for share;
  t:=clock_timestamp();
  if not found or row.kind<>member.kind or row.evidence<>member.proof or row.revoked_at is not null
    or row.expires_at<=t or (row.evidence->>'verifiedAt')::timestamptz>t or (row.evidence->>'issuedAt')::timestamptz>t
    or row.evidence->>'locationRef'<>v.location_ref or not (row.evidence->'channels' @> '["site","pdf"]'::jsonb) then return false; end if;
 end loop;
 return true;
end $f$;

-- Private service admission. No app_runtime execute grant, no auto-approved defaults.
create function campaign.financing_release_admit_evidence(wanted_location uuid,wanted_kind text,wanted_evidence jsonb,wanted_provenance jsonb)
returns boolean language plpgsql security definer set search_path='' as $f$
declare existing campaign.financing_release_evidence%rowtype; method text;
begin
 perform pg_advisory_xact_lock(hashtextextended('financing-verification:'||wanted_location::text||':'||(wanted_evidence->>'recordRef'),0));
 method:=case when wanted_kind in ('preset','quote','disclosure','lender-identity') then 'lender-record'
  when wanted_kind in ('property','partner-identity','public-media') then 'public-permission-record' else 'platform-record' end;
 if wanted_evidence->>'revokedAt' is not null or wanted_evidence->>'contentHash' !~ '^[a-f0-9]{64}$'
 or wanted_provenance->>'method' is distinct from method or wanted_provenance->>'receiptHash' !~ '^[a-f0-9]{64}$'
 or length(coalesce(wanted_provenance->>'qualificationRef','')) not between 8 and 128
 or length(coalesce(wanted_provenance->>'verifierRef','')) not between 8 and 128
 or (wanted_evidence->>'verifiedAt')::timestamptz>clock_timestamp()
 or (wanted_evidence->>'issuedAt')::timestamptz>(wanted_evidence->>'verifiedAt')::timestamptz
 or (wanted_evidence->>'expiresAt')::timestamptz<=clock_timestamp()
 or not (wanted_evidence->'channels' @> '["site","pdf"]'::jsonb) then raise exception using errcode='P0001',message='Financing evidence ineligible'; end if;
 insert into campaign.financing_release_evidence(location_id,record_ref,revision_ref,kind,evidence,provenance,expires_at)
 values(wanted_location,wanted_evidence->>'recordRef',wanted_evidence->>'revisionRef',wanted_kind,wanted_evidence,wanted_provenance,(wanted_evidence->>'expiresAt')::timestamptz) on conflict do nothing;
 select * into existing from campaign.financing_release_evidence where location_id=wanted_location and record_ref=wanted_evidence->>'recordRef' and revision_ref=wanted_evidence->>'revisionRef' for share;
 if existing.kind<>wanted_kind or existing.evidence<>wanted_evidence or existing.provenance<>wanted_provenance then raise exception using errcode='P0002',message='Financing evidence conflict'; end if;
 if existing.revoked_at is not null then raise exception using errcode='P0001',message='Financing evidence withdrawn'; end if;
 -- A newly admitted material revision retires the prior authority for the same record.
 -- Locks conflict with release evidence SHARE locks; historical rows stay immutable.
 update campaign.financing_release_evidence set revoked_at=clock_timestamp(),superseded_by_revision_ref=wanted_evidence->>'revisionRef',revoked_correlation_ref=wanted_provenance->>'qualificationRef'
 where location_id=wanted_location and record_ref=wanted_evidence->>'recordRef'
 and revision_ref<>wanted_evidence->>'revisionRef' and revoked_at is null;
 return true;
end $f$;
create function campaign.financing_release_withdraw_evidence(wanted_record text,wanted_revision text)
returns boolean language plpgsql security definer set search_path='' as $f$
begin
 perform campaign.financing_release_guard();
 perform 1 from campaign.financing_release_evidence where location_id=platform.current_location_id() and record_ref=wanted_record and revision_ref=wanted_revision for update;
 if not found then return false; end if;
 update campaign.financing_release_evidence set revoked_at=clock_timestamp(),revoked_by_actor_id=platform.current_actor_id(),revoked_correlation_ref=platform.current_correlation_id() where location_id=platform.current_location_id() and record_ref=wanted_record and revision_ref=wanted_revision and revoked_at is null;
 return true;
end $f$;

create function campaign.financing_release_save_source(wanted_source jsonb,wanted_hash text,wanted_evidence_hash text)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare existing campaign.financing_release_sources%rowtype; loc uuid:=platform.current_location_id();
begin
 perform campaign.financing_release_guard();
 if wanted_hash !~ '^[a-f0-9]{64}$' or wanted_evidence_hash !~ '^[a-f0-9]{64}$' or not campaign.financing_release_assert_source(loc,wanted_source) then raise exception using errcode='P0001',message='Financing source ineligible'; end if;
 insert into campaign.financing_release_sources(location_id,source_hash,campaign_version_ref,evidence_hash,source)
 values(loc,wanted_hash,wanted_source->'sourceVersion'->>'campaignVersionRef',wanted_evidence_hash,wanted_source) on conflict do nothing;
 select * into existing from campaign.financing_release_sources where location_id=loc and campaign_version_ref=wanted_source->'sourceVersion'->>'campaignVersionRef' and evidence_hash=wanted_evidence_hash for share;
 if existing.source is distinct from wanted_source or existing.source_hash is distinct from wanted_hash then raise exception using errcode='P0002',message='Financing source conflict'; end if;
 insert into campaign.financing_release_source_evidence(location_id,source_hash,record_ref,revision_ref)
 select loc,wanted_hash,proof->>'recordRef',proof->>'revisionRef' from campaign.financing_release_evidence_members(wanted_source->'authority') on conflict do nothing;
 return existing.source;
end $f$;
create function campaign.financing_release_source(wanted_campaign text,wanted_version text,wanted_evidence text)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare result jsonb; scope jsonb; loc uuid;
begin
 perform campaign.financing_release_guard(true);
 if current_setting('role',true)='financing_public_runtime' then
  scope:=campaign.financing_release_public_scope(); loc:=(scope->>'locationId')::uuid;
  if wanted_campaign<>scope->'record'->'snapshot'->>'campaignRef' or wanted_version<>scope->'record'->'snapshot'->>'campaignVersionRef' or wanted_evidence<>scope->'record'->'snapshot'->>'evidenceHash' then return null; end if;
 else loc:=platform.current_location_id(); end if;
 select source into result from campaign.financing_release_sources where location_id=loc and campaign_version_ref=wanted_version and evidence_hash=wanted_evidence and source->'sourceVersion'->>'campaignRef'=wanted_campaign;
 if result is null or not campaign.financing_release_assert_source(loc,result) then raise exception using errcode='P0001',message='Financing source ineligible'; end if;
 return result;
end $f$;

create function campaign.financing_release_current(wanted_snapshot jsonb)
returns boolean language plpgsql security definer set search_path='' as $f$
declare source_row campaign.financing_release_sources%rowtype; actual_until timestamptz; scope jsonb; loc uuid;
begin
 perform campaign.financing_release_guard(true);
 if current_setting('role',true)='financing_public_runtime' then
  scope:=campaign.financing_release_public_scope(); loc:=(scope->>'locationId')::uuid;
  if wanted_snapshot is distinct from scope->'record'->'snapshot' then return false; end if;
 else loc:=platform.current_location_id(); end if;
 select * into source_row from campaign.financing_release_sources where location_id=loc and campaign_version_ref=wanted_snapshot->>'campaignVersionRef' and evidence_hash=wanted_snapshot->>'evidenceHash' for share;
 if not found or source_row.source->'authority'<>wanted_snapshot->'authority'
  or source_row.source->'sourceVersion'->>'locationRef'<>wanted_snapshot->>'locationRef'
  or source_row.source->'sourceVersion'->>'manifestHash'<>wanted_snapshot->>'manifestHash'
  or source_row.source->'sourceVersion'->>'campaignRef'<>wanted_snapshot->>'campaignRef'
  or not campaign.financing_release_assert_source(loc,source_row.source) then return false; end if;
 select min(expiry) into actual_until from (
  select (proof->>'expiresAt')::timestamptz as expiry from campaign.financing_release_evidence_members(wanted_snapshot->'authority')
  union all select (value->'quote'->>'expiresAt')::timestamptz from jsonb_array_elements(source_row.source->'sourceVersion'->'manifest'->'financing'->'scenarios')
 ) bounds;
 return actual_until=(wanted_snapshot->>'validUntil')::timestamptz and actual_until>clock_timestamp();
end $f$;

create function campaign.financing_release_reserve(wanted_command text,wanted_request uuid,wanted_hash text)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare existing campaign.financing_release_operations%rowtype; inserted integer;
begin
 perform campaign.financing_release_guard();
 insert into campaign.financing_release_operations(location_id,command,request_id,content_hash,state)
 values(platform.current_location_id(),wanted_command,wanted_request,wanted_hash,'pending') on conflict do nothing;
 get diagnostics inserted=row_count;
 select * into existing from campaign.financing_release_operations where location_id=platform.current_location_id() and command=wanted_command and request_id=wanted_request for update;
 if existing.content_hash<>wanted_hash then raise exception using errcode='P0002',message='Financing operation conflict'; end if;
 if inserted=1 then return jsonb_build_object('state','new'); end if;
 if existing.state='completed' then return jsonb_build_object('state','completed','releaseRef',existing.release_ref); end if;
 return jsonb_build_object('state','pending');
end $f$;
create function campaign.financing_release_load(wanted_ref text)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare result jsonb; scope jsonb; loc uuid; owner uuid;
begin
 perform campaign.financing_release_guard(true);
 if current_setting('role',true)='financing_public_runtime' then
  scope:=campaign.financing_release_public_scope(); loc:=(scope->>'locationId')::uuid; owner:=(scope->>'ownerId')::uuid;
  if wanted_ref<>scope->>'releaseRef' then return null; end if;
 else loc:=platform.current_location_id(); owner:=platform.current_actor_id(); end if;
 select record into result from campaign.financing_releases where location_id=loc and owner_id=owner and release_ref=wanted_ref for update;
 return result;
end $f$;
create function campaign.financing_release_save(wanted_record jsonb,wanted_revision integer)
returns boolean language plpgsql security definer set search_path='' as $f$
declare snapshot jsonb:=wanted_record->'snapshot'; existing campaign.financing_releases%rowtype; src text; desired text:=wanted_record->>'state'; loc uuid:=platform.current_location_id();
begin
 perform campaign.financing_release_guard();
 if desired in ('prepared','approved','published') and not campaign.financing_release_current(snapshot) then raise exception using errcode='P0001',message='Financing release ineligible'; end if;
 select source_hash into src from campaign.financing_release_sources where location_id=loc and campaign_version_ref=snapshot->>'campaignVersionRef' and evidence_hash=snapshot->>'evidenceHash';
 if src is null then return false; end if;
 if wanted_revision is null then
  if desired<>'prepared' or (wanted_record->>'revision')::integer<>1 or wanted_record->'approval'<>'null'::jsonb then return false; end if;
  insert into campaign.financing_releases(location_id,release_ref,owner_id,source_hash,publication_id,canonical_origin,revision,state,valid_until,record)
  values(loc,snapshot->>'releaseRef',platform.current_actor_id(),src,(snapshot->>'publicationId')::uuid,snapshot->'authority'->'origin'->>'canonicalOrigin',1,desired,(snapshot->>'validUntil')::timestamptz,wanted_record);
  return true;
 end if;
 select * into existing from campaign.financing_releases where location_id=loc and release_ref=snapshot->>'releaseRef' and owner_id=platform.current_actor_id() for update;
 if not found or existing.revision<>wanted_revision or existing.record->'snapshot'<>snapshot or (wanted_record->>'revision')::integer<>wanted_revision+1 then return false; end if;
 if not ((existing.state='prepared' and desired in ('approved','rejected','revoked')) or (existing.state='approved' and desired in ('published','revoked')) or (existing.state='published' and desired='revoked') or (existing.state='rejected' and desired='revoked')) then return false; end if;
 if desired='approved' and (wanted_record->'approval'->>'releaseRef'<>snapshot->>'releaseRef' or wanted_record->'approval'->>'bundleHash'<>snapshot->>'bundleHash' or wanted_record->'approval'->>'evidenceHash'<>snapshot->>'evidenceHash' or wanted_record->'approval'->>'approvedBy'<>snapshot->>'actorRef') then return false; end if;
 if desired in ('published','revoked') and wanted_record->'approval' is distinct from existing.record->'approval' then return false; end if;
 update campaign.financing_releases set record=wanted_record,revision=wanted_revision+1,state=desired where location_id=loc and release_ref=existing.release_ref;
 if desired='revoked' then update campaign.financing_release_delivery set state='blocked',updated_at=clock_timestamp() where location_id=loc and release_ref=existing.release_ref and state='pending'; end if;
 return true;
end $f$;
create function campaign.financing_release_complete(wanted_command text,wanted_request uuid,wanted_hash text,wanted_ref text)
returns boolean language plpgsql security definer set search_path='' as $f$
begin
 perform campaign.financing_release_guard();
 if not exists(select 1 from campaign.financing_releases where location_id=platform.current_location_id() and owner_id=platform.current_actor_id() and release_ref=wanted_ref) then return false; end if;
 update campaign.financing_release_operations set state='completed',release_ref=wanted_ref where location_id=platform.current_location_id() and command=wanted_command and request_id=wanted_request and content_hash=wanted_hash and (state='pending' or release_ref=wanted_ref);
 return found;
end $f$;

create function campaign.financing_release_receipt(item campaign.financing_release_inquiries,delivery_state text)
returns jsonb language sql immutable set search_path='' as $f$
 select jsonb_build_object('inquiryId',item.inquiry_id,'publicationId',item.publication_id,'requestId',item.request_id,
 'acceptedAt',to_char(item.accepted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'expiresAt',to_char(item.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'deliveryState',delivery_state)
$f$;
create function campaign.financing_release_capture(wanted_release text,wanted_request uuid,wanted_hash text,wanted_cipher text,wanted_inquiry uuid,wanted_accepted timestamptz,wanted_expiry timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare release campaign.financing_releases%rowtype; previous campaign.financing_release_inquiries%rowtype; delivery_state text; snapshot jsonb; loc uuid; owner uuid; scope jsonb;
begin
 perform campaign.financing_release_guard(true);
 if current_setting('role',true)='financing_public_runtime' then
  scope:=campaign.financing_release_public_scope(); loc:=(scope->>'locationId')::uuid; owner:=(scope->>'ownerId')::uuid;
  if wanted_release<>scope->>'releaseRef' then raise exception using errcode='P0001',message='Financing capture ineligible'; end if;
 else loc:=platform.current_location_id(); owner:=platform.current_actor_id(); end if;
 select * into release from campaign.financing_releases where location_id=loc and owner_id=owner and release_ref=wanted_release for update;
 if not found or release.state<>'published' or not campaign.financing_release_current(release.record->'snapshot') then raise exception using errcode='P0001',message='Financing capture ineligible'; end if;
 snapshot:=release.record->'snapshot';
 select * into previous from campaign.financing_release_inquiries where location_id=loc and publication_id=release.publication_id and request_id=wanted_request for update;
 if found then
  if previous.request_hash<>wanted_hash then raise exception using errcode='P0002',message='Financing inquiry conflict'; end if;
  if previous.expires_at<=clock_timestamp() then raise exception using errcode='P0001',message='Financing inquiry expired'; end if;
  select state into delivery_state from campaign.financing_release_delivery where location_id=loc and inquiry_id=previous.inquiry_id;
  return campaign.financing_release_receipt(previous,delivery_state);
 end if;
 -- A removed or purged request never re-creates PII, even if the old browser retries.
 if exists(select 1 from campaign.financing_release_delivery where location_id=loc and publication_id=release.publication_id and request_id=wanted_request) then raise exception using errcode='P0001',message='Financing inquiry unavailable'; end if;
 if wanted_expiry<>wanted_accepted+interval '30 days' or wanted_accepted>clock_timestamp() or wanted_accepted<clock_timestamp()-interval '5 minutes' then raise exception using errcode='P0001',message='Financing capture time invalid'; end if;
 insert into campaign.financing_release_inquiries(location_id,inquiry_id,release_ref,publication_id,request_id,request_hash,consent_hash,consent_version_ref,routing_profile_version_ref,highlevel_location_ref,payload_cipher,accepted_at,expires_at)
 values(loc,wanted_inquiry,wanted_release,release.publication_id,wanted_request,wanted_hash,snapshot->'authority'->>'consentHash',snapshot->>'consentVersionRef',snapshot->>'routingProfileVersionRef',snapshot->'authority'->>'highlevelLocationRef',wanted_cipher,wanted_accepted,wanted_expiry) returning * into previous;
 insert into campaign.financing_release_delivery(location_id,inquiry_id,release_ref,publication_id,request_id,state) values(loc,wanted_inquiry,wanted_release,release.publication_id,wanted_request,'pending');
 return campaign.financing_release_receipt(previous,'pending');
end $f$;

-- Anonymous server capability resolves owner only from an eligible exact UUID/origin.
-- It grants no publication commands, setup mutation, export or removal operation.
create function campaign.financing_release_public_context(wanted_id uuid,wanted_origin text)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare release campaign.financing_releases%rowtype; correlation text; scope campaign.financing_release_public_scopes%rowtype;
begin
 if current_setting('role',true) is distinct from 'financing_public_runtime' then return null; end if;
 if campaign.financing_release_publication(wanted_id,wanted_origin) is null then return null; end if;
 select * into release from campaign.financing_releases where publication_id=wanted_id and canonical_origin=wanted_origin and state='published' for share;
 if not found then return null; end if;
 insert into campaign.financing_release_public_scopes(backend_pid,transaction_id,location_id,owner_id,release_ref,publication_id,canonical_origin)
 values(pg_backend_pid(),pg_current_xact_id(),release.location_id,release.owner_id,release.release_ref,wanted_id,wanted_origin) on conflict do nothing;
 select * into scope from campaign.financing_release_public_scopes where backend_pid=pg_backend_pid() and transaction_id=pg_current_xact_id() for share;
 if scope.location_id<>release.location_id or scope.owner_id<>release.owner_id or scope.release_ref<>release.release_ref
  or scope.publication_id<>wanted_id or scope.canonical_origin<>wanted_origin then return null; end if;
 perform 1 from platform.locations where id=release.location_id and status='active' for share;
 if not found then return null; end if;
 perform 1 from platform.app_users where id=release.owner_id and status='active' for share;
 if not found then return null; end if;
 perform 1 from platform.role_bindings where location_id=release.location_id and user_id=release.owner_id and role='location_admin' and revoked_at is null for share;
 if not found then return null; end if;
 correlation:='correlation_financing'||replace(wanted_id::text,'-','');
 perform platform.set_app_context(release.location_id,release.owner_id,correlation);
 -- Generic tenant settings support the shared adapter's context probe only.
 -- Neither they nor a caller-edited public/private mode authorize any capability.
 perform set_config('app.financing_authorized','',true);
 return jsonb_build_object('locationId',release.location_id,'actorId',release.owner_id,'correlationId',correlation,
  'locationRef',release.record->'snapshot'->>'locationRef','releaseRef',release.release_ref);
end $f$;
create function campaign.financing_release_export()
returns jsonb language plpgsql security definer set search_path='' as $f$
begin
 perform campaign.financing_release_guard();
 return coalesce((select jsonb_agg(jsonb_build_object('receipt',campaign.financing_release_receipt(i,d.state),'cipher',i.payload_cipher) order by i.accepted_at desc,i.inquiry_id desc)
 from (select item.* from campaign.financing_release_inquiries item join campaign.financing_releases r using(location_id,release_ref)
 where item.location_id=platform.current_location_id() and r.owner_id=platform.current_actor_id() and item.expires_at>clock_timestamp() order by item.accepted_at desc,item.inquiry_id desc limit 1000) i
 join campaign.financing_release_delivery d using(location_id,inquiry_id)), '[]'::jsonb);
end $f$;
create function campaign.financing_release_remove_inquiry(wanted_id uuid)
returns boolean language plpgsql security definer set search_path='' as $f$
begin
 perform campaign.financing_release_guard();
 delete from campaign.financing_release_inquiries i using campaign.financing_releases r where i.location_id=platform.current_location_id() and i.inquiry_id=wanted_id and r.location_id=i.location_id and r.release_ref=i.release_ref and r.owner_id=platform.current_actor_id();
 if not found then return false; end if;
 update campaign.financing_release_delivery set state='blocked',updated_at=clock_timestamp() where location_id=platform.current_location_id() and inquiry_id=wanted_id and state='pending';
 return true;
end $f$;
create function campaign.purge_expired_financing_inquiries()
returns integer language plpgsql security definer set search_path='' as $f$
declare removed integer;
begin
 with expired as (select location_id,publication_id,request_id from campaign.financing_release_inquiries where expires_at<=clock_timestamp() order by expires_at limit 5000 for update skip locked),
 deleted as (delete from campaign.financing_release_inquiries item using expired where item.location_id=expired.location_id and item.publication_id=expired.publication_id and item.request_id=expired.request_id returning item.location_id,item.inquiry_id),
 blocked as (update campaign.financing_release_delivery d set state='blocked',updated_at=clock_timestamp() from deleted where d.location_id=deleted.location_id and d.inquiry_id=deleted.inquiry_id and d.state='pending')
 select count(*)::integer into removed from deleted;
 return removed;
end $f$;

-- Fixed internal server capability. The application returns only its public allowlist.
create function campaign.financing_release_publication(wanted_id uuid,wanted_origin text)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare release campaign.financing_releases%rowtype; src jsonb;
begin
 select * into release from campaign.financing_releases where publication_id=wanted_id and canonical_origin=wanted_origin and state='published' and valid_until>clock_timestamp() for share;
 if not found or release.record->'approval' is null or release.record->'approval'='null'::jsonb or release.record->>'publishedAt' is null then return null; end if;
 if not exists(select 1 from platform.locations where id=release.location_id and status='active')
 or not exists(select 1 from platform.app_users where id=release.owner_id and status='active')
 or not exists(select 1 from platform.role_bindings where location_id=release.location_id and user_id=release.owner_id and role='location_admin' and revoked_at is null) then return null; end if;
 select source into src from campaign.financing_release_sources where location_id=release.location_id and source_hash=release.source_hash;
 if src is null or not campaign.financing_release_assert_source(release.location_id,src) then return null; end if;
 return release.record;
end $f$;

-- Consumer hook for the unchanged daily 12:15 UTC scheduler. Five fixed 5000-row
-- batches across both families preserve the total 25000-per-invocation bound.
create function campaign.purge_expired_marketing_inquiries()
returns jsonb language plpgsql security definer set search_path='' as $f$
declare batch integer; funnel integer:=0; financing integer:=0;
begin
 for batch in 1..5 loop
  if batch%2=0 then financing:=financing+campaign.purge_expired_financing_inquiries();
  else funnel:=funnel+campaign.purge_expired_funnel_inquiries(); end if;
 end loop;
 return jsonb_build_object('funnel',funnel,'financing',financing,'total',funnel+financing);
end $f$;

-- No PUBLIC helper or table mutation grants. Runtime executes only fixed guarded functions.
do $f$ declare proc record; begin
 for proc in select p.oid::regprocedure as signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='campaign' and p.proname like 'financing_release_%' loop
  execute format('revoke all on function %s from public',proc.signature);
  if proc.proname in ('financing_release_authorize','financing_release_save_source','financing_release_source','financing_release_current','financing_release_reserve','financing_release_load','financing_release_save','financing_release_complete','financing_release_capture','financing_release_export','financing_release_remove_inquiry','financing_release_withdraw_evidence','financing_release_publication') then
   execute format('grant execute on function %s to app_runtime',proc.signature);
  end if;
  if proc.proname in ('financing_release_publication','financing_release_public_context','financing_release_source','financing_release_load','financing_release_current','financing_release_capture') then
   execute format('grant execute on function %s to financing_public_runtime',proc.signature);
  end if;
 end loop;
end $f$;
revoke all on function campaign.purge_expired_financing_inquiries() from public;
-- Resolve the already granted fixed cleanup functions. No CREATE or table access.
grant usage on schema campaign to scheduler_runtime;
grant execute on function campaign.purge_expired_financing_inquiries() to scheduler_runtime;
revoke all on function campaign.purge_expired_marketing_inquiries() from public;
grant execute on function campaign.purge_expired_marketing_inquiries() to scheduler_runtime;
grant execute on function campaign.financing_release_admit_evidence(uuid,text,jsonb,jsonb) to financing_verifier_runtime;
reset role;
