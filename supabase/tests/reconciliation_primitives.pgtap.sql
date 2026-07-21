begin;

select plan(45);

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

create function pg_temp.ai_usage(reference text)
returns jsonb
language sql
immutable
security definer
set search_path = ''
as $function$
  select pg_catalog.jsonb_build_object(
    'usageEventRef', reference,
    'locationRef', 'location_durable_001',
    'actorRef', 'actor_durable_001',
    'feature', 'campaign_pack',
    'campaignRef', 'campaign_durable_001',
    'brandVersionRef', 'brandversion_durable_001',
    'correlationRef', 'correlation_durable_001',
    'providerRef', 'provider_anthropic',
    'modelRef', 'claude-sonnet-production',
    'modelPolicyVersionRef', 'modelpolicy_durable_001',
    'promptPolicyVersionRef', 'promptpolicy_durable_001',
    'providerRequestRef', 'providerrequest_durable_001',
    'tokenUsage', pg_catalog.jsonb_build_object(
      'cacheWriteTokens', 0,
      'cacheReadTokens', 0,
      'uncachedInputTokens', 100,
      'outputTokens', 25,
      'totalTokens', 125
    ),
    'estimatedCostUsd', 0.01,
    'latencyMs', 125,
    'retryCount', 0,
    'outcome', 'accepted',
    'chargedPlanUnit', 'campaign_pack',
    'occurredAt', '2026-07-21T19:30:00.000Z'
  )
$function$;

create function pg_temp.ai_trace(reference text)
returns jsonb
language sql
immutable
security definer
set search_path = ''
as $function$
  select pg_catalog.jsonb_build_object(
    'traceRef', reference,
    'locationRef', 'location_durable_001',
    'actorRef', 'actor_durable_001',
    'correlationRef', 'correlation_durable_001',
    'feature', 'campaign_pack',
    'routeRef', 'route_primary',
    'modelPolicyVersionRef', 'modelpolicy_durable_001',
    'promptPolicyVersionRef', 'promptpolicy_durable_001',
    'promptContextHash', pg_catalog.repeat('a', 64),
    'acceptedOutputHash', pg_catalog.repeat('b', 64),
    'providerRequestRef', 'providerrequest_durable_001',
    'latencyMs', 125,
    'outcome', 'accepted',
    'occurredAt', '2026-07-21T19:30:00.000Z'
  )
$function$;

create function pg_temp.cleanup_intent(
  reference text default pg_catalog.repeat('c', 64),
  attempts integer default 3
)
returns jsonb
language sql
immutable
security definer
set search_path = ''
as $function$
  select pg_catalog.jsonb_build_object(
    'locationRef', 'location_durable_001',
    'publicBucket', 'oalo-public-test',
    'publicCampaignId', 'campaign_durable_001',
    'campaignVersionRef', 'campaignversion_durable_001',
    'publishedVersion', 1,
    'attemptedKeys', pg_catalog.jsonb_build_array(
      'public/campaign_durable_001/v1/social.png',
      'public/campaign_durable_001/v1/print.pdf'
    ),
    'idempotencyKey', reference,
    'maximumAttempts', attempts,
    'problemCode', 'PUBLICATION_PARTIAL_FAILURE'
  )
$function$;

insert into platform.locations (id, ghl_location_id, display_name, status)
values (
  '00000000-0000-4000-8000-000000000141',
  'location_durable_001',
  'Reconciliation Tenant',
  'active'
);

insert into platform.app_users (id, safe_display_name)
values ('00000000-0000-4000-8000-000000000241', 'Reconciliation Actor');

insert into platform.role_bindings (location_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000141',
  '00000000-0000-4000-8000-000000000241',
  'location_admin'
);

reset role;
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000141',
  '00000000-0000-4000-8000-000000000241',
  'correlation_durable_001'
);

