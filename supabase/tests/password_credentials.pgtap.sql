-- PRD-006a acceptance criteria 006A-AC-001 through 006A-AC-009.
--
-- Style follows supabase/tests/first_party_sessions.pgtap.sql: fixed UUIDs,
-- `set local role migration_owner` for seeding, pg_temp.capture_sqlstate for
-- refusal paths, and pg_temp.assert_* wrappers on every assertion. The wrappers
-- are security definer and owned by the login role, because this file holds
-- `migration_owner` for the owner-only reads and `app_runtime` for the definer
-- calls, and neither of those roles can see pgTAP's own functions.
--
-- Audit counts are always filtered by a correlation reference unique to the
-- case that wrote them, so a count proves what that one call did rather than
-- what the whole file happened to leave behind.

begin;

select plan(109);

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

-- A structurally valid Argon2id PHC string. The bytes are meaningless: nothing
-- in the database derives or verifies a password, so what is under test here is
-- the shape the column accepts.
create function pg_temp.sample_password_hash(tag_character text)
returns text
language sql
immutable
as $function$
  select '$argon2id$v=19$m=19456,t=2,p=1$'
    || pg_catalog.repeat('A', 22) || '$' || pg_catalog.repeat(tag_character, 43)
$function$;

create function pg_temp.token_hash(seed text)
returns text
language sql
immutable
as $function$
  select pg_catalog.encode(pg_catalog.sha256(seed::bytea), 'hex')
$function$;

-- A volatile set-returning function in FROM with no correlated argument is not
-- guaranteed to be re-evaluated per outer row, so a `generate_series` cross join
-- is the wrong way to make N sign-in attempts. This loops instead, with invoker
-- rights, so each call runs as whatever role the caller holds.
create function pg_temp.fail_sign_in_repeatedly(
  target uuid,
  correlation text,
  attempts integer
)
returns timestamptz
language plpgsql
volatile
as $function$
declare
  last_lock timestamptz;
begin
  for attempt in 1..attempts loop
    select failure.locked_until
      into last_lock
    from platform.record_password_sign_in_failure(target, correlation) as failure;
  end loop;
  return last_lock;
end
$function$;

-- `platform.first_party_sessions` carries an app_runtime policy keyed on the
-- tenant context, and these cases run before any context exists, so a caller
-- holding app_runtime reads nothing from it. This is the owner read that lets a
-- case name the session it wants kept.
create function pg_temp.session_id_for_correlation(correlation text)
returns uuid
language sql
stable
security definer
as $function$
  select session_row.id
  from platform.first_party_sessions as session_row
  where session_row.correlation_id = session_id_for_correlation.correlation
$function$;

create function pg_temp.audit_count(correlation text, expected_action text)
returns integer
language sql
stable
security definer
as $function$
  select pg_catalog.count(*)::integer
  from audit.events as event
  where event.correlation_id = audit_count.correlation
    and event.action = audit_count.expected_action
$function$;

create function pg_temp.audit_count_at(
  correlation text,
  expected_action text,
  expected_location uuid
)
returns integer
language sql
stable
security definer
as $function$
  select pg_catalog.count(*)::integer
  from audit.events as event
  where event.correlation_id = audit_count_at.correlation
    and event.action = audit_count_at.expected_action
    and event.location_id = audit_count_at.expected_location
$function$;

insert into platform.locations (id, display_name, status)
values
  ('00000000-0000-4000-8000-000000000b01', 'Credential Tenant A', 'active'),
  ('00000000-0000-4000-8000-000000000b02', 'Credential Tenant B', 'active');

insert into platform.app_users (id, safe_display_name, status)
values
  ('00000000-0000-4000-8000-000000000b11', 'Credential Signer', 'active'),
  ('00000000-0000-4000-8000-000000000b12', 'Credential Suspended', 'suspended'),
  ('00000000-0000-4000-8000-000000000b13', 'Credential Deleted', 'deleted'),
  ('00000000-0000-4000-8000-000000000b14', 'Credential Token Holder', 'active'),
  ('00000000-0000-4000-8000-000000000b15', 'Credential Multi Workspace', 'active'),
  ('00000000-0000-4000-8000-000000000b16', 'Credential Session Holder', 'active');

insert into platform.marketplace_installations (
  id, location_id, marketplace_app_id, external_install_id, status
)
values
  (
    '00000000-0000-4000-8000-000000000b21',
    '00000000-0000-4000-8000-000000000b01',
    'oalo-credential-tests',
    null,
    'pending'
  ),
  (
    '00000000-0000-4000-8000-000000000b22',
    '00000000-0000-4000-8000-000000000b02',
    'oalo-credential-tests',
    null,
    'pending'
  );

