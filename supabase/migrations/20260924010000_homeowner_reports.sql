-- PRD-007. Additive tables; existing data and grants are preserved.
begin;
create schema homeowner authorization migration_owner;
set local role migration_owner;
revoke all on schema homeowner from public;
grant usage on schema homeowner to app_runtime, scheduler_runtime, migration_owner;

create function homeowner.allowed(requested_location uuid, write_required boolean)
returns boolean language sql stable security definer set search_path = '' as $function$
  select platform.tenant_matches(requested_location) and exists (
    select 1 from platform.role_bindings binding
    join platform.app_users actor on actor.id = binding.user_id and actor.status = 'active'
    join platform.locations location on location.id = binding.location_id and location.status = 'active'
    where binding.location_id = requested_location and binding.user_id = platform.current_actor_id()
      and binding.revoked_at is null
      and binding.role = any(case when write_required then array['location_admin','creator'] else array['location_admin','creator','approver','publisher','analyst'] end)
  )
$function$;
revoke all on function homeowner.allowed(uuid, boolean) from public;
grant execute on function homeowner.allowed(uuid, boolean) to app_runtime;

create table homeowner.properties (
  id text not null check (id ~ '^home_[a-f0-9]{32}$'),
  location_id uuid not null references platform.locations(id) on delete restrict,
  created_by uuid not null references platform.app_users(id) on delete restrict,
  contact_id text not null check (contact_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  contact_name text not null check (length(contact_name) between 2 and 160),
  address jsonb not null check (jsonb_typeof(address) = 'object'),
  address_hash text not null check (address_hash ~ '^[a-f0-9]{64}$'),
  communication_basis text not null check (communication_basis in ('requested_report','existing_relationship')),
  cadence text not null default 'off' check (cadence in ('off','monthly')),
  paused boolean not null default false,
  deliver_updates boolean not null default false,
  next_refresh_at timestamptz,
  lease_until timestamptz,
  review_requested_at timestamptz,
  last_error text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(location_id, id),
  unique(location_id, contact_id, address_hash),
  check (last_error is null or length(last_error) <= 300)
);
create index homeowner_properties_actor_idx on homeowner.properties(created_by);
create index homeowner_properties_due_idx on homeowner.properties(next_refresh_at) where cadence = 'monthly' and not paused and revoked_at is null;

create table homeowner.reports (
  id text not null check (id ~ '^hreport_[a-f0-9]{32}$'),
  location_id uuid not null,
  property_id text not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  valuation_at timestamptz not null,
  created_by uuid not null references platform.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(location_id, id),
  foreign key(location_id, property_id) references homeowner.properties(location_id,id) on delete cascade,
  check (snapshot->>'id' = id and snapshot->>'propertyId' = property_id),
  check (octet_length(snapshot::text) <= 100000)
);
create index homeowner_reports_property_idx on homeowner.reports(location_id,property_id,created_at desc);
create index homeowner_reports_actor_idx on homeowner.reports(created_by);

create table homeowner.lookup_requests (
  location_id uuid not null,
  request_id uuid not null,
  property_id text not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('pending','ready','failed','uncertain')),
  report_id text,
  attempted boolean not null default false,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(location_id,request_id),
  foreign key(location_id,property_id) references homeowner.properties(location_id,id) on delete cascade,
  foreign key(location_id,report_id) references homeowner.reports(location_id,id) on delete set null (report_id)
);
create index homeowner_requests_property_idx on homeowner.lookup_requests(location_id,property_id,created_at desc);
create index homeowner_requests_report_idx on homeowner.lookup_requests(location_id,report_id);
create index homeowner_usage_month_idx on homeowner.lookup_requests(location_id,created_at) where attempted;

-- Keep minimal usage evidence when a homeowner asks to remove their property data.
create table homeowner.usage_events (
  location_id uuid not null references platform.locations(id) on delete restrict,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(location_id,request_id)
);
create index homeowner_usage_events_month_idx on homeowner.usage_events(location_id,created_at);

