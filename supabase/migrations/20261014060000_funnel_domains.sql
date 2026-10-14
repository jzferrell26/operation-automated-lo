-- PG17 additive migration: new table/index locks only, no existing rows rewritten.
-- Roll forward. Disable domain traffic and disconnect claims rather than deleting owner history.
set role migration_owner;
create table campaign.funnel_domains (
 id uuid primary key,
 location_id uuid not null references platform.locations(id) on delete restrict,
 user_id uuid not null references platform.app_users(id) on delete restrict,
 hostname text not null check(length(hostname) between 4 and 253 and hostname ~ '^[a-z0-9.-]+$'),
 revision uuid not null,
 claimed boolean not null default false,
 ownership_until timestamptz,
 disconnected boolean not null default false,
 record jsonb not null check(jsonb_typeof(record)='object' and octet_length(record::text)<20000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((record->>'id'=id::text and record->>'hostname'=hostname and record->>'revision'=revision::text and (record->>'claimed')::boolean=claimed) is true)
);
create index funnel_domains_user_idx on campaign.funnel_domains(user_id);
create index funnel_domains_owner_idx on campaign.funnel_domains(location_id,user_id);
create unique index funnel_domains_one_owner_idx on campaign.funnel_domains(location_id,user_id) where not disconnected;
create unique index funnel_domains_claim_idx on campaign.funnel_domains(hostname) where claimed;
create index funnel_domains_recheck_idx on campaign.funnel_domains(ownership_until) where claimed;
alter table campaign.funnel_domains enable row level security;
alter table campaign.funnel_domains force row level security;
create policy funnel_domains_migration on campaign.funnel_domains for all to migration_owner using(true) with check(true);
create policy funnel_domains_owner on campaign.funnel_domains for select to app_runtime
 using(platform.tenant_matches(location_id) and user_id=platform.current_actor_id());
grant select on campaign.funnel_domains to app_runtime;

-- Only server code invokes this contract after verified principal and browser mutation checks.
-- CAS is repeated after network checks so an in-flight check cannot undo disconnect.
create function campaign.funnel_domain_command(action text, wanted_id uuid, expected uuid, candidate jsonb)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare item campaign.funnel_domains%rowtype; next_revision uuid; host text;
begin
 if not exists(select 1 from platform.locations l join platform.role_bindings b on b.location_id=l.id
 join platform.app_users u on u.id=b.user_id where l.id=platform.current_location_id() and l.status='active'
 and u.id=platform.current_actor_id() and u.status='active' and b.revoked_at is null and b.role in ('location_admin','creator')) then
 raise exception 'Domain owner required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('domain-owner:'||platform.current_location_id()::text||':'||platform.current_actor_id()::text,0));
 if action='connect' then
  select * into item from campaign.funnel_domains where location_id=platform.current_location_id() and user_id=platform.current_actor_id() and not disconnected;
  if found then
   if item.hostname=candidate->>'hostname' then return item.record; end if;
   raise exception 'Disconnect the current domain first' using errcode='40001';
  end if;
  if candidate->>'status'<>'ownership_needed' or (candidate->>'claimed')::boolean is distinct from false
   or candidate->>'challenge' !~ '^[a-f0-9]{64}$' or (candidate->>'challengeExpiresAt')::timestamptz<=now()
   or (candidate->>'challengeExpiresAt')::timestamptz>now()+interval '73 hours' then raise exception 'Invalid domain claim'; end if;
  insert into campaign.funnel_domains(id,location_id,user_id,hostname,revision,record)
   values(wanted_id,platform.current_location_id(),platform.current_actor_id(),candidate->>'hostname',(candidate->>'revision')::uuid,candidate) returning * into item;
  return item.record;
 end if;
 select * into item from campaign.funnel_domains where id=wanted_id and location_id=platform.current_location_id() and user_id=platform.current_actor_id() for update;
 if not found then return null; end if;
 if action='disconnect' and item.disconnected then return item.record; end if;
 if item.revision<>expected or item.disconnected then raise exception 'Stale domain revision' using errcode='40001'; end if;
 next_revision=gen_random_uuid();
 if action='disconnect' then
  update campaign.funnel_domains set disconnected=true,claimed=false,ownership_until=null,revision=next_revision,updated_at=now(),
   record=record||jsonb_build_object('revision',next_revision,'status','disconnected','claimed',false,'readyUntil',null,'nextCheckAt',null) where id=item.id returning * into item;
 elsif action='reserve' then
  if (item.record->>'checkedAt')::timestamptz>now()-interval '30 seconds' then raise exception 'Domain check cooldown' using errcode='40001'; end if;
  if (item.record->>'challengeExpiresAt')::timestamptz<=now() then raise exception 'Domain challenge expired' using errcode='40001'; end if;
  update campaign.funnel_domains set revision=next_revision,updated_at=now(),record=record||jsonb_build_object('revision',next_revision,'status','attention','checkedAt',now(),'readyUntil',null,'nextCheckAt',now()+interval '30 seconds') where id=item.id returning * into item;
 elsif action='claim' then
  host=item.hostname;
  perform pg_advisory_xact_lock(hashtextextended('domain-host:'||host,0));
  update campaign.funnel_domains set claimed=false,revision=next_revision,updated_at=now(),record=record||jsonb_build_object('claimed',false,'revision',next_revision,'status','attention','readyUntil',null)
   where hostname=host and claimed and ownership_until<=now() and id<>item.id;
  if exists(select 1 from campaign.funnel_domains where hostname=host and claimed and id<>item.id) then raise exception 'Domain already has an owner' using errcode='40001'; end if;
  update campaign.funnel_domains set claimed=true,ownership_until=now()+interval '72 hours',revision=next_revision,updated_at=now(),record=record||jsonb_build_object('claimed',true,'revision',next_revision,'challengeExpiresAt',now()+interval '72 hours') where id=item.id returning * into item;
 elsif action='finish' then
  if candidate->>'status' not in ('ownership_needed','hosting_needed','dns_needed','certificate_needed','ready','attention') or jsonb_typeof(candidate->'records')<>'array' or jsonb_array_length(candidate->'records')>12 then raise exception 'Invalid domain result'; end if;
  if candidate->>'status'='ready' and (not item.claimed or item.ownership_until<=now()) then raise exception 'Current ownership required'; end if;
  update campaign.funnel_domains set revision=next_revision,updated_at=now(),
   claimed=case when candidate->>'status'='ownership_needed' then false else claimed end,
   record=record||jsonb_build_object('revision',next_revision,'status',candidate->>'status','records',candidate->'records',
    'claimed',case when candidate->>'status'='ownership_needed' then false else claimed end,
    'readyUntil',case when candidate->>'status'='ready' then ownership_until else null end,
    'nextCheckAt',case when candidate->>'status'='ready' then now()+interval '24 hours' else now()+interval '30 seconds' end)
   where id=item.id returning * into item;
 else raise exception 'Unknown domain action'; end if;
 return item.record;
end $f$;

-- No caller-selected tenant is accepted by the public capabilities. Locks serialize disconnect
-- against inquiry acceptance, and the immutable publication owner must match the exact host owner.
create function campaign.funnel_domain_binding(wanted_host text)
returns jsonb language sql stable security definer set search_path='' as $f$
 select jsonb_build_object('id',d.id,'locationId',d.location_id,'userId',d.user_id,'hostname',d.hostname,'revision',d.revision,'defaultKind',d.record->>'defaultKind')
 from campaign.funnel_domains d join platform.locations l on l.id=d.location_id and l.status='active'
 join platform.app_users u on u.id=d.user_id and u.status='active'
 where d.hostname=wanted_host and d.claimed and not d.disconnected and d.ownership_until>now()
 and d.record->>'status'='ready' and (d.record->>'readyUntil')::timestamptz>now()
 and exists(select 1 from platform.role_bindings b where b.location_id=d.location_id and b.user_id=d.user_id and b.revoked_at is null and b.role in ('location_admin','creator'))
$f$;
create function campaign.funnel_domain_snapshot(wanted_host text,wanted_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $f$
declare binding jsonb;
begin
 binding=campaign.funnel_domain_binding(wanted_host);
 if binding is null or not exists(select 1 from campaign.funnel_publications p where p.id=wanted_id and p.location_id=(binding->>'locationId')::uuid and p.user_id=(binding->>'userId')::uuid) then return null; end if;
 return campaign.funnel_public_snapshot(wanted_id);
end $f$;
create function campaign.funnel_domain_accept(wanted_host text,wanted_id uuid,wanted_request uuid,wanted_hash text,wanted_receipt text,wanted_ip text,wanted_consent text,wanted_cipher text)
returns jsonb language plpgsql security definer set search_path='' as $f$
begin
 perform 1 from campaign.funnel_domains where hostname=wanted_host and claimed for share;
 if campaign.funnel_domain_snapshot(wanted_host,wanted_id) is null then return jsonb_build_object('status','unavailable'); end if;
 return campaign.funnel_accept_inquiry(wanted_id,wanted_request,wanted_hash,wanted_receipt,wanted_ip,wanted_consent,wanted_cipher);
end $f$;
revoke all on function campaign.funnel_domain_command(text,uuid,uuid,jsonb),campaign.funnel_domain_binding(text),campaign.funnel_domain_snapshot(text,uuid),campaign.funnel_domain_accept(text,uuid,uuid,text,text,text,text,text) from public;
grant execute on function campaign.funnel_domain_command(text,uuid,uuid,jsonb),campaign.funnel_domain_binding(text),campaign.funnel_domain_snapshot(text,uuid),campaign.funnel_domain_accept(text,uuid,uuid,text,text,text,text,text) to app_runtime;
reset role;
