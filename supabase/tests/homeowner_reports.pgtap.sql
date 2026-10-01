-- PRD-008d 008D-AC-001 to 008D-AC-004. The pgTAP suite for
-- supabase/migrations/20260924010000_homeowner_reports.sql (PRD-007), the one
-- migration that shipped without its own.
--
--   008D-AC-001  all seven homeowner tables have row level security enabled and forced.
--   008D-AC-002  tenant isolation on every table, for reads and writes, under app_runtime
--                with platform.set_app_context; support and collaborator roles read no
--                homeowner financial data (PRD-007 acceptance 1).
--   008D-AC-003  read_shared_report and record_shared_event: a valid share secret reaches
--                its own report and nothing else; an expired, revoked or unknown secret
--                reaches nothing and records nothing.
--   008D-AC-004  claim_due_properties is executable by scheduler_runtime alone, and
--                homeowner.allowed behaves as the migration's grants and role lists state.
--   W-2          (PRD-007 independent quality review) a review request is one event per
--                report but one open request at a time: asked again after the loan officer
--                marked the first reviewed, the property's flag goes up again; asked twice
--                while open, nothing moves. Covered by
--                supabase/migrations/20261001090000_homeowner_review_rerequest.sql.
--
-- Style follows supabase/tests/tenant_isolation.pgtap.sql and
-- supabase/tests/user_preferences.pgtap.sql: fixed UUIDs, `set local role
-- migration_owner` for seeding and for every read that must see all tenants,
-- pg_temp.capture_sqlstate for refusal paths, and pg_temp.assert_* wrappers on every
-- assertion because app_runtime cannot see pgTAP's own functions. Everything is
-- created inside the one transaction and rolled back.
--
-- Two facts shape the file. The session role `postgres` carries BYPASSRLS, so any read
-- that must see every tenant runs as migration_owner, whose migration_access policies
-- are the only ones that match. And the migration carries no COMMENT ON text: it states
-- its intent in grants, role lists and source comments. homeowner.allowed reads for
-- location_admin, creator, approver, publisher and analyst and writes for location_admin
-- and creator only; every function is revoked from public; the share functions "recheck
-- current authority"; usage_events keeps "minimal usage evidence" when a property is
-- removed. Those statements are what 008D-AC-003 and 008D-AC-004 pin.
--
-- Secrets: a share secret is stored as its sha256 hex digest, and the functions take
-- that digest, exactly as the application's homeHash does. pg_temp.hash_of is the same
-- digest, so the fixtures read like the repository test.

begin;

select plan(244);

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

-- One word that says what a write did: how many rows it touched, or why it was refused.
create function pg_temp.write_outcome(statement text)
returns text
language plpgsql
as $function$
declare
  affected integer;
begin
  execute statement;
  get diagnostics affected = row_count;
  return 'rows ' || affected;
exception when others then
  return 'sqlstate ' || sqlstate;
end
$function$;

-- Whether a statement is valid on its own: it runs, then is rolled back by a sentinel error
-- that only this function raises. Run as migration_owner, it separates "refused by the
-- policy" from "wrong to begin with", which an insert's 42501 alone cannot, because row
-- level security is checked before the table's constraints.
create function pg_temp.runs_cleanly(statement text)
returns boolean
language plpgsql
as $function$
begin
  execute statement;
  raise exception using errcode = 'PT001', message = 'rolled back by design';
exception
  when sqlstate 'PT001' then
    return true;
  when others then
    return false;
end
$function$;

-- The sha256 hex digest of a seed string, the shape secret_hash, request_hash and
-- address_hash are all checked against.
create function pg_temp.hash_of(seed text)
returns text
language sql
immutable
as $function$
  select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(seed, 'UTF8')), 'hex')
$function$;

-- Identifiers in the shapes the tables' checks demand: home_ or hreport_ then 32 hex.
create function pg_temp.pid(n integer)
returns text
language sql
immutable
as $function$ select 'home_' || pg_catalog.lpad(pg_catalog.to_hex(n), 32, '0') $function$;

create function pg_temp.rid(n integer)
returns text
language sql
immutable
as $function$ select 'hreport_' || pg_catalog.lpad(pg_catalog.to_hex(n), 32, '0') $function$;

-- A confirmed mortgage input whose as-of date is the given number of days ago.
create function pg_temp.confirmed_mortgage(days_ago integer)
returns jsonb
language sql
stable
as $function$
  select pg_catalog.jsonb_build_object(
    'source', 'confirmed',
    'firstBalanceMinor', 32500000,
    'asOf', pg_catalog.to_char(current_date - days_ago, 'YYYY-MM-DD')
  )
$function$;

-- A report snapshot with the keys the migration reads: id, propertyId, the contact id
-- the share function masks, the mortgage source and as-of date, and one financial figure
-- that a fixture can vary so two reports with one id still tell their tenants apart.
create function pg_temp.snapshot(
  report_id text, property_id text, contact_id text, mortgage jsonb,
  equity_minor bigint default 14000000
)
returns jsonb
language sql
stable
as $function$
  select pg_catalog.jsonb_build_object(
    'id', report_id,
    'propertyId', property_id,
    'input', pg_catalog.jsonb_build_object(
      'contactId', contact_id,
      'contactName', 'Fixture Homeowner',
      'mortgage', mortgage
    ),
    'financials', pg_catalog.jsonb_build_object('equityMinor', equity_minor)
  )
$function$;

-- One property and its one report, numbered n. The primary keys are (location_id, id), so
-- the same n may be seeded for two locations and the two rows are different rows.
create function pg_temp.seed_report(
  n integer,
  loc uuid,
  actor uuid,
  valuation_age interval default interval '1 hour',
  mortgage jsonb default pg_temp.confirmed_mortgage(0),
  property_revoked boolean default false,
  equity_minor bigint default 14000000
)
returns void
language plpgsql
as $function$
begin
  insert into homeowner.properties (
    id, location_id, created_by, contact_id, contact_name, address, address_hash,
    communication_basis, revoked_at
  ) values (
    pg_temp.pid(n), loc, actor, 'contact-' || n, 'Fixture Homeowner ' || n,
    '{"street":"214 Cedar Street","city":"Dallas","state":"TX","postalCode":"75201"}'::jsonb,
    pg_temp.hash_of('address-' || n), 'requested_report',
    case when property_revoked then pg_catalog.now() else null end
  );
  insert into homeowner.reports (id, location_id, property_id, snapshot, valuation_at, created_by)
  values (
    pg_temp.rid(n), loc, pg_temp.pid(n),
    pg_temp.snapshot(pg_temp.rid(n), pg_temp.pid(n), 'contact-' || n, mortgage, equity_minor),
    pg_catalog.now() - valuation_age, actor
  );
end
$function$;

-- One share on report n. The secret is a plain word; the table holds only its digest.
create function pg_temp.seed_share(
  secret text, n integer, loc uuid, actor uuid, expires_in interval,
  is_revoked boolean default false
)
returns void
language sql
as $function$
  insert into homeowner.shares (
    location_id, report_id, secret_hash, created_by, created_at, expires_at, revoked_at
  ) values (
    loc, pg_temp.rid(n), pg_temp.hash_of(secret), actor,
    pg_catalog.now() - interval '10 days', pg_catalog.now() + expires_in,
    case when is_revoked then pg_catalog.now() else null end
  )
$function$;

-- One property for the monthly claim, numbered n, due now plus due_in.
create function pg_temp.seed_due(
  n integer,
  loc uuid,
  actor uuid,
  due_in interval,
  cadence_value text default 'monthly',
  is_paused boolean default false,
  is_revoked boolean default false,
  lease_in interval default null
)
returns void
language sql
as $function$
  insert into homeowner.properties (
    id, location_id, created_by, contact_id, contact_name, address, address_hash,
    communication_basis, cadence, paused, next_refresh_at, lease_until, revoked_at
  ) values (
    pg_temp.pid(n), loc, actor, 'contact-' || n, 'Fixture Homeowner ' || n,
    '{"street":"9 Due Street"}'::jsonb, pg_temp.hash_of('address-' || n),
    'existing_relationship', cadence_value, is_paused, pg_catalog.now() + due_in,
    case when lease_in is null then null else pg_catalog.now() + lease_in end,
    case when is_revoked then pg_catalog.now() else null end
  )
$function$;

-- How many rows a table holds for one location. Run as migration_owner or a tenant.
create function pg_temp.count_at(table_name text, loc uuid)
returns integer
language plpgsql
as $function$
declare
  result integer;
begin
  execute pg_catalog.format(
    'select pg_catalog.count(*)::integer from homeowner.%I where location_id = %L',
    table_name, loc
  ) into result;
  return result;
end
$function$;

-- The distinct locations whose rows the caller can see in a table, as RLS lets it.
create function pg_temp.visible_locations(table_name text)
returns uuid[]
language plpgsql
as $function$
declare
  result uuid[];
begin
  execute pg_catalog.format(
    'select coalesce(pg_catalog.array_agg(distinct location_id order by location_id), ''{}''::uuid[]) from homeowner.%I',
    table_name
  ) into result;
  return result;
end
$function$;

-- A digest of every row a location holds in a table, so "unchanged" is one comparison.
create function pg_temp.fingerprint(table_name text, loc uuid)
returns text
language plpgsql
as $function$
declare
  result text;
