begin;

select plan(8);

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
  ('00000000-0000-4000-8000-000000000121', 'Support Tenant A', 'active'),
  ('00000000-0000-4000-8000-000000000122', 'Support Tenant B', 'active');

insert into campaign.campaigns (id, location_id, created_by_actor_id)
values
  ('00000000-0000-4000-8000-000000000421', '00000000-0000-4000-8000-000000000121', '00000000-0000-4000-8000-000000000221'),
  ('00000000-0000-4000-8000-000000000422', '00000000-0000-4000-8000-000000000122', '00000000-0000-4000-8000-000000000222');

insert into platform.support_grants (
  id, location_id, support_actor_id, requested_by_actor_id, approved_by_actor_id,
  scope, reason_code, ticket_reference, starts_at, expires_at
) values (
  '00000000-0000-4000-8000-000000000321',
  '00000000-0000-4000-8000-000000000121',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000221',
  '00000000-0000-4000-8000-000000000221',
  'diagnose', 'customer-request', 'ticket-safe-001',
  pg_catalog.statement_timestamp() - interval '1 minute',
  pg_catalog.statement_timestamp() + interval '30 minutes'
);

reset role;
set local role support_runtime;
select pg_temp.assert_is((select pg_catalog.count(*)::integer from campaign.campaigns), 0, 'support reads nothing before audited access begins');
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$select platform.begin_support_access(
    '00000000-0000-4000-8000-000000000121',
    '00000000-0000-4000-8000-000000000301',
    'corr.support-001',
    'campaign',
    '00000000-0000-4000-8000-000000000421'
  )$sql$),
  null::text,
  'active support grant starts access'
);
select pg_temp.assert_is((select pg_catalog.count(*)::integer from campaign.campaigns), 1, 'support reads the granted tenant');
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.campaigns where location_id = '00000000-0000-4000-8000-000000000122'),
  0,
  'support cannot read a tenant without a grant'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from audit.events
    where location_id = '00000000-0000-4000-8000-000000000121'
      and actor_id = '00000000-0000-4000-8000-000000000301'
      and action = 'support.access.started'
      and result = 'success'
  ),
  1,
  'support access creates an append-only audit event'
);
select pg_temp.assert_ok(
  (
    select last_used_at is not null
    from platform.support_grants
    where id = '00000000-0000-4000-8000-000000000321'
  ),
  'support grant records its last use'
);

reset role;
set local role support_runtime;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.begin_support_access(
      '00000000-0000-4000-8000-000000000122',
      '00000000-0000-4000-8000-000000000301',
      'corr.support-denied',
      'campaign',
      '00000000-0000-4000-8000-000000000422'
    )
  $sql$),
  '42501',
  'support cannot start access without a matching grant'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    update audit.events
    set result = 'failed'
    where location_id = '00000000-0000-4000-8000-000000000121'
      and action = 'support.access.started'
  $sql$),
  '55000',
  'audit events reject mutation'
);

reset role;
select * from finish();

rollback;
