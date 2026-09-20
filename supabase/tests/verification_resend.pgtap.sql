-- PRD-006a D1, D4, D5 and PRD-006b D10. The database half of the shell's
-- "Resend the link." control: one widened rate-limit scope, one widened audit
-- action, and one new security definer read.
--
-- Style follows supabase/tests/password_credentials.pgtap.sql: fixed UUIDs,
-- `set local role migration_owner` for seeding, `set local role app_runtime`
-- for the definer calls, pg_temp.capture_sqlstate for refusal paths, and
-- pg_temp.assert_* wrappers on every assertion, because app_runtime cannot see
-- pgTAP's own functions.
--
-- Every proof here is about the widening being a widening: the six scopes and
-- the two actions the previous migration allowed are re-proved alongside the
-- new ones, so a change that traded one value for another would fail rather
-- than pass for having the right count.

begin;

select plan(25);

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
-- in the database derives or verifies a password.
create function pg_temp.sample_password_hash(tag_character text)
returns text
language sql
immutable
as $function$
  select
    '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$'
    || pg_catalog.repeat(tag_character, 43)
$function$;

-- A counter key of the shape consume_auth_rate_limit insists on: sixty-four
-- lowercase hex characters. Distinct per case so no two cases share a window.
create function pg_temp.counter_key(tag_character text)
returns text
language sql
immutable
as $function$ select pg_catalog.repeat(tag_character, 64) $function$;

insert into platform.locations (id, display_name, status)
values ('00000000-0000-4000-8000-000000000e01', 'Resend Tenant', 'active');

insert into platform.app_users (id, safe_display_name, status)
values
  ('00000000-0000-4000-8000-000000000e11', 'Unconfirmed Person', 'active'),
  ('00000000-0000-4000-8000-000000000e12', 'Confirmed Person', 'active'),
  ('00000000-0000-4000-8000-000000000e13', 'Suspended Person', 'suspended'),
  ('00000000-0000-4000-8000-000000000e14', 'Credential-less Person', 'active');

insert into platform.role_bindings (id, location_id, user_id, role, created_at)
values
  (
    '00000000-0000-4000-8000-000000000e21',
    '00000000-0000-4000-8000-000000000e01',
    '00000000-0000-4000-8000-000000000e11',
    'location_admin',
    pg_catalog.now() - interval '5 days'
  ),
  (
    '00000000-0000-4000-8000-000000000e22',
    '00000000-0000-4000-8000-000000000e01',
    '00000000-0000-4000-8000-000000000e12',
    'location_admin',
    pg_catalog.now() - interval '5 days'
  ),
  (
    '00000000-0000-4000-8000-000000000e23',
    '00000000-0000-4000-8000-000000000e01',
    '00000000-0000-4000-8000-000000000e13',
    'creator',
    pg_catalog.now() - interval '5 days'
  );

insert into platform.user_credentials (
  user_id, email_normalized, email_display, password_hash, email_verified_at
)
values
  (
    '00000000-0000-4000-8000-000000000e11',
    'unconfirmed@resend.test',
    'Unconfirmed@Resend.test',
    pg_temp.sample_password_hash('A'),
    null
  ),
  (
    '00000000-0000-4000-8000-000000000e12',
    'confirmed@resend.test',
    'Confirmed@Resend.test',
    pg_temp.sample_password_hash('B'),
    pg_catalog.now()
  ),
  (
    '00000000-0000-4000-8000-000000000e13',
    'suspended@resend.test',
    'Suspended@Resend.test',
    pg_temp.sample_password_hash('C'),
    null
  );

-- The widened scope constraint, from the owner, against the table itself.
select pg_temp.assert_ok(
  (
    select pg_catalog.count(*) = 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'platform.auth_rate_limits'::regclass
      and constraint_row.conname = 'auth_rate_limits_scope_ck'
  ),
  'the widened scope constraint replaced the auto-named one'
);
select pg_temp.assert_ok(
  (
    select pg_catalog.count(*) = 0
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'platform.auth_rate_limits'::regclass
      and constraint_row.conname = 'auth_rate_limits_scope_check'
  ),
  'the auto-named scope constraint is gone'
);

select pg_temp.assert_ok(
  (
    select pg_catalog.count(*) = 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as schema_row on schema_row.oid = routine.pronamespace
    where schema_row.nspname = 'platform'
      and routine.proname = 'unverified_email_display_for_user'
      and routine.proowner = 'migration_owner'::regrole
      and routine.prosecdef
      and routine.proconfig @> array['search_path=""']
  ),
  'the new read is a migration_owner security definer with an empty search path'
);
select pg_temp.assert_ok(
  (
    select not has_function_privilege(
      'public', routine.oid, 'EXECUTE'
    )
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as schema_row on schema_row.oid = routine.pronamespace
    where schema_row.nspname = 'platform'
      and routine.proname = 'unverified_email_display_for_user'
  ),
  'public holds no execute on the new read'
);
select pg_temp.assert_ok(
  (
    select has_function_privilege('app_runtime', routine.oid, 'EXECUTE')
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as schema_row on schema_row.oid = routine.pronamespace
    where schema_row.nspname = 'platform'
      and routine.proname = 'unverified_email_display_for_user'
  ),
  'app_runtime holds execute on the new read'
);
select pg_temp.assert_ok(
  (
    select not has_function_privilege('support_runtime', routine.oid, 'EXECUTE')
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as schema_row on schema_row.oid = routine.pronamespace
    where schema_row.nspname = 'platform'
      and routine.proname = 'unverified_email_display_for_user'
  ),
  'support_runtime holds no execute on the new read'
);

