-- PRD-008a D2, 008A-AC-010 and 008A-AC-011. The database half of the
-- change-password rate limit: one widened scope constraint and one widened
-- inline guard in platform.consume_auth_rate_limit.
--
-- Style follows supabase/tests/verification_resend.pgtap.sql: `set local role
-- migration_owner` for the catalogue reads and the direct table writes, `set
-- local role app_runtime` for the definer calls, pg_temp.capture_sqlstate for
-- refusal paths, and pg_temp.assert_* wrappers on every assertion, because
-- app_runtime cannot see pgTAP's own functions.
--
-- Every proof here is about the widening being a widening: the seven scopes
-- the earlier migrations allowed are re-proved alongside the new one, so a
-- change that traded one value for another would fail rather than pass for
-- having the right count. The definer's own settings and grants are re-read
-- too, because the migration replaces its body.

begin;

select plan(19);

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

-- A counter key of the shape consume_auth_rate_limit insists on: sixty-four
-- lowercase hex characters. Distinct per case so no two cases share a window.
create function pg_temp.counter_key(tag_character text)
returns text
language sql
immutable
as $function$ select pg_catalog.repeat(tag_character, 64) $function$;

-- The constraint keeps the explicit name 20260919190000_verification_resend.sql
-- gave it, and it is still the only scope check on the table.
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'platform.auth_rate_limits'::regclass
      and constraint_row.contype = 'c'
      and constraint_row.conname in ('auth_rate_limits_scope_ck', 'auth_rate_limits_scope_check')
  ),
  1,
  'exactly one scope check exists on the counter table'
);
select pg_temp.assert_ok(
  (
    select pg_catalog.pg_get_constraintdef(constraint_row.oid) like '%change_password_user%'
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'platform.auth_rate_limits'::regclass
      and constraint_row.conname = 'auth_rate_limits_scope_ck'
  ),
  'the named scope check lists change_password_user'
);

-- The constraint itself, written to directly, so the proof does not rest on
-- the definer's inline guard alone.
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.auth_rate_limits (scope, key_hash, window_start, attempt_count)
    values ('change_password_user', pg_catalog.repeat('e', 64), pg_catalog.now(), 1)
  $sql$),
  null::text,
  'the widened constraint admits a change_password_user row'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.auth_rate_limits (scope, key_hash, window_start, attempt_count)
    values ('invented_scope', pg_catalog.repeat('f', 64), pg_catalog.now(), 1)
  $sql$),
  '23514',
  'the widened constraint still rejects an unknown scope'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.auth_rate_limits (scope, key_hash, window_start, attempt_count)
    select scope_name, pg_catalog.repeat('9', 64), pg_catalog.now(), 1
    from unnest(
      array[
        'sign_in_ip', 'sign_up_ip', 'forgot_ip', 'forgot_email', 'reset_ip', 'verify_ip',
        'resend_verification_user'
      ]
    ) as previous(scope_name)
  $sql$),
  null::text,
  'the widened constraint still admits all seven earlier scopes'
);

-- The replaced body keeps the trust-boundary settings the earlier migrations
-- gave it, and create or replace kept its grants.
select pg_temp.assert_ok(
  (
    select pg_catalog.count(*) = 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as schema_row on schema_row.oid = routine.pronamespace
    where schema_row.nspname = 'platform'
      and routine.proname = 'consume_auth_rate_limit'
      and routine.proowner = 'migration_owner'::regrole
      and routine.prosecdef
      and routine.proconfig @> array['search_path=""']
  ),
  'consume_auth_rate_limit is still a migration_owner security definer with an empty search path'
);
select pg_temp.assert_ok(
  (
    select has_function_privilege('app_runtime', routine.oid, 'EXECUTE')
      and not has_function_privilege('public', routine.oid, 'EXECUTE')
      and not has_function_privilege('support_runtime', routine.oid, 'EXECUTE')
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as schema_row on schema_row.oid = routine.pronamespace
    where schema_row.nspname = 'platform'
      and routine.proname = 'consume_auth_rate_limit'
  ),
  'only app_runtime holds execute on consume_auth_rate_limit'
);
select pg_temp.assert_ok(
  (
    select not has_table_privilege('app_runtime', 'platform.auth_rate_limits', 'SELECT')
      and not has_table_privilege('app_runtime', 'platform.auth_rate_limits', 'INSERT')
      and not has_table_privilege('app_runtime', 'platform.auth_rate_limits', 'UPDATE')
      and not has_table_privilege('app_runtime', 'platform.auth_rate_limits', 'DELETE')
  ),
  'app_runtime still holds no grant on the counter table itself'
);