insert into platform.role_bindings (id, location_id, user_id, role, granted_at)
values
  (
    '00000000-0000-4000-8000-000000000b31',
    '00000000-0000-4000-8000-000000000b01',
    '00000000-0000-4000-8000-000000000b11',
    'creator',
    pg_catalog.now() - interval '5 days'
  ),
  (
    '00000000-0000-4000-8000-000000000b32',
    '00000000-0000-4000-8000-000000000b01',
    '00000000-0000-4000-8000-000000000b14',
    'approver',
    pg_catalog.now() - interval '5 days'
  ),
  (
    '00000000-0000-4000-8000-000000000b33',
    '00000000-0000-4000-8000-000000000b01',
    '00000000-0000-4000-8000-000000000b15',
    'creator',
    pg_catalog.now() - interval '4 days'
  ),
  (
    '00000000-0000-4000-8000-000000000b34',
    '00000000-0000-4000-8000-000000000b02',
    '00000000-0000-4000-8000-000000000b15',
    'location_admin',
    pg_catalog.now() - interval '3 days'
  ),
  (
    '00000000-0000-4000-8000-000000000b35',
    '00000000-0000-4000-8000-000000000b01',
    '00000000-0000-4000-8000-000000000b16',
    'location_admin',
    pg_catalog.now() - interval '5 days'
  ),
  (
    '00000000-0000-4000-8000-000000000b36',
    '00000000-0000-4000-8000-000000000b01',
    '00000000-0000-4000-8000-000000000b12',
    'creator',
    pg_catalog.now() - interval '5 days'
  ),
  (
    '00000000-0000-4000-8000-000000000b37',
    '00000000-0000-4000-8000-000000000b01',
    '00000000-0000-4000-8000-000000000b13',
    'publisher',
    pg_catalog.now() - interval '5 days'
  );

insert into platform.user_credentials (
  user_id, email_normalized, email_display, password_hash, email_verified_at
)
values
  (
    '00000000-0000-4000-8000-000000000b11',
    'signer@credentials.test',
    'Signer@Credentials.test',
    pg_temp.sample_password_hash('B'),
    pg_catalog.now()
  ),
  (
    '00000000-0000-4000-8000-000000000b12',
    'suspended@credentials.test',
    'suspended@credentials.test',
    pg_temp.sample_password_hash('C'),
    null
  ),
  (
    '00000000-0000-4000-8000-000000000b13',
    'deleted@credentials.test',
    'deleted@credentials.test',
    pg_temp.sample_password_hash('D'),
    null
  ),
  (
    '00000000-0000-4000-8000-000000000b14',
    'tokens@credentials.test',
    'tokens@credentials.test',
    pg_temp.sample_password_hash('E'),
    null
  ),
  (
    '00000000-0000-4000-8000-000000000b16',
    'sessions@credentials.test',
    'sessions@credentials.test',
    pg_temp.sample_password_hash('F'),
    null
  );

-- 006A-AC-001: the three tables, their shape, their isolation.
-- Catalog queries stand in for has_table and columns_are, for the reason
-- supabase/tests/first_party_sessions.pgtap.sql gives: both helpers are
-- overloaded on (text, text, text) and an untyped literal cannot pick one.
select pg_temp.assert_ok(pg_catalog.to_regclass('platform.user_credentials') is not null, 'user_credentials exists');
select pg_temp.assert_ok(pg_catalog.to_regclass('platform.credential_tokens') is not null, 'credential_tokens exists');
select pg_temp.assert_ok(pg_catalog.to_regclass('platform.auth_rate_limits') is not null, 'auth_rate_limits exists');

select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(column_row.attname::text order by column_row.attnum)
    from pg_catalog.pg_attribute as column_row
    where column_row.attrelid = 'platform.user_credentials'::regclass
      and column_row.attnum > 0
      and not column_row.attisdropped
  ),
  array[
    'user_id', 'email_normalized', 'email_display', 'email_verified_at', 'password_hash',
    'password_set_at', 'password_rotated_at', 'failed_attempt_count', 'locked_until',
    'created_at', 'updated_at'
  ],
  'user_credentials carries exactly the D1 columns'
);
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(column_row.attname::text order by column_row.attnum)
    from pg_catalog.pg_attribute as column_row
    where column_row.attrelid = 'platform.credential_tokens'::regclass
      and column_row.attnum > 0
      and not column_row.attisdropped
  ),
  array[
    'id', 'user_id', 'purpose', 'token_hash', 'issued_at', 'expires_at',
    'consumed_at', 'superseded_at', 'correlation_id'
  ],
  'credential_tokens carries exactly the D1 columns'
);
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(column_row.attname::text order by column_row.attnum)
    from pg_catalog.pg_attribute as column_row
    where column_row.attrelid = 'platform.auth_rate_limits'::regclass
      and column_row.attnum > 0
      and not column_row.attisdropped
  ),
  array['scope', 'key_hash', 'window_start', 'attempt_count'],
  'auth_rate_limits carries exactly the D1 columns'
);

