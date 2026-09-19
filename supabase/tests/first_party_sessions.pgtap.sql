-- PRD-005b acceptance criteria 005B-AC-001 through 005B-AC-010.
-- Style follows supabase/tests/campaign_activation.pgtap.sql: fixed UUIDs,
-- `set local role migration_owner` for seeding, and pg_temp.capture_sqlstate
-- for refusal paths.
--
-- Catalog queries stand in for has_index, has_trigger, and has_function because
-- those pgTAP helpers are overloaded on (text, text, text) and would silently
-- resolve to a different signature. to_regprocedure also pins each function's
-- exact argument list, which a name-only assertion cannot do.

begin;

select plan(82);

create function pg_temp.assert_is(actual anyelement, expected anyelement, description text)
returns text
language sql
security definer
as $function$ select is(actual, expected, description) $function$;

create function pg_temp.assert_ok(result boolean, description text)
returns text
language sql
security definer
as $function$ select ok(result, description) $function$;

set local role migration_owner;

create function pg_temp.capture_sqlstate(statement text)
returns text
language plpgsql
as $function$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end
$function$;

insert into platform.locations (id, display_name, status)
values
  ('00000000-0000-4000-8000-000000000901', 'Session Tenant A', 'active'),
  ('00000000-0000-4000-8000-000000000902', 'Session Tenant B', 'active'),
  ('00000000-0000-4000-8000-000000000903', 'Session Tenant Suspended', 'suspended'),
  ('00000000-0000-4000-8000-000000000904', 'Session Tenant Without Installation', 'active'),
  ('00000000-0000-4000-8000-000000000905', 'Session Tenant Two Creators', 'active');

insert into platform.app_users (id, safe_display_name, status)
values
  ('00000000-0000-4000-8000-000000000911', 'Session Creator', 'active'),
  ('00000000-0000-4000-8000-000000000912', 'Session Approver', 'active'),
  ('00000000-0000-4000-8000-000000000913', 'Session Suspended User', 'suspended'),
  ('00000000-0000-4000-8000-000000000914', 'Session Deleted User', 'deleted'),
  ('00000000-0000-4000-8000-000000000915', 'Session Tenant B User', 'active'),
  ('00000000-0000-4000-8000-000000000916', 'Session Revoked User', 'active'),
  ('00000000-0000-4000-8000-000000000917', 'Session Duplicate Creator One', 'active'),
  ('00000000-0000-4000-8000-000000000918', 'Session Duplicate Creator Two', 'active'),
  ('00000000-0000-4000-8000-000000000919', 'Session Uninstalled Creator', 'active'),
  ('00000000-0000-4000-8000-00000000091a', 'Session Suspended Tenant Creator', 'active'),
  ('00000000-0000-4000-8000-00000000091b', 'Session Unbound User', 'active');

insert into platform.role_bindings (id, location_id, user_id, role, granted_at, revoked_at)
values
  (
    '00000000-0000-4000-8000-000000000921',
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000911',
    'creator',
    '2026-07-21T16:00:00.000Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000922',
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000912',
    'approver',
    '2026-07-21T16:05:00.000Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000923',
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000913',
    'creator',
    '2026-07-21T16:06:00.000Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000924',
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000914',
    'creator',
    '2026-07-21T16:07:00.000Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000925',
    '00000000-0000-4000-8000-000000000902',
    '00000000-0000-4000-8000-000000000915',
    'creator',
    '2026-07-21T16:08:00.000Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000926',
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000916',
    'creator',
    '2026-07-21T16:09:00.000Z',
    '2026-07-21T16:10:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000927',
    '00000000-0000-4000-8000-000000000905',
    '00000000-0000-4000-8000-000000000917',
    'creator',
    '2026-07-21T16:11:00.000Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000928',
    '00000000-0000-4000-8000-000000000905',
    '00000000-0000-4000-8000-000000000918',
    'creator',
    '2026-07-21T16:12:00.000Z',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000929',
    '00000000-0000-4000-8000-000000000904',
    '00000000-0000-4000-8000-000000000919',
    'creator',
    '2026-07-21T16:13:00.000Z',
    null
  ),
  (
    '00000000-0000-4000-8000-00000000092a',
    '00000000-0000-4000-8000-000000000903',
    '00000000-0000-4000-8000-00000000091a',
    'creator',
    '2026-07-21T16:14:00.000Z',
    null
  );

