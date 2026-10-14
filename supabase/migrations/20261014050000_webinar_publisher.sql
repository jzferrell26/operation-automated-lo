-- CTR-003 revision 1, PostgreSQL 17. Expand only, no existing-row rewrite.
-- CREATE TABLE/INDEX: ACCESS EXCLUSIVE/SHARE on new empty tables only.
-- FKs take SHARE ROW EXCLUSIVE briefly on referenced tables; lock_timeout bounds waits.
-- Functions and role grants take catalog locks. Roll forward after any durable use.
-- Admission role is NOLOGIN and is NOT granted to any runtime/login by this migration.
set role migration_owner;
set lock_timeout = '5s';

create table campaign.webinar_publisher_admissions (
 location_id uuid not null references platform.locations(id) on delete restrict,
 admission_ref text not null,
 actor_id uuid not null references platform.app_users(id) on delete restrict,
 installation_id uuid not null references platform.marketplace_installations(id) on delete restrict,
 kind text not null check(kind in ('selection','qualification','pause','observation')),
 artifact_hash text not null check(artifact_hash ~ '^[a-f0-9]{64}$'),
 verifier_ref text not null check(length(verifier_ref) between 8 and 128),
 normalized jsonb not null check(jsonb_typeof(normalized)='object'),
 observed_at timestamptz not null,
 expires_at timestamptz not null check(expires_at>observed_at),
 revoked_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 primary key(location_id,admission_ref)
);
create index webinar_publisher_admissions_actor_idx on campaign.webinar_publisher_admissions(actor_id);
create index webinar_publisher_admissions_installation_idx on campaign.webinar_publisher_admissions(installation_id);
create index webinar_publisher_admissions_lookup_idx on campaign.webinar_publisher_admissions(location_id,actor_id,kind,expires_at);

