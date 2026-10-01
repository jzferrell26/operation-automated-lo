-- PRD-008a D2 (008A-AC-010): a per-person rate limit on change-password.
--
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- What this adds, and why:
--
-- 1. One new rate-limit scope, change_password_user. Change-password verified
--    a current password against no limit at all, so a signed-in caller could
--    drive unbounded Argon2id derivations, and whoever held a stolen session
--    could guess the current password uncounted (PRD-005/006 batch security
--    audit, 2026-09-19, first Medium finding). The route is only reachable with
--    a verified session, so the request names exactly one person and the
--    counter is keyed on that person, the way resend_verification_user is.
-- 2. Nothing else. The scope deliberately does not feed the ten-failure sign-in
--    lockout (PRD-008a D1a): if it did, anyone holding a stolen session could
--    lock the real person out of their own account, which is a worse outcome
--    than the bounded guessing this limit leaves.
--
-- Migration safety:
-- - Additive apart from one widened check constraint and one replaced function
--   body, each named above. No table, column, index, policy, or grant is
--   dropped, and no existing scope changes meaning.
-- - The widening is pure: every scope the old constraint allowed the new one
--   allows, so no existing row can become invalid and no backfill is needed.
--   The recreated constraint keeps the explicit name
--   20260919190000_verification_resend.sql gave it.
-- - Lock class: as in 20260919190000_verification_resend.sql, dropping and
--   recreating the check takes ACCESS EXCLUSIVE on platform.auth_rate_limits for
--   one full-table validation. That table holds only fixed-window counters, is
--   swept to at most twenty-four hours of rows by consume_auth_rate_limit
--   itself, and has no durable data. The create-or-replace statement takes
--   ACCESS EXCLUSIVE on the one function only.
-- - Roll forward by a later migration. A destructive down migration is allowed
--   only on an unlinked local database before any durable data exists.
--
-- Trust boundary:
-- - create or replace keeps the function's owner and its execute grants exactly
--   as 20260919140000_password_credentials.sql left them: app_runtime alone,
--   nothing for public. The body below restates security definer and
--   set search_path = '' rather than relying on the replaced definition.
-- - platform.auth_rate_limits still holds no grant of any kind for a runtime
--   role, and still stores a keyed hash rather than any identifier.
--
-- Verification queries are implemented in
-- supabase/tests/change_password_rate_limit.pgtap.sql.

set role migration_owner;

-- PRD-008a D2, widened by one scope. Every value the old check allowed the new
-- one allows.
alter table platform.auth_rate_limits
  drop constraint auth_rate_limits_scope_ck;
alter table platform.auth_rate_limits
  add constraint auth_rate_limits_scope_ck check (
    scope in (
      'sign_in_ip', 'sign_up_ip', 'forgot_ip', 'forgot_email', 'reset_ip',
      'verify_ip', 'resend_verification_user', 'change_password_user'
    )
  );

-- The same function as 20260919190000_verification_resend.sql with one scope
-- added to the guard. Everything else, including the fixed-window arithmetic
-- and the opportunistic sweep, is byte-for-byte what it was.
create or replace function platform.consume_auth_rate_limit(
  scope text,
  key_hash text,
  attempt_limit integer,
  window_seconds integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  current_window timestamptz;
  current_count integer;
begin
  if consume_auth_rate_limit.scope is null
    or consume_auth_rate_limit.key_hash is null
    or consume_auth_rate_limit.attempt_limit is null
    or consume_auth_rate_limit.window_seconds is null
    or consume_auth_rate_limit.scope not in (
      'sign_in_ip', 'sign_up_ip', 'forgot_ip', 'forgot_email', 'reset_ip',
      'verify_ip', 'resend_verification_user', 'change_password_user'
    )
    or consume_auth_rate_limit.key_hash !~ '^[0-9a-f]{64}$'
    or consume_auth_rate_limit.attempt_limit not between 1 and 100000
    or consume_auth_rate_limit.window_seconds not between 1 and 86400
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  current_window := pg_catalog.to_timestamp(
    (
      pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.now()))::bigint
      / consume_auth_rate_limit.window_seconds
    ) * consume_auth_rate_limit.window_seconds
  );

  insert into platform.auth_rate_limits (scope, key_hash, window_start, attempt_count)
  values (
    consume_auth_rate_limit.scope,
    consume_auth_rate_limit.key_hash,
    current_window,
    1
  )
  on conflict on constraint auth_rate_limits_pkey do update
    set attempt_count = auth_rate_limits.attempt_count + 1
  returning auth_rate_limits.attempt_count into current_count;

  delete from platform.auth_rate_limits as stale
  where stale.window_start < current_window - interval '24 hours';

  return current_count <= consume_auth_rate_limit.attempt_limit;
end
$function$;

reset role;
