begin;

select plan(27);

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
values ('00000000-0000-4000-8000-000000000131', 'Durable Tenant', 'active');

insert into platform.app_users (id, safe_display_name)
values ('00000000-0000-4000-8000-000000000231', 'Durable User');

insert into platform.role_bindings (location_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000131',
  '00000000-0000-4000-8000-000000000231',
  'location_admin'
);

insert into platform.marketplace_installations (
  id, location_id, marketplace_app_id, status, installed_at
) values (
  '00000000-0000-4000-8000-000000000331',
  '00000000-0000-4000-8000-000000000131',
  'app-test-safe',
  'active',
  pg_catalog.statement_timestamp()
);

insert into billing.entitlement_versions (
  id, location_id, feature_key, version_no, source_event_ref, status, effective_at
) values (
  '00000000-0000-4000-8000-000000000631',
  '00000000-0000-4000-8000-000000000131',
  'campaign.publish', 1, 'stripe-event-safe', 'active',
  pg_catalog.statement_timestamp() - interval '1 minute'
);

reset role;
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000131',
  '00000000-0000-4000-8000-000000000231',
  'corr.durable-foundation'
);

do $forced_failure$
begin
  begin
    insert into campaign.campaigns (id, location_id, created_by_actor_id)
    values (
      '00000000-0000-4000-8000-000000000431',
      '00000000-0000-4000-8000-000000000131',
      '00000000-0000-4000-8000-000000000231'
    );
    insert into integration.command_executions (
      id, location_id, command_name, schema_version, actor_id, actor_type,
      resource_type, resource_id, input_hash, idempotency_key, correlation_id
    ) values (
      '00000000-0000-4000-8000-000000000531',
      '00000000-0000-4000-8000-000000000131',
      'ForcedFailure', 1,
      '00000000-0000-4000-8000-000000000231', 'user',
      'campaign', 'failed-safe-ref', repeat('1', 64), repeat('2', 64), 'corr.forced-failure'
    );
    insert into audit.events (
      location_id, actor_type, actor_id, subject_type, subject_id,
      action, result, correlation_id
    ) values (
      '00000000-0000-4000-8000-000000000131', 'user',
      '00000000-0000-4000-8000-000000000231', 'campaign', 'failed-safe-ref',
      'campaign.create', 'success', 'corr.forced-failure'
    );
    insert into integration.outbox_events (
      location_id, command_id, event_name, schema_version, aggregate_type,
      aggregate_id, idempotency_key, payload_ref, correlation_id
    ) values (
      '00000000-0000-4000-8000-000000000131',
      '00000000-0000-4000-8000-000000000531',
      'campaign.created.v1', 1, 'campaign', 'failed-safe-ref', repeat('3', 64),
      'payload.failed-safe-ref', 'corr.forced-failure'
    );
    raise exception 'forced transaction failure';
  exception when others then
    null;
  end;
end
$forced_failure$;

select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.campaigns where id = '00000000-0000-4000-8000-000000000431'),
  0,
  'failed command transaction creates no business state'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.command_executions where id = '00000000-0000-4000-8000-000000000531'),
  0,
  'failed command transaction creates no command record'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.outbox_events where command_id = '00000000-0000-4000-8000-000000000531'),
  0,
  'failed command transaction creates no outbox work'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from audit.events where correlation_id = 'corr.forced-failure'),
  0,
  'failed command transaction creates no audit fact'
);

insert into campaign.campaigns (id, location_id, created_by_actor_id)
values (
  '00000000-0000-4000-8000-000000000432',
  '00000000-0000-4000-8000-000000000131',
  '00000000-0000-4000-8000-000000000231'
);
insert into integration.command_executions (
  id, location_id, command_name, schema_version, actor_id, actor_type,
  resource_type, resource_id, input_hash, idempotency_key, status, correlation_id, committed_at
) values (
  '00000000-0000-4000-8000-000000000532',
  '00000000-0000-4000-8000-000000000131',
  'CreateCampaign', 1,
  '00000000-0000-4000-8000-000000000231', 'user',
  'campaign', 'campaign-safe-ref', repeat('4', 64), repeat('5', 64),
  'committed', 'corr.command-success', pg_catalog.statement_timestamp()
);
insert into audit.events (
  location_id, actor_type, actor_id, subject_type, subject_id,
  action, result, correlation_id
) values (
  '00000000-0000-4000-8000-000000000131', 'user',
  '00000000-0000-4000-8000-000000000231', 'campaign', 'campaign-safe-ref',
  'campaign.create', 'success', 'corr.command-success'
);
insert into integration.outbox_events (
  id, location_id, command_id, event_name, schema_version, aggregate_type,
  aggregate_id, idempotency_key, payload_ref, correlation_id
) values (
  '00000000-0000-4000-8000-000000000732',
  '00000000-0000-4000-8000-000000000131',
  '00000000-0000-4000-8000-000000000532',
  'campaign.created.v1', 1, 'campaign', 'campaign-safe-ref', repeat('6', 64),
  'payload.campaign-safe-ref', 'corr.command-success'
);