insert into platform.marketplace_installations (id, location_id, marketplace_app_id, status)
values
  (
    '00000000-0000-4000-8000-000000000931',
    '00000000-0000-4000-8000-000000000901',
    'oalo-review-surface',
    'pending'
  ),
  (
    '00000000-0000-4000-8000-000000000932',
    '00000000-0000-4000-8000-000000000902',
    'oalo-review-surface',
    'pending'
  ),
  (
    '00000000-0000-4000-8000-000000000933',
    '00000000-0000-4000-8000-000000000905',
    'oalo-review-surface',
    'pending'
  ),
  (
    '00000000-0000-4000-8000-000000000934',
    '00000000-0000-4000-8000-000000000903',
    'oalo-review-surface',
    'pending'
  );

-- The issuance function refuses a non-positive lifetime, so an already expired
-- session can only be seeded directly.
insert into platform.first_party_sessions (
  id, session_secret_hash, location_id, user_id, role_binding_id, installation_id,
  session_role, role_version, issued_by, issued_at, expires_at, correlation_id
) values (
  '00000000-0000-4000-8000-000000000941',
  pg_catalog.repeat('e', 64),
  '00000000-0000-4000-8000-000000000901',
  '00000000-0000-4000-8000-000000000911',
  '00000000-0000-4000-8000-000000000921',
  '00000000-0000-4000-8000-000000000931',
  'campaign_creator',
  1784649600000000,
  'review_sign_in',
  '2026-01-01T00:00:00.000Z',
  '2026-01-02T00:00:00.000Z',
  'corr.session-expired'
);

-- A tenant B session proves the app_runtime tenant policy on reads.
insert into platform.first_party_sessions (
  id, session_secret_hash, location_id, user_id, role_binding_id, installation_id,
  session_role, role_version, issued_by, expires_at, correlation_id
) values (
  '00000000-0000-4000-8000-000000000942',
  pg_catalog.repeat('b', 64),
  '00000000-0000-4000-8000-000000000902',
  '00000000-0000-4000-8000-000000000915',
  '00000000-0000-4000-8000-000000000925',
  '00000000-0000-4000-8000-000000000932',
  'campaign_creator',
  1784649600000000,
  'review_sign_in',
  pg_catalog.now() + interval '12 hours',
  'corr.session-tenant-b'
);

reset role;

-- 005B-AC-001: table shape, RLS, policies, grants, triggers.
select has_table('platform', 'first_party_sessions', 'first_party_sessions exists');
select col_is_pk('platform', 'first_party_sessions', 'id', 'id is the primary key');
select columns_are(
  'platform',
  'first_party_sessions',
  array[
    'id', 'session_secret_hash', 'location_id', 'user_id', 'role_binding_id',
    'installation_id', 'session_role', 'role_version', 'issued_by', 'issued_at',
    'expires_at', 'last_seen_at', 'revoked_at', 'revocation_reason',
    'correlation_id', 'created_at'
  ],
  'first_party_sessions carries exactly the D1 columns'
);
select col_type_is(
  'platform', 'first_party_sessions', 'role_version', 'bigint',
  'role_version is bigint'
);
select col_type_is(
  'platform', 'first_party_sessions', 'expires_at', 'timestamp with time zone',
  'expires_at is timestamptz'
);
select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_indexes as index_row
    where index_row.schemaname = 'platform'
      and index_row.tablename = 'first_party_sessions'
      and index_row.indexname in (
        'first_party_sessions_location_user_active_idx',
        'first_party_sessions_expires_at_idx',
        'first_party_sessions_user_id_idx',
        'first_party_sessions_role_binding_id_idx',
        'first_party_sessions_installation_id_idx'
      )
  ),
  5,
  'every foreign key and lookup path carries its own index'
);
select ok(
  (
    select class_row.relrowsecurity and class_row.relforcerowsecurity
    from pg_catalog.pg_class as class_row
    where class_row.oid = 'platform.first_party_sessions'::regclass
  ),
  'row level security is enabled and forced'
);
select is(
  (
    select pg_catalog.array_agg(policy_row.polname order by policy_row.polname)
    from pg_catalog.pg_policy as policy_row
    where policy_row.polrelid = 'platform.first_party_sessions'::regclass
  ),
  array[
    'first_party_sessions_app_tenant',
    'first_party_sessions_migration_owner_all',
    'first_party_sessions_support_read'
  ]::name[],
  'exactly the three standard policies exist'
);
select ok(
  has_table_privilege('app_runtime', 'platform.first_party_sessions', 'SELECT'),
  'app runtime can select sessions'
);
select ok(
  not has_table_privilege('app_runtime', 'platform.first_party_sessions', 'INSERT'),
  'app runtime cannot insert sessions'
);
select ok(
  not has_table_privilege('app_runtime', 'platform.first_party_sessions', 'UPDATE'),
  'app runtime cannot update sessions'
);
select ok(
  not has_table_privilege('app_runtime', 'platform.first_party_sessions', 'DELETE'),
  'app runtime cannot delete sessions'
);
select ok(
  has_table_privilege('support_runtime', 'platform.first_party_sessions', 'SELECT'),
  'support runtime can select sessions'
);
select ok(
  not has_table_privilege('support_runtime', 'platform.first_party_sessions', 'INSERT'),
  'support runtime cannot insert sessions'
);
select ok(
  not has_table_privilege('scheduler_runtime', 'platform.first_party_sessions', 'SELECT'),
  'scheduler runtime cannot select sessions'
);
select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'platform.first_party_sessions'::regclass
      and not trigger_row.tgisinternal
      and trigger_row.tgname in (
        'first_party_sessions_reject_delete',
        'first_party_sessions_reject_identity_change'
      )
  ),
  2,
  'the update and delete restriction triggers exist'
);