select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_class as table_row
    where table_row.relnamespace = 'platform'::regnamespace
      and table_row.relname in ('user_credentials', 'credential_tokens', 'auth_rate_limits')
      and table_row.relrowsecurity
      and table_row.relforcerowsecurity
  ),
  3,
  'row level security is enabled and forced on all three credential tables'
);

select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_policies as policy_row
    where policy_row.schemaname = 'platform'
      and policy_row.tablename in ('user_credentials', 'credential_tokens', 'auth_rate_limits')
      and policy_row.roles = array['migration_owner']::name[]
      and policy_row.cmd = 'ALL'
  ),
  3,
  'each credential table carries exactly one migration_owner policy'
);

select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_policies as policy_row
    where policy_row.schemaname = 'platform'
      and policy_row.tablename in ('user_credentials', 'credential_tokens', 'auth_rate_limits')
  ),
  3,
  'the credential tables carry no policy beyond the migration_owner one'
);

select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_class as table_row
    cross join unnest(array['app_runtime', 'support_runtime']) as runtime_role(name)
    cross join unnest(
      array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
    ) as privilege(name)
    where table_row.relnamespace = 'platform'::regnamespace
      and table_row.relname in ('user_credentials', 'credential_tokens', 'auth_rate_limits')
      and has_table_privilege(runtime_role.name, table_row.oid, privilege.name)
  ),
  0,
  'neither runtime role holds any privilege on any credential table'
);

select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.user_credentials (user_id, email_normalized, email_display, password_hash)
    values (
      '00000000-0000-4000-8000-000000000b15', 'Mixed@Credentials.test',
      'Mixed@Credentials.test', pg_temp.sample_password_hash('G')
    )
  $sql$),
  '23514',
  'an email address that is not already normalized is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.user_credentials (user_id, email_normalized, email_display, password_hash)
    values (
      '00000000-0000-4000-8000-000000000b15', 'not-an-address',
      'not-an-address', pg_temp.sample_password_hash('G')
    )
  $sql$),
  '23514',
  'an email address without an at sign and a dot is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.user_credentials (user_id, email_normalized, email_display, password_hash)
    values (
      '00000000-0000-4000-8000-000000000b15', 'shape@credentials.test',
      'shape@credentials.test', 'plaintext-password'
    )
  $sql$),
  '23514',
  'a password hash outside the PHC shape is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.user_credentials (user_id, email_normalized, email_display, password_hash)
    values (
      '00000000-0000-4000-8000-000000000b15', 'signer@credentials.test',
      'signer@credentials.test', pg_temp.sample_password_hash('G')
    )
  $sql$),
  '23505',
  'a duplicate normalized email address is refused by the unique index'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.credential_tokens (user_id, purpose, token_hash, expires_at, correlation_id)
    values (
      '00000000-0000-4000-8000-000000000b11', 'password_reset', 'not-a-hash',
      pg_catalog.now() + interval '30 minutes', 'corr.shape'
    )
  $sql$),
  '23514',
  'a token hash outside the 64-character hex shape is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.credential_tokens (user_id, purpose, token_hash, expires_at, correlation_id)
    values (
      '00000000-0000-4000-8000-000000000b11', 'password_reset', pg_temp.token_hash('too-long'),
      pg_catalog.now() + interval '25 hours', 'corr.shape'
    )
  $sql$),
  '23514',
  'a credential token that outlives twenty-four hours is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.credential_tokens (user_id, purpose, token_hash, expires_at, correlation_id)
    values (
      '00000000-0000-4000-8000-000000000b11', 'invented_purpose', pg_temp.token_hash('purpose'),
      pg_catalog.now() + interval '30 minutes', 'corr.shape'
    )
  $sql$),
  '23514',
  'a credential token purpose outside the closed list is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.auth_rate_limits (scope, key_hash, window_start, attempt_count)
    values ('invented_scope', pg_temp.token_hash('scope'), pg_catalog.now(), 1)
  $sql$),
  '23514',
  'a rate-limit scope outside the closed list is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.auth_rate_limits (scope, key_hash, window_start, attempt_count)
    values ('sign_in_ip', pg_temp.token_hash('zero'), pg_catalog.now(), 0)
  $sql$),
  '23514',
  'a rate-limit counter of zero is refused'
);

-- 006A-AC-002: the two widened checks and the dropped function.
insert into platform.first_party_sessions (
  session_secret_hash, location_id, user_id, role_binding_id, installation_id,
  session_role, role_version, issued_by, expires_at, correlation_id
)
values (
  pg_temp.token_hash('widened-password-sign-in'),
  '00000000-0000-4000-8000-000000000b01',
  '00000000-0000-4000-8000-000000000b11',
  '00000000-0000-4000-8000-000000000b31',
  '00000000-0000-4000-8000-000000000b21',
  'campaign_creator',
  1,
  'password_sign_in',
  pg_catalog.now() + interval '12 hours',
  'corr.widened.sign-in'
);
select pg_temp.assert_is(
  (
    select session_row.issued_by
    from platform.first_party_sessions as session_row
    where session_row.correlation_id = 'corr.widened.sign-in'
  ),
  'password_sign_in',
  'issued_by accepts password_sign_in'
);

