-- Public financing inquiry admission, PostgreSQL 17. One new empty tenant table.
-- New table/RLS: ACCESS EXCLUSIVE on the new table only; indexes: SHARE.
-- Indexed FKs: SHARE ROW EXCLUSIVE briefly on referenced tables. No row rewrite.
-- Function rename/replacement and grants: catalog locks. Preserve the old capture body.
-- Roll forward after use. Admission includes no contact/IP/provider payload.
set role migration_owner;
set lock_timeout='5s';

create table campaign.financing_public_inquiry_admissions (
 location_id uuid not null references platform.locations(id) on delete restrict,
 publication_id uuid not null references campaign.financing_releases(publication_id) on delete restrict,
 release_ref text not null,
 request_id uuid not null,
 client_hash text not null check(client_hash ~ '^[a-f0-9]{64}$'),
 admitted_at timestamptz not null default clock_timestamp(),
 consumed_at timestamptz,
 content_hash text check(content_hash ~ '^[a-f0-9]{64}$'),
 primary key(location_id,publication_id,request_id),
 foreign key(location_id,release_ref) references campaign.financing_releases(location_id,release_ref) on delete restrict,
 check((consumed_at is null and content_hash is null) or (consumed_at>=admitted_at and content_hash is not null))
);
create index financing_public_inquiry_admissions_release_idx on campaign.financing_public_inquiry_admissions(location_id,release_ref);
create index financing_public_inquiry_admissions_client_idx on campaign.financing_public_inquiry_admissions(publication_id,client_hash,admitted_at desc);
create index financing_public_inquiry_admissions_daily_idx on campaign.financing_public_inquiry_admissions(publication_id,admitted_at desc);
alter table campaign.financing_public_inquiry_admissions enable row level security;
alter table campaign.financing_public_inquiry_admissions force row level security;
create policy financing_public_inquiry_admissions_owner on campaign.financing_public_inquiry_admissions to migration_owner using(true) with check(true);
revoke all on campaign.financing_public_inquiry_admissions from public,app_runtime,financing_public_runtime;
comment on column campaign.financing_public_inquiry_admissions.client_hash is 'Server keyed, publication-separated HMAC of trusted deployment client bytes. No raw IP, header, contact or unkeyed identifier is retained.';
comment on column campaign.financing_public_inquiry_admissions.content_hash is 'Existing keyed financing capture hash, retained only when capture succeeds. Exact request replay never increments quota.';

create function campaign.financing_public_inquiry_admit(wanted_id uuid,wanted_origin text,wanted_request uuid,wanted_client text)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare context jsonb; scope jsonb; previous campaign.financing_public_inquiry_admissions; tick timestamptz; oldest timestamptz;
begin
 if current_setting('role',true) is distinct from 'financing_public_runtime' then
  raise exception using errcode='42501',message='Public inquiry admission unavailable';
 end if;
 if wanted_id is null or wanted_request is null or (wanted_client ~ '^[a-f0-9]{64}$') is not true then
  return jsonb_build_object('status','invalid');
 end if;
 -- Lock before resolving the publication scope/counting. All clients for a publication serialize.
 perform pg_advisory_xact_lock(hashtextextended('financing-public:'||wanted_id::text,0));
 context:=campaign.financing_release_public_context(wanted_id,wanted_origin);
 if context is null then return jsonb_build_object('status','unavailable'); end if;
 scope:=campaign.financing_release_public_scope();
 if scope->>'publicationId' is distinct from wanted_id::text or scope->>'canonicalOrigin' is distinct from wanted_origin then
  return jsonb_build_object('status','unavailable');
 end if;
 tick:=clock_timestamp();
 select * into previous from campaign.financing_public_inquiry_admissions
  where location_id=(scope->>'locationId')::uuid and publication_id=wanted_id and request_id=wanted_request for update;
 if found then
  if previous.client_hash is distinct from wanted_client then return jsonb_build_object('status','conflict'); end if;
  return jsonb_build_object('status','admitted','allowed',true,'retryAfterSeconds',0);
 end if;
 -- Match the established funnel engineering defaults: 20/10 minutes, 5000/rolling day.
 if (select count(*) from campaign.financing_public_inquiry_admissions
   where publication_id=wanted_id and client_hash=wanted_client and admitted_at>tick-interval '10 minutes')>=20 then
  select min(admitted_at) into oldest from campaign.financing_public_inquiry_admissions
   where publication_id=wanted_id and client_hash=wanted_client and admitted_at>tick-interval '10 minutes';
  return jsonb_build_object('status','limited','allowed',false,'retryAfterSeconds',least(600,greatest(1,ceil(extract(epoch from (oldest+interval '10 minutes'-tick))))));
 end if;
 if (select count(*) from campaign.financing_public_inquiry_admissions where publication_id=wanted_id and admitted_at>tick-interval '24 hours')>=5000 then
  select min(admitted_at) into oldest from campaign.financing_public_inquiry_admissions where publication_id=wanted_id and admitted_at>tick-interval '24 hours';
  return jsonb_build_object('status','limited','allowed',false,'retryAfterSeconds',least(86400,greatest(1,ceil(extract(epoch from (oldest+interval '24 hours'-tick))))));
 end if;
 insert into campaign.financing_public_inquiry_admissions(location_id,publication_id,release_ref,request_id,client_hash,admitted_at)
  values((scope->>'locationId')::uuid,wanted_id,scope->>'releaseRef',wanted_request,wanted_client,tick);
 return jsonb_build_object('status','admitted','allowed',true,'retryAfterSeconds',0);