reset role;
set local role app_runtime;

-- The widened inline guard.
select pg_temp.assert_ok(
  platform.consume_auth_rate_limit('change_password_user', pg_temp.counter_key('a'), 10, 900),
  'the new scope is accepted and the first attempt is within the limit'
);
select pg_temp.assert_ok(
  (
    select pg_catalog.bool_and(
      platform.consume_auth_rate_limit(scope_name, pg_temp.counter_key('b'), 10, 900)
    )
    from unnest(
      array[
        'sign_in_ip', 'sign_up_ip', 'forgot_ip', 'forgot_email', 'reset_ip', 'verify_ip',
        'resend_verification_user'
      ]
    ) as previous(scope_name)
  ),
  'all seven earlier scopes are still accepted'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.consume_auth_rate_limit('invented_scope', pg_catalog.repeat('c', 64), 10, 900)
  $sql$),
  '42501',
  'a scope outside the widened list is still refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.consume_auth_rate_limit('change_password_user', 'not-a-hash', 10, 900)
  $sql$),
  '42501',
  'the new scope does not relax the key-hash shape'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.consume_auth_rate_limit('change_password_user', pg_catalog.repeat('c', 64), 0, 900)
  $sql$),
  '42501',
  'the new scope does not relax the attempt-limit bounds'
);

-- The window, at the exact budget the handler uses: ten in nine hundred
-- seconds, so the eleventh attempt is the first refusal. Every call in this
-- file runs inside one transaction, so now() is fixed and all eleven land in
-- the same window.
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(allowed order by attempt)
    from (
      select
        attempt,
        platform.consume_auth_rate_limit(
          'change_password_user', pg_temp.counter_key('d'), 10, 900
        ) as allowed
      from pg_catalog.generate_series(1, 11) as attempts(attempt)
    ) as answered
  ),
  array[true, true, true, true, true, true, true, true, true, true, false],
  'the new scope allows ten attempts in the window and refuses the eleventh'
);
select pg_temp.assert_ok(
  not platform.consume_auth_rate_limit(
    'change_password_user', pg_temp.counter_key('d'), 10, 900
  ),
  'a refused window stays refused for the rest of the window'
);
select pg_temp.assert_ok(
  platform.consume_auth_rate_limit('change_password_user', pg_temp.counter_key('7'), 10, 900),
  'another person''s key keeps a window of its own'
);
select pg_temp.assert_ok(
  platform.consume_auth_rate_limit('resend_verification_user', pg_temp.counter_key('d'), 10, 900),
  'the same key under another scope is a separate window'
);

reset role;
set local role migration_owner;

select pg_temp.assert_is(
  (
    select limit_row.attempt_count
    from platform.auth_rate_limits as limit_row
    where limit_row.scope = 'change_password_user'
      and limit_row.key_hash = pg_temp.counter_key('d')
  ),
  12,
  'one counter row carries the whole window for the new scope'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.auth_rate_limits as limit_row
    where limit_row.scope = 'change_password_user'
      and limit_row.key_hash !~ '^[0-9a-f]{64}$'
  ),
  0,
  'every counter row the new scope wrote is keyed by a hash and nothing else'
);

reset role;

select * from finish();
rollback;