select pg_temp.assert_is((select pg_catalog.count(*)::integer from campaign.campaigns where id = '00000000-0000-4000-8000-000000000432'), 1, 'successful transaction has one business state');
select pg_temp.assert_is((select pg_catalog.count(*)::integer from integration.command_executions where id = '00000000-0000-4000-8000-000000000532'), 1, 'successful transaction has one command');
select pg_temp.assert_is((select pg_catalog.count(*)::integer from audit.events where correlation_id = 'corr.command-success'), 1, 'successful transaction has one audit fact');
select pg_temp.assert_is((select pg_catalog.count(*)::integer from integration.outbox_events where id = '00000000-0000-4000-8000-000000000732'), 1, 'successful transaction has one outbox event');

select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into integration.command_executions (
      location_id, command_name, schema_version, actor_id, actor_type,
      resource_type, resource_id, input_hash, idempotency_key, correlation_id
    ) values (
      '00000000-0000-4000-8000-000000000131', 'CreateCampaign', 1,
      '00000000-0000-4000-8000-000000000231', 'user', 'campaign', 'duplicate',
      repeat('7', 64), repeat('5', 64), 'corr.command-duplicate'
    )
  $sql$),
  '23505',
  'duplicate command idempotency is rejected'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into integration.outbox_events (
      location_id, command_id, event_name, schema_version, aggregate_type,
      aggregate_id, idempotency_key, payload_ref, correlation_id
    ) values (
      '00000000-0000-4000-8000-000000000131',
      '00000000-0000-4000-8000-000000000532',
      'campaign.created.v1', 1, 'campaign', 'duplicate', repeat('6', 64),
      'payload.duplicate', 'corr.outbox-duplicate'
    )
  $sql$),
  '23505',
  'duplicate outbox event idempotency is rejected'
);

insert into integration.delivery_claims (
  location_id, delivery_kind, external_delivery_id, business_outcome_key
) values (
  '00000000-0000-4000-8000-000000000131', 'task', 'task-delivery-001', 'campaign-outcome-001'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into integration.delivery_claims (
      location_id, delivery_kind, external_delivery_id, business_outcome_key
    ) values (
      '00000000-0000-4000-8000-000000000131', 'task', 'task-delivery-001', 'campaign-outcome-002'
    )
  $sql$),
  '23505',
  'duplicate task delivery is rejected'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into integration.delivery_claims (
      location_id, delivery_kind, external_delivery_id, business_outcome_key
    ) values (
      '00000000-0000-4000-8000-000000000131', 'task', 'task-delivery-002', 'campaign-outcome-001'
    )
  $sql$),
  '23505',
  'duplicate task business outcome is rejected'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.delivery_claims where delivery_kind = 'task'),
  1,
  'duplicate task attempts leave one delivery claim'
);

insert into integration.webhook_receipts (
  location_id, provider, environment, provider_event_id, event_type, provider_api_version,
  body_sha256, signature_verified, signature_verified_at, replay_window_bucket,
  correlation_id, retention_expires_at
) values (
  '00000000-0000-4000-8000-000000000131', 'stripe', 'local', 'evt_safe_001',
  'customer.subscription.updated', '2026-06-30', repeat('8', 64), true,
  pg_catalog.statement_timestamp(), pg_catalog.date_trunc('minute', pg_catalog.statement_timestamp()),
  'corr.webhook-001', pg_catalog.statement_timestamp() + interval '7 days'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into integration.webhook_receipts (
      location_id, provider, environment, provider_event_id, event_type, provider_api_version,
      body_sha256, signature_verified, signature_verified_at, replay_window_bucket,
      correlation_id, retention_expires_at
    ) values (
      '00000000-0000-4000-8000-000000000131', 'stripe', 'local', 'evt_safe_001',
      'customer.subscription.updated', '2026-06-30', repeat('9', 64), true,
      pg_catalog.statement_timestamp(), pg_catalog.date_trunc('minute', pg_catalog.statement_timestamp()),
      'corr.webhook-duplicate', pg_catalog.statement_timestamp() + interval '7 days'
    )
  $sql$),
  '23505',
  'duplicate webhook provider event is rejected'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.webhook_receipts where provider_event_id = 'evt_safe_001'),
  1,
  'duplicate webhook attempts leave one inbox receipt'
);