insert into integration.delivery_claims (
  location_id, delivery_kind, external_delivery_id, business_outcome_key
) values (
  '00000000-0000-4000-8000-000000000141',
  'task',
  'delivery_durable_001',
  pg_catalog.repeat('d', 64)
);
select pg_temp.assert_ok(
  integration.mark_delivery_completion_uncertain_v1(
    'task', 'delivery_durable_001', pg_catalog.repeat('d', 64),
    'DELIVERY_COMPLETION_UNCERTAIN'
  ),
  'active delivery claim is marked completion uncertain'
);
select pg_temp.assert_is(
  (select status from integration.delivery_claims where external_delivery_id = 'delivery_durable_001'),
  'completion_uncertain',
  'completion uncertainty is persisted as a terminal non-reclaimable state'
);
select pg_temp.assert_is(
  (select problem_code from integration.delivery_claims where external_delivery_id = 'delivery_durable_001'),
  'DELIVERY_COMPLETION_UNCERTAIN',
  'completion uncertainty preserves its stable problem code'
);
select pg_temp.assert_ok(
  (select completion_uncertain_at is not null from integration.delivery_claims
    where external_delivery_id = 'delivery_durable_001'),
  'completion uncertainty records its timestamp'
);
select pg_temp.assert_ok(
  not integration.mark_delivery_completion_uncertain_v1(
    'task', 'delivery_durable_001', pg_catalog.repeat('d', 64),
    'DELIVERY_COMPLETION_UNCERTAIN'
  ),
  'a terminal uncertain claim cannot be marked again'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.delivery_claims
    where external_delivery_id = 'delivery_durable_001' and status = 'released'),
  0,
  'completion uncertainty never makes a claim reclaimable'
);

select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select * from integration.record_ai_telemetry_pair_v1(
      pg_temp.ai_usage('usage_durable_001'),
      pg_temp.ai_trace('trace_durable_001')
    )
  $sql$),
  null::text,
  'validated AI usage and trace persist atomically'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.ai_usage_events
    where usage_event_ref = 'usage_durable_001'),
  1,
  'atomic telemetry persistence writes one usage row'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.ai_trace_records
    where trace_ref = 'trace_durable_001'),
  1,
  'atomic telemetry persistence writes one trace row'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select * from integration.record_ai_telemetry_pair_v1(
      pg_temp.ai_usage('usage_rollback_001'),
      pg_temp.ai_trace('trace_durable_001')
    )
  $sql$),
  '23505',
  'a trace uniqueness failure aborts the telemetry pair'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.ai_usage_events
    where usage_event_ref = 'usage_rollback_001'),
  0,
  'failed trace persistence rolls back its usage row'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.ai_trace_records
    where trace_ref = 'trace_durable_001'),
  1,
  'partial telemetry failure leaves the original trace unchanged'
);
select pg_temp.assert_is(
  integration.mark_ai_telemetry_reconciliation_required_v1(
    pg_temp.ai_usage('usage_rollback_001'),
    pg_temp.ai_trace('trace_durable_001'),
    'AI_TELEMETRY_PERSISTENCE_FAILED'
  ),
  'pending',
  'failed telemetry pair creates a pending reconciliation marker'
);
select pg_temp.assert_is(
  integration.mark_ai_telemetry_reconciliation_required_v1(
    pg_temp.ai_usage('usage_rollback_001'),
    pg_temp.ai_trace('trace_durable_001'),
    'AI_TELEMETRY_PERSISTENCE_FAILED'
  ),
  'pending',
  'repeated telemetry marker upsert returns the existing pending marker'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.ai_telemetry_reconciliation_queue
    where usage_event_ref = 'usage_rollback_001' and trace_ref = 'trace_durable_001'),
  1,
  'telemetry reconciliation marker is idempotent by usage and trace reference'
);
select pg_temp.assert_is(
  (select usage_payload->>'usageEventRef' from integration.ai_telemetry_reconciliation_queue
    where usage_event_ref = 'usage_rollback_001'),
  'usage_rollback_001',
  'telemetry reconciliation retains the validated usage payload'
);
select pg_temp.assert_is(
  (select problem_code from integration.ai_telemetry_reconciliation_queue
    where usage_event_ref = 'usage_rollback_001'),
  'AI_TELEMETRY_PERSISTENCE_FAILED',
  'telemetry reconciliation retains its stable problem code'
);

