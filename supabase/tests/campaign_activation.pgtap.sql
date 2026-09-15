begin;

select plan(28);

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
  ('00000000-0000-4000-8000-000000000801', 'Activation Tenant A', 'active'),
  ('00000000-0000-4000-8000-000000000802', 'Activation Tenant B', 'active');

insert into platform.app_users (id, safe_display_name)
values
  ('00000000-0000-4000-8000-000000000811', 'Activation User A'),
  ('00000000-0000-4000-8000-000000000812', 'Activation User B');

insert into platform.role_bindings (location_id, user_id, role)
values
  ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000811', 'location_admin'),
  ('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000812', 'location_admin');

insert into campaign.campaigns (
  id, location_id, campaign_ref, created_by_actor_id, status
) values
  (
    '00000000-0000-4000-8000-000000000821',
    '00000000-0000-4000-8000-000000000801',
    'campaign_01ActivationA',
    '00000000-0000-4000-8000-000000000811',
    'draft'
  ),
  (
    '00000000-0000-4000-8000-000000000822',
    '00000000-0000-4000-8000-000000000802',
    'campaign_01ActivationB',
    '00000000-0000-4000-8000-000000000812',
    'draft'
  );

insert into campaign.campaign_versions (
  id, location_id, campaign_id, campaign_ref, campaign_version_ref, version_no,
  location_ref, input_versions, manifest, manifest_hash,
  created_by_actor_id, created_by_actor_ref
) values
  (
    '00000000-0000-4000-8000-000000000831',
    '00000000-0000-4000-8000-000000000801',
    '00000000-0000-4000-8000-000000000821',
    'campaign_01ActivationA',
    'version_01ActivationA',
    1,
    'location_01ActivationA',
    '{"blueprintVersionRef":"blueprint_01OpenHouse"}'::jsonb,
    '{"blueprintId":"open-house-boost"}'::jsonb,
    pg_catalog.repeat('a', 64),
    '00000000-0000-4000-8000-000000000811',
    'user_01ActivationA'
  ),
  (
    '00000000-0000-4000-8000-000000000832',
    '00000000-0000-4000-8000-000000000802',
    '00000000-0000-4000-8000-000000000822',
    'campaign_01ActivationB',
    'version_01ActivationB',
    1,
    'location_01ActivationB',
    '{"blueprintVersionRef":"blueprint_01OpenHouse"}'::jsonb,
    '{"blueprintId":"open-house-boost"}'::jsonb,
    pg_catalog.repeat('b', 64),
    '00000000-0000-4000-8000-000000000812',
    'user_01ActivationB'
  );

insert into campaign.preflight_results (
  id, location_id, campaign_id, campaign_version_id, campaign_ref, campaign_version_ref,
  manifest_hash, result_hash, ruleset_version_ref, blocking, findings, input_versions,
  evaluated_at
) values (
  '00000000-0000-4000-8000-000000000841',
  '00000000-0000-4000-8000-000000000801',
  '00000000-0000-4000-8000-000000000821',
  '00000000-0000-4000-8000-000000000831',
  'campaign_01ActivationA',
  'version_01ActivationA',
  pg_catalog.repeat('a', 64),
  pg_catalog.repeat('c', 64),
  'ruleset_01Activation',
  false,
  '[]'::jsonb,
  '{"rulesetVersionRef":"ruleset_01Activation"}'::jsonb,
  '2026-07-21T16:00:00.000Z'::timestamptz
);