reset role;
set local role scheduler_runtime;
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.lease_outbox_batch('scheduler-test', 60, 10)),
  1,
  'sweeper leases the undispatched outbox event'
);
reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (select dispatch_attempts from integration.outbox_events where id = '00000000-0000-4000-8000-000000000732'),
  1,
  'first dispatch attempt is recorded'
);
update integration.outbox_events
set lease_expires_at = pg_catalog.statement_timestamp() - interval '1 second'
where id = '00000000-0000-4000-8000-000000000732';
reset role;
set local role scheduler_runtime;
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.lease_outbox_batch('scheduler-recovery', 60, 10)),
  1,
  'sweeper recovers a post-commit dispatch failure after lease expiry'
);
reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (select dispatch_attempts from integration.outbox_events where id = '00000000-0000-4000-8000-000000000732'),
  2,
  'recovered dispatch increments the attempt exactly once'
);

reset role;
set local role app_runtime;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$select integration.acquire_queue_lease(
    '00000000-0000-4000-8000-000000000131', 'provider', 'work-safe-001',
    repeat('a', 64), 'worker-safe-001', pg_catalog.statement_timestamp() + interval '5 minutes'
  )$sql$),
  null::text,
  'first tenant queue lease is acquired'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$select integration.acquire_queue_lease(
    '00000000-0000-4000-8000-000000000131', 'provider', 'work-safe-001',
    repeat('a', 64), 'worker-safe-001', pg_catalog.statement_timestamp() + interval '5 minutes'
  )$sql$),
  null::text,
  'duplicate queue lease returns the existing lease'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.queue_leases where queue_class = 'provider'),
  1,
  'idempotent queue acquisition creates one lease'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select integration.acquire_queue_lease(
      '00000000-0000-4000-8000-000000000131', 'provider', 'work-safe-002',
      repeat('b', 64), 'worker-safe-002', pg_catalog.statement_timestamp() + interval '5 minutes'
    )
  $sql$),
  '53300',
  'per-location queue limit prevents tenant capacity exhaustion'
);

select pg_temp.assert_ok(
  integration.authority_active(
    '00000000-0000-4000-8000-000000000131',
    'campaign.publish'
  ),
  'active install and entitlement authorize provider work'
);

select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$insert into integration.provider_operations (
    id, location_id, command_id, provider, operation_name, aggregate_type,
    aggregate_id, idempotency_key, safe_request_hash, status, response_class,
    uncertain_write, reconciliation_state, authority_checked_at
  ) values (
    '00000000-0000-4000-8000-000000000831',
    '00000000-0000-4000-8000-000000000131',
    '00000000-0000-4000-8000-000000000532',
    'ghl', 'create_contact', 'campaign', 'campaign-safe-ref',
    repeat('c', 64), repeat('d', 64), 'uncertain', 'UNCERTAIN_WRITE',
    true, 'required', pg_catalog.statement_timestamp()
  )$sql$),
  null::text,
  'uncertain provider write is stored for reconciliation'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into integration.provider_operations (
      location_id, command_id, provider, operation_name, aggregate_type,
      aggregate_id, idempotency_key, safe_request_hash, status, response_class,
      uncertain_write, reconciliation_state
    ) values (
      '00000000-0000-4000-8000-000000000131',
      '00000000-0000-4000-8000-000000000532',
      'ghl', 'create_contact', 'campaign', 'campaign-safe-ref',
      repeat('c', 64), repeat('e', 64), 'uncertain', 'UNCERTAIN_WRITE', true, 'required'
    )
  $sql$),
  '23505',
  'uncertain provider write cannot create a duplicate operation'
);

reset role;
set local role migration_owner;
update platform.marketplace_installations
set status = 'uninstalled', uninstalled_at = pg_catalog.statement_timestamp()
where id = '00000000-0000-4000-8000-000000000331';
reset role;
set local role app_runtime;
select pg_temp.assert_ok(
  not integration.authority_active(
    '00000000-0000-4000-8000-000000000131',
    'campaign.publish'
  ),
  'uninstall makes current provider authority fail closed'
);

reset role;
select * from finish();

rollback;