insert into platform.first_party_sessions (
  session_secret_hash, location_id, user_id, role_binding_id, installation_id,
  session_role, role_version, issued_by, expires_at, correlation_id
)
values (
  pg_temp.token_hash('widened-password-reset'),
  '00000000-0000-4000-8000-000000000b01',
  '00000000-0000-4000-8000-000000000b11',
  '00000000-0000-4000-8000-000000000b31',
  '00000000-0000-4000-8000-000000000b21',
  'campaign_creator',
  1,
  'password_reset',
  pg_catalog.now() + interval '12 hours',
  'corr.widened.reset'
);
select pg_temp.assert_is(
  (
    select session_row.issued_by
    from platform.first_party_sessions as session_row
    where session_row.correlation_id = 'corr.widened.reset'
  ),
  'password_reset',
  'issued_by accepts password_reset'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.first_party_sessions (
      session_secret_hash, location_id, user_id, role_binding_id, installation_id,
      session_role, role_version, issued_by, expires_at, correlation_id
    )
    values (
      pg_temp.token_hash('widened-invented'),
      '00000000-0000-4000-8000-000000000b01',
      '00000000-0000-4000-8000-000000000b11',
      '00000000-0000-4000-8000-000000000b31',
      '00000000-0000-4000-8000-000000000b21',
      'campaign_creator', 1, 'invented_issuer',
      pg_catalog.now() + interval '12 hours', 'corr.widened.invented'
    )
  $sql$),
  '23514',
  'issued_by still refuses a value outside the widened list'
);

update platform.first_party_sessions
set revoked_at = pg_catalog.now(), revocation_reason = 'password_changed'
where correlation_id = 'corr.widened.reset';
select pg_temp.assert_is(
  (
    select session_row.revocation_reason
    from platform.first_party_sessions as session_row
    where session_row.correlation_id = 'corr.widened.reset'
  ),
  'password_changed',
  'revocation_reason accepts password_changed'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    update platform.first_party_sessions
    set revoked_at = pg_catalog.now(), revocation_reason = 'invented_reason'
    where correlation_id = 'corr.widened.sign-in'
  $sql$),
  '23514',
  'revocation_reason still refuses a value outside the widened list'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure('platform.resolve_review_persona(uuid, text)') is null,
  'resolve_review_persona is gone'
);

-- 006A-AC-003: the credential functions, their definer status, their grants.
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure('platform.lookup_password_credential(text)') is not null,
  'lookup_password_credential exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure(
    'platform.lookup_password_credential_for_user(uuid)'
  ) is not null,
  'lookup_password_credential_for_user exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure('platform.list_sign_in_bindings(uuid)') is not null,
  'list_sign_in_bindings exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure(
    'platform.record_password_sign_in_failure(uuid, text)'
  ) is not null,
  'record_password_sign_in_failure exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure(
    'platform.record_password_sign_in_success(uuid, text)'
  ) is not null,
  'record_password_sign_in_success exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure(
    'platform.issue_credential_token(uuid, text, text, integer, text)'
  ) is not null,
  'issue_credential_token exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure('platform.consume_credential_token(text, text)') is not null,
  'consume_credential_token exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure(
    'platform.revoke_all_first_party_sessions_for_user(uuid, text, text, uuid)'
  ) is not null,
  'revoke_all_first_party_sessions_for_user exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure('platform.set_password(uuid, text, text, text, uuid)') is not null,
  'set_password exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure(
    'platform.register_password_account(text, text, text, text, text, text)'
  ) is not null,
  'register_password_account exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure('platform.mark_email_verified(uuid, text)') is not null,
  'mark_email_verified exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure(
    'platform.record_email_delivery(uuid, text, text, text, text)'
  ) is not null,
  'record_email_delivery exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure(
    'platform.consume_auth_rate_limit(text, text, integer, integer)'
  ) is not null,
  'consume_auth_rate_limit exists'
);
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure('platform.primary_location_for_user(uuid)') is not null,
  'primary_location_for_user exists'
);

select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_proc as routine
    where routine.pronamespace = 'platform'::regnamespace
      and routine.proname in (
        'lookup_password_credential', 'lookup_password_credential_for_user',
        'list_sign_in_bindings',
        'record_password_sign_in_failure', 'record_password_sign_in_success',
        'issue_credential_token', 'consume_credential_token',
        'revoke_all_first_party_sessions_for_user', 'set_password',
        'register_password_account', 'mark_email_verified', 'consume_auth_rate_limit',
        'record_email_delivery', 'primary_location_for_user'
      )
      and routine.proowner = 'migration_owner'::regrole
      and routine.prosecdef
      and routine.proconfig @> array['search_path=""']
  ),
  14,
  'all fourteen credential functions are migration_owner security definer with an empty search path'
);

