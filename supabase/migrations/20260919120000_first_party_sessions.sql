-- PRD-005b: first-party review session store and its security definer trust boundary.
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- Migration safety:
-- - Additive only. One new table, one trigger function, two triggers, eleven
--   functions, three policies, and grants on the new objects. No existing
--   table, column, constraint, index, policy, function, or grant is touched.
-- - Lock classes: every ACCESS EXCLUSIVE lock is taken while creating a new
--   object that has no rows and no readers. The only locks taken on existing
--   tables are the ROW SHARE locks that the new foreign keys require
--   (platform.locations, platform.app_users, platform.role_bindings,
--   platform.marketplace_installations), which do not block reads or writes.
-- - Every foreign key on the new table carries its own index. PostgreSQL does
--   not create them automatically and the session lookups join on all four.
-- - After production use, later changes must expand, backfill, switch, and
--   contract. Roll forward by a later migration. A destructive down migration
--   is allowed only on an unlinked local database before any durable data
--   exists.
--
-- Trust boundary:
-- - app_runtime holds no select on platform.app_users and every app_runtime
--   policy needs app.location_id, but session lookup and persona resolution
--   both happen before any principal exists. The foundation's own answer to a
--   pre-context read is a security definer function with set search_path = ''
--   (platform.set_app_context, supabase/migrations/20260721010000_platform_foundation.sql:891-931).
--   This migration follows that pattern instead of adding a database role.
-- - Every refusal raises errcode 42501 with one generic message so no caller
--   can learn which check failed.
--
-- Verification queries are implemented in supabase/tests/first_party_sessions.pgtap.sql.

set role migration_owner;

create table platform.first_party_sessions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  session_secret_hash text not null unique check (session_secret_hash ~ '^[0-9a-f]{64}$'),
  location_id uuid not null references platform.locations (id) on delete restrict,
  user_id uuid not null references platform.app_users (id) on delete restrict,
  role_binding_id uuid not null references platform.role_bindings (id) on delete restrict,
  installation_id uuid not null references platform.marketplace_installations (id) on delete restrict,
  session_role text not null check (
    session_role in (
      'location_admin', 'campaign_creator', 'campaign_approver',
      'campaign_publisher', 'viewer', 'platform_support'
    )
  ),
  role_version bigint not null check (role_version > 0),
  issued_by text not null check (issued_by in ('review_sign_in', 'embedded_exchange')),
  issued_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text check (
    revocation_reason is null
    or revocation_reason in ('sign_out', 'operator', 'binding_revoked')
  ),
  correlation_id text not null check (pg_catalog.length(correlation_id) between 1 and 200),
  created_at timestamptz not null default pg_catalog.now(),
  constraint first_party_sessions_location_id_id_uq unique (location_id, id),
  constraint first_party_sessions_lifetime_ck check (expires_at > issued_at),
  constraint first_party_sessions_maximum_lifetime_ck
    check (expires_at <= issued_at + interval '30 days'),
  constraint first_party_sessions_revocation_order_ck
    check (revoked_at is null or revoked_at >= issued_at),
  constraint first_party_sessions_revocation_pairing_ck check (
    (revoked_at is null and revocation_reason is null)
    or (revoked_at is not null and revocation_reason is not null)
  )
);

create index first_party_sessions_location_user_active_idx
  on platform.first_party_sessions (location_id, user_id, revoked_at);
create index first_party_sessions_expires_at_idx
  on platform.first_party_sessions (expires_at);
create index first_party_sessions_user_id_idx
  on platform.first_party_sessions (user_id);
create index first_party_sessions_role_binding_id_idx
  on platform.first_party_sessions (role_binding_id);
create index first_party_sessions_installation_id_idx
  on platform.first_party_sessions (installation_id);

alter table platform.first_party_sessions enable row level security;
alter table platform.first_party_sessions force row level security;

create policy first_party_sessions_migration_owner_all on platform.first_party_sessions
  for all to migration_owner using (true) with check (true);
