-- M-1 of the PRD-008 close-out security audit (2026-10-01): the sign-in
-- response-time account oracle.
--
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- What this adds, and why:
--
-- 1. One definer write for a sign-in refusal where the address has no active
--    account, platform.record_sign_in_without_account. A known address with a
--    wrong password, or with an open lock, awaits
--    platform.record_password_sign_in_failure before its 401. The unknown
--    branch awaited nothing after the credential lookup, so it answered one
--    database round trip sooner, and the response time said whether the
--    account existed. The sign-in handler
--    (apps/web/src/server/password-authentication-handler.ts) now awaits this
--    function on that branch, so both refusals do the same kind of work before
--    they answer.
--
--    The known branch's write is not moved after the response instead, the
--    way PRD-008a D3 moved forgot-password's token issuance: that write is what
--    counts toward the ten-failure lock, and deferring it would let the next
--    attempt be read before the lock from the last one had landed.
--
-- 2. One new scope on platform.auth_rate_limits, sign_in_no_account, which
--    that function writes and nothing else does. Each row counts the attempts
--    made from one client address for addresses with no account, in one
--    fifteen-minute window, which is the count PRD-006a D4 said unknown-email
--    attempts would be kept as, and the signal security Ruling 4's
--    credential-stuffing alert needs. It limits nothing.
--    platform.consume_auth_rate_limit is not widened, so no caller can consume
--    the scope as a limit; a refusal only an unknown address could earn would
--    be the same oracle again.
--
-- Migration safety:
-- - Additive apart from one widened check constraint. One new function and
--   its grants. No table, column, index, policy, or existing function is
--   altered or dropped, and no existing scope changes meaning.
-- - The widening is pure: every scope the old constraint allowed the new one
--   allows, so no existing row can become invalid and no backfill is needed.
--   The recreated constraint keeps the explicit name
--   20260919190000_verification_resend.sql gave it.
-- - Lock class: as in 20260930180000_change_password_rate_limit.sql, dropping
--   and recreating the check takes ACCESS EXCLUSIVE on
--   platform.auth_rate_limits for one full-table validation. That table holds
--   only fixed-window counters, is swept to at most twenty-four hours of rows
--   by consume_auth_rate_limit on every sign-in, and has no durable data.
--   create function takes no lock on any table.
-- - Order against the application code. This migration is safe under the code
--   running now, which never names the new scope or the new function. If the
--   new code is deployed first, the unknown branch's call fails with
--   PostgreSQL's undefined-function error, the handler discards it, and the
--   route still answers the same 401; a known account never calls the
--   function, so its lockout and sign-in are unaffected.
-- - The new rows are swept by the same opportunistic delete in
--   consume_auth_rate_limit, which removes every row older than twenty-four
--   hours whatever its scope, so this table still cannot grow without an
--   eviction.
-- - Roll forward by a later migration. A destructive down migration is allowed
--   only on an unlinked local database before any durable data exists.
--
-- Trust boundary:
-- - The function is owned by migration_owner, is security definer with
--   set search_path = '', contains no dynamic SQL, and is granted to
--   app_runtime alone, exactly like the credential definers beside it.
--   support_runtime gains nothing, and public keeps no execute.
-- - Its one argument is a keyed hash of the client address, checked for the
--   same sixty-four lowercase hex shape the table insists on, and refused with
--   errcode 42501 and the one generic message otherwise. The window is fixed
--   in the body; the caller chooses neither the scope nor the window.
-- - Nothing derived from the email address that was tried reaches the
--   database: no address, no hash of it, and no audit row. The row holds the
--   same kind of value the sign_in_ip row for the same request already holds,
--   a keyed hash of the client address, under a scope of its own.
-- - platform.auth_rate_limits still holds no grant of any kind for a runtime
--   role.
--
-- Verification queries are implemented in
-- supabase/tests/sign_in_without_account.pgtap.sql.

set role migration_owner;

-- Widened by one scope. Every value the old check allowed the new one allows.
alter table platform.auth_rate_limits
  drop constraint auth_rate_limits_scope_ck;
alter table platform.auth_rate_limits
  add constraint auth_rate_limits_scope_ck check (
    scope in (
      'sign_in_ip', 'sign_up_ip', 'forgot_ip', 'forgot_email', 'reset_ip',
      'verify_ip', 'resend_verification_user', 'change_password_user',
      'sign_in_no_account'
    )
  );

-- One counter row per client address per fifteen-minute window, the same
-- window the sign_in_ip limit counts in, so the two counts line up. The window
-- arithmetic is consume_auth_rate_limit's, with the width fixed here rather
-- than passed in.
create function platform.record_sign_in_without_account(key_hash text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  current_window timestamptz;
begin
  if record_sign_in_without_account.key_hash is null
    or record_sign_in_without_account.key_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  current_window := pg_catalog.to_timestamp(
    (pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.now()))::bigint / 900) * 900
  );

  insert into platform.auth_rate_limits (scope, key_hash, window_start, attempt_count)
  values (
    'sign_in_no_account',
    record_sign_in_without_account.key_hash,
    current_window,
    1
  )
  on conflict on constraint auth_rate_limits_pkey do update
    set attempt_count = auth_rate_limits.attempt_count + 1;
end
$function$;

revoke execute on function platform.record_sign_in_without_account(text) from public;
grant execute on function platform.record_sign_in_without_account(text) to app_runtime;

comment on function platform.record_sign_in_without_account(text) is
  'Records one sign-in refusal for an address with no active account, as one sign_in_no_account counter row per keyed client-address hash per fifteen-minute window. Limits nothing and writes no audit row. It exists so the unknown-address branch awaits the same kind of definer write the known-address branch awaits, which keeps response time from disclosing whether an account exists (PRD-008 close-out security audit, M-1).';

reset role;