select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_proc as routine
    where routine.pronamespace = 'platform'::regnamespace
      and routine.proname in (
        'lookup_password_credential', 'lookup_password_credential_for_user',
        'list_sign_in_bindings',
        'record_password_sign_in_failure', 'record_password_sign_in_success',
        'issue_credential_token', 'consume_credential_token',
        'revoke_all_first_party_sessions_for_user', 'set_password',
        'register_password_account', 'mark_email_verified', 'consume_auth_rate_limit',
        'record_email_delivery'
      )
      and has_function_privilege('app_runtime', routine.oid, 'EXECUTE')
  ),
  13,
  'app runtime can execute the thirteen application-callable credential functions'
);

select pg_temp.assert_ok(
  not has_function_privilege(
    'app_runtime',
    pg_catalog.to_regprocedure('platform.primary_location_for_user(uuid)')::oid,
    'EXECUTE'
  ),
  'app runtime cannot execute the internal primary-location helper'
);

select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_proc as routine
    where routine.pronamespace = 'platform'::regnamespace
      and routine.proname in (
        'lookup_password_credential', 'lookup_password_credential_for_user',
        'list_sign_in_bindings',
        'record_password_sign_in_failure', 'record_password_sign_in_success',
        'issue_credential_token', 'consume_credential_token',
        'revoke_all_first_party_sessions_for_user', 'set_password',
        'register_password_account', 'mark_email_verified', 'consume_auth_rate_limit',
        'record_email_delivery', 'primary_location_for_user'
      )
      and (
        has_function_privilege('public', routine.oid, 'EXECUTE')
        or has_function_privilege('support_runtime', routine.oid, 'EXECUTE')
        or has_function_privilege('scheduler_runtime', routine.oid, 'EXECUTE')
        or has_function_privilege('reporting_runtime', routine.oid, 'EXECUTE')
      )
  ),
  0,
  'no other role can execute any credential function'
);

reset role;
set local role app_runtime;

-- 006A-AC-004: lookup_password_credential.
select pg_temp.assert_is(
  (
    select lookup.user_id
    from platform.lookup_password_credential('signer@credentials.test') as lookup
  ),
  '00000000-0000-4000-8000-000000000b11'::uuid,
  'lookup_password_credential finds the stored account'
);
select pg_temp.assert_is(
  (
    select lookup.email_verified
    from platform.lookup_password_credential('signer@credentials.test') as lookup
  ),
  true,
  'lookup_password_credential reports a confirmed email address'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.lookup_password_credential('nobody@credentials.test') as lookup
  ),
  0,
  'lookup_password_credential finds nothing for an unknown email address'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.lookup_password_credential('suspended@credentials.test') as lookup
  ),
  0,
  'lookup_password_credential finds nothing for a suspended person'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.lookup_password_credential('deleted@credentials.test') as lookup
  ),
  0,
  'lookup_password_credential finds nothing for a deleted person'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select * from platform.lookup_password_credential('nobody@credentials.test')
  $sql$),
  null::text,
  'lookup_password_credential never raises'
);
select pg_temp.assert_is(
  (
    select lookup.password_hash
    from platform.lookup_password_credential_for_user(
      '00000000-0000-4000-8000-000000000b11'
    ) as lookup
  ),
  (
    select lookup.password_hash
    from platform.lookup_password_credential('signer@credentials.test') as lookup
  ),
  'the by-person read returns the same credential as the by-address read'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.lookup_password_credential_for_user(
      '00000000-0000-4000-8000-000000000b12'
    ) as lookup
  ),
  0,
  'the by-person read finds nothing for a suspended person'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select * from platform.lookup_password_credential_for_user(
      '00000000-0000-4000-8000-0000000009ff'
    )
  $sql$),
  null::text,
  'the by-person read never raises'
);

-- list_sign_in_bindings: the closed list the choose step offers.
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.list_sign_in_bindings('00000000-0000-4000-8000-000000000b15') as binding
  ),
  2,
  'list_sign_in_bindings lists both active workspaces'
);
select pg_temp.assert_is(
  (
    select binding.location_display_name
    from platform.list_sign_in_bindings('00000000-0000-4000-8000-000000000b15') as binding
    limit 1
  ),
  'Credential Tenant A',
  'list_sign_in_bindings orders by the instant the binding was granted'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.list_sign_in_bindings('00000000-0000-4000-8000-000000000b12') as binding
  ),
  0,
  'list_sign_in_bindings lists nothing for a suspended person'
);

