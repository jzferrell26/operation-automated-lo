select plan(6);

create function pg_temp.assert_is(actual anyelement, expected anyelement, description text)
returns text
language sql
security definer
as $function$ select is(actual, expected, description) $function$;

begin;
set local role migration_owner;
insert into platform.locations (id, display_name, status)
values ('00000000-0000-4000-8000-000000000111', 'Context Reset Tenant', 'active');
insert into platform.app_users (id, safe_display_name)
values ('00000000-0000-4000-8000-000000000211', 'Context Reset User');
insert into platform.role_bindings (location_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000111',
  '00000000-0000-4000-8000-000000000211',
  'location_admin'
);
commit;

begin;
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000111',
  '00000000-0000-4000-8000-000000000211',
  'corr.context-commit'
);
select pg_temp.assert_is(
  platform.current_location_id(),
  '00000000-0000-4000-8000-000000000111'::uuid,
  'tenant context exists inside the committing transaction'
);
commit;

set role migration_owner;
select pg_temp.assert_is(platform.current_location_id(), null::uuid, 'tenant context resets after commit');
select pg_temp.assert_is(platform.current_actor_id(), null::uuid, 'actor context resets after commit');
reset role;

begin;
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000111',
  '00000000-0000-4000-8000-000000000211',
  'corr.context-rollback'
);
select pg_temp.assert_is(
  platform.current_location_id(),
  '00000000-0000-4000-8000-000000000111'::uuid,
  'tenant context exists inside the rolling-back transaction'
);
rollback;

set role migration_owner;
select pg_temp.assert_is(platform.current_location_id(), null::uuid, 'tenant context resets after rollback');
select pg_temp.assert_is(platform.current_actor_id(), null::uuid, 'actor context resets after rollback');
reset role;

begin;
set local role migration_owner;
delete from platform.role_bindings where location_id = '00000000-0000-4000-8000-000000000111';
delete from platform.app_users where id = '00000000-0000-4000-8000-000000000211';
delete from platform.locations where id = '00000000-0000-4000-8000-000000000111';
commit;

select * from finish();
