-- Approved funnel snapshots and encrypted, consented inquiries. Private drafts stay private.
set role migration_owner;
create table campaign.funnel_publications (
  id uuid primary key,
  location_id uuid not null references platform.locations(id) on delete restrict,
  user_id uuid not null references platform.app_users(id) on delete restrict,
  kind text not null check(kind in ('live-webinar','on-demand','buyer','refinance','lead-magnet')),
  source_revision uuid not null,
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=950000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique(location_id,user_id,kind,source_revision),
  check((snapshot->>'kind'=kind) is true),
  check(expires_at>created_at and expires_at<=created_at+interval '91 days')
);
create index funnel_publications_owner_idx on campaign.funnel_publications(location_id,user_id);
create index funnel_publications_user_idx on campaign.funnel_publications(user_id);
alter table campaign.funnel_publications enable row level security;
alter table campaign.funnel_publications force row level security;
create policy funnel_publications_migration on campaign.funnel_publications for all to migration_owner using(true) with check(true);
create policy funnel_publications_owner on campaign.funnel_publications for all to app_runtime
 using(platform.tenant_matches(location_id) and user_id=platform.current_actor_id())
 with check(platform.tenant_matches(location_id) and user_id=platform.current_actor_id());
grant select,insert on campaign.funnel_publications to app_runtime;
grant update(active) on campaign.funnel_publications to app_runtime;

