begin;

select plan(13);

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

insert into platform.agencies (id, display_name)
values ('00000000-0000-4000-8000-000000000001', 'Isolation Agency');

insert into platform.locations (id, agency_id, display_name, status)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Tenant A', 'active'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Tenant B', 'active');

insert into platform.app_users (id, safe_display_name)
values
  ('00000000-0000-4000-8000-000000000201', 'Tenant A User'),
  ('00000000-0000-4000-8000-000000000202', 'Tenant B User');

insert into platform.role_bindings (location_id, user_id, role)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'location_admin'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000202', 'location_admin');

insert into campaign.campaigns (id, location_id, created_by_actor_id)
values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000202');

reset role;
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'corr.tenant-isolation'
);

select pg_temp.assert_is((select pg_catalog.count(*)::integer from campaign.campaigns), 1, 'tenant A reads only its row');
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.campaigns where location_id = '00000000-0000-4000-8000-000000000102'),
  0,
  'tenant A cannot infer tenant B by a direct predicate'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into campaign.campaigns (location_id, created_by_actor_id)
    values ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000201')
  $sql$),
  '42501',
  'tenant A cannot insert a tenant B row'
);
select pg_temp.assert_is(
  pg_temp.affected_rows($sql$
    update campaign.campaigns
    set row_version = row_version + 1
    where location_id = '00000000-0000-4000-8000-000000000102'
  $sql$),
  0,
  'tenant A cannot modify tenant B'
);
select pg_temp.assert_is(
  pg_temp.affected_rows($sql$
    update campaign.campaigns
    set status = 'approved'
    where location_id = '00000000-0000-4000-8000-000000000102'
  $sql$),
  0,
  'tenant A cannot approve tenant B'
);
select pg_temp.assert_is(
  pg_temp.affected_rows($sql$
    update campaign.campaigns
    set status = 'live'
    where location_id = '00000000-0000-4000-8000-000000000102'
  $sql$),
  0,
  'tenant A cannot publish tenant B'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.campaigns where location_id = '00000000-0000-4000-8000-000000000102'),
  0,
  'tenant A export-shaped reads return no tenant B rows'
);
select pg_temp.assert_is(
  pg_temp.affected_rows($sql$
    delete from campaign.campaigns
    where location_id = '00000000-0000-4000-8000-000000000102'
  $sql$),
  0,
  'tenant A cannot delete tenant B'
);
select pg_temp.assert_ok(
  not has_function_privilege(
    'app_runtime',
    'platform.begin_support_access(uuid,uuid,text,text,text)',
    'EXECUTE'
  ),
  'app runtime cannot invoke support access'
);

reset role;
set local role app_runtime;
select platform.reset_transaction_context();
select pg_temp.assert_is((select pg_catalog.count(*)::integer from campaign.campaigns), 0, 'missing tenant context reads no rows');
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into campaign.campaigns (location_id, created_by_actor_id)
    values ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201')
  $sql$),
  '42501',
  'missing tenant context fails writes closed'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.set_app_context(
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000201',
      'corr.cross-location'
    )
  $sql$),
  '42501',
  'tenant A actor cannot establish tenant B context'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into integration.command_executions (
      id, location_id, command_name, schema_version, actor_id, actor_type,
      resource_type, resource_id, input_hash, idempotency_key, correlation_id
    ) values (
      '00000000-0000-4000-8000-000000000501',
      '00000000-0000-4000-8000-000000000101',
      'TestTenantConstraint', 1,
      '00000000-0000-4000-8000-000000000201', 'user',
      'campaign', 'safe-ref', repeat('a', 64), repeat('b', 64), 'corr.fk-test'
    );
    insert into integration.outbox_events (
      location_id, command_id, event_name, schema_version, aggregate_type,
      aggregate_id, idempotency_key, payload_ref, correlation_id
    ) values (
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000501',
      'campaign.test.v1', 1, 'campaign', 'safe-ref', repeat('c', 64), 'opaque-ref', 'corr.fk-test'
    )
  $sql$),
  '23503',
  'tenant-consistent foreign keys reject cross-location references'
);

reset role;
select * from finish();

rollback;