-- 005B-AC-002: the migration is additive.
select hasnt_column(
  'platform', 'role_bindings', 'role_version',
  'role_bindings still has no role_version column'
);
select ok(
  not has_table_privilege('app_runtime', 'platform.app_users', 'SELECT'),
  'app runtime still cannot select platform.app_users'
);
select ok(
  not has_table_privilege('app_runtime', 'campaign.campaign_versions', 'UPDATE'),
  'the campaign activation grant set is unchanged'
);

-- 005B-AC-003: the six functions and the two predicates, by exact signature.
select ok(
  pg_catalog.to_regprocedure('platform.location_is_active(uuid)') is not null,
  'location_is_active exists'
);
select ok(
  pg_catalog.to_regprocedure('platform.actor_is_active(uuid)') is not null,
  'actor_is_active exists'
);
select ok(
  pg_catalog.to_regprocedure('platform.current_role_version(uuid, uuid, text)') is not null,
  'current_role_version exists'
);
select ok(
  pg_catalog.to_regprocedure('platform.resolve_review_persona(uuid, text)') is not null,
  'resolve_review_persona exists'
);
select ok(
  pg_catalog.to_regprocedure(
    'platform.issue_first_party_session(uuid, uuid, text, text, text, integer, text, text)'
  ) is not null,
  'issue_first_party_session exists'
);
select ok(
  pg_catalog.to_regprocedure('platform.lookup_first_party_session(text)') is not null,
  'lookup_first_party_session exists'
);
select ok(
  pg_catalog.to_regprocedure('platform.touch_first_party_session(uuid)') is not null,
  'touch_first_party_session exists'
);
select ok(
  pg_catalog.to_regprocedure('platform.revoke_first_party_session(uuid, text, text)') is not null,
  'revoke_first_party_session exists'
);
select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_proc as routine
    where routine.pronamespace = 'platform'::regnamespace
      and routine.proname in (
        'resolve_review_persona', 'issue_first_party_session', 'lookup_first_party_session',
        'current_role_version', 'touch_first_party_session', 'revoke_first_party_session',
        'location_is_active', 'actor_is_active'
      )
      and routine.proowner = 'migration_owner'::regrole
      and routine.prosecdef
      and routine.proconfig @> array['search_path=""']
  ),
  8,
  'all eight session functions are migration_owner security definer with an empty search path'
);
select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_proc as routine
    where routine.pronamespace = 'platform'::regnamespace
      and routine.proname in (
        'resolve_review_persona', 'issue_first_party_session', 'lookup_first_party_session',
        'current_role_version', 'touch_first_party_session', 'revoke_first_party_session',
        'location_is_active', 'actor_is_active'
      )
      and has_function_privilege('app_runtime', routine.oid, 'EXECUTE')
  ),
  8,
  'app runtime can execute all eight session functions'
);
select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_proc as routine
    where routine.pronamespace = 'platform'::regnamespace
      and routine.proname in (
        'resolve_review_persona', 'issue_first_party_session', 'lookup_first_party_session',
        'current_role_version', 'touch_first_party_session', 'revoke_first_party_session',
        'location_is_active', 'actor_is_active'
      )
      and (
        has_function_privilege('public', routine.oid, 'EXECUTE')
        or has_function_privilege('support_runtime', routine.oid, 'EXECUTE')
        or has_function_privilege('scheduler_runtime', routine.oid, 'EXECUTE')
        or has_function_privilege('reporting_runtime', routine.oid, 'EXECUTE')
      )
  ),
  0,
  'no role other than app_runtime can execute the session functions'
);