create policy first_party_sessions_app_tenant on platform.first_party_sessions
  for select to app_runtime using (platform.tenant_matches(location_id));
create policy first_party_sessions_support_read on platform.first_party_sessions
  for select to support_runtime using (platform.support_context_allowed(location_id));

-- Identity columns are immutable once issued. Only the three operational
-- columns move, and only through platform.touch_first_party_session and
-- platform.revoke_first_party_session.
create function platform.reject_first_party_session_mutation()
returns trigger
language plpgsql
volatile
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'First-party sessions cannot be deleted';
  end if;
  if new.id is distinct from old.id
    or new.session_secret_hash is distinct from old.session_secret_hash
    or new.location_id is distinct from old.location_id
    or new.user_id is distinct from old.user_id
    or new.role_binding_id is distinct from old.role_binding_id
    or new.installation_id is distinct from old.installation_id
    or new.session_role is distinct from old.session_role
    or new.role_version is distinct from old.role_version
    or new.issued_by is distinct from old.issued_by
    or new.issued_at is distinct from old.issued_at
    or new.expires_at is distinct from old.expires_at
    or new.correlation_id is distinct from old.correlation_id
    or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '55000',
      message = 'First-party session identity columns are immutable';
  end if;
  return new;
end
$function$;

create trigger first_party_sessions_reject_delete
before delete on platform.first_party_sessions
for each row execute function platform.reject_first_party_session_mutation();

create trigger first_party_sessions_reject_identity_change
before update on platform.first_party_sessions
for each row execute function platform.reject_first_party_session_mutation();

create function platform.location_is_active(candidate_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from platform.locations as location_row
    where location_row.id = candidate_location_id
      and location_row.status = 'active'
  )
$function$;

create function platform.actor_is_active(candidate_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from platform.app_users as actor
    where actor.id = candidate_actor_id
      and actor.status = 'active'
  )
$function$;

-- The version of a binding is the instant its single active row was granted,
-- in microseconds. extract(epoch ...) returns numeric on PostgreSQL 17 so the
-- multiplication is exact, the result stays below 2^53 and is therefore a safe
-- integer in JavaScript, and role_bindings_active_uq guarantees at most one
-- active row per (location_id, user_id, role).
create function platform.current_role_version(
  location_id uuid,
  user_id uuid,
  binding_role text
)
returns bigint
language sql
stable
security definer
set search_path = ''
as $function$
  select (extract(epoch from binding.granted_at) * 1000000)::bigint
  from platform.role_bindings as binding
  join platform.locations as location_row
    on location_row.id = binding.location_id
   and location_row.status = 'active'
  join platform.app_users as actor
    on actor.id = binding.user_id
   and actor.status = 'active'
  where binding.location_id = current_role_version.location_id
    and binding.user_id = current_role_version.user_id
    and binding.role = current_role_version.binding_role
    and binding.revoked_at is null
$function$;