create table homeowner.shares (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  report_id text not null,
  secret_hash text not null unique check (secret_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid not null references platform.app_users(id) on delete restrict,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(location_id,report_id) references homeowner.reports(location_id,id) on delete cascade,
  check (expires_at > created_at and expires_at <= created_at + interval '35 days')
);
create index homeowner_shares_report_idx on homeowner.shares(location_id,report_id);
create index homeowner_shares_actor_idx on homeowner.shares(created_by);

create table homeowner.events (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  report_id text not null,
  event_kind text not null check (event_kind in ('viewed','review_requested','review_resolved')),
  event_key uuid not null,
  created_at timestamptz not null default now(),
  foreign key(location_id,report_id) references homeowner.reports(location_id,id) on delete cascade,
  unique(location_id,report_id,event_kind,event_key)
);
create index homeowner_events_report_idx on homeowner.events(location_id,report_id,created_at desc);
create unique index homeowner_review_once_idx on homeowner.events(location_id,report_id) where event_kind='review_requested';
create unique index homeowner_view_once_idx on homeowner.events(location_id,report_id) where event_kind='viewed';

create table homeowner.deliveries (
  location_id uuid not null,
  report_id text not null,
  contact_id text not null,
  status text not null check (status in ('pending','sent','blocked','uncertain')),
  share_id uuid references homeowner.shares(id) on delete set null,
  detail_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(location_id,report_id),
  foreign key(location_id,report_id) references homeowner.reports(location_id,id) on delete cascade
);
create index homeowner_deliveries_share_idx on homeowner.deliveries(share_id);
create unique index homeowner_delivery_contact_lease_idx on homeowner.deliveries(location_id,contact_id) where status in ('pending','uncertain');

do $block$
declare table_name text;
begin
  foreach table_name in array array['properties','reports','lookup_requests','shares','events','deliveries','usage_events'] loop
    execute format('alter table homeowner.%I enable row level security', table_name);
    execute format('alter table homeowner.%I force row level security', table_name);
    execute format('create policy read_tenant on homeowner.%I for select to app_runtime using (homeowner.allowed(location_id,false))',table_name);
    execute format('create policy write_tenant on homeowner.%I for all to app_runtime using (homeowner.allowed(location_id,true)) with check (homeowner.allowed(location_id,true))',table_name);
    execute format('create policy migration_access on homeowner.%I for all to migration_owner using (true) with check (true)',table_name);
  end loop;
end
$block$;
grant select,insert,update,delete on homeowner.properties to app_runtime;
grant select,insert on homeowner.reports, homeowner.events to app_runtime;
grant select,insert on homeowner.usage_events to app_runtime;
grant select,insert,update on homeowner.lookup_requests, homeowner.shares, homeowner.deliveries to app_runtime;
grant all on all tables in schema homeowner to migration_owner;

-- Public-link entry points reveal only one expressly shared snapshot and recheck current authority.
create function homeowner.read_shared_report(wanted_hash text)
returns jsonb language sql stable security definer set search_path = '' as $function$
  select jsonb_set(report.snapshot,'{input,contactId}','"shared"'::jsonb) from homeowner.shares share
  join homeowner.reports report on report.location_id=share.location_id and report.id=share.report_id
  join homeowner.properties property on property.location_id=report.location_id and property.id=report.property_id
  join platform.locations location on location.id=share.location_id and location.status='active'
  join platform.app_users actor on actor.id=share.created_by and actor.status='active'
  where share.secret_hash=wanted_hash and share.revoked_at is null and share.expires_at>now()
    and property.revoked_at is null and report.valuation_at>now()-interval '35 days'
    and (report.snapshot #>> '{input,mortgage,source}'='unknown' or (report.snapshot #>> '{input,mortgage,asOf}')::date >= current_date-35)
    and exists(select 1 from platform.role_bindings binding where binding.location_id=share.location_id and binding.user_id=share.created_by and binding.revoked_at is null and binding.role in ('location_admin','creator'))
  limit 1
$function$;
create function homeowner.record_shared_event(wanted_hash text, wanted_kind text, wanted_key uuid)
returns boolean language plpgsql security definer set search_path = '' as $function$
declare shared jsonb; share_location uuid; inserted_count integer;
begin
  if wanted_kind not in ('viewed','review_requested') then return false; end if;
  shared := homeowner.read_shared_report(wanted_hash);
  if shared is null then return false; end if;
  select location_id into share_location from homeowner.shares where secret_hash=wanted_hash;
  insert into homeowner.events(location_id,report_id,event_kind,event_key) values(share_location,shared->>'id',wanted_kind,wanted_key) on conflict do nothing;
  get diagnostics inserted_count = row_count;
  if wanted_kind='review_requested' and inserted_count=1 then
    update homeowner.properties set review_requested_at=now(),updated_at=now() where location_id=share_location and id=shared->>'propertyId';
  end if;
  return true;
end
$function$;
revoke all on function homeowner.read_shared_report(text), homeowner.record_shared_event(text,text,uuid) from public;
grant execute on function homeowner.read_shared_report(text), homeowner.record_shared_event(text,text,uuid) to app_runtime;

create function homeowner.claim_due_properties(batch_size integer)
returns table(location_id uuid,property_id text,actor_id uuid)
language sql volatile security definer set search_path = '' as $function$
  with due as (
    select property.location_id,property.id from homeowner.properties property
    join platform.locations location on location.id=property.location_id and location.status='active'
    join platform.app_users actor on actor.id=property.created_by and actor.status='active'
    where property.cadence='monthly' and not property.paused and property.revoked_at is null and property.next_refresh_at<=now()
      and (property.lease_until is null or property.lease_until<now())
      and exists(select 1 from platform.role_bindings binding where binding.location_id=property.location_id and binding.user_id=property.created_by and binding.revoked_at is null and binding.role in ('location_admin','creator'))
    order by property.next_refresh_at limit least(greatest(batch_size,1),10) for update of property skip locked
  )
  update homeowner.properties property set lease_until=now()+interval '5 minutes'
  from due where property.location_id=due.location_id and property.id=due.id
  returning property.location_id,property.id,property.created_by
$function$;
revoke all on function homeowner.claim_due_properties(integer) from public;
grant execute on function homeowner.claim_due_properties(integer) to scheduler_runtime;
commit;
