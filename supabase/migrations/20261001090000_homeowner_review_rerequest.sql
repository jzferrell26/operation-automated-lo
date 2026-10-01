-- PRD-007 independent quality review W-2 (2026-10-01): a review request made after the loan
-- officer marked the previous one reviewed must reach the loan officer.
--
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- What this changes, and why:
--
-- 1. homeowner.record_shared_event raised the property's review flag
--    (homeowner.properties.review_requested_at) only when its own insert into
--    homeowner.events was new. 20260924010000_homeowner_reports.sql allows one
--    review_requested event per report for good (homeowner_review_once_idx), and "Mark
--    reviewed" puts the flag down without touching that event. So a homeowner who asked
--    again after the loan officer resolved the first request was told "Your loan officer
--    can now see your request", the call was accepted, and the flag stayed down: the loan
--    officer saw nothing.
-- 2. The flag now follows the flag, not the insert. Any accepted review_requested call
--    raises review_requested_at when it is currently null and leaves the row exactly as it
--    is when it is already set. The rule is one open request at a time. A request while
--    one is open is accepted and writes nothing, so neither the flag time nor updated_at
--    moves. A request after the loan officer resolved the last one is visible again. The
--    event row stays unique per report and is neither replaced nor duplicated, so
--    homeowner.events still holds the first request only, and review_requested_at carries
--    the time of the latest open one.
-- 3. Nothing else. Against the body in 20260924010000_homeowner_reports.sql the function
--    loses its unused insert row count and the "insert was new" condition on the update, and
--    gains one predicate on that update (review_requested_at is null). Every refusal is
--    untouched: an unknown kind, an unknown, expired or revoked secret, and any share whose
--    property, valuation, mortgage input, author or location no longer qualifies still
--    record nothing and return false, because all of them return before the event insert.
--    The event is still attributed to the location that issued the secret, and the property
--    update is still keyed on that location and the report's property id, so a report id
--    that two locations both hold never crosses tenants.
--
-- Migration safety:
-- - Additive apart from one replaced function body. No table, column, index, policy, or
--   grant is dropped or altered, and no data is touched, so no backfill is needed. Rows
--   that already carry a resolved request stay as they are until the homeowner asks again.
-- - Lock class: create or replace function changes the one function and no table. Checked
--   on PostgreSQL 17 by running the statement in a transaction and listing pg_locks before
--   rolling back: it holds no lock on homeowner.events or homeowner.properties, so reads and
--   writes of both carry on throughout. A call already running finishes on the body it
--   started with; the next call uses the new one.
-- - Roll forward by a later migration that restores the previous body, which stays in
--   20260924010000_homeowner_reports.sql. A destructive down migration is allowed only on
--   an unlinked local database before any durable data exists.
--
-- Trust boundary:
-- - create or replace keeps the function's owner (migration_owner) and its execute grants.
--   The statements below restate them anyway rather than rely on the replaced definition:
--   security definer, an empty search_path, execute for app_runtime alone, nothing for
--   public. The function still reads the share only through homeowner.read_shared_report,
--   which rechecks current authority on every call.
-- - A public link still cannot record review_resolved. Only the application's own
--   resolveReview statement, under app_runtime with a tenant context and write authority,
--   puts the flag down.
--
-- Verification queries are implemented in supabase/tests/homeowner_reports.pgtap.sql and
-- apps/web/src/server/homeowners/repository.postgres.test.ts.

set role migration_owner;

create or replace function homeowner.record_shared_event(wanted_hash text, wanted_kind text, wanted_key uuid)
returns boolean language plpgsql security definer set search_path = '' as $function$
declare shared jsonb; share_location uuid;
begin
  if wanted_kind not in ('viewed','review_requested') then return false; end if;
  shared := homeowner.read_shared_report(wanted_hash);
  if shared is null then return false; end if;
  select location_id into share_location from homeowner.shares where secret_hash=wanted_hash;
  insert into homeowner.events(location_id,report_id,event_kind,event_key) values(share_location,shared->>'id',wanted_kind,wanted_key) on conflict do nothing;
  if wanted_kind='review_requested' then
    update homeowner.properties set review_requested_at=now(),updated_at=now() where location_id=share_location and id=shared->>'propertyId' and review_requested_at is null;
  end if;
  return true;
end
$function$;
revoke all on function homeowner.record_shared_event(text,text,uuid) from public;
grant execute on function homeowner.record_shared_event(text,text,uuid) to app_runtime;

reset role;