end $f$;
revoke all on function campaign.financing_public_inquiry_admit(uuid,text,uuid,text) from public,app_runtime;
grant execute on function campaign.financing_public_inquiry_admit(uuid,text,uuid,text) to financing_public_runtime;

-- Keep the exact original implementation and signature privately; no public entry can bypass admission.
alter function campaign.financing_release_capture(text,uuid,text,text,uuid,timestamptz,timestamptz) rename to financing_release_capture_private;
-- Application retention is an absolute 30 * 24 hours. The unchanged private body
-- and its table CHECK use interval '30 days', which is calendar arithmetic in the
-- caller's TimeZone. Pin only these protected calls to UTC, including the insert's
-- CHECK evaluation. This restores the caller's setting on return and does not
-- alter the original capture body, freshness window, privileges or global timezone.
alter function campaign.financing_release_capture_private(text,uuid,text,text,uuid,timestamptz,timestamptz) set TimeZone='UTC';
revoke all on function campaign.financing_release_capture_private(text,uuid,text,text,uuid,timestamptz,timestamptz) from public,app_runtime,financing_public_runtime;
create function campaign.financing_release_capture(wanted_release text,wanted_request uuid,wanted_hash text,wanted_cipher text,wanted_inquiry uuid,wanted_accepted timestamptz,wanted_expiry timestamptz)
returns jsonb language plpgsql security definer set search_path='' set TimeZone='UTC' as $f$
declare scope jsonb; admitted campaign.financing_public_inquiry_admissions; receipt jsonb;
begin
 if current_setting('role',true)='financing_public_runtime' then
  scope:=campaign.financing_release_public_scope();
  if wanted_release is distinct from scope->>'releaseRef' then
   raise exception using errcode='P0001',message='Financing capture ineligible';
  end if;
  select * into admitted from campaign.financing_public_inquiry_admissions
   where location_id=(scope->>'locationId')::uuid and publication_id=(scope->>'publicationId')::uuid
    and release_ref=wanted_release and request_id=wanted_request for update;
  if not found then raise exception using errcode='42501',message='Public inquiry admission unavailable'; end if;
  if admitted.content_hash is not null and admitted.content_hash is distinct from wanted_hash then
   raise exception using errcode='P0002',message='Financing inquiry conflict';
  end if;
 end if;
 -- The original body independently rechecks current scope, source, expiry and removed-request tombstones.
 receipt:=campaign.financing_release_capture_private(wanted_release,wanted_request,wanted_hash,wanted_cipher,wanted_inquiry,wanted_accepted,wanted_expiry);
 if current_setting('role',true)='financing_public_runtime' then
  update campaign.financing_public_inquiry_admissions set consumed_at=coalesce(consumed_at,clock_timestamp()),content_hash=wanted_hash
   where location_id=admitted.location_id and publication_id=admitted.publication_id and request_id=admitted.request_id;
 end if;
 return receipt;
end $f$;
revoke all on function campaign.financing_release_capture(text,uuid,text,text,uuid,timestamptz,timestamptz) from public;
grant execute on function campaign.financing_release_capture(text,uuid,text,text,uuid,timestamptz,timestamptz) to app_runtime,financing_public_runtime;
reset role;
