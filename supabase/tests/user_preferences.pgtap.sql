-- PRD-006c 006C-AC-003. The shape, the grants, the policies, the two checks,
-- and the proof that a session bound to one location can neither read nor write
-- another location's preference rows.
--
-- Style follows supabase/tests/first_party_sessions.pgtap.sql: fixed UUIDs,
-- `set local role migration_owner` for seeding, and pg_temp.capture_sqlstate
-- for every refusal path. Catalog queries stand in for has_index because that
-- pgTAP helper is overloaded and would silently resolve to another signature.

begin;

select plan(29);

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

create function pg_temp.affected_rows(statement text)
returns integer
language plpgsql
as $function$
declare
  affected integer;
begin
  execute statement;
  get diagnostics affected = row_count;
  return affected;
end
$function$;

insert into platform.locations (id, display_name, status)
values
  ('00000000-0000-4000-8000-000000000b01', 'Preferences Tenant A', 'active'),
  ('00000000-0000-4000-8000-000000000b02', 'Preferences Tenant B', 'active');

insert into platform.app_users (id, safe_display_name, status)
values
  ('00000000-0000-4000-8000-000000000b11', 'Preferences User A', 'active'),
  ('00000000-0000-4000-8000-000000000b12', 'Preferences User B', 'active');

insert into platform.role_bindings (location_id, user_id, role)
values
  (
    '00000000-0000-4000-8000-000000000b01',
    '00000000-0000-4000-8000-000000000b11',
    'location_admin'
  ),
  (
    '00000000-0000-4000-8000-000000000b02',
    '00000000-0000-4000-8000-000000000b12',
    'location_admin'
  );

-- One row per tenant, seeded as the owner, so the isolation proof below reads a
-- database that genuinely holds the other tenant's row.
insert into platform.user_preferences (location_id, user_id, key, value)
values
  (
    '00000000-0000-4000-8000-000000000b01',
    '00000000-0000-4000-8000-000000000b11',
    'guided_setup.v1',
    '{"status":"in_progress","currentStep":2,"completedSteps":[1],"restartedCount":0}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000b02',
    '00000000-0000-4000-8000-000000000b12',
    'guided_setup.v1',
    '{"status":"completed","currentStep":7,"completedSteps":[1,2,3,4,5,6,7],"restartedCount":0}'::jsonb
  );

reset role;

-- Shape.
select has_table('platform', 'user_preferences', 'user_preferences exists');
select columns_are(
  'platform',
  'user_preferences',
  array['location_id', 'user_id', 'key', 'value', 'updated_at'],
  'user_preferences carries exactly the D4 columns'
);
select col_type_is(
  'platform', 'user_preferences', 'value', 'jsonb', 'value is jsonb'
);
select col_type_is(
  'platform', 'user_preferences', 'updated_at', 'timestamp with time zone',
  'updated_at is timestamptz'
);
select is(
  (
    select pg_catalog.array_agg(attribute.attname::text order by key_order.ordinality)
    from pg_catalog.pg_constraint as constraint_row
    cross join lateral pg_catalog.unnest(constraint_row.conkey) with ordinality
      as key_order(attnum, ordinality)
    join pg_catalog.pg_attribute as attribute
      on attribute.attrelid = constraint_row.conrelid
      and attribute.attnum = key_order.attnum
    where constraint_row.conrelid = 'platform.user_preferences'::regclass
      and constraint_row.contype = 'p'
  ),
  array['location_id', 'user_id', 'key'],
  'the primary key is (location_id, user_id, key) in that order'
);
select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_indexes as index_row
    where index_row.schemaname = 'platform'
      and index_row.tablename = 'user_preferences'
      and index_row.indexname = 'user_preferences_user_id_idx'
  ),
  1,
  'the user_id foreign key carries its own index'
);

select is(
  (
    select pg_catalog.array_agg(constraint_row.conname order by constraint_row.conname)
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'platform.user_preferences'::regclass
      and constraint_row.contype = 'c'
  ),
  array[
    'user_preferences_key_ck',
    'user_preferences_value_object_ck',
    'user_preferences_value_size_ck'
  ]::name[],
  'the three checks carry explicit names, so a refusal says which one fired'
);