-- 006A-AC-005: the failure counter, the lockout, and the reset on success.
select pg_temp.assert_is(
  (
    select failure.locked_until
    from platform.record_password_sign_in_failure(
      '00000000-0000-4000-8000-000000000b11', 'corr.failure.first'
    ) as failure
  ),
  null::timestamptz,
  'the first failure does not lock the account'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.failure.first', 'auth.sign-in'),
  1,
  'one failure writes exactly one denied sign-in row'
);
select pg_temp.assert_is(
  pg_temp.audit_count_at(
    'corr.failure.first', 'auth.sign-in', '00000000-0000-4000-8000-000000000b01'
  ),
  1,
  'the denied sign-in row lands on the primary workspace'
);

select pg_temp.assert_is(
  pg_temp.fail_sign_in_repeatedly(
    '00000000-0000-4000-8000-000000000b11', 'corr.failure.run', 8
  ),
  null::timestamptz,
  'failures two through nine leave the account unlocked'
);
select pg_temp.assert_ok(
  (
    select failure.locked_until > pg_catalog.now() + interval '14 minutes'
      and failure.locked_until <= pg_catalog.now() + interval '15 minutes'
    from platform.record_password_sign_in_failure(
      '00000000-0000-4000-8000-000000000b11', 'corr.failure.tenth'
    ) as failure
  ),
  'the tenth consecutive failure locks the account for fifteen minutes'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.failure.tenth', 'auth.lockout'),
  1,
  'the lockout writes exactly one lockout row'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.failure.run', 'auth.lockout')
    + pg_temp.audit_count('corr.failure.first', 'auth.lockout'),
  0,
  'no lockout row is written before the tenth failure'
);
select pg_temp.assert_ok(
  (
    select failure.locked_until is not null
    from platform.record_password_sign_in_failure(
      '00000000-0000-4000-8000-000000000b11', 'corr.failure.eleventh'
    ) as failure
  ),
  'an eleventh failure keeps the account locked'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.failure.eleventh', 'auth.lockout'),
  0,
  'the lockout row is written once, not on every failure after it'
);

select platform.record_password_sign_in_success(
  '00000000-0000-4000-8000-000000000b11', 'corr.success.first'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.success.first', 'auth.sign-in'),
  1,
  'a successful sign-in writes exactly one sign-in row'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select credential.failed_attempt_count
    from platform.user_credentials as credential
    where credential.user_id = '00000000-0000-4000-8000-000000000b11'
  ),
  0,
  'a successful sign-in resets the failure counter'
);
select pg_temp.assert_is(
  (
    select credential.locked_until
    from platform.user_credentials as credential
    where credential.user_id = '00000000-0000-4000-8000-000000000b11'
  ),
  null::timestamptz,
  'a successful sign-in clears the lock'
);

reset role;
set local role app_runtime;

-- 006A-AC-006: credential tokens.
select platform.issue_credential_token(
  '00000000-0000-4000-8000-000000000b14',
  'password_reset',
  pg_temp.token_hash('reset-one'),
  1800,
  'corr.token.first'
);
select platform.issue_credential_token(
  '00000000-0000-4000-8000-000000000b14',
  'password_reset',
  pg_temp.token_hash('reset-two'),
  1800,
  'corr.token.second'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.token.first', 'auth.reset-requested'),
  1,
  'issuing a reset token writes one reset-requested row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.consume_credential_token(
      pg_temp.token_hash('reset-one'), 'password_reset'
    ) as consumed
  ),
  0,
  'a superseded token cannot be consumed'
);
select pg_temp.assert_is(
  (
    select consumed.user_id
    from platform.consume_credential_token(
      pg_temp.token_hash('reset-two'), 'password_reset'
    ) as consumed
  ),
  '00000000-0000-4000-8000-000000000b14'::uuid,
  'the live token consumes once and names its person'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.consume_credential_token(
      pg_temp.token_hash('reset-two'), 'password_reset'
    ) as consumed
  ),
  0,
  'the same token cannot be consumed twice'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.consume_credential_token(
      pg_temp.token_hash('never-issued'), 'password_reset'
    ) as consumed
  ),
  0,
  'an unknown token hash consumes nothing'
);

select platform.issue_credential_token(
  '00000000-0000-4000-8000-000000000b14',
  'email_verification',
  pg_temp.token_hash('verify-one'),
  86400,
  'corr.token.verify'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.token.verify', 'auth.verification-requested'),
  1,
  'issuing a verification token writes one verification-requested row'
);
select pg_temp.assert_ok(
  platform.record_email_delivery(
    '00000000-0000-4000-8000-000000000b14',
    'auth.reset-email',
    'failed',
    'not_configured',
    'corr.email.notconfigured'
  ),
  'a send with no sending domain records a failed delivery'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.email.notconfigured', 'auth.reset-email'),
  1,
  'the not-configured delivery writes exactly one row'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.record_email_delivery(
      '00000000-0000-4000-8000-000000000b14', 'auth.marketing-blast', 'success', 'x', 'corr.x'
    )
  $sql$),
  '42501',
  'record_email_delivery refuses an action outside the two it exists for'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.consume_credential_token(
      pg_temp.token_hash('verify-one'), 'password_reset'
    ) as consumed
  ),
  0,
  'a token consumed under the wrong purpose consumes nothing'
);