select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select integration.enqueue_publication_cleanup_v1(
      pg_temp.cleanup_intent()
      || pg_catalog.jsonb_build_object('locationRef', 'location_other_001')
    )
  $sql$),
  '42501',
  'cleanup enqueue rejects a public object namespace outside the active tenant'
);
select pg_temp.assert_is(
  integration.enqueue_publication_cleanup_v1(pg_temp.cleanup_intent()),
  'enqueued',
  'partial publication enqueues durable cleanup work'
);
select pg_temp.assert_is(
  integration.enqueue_publication_cleanup_v1(pg_temp.cleanup_intent()),
  'already_pending',
  'repeated cleanup enqueue converges on the pending intent'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('c', 64)),
  1,
  'cleanup idempotency key stores one intent'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.claim_publication_cleanup_batch_v1(
    'cleanup-worker-001', 10, pg_catalog.statement_timestamp() + interval '5 minutes'
  )),
  1,
  'cleanup worker claims one pending intent'
);
select pg_temp.assert_is(
  (select status || ':' || attempt_count::text from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('c', 64)),
  'reconciling:1',
  'cleanup claim records reconciling state and attempt count'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select integration.release_publication_cleanup_after_failure_v1(
      pg_catalog.repeat('c', 64), 'stale-cleanup-worker',
      'PUBLICATION_QUARANTINE_RETRY_FAILED',
      pg_catalog.statement_timestamp() + interval '1 minute'
    )
  $sql$),
  '55000',
  'a stale cleanup worker cannot release a newer lease'
);
select pg_temp.assert_is(
  integration.release_publication_cleanup_after_failure_v1(
    pg_catalog.repeat('c', 64), 'cleanup-worker-001',
    'PUBLICATION_QUARANTINE_RETRY_FAILED',
    pg_catalog.statement_timestamp() + interval '1 minute'
  ),
  'pending',
  'failed cleanup attempt releases the intent for retry'
);
select pg_temp.assert_is(
  (select status from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('c', 64)),
  'pending',
  'cleanup failure leaves durable work pending'
);
select pg_temp.assert_is(
  (select last_error_code from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('c', 64)),
  'PUBLICATION_QUARANTINE_RETRY_FAILED',
  'cleanup failure records its stable retry problem code'
);
select pg_temp.assert_ok(
  (select available_at > pg_catalog.statement_timestamp()
     from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('c', 64)),
  'cleanup failure persists its next-attempt backoff timestamp'
);
select pg_temp.assert_is(
  (select pg_catalog.cardinality(attempted_keys) from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('c', 64)),
  2,
  'cleanup failure preserves every attempted public key'
);

reset role;
set local role migration_owner;
update integration.publication_cleanup_intents
   set available_at = pg_catalog.statement_timestamp() - interval '1 second'
 where idempotency_key = pg_catalog.repeat('c', 64);
reset role;
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000141',
  '00000000-0000-4000-8000-000000000241',
  'correlation_durable_001'
);

select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.claim_publication_cleanup_batch_v1(
    'cleanup-worker-002', 10, pg_catalog.statement_timestamp() + interval '5 minutes'
  )),
  1,
  'released cleanup intent can be claimed for another attempt'
);
select pg_temp.assert_ok(
  not integration.complete_publication_cleanup_v1(
    pg_catalog.repeat('c', 64),
    'cleanup-worker-001',
    pg_catalog.jsonb_build_array(
      'public/campaign_durable_001/v1/social.png',
      'public/campaign_durable_001/v1/print.pdf'
    )
  ),
  'a stale cleanup worker cannot complete a reclaimed lease'
);
select pg_temp.assert_ok(
  not integration.complete_publication_cleanup_v1(
    pg_catalog.repeat('c', 64),
    'cleanup-worker-002',
    pg_catalog.jsonb_build_array('public/campaign_durable_001/v1/social.png')
  ),
  'cleanup cannot complete without confirmation for every attempted key'
);
select pg_temp.assert_ok(
  integration.complete_publication_cleanup_v1(
    pg_catalog.repeat('c', 64),
    'cleanup-worker-002',
    pg_catalog.jsonb_build_array(
      'public/campaign_durable_001/v1/social.png',
      'public/campaign_durable_001/v1/print.pdf'
    )
  ),
  'confirmed quarantine completes the cleanup intent'
);
select pg_temp.assert_is(
  (select status from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('c', 64)),
  'completed',
  'cleanup completion is persisted'
);
select pg_temp.assert_is(
  integration.enqueue_publication_cleanup_v1(pg_temp.cleanup_intent()),
  'already_completed',
  'completed cleanup remains idempotent on repeated enqueue'
);
select pg_temp.assert_is(
  (select pg_catalog.cardinality(quarantined_keys) from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('c', 64)),
  2,
  'cleanup completion preserves confirmed quarantined keys'
);