set local role app_runtime;

-- 005B-AC-004: every issuance refusal raises 42501 and inserts no session row.
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000903',
      '00000000-0000-4000-8000-00000000091a',
      'creator', 'campaign_creator', pg_catalog.repeat('1', 64), 43200,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses an inactive location'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000913',
      'creator', 'campaign_creator', pg_catalog.repeat('2', 64), 43200,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses a suspended user'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000914',
      'creator', 'campaign_creator', pg_catalog.repeat('3', 64), 43200,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses a deleted user'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-00000000091b',
      'creator', 'campaign_creator', pg_catalog.repeat('4', 64), 43200,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses a user with no binding'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000916',
      'creator', 'campaign_creator', pg_catalog.repeat('5', 64), 43200,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses a revoked binding'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000911',
      'approver', 'campaign_approver', pg_catalog.repeat('6', 64), 43200,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses a binding role the user does not hold'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000904',
      '00000000-0000-4000-8000-000000000919',
      'creator', 'campaign_creator', pg_catalog.repeat('7', 64), 43200,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses a location without an installation row'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000911',
      'creator', 'realtor_collaborator', pg_catalog.repeat('8', 64), 43200,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses a session role outside the six application roles'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000911',
      'creator', 'campaign_creator', pg_catalog.repeat('9', 64), 2592001,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses a lifetime beyond the cookie bound'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000911',
      'creator', 'campaign_creator', 'not-a-sha-256-digest', 43200,
      'review_sign_in', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses a malformed secret hash'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000911',
      'creator', 'campaign_creator', pg_catalog.repeat('0', 64), 43200,
      'highlevel_sso', 'corr.session-refusal'
    )
  $sql$),
  '42501',
  'issuance refuses an issuer outside the two documented issuers'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from platform.first_party_sessions),
  2,
  'no refused issuance inserted a session row'
);

-- 005B-AC-005: a successful issuance.
reset role;
set local role app_runtime;
select pg_temp.assert_ok(
  (
    select issued.id is not null
    from platform.issue_first_party_session(
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000911',
      'creator', 'campaign_creator', pg_catalog.repeat('a', 64), 43200,
      'review_sign_in', 'corr.session-issued'
    ) as issued
  ),
  'issuance returns the inserted session row'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from platform.first_party_sessions),
  3,
  'a successful issuance inserted exactly one session row'
);
select pg_temp.assert_is(
  (
    select session_row.role_version
    from platform.first_party_sessions as session_row
    where session_row.session_secret_hash = pg_catalog.repeat('a', 64)
  ),
  (
    select (extract(epoch from binding.granted_at) * 1000000)::bigint
    from platform.role_bindings as binding
    where binding.id = '00000000-0000-4000-8000-000000000921'
  ),
  'role_version equals the derived version of the active binding'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from audit.events as event_row
    where event_row.action = 'session.issued'
      and event_row.result = 'success'
      and event_row.correlation_id = 'corr.session-issued'
  ),
  1,
  'a successful issuance writes exactly one success audit row'
);
select pg_temp.assert_is(
  (
    select event_row.subject_id
    from audit.events as event_row
    where event_row.action = 'session.issued'
      and event_row.result = 'success'
      and event_row.correlation_id = 'corr.session-issued'
  ),
  (
    select 'session_' || pg_catalog.replace(session_row.id::text, '-', '')
    from platform.first_party_sessions as session_row
    where session_row.session_secret_hash = pg_catalog.repeat('a', 64)
  ),
  'the audit subject is the canonical session reference'
);
select pg_temp.assert_is(
  (
    select event_row.subject_type
    from audit.events as event_row
    where event_row.action = 'session.issued'
      and event_row.result = 'success'
      and event_row.correlation_id = 'corr.session-issued'
  ),
  'first_party_session',
  'the audit subject type names the session aggregate'
);