select platform.issue_credential_token(
  '00000000-0000-4000-8000-000000000b14',
  'sign_in_choice',
  pg_temp.token_hash('choice-one'),
  300,
  'corr.token.choice'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from audit.events as event
    where event.correlation_id = 'corr.token.choice'
  ),
  0,
  'issuing a sign-in choice token writes no audit row of its own'
);

reset role;
set local role migration_owner;
insert into platform.credential_tokens (
  user_id, purpose, token_hash, issued_at, expires_at, correlation_id
)
values (
  '00000000-0000-4000-8000-000000000b14',
  'password_reset',
  pg_temp.token_hash('expired-one'),
  pg_catalog.now() - interval '2 hours',
  pg_catalog.now() - interval '1 hour',
  'corr.token.expired'
);
reset role;
set local role app_runtime;
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.consume_credential_token(
      pg_temp.token_hash('expired-one'), 'password_reset'
    ) as consumed
  ),
  0,
  'an expired token consumes nothing'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.issue_credential_token(
      '00000000-0000-4000-8000-000000000b14', 'invented', pg_catalog.repeat('a', 64), 60, 'corr.x'
    )
  $sql$),
  '42501',
  'issue_credential_token refuses a purpose outside the closed list'
);

-- 006A-AC-007: set_password and the bulk revoke.
select pg_temp.assert_is(
  platform.set_password(
    '00000000-0000-4000-8000-000000000b16',
    '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
    'initial',
    'corr.password.initial'
  ),
  0,
  'setting a first password with no live session revokes nothing'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select credential.password_rotated_at
    from platform.user_credentials as credential
    where credential.user_id = '00000000-0000-4000-8000-000000000b16'
  ),
  null::timestamptz,
  'an initial password rotates nothing'
);
reset role;
set local role app_runtime;

select pg_temp.assert_ok(
  (
    select (
      platform.issue_first_party_session(
        '00000000-0000-4000-8000-000000000b01',
        '00000000-0000-4000-8000-000000000b16',
        'location_admin',
        'location_admin',
        pg_temp.token_hash('live-session-one'),
        43200,
        'password_sign_in',
        'corr.session.one'
      )
    ).id is not null
  ),
  'a password sign-in issues a session through the existing issuance path'
);
select pg_temp.assert_ok(
  (
    select (
      platform.issue_first_party_session(
        '00000000-0000-4000-8000-000000000b01',
        '00000000-0000-4000-8000-000000000b16',
        'location_admin',
        'location_admin',
        pg_temp.token_hash('live-session-two'),
        43200,
        'password_sign_in',
        'corr.session.two'
      )
    ).id is not null
  ),
  'a second password sign-in issues a second session'
);
select pg_temp.assert_ok(
  (
    select (
      platform.issue_first_party_session(
        '00000000-0000-4000-8000-000000000b01',
        '00000000-0000-4000-8000-000000000b16',
        'location_admin',
        'location_admin',
        pg_temp.token_hash('live-session-three'),
        43200,
        'password_sign_in',
        'corr.session.three'
      )
    ).id is not null
  ),
  'a third password sign-in issues a third session'
);

select pg_temp.assert_is(
  platform.set_password(
    '00000000-0000-4000-8000-000000000b16',
    '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
    'change',
    'corr.password.change',
    pg_temp.session_id_for_correlation('corr.session.three')
  ),
  2,
  'a password change revokes every session except the one making the change'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.password.change', 'session.revoked'),
  2,
  'the password change writes one revocation row per revoked session'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.password.change', 'auth.sessions-revoked'),
  1,
  'the password change writes one sessions-revoked summary row'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.password.change', 'auth.password-changed'),
  1,
  'the password change writes one password-changed row'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select session_row.revocation_reason
    from platform.first_party_sessions as session_row
    where session_row.correlation_id = 'corr.session.one'
  ),
  'password_changed',
  'a revoked session records why it was revoked'
);
select pg_temp.assert_is(
  (
    select session_row.revoked_at
    from platform.first_party_sessions as session_row
    where session_row.correlation_id = 'corr.session.three'
  ),
  null::timestamptz,
  'the session making the change survives it'
);
select pg_temp.assert_ok(
  (
    select credential.password_rotated_at is not null
      and credential.failed_attempt_count = 0
      and credential.locked_until is null
    from platform.user_credentials as credential
    where credential.user_id = '00000000-0000-4000-8000-000000000b16'
  ),
  'a password change rotates, and clears the counter and the lock'
);
reset role;
set local role app_runtime;

