-- M-1 of the PRD-008 close-out security audit (2026-10-01). The database half
-- of the sign-in timing fix: one widened scope constraint on
-- platform.auth_rate_limits and one new definer write,
-- platform.record_sign_in_without_account, which the sign-in handler awaits
-- on the branch where the address has no active account.
--
-- Style follows supabase/tests/change_password_rate_limit.pgtap.sql:
-- `set local role migration_owner` for the catalogue reads and the direct
-- table writes, `set local role app_runtime` for the definer calls,
-- pg_temp.capture_sqlstate for refusal paths, and pg_temp.assert_* wrappers on
-- every assertion, because app_runtime cannot see pgTAP's own functions.
--
-- Four things are proven:
-- 1. The widening is a widening: the eight earlier scopes are re-proved
--    alongside the new one, so a change that traded one value for another
--    fails rather than passing for having the right count.
-- 2. The function is the same kind of object as the credential definers beside
--    it: migration_owner, security definer, empty search path, executable by
--    app_runtime and by nobody else.
-- 3. It refuses every argument that is not a keyed hash, and the new scope
--    cannot be consumed as a limit through consume_auth_rate_limit.
-- 4. It writes: one counter row per key per fifteen-minute window, holding the
--    hash and nothing else, and it writes no audit row.

begin;

select plan(24);

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

-- A counter key of the shape the table and the function insist on: sixty-four
-- lowercase hex characters. Distinct per case so no two cases share a row.
create function pg_temp.counter_key(tag_character text)
returns text
language sql
immutable
as $function$ select pg_catalog.repeat(tag_character, 64) $function$;

-- The audit trail before any call below, so the proof that the function writes
-- no audit row compares against this transaction's own starting point.
create temporary table sign_in_without_account_audit_baseline as
select pg_catalog.count(*)::integer as event_count from audit.events;

-- 1. The constraint keeps its explicit name and is still the only scope check.
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
    select pg_catalog.pg_get_constraintdef(constraint_row.oid) like '%sign_in_no_account%'
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'platform.auth_rate_limits'::regclass
      and constraint_row.conname = 'auth_rate_limits_scope_ck'
  ),
  'the named scope check lists sign_in_no_account'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.auth_rate_limits (scope, key_hash, window_start, attempt_count)
    values ('sign_in_no_account', pg_catalog.repeat('e', 64), pg_catalog.now(), 1)
  $sql$),
  null::text,
  'the widened constraint admits a sign_in_no_account row'
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
        'resend_verification_user', 'change_password_user'
      ]
    ) as previous(scope_name)
  $sql$),
  null::text,
  'the widened constraint still admits all eight earlier scopes'
);