-- 005B-AC-006: lookup accepts only an unrevoked, unexpired session.
reset role;
set local role app_runtime;
select pg_temp.assert_is(
  (
    select found_session.session_role
    from platform.lookup_first_party_session(pg_catalog.repeat('a', 64)) as found_session
  ),
  'campaign_creator',
  'lookup returns the active session'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.lookup_first_party_session(pg_catalog.repeat('e', 64))
  ),
  0,
  'lookup returns nothing for an expired session'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.lookup_first_party_session(pg_catalog.repeat('f', 64))
  ),
  0,
  'lookup returns nothing for an unknown hash'
);
select pg_temp.assert_ok(
  pg_catalog.pg_get_function_result(
    pg_catalog.to_regprocedure('platform.lookup_first_party_session(text)')
  ) not like '%session_secret_hash%',
  'lookup never projects the session secret hash'
);

-- 005B-AC-007: current_role_version.
select pg_temp.assert_is(
  platform.current_role_version(
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000911',
    'creator'
  ),
  1784649600000000::bigint,
  'current_role_version returns the derived version of an active binding'
);
select pg_temp.assert_ok(
  platform.current_role_version(
    '00000000-0000-4000-8000-000000000903',
    '00000000-0000-4000-8000-00000000091a',
    'creator'
  ) is null,
  'current_role_version is null for an inactive location'
);
select pg_temp.assert_ok(
  platform.current_role_version(
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000913',
    'creator'
  ) is null,
  'current_role_version is null for a suspended user'
);
select pg_temp.assert_ok(
  platform.current_role_version(
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000916',
    'creator'
  ) is null,
  'current_role_version is null for a revoked binding'
);
select pg_temp.assert_ok(
  platform.current_role_version(
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000911',
    'publisher'
  ) is null,
  'current_role_version is null for a role the user does not hold'
);

reset role;
set local role migration_owner;
update platform.role_bindings
set revoked_at = '2026-07-21T17:00:00.000Z'
where id = '00000000-0000-4000-8000-000000000922';
insert into platform.role_bindings (id, location_id, user_id, role, granted_at)
values (
  '00000000-0000-4000-8000-00000000092b',
  '00000000-0000-4000-8000-000000000901',
  '00000000-0000-4000-8000-000000000912',
  'approver',
  '2026-07-21T18:00:00.000Z'
);
select pg_temp.assert_ok(
  platform.current_role_version(
    '00000000-0000-4000-8000-000000000901',
    '00000000-0000-4000-8000-000000000912',
    'approver'
  ) <> (
    select (extract(epoch from binding.granted_at) * 1000000)::bigint
    from platform.role_bindings as binding
    where binding.id = '00000000-0000-4000-8000-000000000922'
  ),
  'a revoke and re-grant changes the derived role version'
);

-- 005B-AC-010: resolve_review_persona.
reset role;
set local role app_runtime;
select pg_temp.assert_is(
  platform.resolve_review_persona('00000000-0000-4000-8000-000000000901', 'creator'),
  '00000000-0000-4000-8000-000000000911'::uuid,
  'resolve_review_persona returns the single active creator'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.resolve_review_persona(
      '00000000-0000-4000-8000-000000000901', 'publisher'
    )
  $sql$),
  '42501',
  'resolve_review_persona raises when no candidate exists'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.resolve_review_persona(
      '00000000-0000-4000-8000-000000000905', 'creator'
    )
  $sql$),
  '42501',
  'resolve_review_persona raises when two candidates exist'
);

-- The tenant policy on reads.
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000901',
  '00000000-0000-4000-8000-000000000911',
  'corr.session-tenant'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from platform.first_party_sessions),
  2,
  'tenant A reads only its own sessions'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.first_party_sessions as session_row
    where session_row.location_id = '00000000-0000-4000-8000-000000000902'
  ),
  0,
  'tenant A cannot read a tenant B session'
);