insert into campaign.approval_decisions (
  id, location_id, campaign_id, campaign_version_id, approval_ref, location_ref,
  campaign_ref, campaign_version_ref, manifest_hash, preflight_result_hash,
  actor_id, actor_ref, actor_kind, actor_role, decided_at, ip_audit_hash, decision, snapshot
) values (
  '00000000-0000-4000-8000-000000000851',
  '00000000-0000-4000-8000-000000000801',
  '00000000-0000-4000-8000-000000000821',
  '00000000-0000-4000-8000-000000000831',
  'approval_01ActivationA',
  'location_01ActivationA',
  'campaign_01ActivationA',
  'version_01ActivationA',
  pg_catalog.repeat('a', 64),
  pg_catalog.repeat('c', 64),
  '00000000-0000-4000-8000-000000000811',
  'user_01ActivationA',
  'human',
  'location_admin',
  '2026-07-21T16:05:00.000Z'::timestamptz,
  pg_catalog.repeat('d', 64),
  'approved',
  '{"pageVersionRef":"page_01Approved"}'::jsonb
);

reset role;

select has_table('campaign', 'campaign_versions', 'campaign_versions exists');
select has_table('campaign', 'preflight_results', 'preflight_results exists');
select has_table('campaign', 'approval_decisions', 'approval_decisions exists');
select has_column('campaign', 'campaigns', 'campaign_ref', 'campaigns.campaign_ref exists');

select pg_temp.assert_ok(
  not has_table_privilege('app_runtime', 'campaign.campaign_versions', 'UPDATE'),
  'app runtime cannot update campaign versions'
);
select pg_temp.assert_ok(
  not has_table_privilege('app_runtime', 'campaign.campaign_versions', 'DELETE'),
  'app runtime cannot delete campaign versions'
);
select pg_temp.assert_ok(
  not has_table_privilege('app_runtime', 'campaign.preflight_results', 'UPDATE'),
  'app runtime cannot update preflight results'
);
select pg_temp.assert_ok(
  not has_table_privilege('app_runtime', 'campaign.preflight_results', 'DELETE'),
  'app runtime cannot delete preflight results'
);
select pg_temp.assert_ok(
  not has_table_privilege('app_runtime', 'campaign.approval_decisions', 'UPDATE'),
  'app runtime cannot update approval decisions'
);
select pg_temp.assert_ok(
  not has_table_privilege('app_runtime', 'campaign.approval_decisions', 'DELETE'),
  'app runtime cannot delete approval decisions'
);
select pg_temp.assert_ok(
  has_table_privilege('support_runtime', 'campaign.campaign_versions', 'SELECT'),
  'support runtime can select campaign versions'
);
select pg_temp.assert_ok(
  not has_table_privilege('support_runtime', 'campaign.campaign_versions', 'INSERT'),
  'support runtime cannot insert campaign versions'
);

set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000801',
  '00000000-0000-4000-8000-000000000811',
  'corr.campaign-activation'
);

