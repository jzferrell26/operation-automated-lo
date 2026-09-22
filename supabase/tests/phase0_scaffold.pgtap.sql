begin;

select plan(20);

create function pg_temp.assert_is(actual anyelement, expected anyelement, description text)
returns text
language sql
security definer
as $function$ select is(actual, expected, description) $function$;

select has_schema('platform', 'platform schema exists');
select has_schema('configuration', 'configuration schema exists');
select has_schema('campaign', 'campaign schema exists');
select has_schema('integration', 'integration schema exists');
select has_schema('billing', 'billing schema exists');
select has_schema('audit', 'audit schema exists');

select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_roles
    where rolname in (
      'app_runtime', 'scheduler_runtime', 'support_runtime', 'reporting_runtime', 'migration_owner'
    )
  ),
  5,
  'all five foundation roles exist'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_roles
    where rolname in (
      'app_runtime', 'scheduler_runtime', 'support_runtime', 'reporting_runtime', 'migration_owner'
    )
      and not rolsuper
      and not rolcreatedb
      and not rolcreaterole
      and not rolinherit
      and not rolreplication
      and not rolbypassrls
      and not rolcanlogin
  ),
  5,
  'foundation roles are NOLOGIN, NOINHERIT, and have no elevated attributes'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    join pg_catalog.pg_roles as owner_role on owner_role.oid = class.relowner
    where namespace.nspname in ('platform', 'configuration', 'campaign', 'integration', 'billing', 'audit')
      and class.relkind in ('r', 'v')
      and owner_role.rolname <> 'migration_owner'
  ),
  0,
  'migration_owner owns every foundation table and view'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    join pg_catalog.pg_roles as owner_role on owner_role.oid = class.relowner
    where namespace.nspname in ('platform', 'configuration', 'campaign', 'integration', 'billing', 'audit')
      and class.relkind = 'r'
      and owner_role.rolname in ('app_runtime', 'scheduler_runtime', 'support_runtime', 'reporting_runtime')
  ),
  0,
  'no runtime role owns a product table'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname in ('platform', 'configuration', 'campaign', 'integration', 'billing', 'audit')
      and class.relkind = 'r'
      and (
        (namespace.nspname = 'platform' and class.relname = 'locations')
        or exists (
          select 1 from pg_catalog.pg_attribute as attribute
          where attribute.attrelid = class.oid
            and attribute.attname = 'location_id'
            and not attribute.attisdropped
        )
      )
  ),
  25,
  'the expected twenty-five tenant tables are present'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname in ('platform', 'configuration', 'campaign', 'integration', 'billing', 'audit')
      and class.relkind = 'r'
      and (
        (namespace.nspname = 'platform' and class.relname = 'locations')
        or exists (
          select 1 from pg_catalog.pg_attribute as attribute
          where attribute.attrelid = class.oid
            and attribute.attname = 'location_id'
            and not attribute.attisdropped
        )
      )
      and not class.relrowsecurity
  ),
  0,
  'RLS is enabled on every tenant table'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname in ('platform', 'configuration', 'campaign', 'integration', 'billing', 'audit')
      and class.relkind = 'r'
      and (
        (namespace.nspname = 'platform' and class.relname = 'locations')
        or exists (
          select 1 from pg_catalog.pg_attribute as attribute
          where attribute.attrelid = class.oid
            and attribute.attname = 'location_id'
            and not attribute.attisdropped
        )
      )
      and not class.relforcerowsecurity
  ),
  0,
  'RLS is forced on every tenant table'
);

select is(
  (
    with foreign_keys as (
      select conrelid, conkey
      from pg_catalog.pg_constraint
      where contype = 'f'
    ),
    indexes as (
      select indrelid, indkey::smallint[] as key_columns
      from pg_catalog.pg_index
      where indisvalid
    )
    select pg_catalog.count(*)::integer
    from foreign_keys as foreign_key
    join pg_catalog.pg_class as class on class.oid = foreign_key.conrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname in ('platform', 'configuration', 'campaign', 'integration', 'billing', 'audit')
      and not exists (
        select 1
        from indexes as index_row
        where index_row.indrelid = foreign_key.conrelid
          and index_row.key_columns[0:pg_catalog.cardinality(foreign_key.conkey) - 1]
              @> foreign_key.conkey
          and foreign_key.conkey
              @> index_row.key_columns[0:pg_catalog.cardinality(foreign_key.conkey) - 1]
      )
  ),
  0,
  'every foreign key has a matching leading-column index'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('platform', 'configuration', 'campaign', 'integration', 'billing', 'audit')
      and has_function_privilege('public', procedure.oid, 'EXECUTE')
  ),
  0,
  'foundation functions are not executable by PUBLIC'
);

select ok(
  has_column_privilege('reporting_runtime', 'campaign.campaigns', 'status', 'SELECT'),
  'reporting runtime can read only the approved status input'
);
select ok(
  not has_column_privilege('reporting_runtime', 'campaign.campaigns', 'location_id', 'SELECT'),
  'reporting runtime cannot read tenant identifiers from the base table'
);
select ok(
  has_function_privilege(
    'scheduler_runtime',
    'integration.lease_outbox_batch(text,integer,integer)',
    'EXECUTE'
  ),
  'scheduler runtime can invoke the safe outbox lease function'
);
select ok(
  not has_table_privilege('scheduler_runtime', 'integration.outbox_events', 'SELECT'),
  'scheduler runtime cannot select unrestricted outbox rows'
);

set local role reporting_runtime;
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.reporting_campaign_status_counts),
  0,
  'reporting runtime can execute the de-identified security-invoker view'
);
reset role;

select * from finish();

rollback;