-- 005B-AC-008: revocation. The tenant context set above lets the subselect find
-- the tenant A session; the definer function itself needs no context.
select pg_temp.assert_ok(
  platform.revoke_first_party_session(
    (
      select session_row.id
      from platform.first_party_sessions as session_row
      where session_row.session_secret_hash = pg_catalog.repeat('a', 64)
    ),
    'sign_out',
    'corr.session-revoked'
  ),
  'the first revocation reports a changed row'
);
select pg_temp.assert_ok(
  not platform.revoke_first_party_session(
    (
      select session_row.id
      from platform.first_party_sessions as session_row
      where session_row.session_secret_hash = pg_catalog.repeat('a', 64)
    ),
    'sign_out',
    'corr.session-revoked'
  ),
  'a second revocation reports no changed row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.lookup_first_party_session(pg_catalog.repeat('a', 64))
  ),
  0,
  'lookup returns nothing after revocation'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select session_row.revocation_reason
    from platform.first_party_sessions as session_row
    where session_row.session_secret_hash = pg_catalog.repeat('a', 64)
  ),
  'sign_out',
  'revocation records the reason'
);
select pg_temp.assert_ok(
  (
    select session_row.revoked_at is not null
    from platform.first_party_sessions as session_row
    where session_row.session_secret_hash = pg_catalog.repeat('a', 64)
  ),
  'revocation records the instant'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from audit.events as event_row
    where event_row.action = 'session.revoked'
      and event_row.result = 'success'
      and event_row.correlation_id = 'corr.session-revoked'
  ),
  1,
  'revocation writes exactly one audit row'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.revoke_first_party_session(
      '00000000-0000-4000-8000-000000000942', 'nonsense', 'corr.session-revoked'
    )
  $sql$),
  '42501',
  'revocation refuses a reason outside the documented set'
);

-- 005B-AC-009: identity columns are immutable and rows cannot be deleted.
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    update platform.first_party_sessions
    set location_id = '00000000-0000-4000-8000-000000000901'
    where id = '00000000-0000-4000-8000-000000000942'
  $sql$),
  '55000',
  'an identity column cannot be changed'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    update platform.first_party_sessions
    set expires_at = pg_catalog.now() + interval '20 days'
    where id = '00000000-0000-4000-8000-000000000942'
  $sql$),
  '55000',
  'the expiry timestamp cannot be changed'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    delete from platform.first_party_sessions
    where id = '00000000-0000-4000-8000-000000000942'
  $sql$),
  '55000',
  'a session row cannot be deleted'
);
select pg_temp.assert_ok(
  pg_temp.capture_sqlstate($sql$
    update platform.first_party_sessions
    set revoked_at = pg_catalog.now(), revocation_reason = 'operator'
    where id = '00000000-0000-4000-8000-000000000941'
  $sql$) is null,
  'the operational columns remain writable'
);

-- platform.touch_first_party_session moves only an active session.
reset role;
set local role app_runtime;
select platform.touch_first_party_session('00000000-0000-4000-8000-000000000942');
select platform.touch_first_party_session('00000000-0000-4000-8000-000000000941');
reset role;
set local role migration_owner;
select pg_temp.assert_ok(
  (
    select session_row.last_seen_at is not null
    from platform.first_party_sessions as session_row
    where session_row.id = '00000000-0000-4000-8000-000000000942'
  ),
  'touch moves last_seen_at on an active session'
);
select pg_temp.assert_ok(
  (
    select session_row.last_seen_at is null
    from platform.first_party_sessions as session_row
    where session_row.id = '00000000-0000-4000-8000-000000000941'
  ),
  'touch leaves an expired and revoked session untouched'
);

-- The predicates back the 005a identity directory and never raise.
select pg_temp.assert_ok(
  platform.location_is_active('00000000-0000-4000-8000-000000000901'),
  'location_is_active accepts an active location'
);
select pg_temp.assert_ok(
  not platform.location_is_active('00000000-0000-4000-8000-000000000903'),
  'location_is_active refuses a suspended location'
);
select pg_temp.assert_ok(
  not platform.location_is_active(null),
  'location_is_active returns false rather than raising on null'
);
select pg_temp.assert_ok(
  platform.actor_is_active('00000000-0000-4000-8000-000000000911'),
  'actor_is_active accepts an active user'
);
select pg_temp.assert_ok(
  not platform.actor_is_active('00000000-0000-4000-8000-000000000913'),
  'actor_is_active refuses a suspended user'
);
select pg_temp.assert_ok(
  not platform.actor_is_active(null),
  'actor_is_active returns false rather than raising on null'
);

reset role;
select * from finish();

rollback;