select pg_temp.assert_is(
  platform.set_password(
    '00000000-0000-4000-8000-000000000b16',
    '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ',
    'reset',
    'corr.password.reset'
  ),
  1,
  'a reset with no kept session revokes the one that is left'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.set_password(
      '00000000-0000-4000-8000-000000000b16',
      '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
      'invented_reason',
      'corr.password.invented'
    )
  $sql$),
  '42501',
  'set_password refuses a reason outside the closed list'
);

-- 006A-AC-008: register_password_account.
select pg_temp.assert_ok(
  (
    select registered.user_id is not null
      and registered.location_id is not null
      and registered.installation_id is not null
      and registered.binding_id is not null
    from platform.register_password_account(
      'newcomer@credentials.test',
      'Newcomer@Credentials.test',
      '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL',
      'Dana Newcomer',
      'Dana''s workspace',
      'corr.signup.first'
    ) as registered
  ),
  'register_password_account returns all four new references'
);
select pg_temp.assert_is(
  pg_temp.audit_count('corr.signup.first', 'auth.sign-up'),
  1,
  'register_password_account writes one sign-up row'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select * from platform.register_password_account(
      'newcomer@credentials.test',
      'newcomer@credentials.test',
      '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'Dana Twice',
      'Second workspace',
      'corr.signup.duplicate'
    )
  $sql$),
  '23505',
  'a duplicate email address refuses with the unique violation'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select * from platform.register_password_account(
      'Mixed@Credentials.test', 'Mixed@Credentials.test',
      '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN',
      'Mixed Case', 'Mixed workspace', 'corr.signup.mixed'
    )
  $sql$),
  '42501',
  'register_password_account refuses an email address that is not normalized'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select * from platform.register_password_account(
      'no-at-sign', 'no-at-sign',
      '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
      'No At Sign', 'No workspace', 'corr.signup.malformed'
    )
  $sql$),
  '42501',
  'register_password_account refuses a malformed email address'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select * from platform.register_password_account(
      'blankname@credentials.test', 'blankname@credentials.test',
      '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
      '', 'Blank workspace', 'corr.signup.blank'
    )
  $sql$),
  '42501',
  'register_password_account refuses an empty display name'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.user_credentials as credential
    where credential.email_normalized = 'newcomer@credentials.test'
  ),
  1,
  'the refused duplicate created no second credential row'
);
select pg_temp.assert_ok(
  (
    select installation.status = 'pending' and installation.marketplace_app_id = 'oalo-self-serve'
    from platform.marketplace_installations as installation
    join platform.user_credentials as credential
      on credential.email_normalized = 'newcomer@credentials.test'
    join platform.role_bindings as binding
      on binding.user_id = credential.user_id
     and binding.location_id = installation.location_id
  ),
  'the new workspace carries a pending self-serve installation'
);
select pg_temp.assert_is(
  (
    select binding.role
    from platform.role_bindings as binding
    join platform.user_credentials as credential on credential.user_id = binding.user_id
    where credential.email_normalized = 'newcomer@credentials.test'
  ),
  'location_admin',
  'the person who signs up owns the workspace they create'
);
reset role;
set local role app_runtime;

-- 006A-AC-009: the fixed-window rate limiter.
select pg_temp.assert_ok(
  platform.consume_auth_rate_limit('sign_in_ip', pg_temp.token_hash('limit-a'), 3, 900)
    and platform.consume_auth_rate_limit('sign_in_ip', pg_temp.token_hash('limit-a'), 3, 900)
    and platform.consume_auth_rate_limit('sign_in_ip', pg_temp.token_hash('limit-a'), 3, 900),
  'the first three attempts inside the window are allowed'
);
select pg_temp.assert_is(
  platform.consume_auth_rate_limit('sign_in_ip', pg_temp.token_hash('limit-a'), 3, 900),
  false,
  'the fourth attempt inside the window is refused'
);
select pg_temp.assert_is(
  platform.consume_auth_rate_limit('sign_in_ip', pg_temp.token_hash('limit-b'), 3, 900),
  true,
  'a different client key keeps its own window'
);
select pg_temp.assert_is(
  platform.consume_auth_rate_limit('forgot_ip', pg_temp.token_hash('limit-a'), 3, 900),
  true,
  'a different scope keeps its own window'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.consume_auth_rate_limit('invented', pg_catalog.repeat('a', 64), 3, 900)
  $sql$),
  '42501',
  'consume_auth_rate_limit refuses a scope outside the closed list'
);

reset role;
set local role migration_owner;
insert into platform.auth_rate_limits (scope, key_hash, window_start, attempt_count)
values ('verify_ip', pg_temp.token_hash('stale-window'), pg_catalog.now() - interval '2 days', 5);
reset role;
set local role app_runtime;
select platform.consume_auth_rate_limit('verify_ip', pg_temp.token_hash('sweeper'), 5, 900);
reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.auth_rate_limits as limit_row
    where limit_row.key_hash = pg_temp.token_hash('stale-window')
  ),
  0,
  'counters older than twenty-four hours are swept away'
);

reset role;
select * from finish();
rollback;