create table campaign.webinar_publisher_launches (
 location_id uuid not null references platform.locations(id) on delete restrict,
 projection_ref text not null,
 actor_id uuid not null references platform.app_users(id) on delete restrict,
 installation_id uuid not null references platform.marketplace_installations(id) on delete restrict,
 campaign_ref text not null,
 summary jsonb not null check(jsonb_typeof(summary)='object'),
 projection_hash text not null check(projection_hash ~ '^[a-f0-9]{64}$'),
 summary_hash text not null check(summary_hash ~ '^[a-f0-9]{64}$'),
 row_version bigint not null default 1 check(row_version>0 and row_version<=9007199254740991),
 state text not null default 'reserved' check(state in ('reserved','drafting','draft_ready','publish_queued','publishing','in_review','live','pause_pending','paused','resume_pending','cancelled','blocked','failed','uncertain')),
 native_ids jsonb not null default '{"campaignId":null,"adsetId":null,"adId":null}'::jsonb,
 cancellation_generation bigint not null default 0 check(cancellation_generation>=0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(location_id,projection_ref)
);
create index webinar_publisher_launches_actor_idx on campaign.webinar_publisher_launches(actor_id);
create index webinar_publisher_launches_installation_idx on campaign.webinar_publisher_launches(installation_id);
create index webinar_publisher_launches_campaign_idx on campaign.webinar_publisher_launches(location_id,campaign_ref);

create table campaign.webinar_publisher_operations (
 location_id uuid not null,
 operation_ref text not null,
 projection_ref text not null,
 actor_id uuid not null references platform.app_users(id) on delete restrict,
 request_id uuid not null,
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 operation jsonb not null check(jsonb_typeof(operation)='object'),
 action text not null check(action in ('draft','publish','pause','resume','cancel')),
 stage text not null default 'queued' check(stage in ('queued','campaign','adset','ad','parity','publish','progress','pause','resume','reconcile','complete')),
 active boolean not null default true,
 worker_ref text,
 lease_generation bigint not null default 0 check(lease_generation>=0),
 lease_expires_at timestamptz,
 deadline_at timestamptz not null default clock_timestamp()+interval '15 minutes',
 cancellation_generation bigint not null,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(location_id,operation_ref),
 unique(location_id,actor_id,request_id),
 foreign key(location_id,projection_ref) references campaign.webinar_publisher_launches(location_id,projection_ref) on delete restrict
);
create index webinar_publisher_operations_actor_idx on campaign.webinar_publisher_operations(actor_id);
create index webinar_publisher_operations_projection_idx on campaign.webinar_publisher_operations(location_id,projection_ref);
create unique index webinar_publisher_one_active_idx on campaign.webinar_publisher_operations(location_id,projection_ref) where active;

create table integration.webinar_publisher_outbox (
 location_id uuid not null,
 operation_ref text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 processed_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 primary key(location_id,operation_ref),
 foreign key(location_id,operation_ref) references campaign.webinar_publisher_operations(location_id,operation_ref) on delete restrict
);
create index webinar_publisher_outbox_pending_idx on integration.webinar_publisher_outbox(created_at) where processed_at is null;

create table campaign.webinar_publisher_attempts (
 location_id uuid not null,
 operation_ref text not null,
 stage text not null,
 generation bigint not null check(generation>0),
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 status text not null check(status in ('dispatching','confirmed','uncertain')),
 read_back_hash text check(read_back_hash ~ '^[a-f0-9]{64}$'),
 provider_observed_at timestamptz,
 started_at timestamptz not null default clock_timestamp(),
 primary key(location_id,operation_ref,stage),
 foreign key(location_id,operation_ref) references campaign.webinar_publisher_operations(location_id,operation_ref) on delete restrict
);

-- Entire payloads are read as immutable historical snapshots; hot predicates are columns.
create function campaign.webinar_publisher_immutable() returns trigger
language plpgsql set search_path='' as $f$
begin
 if tg_table_name='webinar_publisher_admissions' then
  if (new.location_id,new.admission_ref,new.actor_id,new.installation_id,new.kind,new.artifact_hash,new.verifier_ref,new.normalized,new.observed_at)
   is distinct from (old.location_id,old.admission_ref,old.actor_id,old.installation_id,old.kind,old.artifact_hash,old.verifier_ref,old.normalized,old.observed_at)
   or new.expires_at>old.expires_at then raise exception 'PUBLISHER_IMMUTABLE'; end if;
  return new;
 end if;
 if tg_table_name='webinar_publisher_launches' then
  if (new.location_id,new.projection_ref,new.summary,new.projection_hash,new.summary_hash,new.actor_id,new.installation_id,new.campaign_ref)
  is distinct from (old.location_id,old.projection_ref,old.summary,old.projection_hash,old.summary_hash,old.actor_id,old.installation_id,old.campaign_ref)
  then raise exception 'PUBLISHER_IMMUTABLE'; end if;
 end if;
 if tg_table_name='webinar_publisher_operations' then
  if ((new.location_id,new.operation_ref,new.request_id,new.request_hash,new.actor_id,new.action,new.projection_ref,new.deadline_at)
  is distinct from (old.location_id,old.operation_ref,old.request_id,old.request_hash,old.actor_id,old.action,old.projection_ref,old.deadline_at)
  or (new.operation-array['state','stage','leaseGeneration','providerObservedAt','lastSafeFailure'])
   is distinct from (old.operation-array['state','stage','leaseGeneration','providerObservedAt','lastSafeFailure']))
  then raise exception 'PUBLISHER_IMMUTABLE'; end if;
 end if;
 new.updated_at=clock_timestamp(); return new;
end $f$;
create trigger webinar_publisher_launches_immutable before update on campaign.webinar_publisher_launches for each row execute function campaign.webinar_publisher_immutable();
create trigger webinar_publisher_operations_immutable before update on campaign.webinar_publisher_operations for each row execute function campaign.webinar_publisher_immutable();
create trigger webinar_publisher_admissions_immutable before update on campaign.webinar_publisher_admissions for each row execute function campaign.webinar_publisher_immutable();

do $rls$
declare t text; s text;
begin
 foreach t in array array['webinar_publisher_admissions','webinar_publisher_launches','webinar_publisher_operations','webinar_publisher_outbox','webinar_publisher_attempts'] loop
  s=case when t='webinar_publisher_outbox' then 'integration' else 'campaign' end;
  execute format('alter table %I.%I enable row level security',s,t);
  execute format('alter table %I.%I force row level security',s,t);
  execute format('create policy publisher_owner on %I.%I for all to migration_owner using(true) with check(true)',s,t);
  execute format('revoke all on %I.%I from public,app_runtime,support_runtime',s,t);
 end loop;
end $rls$;

-- Locks survive to COMMIT. First-party identity is checked in DB; embedded signature
-- and current signed session are additionally checked by the server authority adapter.
create function campaign.webinar_publisher_authorize(identity jsonb) returns void
language plpgsql security definer set search_path='' as $f$
declare role_row platform.role_bindings; installation_row platform.marketplace_installations; session_row platform.first_party_sessions;
begin
 if (identity->>'role'='location_admin' and identity->>'mode' in ('first_party','embedded')
  and platform.current_actor_type()='user') is not true then raise exception 'PUBLISHER_AUTHORITY_WITHDRAWN'; end if;
 perform 1 from platform.locations where id=platform.current_location_id() and status='active' for share;
 if not found then raise exception 'PUBLISHER_AUTHORITY_WITHDRAWN'; end if;
 perform 1 from platform.app_users where id=platform.current_actor_id() and status='active' for share;
 if not found then raise exception 'PUBLISHER_AUTHORITY_WITHDRAWN'; end if;
 select * into role_row from platform.role_bindings where location_id=platform.current_location_id()
  and user_id=platform.current_actor_id() and role='location_admin' and revoked_at is null for share;
 if not found or (extract(epoch from role_row.granted_at)*1000000)::bigint is distinct from (identity->>'roleVersion')::bigint
 then raise exception 'PUBLISHER_AUTHORITY_WITHDRAWN'; end if;
 select * into installation_row from platform.marketplace_installations
  where location_id=platform.current_location_id() and id=(identity->>'installationId')::uuid and status='active' for share;
 if not found then raise exception 'PUBLISHER_AUTHORITY_WITHDRAWN'; end if;
 if identity->>'mode'='first_party' then
  select * into session_row from platform.first_party_sessions where id=(identity->>'sessionId')::uuid
   and location_id=platform.current_location_id() and user_id=platform.current_actor_id()
   and session_role='location_admin' and role_version=(identity->>'roleVersion')::bigint
   and revoked_at is null and expires_at>clock_timestamp() for share;
  if not found then raise exception 'PUBLISHER_AUTHORITY_WITHDRAWN'; end if;
 end if;
end $f$;

create function campaign.webinar_publisher_evidence(wanted text) returns jsonb
language plpgsql security definer set search_path='' as $f$
declare c campaign.campaigns; v campaign.campaign_versions; p campaign.preflight_results; a campaign.approval_decisions;
begin
 select * into c from campaign.campaigns where location_id=platform.current_location_id() and campaign_ref=wanted
  and created_by_actor_id=platform.current_actor_id() for update;
 if not found or c.status<>'approved' then return null; end if;
 select * into v from campaign.campaign_versions where location_id=c.location_id and campaign_id=c.id order by version_no desc limit 1 for share;
 select * into p from campaign.preflight_results where location_id=c.location_id and campaign_version_id=v.id order by evaluated_at desc,id desc limit 1 for share;
 select * into a from campaign.approval_decisions where location_id=c.location_id and campaign_version_id=v.id order by decided_at desc,id desc limit 1 for share;
 if v.created_by_actor_id<>platform.current_actor_id() or v.manifest->>'blueprintId'<>'webinar-ad'
  or p.id is null or p.blocking or a.id is null or a.decision<>'approved' or a.actor_id<>platform.current_actor_id()
  or a.actor_role<>'location_admin' or p.manifest_hash<>v.manifest_hash or a.manifest_hash<>v.manifest_hash
  or a.preflight_result_hash<>p.result_hash then return null; end if;
 perform 1 from campaign.funnel_publications fp where fp.id=(v.manifest->'destination'->>'publicationId')::uuid
  and fp.location_id=c.location_id and fp.user_id=platform.current_actor_id() for share;
 if not found or campaign.funnel_public_snapshot((v.manifest->'destination'->>'publicationId')::uuid) is null then return null; end if;
 return jsonb_build_object('state','approved','version',(jsonb_build_object(
  'schemaVersion',1,'locationRef',v.location_ref,'campaignRef',v.campaign_ref,'campaignVersionRef',v.campaign_version_ref,
  'versionNo',v.version_no,'inputVersions',v.input_versions,'manifest',v.manifest,
  'manifestHash',v.manifest_hash,'createdBy',v.created_by_actor_ref,'createdAt',to_char(v.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
   ||case when v.source_campaign_ref is null then '{}'::jsonb else jsonb_build_object('sourceCampaignRef',v.source_campaign_ref) end),
  'preflight',jsonb_build_object('schemaVersion',1,'campaignRef',p.campaign_ref,'campaignVersionRef',p.campaign_version_ref,
   'manifestHash',p.manifest_hash,'inputVersions',p.input_versions,'rulesetVersionRef',p.ruleset_version_ref,'findings',p.findings,
   'blocking',p.blocking,'resultHash',p.result_hash,'evaluatedAt',to_char(p.evaluated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  'approval',jsonb_build_object('schemaVersion',1,'approvalRef',a.approval_ref,'locationRef',a.location_ref,'campaignRef',a.campaign_ref,
   'campaignVersionRef',a.campaign_version_ref,'manifestHash',a.manifest_hash,'preflightResultHash',a.preflight_result_hash,
   'actorRef',a.actor_ref,'actorKind',a.actor_kind,'actorRole',a.actor_role,'decidedAt',to_char(a.decided_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'ipAuditHash',a.ip_audit_hash,'decision',a.decision,'snapshot',a.snapshot));
end $f$;

create function campaign.webinar_publisher_launch_json(l campaign.webinar_publisher_launches) returns jsonb
language sql set search_path='' as $f$
 select jsonb_build_object('summary',l.summary,'rowVersion',l.row_version,'state',l.state,'nativeIds',l.native_ids)
$f$;

create function campaign.webinar_publisher_spend_authorize() returns void
language plpgsql security definer set search_path='' as $f$
declare e billing.entitlement_versions;
begin
 select * into e from billing.entitlement_versions where location_id=platform.current_location_id()
  and feature_key='campaign.publish' order by version_no desc limit 1 for share;
 if not found or e.status not in ('active','grace') or e.effective_at>clock_timestamp()
  or (e.expires_at is not null and e.expires_at<=clock_timestamp())
  or integration.authority_active(platform.current_location_id(),'campaign.publish') is not true
 then raise exception 'PUBLISHER_AUTHORITY_WITHDRAWN'; end if;
end $f$;

-- One allowlisted command router; tables carry no ordinary runtime write grants.
create function campaign.webinar_publisher_command(identity jsonb, method text, input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $f$
declare l campaign.webinar_publisher_launches; o campaign.webinar_publisher_operations; prior campaign.webinar_publisher_operations;
 a campaign.webinar_publisher_admissions; op jsonb; task jsonb; result jsonb; had_effect boolean; p jsonb;
begin
 perform campaign.webinar_publisher_authorize(identity);
 if method='pending' then
  if ((input->>'limit')::integer between 1 and 50) is not true then raise exception 'PUBLISHER_LIMIT_INVALID'; end if;
  return coalesce((select jsonb_agg(pending_rows.payload) from (
   select outbox_row.payload from integration.webinar_publisher_outbox outbox_row
    join campaign.webinar_publisher_operations operation_row on operation_row.location_id=outbox_row.location_id and operation_row.operation_ref=outbox_row.operation_ref
    join campaign.webinar_publisher_launches launch_row on launch_row.location_id=operation_row.location_id and launch_row.projection_ref=operation_row.projection_ref
   where outbox_row.location_id=platform.current_location_id() and launch_row.actor_id=platform.current_actor_id()
    and launch_row.installation_id=(identity->>'installationId')::uuid and operation_row.active and outbox_row.processed_at is null
   order by outbox_row.created_at,outbox_row.operation_ref limit (input->>'limit')::integer) pending_rows),'[]'::jsonb);
 end if;
 if method='evidence' then return campaign.webinar_publisher_evidence(input->>'campaignRef'); end if;
 if method='selection' then
  select * into a from campaign.webinar_publisher_admissions where location_id=platform.current_location_id()
   and actor_id=platform.current_actor_id() and installation_id=(identity->>'installationId')::uuid and kind='selection'
   and normalized->'selection'=input->'selection' and revoked_at is null and observed_at<=clock_timestamp()
   and expires_at>clock_timestamp() order by observed_at desc limit 1 for share;
  if not found then raise exception 'PUBLISHER_DISCOVERY_UNQUALIFIED'; end if;
  if a.normalized->'resolved'->'assets'->>'locationId' is distinct from
    (select ghl_location_id from platform.locations where id=platform.current_location_id())
  then raise exception 'PUBLISHER_DISCOVERY_UNQUALIFIED'; end if;
  return a.normalized->'resolved';
 end if;
 if method='insert-summary' then
  p=input->'projection';
  if p->>'locationRef' is distinct from 'location_'||replace(platform.current_location_id()::text,'-','')
   or p->>'createdBy' is distinct from 'actor_'||replace(platform.current_actor_id()::text,'-','')
   or input->>'contractId' is distinct from 'CTR-003' or input->>'contractRevision' is distinct from '1' or input->>'schemaVersion' is distinct from '1'
  then raise exception 'PUBLISHER_IDENTITY_INVALID'; end if;
  result=campaign.webinar_publisher_evidence(p->>'campaignRef');
  if result is null or result->'version'->>'manifestHash'<>p->>'manifestHash'
   or result->'version'->>'campaignVersionRef'<>p->>'campaignVersionRef'
   or result->'preflight'->>'resultHash'<>p->>'preflightHash' or result->'approval'->>'approvalRef'<>p->>'approvalRef'
  then raise exception 'PUBLISHER_EVIDENCE_CHANGED'; end if;
  insert into campaign.webinar_publisher_launches(location_id,projection_ref,actor_id,installation_id,campaign_ref,summary,projection_hash,summary_hash)
   values(platform.current_location_id(),p->>'projectionRef',platform.current_actor_id(),(identity->>'installationId')::uuid,p->>'campaignRef',input,p->>'projectionHash',input->>'summaryHash') returning * into l;
  return campaign.webinar_publisher_launch_json(l);
 end if;
 if method='find-command' then
  select * into o from campaign.webinar_publisher_operations where location_id=platform.current_location_id()
   and actor_id=platform.current_actor_id() and request_id=(input->>'requestId')::uuid for update;
  return o.operation;
 end if;
 select * into l from campaign.webinar_publisher_launches where location_id=platform.current_location_id()
  and actor_id=platform.current_actor_id() and projection_ref=input->>'projectionRef'
  and installation_id=(identity->>'installationId')::uuid for update;
 if not found then return null; end if;
 if method='load' then return campaign.webinar_publisher_launch_json(l); end if;
 if method<>'reserve' then raise exception 'PUBLISHER_METHOD_INVALID'; end if;
 op=input->'operation'; task=input->'task';
 if op->>'contractId' is distinct from 'CTR-003' or op->>'contractRevision' is distinct from '1' or op->>'schemaVersion' is distinct from '1'
  or op->>'stage' is distinct from 'queued' or op->>'state' is distinct from 'reserved' or (op->>'leaseGeneration')::bigint is distinct from 0::bigint
  or op->>'projectionHash'<>l.projection_hash or op->>'summaryHash'<>l.summary_hash
  or op->>'actorRef'<>'actor_'||replace(l.actor_id::text,'-','')
  or op->>'locationRef'<>'location_'||replace(l.location_id::text,'-','')
  or op->>'projectionRef'<>l.projection_ref or (op->>'actorRoleVersion')::bigint<>(identity->>'roleVersion')::bigint
  or task<>jsonb_build_object('schemaVersion',1,'contractId','CTR-003','contractRevision',1,'kind','webinar-publisher-command',
    'operationRef',op->>'operationRef','locationRef',op->>'locationRef','projectionHash',op->>'projectionHash','action',op->>'action','correlationRef',op->>'correlationRef')
 then raise exception 'PUBLISHER_REQUEST_CONFLICT'; end if;
 select * into prior from campaign.webinar_publisher_operations where location_id=l.location_id and actor_id=l.actor_id
  and request_id=(op->>'requestId')::uuid for update;
 if found then
  if prior.request_hash is distinct from op->>'requestHash' or prior.action is distinct from op->>'action'
   or prior.operation->>'confirmationHash' is distinct from op->>'confirmationHash'
   or prior.operation->>'projectionHash' is distinct from op->>'projectionHash'
   or prior.operation->>'summaryHash' is distinct from op->>'summaryHash'
   or prior.operation->>'expectedRowVersion' is distinct from op->>'expectedRowVersion'
   or prior.operation->'nativeIdsAtConfirmation' is distinct from op->'nativeIdsAtConfirmation'
  then raise exception 'PUBLISHER_REQUEST_CONFLICT'; end if;
  return prior.operation;
 end if;
 if op->'nativeIdsAtConfirmation' is distinct from l.native_ids
  or l.row_version is distinct from (input->>'expectedRowVersion')::bigint or l.state is distinct from input->>'expectedState'
 then raise exception 'PUBLISHER_STALE_ROW'; end if;
 if ((op->>'action'='draft' and l.state='reserved' and l.native_ids->>'campaignId' is null)
  or (op->>'action'='publish' and l.state='draft_ready' and l.native_ids->>'adId' is not null)
  or (op->>'action'='resume' and l.state='paused' and l.native_ids->>'adId' is not null)
  or (op->>'action'='pause' and l.state<>'cancelled' and l.native_ids->>'campaignId' is not null)
  or (op->>'action'='cancel' and l.state in ('reserved','drafting','publish_queued','publishing','pause_pending','resume_pending','uncertain'))) is not true
 then raise exception 'PUBLISHER_ACTION_NOT_READY'; end if;
 if op->>'action' not in ('pause','cancel') then
  perform campaign.webinar_publisher_spend_authorize();
  result=campaign.webinar_publisher_evidence(l.campaign_ref);
  if result is null or result->'version'->>'manifestHash'<>l.summary->'projection'->>'manifestHash'
   or result->'approval'->>'approvalRef'<>l.summary->'projection'->>'approvalRef'
  then raise exception 'PUBLISHER_EVIDENCE_CHANGED'; end if;
 end if;
 if op->>'action'<>'cancel' and campaign.webinar_publisher_proof(identity,l.projection_ref,case when op->>'action'='pause' then 'pause' else 'qualification' end) is null
 then raise exception 'PUBLISHER_PROVIDER_UNQUALIFIED'; end if;
 select * into prior from campaign.webinar_publisher_operations where location_id=l.location_id and projection_ref=l.projection_ref and active for update;
 if found then
  if op->>'action' not in ('pause','cancel') then raise exception 'PUBLISHER_ACTIVE_LINEAGE'; end if;
  select exists(select 1 from campaign.webinar_publisher_attempts where location_id=l.location_id and operation_ref=prior.operation_ref) into had_effect;
  update campaign.webinar_publisher_operations set active=false,lease_generation=lease_generation+1,lease_expires_at=null,
   operation=operation||jsonb_build_object('leaseGeneration',lease_generation+1,'state',case when had_effect then 'uncertain' else 'cancelled' end,
    'stage',case when had_effect then 'reconcile' else 'complete' end,'lastSafeFailure',case when had_effect then 'CANCEL_PENDING' else null end)
   where location_id=l.location_id and operation_ref=prior.operation_ref;
  update campaign.webinar_publisher_launches set cancellation_generation=cancellation_generation+1 where location_id=l.location_id and projection_ref=l.projection_ref returning * into l;
 end if;
 insert into campaign.webinar_publisher_operations(location_id,operation_ref,projection_ref,actor_id,request_id,request_hash,operation,action,cancellation_generation)
  values(l.location_id,op->>'operationRef',l.projection_ref,l.actor_id,(op->>'requestId')::uuid,op->>'requestHash',op,op->>'action',l.cancellation_generation);
 insert into integration.webinar_publisher_outbox(location_id,operation_ref,payload) values(l.location_id,op->>'operationRef',task);
 update campaign.webinar_publisher_launches set row_version=row_version+1 where location_id=l.location_id and projection_ref=l.projection_ref;
 return op;
end $f$;

-- Admission capability is deliberately separate from request/worker runtime.
reset role;
do $role$ begin if not exists(select 1 from pg_roles where rolname='publisher_admission_runtime') then create role publisher_admission_runtime nologin noinherit; end if; end $role$;
set role migration_owner;
grant usage on schema campaign,platform to publisher_admission_runtime;
create function campaign.webinar_publisher_admit(wanted_location uuid,wanted_actor uuid,wanted_installation uuid,receipt jsonb) returns void
language plpgsql security definer set search_path='' as $f$
begin
 if receipt->>'kind' not in ('selection','qualification','pause','observation') or receipt->>'contractId' is distinct from 'CTR-003'
  or receipt->>'contractRevision' is distinct from '1' or receipt->>'schemaVersion' is distinct from '1' or receipt->>'origin' is distinct from 'verified_provider'
  or (receipt->>'observedAt')::timestamptz>clock_timestamp() or (receipt->>'expiresAt')::timestamptz<=clock_timestamp()
  or not exists(select 1 from platform.marketplace_installations where id=wanted_installation and location_id=wanted_location and status='active')
  or not exists(select 1 from platform.role_bindings where user_id=wanted_actor and location_id=wanted_location and role='location_admin' and revoked_at is null)
 then raise exception 'PUBLISHER_ADMISSION_INVALID'; end if;
 if receipt->>'kind'<>'observation' and
  (case when receipt->>'kind'='selection' then receipt->'normalized'->'resolved'->'assets'->>'locationId'
    else receipt->'normalized'->>'locationId' end) is distinct from
   (select ghl_location_id from platform.locations where id=wanted_location and status='active')
 then raise exception 'PUBLISHER_ADMISSION_INVALID'; end if;
 insert into campaign.webinar_publisher_admissions(location_id,admission_ref,actor_id,installation_id,kind,artifact_hash,verifier_ref,normalized,observed_at,expires_at)
  values(wanted_location,receipt->>'admissionRef',wanted_actor,wanted_installation,receipt->>'kind',receipt->>'artifactHash',receipt->>'verifierRef',receipt->'normalized',(receipt->>'observedAt')::timestamptz,(receipt->>'expiresAt')::timestamptz);
end $f$;

-- Only exact admitted proof is returned; arbitrary schema-shaped App Test data is insufficient.
create function campaign.webinar_publisher_proof(identity jsonb,wanted_projection text,wanted_kind text) returns jsonb
language plpgsql security definer set search_path='' as $f$
declare l campaign.webinar_publisher_launches; a campaign.webinar_publisher_admissions;
begin
 perform campaign.webinar_publisher_authorize(identity);
 select * into l from campaign.webinar_publisher_launches where location_id=platform.current_location_id() and actor_id=platform.current_actor_id()
  and projection_ref=wanted_projection and installation_id=(identity->>'installationId')::uuid for update;
 if not found then return null; end if;
 select * into a from campaign.webinar_publisher_admissions where location_id=l.location_id and actor_id=l.actor_id
  and installation_id=l.installation_id and kind=wanted_kind and normalized->>'projectionHash'=l.projection_hash
  and revoked_at is null and observed_at<=clock_timestamp() and expires_at>clock_timestamp() order by observed_at desc limit 1 for share;
 if not found then return null; end if;
 if wanted_kind in ('qualification','pause') and (
   a.normalized->>'kind' is distinct from 'app_test'
   or (a.normalized->>'observedAt')::timestamptz>clock_timestamp()
   or (a.normalized->>'expiresAt')::timestamptz<=clock_timestamp()
   or a.normalized->>'wireMappingHash' is distinct from l.summary->'projection'->'providerContract'->>'wireMappingHash'
   or a.normalized->>'locationId' is distinct from l.summary->'projection'->'assets'->>'locationId'
   or a.normalized->>'adAccountId' is distinct from l.summary->'projection'->'assets'->>'adAccountId') then return null; end if;
 if wanted_kind='pause' and a.normalized->>'campaignId' is distinct from l.native_ids->>'campaignId' then return null; end if;
 if wanted_kind='qualification' and (
  a.normalized->>'currency' is distinct from 'USD'
  or a.normalized->'budget'->>'mode' is distinct from 'DAILY'
  or a.normalized->'budget'->>'totalSemantics' is distinct from 'estimated_ceiling'
  or
  a.normalized->>'pageId' is distinct from l.summary->'projection'->'assets'->>'pageId'
  or a.normalized->>'timezone' is distinct from l.summary->'projection'->'assets'->>'timezone'
  or a.normalized->'schedule'->>'requestEnd' is distinct from l.summary->'projection'->'schedule'->>'endsAt'
  or a.normalized->'schedule'->>'observedStop' is distinct from l.summary->'projection'->'schedule'->>'endsAt'
  or (a.normalized->'budget'->>'amountMajor')::numeric is distinct from (l.summary->'projection'->'budget'->>'dailyBudgetMinor')::numeric/100
  or (l.summary->'projection'->'schedule'->>'endsAt')::timestamptz<=clock_timestamp()) then return null; end if;
 return a.normalized;
end $f$;

revoke all on function campaign.webinar_publisher_authorize(jsonb),campaign.webinar_publisher_spend_authorize(),campaign.webinar_publisher_evidence(text),campaign.webinar_publisher_launch_json(campaign.webinar_publisher_launches),campaign.webinar_publisher_immutable(),campaign.webinar_publisher_command(jsonb,text,jsonb),campaign.webinar_publisher_admit(uuid,uuid,uuid,jsonb),campaign.webinar_publisher_proof(jsonb,text,text) from public;
grant execute on function campaign.webinar_publisher_command(jsonb,text,jsonb),campaign.webinar_publisher_proof(jsonb,text,text) to app_runtime;
grant execute on function campaign.webinar_publisher_admit(uuid,uuid,uuid,jsonb) to publisher_admission_runtime;

create function campaign.webinar_publisher_worker(identity jsonb,method text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $f$
declare l campaign.webinar_publisher_launches; o campaign.webinar_publisher_operations; a campaign.webinar_publisher_attempts;
 obs campaign.webinar_publisher_admissions; next_stage text; next_state text; has_effect boolean; initial_ids jsonb; result jsonb; observed timestamptz; draft_reconcile boolean=false; parity_refusal boolean=false; preflight_refusal boolean=false;
begin
 perform campaign.webinar_publisher_authorize(identity);
 -- Always lock lineage before operation: reservation, control and worker use the same order.
 select * into l from campaign.webinar_publisher_launches where location_id=platform.current_location_id()
  and actor_id=platform.current_actor_id() and installation_id=(identity->>'installationId')::uuid
  and projection_ref=(select projection_ref from campaign.webinar_publisher_operations
   where location_id=platform.current_location_id() and operation_ref=input->>'operationRef') for update;
 if not found then raise exception 'PUBLISHER_NOT_FOUND'; end if;
 select * into o from campaign.webinar_publisher_operations where location_id=l.location_id
  and operation_ref=input->>'operationRef' and actor_id=l.actor_id for update;
 if not found then raise exception 'PUBLISHER_NOT_FOUND'; end if;
 if method='read' then
  return jsonb_build_object('operation',o.operation,'launch',campaign.webinar_publisher_launch_json(l),
   'deadlineAt',to_char(o.deadline_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'leaseExpiresAt',case when o.lease_expires_at is null then null else to_char(o.lease_expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
   'cancellationGeneration',o.cancellation_generation,'workerRef',o.worker_ref);
 end if;
 if not o.active or o.cancellation_generation<>l.cancellation_generation then raise exception 'PUBLISHER_FENCED'; end if;
 select exists(select 1 from campaign.webinar_publisher_attempts where location_id=o.location_id and operation_ref=o.operation_ref and status<>'confirmed') into has_effect;
 if o.deadline_at<=clock_timestamp() then
  -- A confirmed response can be only a queue acknowledgement, not observed delivery.
  -- Any retained dispatch or entity identity survives the exhausted work budget.
  -- Keep the unconfirmed-stage predicate above for ordinary pre-deadline claims.
  select exists(select 1 from campaign.webinar_publisher_attempts
    where location_id=o.location_id and operation_ref=o.operation_ref)
    or l.native_ids->>'campaignId' is not null into has_effect;
  update campaign.webinar_publisher_operations set active=false,lease_expires_at=null,
   stage=case when has_effect then 'reconcile' else 'complete' end,
   operation=operation||jsonb_build_object('state',case when has_effect then 'uncertain' else 'blocked' end,
    'stage',case when has_effect then 'reconcile' else 'complete' end,'lastSafeFailure',case when has_effect then 'WRITE_UNCERTAIN' else 'EVIDENCE_CHANGED' end)
   where location_id=o.location_id and operation_ref=o.operation_ref;
  update campaign.webinar_publisher_launches set state=case when has_effect then 'uncertain' else 'blocked' end,row_version=row_version+1 where location_id=l.location_id and projection_ref=l.projection_ref;
  return jsonb_build_object('status','deadline');
 end if;
 if method='claim' then
  if input->'task' is distinct from (select payload from integration.webinar_publisher_outbox where location_id=o.location_id and operation_ref=o.operation_ref)
   then raise exception 'PUBLISHER_TASK_MISMATCH'; end if;
  if ((input->>'leaseSeconds')::integer between 1 and 60) is not true then raise exception 'PUBLISHER_LEASE_INVALID'; end if;
  if o.lease_expires_at>clock_timestamp() then return jsonb_build_object('status','busy'); end if;
  -- An abandoned dispatched stage is reconciled, never sent again by a replacement worker.
  next_stage=case when has_effect then 'reconcile' when o.stage<>'queued' then o.stage
   when o.action='draft' then 'campaign' when o.action='publish' then 'publish'
   when o.action='pause' then 'pause' when o.action='resume' then 'resume' else 'complete' end;
  next_state=case when has_effect then 'uncertain' when o.action='cancel' then
   case when l.native_ids->>'campaignId' is null and not exists(select 1 from campaign.webinar_publisher_attempts where location_id=l.location_id and operation_ref in
    (select operation_ref from campaign.webinar_publisher_operations where location_id=l.location_id and projection_ref=l.projection_ref)) then 'cancelled' else 'uncertain' end
   when o.action='draft' then 'drafting' when o.action='pause' then 'pause_pending' when o.action='resume' then 'resume_pending' else 'publishing' end;
  if next_state='uncertain' then next_stage='reconcile'; end if;
  update campaign.webinar_publisher_operations set worker_ref=input->>'workerRef',lease_generation=lease_generation+1,
   lease_expires_at=least(clock_timestamp()+make_interval(secs=>(input->>'leaseSeconds')::integer),deadline_at),
   stage=next_stage,active=next_stage<>'complete',operation=operation||jsonb_build_object('stage',next_stage,'state',next_state,'leaseGeneration',lease_generation+1)
   where location_id=o.location_id and operation_ref=o.operation_ref returning * into o;
  update campaign.webinar_publisher_launches set state=next_state,row_version=row_version+1 where location_id=l.location_id and projection_ref=l.projection_ref returning * into l;
 else
  if o.worker_ref is distinct from input->>'workerRef' or o.lease_generation is distinct from (input->>'leaseGeneration')::bigint
   or o.lease_expires_at is null or o.lease_expires_at<=clock_timestamp() or o.stage is distinct from input->>'expectedStage'
   then raise exception 'PUBLISHER_FENCED'; end if;
  if method='dispatch' then
   if o.stage not in ('campaign','adset','ad','publish','pause','resume') then raise exception 'PUBLISHER_STAGE_INVALID'; end if;
   if o.action<>'pause' then
    perform campaign.webinar_publisher_spend_authorize();
    result=campaign.webinar_publisher_evidence(l.campaign_ref);
    if result is null or result->'version'->>'campaignVersionRef'<>l.summary->'projection'->>'campaignVersionRef'
     or result->'version'->>'manifestHash'<>l.summary->'projection'->>'manifestHash'
     or result->'preflight'->>'resultHash'<>l.summary->'projection'->>'preflightHash'
     or result->'approval'->>'approvalRef'<>l.summary->'projection'->>'approvalRef'
    then raise exception 'PUBLISHER_EVIDENCE_CHANGED'; end if;
   end if;
   result=campaign.webinar_publisher_proof(identity,l.projection_ref,case when o.action='pause' then 'pause' else 'qualification' end);
   if result is null then raise exception 'PUBLISHER_PROVIDER_UNQUALIFIED'; end if;
   if o.stage in ('publish','resume') or o.action in ('publish','resume') then
    if o.stage is distinct from o.action or o.action not in ('publish','resume')
     or l.native_ids->>'campaignId' is null or l.native_ids->>'adsetId' is null or l.native_ids->>'adId' is null
    then raise exception 'PUBLISHER_STAGE_INVALID'; end if;
    -- Use the latest linked observation, including a later failure/withdrawal, not any old success.
    select * into obs from campaign.webinar_publisher_admissions where location_id=l.location_id
     and actor_id=l.actor_id and installation_id=l.installation_id and kind='observation'
     and normalized->>'projectionHash'=l.projection_hash
     order by (normalized->>'observedAt')::timestamptz desc,created_at desc,admission_ref desc limit 1 for share;
    if not found then raise exception 'PUBLISHER_OBSERVATION_UNQUALIFIED'; end if;
    if (obs.revoked_at is null and obs.expires_at>clock_timestamp()
     and obs.created_at>=o.created_at
     and obs.observed_at>greatest(o.created_at,(o.operation->>'createdAt')::timestamptz)
     and obs.observed_at<=clock_timestamp() and obs.observed_at>=clock_timestamp()-interval '60 seconds'
     and (obs.normalized->>'observedAt')::timestamptz=obs.observed_at
     and obs.normalized->'nativeIds'=l.native_ids
     and obs.normalized->>'state'=case when o.action='publish' then 'draft_ready' else 'paused' end
     and obs.normalized->>'readBackHash' ~ '^[a-f0-9]{64}$') is not true
    then raise exception 'PUBLISHER_OBSERVATION_UNQUALIFIED'; end if;
   end if;
   insert into campaign.webinar_publisher_attempts(location_id,operation_ref,stage,generation,request_hash,status)
    values(o.location_id,o.operation_ref,o.stage,o.lease_generation,input->>'requestHash','dispatching');
   return jsonb_build_object('status','dispatch-recorded','generation',o.lease_generation,'cancellationGeneration',o.cancellation_generation);
  elsif method='uncertain' then
   update campaign.webinar_publisher_attempts set status='uncertain' where location_id=o.location_id and operation_ref=o.operation_ref and stage=o.stage and generation=o.lease_generation and status='dispatching';
   update campaign.webinar_publisher_operations set stage='reconcile',operation=operation||jsonb_build_object('stage','reconcile','state','uncertain','lastSafeFailure','WRITE_UNCERTAIN')
    where location_id=o.location_id and operation_ref=o.operation_ref returning * into o;
   update campaign.webinar_publisher_launches set state='uncertain',row_version=row_version+1 where location_id=l.location_id and projection_ref=l.projection_ref returning * into l;
  elsif method='checkpoint' then
   next_stage=input->>'stage'; next_state=input->>'state'; initial_ids=l.native_ids;
   if o.stage in ('publish','resume') and next_stage='complete' and next_state='failed' then
    -- Pre-effect refusal does not confirm a dispatch or imply any remote rollback/rejection.
    if o.action is distinct from o.stage or o.action not in ('publish','resume')
     or input->'nativeIds' is distinct from initial_ids or input->>'requestHash' is not null
     or initial_ids->>'campaignId' is null or initial_ids->>'adsetId' is null or initial_ids->>'adId' is null
     or exists(select 1 from campaign.webinar_publisher_attempts preflight_attempt
       where preflight_attempt.location_id=o.location_id and preflight_attempt.operation_ref=o.operation_ref)
    then raise exception 'PUBLISHER_PARITY_INVALID'; end if;
    observed=(input->>'providerObservedAt')::timestamptz;
    select * into obs from campaign.webinar_publisher_admissions where location_id=l.location_id
     and actor_id=l.actor_id and installation_id=l.installation_id and kind='observation'
     and normalized->>'projectionHash'=l.projection_hash
     order by (normalized->>'observedAt')::timestamptz desc,created_at desc,admission_ref desc limit 1 for share;
    if not found then raise exception 'PUBLISHER_OBSERVATION_UNQUALIFIED'; end if;
    if (obs.revoked_at is null and obs.expires_at>clock_timestamp()
     and obs.created_at>=o.created_at
     and obs.observed_at>greatest(o.created_at,(o.operation->>'createdAt')::timestamptz)
     and obs.observed_at<=clock_timestamp() and obs.observed_at>=clock_timestamp()-interval '60 seconds'
     and observed=obs.observed_at and (obs.normalized->>'observedAt')::timestamptz=observed
     and obs.normalized->'nativeIds'=initial_ids and obs.normalized->>'state'='failed'
     and obs.normalized->>'readBackHash'=input->>'readBackHash'
     and obs.normalized->>'readBackHash' ~ '^[a-f0-9]{64}$') is not true
    then raise exception 'PUBLISHER_OBSERVATION_UNQUALIFIED'; end if;
    preflight_refusal=true;
   end if;
   if o.stage='parity' and next_stage='complete' and next_state='failed' then
    -- A verified mismatch ends this operation but retains every created remote identity.
    if o.action is distinct from 'draft' or input->'nativeIds' is distinct from initial_ids
     or initial_ids->>'campaignId' is null or initial_ids->>'adsetId' is null or initial_ids->>'adId' is null
    then raise exception 'PUBLISHER_PARITY_INVALID'; end if;
    select * into a from campaign.webinar_publisher_attempts where location_id=o.location_id and operation_ref=o.operation_ref
     order by started_at desc,generation desc,stage desc limit 1 for update;
    if not found or a.stage is distinct from 'ad' or a.status is distinct from 'confirmed'
     or a.generation>o.lease_generation or (input->>'providerObservedAt')::timestamptz<a.provider_observed_at
     or exists(select 1 from campaign.webinar_publisher_attempts parity_attempt
       where parity_attempt.location_id=o.location_id and parity_attempt.operation_ref=o.operation_ref and parity_attempt.status<>'confirmed')
    then raise exception 'PUBLISHER_PARITY_INVALID'; end if;
    parity_refusal=true;
   end if;
   if o.stage='reconcile' and (next_state in ('drafting','draft_ready') or next_stage in ('campaign','adset','ad','parity')) then
    -- Resume only after observing the exact retained creation identity. Never recover an unknown ID.
    if o.action is distinct from 'draft' or next_state is distinct from 'drafting'
     or input->'nativeIds' is distinct from initial_ids or initial_ids->>'campaignId' is null
     or next_stage is distinct from (case when initial_ids->>'adsetId' is null then 'adset'
       when initial_ids->>'adId' is null then 'ad' else 'parity' end)
    then raise exception 'PUBLISHER_RECONCILE_INVALID'; end if;
    select * into a from campaign.webinar_publisher_attempts where location_id=o.location_id and operation_ref=o.operation_ref
     order by started_at desc,generation desc,stage desc limit 1 for update;
    if not found or a.stage is distinct from (case when initial_ids->>'adsetId' is null then 'campaign'
       when initial_ids->>'adId' is null then 'adset' else 'ad' end)
     or a.generation>o.lease_generation or a.request_hash is distinct from input->>'requestHash'
     or (input->>'providerObservedAt')::timestamptz<greatest(a.started_at,
       coalesce(a.provider_observed_at,a.started_at),coalesce((o.operation->>'providerObservedAt')::timestamptz,a.started_at))
     or exists(select 1 from campaign.webinar_publisher_attempts unresolved_attempt
       where unresolved_attempt.location_id=o.location_id and unresolved_attempt.operation_ref=o.operation_ref
        and unresolved_attempt.stage<>a.stage and unresolved_attempt.status<>'confirmed')
    then raise exception 'PUBLISHER_RECONCILE_INVALID'; end if;
    draft_reconcile=true;
   end if;
   if draft_reconcile or parity_refusal or preflight_refusal then
    perform campaign.webinar_publisher_spend_authorize();
    result=campaign.webinar_publisher_evidence(l.campaign_ref);
    if result is null or result->'version'->>'manifestHash'<>l.summary->'projection'->>'manifestHash'
     or result->'version'->>'campaignVersionRef'<>l.summary->'projection'->>'campaignVersionRef'
     or result->'preflight'->>'resultHash'<>l.summary->'projection'->>'preflightHash'
     or result->'approval'->>'approvalRef'<>l.summary->'projection'->>'approvalRef'
    then raise exception 'PUBLISHER_EVIDENCE_CHANGED'; end if;
    if campaign.webinar_publisher_proof(identity,l.projection_ref,'qualification') is null
     then raise exception 'PUBLISHER_PROVIDER_UNQUALIFIED'; end if;
   end if;
   if not ((o.stage='campaign' and next_stage='adset' and next_state='drafting')
    or (o.stage='adset' and next_stage='ad' and next_state='drafting')
    or (o.stage='ad' and next_stage='parity' and next_state='drafting')
    or (o.stage='parity' and next_stage='complete' and next_state='draft_ready')
    or (o.stage='publish' and next_stage='progress' and next_state='publish_queued')
    or (o.stage in ('pause','resume') and next_stage='progress' and next_state in ('pause_pending','resume_pending'))
    or (o.stage in ('progress','reconcile') and next_stage in ('progress','complete') and next_state in ('in_review','live','paused','failed','uncertain'))
    or draft_reconcile or parity_refusal or preflight_refusal)
   then raise exception 'PUBLISHER_STAGE_INVALID'; end if;
   if exists(select 1 from jsonb_each_text(initial_ids) ids where ids.value is not null and input->'nativeIds'->>ids.key is distinct from ids.value)
    or (input->'nativeIds'->>'adsetId' is not null and input->'nativeIds'->>'campaignId' is null)
    or (input->'nativeIds'->>'adId' is not null and input->'nativeIds'->>'adsetId' is null)
    or (o.stage='campaign' and input->'nativeIds'->>'campaignId' is null)
    or (o.stage='adset' and input->'nativeIds'->>'adsetId' is null)
    or (o.stage in ('ad','parity','publish','resume') and input->'nativeIds'->>'adId' is null)
   then raise exception 'PUBLISHER_PARENT_MISMATCH'; end if;
   observed=(input->>'providerObservedAt')::timestamptz;
   if observed is null or observed>clock_timestamp() or input->>'readBackHash' is null then raise exception 'PUBLISHER_OBSERVATION_REQUIRED'; end if;
   if o.stage in ('campaign','adset','ad','publish','pause','resume') and not preflight_refusal then
    update campaign.webinar_publisher_attempts set status='confirmed',read_back_hash=input->>'readBackHash',provider_observed_at=observed
     where location_id=o.location_id and operation_ref=o.operation_ref and stage=o.stage and generation=o.lease_generation
      and status='dispatching' and request_hash=input->>'requestHash';
    if not found then raise exception 'PUBLISHER_ATTEMPT_MISMATCH'; end if;
   end if;
   if o.stage in ('progress','reconcile') or parity_refusal then
    select * into obs from campaign.webinar_publisher_admissions where location_id=l.location_id and actor_id=l.actor_id
     and installation_id=l.installation_id and kind='observation' and normalized->>'projectionHash'=l.projection_hash
     and normalized->'nativeIds'=input->'nativeIds' and normalized->>'state'=next_state and normalized->>'readBackHash'=input->>'readBackHash'
     and (normalized->>'observedAt')::timestamptz=observed and revoked_at is null and expires_at>clock_timestamp()
     and (not (draft_reconcile or parity_refusal) or observed_at<=clock_timestamp()) limit 1 for share;
    if not found then raise exception 'PUBLISHER_OBSERVATION_UNQUALIFIED'; end if;
   end if;
   if draft_reconcile then
    update campaign.webinar_publisher_attempts set status='confirmed',read_back_hash=input->>'readBackHash',provider_observed_at=observed
     where location_id=a.location_id and operation_ref=a.operation_ref and stage=a.stage and generation=a.generation and request_hash=a.request_hash;
    if not found then raise exception 'PUBLISHER_ATTEMPT_MISMATCH'; end if;
   end if;
   update campaign.webinar_publisher_operations set stage=next_stage,active=next_stage<>'complete',
    operation=operation||jsonb_build_object('stage',next_stage,'state',next_state,'providerObservedAt',input->>'providerObservedAt','lastSafeFailure',case when parity_refusal or preflight_refusal then 'PARITY_MISMATCH' else null end),
    lease_expires_at=case when next_stage='complete' then null else lease_expires_at end
    where location_id=o.location_id and operation_ref=o.operation_ref returning * into o;
   update campaign.webinar_publisher_launches set state=next_state,native_ids=input->'nativeIds',row_version=row_version+1 where location_id=l.location_id and projection_ref=l.projection_ref returning * into l;
  else raise exception 'PUBLISHER_METHOD_INVALID'; end if;
 end if;
 if o.stage='complete' then update integration.webinar_publisher_outbox set processed_at=clock_timestamp() where location_id=o.location_id and operation_ref=o.operation_ref; end if;
 return jsonb_build_object('status','leased','operation',o.operation,'launch',campaign.webinar_publisher_launch_json(l),
  'deadlineAt',to_char(o.deadline_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'leaseExpiresAt',case when o.lease_expires_at is null then null else to_char(o.lease_expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
  'cancellationGeneration',o.cancellation_generation,'workerRef',o.worker_ref);
end $f$;
revoke all on function campaign.webinar_publisher_worker(jsonb,text,jsonb) from public;
grant execute on function campaign.webinar_publisher_worker(jsonb,text,jsonb) to app_runtime;
reset role;