create table campaign.funnel_inquiries (
  publication_id uuid not null references campaign.funnel_publications(id) on delete restrict,
  request_id uuid not null,
  location_id uuid not null references platform.locations(id) on delete restrict,
  user_id uuid not null references platform.app_users(id) on delete restrict,
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  receipt_hash text not null check(receipt_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text not null check(ip_hash ~ '^[a-f0-9]{64}$'),
  consent_hash text not null check(consent_hash ~ '^[a-f0-9]{64}$'),
  payload_cipher text not null check(length(payload_cipher) between 40 and 12000),
  delivery_status text not null default 'pending' check(delivery_status in ('pending','sending','delivered','uncertain')),
  provider_id text check(provider_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '30 days',
  primary key(publication_id,request_id)
);
comment on column campaign.funnel_inquiries.payload_cipher is 'PII: AES-256-GCM encrypted contact request; key stays server-only, never in this table.';
create index funnel_inquiries_owner_idx on campaign.funnel_inquiries(location_id,user_id,created_at desc);
create index funnel_inquiries_user_idx on campaign.funnel_inquiries(user_id);
create index funnel_inquiries_receipt_idx on campaign.funnel_inquiries(publication_id,receipt_hash);
create index funnel_inquiries_abuse_idx on campaign.funnel_inquiries(publication_id,ip_hash,created_at);
create index funnel_inquiries_expiry_idx on campaign.funnel_inquiries(expires_at);
alter table campaign.funnel_inquiries enable row level security;
alter table campaign.funnel_inquiries force row level security;
create policy funnel_inquiries_migration on campaign.funnel_inquiries for all to migration_owner using(true) with check(true);
create policy funnel_inquiries_owner on campaign.funnel_inquiries for select to app_runtime
 using(platform.tenant_matches(location_id) and user_id=platform.current_actor_id());
grant select on campaign.funnel_inquiries to app_runtime;

create function campaign.funnel_public_snapshot(wanted_id uuid)
returns jsonb language sql stable security definer set search_path='' as $f$
 select jsonb_build_object('id',p.id,'snapshot',p.snapshot,'active',p.active,
  'sourceRevision',p.source_revision,'createdAt',p.created_at,'expiresAt',p.expires_at)
 from campaign.funnel_publications p
 join platform.locations l on l.id=p.location_id and l.status='active'
 join platform.app_users a on a.id=p.user_id and a.status='active'
 where p.id=wanted_id and p.active and p.expires_at>now()
 and exists(select 1 from platform.role_bindings b where b.location_id=p.location_id and b.user_id=p.user_id and b.revoked_at is null and b.role in ('location_admin','creator'))
 limit 1
$f$;

create function campaign.funnel_accept_inquiry(wanted_id uuid,wanted_request uuid,wanted_hash text,wanted_receipt text,wanted_ip text,wanted_consent text,wanted_cipher text)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare publication campaign.funnel_publications%rowtype; previous campaign.funnel_inquiries%rowtype;
begin
 if campaign.funnel_public_snapshot(wanted_id) is null then return jsonb_build_object('status','unavailable'); end if;
 if wanted_hash !~ '^[a-f0-9]{64}$' or wanted_receipt !~ '^[a-f0-9]{64}$' or wanted_ip !~ '^[a-f0-9]{64}$' or wanted_consent !~ '^[a-f0-9]{64}$' or length(wanted_cipher) not between 40 and 12000 then return jsonb_build_object('status','invalid'); end if;
 perform pg_advisory_xact_lock(hashtextextended('funnel-public:'||wanted_id::text,0));
 select * into publication from campaign.funnel_publications where id=wanted_id and active and expires_at>now();
 if not found then return jsonb_build_object('status','unavailable'); end if;
 select * into previous from campaign.funnel_inquiries where publication_id=wanted_id and request_id=wanted_request;
 if found then
  if previous.request_hash<>wanted_hash or previous.receipt_hash<>wanted_receipt then return jsonb_build_object('status','conflict'); end if;
  return jsonb_build_object('status','accepted','delivery',previous.delivery_status);
 end if;
 if (select count(*) from campaign.funnel_inquiries where publication_id=wanted_id and ip_hash=wanted_ip and created_at>now()-interval '10 minutes')>=20 or
    (select count(*) from campaign.funnel_inquiries where publication_id=wanted_id and created_at>now()-interval '1 day')>=5000 then return jsonb_build_object('status','limited'); end if;
 insert into campaign.funnel_inquiries(publication_id,request_id,location_id,user_id,request_hash,receipt_hash,ip_hash,consent_hash,payload_cipher)
 values(wanted_id,wanted_request,publication.location_id,publication.user_id,wanted_hash,wanted_receipt,wanted_ip,wanted_consent,wanted_cipher);
 return jsonb_build_object('status','accepted','delivery','pending');
end
$f$;

create function campaign.funnel_receipt_valid(wanted_id uuid,wanted_receipt text)
returns boolean language sql stable security definer set search_path='' as $f$
 select campaign.funnel_public_snapshot(wanted_id) is not null and exists(
 select 1 from campaign.funnel_inquiries where publication_id=wanted_id and receipt_hash=wanted_receipt and expires_at>now())
$f$;

-- A receipt capability can claim only its own new delivery; uncertain sends are never auto-retried.
create function campaign.funnel_claim_delivery(wanted_id uuid,wanted_request uuid,wanted_receipt text)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare item campaign.funnel_inquiries%rowtype; linked_location text;
begin
 if not campaign.funnel_receipt_valid(wanted_id,wanted_receipt) then return null; end if;
 update campaign.funnel_inquiries set delivery_status='sending'
 where publication_id=wanted_id and request_id=wanted_request and receipt_hash=wanted_receipt and delivery_status='pending'
 returning * into item;
 if not found then return null; end if;
 select ghl_location_id into linked_location from platform.locations where id=item.location_id;
 return jsonb_build_object('locationId',item.location_id,'ghlLocationId',linked_location,'cipher',item.payload_cipher);
end
$f$;
create function campaign.funnel_finish_delivery(wanted_id uuid,wanted_request uuid,wanted_receipt text,wanted_status text,wanted_provider text)
returns boolean language plpgsql security definer set search_path='' as $f$
declare changed integer;
begin
 if wanted_status not in ('delivered','uncertain','pending') or (wanted_provider is not null and wanted_provider !~ '^[A-Za-z0-9_-]{1,100}$') then return false; end if;
 update campaign.funnel_inquiries set delivery_status=wanted_status,provider_id=wanted_provider
 where publication_id=wanted_id and request_id=wanted_request and receipt_hash=wanted_receipt and delivery_status='sending';
 get diagnostics changed=row_count;
 return changed=1;
end
$f$;

revoke all on function campaign.funnel_public_snapshot(uuid),campaign.funnel_accept_inquiry(uuid,uuid,text,text,text,text,text),campaign.funnel_receipt_valid(uuid,text),campaign.funnel_claim_delivery(uuid,uuid,text),campaign.funnel_finish_delivery(uuid,uuid,text,text,text) from public;
grant execute on function campaign.funnel_public_snapshot(uuid),campaign.funnel_accept_inquiry(uuid,uuid,text,text,text,text,text),campaign.funnel_receipt_valid(uuid,text),campaign.funnel_claim_delivery(uuid,uuid,text),campaign.funnel_finish_delivery(uuid,uuid,text,text,text) to app_runtime;
reset role;
