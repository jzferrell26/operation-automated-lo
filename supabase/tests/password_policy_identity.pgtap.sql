-- PRD-006a D3 and D5. The two security definer reads the password policy's
-- personal-fragment rule needs at change-password and at reset.
--
-- Style follows supabase/tests/verification_resend.pgtap.sql: fixed UUIDs,
-- `set local role migration_owner` for seeding, `set local role app_runtime`
-- for the definer calls, and pg_temp.assert_* wrappers on every assertion,
-- because app_runtime cannot see pgTAP's own functions.
--
-- Two things are proven about each read: that it is the same kind of object as
-- the twelve reads beside it (migration_owner, security definer, empty search
-- path, granted to app_runtime and to nobody else), and that it answers nothing
-- for every case it must refuse. The reset read is additionally proven not to
-- consume: the token it answered for is still redeemable afterwards, which is
-- the whole reason it exists rather than the handler calling consume first.

begin;

select plan(21);

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

-- A token hash of the shape the table's own check constraint insists on.
create function pg_temp.token_hash(tag_character text)
returns text
language sql
immutable
as $function$ select pg_catalog.repeat(tag_character, 64) $function$;

-- The two properties every read on this boundary must have. Each is one scalar
-- query so the assertions below can state them directly for either function.
create function pg_temp.is_owned_definer(routine_name text)
returns boolean
language sql
stable
as $function$
  select pg_catalog.count(*) = 1
  from pg_catalog.pg_proc as routine
  join pg_catalog.pg_namespace as schema_row on schema_row.oid = routine.pronamespace
  where schema_row.nspname = 'platform'
    and routine.proname = is_owned_definer.routine_name
    and routine.proowner = 'migration_owner'::regrole
    and routine.prosecdef
    and routine.proconfig @> array['search_path=""']
$function$;

create function pg_temp.is_app_runtime_only(routine_name text)
returns boolean
language sql
stable
as $function$
  select
    not has_function_privilege('public', routine.oid, 'EXECUTE')
    and has_function_privilege('app_runtime', routine.oid, 'EXECUTE')
    and not has_function_privilege('support_runtime', routine.oid, 'EXECUTE')
  from pg_catalog.pg_proc as routine
  join pg_catalog.pg_namespace as schema_row on schema_row.oid = routine.pronamespace
  where schema_row.nspname = 'platform'
    and routine.proname = is_app_runtime_only.routine_name
$function$;

insert into platform.locations (id, display_name, status)
values ('00000000-0000-4000-8000-000000000f01', 'Policy Tenant', 'active');

insert into platform.app_users (id, safe_display_name, status)
values
  ('00000000-0000-4000-8000-000000000f11', 'Dana Miller', 'active'),
  ('00000000-0000-4000-8000-000000000f12', 'Suspended Miller', 'suspended'),
  ('00000000-0000-4000-8000-000000000f13', 'Credential-less Miller', 'active');

insert into platform.role_bindings (id, location_id, user_id, role, created_at)
values
  (
    '00000000-0000-4000-8000-000000000f31',
    '00000000-0000-4000-8000-000000000f01',
    '00000000-0000-4000-8000-000000000f11',
    'location_admin',
    pg_catalog.now() - interval '5 days'
  ),
  (
    '00000000-0000-4000-8000-000000000f32',
    '00000000-0000-4000-8000-000000000f01',
    '00000000-0000-4000-8000-000000000f12',
    'creator',
    pg_catalog.now() - interval '5 days'
  );

insert into platform.user_credentials (
  user_id, email_normalized, email_display, password_hash, email_verified_at
)
values
  (
    '00000000-0000-4000-8000-000000000f11',
    'dana.miller@policy.test',
    'Dana.Miller@Policy.test',
    pg_temp.sample_password_hash('A'),
    pg_catalog.now()
  ),
  (
    '00000000-0000-4000-8000-000000000f12',
    'suspended.miller@policy.test',
    'Suspended.Miller@Policy.test',
    pg_temp.sample_password_hash('B'),
    pg_catalog.now()
  );