select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.campaign_versions),
  1,
  'tenant A reads only its campaign version'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from campaign.campaign_versions
    where campaign_version_ref = 'version_01ActivationB'
  ),
  0,
  'tenant A cannot read tenant B by version reference'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.preflight_results),
  1,
  'tenant A reads only its preflight result'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.approval_decisions),
  1,
  'tenant A reads only its approval decision'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into campaign.campaign_versions (
      location_id, campaign_id, campaign_ref, campaign_version_ref, version_no,
      location_ref, input_versions, manifest, manifest_hash,
      created_by_actor_id, created_by_actor_ref
    ) values (
      '00000000-0000-4000-8000-000000000802',
      '00000000-0000-4000-8000-000000000822',
      'campaign_01ActivationB',
      'version_02ActivationB',
      2,
      'location_01ActivationB',
      '{"blueprintVersionRef":"blueprint_01OpenHouse"}'::jsonb,
      '{"blueprintId":"open-house-boost"}'::jsonb,
      pg_catalog.repeat('e', 64),
      '00000000-0000-4000-8000-000000000811',
      'user_01ActivationA'
    )
  $sql$),
  '42501',
  'tenant A cannot insert a tenant B campaign version'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into campaign.campaign_versions (
      location_id, campaign_id, campaign_ref, campaign_version_ref, version_no,
      location_ref, input_versions, manifest, manifest_hash,
      created_by_actor_id, created_by_actor_ref
    ) values (
      '00000000-0000-4000-8000-000000000801',
      '00000000-0000-4000-8000-000000000821',
      'campaign_01ActivationA',
      'version_01ActivationA',
      2,
      'location_01ActivationA',
      '{"blueprintVersionRef":"blueprint_01OpenHouse"}'::jsonb,
      '{"blueprintId":"open-house-boost"}'::jsonb,
      pg_catalog.repeat('a', 64),
      '00000000-0000-4000-8000-000000000811',
      'user_01ActivationA'
    )
  $sql$),
  '23505',
  'duplicate campaign version references are rejected'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into campaign.campaign_versions (
      location_id, campaign_id, campaign_ref, campaign_version_ref, version_no,
      location_ref, input_versions, manifest, manifest_hash,
      created_by_actor_id, created_by_actor_ref
    ) values (
      '00000000-0000-4000-8000-000000000801',
      '00000000-0000-4000-8000-000000000821',
      'campaign_01ActivationA',
      'version_02ActivationA',
      1,
      'location_01ActivationA',
      '{"blueprintVersionRef":"blueprint_01OpenHouse"}'::jsonb,
      '{"blueprintId":"open-house-boost"}'::jsonb,
      pg_catalog.repeat('a', 64),
      '00000000-0000-4000-8000-000000000811',
      'user_01ActivationA'
    )
  $sql$),
  '23505',
  'duplicate campaign version numbers are rejected'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into campaign.preflight_results (
      location_id, campaign_id, campaign_version_id, campaign_ref, campaign_version_ref,
      manifest_hash, result_hash, ruleset_version_ref, blocking, findings, input_versions,
      evaluated_at
    ) values (
      '00000000-0000-4000-8000-000000000801',
      '00000000-0000-4000-8000-000000000821',
      '00000000-0000-4000-8000-000000000831',
      'campaign_01ActivationA',
      'version_01ActivationA',
      pg_catalog.repeat('a', 64),
      pg_catalog.repeat('c', 64),
      'ruleset_01Activation',
      false,
      '[]'::jsonb,
      '{"rulesetVersionRef":"ruleset_01Activation"}'::jsonb,
      '2026-07-21T16:00:00.000Z'::timestamptz
    )
  $sql$),
  '23505',
  'duplicate preflight result identities are rejected'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    insert into campaign.campaigns (
      location_id, campaign_ref, created_by_actor_id
    ) values (
      '00000000-0000-4000-8000-000000000801',
      'campaign_01ActivationA',
      '00000000-0000-4000-8000-000000000811'
    )
  $sql$),
  '23505',
  'duplicate campaign refs in one location are rejected'
);

reset role;
set local role app_runtime;
select platform.reset_transaction_context();
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.campaign_versions),
  0,
  'missing tenant context reads no campaign versions'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    update campaign.campaign_versions
    set version_no = 9
    where id = '00000000-0000-4000-8000-000000000831'
  $sql$),
  '55000',
  'campaign versions are append-only on update'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    delete from campaign.campaign_versions
    where id = '00000000-0000-4000-8000-000000000831'
  $sql$),
  '55000',
  'campaign versions are append-only on delete'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    update campaign.preflight_results
    set blocking = true
    where id = '00000000-0000-4000-8000-000000000841'
  $sql$),
  '55000',
  'preflight results are append-only on update'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    delete from campaign.preflight_results
    where id = '00000000-0000-4000-8000-000000000841'
  $sql$),
  '55000',
  'preflight results are append-only on delete'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    update campaign.approval_decisions
    set decision = 'rejected'
    where id = '00000000-0000-4000-8000-000000000851'
  $sql$),
  '55000',
  'approval decisions are append-only on update'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    delete from campaign.approval_decisions
    where id = '00000000-0000-4000-8000-000000000851'
  $sql$),
  '55000',
  'approval decisions are append-only on delete'
);

reset role;
select * from finish();

rollback;
