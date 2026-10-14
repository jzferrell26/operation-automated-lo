-- CTR-003 revision 1: immutable original-command authentication, PostgreSQL 17.
-- Expand only. ACCESS EXCLUSIVE/SHARE locks apply to the new empty table/indexes;
-- new FKs briefly take SHARE ROW EXCLUSIVE on referenced tables. No old function
-- body or grant is replaced. Catalog locks create functions and NOLOGIN roles.
-- Roll forward after durable use. Bound DDL waits; no deployed role memberships.
set role migration_owner;
set lock_timeout = '5s';

create table campaign.webinar_publisher_authentications (
 location_id uuid not null references platform.locations(id) on delete restrict,
 operation_ref text not null,
 actor_id uuid not null references platform.app_users(id) on delete restrict,
 session_id uuid not null references platform.first_party_sessions(id) on delete restrict,
 installation_id uuid not null references platform.marketplace_installations(id) on delete restrict,
 role_binding_id uuid not null references platform.role_bindings(id) on delete restrict,
 role_version bigint not null check(role_version between 1 and 9007199254740991),
 authentication_mode text not null check(authentication_mode in ('first_party','embedded')),
 authenticated_at timestamptz not null,
 expires_at timestamptz not null check(expires_at>authenticated_at),
 verification_hash text not null check(verification_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp(),
 primary key(location_id,operation_ref),
 foreign key(location_id,operation_ref) references campaign.webinar_publisher_operations(location_id,operation_ref) on delete restrict
);
create index webinar_publisher_authentications_actor_idx on campaign.webinar_publisher_authentications(actor_id);
create index webinar_publisher_authentications_session_idx on campaign.webinar_publisher_authentications(session_id);
create index webinar_publisher_authentications_installation_idx on campaign.webinar_publisher_authentications(installation_id);
create index webinar_publisher_authentications_binding_idx on campaign.webinar_publisher_authentications(role_binding_id);
alter table campaign.webinar_publisher_authentications enable row level security;
alter table campaign.webinar_publisher_authentications force row level security;
create policy publisher_auth_owner on campaign.webinar_publisher_authentications for all to migration_owner using(true) with check(true);
revoke all on campaign.webinar_publisher_authentications from public,app_runtime,support_runtime,publisher_admission_runtime;

create function campaign.webinar_publisher_authentication_immutable() returns trigger
language plpgsql set search_path='' as $f$
begin
 raise exception using errcode='55000',message='Publisher authentication is immutable';
end $f$;
create trigger webinar_publisher_authentication_immutable before update or delete
 on campaign.webinar_publisher_authentications for each row execute function campaign.webinar_publisher_authentication_immutable();

reset role;
do $role$ begin
 if not exists(select 1 from pg_roles where rolname='publisher_authentication_runtime') then
  create role publisher_authentication_runtime nologin noinherit;
 end if;
 if not exists(select 1 from pg_roles where rolname='publisher_authentication_resolver') then
  create role publisher_authentication_resolver nologin noinherit;
 end if;
 if exists(select 1 from pg_roles where rolname in ('publisher_authentication_runtime','publisher_authentication_resolver')
  and (rolcanlogin or rolinherit or rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls))
 then raise exception 'Publisher authentication roles require private NOLOGIN capabilities'; end if;
end $role$;
set role migration_owner;
grant usage on schema campaign to publisher_authentication_runtime,publisher_authentication_resolver;

-- Private locking verifier. Never infer a session from actor/location or current GUCs.
create function campaign.webinar_publisher_authentication_session(
 wanted_location uuid,wanted_actor uuid,wanted_session uuid,wanted_installation uuid,wanted_mode text
) returns platform.first_party_sessions
language plpgsql security definer set search_path='' as $f$
declare session_row platform.first_party_sessions; binding_row platform.role_bindings;
begin
 if wanted_mode is null or wanted_mode not in ('first_party','embedded') then
  raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 perform 1 from platform.locations where id=wanted_location and status='active' for share;
 if not found then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 perform 1 from platform.app_users where id=wanted_actor and status='active' for share;
 if not found then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 select * into binding_row from platform.role_bindings where location_id=wanted_location
  and user_id=wanted_actor and role='location_admin' and revoked_at is null for share;
 if not found then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 perform 1 from platform.marketplace_installations where id=wanted_installation
  and location_id=wanted_location and status='active' for share;
 if not found then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 select * into session_row from platform.first_party_sessions where id=wanted_session
  and location_id=wanted_location and user_id=wanted_actor and installation_id=wanted_installation
  and role_binding_id=binding_row.id and session_role='location_admin'
  and role_version=(extract(epoch from binding_row.granted_at)*1000000)::bigint
  and revoked_at is null and expires_at>clock_timestamp() and issued_at<=clock_timestamp()
  and (wanted_mode<>'embedded' or issued_by='embedded_exchange') for share;
 if not found then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 return session_row;
end $f$;

-- Only the independently verified command authentication service can call this.
-- Verifying the original cookie/signature and mutation gate happens before this
-- capability is used. A supplied hash is not signature verification. No token is stored.
-- Calling the unchanged reservation inside this statement makes provenance/outbox
-- atomic. Old operations without provenance cannot be retroactively adopted.
create function campaign.webinar_publisher_authenticated_reserve(
 wanted_location uuid,wanted_actor uuid,wanted_session uuid,wanted_installation uuid,
 wanted_mode text,verified_at timestamptz,verified_expiry timestamptz,verified_hash text,reservation jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $f$
declare session_row platform.first_party_sessions; prior_auth campaign.webinar_publisher_authentications;
 prior_operation campaign.webinar_publisher_operations; result jsonb; identity jsonb;
 captured_start timestamptz; captured_end timestamptz;
begin
 session_row=campaign.webinar_publisher_authentication_session(wanted_location,wanted_actor,wanted_session,wanted_installation,wanted_mode);
 if (verified_hash ~ '^[a-f0-9]{64}$' and verified_at<=clock_timestamp()
  and verified_at>=clock_timestamp()-interval '300 seconds' and verified_expiry>clock_timestamp()) is not true
 then raise exception 'PUBLISHER_AUTHENTICATION_INVALID'; end if;
 captured_start=case when wanted_mode='first_party' then session_row.issued_at else verified_at end;
 captured_end=case when wanted_mode='first_party' then session_row.expires_at else verified_expiry end;
 if wanted_mode='embedded' and (verified_expiry<>verified_at+interval '300 seconds'
  or extract(epoch from verified_at)<>floor(extract(epoch from verified_at))
  or verified_at<date_trunc('second',session_row.issued_at) or verified_expiry>session_row.expires_at)
 then raise exception 'PUBLISHER_AUTHENTICATION_INVALID'; end if;
 -- Lock the same lineage before operation as the existing router.
 perform 1 from campaign.webinar_publisher_launches where location_id=wanted_location
  and actor_id=wanted_actor and installation_id=wanted_installation
  and projection_ref=reservation->>'projectionRef' for update;
 if not found then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 select * into prior_operation from campaign.webinar_publisher_operations where location_id=wanted_location
  and actor_id=wanted_actor and request_id=(reservation->'operation'->>'requestId')::uuid for update;
 if found then
  select * into prior_auth from campaign.webinar_publisher_authentications where location_id=wanted_location
   and operation_ref=prior_operation.operation_ref;
  if not found or prior_auth.session_id<>wanted_session or prior_auth.installation_id<>wanted_installation
   or prior_auth.actor_id<>wanted_actor or prior_auth.role_binding_id<>session_row.role_binding_id
   or prior_auth.role_version<>session_row.role_version or prior_auth.authentication_mode<>wanted_mode
   or prior_auth.expires_at<=clock_timestamp()
  then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 end if;
 perform platform.set_app_context(wanted_location,wanted_actor,reservation->'operation'->>'correlationRef');
 identity=jsonb_build_object('role','location_admin','roleVersion',session_row.role_version,
  'mode',wanted_mode,'sessionId',wanted_session,'installationId',wanted_installation);
 result=campaign.webinar_publisher_command(identity,'reserve',reservation);
 if result is null then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 if prior_operation.operation_ref is null then
  insert into campaign.webinar_publisher_authentications(location_id,operation_ref,actor_id,session_id,
   installation_id,role_binding_id,role_version,authentication_mode,authenticated_at,expires_at,verification_hash)
  values(wanted_location,result->>'operationRef',wanted_actor,wanted_session,wanted_installation,
   session_row.role_binding_id,session_row.role_version,wanted_mode,captured_start,captured_end,verified_hash);
 end if;
 return result;
end $f$;

create function campaign.webinar_publisher_resolve_authentication(
 wanted_operation text,wanted_actor uuid,wanted_location uuid
) returns jsonb
language plpgsql security definer set search_path='' as $f$
declare auth_row campaign.webinar_publisher_authentications; session_row platform.first_party_sessions;
begin
 select * into auth_row from campaign.webinar_publisher_authentications where location_id=wanted_location
  and operation_ref=wanted_operation and actor_id=wanted_actor;
 if not found or auth_row.expires_at<=clock_timestamp() then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 session_row=campaign.webinar_publisher_authentication_session(wanted_location,wanted_actor,auth_row.session_id,auth_row.installation_id,auth_row.authentication_mode);
 if session_row.role_binding_id<>auth_row.role_binding_id or session_row.role_version<>auth_row.role_version
  or auth_row.expires_at>session_row.expires_at then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 perform 1 from campaign.webinar_publisher_operations operation_row
  join campaign.webinar_publisher_launches launch_row on launch_row.location_id=operation_row.location_id
   and launch_row.projection_ref=operation_row.projection_ref
  where operation_row.location_id=wanted_location and operation_row.operation_ref=wanted_operation
   and operation_row.actor_id=wanted_actor and launch_row.actor_id=wanted_actor
   and launch_row.installation_id=auth_row.installation_id
   and (operation_row.operation->>'actorRoleVersion')::bigint=auth_row.role_version for share of operation_row,launch_row;
 if not found then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 return jsonb_build_object('actorId',auth_row.actor_id,'locationId',auth_row.location_id,
  'installationId',auth_row.installation_id,'sessionId',auth_row.session_id,
  'role','location_admin','roleVersion',auth_row.role_version,'authenticationMode',auth_row.authentication_mode);
end $f$;

revoke all on function campaign.webinar_publisher_authentication_immutable(),
 campaign.webinar_publisher_authentication_session(uuid,uuid,uuid,uuid,text),
 campaign.webinar_publisher_authenticated_reserve(uuid,uuid,uuid,uuid,text,timestamptz,timestamptz,text,jsonb),
 campaign.webinar_publisher_resolve_authentication(text,uuid,uuid) from public,app_runtime,support_runtime,publisher_admission_runtime;
grant execute on function campaign.webinar_publisher_authenticated_reserve(uuid,uuid,uuid,uuid,text,timestamptz,timestamptz,text,jsonb) to publisher_authentication_runtime;
grant execute on function campaign.webinar_publisher_resolve_authentication(text,uuid,uuid) to publisher_authentication_resolver;
comment on table campaign.webinar_publisher_authentications is
 'Immutable original operation authentication. Trusted service verification required before reservation. No cookie, bearer token, claim nonce or raw credentials. No replacement login or synthetic principal.';
reset role;