-- RLS, policies, grants.
select ok(
  (
    select class_row.relrowsecurity and class_row.relforcerowsecurity
    from pg_catalog.pg_class as class_row
    where class_row.oid = 'platform.user_preferences'::regclass
  ),
  'row level security is enabled and forced'
);
select is(
  (
    select pg_catalog.array_agg(policy_row.polname order by policy_row.polname)
    from pg_catalog.pg_policy as policy_row
    where policy_row.polrelid = 'platform.user_preferences'::regclass
  ),
  array[
    'user_preferences_app_tenant',
    'user_preferences_migration_owner_all',
    'user_preferences_support_read'
  ]::name[],
  'exactly the three standard policies exist'
);
select ok(
  has_table_privilege('app_runtime', 'platform.user_preferences', 'SELECT'),
  'app runtime can select preferences'
);
select ok(
  has_table_privilege('app_runtime', 'platform.user_preferences', 'INSERT'),
  'app runtime can insert preferences'
);
select ok(
  has_table_privilege('app_runtime', 'platform.user_preferences', 'UPDATE'),
  'app runtime can update preferences'
);
select ok(
  not has_table_privilege('app_runtime', 'platform.user_preferences', 'DELETE'),
  'app runtime cannot delete preferences'
);
select ok(
  has_table_privilege('support_runtime', 'platform.user_preferences', 'SELECT'),
  'support runtime can select preferences'
);
select ok(
  not has_table_privilege('support_runtime', 'platform.user_preferences', 'INSERT'),
  'support runtime cannot insert preferences'
);
select ok(
  not has_table_privilege('support_runtime', 'platform.user_preferences', 'UPDATE'),
  'support runtime cannot update preferences'
);
select ok(
  not has_table_privilege('scheduler_runtime', 'platform.user_preferences', 'SELECT'),
  'scheduler runtime cannot select preferences'
);
select ok(
  not has_table_privilege('reporting_runtime', 'platform.user_preferences', 'SELECT'),
  'reporting runtime cannot select preferences'
);

-- The checks.
set local role migration_owner;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.user_preferences (location_id, user_id, key, value)
    values (
      '00000000-0000-4000-8000-000000000b01',
      '00000000-0000-4000-8000-000000000b11',
      'Guided_Setup.v1',
      '{}'::jsonb
    )
  $sql$),
  '23514',
  'a key outside the lowercase namespaced pattern is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.user_preferences (location_id, user_id, key, value)
    values (
      '00000000-0000-4000-8000-000000000b01',
      '00000000-0000-4000-8000-000000000b11',
      'oversized.v1',
      pg_catalog.jsonb_build_object('padding', pg_catalog.repeat('x', 20000))
    )
  $sql$),
  '23514',
  'a value over 16 kilobytes is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.user_preferences (location_id, user_id, key, value)
    values (
      '00000000-0000-4000-8000-000000000b01',
      '00000000-0000-4000-8000-000000000b11',
      'scalar.v1',
      '"not an object"'::jsonb
    )
  $sql$),
  '23514',
  'a value that is not a json object is refused'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.user_preferences (location_id, user_id, key, value)
    values (
      '00000000-0000-4000-8000-000000000b01',
      '00000000-0000-4000-8000-00000000dead',
      'guided_setup.v1',
      '{}'::jsonb
    )
  $sql$),
  '23503',
  'a preference for a person who does not exist is refused'
);
reset role;

-- Cross-location isolation, under the real app_runtime tenant context.
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000b01',
  '00000000-0000-4000-8000-000000000b11',
  'corr.user-preferences'
);

select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from platform.user_preferences),
  1,
  'tenant A reads only its own preference row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from platform.user_preferences
    where location_id = '00000000-0000-4000-8000-000000000b02'
  ),
  0,
  'tenant A cannot infer tenant B by a direct predicate'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into platform.user_preferences (location_id, user_id, key, value)
    values (
      '00000000-0000-4000-8000-000000000b02',
      '00000000-0000-4000-8000-000000000b12',
      'setup_profile.v1',
      '{"displayName":"Injected"}'::jsonb
    )
  $sql$),
  '42501',
  'tenant A cannot insert a tenant B preference row'
);
select pg_temp.assert_is(
  pg_temp.affected_rows($sql$
    update platform.user_preferences
    set value = '{"status":"dismissed"}'::jsonb
    where location_id = '00000000-0000-4000-8000-000000000b02'
  $sql$),
  0,
  'tenant A cannot update a tenant B preference row'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    delete from platform.user_preferences
    where location_id = '00000000-0000-4000-8000-000000000b01'
  $sql$),
  '42501',
  'no tenant can delete a preference row, its own included'
);
select pg_temp.assert_is(
  pg_temp.affected_rows($sql$
    insert into platform.user_preferences (location_id, user_id, key, value)
    values (
      '00000000-0000-4000-8000-000000000b01',
      '00000000-0000-4000-8000-000000000b11',
      'setup_profile.v1',
      '{"displayName":"Own tenant"}'::jsonb
    )
  $sql$),
  1,
  'tenant A can write its own preference row'
);
select pg_temp.assert_is(
  pg_temp.affected_rows($sql$
    update platform.user_preferences
    set value = '{"status":"completed","currentStep":7,"completedSteps":[1,2,3,4,5,6,7],"restartedCount":0}'::jsonb,
        updated_at = pg_catalog.now()
    where key = 'guided_setup.v1'
  $sql$),
  1,
  'tenant A can update its own preference row'
);

select platform.reset_transaction_context();
reset role;

select * from finish();
rollback;