select pg_temp.assert_is(
  integration.enqueue_publication_cleanup_v1(
    pg_temp.cleanup_intent(pg_catalog.repeat('e', 64), 2)
  ),
  'enqueued',
  'crash-recovery cleanup intent is enqueued with a bounded attempt ceiling'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.claim_publication_cleanup_batch_v1(
    'crash-worker-001', 10, pg_catalog.statement_timestamp() + interval '5 minutes'
  )),
  1,
  'crash-recovery cleanup intent receives its first lease'
);
select pg_temp.assert_is(
  (select attempt_count from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('e', 64)),
  1,
  'first crash-recovery lease consumes one attempt'
);

reset role;
set local role migration_owner;
update integration.publication_cleanup_intents
   set lease_expires_at = pg_catalog.statement_timestamp() - interval '1 second'
 where idempotency_key = pg_catalog.repeat('e', 64);
reset role;
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000141',
  '00000000-0000-4000-8000-000000000241',
  'correlation_durable_001'
);

select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.claim_publication_cleanup_batch_v1(
    'crash-worker-002', 10, pg_catalog.statement_timestamp() + interval '5 minutes'
  )),
  1,
  'an expired reconciling lease is reclaimed after worker failure'
);
select pg_temp.assert_is(
  (select attempt_count::text || ':' || last_error_code
     from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('e', 64)),
  '2:PUBLICATION_CLEANUP_LEASE_EXPIRED',
  'lease reclamation records the second attempt and crash-recovery reason'
);

reset role;
set local role migration_owner;
update integration.publication_cleanup_intents
   set lease_expires_at = pg_catalog.statement_timestamp() - interval '1 second'
 where idempotency_key = pg_catalog.repeat('e', 64);
reset role;
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000141',
  '00000000-0000-4000-8000-000000000241',
  'correlation_durable_001'
);

select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from integration.claim_publication_cleanup_batch_v1(
    'crash-worker-003', 10, pg_catalog.statement_timestamp() + interval '5 minutes'
  )),
  0,
  'an expired lease at its attempt ceiling is not reclaimed again'
);
select pg_temp.assert_is(
  (select status || ':' || last_error_code
     from integration.publication_cleanup_intents
    where idempotency_key = pg_catalog.repeat('e', 64)),
  'dead_lettered:PUBLICATION_CLEANUP_LEASE_EXHAUSTED',
  'exhausted crash recovery terminates in the observable dead-letter state'
);
select pg_temp.assert_is(
  integration.enqueue_publication_cleanup_v1(
    pg_temp.cleanup_intent(pg_catalog.repeat('e', 64), 2)
  ),
  'already_dead_lettered',
  'a dead-lettered cleanup remains terminal on repeated enqueue'
);
select pg_temp.assert_ok(
  not has_table_privilege('app_runtime', 'integration.ai_usage_events', 'INSERT')
    and not has_table_privilege('app_runtime', 'integration.ai_trace_records', 'INSERT')
    and not has_table_privilege('app_runtime', 'integration.publication_cleanup_intents', 'UPDATE'),
  'application runtime writes reconciliation state only through validated functions'
);

reset role;
select * from finish();

rollback;