begin
  execute pg_catalog.format(
    'select pg_catalog.md5(coalesce(pg_catalog.string_agg(row_data::text, ''|'' order by row_data::text), '''')) from homeowner.%I as row_data where row_data.location_id = %L',
    table_name, loc
  ) into result;
  return result;
end
$function$;

-- A valid INSERT for each table, parented on property prop and report rep, written
-- for location loc by actor. Every constraint is satisfied, so row level security is
-- the only thing that can refuse it. rep must be a report with no delivery yet.
create function pg_temp.insert_for(table_name text, loc uuid, actor uuid, prop text, rep text)
returns text
language sql
stable
as $function$
  select case table_name
    when 'properties' then pg_catalog.format(
      $sql$insert into homeowner.properties (
        id, location_id, created_by, contact_id, contact_name, address, address_hash,
        communication_basis
      ) values (%L, %L, %L, 'contact-inserted', 'Inserted Homeowner',
        '{"street":"1 Inserted Way"}'::jsonb, %L, 'requested_report')$sql$,
      pg_temp.pid(900), loc, actor, pg_temp.hash_of('address-inserted-' || loc))
    when 'reports' then pg_catalog.format(
      $sql$insert into homeowner.reports (
        id, location_id, property_id, snapshot, valuation_at, created_by
      ) values (%L, %L, %L, %L::jsonb, pg_catalog.now(), %L)$sql$,
      pg_temp.rid(900), loc, prop,
      pg_temp.snapshot(pg_temp.rid(900), prop, 'contact-inserted', pg_temp.confirmed_mortgage(0))::text,
      actor)
    when 'lookup_requests' then pg_catalog.format(
      $sql$insert into homeowner.lookup_requests (
        location_id, request_id, property_id, request_hash, status
      ) values (%L, '00000000-0000-4000-8000-000000000f6f', %L, %L, 'pending')$sql$,
      loc, prop, pg_temp.hash_of('request-inserted'))
    when 'usage_events' then pg_catalog.format(
      $sql$insert into homeowner.usage_events (location_id, request_id)
      values (%L, '00000000-0000-4000-8000-000000000f6f')$sql$,
      loc)
    when 'shares' then pg_catalog.format(
      $sql$insert into homeowner.shares (
        location_id, report_id, secret_hash, created_by, expires_at
      ) values (%L, %L, %L, %L, pg_catalog.now() + interval '1 day')$sql$,
      loc, rep, pg_temp.hash_of('share-inserted-' || loc), actor)
    when 'events' then pg_catalog.format(
      $sql$insert into homeowner.events (location_id, report_id, event_kind, event_key)
      values (%L, %L, 'review_resolved', '00000000-0000-4000-8000-000000000f7f')$sql$,
      loc, rep)
    when 'deliveries' then pg_catalog.format(
      $sql$insert into homeowner.deliveries (location_id, report_id, contact_id, status)
      values (%L, %L, 'contact-inserted', 'sent')$sql$,
      loc, rep)
  end
$function$;

-- One UPDATE and one DELETE per table, aimed at every row a location holds.
create function pg_temp.update_for(table_name text, loc uuid)
returns text
language sql
stable
as $function$
  select pg_catalog.format(
    'update homeowner.%I set %s where location_id = %L',
    table_name,
    case table_name
      when 'properties' then $set$contact_name = 'Hijacked Homeowner'$set$
      when 'lookup_requests' then $set$status = 'failed'$set$
      when 'shares' then 'revoked_at = pg_catalog.now()'
      when 'deliveries' then $set$status = 'blocked'$set$
      else 'created_at = pg_catalog.now()'
    end,
    loc
  )
$function$;

create function pg_temp.delete_for(table_name text, loc uuid)
returns text
language sql
stable
as $function$
  select pg_catalog.format('delete from homeowner.%I where location_id = %L', table_name, loc)
$function$;

-- homeowner.allowed under a context written directly into the transaction settings,
-- the way platform.set_app_context writes them, so each case can also stage the states
-- the front door would refuse (a revoked binding, a suspended person, no context at all).
create function pg_temp.allowed_in_context(
  context_location uuid, actor uuid, requested_location uuid, write_required boolean
)
returns boolean
language plpgsql
as $function$
begin
  perform pg_catalog.set_config('app.location_id', coalesce(context_location::text, ''), true);
  perform pg_catalog.set_config('app.actor_id', coalesce(actor::text, ''), true);
  return homeowner.allowed(requested_location, write_required);
end
$function$;

-- Fixtures. Locations: A and B are active, S is suspended.
insert into platform.locations (id, display_name, status)
values
  ('00000000-0000-4000-8000-000000000f01', 'Homeowner Tenant A', 'active'),
  ('00000000-0000-4000-8000-000000000f02', 'Homeowner Tenant B', 'active'),
  ('00000000-0000-4000-8000-000000000f03', 'Homeowner Tenant Suspended', 'suspended');

insert into platform.app_users (id, safe_display_name, status)
values
  ('00000000-0000-4000-8000-000000000f11', 'Homeowner Admin A', 'active'),
  ('00000000-0000-4000-8000-000000000f12', 'Homeowner Creator A', 'active'),
  ('00000000-0000-4000-8000-000000000f13', 'Homeowner Approver A', 'active'),
  ('00000000-0000-4000-8000-000000000f14', 'Homeowner Publisher A', 'active'),
  ('00000000-0000-4000-8000-000000000f15', 'Homeowner Analyst A', 'active'),
  ('00000000-0000-4000-8000-000000000f16', 'Homeowner Collaborator A', 'active'),
  ('00000000-0000-4000-8000-000000000f17', 'Homeowner Admin B', 'active'),
  ('00000000-0000-4000-8000-000000000f18', 'Homeowner Collaborator B', 'active'),
  ('00000000-0000-4000-8000-000000000f19', 'Homeowner Unbound', 'active'),
  ('00000000-0000-4000-8000-000000000f1a', 'Homeowner Revoked', 'active'),
  ('00000000-0000-4000-8000-000000000f1b', 'Homeowner Suspended', 'suspended');

insert into platform.role_bindings (location_id, user_id, role)
values
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', 'location_admin'),
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f12', 'creator'),
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f13', 'approver'),
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f14', 'publisher'),
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f15', 'analyst'),
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f16', 'realtor_collaborator'),
  ('00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', 'location_admin'),
  ('00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f18', 'realtor_collaborator'),
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f1b', 'creator'),
  ('00000000-0000-4000-8000-000000000f03', '00000000-0000-4000-8000-000000000f11', 'location_admin');

-- One creator whose binding was revoked yesterday.
insert into platform.role_bindings (location_id, user_id, role, granted_at, revoked_at)
values (
  '00000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000f1a',
  'creator',
  pg_catalog.now() - interval '2 days',
  pg_catalog.now() - interval '1 day'
);

do $seed$
begin
  -- Tenant A. Property and report 1 are the main subject and carry every dependent row.
  -- 2 is authored by a creator and has no delivery. 3 holds only an expired and a
  -- revoked share. 4 to 11 each break one condition read_shared_report rechecks.
  -- 12 is a spare report with no delivery. 60 is removed at the end of the file.
  perform pg_temp.seed_report(1, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11');
  perform pg_temp.seed_report(2, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f12');
  perform pg_temp.seed_report(3, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11');
  perform pg_temp.seed_report(4, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', property_revoked => true);
  perform pg_temp.seed_report(5, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', valuation_age => interval '40 days');
  perform pg_temp.seed_report(6, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', mortgage => pg_temp.confirmed_mortgage(40));
  perform pg_temp.seed_report(7, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', mortgage => '{"source":"unknown"}'::jsonb);
  perform pg_temp.seed_report(8, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f16');
  perform pg_temp.seed_report(9, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f1a');
  perform pg_temp.seed_report(10, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f1b');
  perform pg_temp.seed_report(11, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f15');
  perform pg_temp.seed_report(12, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11');
  perform pg_temp.seed_report(60, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11');
  -- Tenant B. 20 carries every dependent row; 21 has no delivery.
  perform pg_temp.seed_report(20, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17');
  perform pg_temp.seed_report(21, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17');
  -- The suspended location.
  perform pg_temp.seed_report(30, '00000000-0000-4000-8000-000000000f03', '00000000-0000-4000-8000-000000000f11');
  -- Reports and properties that tenant A and tenant B both hold under the same ids, the
  -- primary keys being (location_id, id). Tenant A's carry equity 21000000 and tenant B's
  -- 37000000, so a snapshot says which tenant it came from. In 70 both are live. In 71 and
  -- 72 one tenant's valuation is stale and the other's fresh; in 73 and 74 one tenant's
  -- property is revoked and the other's is not. A share must answer for its own tenant's
  -- row and never borrow the other tenant's row that happens to share the id.
  perform pg_temp.seed_report(70, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', equity_minor => 21000000);
  perform pg_temp.seed_report(70, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', equity_minor => 37000000);
  perform pg_temp.seed_report(71, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', valuation_age => interval '40 days', equity_minor => 21000000);
  perform pg_temp.seed_report(71, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', equity_minor => 37000000);
  perform pg_temp.seed_report(72, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', equity_minor => 21000000);
  perform pg_temp.seed_report(72, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', valuation_age => interval '40 days', equity_minor => 37000000);
  perform pg_temp.seed_report(73, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', property_revoked => true, equity_minor => 21000000);
  perform pg_temp.seed_report(73, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', equity_minor => 37000000);
  perform pg_temp.seed_report(74, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', equity_minor => 21000000);
  perform pg_temp.seed_report(74, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', property_revoked => true, equity_minor => 37000000);

  perform pg_temp.seed_share('r1-valid', 1, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('r1-expired', 1, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '-1 day');
  perform pg_temp.seed_share('r1-revoked', 1, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days', true);
  perform pg_temp.seed_share('r2-valid', 2, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f12', interval '7 days');
  perform pg_temp.seed_share('r3-expired', 3, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '-1 day');
  perform pg_temp.seed_share('r3-revoked', 3, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days', true);
  perform pg_temp.seed_share('r4-valid', 4, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('r5-valid', 5, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('r6-valid', 6, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('r7-valid', 7, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('r8-valid', 8, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f16', interval '7 days');
  perform pg_temp.seed_share('r9-valid', 9, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f1a', interval '7 days');
  perform pg_temp.seed_share('r10-valid', 10, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f1b', interval '7 days');
  perform pg_temp.seed_share('r11-valid', 11, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f15', interval '7 days');
  perform pg_temp.seed_share('r20-valid', 20, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', interval '7 days');
  perform pg_temp.seed_share('r30-valid', 30, '00000000-0000-4000-8000-000000000f03', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('r60-valid', 60, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  -- One live share per tenant on each shared id: dup70-a is tenant A's, dup70-b tenant B's.
  perform pg_temp.seed_share('dup70-a', 70, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('dup70-b', 70, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', interval '7 days');
  perform pg_temp.seed_share('dup71-a', 71, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('dup71-b', 71, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', interval '7 days');
  perform pg_temp.seed_share('dup72-a', 72, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('dup72-b', 72, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', interval '7 days');
  perform pg_temp.seed_share('dup73-a', 73, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('dup73-b', 73, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', interval '7 days');
  perform pg_temp.seed_share('dup74-a', 74, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '7 days');
  perform pg_temp.seed_share('dup74-b', 74, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', interval '7 days');

  -- Properties for the monthly claim. 40, 41 and 42 are the only claimable ones: 41 holds
  -- a lease that lapsed an hour ago. 43 to 51 each fail one condition.
  perform pg_temp.seed_due(40, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '-3 hours');
  perform pg_temp.seed_due(41, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '-2 hours', lease_in => interval '-1 hour');
  perform pg_temp.seed_due(42, '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f17', interval '-1 hour');
  perform pg_temp.seed_due(43, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '1 day');
  perform pg_temp.seed_due(44, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '-1 hour', is_paused => true);
  perform pg_temp.seed_due(45, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '-1 hour', is_revoked => true);
  perform pg_temp.seed_due(46, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '-1 hour', lease_in => interval '1 hour');
  perform pg_temp.seed_due(47, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f1a', interval '-1 hour');
  perform pg_temp.seed_due(48, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f1b', interval '-1 hour');
  perform pg_temp.seed_due(49, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f16', interval '-1 hour');
  perform pg_temp.seed_due(50, '00000000-0000-4000-8000-000000000f03', '00000000-0000-4000-8000-000000000f11', interval '-1 hour');
  perform pg_temp.seed_due(51, '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', interval '-1 hour', cadence_value => 'off');
end
$seed$;

-- One lookup, one usage event, one event and one delivery for report 1 and report 20,
-- so no table is empty for either tenant, plus the same set for report 60.
insert into homeowner.lookup_requests (
  location_id, request_id, property_id, request_hash, status, report_id, attempted
)
values
  (
    '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f61',
    pg_temp.pid(1), pg_temp.hash_of('request-1'), 'ready', pg_temp.rid(1), true
  ),
  (
    '00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f62',
    pg_temp.pid(20), pg_temp.hash_of('request-20'), 'ready', pg_temp.rid(20), true
  ),
  (
    '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f63',
    pg_temp.pid(60), pg_temp.hash_of('request-60'), 'ready', pg_temp.rid(60), true
  );

insert into homeowner.usage_events (location_id, request_id)
values
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f61'),
  ('00000000-0000-4000-8000-000000000f02', '00000000-0000-4000-8000-000000000f62'),
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f63');

insert into homeowner.events (location_id, report_id, event_kind, event_key)
values
  ('00000000-0000-4000-8000-000000000f01', pg_temp.rid(1), 'review_resolved', '00000000-0000-4000-8000-000000000f71'),
  ('00000000-0000-4000-8000-000000000f02', pg_temp.rid(20), 'review_resolved', '00000000-0000-4000-8000-000000000f72'),
  ('00000000-0000-4000-8000-000000000f01', pg_temp.rid(60), 'review_resolved', '00000000-0000-4000-8000-000000000f73');

insert into homeowner.deliveries (location_id, report_id, contact_id, status)
values
  ('00000000-0000-4000-8000-000000000f01', pg_temp.rid(1), 'contact-1', 'pending'),
  ('00000000-0000-4000-8000-000000000f02', pg_temp.rid(20), 'contact-20', 'pending'),
  ('00000000-0000-4000-8000-000000000f01', pg_temp.rid(60), 'contact-60', 'sent');

-- A support grant on tenant A and one campaign there, as supabase/tests/support_access
-- builds them, so the support proof can show a live, audited grant that still opens
-- no homeowner table.
insert into campaign.campaigns (id, location_id, created_by_actor_id)
values (
  '00000000-0000-4000-8000-000000000f51',
  '00000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000f11'
);

insert into platform.support_grants (
  id, location_id, support_actor_id, requested_by_actor_id, approved_by_actor_id,
  scope, reason_code, ticket_reference, starts_at, expires_at
) values (
  '00000000-0000-4000-8000-000000000f41',
  '00000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000f31',
  '00000000-0000-4000-8000-000000000f11',
  '00000000-0000-4000-8000-000000000f11',
  'diagnose', 'customer-request', 'ticket-safe-001',
  pg_catalog.statement_timestamp() - interval '1 minute',
  pg_catalog.statement_timestamp() + interval '30 minutes'
);

-- Tenant B's rows as they stand before tenant A is given every chance to touch them.
create temporary table homeowner_tenant_b_baseline as
select
  homeowner_table.table_name,
  pg_temp.fingerprint(homeowner_table.table_name, '00000000-0000-4000-8000-000000000f02') as fingerprint
from pg_catalog.unnest(
  array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
) as homeowner_table(table_name);

reset role;

-- 008D-AC-001. Row level security is enabled and forced on every homeowner table.
select pg_temp.assert_ok(
  coalesce(
    (
      select class_row.relrowsecurity and class_row.relforcerowsecurity
      from pg_catalog.pg_class as class_row
      where class_row.oid = pg_catalog.to_regclass(
        pg_catalog.format('homeowner.%I', homeowner_table.table_name)
      )
    ),
    false
  ),
  pg_catalog.format(
    'homeowner.%s has row level security enabled and forced', homeowner_table.table_name
  )
)
from pg_catalog.unnest(
  array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
) as homeowner_table(table_name);

select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(class_row.relname::text order by class_row.relname)
    from pg_catalog.pg_class as class_row
    join pg_catalog.pg_namespace as schema_row on schema_row.oid = class_row.relnamespace
    where schema_row.nspname = 'homeowner'
      and class_row.relkind in ('r', 'p')
  ),
  array['deliveries', 'events', 'lookup_requests', 'properties', 'reports', 'shares', 'usage_events'],
  'the homeowner schema holds exactly these seven tables, so none escapes the seven checks above'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from (
      select policy_row.polrelid
      from pg_catalog.pg_policy as policy_row
      join pg_catalog.pg_class as class_row on class_row.oid = policy_row.polrelid
      join pg_catalog.pg_namespace as schema_row on schema_row.oid = class_row.relnamespace
      where schema_row.nspname = 'homeowner'
      group by policy_row.polrelid
      having pg_catalog.array_agg(policy_row.polname order by policy_row.polname)
        = array['migration_access', 'read_tenant', 'write_tenant']::name[]
    ) as standard_tables
  ),
  7,
  'all seven tables carry exactly the migration_access, read_tenant and write_tenant policies'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from pg_catalog.pg_policy as policy_row
    join pg_catalog.pg_class as class_row on class_row.oid = policy_row.polrelid
    join pg_catalog.pg_namespace as schema_row on schema_row.oid = class_row.relnamespace
    where schema_row.nspname = 'homeowner'
      and exists (
        select 1
        from pg_catalog.unnest(policy_row.polroles) as policy_role
        where policy_role <> all (
          array['app_runtime'::regrole::oid, 'migration_owner'::regrole::oid]
        )
      )
  ),
  0,
  'no homeowner policy applies to public or to any role beyond app_runtime and migration_owner'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(role_row.rolname::text order by role_row.rolname), array[]::text[])
    from pg_catalog.pg_roles as role_row
    where role_row.rolname in (
      'app_runtime', 'scheduler_runtime', 'support_runtime', 'reporting_runtime', 'anon', 'authenticated'
    )
      and role_row.rolbypassrls
  ),
  array[]::text[],
  'no runtime or API role bypasses row level security, so the forced policies bind all of them'
);

-- 008D-AC-002. The fixtures hold rows for both tenants in every table, so no isolation
-- check below can pass for want of anything to isolate.
set local role migration_owner;
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.count_at(homeowner_table.table_name, '00000000-0000-4000-8000-000000000f01') = 0
       or pg_temp.count_at(homeowner_table.table_name, '00000000-0000-4000-8000-000000000f02') = 0
  ),
  array[]::text[],
  'the fixtures hold rows for tenant A and tenant B in every homeowner table'
);
-- The insert statements aimed at each tenant below are valid on their own: run as the
-- owner and rolled back, every one goes through. A refusal under another tenant's context
-- is therefore the policy and not a statement that was wrong to begin with.
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where not pg_temp.runs_cleanly(
      pg_temp.insert_for(
        homeowner_table.table_name,
        '00000000-0000-4000-8000-000000000f02',
        '00000000-0000-4000-8000-000000000f11',
        pg_temp.pid(20),
        pg_temp.rid(21)
      )
    )
  ),
  array[]::text[],
  'every insert statement aimed at tenant B below is valid on its own'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where not pg_temp.runs_cleanly(
      pg_temp.insert_for(
        homeowner_table.table_name,
        '00000000-0000-4000-8000-000000000f01',
        '00000000-0000-4000-8000-000000000f11',
        pg_temp.pid(12),
        pg_temp.rid(12)
      )
    )
  ),
  array[]::text[],
  'every insert statement aimed at tenant A below is valid on its own'
);
reset role;

-- The grants are the other half of the write boundary: they decide which attempts reach
-- row level security and which stop at the privilege. Pinning them means a widened grant
-- shows up here rather than silently.
select pg_temp.assert_is(
  (
    select pg_catalog.string_agg(privilege, ',' order by privilege)
    from pg_catalog.unnest(array['select', 'insert', 'update', 'delete']) as privilege
    where has_table_privilege(
      'app_runtime', pg_catalog.format('homeowner.%I', surface.table_name), privilege
    )
  ),
  surface.expected_privileges,
  pg_catalog.format(
    'app_runtime holds exactly %s on homeowner.%s', surface.expected_privileges, surface.table_name
  )
)
from (values
  ('properties', 'delete,insert,select,update'),
  ('reports', 'insert,select'),
  ('lookup_requests', 'insert,select,update'),
  ('usage_events', 'insert,select'),
  ('shares', 'insert,select,update'),
  ('events', 'insert,select'),
  ('deliveries', 'insert,select,update')
) as surface(table_name, expected_privileges);

select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    cross join pg_catalog.unnest(array['select', 'insert', 'update', 'delete']) as privilege
    where has_table_privilege(
      reachable_role.role_name::name,
      pg_catalog.format('homeowner.%I', homeowner_table.table_name),
      privilege
    )
  ),
  array[]::text[],
  pg_catalog.format('%s holds no privilege on any homeowner table', reachable_role.role_name)
)
from (values
  ('support_runtime'), ('reporting_runtime'), ('scheduler_runtime'),
  ('anon'), ('authenticated'), ('public')
) as reachable_role(role_name);

-- Tenant A's own context. platform.set_app_context verifies the actor holds an active
-- binding at an active location before it writes the transaction settings.
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000f11',
  'corr.homeowner-isolation-a'
);

select pg_temp.assert_is(
  pg_temp.visible_locations(homeowner_table.table_name),
  array['00000000-0000-4000-8000-000000000f01']::uuid[],
  pg_catalog.format('tenant A reads only its own rows in homeowner.%s', homeowner_table.table_name)
)
from pg_catalog.unnest(
  array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
) as homeowner_table(table_name);

select pg_temp.assert_is(
  pg_temp.count_at(homeowner_table.table_name, '00000000-0000-4000-8000-000000000f02'),
  0,
  pg_catalog.format(
    'tenant A cannot infer a tenant B row in homeowner.%s by a direct predicate',
    homeowner_table.table_name
  )
)
from pg_catalog.unnest(
  array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
) as homeowner_table(table_name);

select pg_temp.assert_is(
  pg_temp.write_outcome(
    pg_temp.insert_for(
      homeowner_table.table_name,
      '00000000-0000-4000-8000-000000000f02',
      '00000000-0000-4000-8000-000000000f11',
      pg_temp.pid(20),
      pg_temp.rid(21)
    )
  ),
  'sqlstate 42501',
  pg_catalog.format('tenant A cannot insert a tenant B row into homeowner.%s', homeowner_table.table_name)
)
from pg_catalog.unnest(
  array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
) as homeowner_table(table_name);

-- An UPDATE or DELETE either reaches row level security and matches no row, or stops
-- at a missing privilege. The privileges pinned above decide which; either way the
-- fingerprints below prove nothing of tenant B's changed.
select pg_temp.assert_is(
  pg_temp.write_outcome(
    pg_temp.update_for(attempt.table_name, '00000000-0000-4000-8000-000000000f02')
  ),
  attempt.expected_update,
  pg_catalog.format('tenant A cannot update a tenant B row in homeowner.%s', attempt.table_name)
)
from (values
  ('properties', 'rows 0', 'rows 0'),
  ('reports', 'sqlstate 42501', 'sqlstate 42501'),
  ('lookup_requests', 'rows 0', 'sqlstate 42501'),
  ('usage_events', 'sqlstate 42501', 'sqlstate 42501'),
  ('shares', 'rows 0', 'sqlstate 42501'),
  ('events', 'sqlstate 42501', 'sqlstate 42501'),
  ('deliveries', 'rows 0', 'sqlstate 42501')
) as attempt(table_name, expected_update, expected_delete);

select pg_temp.assert_is(
  pg_temp.write_outcome(
    pg_temp.delete_for(attempt.table_name, '00000000-0000-4000-8000-000000000f02')
  ),
  attempt.expected_delete,
  pg_catalog.format('tenant A cannot delete a tenant B row from homeowner.%s', attempt.table_name)
)
from (values
  ('properties', 'rows 0', 'rows 0'),
  ('reports', 'sqlstate 42501', 'sqlstate 42501'),
  ('lookup_requests', 'rows 0', 'sqlstate 42501'),
  ('usage_events', 'sqlstate 42501', 'sqlstate 42501'),
  ('shares', 'rows 0', 'sqlstate 42501'),
  ('events', 'sqlstate 42501', 'sqlstate 42501'),
  ('deliveries', 'rows 0', 'sqlstate 42501')
) as attempt(table_name, expected_update, expected_delete);

select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(
      pg_temp.write_outcome(
        pg_catalog.format(
          'update homeowner.%I set location_id = %L where location_id = %L',
          homeowner_table.table_name,
          '00000000-0000-4000-8000-000000000f02',
          '00000000-0000-4000-8000-000000000f01'
        )
      )
      order by homeowner_table.table_name
    )
    from pg_catalog.unnest(array['properties', 'lookup_requests', 'shares', 'deliveries']) as homeowner_table(table_name)
  ),
  array['sqlstate 42501', 'sqlstate 42501', 'sqlstate 42501', 'sqlstate 42501'],
  'tenant A cannot move its own rows into tenant B on any table it may update'
);

-- The same statements aimed at tenant A's own location succeed, so every refusal above
-- is the tenant boundary and not a statement that was wrong to begin with.
select pg_temp.assert_is(
  pg_temp.write_outcome(
    pg_temp.insert_for(
      homeowner_table.table_name,
      '00000000-0000-4000-8000-000000000f01',
      '00000000-0000-4000-8000-000000000f11',
      pg_temp.pid(1),
      pg_temp.rid(2)
    )
  ),
  'rows 1',
  pg_catalog.format('tenant A can insert its own row into homeowner.%s', homeowner_table.table_name)
)
from pg_catalog.unnest(
  array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
) as homeowner_table(table_name);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  pg_temp.fingerprint(homeowner_table.table_name, '00000000-0000-4000-8000-000000000f02'),
  (
    select baseline.fingerprint
    from homeowner_tenant_b_baseline as baseline
    where baseline.table_name = homeowner_table.table_name
  ),
  pg_catalog.format(
    'every tenant B row in homeowner.%s is byte for byte unchanged after tenant A tried to write it',
    homeowner_table.table_name
  )
)
from pg_catalog.unnest(
  array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
) as homeowner_table(table_name);
reset role;

-- Tenant B's context, the other direction.
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000f02',
  '00000000-0000-4000-8000-000000000f17',
  'corr.homeowner-isolation-b'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.visible_locations(homeowner_table.table_name)
      <> array['00000000-0000-4000-8000-000000000f02']::uuid[]
  ),
  array[]::text[],
  'tenant B reads only its own rows in every homeowner table'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.write_outcome(
      pg_temp.insert_for(
        homeowner_table.table_name,
        '00000000-0000-4000-8000-000000000f01',
        '00000000-0000-4000-8000-000000000f17',
        pg_temp.pid(12),
        pg_temp.rid(12)
      )
    ) <> 'sqlstate 42501'
  ),
  array[]::text[],
  'tenant B cannot insert a tenant A row into any homeowner table'
);

-- No context at all: reads see nothing and writes fail closed.
select platform.reset_transaction_context();
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.visible_locations(homeowner_table.table_name) <> array[]::uuid[]
  ),
  array[]::text[],
  'a missing tenant context reads no row from any homeowner table'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.write_outcome(
      pg_temp.insert_for(
        homeowner_table.table_name,
        '00000000-0000-4000-8000-000000000f01',
        '00000000-0000-4000-8000-000000000f11',
        pg_temp.pid(12),
        pg_temp.rid(12)
      )
    ) <> 'sqlstate 42501'
  ),
  array[]::text[],
  'a missing tenant context fails every homeowner write closed'
);
reset role;

-- Support (PRD-007 acceptance 1). A support actor with a live, audited grant on tenant A
-- reads tenant A's campaign and not one homeowner table, because support_runtime holds
-- no privilege in the homeowner schema at all.
set local role support_runtime;
select platform.begin_support_access(
  '00000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000f31',
  'corr.homeowner-support',
  'campaign',
  '00000000-0000-4000-8000-000000000f51'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from campaign.campaigns),
  1,
  'the support grant is live: support reads the granted tenant''s campaign'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate(
    pg_catalog.format('select pg_catalog.count(*) from homeowner.%I', homeowner_table.table_name)
  ),
  '42501',
  pg_catalog.format(
    'support with a live grant is refused homeowner.%s', homeowner_table.table_name
  )
)
from pg_catalog.unnest(
  array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
) as homeowner_table(table_name);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate(
    $sql$select homeowner.read_shared_report(pg_temp.hash_of('r1-valid'))$sql$
  ),
  '42501',
  'support with a live grant cannot read a shared report through the share function'
);
select platform.reset_transaction_context();
reset role;

-- Collaborators. A realtor_collaborator is a genuine, verified member of tenant A, and
-- still reads no homeowner row, because homeowner.allowed does not list the role.
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000f16',
  'corr.homeowner-collaborator'
);
select pg_temp.assert_is(
  platform.current_actor_id(),
  '00000000-0000-4000-8000-000000000f16'::uuid,
  'the collaborator holds a verified tenant A context, so what follows is the role and not a missing context'
);
select pg_temp.assert_is(
  pg_temp.visible_locations(homeowner_table.table_name),
  array[]::uuid[],
  pg_catalog.format('a collaborator in tenant A reads no row in homeowner.%s', homeowner_table.table_name)
)
from pg_catalog.unnest(
  array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
) as homeowner_table(table_name);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.write_outcome(
      pg_temp.insert_for(
        homeowner_table.table_name,
        '00000000-0000-4000-8000-000000000f01',
        '00000000-0000-4000-8000-000000000f16',
        pg_temp.pid(12),
        pg_temp.rid(12)
      )
    ) <> 'sqlstate 42501'
  ),
  array[]::text[],
  'a collaborator in tenant A writes no homeowner row'
);

-- A collaborator of another tenant cannot establish tenant A at all, and inside its own
-- tenant it reads and writes nothing in the homeowner schema either.
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select platform.set_app_context(
      '00000000-0000-4000-8000-000000000f01',
      '00000000-0000-4000-8000-000000000f18',
      'corr.homeowner-unrelated'
    )
  $sql$),
  '42501',
  'an unrelated collaborator cannot establish tenant A context'
);
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000f02',
  '00000000-0000-4000-8000-000000000f18',
  'corr.homeowner-collaborator-b'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.visible_locations(homeowner_table.table_name) <> array[]::uuid[]
  ),
  array[]::text[],
  'a collaborator of tenant B reads no homeowner row, not even in tenant B where rows exist'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.write_outcome(
      pg_temp.insert_for(
        homeowner_table.table_name,
        '00000000-0000-4000-8000-000000000f02',
        '00000000-0000-4000-8000-000000000f18',
        pg_temp.pid(20),
        pg_temp.rid(21)
      )
    ) <> 'sqlstate 42501'
  ),
  array[]::text[],
  'a collaborator of tenant B writes no homeowner row in its own tenant'
);

-- An analyst reads homeowner data and writes none: the read and write lists differ.
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000f15',
  'corr.homeowner-analyst'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.visible_locations(homeowner_table.table_name)
      <> array['00000000-0000-4000-8000-000000000f01']::uuid[]
  ),
  array[]::text[],
  'an analyst reads exactly its own tenant''s rows in every homeowner table'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.write_outcome(
      pg_temp.insert_for(
        homeowner_table.table_name,
        '00000000-0000-4000-8000-000000000f01',
        '00000000-0000-4000-8000-000000000f15',
        pg_temp.pid(12),
        pg_temp.rid(12)
      )
    ) <> 'sqlstate 42501'
  ),
  array[]::text[],
  'an analyst writes no homeowner row'
);

-- Transaction settings written without the front door: a location with an actor who
-- holds no binding there. Row level security re-derives authority from the bindings,
-- so a forged pair reads and writes nothing.
select pg_catalog.set_config('app.location_id', '00000000-0000-4000-8000-000000000f01', true);
select pg_catalog.set_config('app.actor_id', '00000000-0000-4000-8000-000000000f19', true);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.visible_locations(homeowner_table.table_name) <> array[]::uuid[]
  ),
  array[]::text[],
  'a tenant setting paired with an actor who holds no binding reads no homeowner row'
);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(homeowner_table.table_name order by homeowner_table.table_name), array[]::text[])
    from pg_catalog.unnest(
      array['properties', 'reports', 'lookup_requests', 'usage_events', 'shares', 'events', 'deliveries']
    ) as homeowner_table(table_name)
    where pg_temp.write_outcome(
      pg_temp.insert_for(
        homeowner_table.table_name,
        '00000000-0000-4000-8000-000000000f01',
        '00000000-0000-4000-8000-000000000f19',
        pg_temp.pid(12),
        pg_temp.rid(12)
      )
    ) <> 'sqlstate 42501'
  ),
  array[]::text[],
  'a tenant setting paired with an actor who holds no binding writes no homeowner row'
);
select platform.reset_transaction_context();
reset role;

-- 008D-AC-003. The public share entry points run with no tenant context at all, as the
-- link does, so every case below starts from a reset.
set local role app_runtime;
select platform.reset_transaction_context();

-- A valid secret reaches its own report, whichever tenant or author issued it.
select pg_temp.assert_is(
  homeowner.read_shared_report(pg_temp.hash_of(valid_share.secret)) ->> 'id',
  valid_share.expected_report,
  pg_catalog.format('%s returns its own report', valid_share.what)
)
from (values
  ('a valid secret issued by a location_admin in tenant A', 'r1-valid', pg_temp.rid(1)),
  ('a valid secret issued by a creator in tenant A', 'r2-valid', pg_temp.rid(2)),
  ('a valid secret issued by tenant B''s admin', 'r20-valid', pg_temp.rid(20))
) as valid_share(what, secret, expected_report);

-- The snapshot is the stored one with only the homeowner's contact id masked.
select pg_temp.assert_is(
  homeowner.read_shared_report(pg_temp.hash_of('r1-valid')),
  pg_temp.snapshot(pg_temp.rid(1), pg_temp.pid(1), 'shared', pg_temp.confirmed_mortgage(0)),
  'the shared snapshot is the stored report with only the contact id replaced by shared'
);

-- Nothing for an expired, revoked or unknown secret, and never a sibling's report: report 1
-- has a valid share too, so a fall-through would show up as report 1 here.
select pg_temp.assert_is(
  homeowner.read_shared_report(pg_temp.hash_of(dead_share.secret)),
  null::jsonb,
  pg_catalog.format('%s returns nothing', dead_share.what)
)
from (values
  ('an expired share secret', 'r1-expired'),
  ('a revoked share secret', 'r1-revoked'),
  ('an unknown share secret', 'never-issued')
) as dead_share(what, secret);

select pg_temp.assert_is(
  homeowner.read_shared_report(malformed.hash),
  null::jsonb,
  pg_catalog.format('%s returns nothing', malformed.what)
)
from (values
  ('an empty hash', ''),
  ('a hash of the wrong shape', 'not-a-hash'),
  ('the right hash in upper case', pg_catalog.upper(pg_temp.hash_of('r1-valid'))),
  ('a null hash', null)
) as malformed(what, hash);

-- The migration's own comment: the entry point rechecks current authority, so a link
-- stops working when what it relied on stops being true.
select pg_temp.assert_is(
  homeowner.read_shared_report(pg_temp.hash_of(stale_share.secret)),
  null::jsonb,
  pg_catalog.format('a valid share %s returns nothing', stale_share.what)
)
from (values
  ('on a property that was since revoked', 'r4-valid'),
  ('on a valuation older than 35 days', 'r5-valid'),
  ('on a mortgage input older than 35 days', 'r6-valid'),
  ('whose author holds only the collaborator role', 'r8-valid'),
  ('whose author''s binding was revoked', 'r9-valid'),
  ('whose author is suspended', 'r10-valid'),
  ('whose author holds only the analyst role', 'r11-valid'),
  ('in a suspended location', 'r30-valid')
) as stale_share(what, secret);
select pg_temp.assert_is(
  homeowner.read_shared_report(pg_temp.hash_of('r7-valid')) ->> 'id',
  pg_temp.rid(7),
  'a mortgage marked unknown needs no as-of date, so the same report is still shared'
);

-- One id, two tenants. Each tenant's secret answers for that tenant's own row: when both
-- reports are live it returns its own snapshot, and when its own row fails a check it
-- returns nothing even though the other tenant's row under the same id would pass.
select pg_temp.assert_is(
  homeowner.read_shared_report(pg_temp.hash_of(same_id.secret)),
  same_id.expected,
  same_id.what
)
from (values
  (
    'tenant A''s secret returns tenant A''s report when tenant B holds a live report under the same id',
    'dup70-a',
    pg_temp.snapshot(pg_temp.rid(70), pg_temp.pid(70), 'shared', pg_temp.confirmed_mortgage(0), 21000000)
  ),
  (
    'tenant B''s secret returns tenant B''s report when tenant A holds a live report under the same id',
    'dup70-b',
    pg_temp.snapshot(pg_temp.rid(70), pg_temp.pid(70), 'shared', pg_temp.confirmed_mortgage(0), 37000000)
  ),
  (
    'tenant A''s secret returns nothing for its stale valuation, not tenant B''s fresh report under the same id',
    'dup71-a',
    null::jsonb
  ),
  (
    'tenant B''s secret returns tenant B''s fresh report, not tenant A''s stale one under the same id',
    'dup71-b',
    pg_temp.snapshot(pg_temp.rid(71), pg_temp.pid(71), 'shared', pg_temp.confirmed_mortgage(0), 37000000)
  ),
  (
    'tenant A''s secret returns tenant A''s fresh report, not tenant B''s stale one under the same id',
    'dup72-a',
    pg_temp.snapshot(pg_temp.rid(72), pg_temp.pid(72), 'shared', pg_temp.confirmed_mortgage(0), 21000000)
  ),
  (
    'tenant B''s secret returns nothing for its stale valuation, not tenant A''s fresh report under the same id',
    'dup72-b',
    null::jsonb
  ),
  (
    'tenant A''s secret returns nothing for its revoked property, not through tenant B''s live property of the same id',
    'dup73-a',
    null::jsonb
  ),
  (
    'tenant B''s secret returns tenant B''s report, not blocked by tenant A''s revoked property of the same id',
    'dup73-b',
    pg_temp.snapshot(pg_temp.rid(73), pg_temp.pid(73), 'shared', pg_temp.confirmed_mortgage(0), 37000000)
  ),
  (
    'tenant A''s secret returns tenant A''s report, not blocked by tenant B''s revoked property of the same id',
    'dup74-a',
    pg_temp.snapshot(pg_temp.rid(74), pg_temp.pid(74), 'shared', pg_temp.confirmed_mortgage(0), 21000000)
  ),
  (
    'tenant B''s secret returns nothing for its revoked property, not through tenant A''s live property of the same id',
    'dup74-b',
    null::jsonb
  )
) as same_id(what, secret, expected);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from (values
      ('dup70-a'), ('dup71-a'), ('dup72-a'), ('dup73-a'), ('dup74-a')
    ) as tenant_a_secret(secret)
    where homeowner.read_shared_report(pg_temp.hash_of(tenant_a_secret.secret))
      #>> '{financials,equityMinor}' = '37000000'
  ) + (
    select pg_catalog.count(*)::integer
    from (values
      ('dup70-b'), ('dup71-b'), ('dup72-b'), ('dup73-b'), ('dup74-b')
    ) as tenant_b_secret(secret)
    where homeowner.read_shared_report(pg_temp.hash_of(tenant_b_secret.secret))
      #>> '{financials,equityMinor}' = '21000000'
  ),
  0,
  'no secret of one tenant ever returns the other tenant''s figures'
);

-- record_shared_event. A valid secret records, once per kind, and a repeat is accepted.
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('r1-valid'), 'viewed', '00000000-0000-4000-8000-000000000f81'
  ),
  true,
  'a valid secret records a viewed event'
);
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('r1-valid'), 'viewed', '00000000-0000-4000-8000-000000000f82'
  ),
  true,
  'a second view of the same report is accepted'
);
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('r1-valid'), 'review_requested', '00000000-0000-4000-8000-000000000f83'
  ),
  true,
  'a valid secret records a review request'
);
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('r1-valid'), 'review_requested', '00000000-0000-4000-8000-000000000f84'
  ),
  true,
  'a second review request for the same report is accepted'
);
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('r1-valid'), 'review_resolved', '00000000-0000-4000-8000-000000000f85'
  ),
  false,
  'a public link cannot record a review as resolved'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from homeowner.events
    where location_id = '00000000-0000-4000-8000-000000000f01'
      and report_id = pg_temp.rid(1)
      and event_kind = 'viewed'
  ),
  1,
  'two views of one report leave one viewed event'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from homeowner.events
    where location_id = '00000000-0000-4000-8000-000000000f01'
      and report_id = pg_temp.rid(1)
      and event_kind = 'review_requested'
  ),
  1,
  'two review requests for one report leave one review_requested event'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from homeowner.events
    where event_key = '00000000-0000-4000-8000-000000000f85'
  ),
  0,
  'the refused review_resolved event left no row'
);
select pg_temp.assert_ok(
  (
    select review_requested_at is not null
    from homeowner.properties
    where location_id = '00000000-0000-4000-8000-000000000f01' and id = pg_temp.pid(1)
  ),
  'the first review request marks its property as review requested'
);

-- Nothing is recorded for an expired, revoked or unknown secret, or for a secret whose
-- authority has lapsed. The event count is taken first so "nothing" is a comparison.
create temporary table homeowner_event_baseline as
select pg_catalog.count(*)::integer as event_count from homeowner.events;
reset role;

set local role app_runtime;
select pg_temp.assert_is(
  (
    select pg_catalog.bool_or(
      homeowner.record_shared_event(
        pg_temp.hash_of('r3-expired'), attempt.kind, attempt.event_key::uuid
      )
    )
    from (values
      ('viewed', '00000000-0000-4000-8000-000000000f91'),
      ('review_requested', '00000000-0000-4000-8000-000000000f92')
    ) as attempt(kind, event_key)
  ),
  false,
  'an expired secret records neither a view nor a review request'
);
select pg_temp.assert_is(
  (
    select pg_catalog.bool_or(
      homeowner.record_shared_event(
        pg_temp.hash_of('r3-revoked'), attempt.kind, attempt.event_key::uuid
      )
    )
    from (values
      ('viewed', '00000000-0000-4000-8000-000000000f93'),
      ('review_requested', '00000000-0000-4000-8000-000000000f94')
    ) as attempt(kind, event_key)
  ),
  false,
  'a revoked secret records neither a view nor a review request'
);
select pg_temp.assert_is(
  (
    select pg_catalog.bool_or(
      homeowner.record_shared_event(
        pg_temp.hash_of('never-issued'), attempt.kind, attempt.event_key::uuid
      )
    )
    from (values
      ('viewed', '00000000-0000-4000-8000-000000000f95'),
      ('review_requested', '00000000-0000-4000-8000-000000000f96')
    ) as attempt(kind, event_key)
  ),
  false,
  'an unknown secret records neither a view nor a review request'
);
select pg_temp.assert_is(
  (
    select pg_catalog.bool_or(
      homeowner.record_shared_event(
        pg_temp.hash_of(stale_share.secret), attempt.kind, attempt.event_key::uuid
      )
    )
    from (values
      ('r4-valid'), ('r5-valid'), ('r6-valid'), ('r8-valid'), ('r9-valid'),
      ('r10-valid'), ('r11-valid'), ('r30-valid')
    ) as stale_share(secret)
    cross join (values
      ('viewed', '00000000-0000-4000-8000-000000000f97'),
      ('review_requested', '00000000-0000-4000-8000-000000000f98')
    ) as attempt(kind, event_key)
  ),
  false,
  'a secret whose property, valuation, mortgage input or author authority has lapsed records nothing'
);

reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from homeowner.events),
  (select baseline.event_count from homeowner_event_baseline as baseline),
  'none of the refused attempts added an event to the table'
);
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(id order by id)
    from homeowner.properties
    where review_requested_at is not null
  ),
  array[pg_temp.pid(1)],
  'only the property behind the one valid review request is marked review requested'
);
reset role;

-- The same two tenants and one shared id, now for recording. An event lands on the tenant
-- that issued the secret and on no other, including the property it marks, and a secret
-- that reads nothing records nothing whatever the other tenant holds under that id.
set local role app_runtime;
select platform.reset_transaction_context();
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('dup70-a'), 'viewed', '00000000-0000-4000-8000-000000000fa1'
  ),
  true,
  'tenant A''s secret records a view of the report id both tenants hold'
);
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('dup70-b'), 'review_requested', '00000000-0000-4000-8000-000000000fa2'
  ),
  true,
  'tenant B''s secret records a review request on the report id both tenants hold'
);
select pg_temp.assert_is(
  (
    select pg_catalog.bool_or(
      homeowner.record_shared_event(
        pg_temp.hash_of(unreadable.secret), attempt.kind, attempt.event_key::uuid
      )
    )
    from (values ('dup71-a'), ('dup72-b'), ('dup73-a'), ('dup74-b')) as unreadable(secret)
    cross join (values
      ('viewed', '00000000-0000-4000-8000-000000000fa3'),
      ('review_requested', '00000000-0000-4000-8000-000000000fa4')
    ) as attempt(kind, event_key)
  ),
  false,
  'a secret whose own row fails a check records nothing, though the other tenant''s row of that id passes'
);
reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(location_id order by location_id)
    from homeowner.events
    where report_id = pg_temp.rid(70) and event_kind = 'viewed'
  ),
  array['00000000-0000-4000-8000-000000000f01']::uuid[],
  'the view is attributed to tenant A only'
);
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(location_id order by location_id)
    from homeowner.events
    where report_id = pg_temp.rid(70) and event_kind = 'review_requested'
  ),
  array['00000000-0000-4000-8000-000000000f02']::uuid[],
  'the review request is attributed to tenant B only'
);
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(location_id order by location_id)
    from homeowner.properties
    where id = pg_temp.pid(70) and review_requested_at is not null
  ),
  array['00000000-0000-4000-8000-000000000f02']::uuid[],
  'only tenant B''s property is marked review requested, not tenant A''s property of the same id'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from homeowner.events
    where report_id in (pg_temp.rid(71), pg_temp.rid(72), pg_temp.rid(73), pg_temp.rid(74))
  ),
  0,
  'the refused secrets left no event on any report id of the shared pairs'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from homeowner.properties
    where id in (pg_temp.pid(71), pg_temp.pid(72), pg_temp.pid(73), pg_temp.pid(74))
      and review_requested_at is not null
  ),
  0,
  'the refused secrets marked no property of the shared pairs as review requested'
);
reset role;

-- W-2 (PRD-007 independent quality review). A review request is one event per report for
-- good, but it is one open request at a time: it raises the property's flag when the flag
-- is down and leaves it alone when the flag is already up. So a homeowner who asks again
-- after the loan officer marked the first request reviewed is seen, and a homeowner who
-- asks twice before that is not counted twice. "Mark reviewed" is run below as the
-- repository's resolveReview statement runs it, under app_runtime with the tenant context.
--
-- Everything in a pgTAP run shares one transaction, so now() is one fixed instant. The open
-- request on property 1 is therefore moved to a distinct earlier time first, which is what
-- makes "left alone" observable: an unconditional write would show as a different time.
set local role migration_owner;
update homeowner.properties
set review_requested_at = '2026-01-02 03:04:05+00', updated_at = '2026-01-02 03:04:05+00'
where location_id = '00000000-0000-4000-8000-000000000f01' and id = pg_temp.pid(1);
reset role;

-- A second request while the first is open: accepted, and nothing about the property moves.
set local role app_runtime;
select platform.reset_transaction_context();
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('r1-valid'), 'review_requested', '00000000-0000-4000-8000-000000000fb1'
  ),
  true,
  'a review request while the first is still open is accepted'
);
reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select review_requested_at
    from homeowner.properties
    where location_id = '00000000-0000-4000-8000-000000000f01' and id = pg_temp.pid(1)
  ),
  '2026-01-02 03:04:05+00'::timestamptz,
  'a review request while one is open leaves the flag at the time of the first request'
);
select pg_temp.assert_is(
  (
    select updated_at
    from homeowner.properties
    where location_id = '00000000-0000-4000-8000-000000000f01' and id = pg_temp.pid(1)
  ),
  '2026-01-02 03:04:05+00'::timestamptz,
  'a review request while one is open does not rewrite the property row'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from homeowner.events
    where location_id = '00000000-0000-4000-8000-000000000f01'
      and report_id = pg_temp.rid(1)
      and event_kind = 'review_requested'
  ),
  1,
  'a review request while one is open adds no event'
);
reset role;

-- The loan officer marks it reviewed, exactly as the application does.
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000f11',
  'corr.homeowner-review-resolve'
);
select pg_temp.assert_is(
  pg_temp.write_outcome(
    pg_catalog.format(
      'update homeowner.properties set review_requested_at=null,updated_at=now() where location_id=%L and id=%L',
      '00000000-0000-4000-8000-000000000f01',
      pg_temp.pid(1)
    )
  ),
  'rows 1',
  'the loan officer can mark a review request as reviewed'
);
select platform.reset_transaction_context();
reset role;
set local role migration_owner;
select pg_temp.assert_ok(
  (
    select review_requested_at is null
    from homeowner.properties
    where location_id = '00000000-0000-4000-8000-000000000f01' and id = pg_temp.pid(1)
  ),
  'marking a review reviewed puts the flag down'
);
reset role;

-- With the flag down, only an accepted review request raises it. A view does not, and a
-- link that is expired or revoked records nothing even though it names the same report.
set local role app_runtime;
select platform.reset_transaction_context();
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('r1-valid'), 'viewed', '00000000-0000-4000-8000-000000000fb2'
  ),
  true,
  'a view after the review was marked reviewed is accepted'
);
select pg_temp.assert_is(
  (
    select pg_catalog.bool_or(
      homeowner.record_shared_event(
        pg_temp.hash_of(lapsed_link.secret), 'review_requested', lapsed_link.event_key::uuid
      )
    )
    from (values
      ('r1-expired', '00000000-0000-4000-8000-000000000fb3'),
      ('r1-revoked', '00000000-0000-4000-8000-000000000fb4')
    ) as lapsed_link(secret, event_key)
  ),
  false,
  'an expired or revoked link to the same report records no review request'
);
reset role;
set local role migration_owner;
select pg_temp.assert_ok(
  (
    select review_requested_at is null
    from homeowner.properties
    where location_id = '00000000-0000-4000-8000-000000000f01' and id = pg_temp.pid(1)
  ),
  'neither a view nor a lapsed link raises the review flag'
);
reset role;

-- The homeowner asks again. It is accepted, the flag goes up at this request, and the
-- report still has the one review_requested event it always had.
set local role app_runtime;
select platform.reset_transaction_context();
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('r1-valid'), 'review_requested', '00000000-0000-4000-8000-000000000fb5'
  ),
  true,
  'a review request after the first was marked reviewed is accepted'
);
reset role;
set local role migration_owner;
select pg_temp.assert_ok(
  (
    select review_requested_at = pg_catalog.now()
    from homeowner.properties
    where location_id = '00000000-0000-4000-8000-000000000f01' and id = pg_temp.pid(1)
  ),
  'a review request after the first was marked reviewed raises the flag again, at the new request'
);
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(event_key order by event_key)
    from homeowner.events
    where location_id = '00000000-0000-4000-8000-000000000f01'
      and report_id = pg_temp.rid(1)
      and event_kind = 'review_requested'
  ),
  array['00000000-0000-4000-8000-000000000f83']::uuid[],
  'the repeated request leaves the report with its one review_requested event, the first'
);
reset role;

-- One id, two tenants, again. Tenant B marks its request on report 70 reviewed. Tenant A
-- then asks about its own report 70: that must raise tenant A's flag and not put tenant B's
-- resolved flag back up. Tenant B asks again afterwards and its own flag goes up again.
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000f02',
  '00000000-0000-4000-8000-000000000f17',
  'corr.homeowner-review-resolve-b'
);
select pg_temp.assert_is(
  pg_temp.write_outcome(
    pg_catalog.format(
      'update homeowner.properties set review_requested_at=null,updated_at=now() where location_id=%L and id=%L',
      '00000000-0000-4000-8000-000000000f02',
      pg_temp.pid(70)
    )
  ),
  'rows 1',
  'tenant B can mark its own review request reviewed'
);
select platform.reset_transaction_context();
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('dup70-a'), 'review_requested', '00000000-0000-4000-8000-000000000fb6'
  ),
  true,
  'tenant A''s secret records a review request on the report id both tenants hold'
);
reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(location_id order by location_id)
    from homeowner.properties
    where id = pg_temp.pid(70) and review_requested_at is not null
  ),
  array['00000000-0000-4000-8000-000000000f01']::uuid[],
  'tenant A''s request raises tenant A''s flag and not tenant B''s resolved flag for the same id'
);
reset role;
set local role app_runtime;
select platform.reset_transaction_context();
select pg_temp.assert_is(
  homeowner.record_shared_event(
    pg_temp.hash_of('dup70-b'), 'review_requested', '00000000-0000-4000-8000-000000000fb7'
  ),
  true,
  'tenant B''s secret records a new review request after tenant B marked the first reviewed'
);
reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(location_id order by location_id)
    from homeowner.properties
    where id = pg_temp.pid(70) and review_requested_at is not null
  ),
  array[
    '00000000-0000-4000-8000-000000000f01'::uuid,
    '00000000-0000-4000-8000-000000000f02'::uuid
  ],
  'tenant B''s repeated request raises tenant B''s flag again and leaves tenant A''s up'
);
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(location_id order by location_id)
    from homeowner.events
    where report_id = pg_temp.rid(70) and event_kind = 'review_requested'
  ),
  array[
    '00000000-0000-4000-8000-000000000f01'::uuid,
    '00000000-0000-4000-8000-000000000f02'::uuid
  ],
  'each tenant holds exactly one review_requested event for the report id both hold'
);
reset role;

-- The share entry points belong to app_runtime alone, and the roles a public visitor
-- could be mapped to cannot reach them.
select pg_temp.assert_ok(
  has_function_privilege('app_runtime', shared_function.signature, 'EXECUTE'),
  pg_catalog.format('app_runtime can execute %s', shared_function.signature)
)
from (values
  ('homeowner.read_shared_report(text)'),
  ('homeowner.record_shared_event(text,text,uuid)')
) as shared_function(signature);
select pg_temp.assert_is(
  (
    select coalesce(pg_catalog.array_agg(reachable_role.role_name order by reachable_role.role_name), array[]::text[])
    from (values
      ('public'), ('anon'), ('authenticated'), ('scheduler_runtime'),
      ('support_runtime'), ('reporting_runtime')
    ) as reachable_role(role_name)
    where has_function_privilege(
      reachable_role.role_name::name, shared_function.signature, 'EXECUTE'
    )
  ),
  array[]::text[],
  pg_catalog.format('no role other than app_runtime can execute %s', shared_function.signature)
)
from (values
  ('homeowner.read_shared_report(text)'),
  ('homeowner.record_shared_event(text,text,uuid)')
) as shared_function(signature);

set local role anon;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate(
    $sql$select homeowner.read_shared_report(pg_temp.hash_of('r1-valid'))$sql$
  ),
  '42501',
  'anon is refused read_shared_report even for a valid secret'
);
select pg_temp.assert_is(
  pg_temp.capture_sqlstate($sql$
    select homeowner.record_shared_event(
      pg_temp.hash_of('r1-valid'), 'viewed', '00000000-0000-4000-8000-000000000f99'
    )
  $sql$),
  '42501',
  'anon is refused record_shared_event even for a valid secret'
);
reset role;

-- 008D-AC-004. claim_due_properties: scheduler_runtime alone may execute it.
select pg_temp.assert_is(
  has_function_privilege(claimant.role_name::name, 'homeowner.claim_due_properties(integer)', 'EXECUTE'),
  claimant.expected,
  pg_catalog.format(
    '%s %s execute claim_due_properties',
    claimant.role_name,
    case when claimant.expected then 'can' else 'cannot' end
  )
)
from (values
  ('scheduler_runtime', true),
  ('app_runtime', false),
  ('anon', false),
  ('authenticated', false),
  ('public', false),
  ('support_runtime', false),
  ('reporting_runtime', false)
) as claimant(role_name, expected);

-- No function in the schema leaves a grant to public behind, whether by an explicit
-- ACL entry or by the default an absent ACL stands for.
select pg_temp.assert_ok(
  not exists (
    select 1
    from pg_catalog.pg_proc as routine
    cross join lateral pg_catalog.aclexplode(
      coalesce(routine.proacl, pg_catalog.acldefault('f', routine.proowner))
    ) as grant_row
    where routine.oid = pg_catalog.to_regprocedure(homeowner_function.signature)
      and grant_row.grantee = 0
  ),
  pg_catalog.format('public holds no execute grant on %s', homeowner_function.signature)
)
from (values
  ('homeowner.claim_due_properties(integer)'),
  ('homeowner.allowed(uuid,boolean)'),
  ('homeowner.read_shared_report(text)'),
  ('homeowner.record_shared_event(text,text,uuid)')
) as homeowner_function(signature);

-- And the refusal at run time, for every role that is not the scheduler.
set local role app_runtime;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate('select * from homeowner.claim_due_properties(1)'),
  '42501',
  'app_runtime is refused claim_due_properties when it calls it'
);
reset role;
set local role anon;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate('select * from homeowner.claim_due_properties(1)'),
  '42501',
  'anon is refused claim_due_properties when it calls it'
);
reset role;
set local role authenticated;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate('select * from homeowner.claim_due_properties(1)'),
  '42501',
  'authenticated is refused claim_due_properties when it calls it'
);
reset role;
set local role support_runtime;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate('select * from homeowner.claim_due_properties(1)'),
  '42501',
  'support_runtime is refused claim_due_properties when it calls it'
);
reset role;
set local role reporting_runtime;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate('select * from homeowner.claim_due_properties(1)'),
  '42501',
  'reporting_runtime is refused claim_due_properties when it calls it'
);
reset role;

-- The scheduler can call it, and what it gets back is the due, unleased, authorised
-- work and nothing else. Of the twelve due-looking properties only 40, 41 and 42 qualify:
-- 43 is not yet due, 44 is paused, 45 is revoked, 46 holds a live lease, 47 to 49 have
-- an author who lost, is suspended from, or never held a creating role, 50 sits in a
-- suspended location and 51 has no monthly cadence. 41's lease lapsed an hour ago.
set local role scheduler_runtime;
select pg_temp.assert_is(
  (select pg_catalog.array_agg(property_id order by property_id) from homeowner.claim_due_properties(0)),
  array[pg_temp.pid(40)],
  'scheduler_runtime claims the earliest due property, and a batch size of zero is clamped to one'
);
select pg_temp.assert_is(
  (select pg_catalog.array_agg(property_id order by property_id) from homeowner.claim_due_properties(2)),
  array[pg_temp.pid(41), pg_temp.pid(42)],
  'the next claim returns the lapsed-lease property and tenant B''s, and none of the nine ineligible ones'
);
select pg_temp.assert_is(
  (select pg_catalog.count(*)::integer from homeowner.claim_due_properties(10)),
  0,
  'a further claim finds nothing, because every due property now holds a lease'
);
reset role;

-- The returned columns are the author and the location, taken from the claimed rows.
-- These need a second claim, so a fresh pair of due properties is made first.
set local role migration_owner;
update homeowner.properties
set lease_until = null
where id in (pg_temp.pid(41), pg_temp.pid(42));
reset role;
set local role scheduler_runtime;
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(location_id order by property_id)
    from homeowner.claim_due_properties(5)
  ),
  array[
    '00000000-0000-4000-8000-000000000f01'::uuid,
    '00000000-0000-4000-8000-000000000f02'::uuid
  ],
  'a claim names the location of each property it returns'
);
reset role;
set local role migration_owner;
update homeowner.properties
set lease_until = null
where id in (pg_temp.pid(41), pg_temp.pid(42));
reset role;
set local role scheduler_runtime;
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(actor_id order by property_id)
    from homeowner.claim_due_properties(5)
  ),
  array[
    '00000000-0000-4000-8000-000000000f11'::uuid,
    '00000000-0000-4000-8000-000000000f17'::uuid
  ],
  'a claim names the author of each property it returns as the acting person'
);
reset role;

set local role migration_owner;
select pg_temp.assert_is(
  (
    select pg_catalog.array_agg(id order by id)
    from homeowner.properties
    where lease_until = pg_catalog.now() + interval '5 minutes'
  ),
  array[pg_temp.pid(40), pg_temp.pid(41), pg_temp.pid(42)],
  'a claim leases a property for five minutes and leases nothing it did not return'
);
reset role;

-- The four definer functions keep the trust-boundary settings: owned by migration_owner,
-- security definer, and an empty search path.
select pg_temp.assert_ok(
  coalesce(
    (
      select routine.prosecdef
        and routine.proowner = 'migration_owner'::regrole
        and routine.proconfig @> array['search_path=""']
      from pg_catalog.pg_proc as routine
      where routine.oid = pg_catalog.to_regprocedure(homeowner_function.signature)
    ),
    false
  ),
  pg_catalog.format(
    '%s is a migration_owner security definer with an empty search path', homeowner_function.signature
  )
)
from (values
  ('homeowner.allowed(uuid,boolean)'),
  ('homeowner.read_shared_report(text)'),
  ('homeowner.record_shared_event(text,text,uuid)'),
  ('homeowner.claim_due_properties(integer)')
) as homeowner_function(signature);

-- homeowner.allowed. Reads are open to five roles and writes to two; the collaborator
-- role is on neither list; a binding must be live, its person and location active, and
-- the requested location must be the one the transaction is scoped to.
set local role app_runtime;
select pg_temp.assert_is(
  pg_temp.allowed_in_context(probe.context_location, probe.actor_id, probe.requested_location, probe.write_required),
  probe.expected,
  pg_catalog.format('homeowner.allowed: %s', probe.label)
)
from (values
  ('a location_admin may read', '00000000-0000-4000-8000-000000000f01'::uuid, '00000000-0000-4000-8000-000000000f11'::uuid, '00000000-0000-4000-8000-000000000f01'::uuid, false, true),
  ('a location_admin may write', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', '00000000-0000-4000-8000-000000000f01', true, true),
  ('a creator may read', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f12', '00000000-0000-4000-8000-000000000f01', false, true),
  ('a creator may write', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f12', '00000000-0000-4000-8000-000000000f01', true, true),
  ('an approver may read', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f13', '00000000-0000-4000-8000-000000000f01', false, true),
  ('an approver may not write', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f13', '00000000-0000-4000-8000-000000000f01', true, false),
  ('a publisher may read', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f14', '00000000-0000-4000-8000-000000000f01', false, true),
  ('a publisher may not write', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f14', '00000000-0000-4000-8000-000000000f01', true, false),
  ('an analyst may read', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f15', '00000000-0000-4000-8000-000000000f01', false, true),
  ('an analyst may not write', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f15', '00000000-0000-4000-8000-000000000f01', true, false),
  ('a realtor_collaborator may not read', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f16', '00000000-0000-4000-8000-000000000f01', false, false),
  ('a realtor_collaborator may not write', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f16', '00000000-0000-4000-8000-000000000f01', true, false),
  ('a person with no binding may not read', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f19', '00000000-0000-4000-8000-000000000f01', false, false),
  ('a person with no binding may not write', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f19', '00000000-0000-4000-8000-000000000f01', true, false),
  ('another tenant''s admin may not read here', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f17', '00000000-0000-4000-8000-000000000f01', false, false),
  ('another tenant''s collaborator may not read here', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f18', '00000000-0000-4000-8000-000000000f01', false, false),
  ('a revoked binding may not read', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f1a', '00000000-0000-4000-8000-000000000f01', false, false),
  ('a suspended person may not read', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f1b', '00000000-0000-4000-8000-000000000f01', false, false),
  ('a suspended location may not be read', '00000000-0000-4000-8000-000000000f03', '00000000-0000-4000-8000-000000000f11', '00000000-0000-4000-8000-000000000f03', false, false),
  ('a suspended location may not be written', '00000000-0000-4000-8000-000000000f03', '00000000-0000-4000-8000-000000000f11', '00000000-0000-4000-8000-000000000f03', true, false),
  ('an admin scoped to one tenant may not read another', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', '00000000-0000-4000-8000-000000000f02', false, false),
  ('no tenant setting means no access', null, '00000000-0000-4000-8000-000000000f11', '00000000-0000-4000-8000-000000000f01', false, false),
  ('no requested location means no access', '00000000-0000-4000-8000-000000000f01', '00000000-0000-4000-8000-000000000f11', null, false, false)
) as probe(label, context_location, actor_id, requested_location, write_required, expected);
select platform.reset_transaction_context();
reset role;

-- Its grants: app_runtime holds execute and no other role does.
select pg_temp.assert_is(
  has_function_privilege(caller.role_name::name, 'homeowner.allowed(uuid,boolean)', 'EXECUTE'),
  caller.expected,
  pg_catalog.format(
    '%s %s execute homeowner.allowed',
    caller.role_name,
    case when caller.expected then 'can' else 'cannot' end
  )
)
from (values
  ('app_runtime', true),
  ('public', false),
  ('anon', false),
  ('authenticated', false),
  ('scheduler_runtime', false),
  ('support_runtime', false),
  ('reporting_runtime', false)
) as caller(role_name, expected);
set local role anon;
select pg_temp.assert_is(
  pg_temp.capture_sqlstate(
    $sql$select homeowner.allowed('00000000-0000-4000-8000-000000000f01', false)$sql$
  ),
  '42501',
  'anon is refused homeowner.allowed when it calls it'
);
reset role;

-- The migration's comment on usage_events: minimal usage evidence outlives a homeowner's
-- request to remove their property data. Removing property 60 takes its report, lookup,
-- share, event and delivery with it and leaves the usage event.
set local role app_runtime;
select platform.set_app_context(
  '00000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000f11',
  'corr.homeowner-removal'
);
select pg_temp.assert_is(
  pg_temp.write_outcome(
    pg_catalog.format('delete from homeowner.properties where id = %L', pg_temp.pid(60))
  ),
  'rows 1',
  'tenant A can remove its own property'
);
select platform.reset_transaction_context();
reset role;
set local role migration_owner;
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from (
      select 1 from homeowner.reports where id = pg_temp.rid(60)
      union all
      select 1 from homeowner.lookup_requests where property_id = pg_temp.pid(60)
      union all
      select 1 from homeowner.shares where report_id = pg_temp.rid(60)
      union all
      select 1 from homeowner.events where report_id = pg_temp.rid(60)
      union all
      select 1 from homeowner.deliveries where report_id = pg_temp.rid(60)
    ) as leftovers
  ),
  0,
  'removing a property removes its report, lookup, share, event and delivery rows'
);
select pg_temp.assert_is(
  (
    select pg_catalog.count(*)::integer
    from homeowner.usage_events
    where location_id = '00000000-0000-4000-8000-000000000f01'
      and request_id = '00000000-0000-4000-8000-000000000f63'
  ),
  1,
  'removing a property keeps the usage event that counted its lookup'
);
reset role;

select * from finish();
rollback;