create function platform.resolve_review_persona(
  location_id uuid,
  binding_role text
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  candidate_ids uuid[];
begin
  select pg_catalog.array_agg(binding.user_id)
    into candidate_ids
  from platform.role_bindings as binding
  join platform.locations as location_row
    on location_row.id = binding.location_id
   and location_row.status = 'active'
  join platform.app_users as actor
    on actor.id = binding.user_id
   and actor.status = 'active'
  where binding.location_id = resolve_review_persona.location_id
    and binding.role = resolve_review_persona.binding_role
    and binding.revoked_at is null;

  if candidate_ids is null or pg_catalog.array_length(candidate_ids, 1) <> 1 then
    raise exception using errcode = '42501', message = 'Review persona is not resolvable';
  end if;
  return candidate_ids[1];
end
$function$;

create function platform.issue_first_party_session(
  location_id uuid,
  user_id uuid,
  binding_role text,
  session_role text,
  session_secret_hash text,
  lifetime_seconds integer,
  issued_by text,
  correlation_id text
)
returns platform.first_party_sessions
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  refused boolean := false;
  resolved_binding_id uuid;
  resolved_installation_id uuid;
  resolved_role_version bigint;
  safe_correlation_id text;
  issued_row platform.first_party_sessions;
begin
  safe_correlation_id := case
    when issue_first_party_session.correlation_id is null then 'session.issuance.denied'
    when pg_catalog.length(issue_first_party_session.correlation_id) between 1 and 200
      then issue_first_party_session.correlation_id
    else pg_catalog.left(issue_first_party_session.correlation_id, 200)
  end;

  if issue_first_party_session.location_id is null
    or issue_first_party_session.user_id is null
    or issue_first_party_session.binding_role is null
    or issue_first_party_session.session_role is null
    or issue_first_party_session.session_secret_hash is null
    or issue_first_party_session.lifetime_seconds is null
    or issue_first_party_session.issued_by is null
    or issue_first_party_session.correlation_id is null
    or issue_first_party_session.session_secret_hash !~ '^[0-9a-f]{64}$'
    or issue_first_party_session.lifetime_seconds not between 1 and 2592000
    or pg_catalog.length(issue_first_party_session.correlation_id) not between 1 and 200
    or issue_first_party_session.issued_by not in ('review_sign_in', 'embedded_exchange')
    or issue_first_party_session.session_role not in (
      'location_admin', 'campaign_creator', 'campaign_approver',
      'campaign_publisher', 'viewer', 'platform_support'
    )
    or not platform.location_is_active(issue_first_party_session.location_id)
    or not platform.actor_is_active(issue_first_party_session.user_id)
  then
    refused := true;
  end if;

  if not refused then
    select binding.id
      into resolved_binding_id
    from platform.role_bindings as binding
    where binding.location_id = issue_first_party_session.location_id
      and binding.user_id = issue_first_party_session.user_id
      and binding.role = issue_first_party_session.binding_role
      and binding.revoked_at is null;
    if resolved_binding_id is null then
      refused := true;
    end if;
  end if;

  if not refused then
    select installation.id
      into resolved_installation_id
    from platform.marketplace_installations as installation
    where installation.location_id = issue_first_party_session.location_id
    order by installation.created_at, installation.id
    limit 1;
    if resolved_installation_id is null then
      refused := true;
    end if;
  end if;

  if refused then
    if issue_first_party_session.user_id is not null
      and exists (
        select 1
        from platform.locations as location_row
        where location_row.id = issue_first_party_session.location_id
      )
    then
      insert into audit.events (
        location_id, actor_type, actor_id, subject_type, subject_id,
        action, result, correlation_id
      ) values (
        issue_first_party_session.location_id,
        'user',
        issue_first_party_session.user_id,
        'first_party_session_request',
        'actor_' || pg_catalog.replace(issue_first_party_session.user_id::text, '-', ''),
        'session.issued',
        'denied',
        safe_correlation_id
      );
    end if;
    raise exception using errcode = '42501',
      message = 'First-party session issuance was refused';
  end if;

  resolved_role_version := platform.current_role_version(
    issue_first_party_session.location_id,
    issue_first_party_session.user_id,
    issue_first_party_session.binding_role
  );

  insert into platform.first_party_sessions (
    session_secret_hash, location_id, user_id, role_binding_id, installation_id,
    session_role, role_version, issued_by, expires_at, correlation_id
  ) values (
    issue_first_party_session.session_secret_hash,
    issue_first_party_session.location_id,
    issue_first_party_session.user_id,
    resolved_binding_id,
    resolved_installation_id,
    issue_first_party_session.session_role,
    resolved_role_version,
    issue_first_party_session.issued_by,
    pg_catalog.now() + pg_catalog.make_interval(
      secs => issue_first_party_session.lifetime_seconds
    ),
    issue_first_party_session.correlation_id
  )
  returning * into issued_row;

  insert into audit.events (
    location_id, actor_type, actor_id, subject_type, subject_id,
    action, result, correlation_id
  ) values (
    issued_row.location_id,
    'user',
    issued_row.user_id,
    'first_party_session',
    'session_' || pg_catalog.replace(issued_row.id::text, '-', ''),
    'session.issued',
    'success',
    issued_row.correlation_id
  );

  return issued_row;
end
$function$;

create function platform.lookup_first_party_session(session_secret_hash text)
returns table (
  id uuid,
  location_id uuid,
  user_id uuid,
  installation_id uuid,
  session_role text,
  role_version bigint,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    session_row.id,
    session_row.location_id,
    session_row.user_id,
    session_row.installation_id,
    session_row.session_role,
    session_row.role_version,
    session_row.expires_at
  from platform.first_party_sessions as session_row
  where session_row.session_secret_hash = lookup_first_party_session.session_secret_hash
    and session_row.revoked_at is null
    and session_row.expires_at > pg_catalog.now()
$function$;

create function platform.touch_first_party_session(session_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $function$
  update platform.first_party_sessions as session_row
  set last_seen_at = pg_catalog.now()
  where session_row.id = touch_first_party_session.session_id
    and session_row.revoked_at is null
    and session_row.expires_at > pg_catalog.now()
$function$;

create function platform.revoke_first_party_session(
  session_id uuid,
  reason text,
  correlation_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  revoked_row platform.first_party_sessions;
begin
  if revoke_first_party_session.session_id is null
    or revoke_first_party_session.reason is null
    or revoke_first_party_session.reason not in ('sign_out', 'operator', 'binding_revoked')
    or revoke_first_party_session.correlation_id is null
    or pg_catalog.length(revoke_first_party_session.correlation_id) not between 1 and 200
  then
    raise exception using errcode = '42501',
      message = 'First-party session revocation was refused';
  end if;

  update platform.first_party_sessions as session_row
  set revoked_at = pg_catalog.now(),
      revocation_reason = revoke_first_party_session.reason
  where session_row.id = revoke_first_party_session.session_id
    and session_row.revoked_at is null
  returning session_row.* into revoked_row;

  if not found then
    return false;
  end if;

  insert into audit.events (
    location_id, actor_type, actor_id, subject_type, subject_id,
    action, result, correlation_id
  ) values (
    revoked_row.location_id,
    'user',
    revoked_row.user_id,
    'first_party_session',
    'session_' || pg_catalog.replace(revoked_row.id::text, '-', ''),
    'session.revoked',
    'success',
    revoke_first_party_session.correlation_id
  );
  return true;
end
$function$;

-- PRD-005a 005A-AC-003. The activity predicate an embedded bearer session needs.
-- platform.lookup_first_party_session is keyed by a secret hash, which a bearer
-- request does not carry, so liveness for a session already named by its id has
-- no answer without this. It is deliberately the narrowest possible read: one
-- boolean, keyed by the primary key, and it never raises, because the caller is
-- an activity check whose only two honest answers are yes and no.
create function platform.first_party_session_is_active(session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from platform.first_party_sessions as session_row
    where session_row.id = first_party_session_is_active.session_id
      and session_row.revoked_at is null
      and session_row.expires_at > pg_catalog.now()
  )
$function$;

-- PRD-005a 005A-AC-011. The shell renders the location and the person a verified
-- session actually names, not the opaque reference. app_runtime holds no select
-- grant on platform.app_users and every app_runtime policy needs app.location_id,
-- which does not exist while the shell is still deciding whether the visitor is
-- signed in, so this is the same pre-context read problem the rest of this file
-- solves the same way. It returns no row unless both the location and the user
-- are active, so a suspended actor cannot keep a name on screen.
create function platform.resolve_session_display(
  location_id uuid,
  user_id uuid
)
returns table (
  location_display_name text,
  user_safe_display_name text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select location_row.display_name, actor.safe_display_name
  from platform.locations as location_row
  join platform.app_users as actor
    on actor.id = resolve_session_display.user_id
   and actor.status = 'active'
  where location_row.id = resolve_session_display.location_id
    and location_row.status = 'active'
$function$;

-- PRD-005b 005B-AC-016. The denied-attempt audit row that survives.
--
-- platform.issue_first_party_session writes its own denied row and then raises
-- 42501 in the same transaction, so that row is rolled back with the exception
-- and never reaches the table. The row is still owed: an attempt that reached a
-- known location and a known actor is exactly the attempt an operator needs to
-- see. This function is how the caller pays it, in a fresh transaction after the
-- refusal, so the refusal stays a refusal and the audit trail stays complete.
--
-- It writes the same shape the in-function branch writes and nothing else. Both
-- identifiers are required because audit.events.actor_id is not nullable, and
-- an attempt that never resolved an actor has no honest row to write.
create function platform.record_denied_session_issuance(
  location_id uuid,
  user_id uuid,
  correlation_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  if record_denied_session_issuance.location_id is null
    or record_denied_session_issuance.user_id is null
    or record_denied_session_issuance.correlation_id is null
    or pg_catalog.length(record_denied_session_issuance.correlation_id) not between 1 and 200
    or not exists (
      select 1
      from platform.locations as location_row
      where location_row.id = record_denied_session_issuance.location_id
    )
    or not exists (
      select 1
      from platform.app_users as actor
      where actor.id = record_denied_session_issuance.user_id
    )
  then
    return false;
  end if;

  insert into audit.events (
    location_id, actor_type, actor_id, subject_type, subject_id,
    action, result, correlation_id
  ) values (
    record_denied_session_issuance.location_id,
    'user',
    record_denied_session_issuance.user_id,
    'first_party_session_request',
    'actor_' || pg_catalog.replace(record_denied_session_issuance.user_id::text, '-', ''),
    'session.issued',
    'denied',
    record_denied_session_issuance.correlation_id
  );
  return true;
end
$function$;

grant select on platform.first_party_sessions to app_runtime;
grant select on platform.first_party_sessions to support_runtime;

revoke execute on function platform.reject_first_party_session_mutation() from public;
revoke execute on function platform.location_is_active(uuid) from public;
revoke execute on function platform.actor_is_active(uuid) from public;
revoke execute on function platform.current_role_version(uuid, uuid, text) from public;
revoke execute on function platform.resolve_review_persona(uuid, text) from public;
revoke execute on function platform.issue_first_party_session(
  uuid, uuid, text, text, text, integer, text, text
) from public;
revoke execute on function platform.lookup_first_party_session(text) from public;
revoke execute on function platform.touch_first_party_session(uuid) from public;
revoke execute on function platform.revoke_first_party_session(uuid, text, text) from public;
revoke execute on function platform.first_party_session_is_active(uuid) from public;
revoke execute on function platform.resolve_session_display(uuid, uuid) from public;
revoke execute on function platform.record_denied_session_issuance(uuid, uuid, text) from public;

grant execute on function platform.location_is_active(uuid) to app_runtime;
grant execute on function platform.actor_is_active(uuid) to app_runtime;
grant execute on function platform.current_role_version(uuid, uuid, text) to app_runtime;
grant execute on function platform.resolve_review_persona(uuid, text) to app_runtime;
grant execute on function platform.issue_first_party_session(
  uuid, uuid, text, text, text, integer, text, text
) to app_runtime;
grant execute on function platform.lookup_first_party_session(text) to app_runtime;
grant execute on function platform.touch_first_party_session(uuid) to app_runtime;
grant execute on function platform.revoke_first_party_session(uuid, text, text) to app_runtime;
grant execute on function platform.first_party_session_is_active(uuid) to app_runtime;
grant execute on function platform.resolve_session_display(uuid, uuid) to app_runtime;
grant execute on function platform.record_denied_session_issuance(uuid, uuid, text) to app_runtime;

comment on table platform.first_party_sessions is
  'First-party browser sessions bound to a location, user, role binding, and installation. Stores only a SHA-256 hash of the cookie secret. Never store the cookie value, a bearer token, or any PII.';
comment on function platform.issue_first_party_session(
  uuid, uuid, text, text, text, integer, text, text
) is
  'Security definer trust boundary for session issuance. Refuses with errcode 42501 and one generic message so no caller learns which check failed.';

reset role;
