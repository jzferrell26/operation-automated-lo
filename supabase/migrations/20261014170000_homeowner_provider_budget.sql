-- Private shared RentCast budget. Expand only; no configured allowance is seeded.
-- ACCESS EXCLUSIVE applies only to this new empty table. Existing tenant tables
-- and their policies are unchanged. Roll forward after durable reservations.
begin;
set local role migration_owner;
set local lock_timeout = '5s';

create table homeowner.provider_account_budgets (
  provider_key text primary key check (provider_key = 'rentcast'),
  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null check (billing_period_end > billing_period_start),
  lookup_limit integer not null check (lookup_limit between 0 and 1000000),
  reserved_attempts integer not null default 0 check (reserved_attempts between 0 and lookup_limit),
  enabled boolean not null default false,
  updated_at timestamptz not null default clock_timestamp()
);
alter table homeowner.provider_account_budgets enable row level security;
alter table homeowner.provider_account_budgets force row level security;
create policy provider_budget_owner on homeowner.provider_account_budgets
  for all to migration_owner using (true) with check (true);
revoke all on homeowner.provider_account_budgets from public, app_runtime,
  scheduler_runtime, support_runtime, reporting_runtime;

create function homeowner.reserve_provider_lookup() returns boolean
language plpgsql security definer set search_path = '' as $function$
begin
  if homeowner.allowed(platform.current_location_id(), true) is not true then
    return false;
  end if;
  -- One row serializes every workspace. PostgreSQL rechecks this predicate after
  -- a concurrent updater commits. No request supplies a cap or billing period.
  update homeowner.provider_account_budgets
    set reserved_attempts = reserved_attempts + 1, updated_at = clock_timestamp()
    where provider_key = 'rentcast' and enabled
      and billing_period_start <= clock_timestamp()
      and billing_period_end > clock_timestamp()
      and reserved_attempts < lookup_limit;
  return found;
end
$function$;
revoke all on function homeowner.reserve_provider_lookup() from public;
grant execute on function homeowner.reserve_provider_lookup() to app_runtime;

create function homeowner.provider_lookup_available() returns boolean
language sql stable security definer set search_path = '' as $function$
  select homeowner.allowed(platform.current_location_id(), false) is true and exists (
    select 1 from homeowner.provider_account_budgets
    where provider_key = 'rentcast' and enabled
      and billing_period_start <= statement_timestamp()
      and billing_period_end > statement_timestamp()
      and reserved_attempts < lookup_limit
  )
$function$;
revoke all on function homeowner.provider_lookup_available() from public;
grant execute on function homeowner.provider_lookup_available() to app_runtime;
commit;