-- 2. The function's identity, settings, and grants.
select pg_temp.assert_ok(
  pg_catalog.to_regprocedure('platform.record_sign_in_without_account(text)') is not null,
  'record_sign_in_without_account exists with one text argument'
);
select pg_temp.assert_ok(
  (
    select pg_catalog.count(*) = 1
    from pg_catalog.pg_proc as routine
    where routine.oid = pg_catalog.to_regprocedure('platform.record_sign_in_without_account(text)')
      and routine.proowner = 'migration_owner'::regrole
      and routine.prosecdef
      and routine.proconfig @> array['search_path=""']
  ),
  'record_sign_in_without_account is a migration_owner security definer with an empty search path'
);
select pg_temp.assert_is(
  (
    select routine.prorettype::regtype::text
    from pg_catalog.pg_proc as routine
    where routine.oid = pg_catalog.to_regprocedure('platform.record_sign_in_without_account(text)')
  ),
  'void',
  'record_sign_in_without_account returns nothing a caller could read'
);
select pg_temp.assert_ok(
  has_function_privilege(
    'app_runtime', 'platform.record_sign_in_without_account(text)', 'EXECUTE'
  ),
  'app_runtime holds execute on record_sign_in_without_account'
);
select pg_temp.assert_is(
  (
    select coalesce(
      pg_catalog.array_agg(reachable_role.role_name order by reachable_role.role_name),
      array[]::text[]
    )
    from (values
      ('public'), ('anon'), ('authenticated'), ('scheduler_runtime'),
      ('support_runtime'), ('reporting_runtime')
    ) as reachable_role(role_name)
    where has_function_privilege(
      reachable_role.role_name::name, 'platform.record_sign_in_without_account(text)', 'EXECUTE'
    )
  ),
  array[]::text[],
  'no role other than app_runtime can execute record_sign_in_without_account'
);
select pg_temp.assert_ok(
  not exists (
    select 1
    from pg_catalog.pg_proc as routine
    cross join lateral pg_catalog.aclexplode(
      coalesce(routine.proacl, pg_catalog.acldefault('f', routine.proowner))
    ) as grant_row
    where routine.oid = pg_catalog.to_regprocedure('platform.record_sign_in_without_account(text)')
      and grant_row.grantee = 0
  ),
  'public holds no execute grant on record_sign_in_without_account, explicit or by default'
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

-- 3. Refusals. Every argument that is not a keyed hash is refused with the one
-- generic errcode, and the new scope is not a limit anyone can consume.
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.record_sign_in_without_account(null)
  $sql$),
  '42501',
  'a null key is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.record_sign_in_without_account('nobody@sign-in.test')
  $sql$),
  '42501',
  'an email address in place of a key is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.record_sign_in_without_account(pg_catalog.repeat('A', 64))
  $sql$),
  '42501',
  'an uppercase hex key is refused, as the table would refuse it'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.consume_auth_rate_limit('sign_in_no_account', pg_catalog.repeat('c', 64), 10, 900)
  $sql$),
  '42501',
  'consume_auth_rate_limit does not admit the new scope, so it is never a limit'
);

-- 4. The write. Three calls on one key and one on another, all inside this
-- transaction, so now() is fixed and every call lands in the same window.
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.record_sign_in_without_account(pg_catalog.repeat('a', 64))
  $sql$),
  null::text,
  'app_runtime can record a refusal for an address with no account'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from (
      select platform.record_sign_in_without_account(pg_temp.counter_key('a'))
      from pg_catalog.generate_series(1, 2) as attempts(attempt)
    ) as recorded
  ),
  2,
  'two further refusals on the same key are recorded'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.record_sign_in_without_account(pg_catalog.repeat('b', 64))
  $sql$),
  null::text,
  'a refusal from another client address is recorded'
);

reset role;
set local role migration_owner;

select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(limit_row.attempt_count order by limit_row.window_start)
    from platform.auth_rate_limits as limit_row
    where limit_row.scope = 'sign_in_no_account'
      and limit_row.key_hash = pg_temp.counter_key('a')
  ),
  array[3],
  'one counter row carries all three refusals for one key'
);
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(limit_row.attempt_count)
    from platform.auth_rate_limits as limit_row
    where limit_row.scope = 'sign_in_no_account'
      and limit_row.key_hash = pg_temp.counter_key('b')
  ),
  array[1],
  'another key keeps a row of its own'
);
select pg_temp.assert_ok(
  (
    select pg_catalog.bool_and(
      pg_catalog.floor(pg_catalog.date_part('epoch', limit_row.window_start))::bigint % 900 = 0
      and limit_row.window_start <= pg_catalog.now()
      and limit_row.window_start > pg_catalog.now() - interval '15 minutes'
    )
    from platform.auth_rate_limits as limit_row
    where limit_row.scope = 'sign_in_no_account'
      and limit_row.key_hash in (pg_temp.counter_key('a'), pg_temp.counter_key('b'))
  ),
  'each row sits in the current fifteen-minute window, aligned as the sign-in limit aligns it'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.auth_rate_limits as limit_row
    where limit_row.scope = 'sign_in_no_account'
      and limit_row.key_hash in (
        pg_catalog.repeat('A', 64), 'nobody@sign-in.test', pg_temp.counter_key('c')
      )
  ),
  0,
  'a refused call writes no row, under the new scope or through consume_auth_rate_limit'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from audit.events),
  (select baseline.event_count from sign_in_without_account_audit_baseline as baseline),
  'recording a refusal for an address with no account writes no audit row'
);

reset role;

select * from finish();
rollback;
