-- Phase 0 local seed contract
--
-- This seed is deliberately data-less. Production schemas, tenant records,
-- provider identifiers, credentials, and customer data are out of scope until
-- the external research gates close. A future seed must contain synthetic data
-- only and must be reviewed with its matching schema migration.

begin;

select set_config('app.phase0_seed_classification', 'synthetic-only', true);

do $$
begin
  if current_setting('app.phase0_seed_classification', true) <> 'synthetic-only' then
    raise exception 'Phase 0 seed classification must remain synthetic-only';
  end if;
end
$$;

commit;