-- Four reset tokens for the same person: one live, one already consumed, one
-- superseded, one expired. Plus one live token of another purpose, which the
-- reset read must not answer for at all.
insert into platform.credential_tokens (
  id, user_id, purpose, token_hash, issued_at, expires_at,
  consumed_at, superseded_at, correlation_id
)
values
  (
    '00000000-0000-4000-8000-000000000f21',
    '00000000-0000-4000-8000-000000000f11',
    'password_reset',
    pg_temp.token_hash('a'),
    pg_catalog.now(),
    pg_catalog.now() + interval '30 minutes',
    null,
    null,
    'correlation_policySeed001'
  ),
  (
    '00000000-0000-4000-8000-000000000f22',
    '00000000-0000-4000-8000-000000000f11',
    'password_reset',
    pg_temp.token_hash('b'),
    pg_catalog.now(),
    pg_catalog.now() + interval '30 minutes',
    pg_catalog.now(),
    null,
    'correlation_policySeed002'
  ),
  (
    '00000000-0000-4000-8000-000000000f23',
    '00000000-0000-4000-8000-000000000f11',
    'password_reset',
    pg_temp.token_hash('c'),
    pg_catalog.now(),
    pg_catalog.now() + interval '30 minutes',
    null,
    pg_catalog.now(),
    'correlation_policySeed003'
  ),
  (
    '00000000-0000-4000-8000-000000000f24',
    '00000000-0000-4000-8000-000000000f11',
    'password_reset',
    pg_temp.token_hash('d'),
    pg_catalog.now() - interval '2 hours',
    pg_catalog.now() - interval '1 hour',
    null,
    null,
    'correlation_policySeed004'
  ),
  (
    '00000000-0000-4000-8000-000000000f25',
    '00000000-0000-4000-8000-000000000f11',
    'email_verification',
    pg_temp.token_hash('e'),
    pg_catalog.now(),
    pg_catalog.now() + interval '30 minutes',
    null,
    null,
    'correlation_policySeed005'
  ),
  (
    '00000000-0000-4000-8000-000000000f26',
    '00000000-0000-4000-8000-000000000f12',
    'password_reset',
    pg_temp.token_hash('f'),
    pg_catalog.now(),
    pg_catalog.now() + interval '30 minutes',
    null,
    null,
    'correlation_policySeed006'
  );

select pg_temp.assert_ok(
  pg_temp.is_owned_definer('password_policy_identity_for_user'),
  'the person-keyed read is a migration_owner security definer with an empty search path'
);
select pg_temp.assert_ok(
  pg_temp.is_app_runtime_only('password_policy_identity_for_user'),
  'the person-keyed read is granted to app_runtime alone'
);
select pg_temp.assert_ok(
  pg_temp.is_owned_definer('password_policy_identity_for_reset_token'),
  'the token-keyed read is a migration_owner security definer with an empty search path'
);
select pg_temp.assert_ok(
  pg_temp.is_app_runtime_only('password_policy_identity_for_reset_token'),
  'the token-keyed read is granted to app_runtime alone'
);

-- Neither read may be reachable without the definer: app_runtime holds no
-- select grant on the two tables they read.
select pg_temp.assert_ok(
  not has_table_privilege('app_runtime', 'platform.user_credentials', 'SELECT'),
  'app_runtime still holds no direct select on platform.user_credentials'
);
select pg_temp.assert_ok(
  not has_table_privilege('app_runtime', 'platform.credential_tokens', 'SELECT'),
  'app_runtime still holds no direct select on platform.credential_tokens'
);


reset role;
set local role app_runtime;

-- The person-keyed read.
select pg_temp.assert_is(
  (
    select identity_row.email_display || ' / ' || identity_row.display_name
    from platform.password_policy_identity_for_user(
      '00000000-0000-4000-8000-000000000f11'
    ) as identity_row
  ),
  'Dana.Miller@Policy.test / Dana Miller',
  'an active person with a credential yields both policy fragments'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_user(
      '00000000-0000-4000-8000-000000000f12'
    )
  ),
  0,
  'a suspended person yields no row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_user(
      '00000000-0000-4000-8000-000000000f13'
    )
  ),
  0,
  'a person with no credential row yields no row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_user(
      '00000000-0000-4000-8000-0000000009fe'
    )
  ),
  0,
  'an unknown person yields no row'
);

-- The token-keyed read: the same four liveness guards consume_credential_token
-- applies, and the purpose fixed at password_reset.
select pg_temp.assert_is(
  (
    select identity_row.email_display || ' / ' || identity_row.display_name
    from platform.password_policy_identity_for_reset_token(
      pg_temp.token_hash('a')
    ) as identity_row
  ),
  'Dana.Miller@Policy.test / Dana Miller',
  'a live reset token yields both policy fragments'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_reset_token(pg_temp.token_hash('b'))
  ),
  0,
  'an already consumed token yields no row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_reset_token(pg_temp.token_hash('c'))
  ),
  0,
  'a superseded token yields no row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_reset_token(pg_temp.token_hash('d'))
  ),
  0,
  'an expired token yields no row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_reset_token(pg_temp.token_hash('e'))
  ),
  0,
  'a live token of another purpose yields no row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_reset_token(pg_temp.token_hash('f'))
  ),
  0,
  'a live reset token for a suspended person yields no row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_reset_token('not-a-token-hash')
  ),
  0,
  'a value that is not a token hash yields no row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_reset_token(pg_temp.token_hash('9'))
  ),
  0,
  'an unknown token hash yields no row'
);

-- PRD-006a D5. The read leaves the token spendable, which is the whole point:
-- a policy refusal must not cost the person their link. Reading twice and then
-- consuming proves the read wrote nothing either time.
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_reset_token(pg_temp.token_hash('a'))
  ),
  1,
  'the live token still answers on a second read'
);
select pg_temp.assert_is(
  (
    select consumed.user_id
    from platform.consume_credential_token(
      pg_temp.token_hash('a'), 'password_reset'
    ) as consumed
  ),
  '00000000-0000-4000-8000-000000000f11'::uuid,
  'the token the read answered for is still redeemable afterwards'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.password_policy_identity_for_reset_token(pg_temp.token_hash('a'))
  ),
  0,
  'and stops answering once it really is consumed'
);

reset role;

select * from finish();

rollback;