reset role;
set local role app_runtime;

-- The new read: one address, and null everywhere else.
select pg_temp.assert_is(
  platform.unverified_email_display_for_user('00000000-0000-4000-8000-000000000e11'),
  'Unconfirmed@Resend.test',
  'an unconfirmed active person yields the display address'
);
select pg_temp.assert_is(
  platform.unverified_email_display_for_user('00000000-0000-4000-8000-000000000e12'),
  null::text,
  'a confirmed person yields nothing at all'
);
select pg_temp.assert_is(
  platform.unverified_email_display_for_user('00000000-0000-4000-8000-000000000e13'),
  null::text,
  'a suspended person yields nothing, however unconfirmed'
);
select pg_temp.assert_is(
  platform.unverified_email_display_for_user('00000000-0000-4000-8000-000000000e14'),
  null::text,
  'a person with no credential row yields nothing'
);
select pg_temp.assert_is(
  platform.unverified_email_display_for_user('00000000-0000-4000-8000-0000000009ff'),
  null::text,
  'an unknown person yields nothing'
);

-- The widened rate-limit scope. Every scope the previous migration allowed is
-- re-proved here, so a trade rather than a widening would fail.
select pg_temp.assert_ok(
  platform.consume_auth_rate_limit(
    'resend_verification_user', pg_temp.counter_key('a'), 5, 3600
  ),
  'the new scope is accepted and the first attempt is within the limit'
);
select pg_temp.assert_ok(
  (
    select pg_catalog.bool_and(
      platform.consume_auth_rate_limit(scope_name, pg_temp.counter_key('b'), 5, 3600)
    )
    from unnest(
      array['sign_in_ip', 'sign_up_ip', 'forgot_ip', 'forgot_email', 'reset_ip', 'verify_ip']
    ) as previous(scope_name)
  ),
  'all six scopes from the previous migration are still accepted'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.consume_auth_rate_limit('invented_scope', pg_catalog.repeat('c', 64), 5, 3600)
  $sql$),
  '42501',
  'a scope outside the widened list is still refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.consume_auth_rate_limit('resend_verification_user', 'not-a-hash', 5, 3600)
  $sql$),
  '42501',
  'the new scope does not relax the key-hash shape'
);
select pg_temp.assert_ok(
  (
    select pg_catalog.bool_and(allowed) = false and pg_catalog.bool_or(allowed)
    from (
      select platform.consume_auth_rate_limit(
        'resend_verification_user', pg_temp.counter_key('d'), 2, 3600
      ) as allowed
      from pg_catalog.generate_series(1, 3)
    ) as attempts
  ),
  'the new scope counts down to a refusal like every other one'
);

-- The widened audit action. Again, the two the previous migration allowed are
-- re-proved beside the new one.
select pg_temp.assert_ok(
  platform.record_email_delivery(
    '00000000-0000-4000-8000-000000000e11',
    'auth.verification-resent',
    'success',
    'resend-message-id-0001',
    'corr.resend.sent'
  ),
  'a resent confirmation records a delivery row'
);
select pg_temp.assert_ok(
  platform.record_email_delivery(
    '00000000-0000-4000-8000-000000000e12',
    'auth.verification-resent',
    'failed',
    'already_verified',
    'corr.resend.verified'
  ),
  'an attempt on a confirmed account records the already_verified subject'
);
select pg_temp.assert_ok(
  platform.record_email_delivery(
    '00000000-0000-4000-8000-000000000e11',
    'auth.verification-resent',
    'failed',
    'not_configured',
    'corr.resend.quiet'
  ),
  'an attempt with no sending domain records the not_configured subject'
);
select pg_temp.assert_ok(
  (
    select pg_catalog.bool_and(
      platform.record_email_delivery(
        '00000000-0000-4000-8000-000000000e11',
        action_name,
        'failed',
        'not_configured',
        'corr.resend.previous'
      )
    )
    from unnest(array['auth.reset-email', 'auth.verification-email']) as previous(action_name)
  ),
  'both actions from the previous migration are still accepted'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.record_email_delivery(
      '00000000-0000-4000-8000-000000000e11',
      'auth.invented-email',
      'success',
      'whatever',
      'corr.resend.invented'
    )
  $sql$),
  '42501',
  'an action outside the widened list is still refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.record_email_delivery(
      '00000000-0000-4000-8000-000000000e11',
      'auth.verification-resent',
      'uncertain',
      'whatever',
      'corr.resend.result'
    )
  $sql$),
  '42501',
  'the new action does not widen the two results a delivery may carry'
);

reset role;
set local role migration_owner;

select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from audit.events as event
    where event.correlation_id = 'corr.resend.sent'
      and event.action = 'auth.verification-resent'
      and event.result = 'success'
      and event.subject_type = 'email_delivery'
      and event.subject_id = 'resend-message-id-0001'
      and event.actor_type = 'user'
      and event.actor_id = '00000000-0000-4000-8000-000000000e11'
  ),
  1,
  'the sent resend wrote exactly one audit row of the stated action and result'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from audit.events as event
    where event.correlation_id = 'corr.resend.verified'
      and event.action = 'auth.verification-resent'
      and event.result = 'failed'
      and event.subject_id = 'already_verified'
  ),
  1,
  'the attempt on a confirmed account wrote exactly one audit row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from audit.events as event
    where event.correlation_id in (
      'corr.resend.sent', 'corr.resend.verified', 'corr.resend.quiet', 'corr.resend.previous'
    )
      and event.subject_id like '%@%'
  ),
  0,
  'no delivery row this file wrote carries an email address'
);

reset role;

select * from finish();
rollback;
