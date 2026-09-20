-- PRD-006a D1, D4, D5 and PRD-006b D10: the shell's "Resend the link." control.
--
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- What this adds, and why each piece exists:
--
-- 1. One new rate-limit scope, resend_verification_user. The resend control is
--    only reachable with a verified session, so the request names exactly one
--    person and the counter is keyed on that person rather than on a client
--    address. An address-keyed window would make one office share one budget.
-- 2. One new audit action, auth.verification-resent, on
--    platform.record_email_delivery. It is the same message as
--    auth.verification-email, asked for again by the person themselves, and it
--    is a separate action so an operator can tell a sign-up's one automatic
--    send from somebody who has now pressed the control four times because
--    nothing is arriving.
-- 3. One new delivery subject, already_verified, which D1's vocabulary of
--    not_configured, provider_error, and the provider's message id did not
--    have a word for. The subject column is length-checked rather than
--    enumerated, so this is documentation rather than a constraint change.
-- 4. One new security definer read, platform.unverified_email_display_for_user,
--    because the resend control holds a session and no address, and no existing
--    read on this boundary returns one.
--
-- Migration safety:
-- - Additive apart from one widened check constraint and two replaced function
--   bodies, each named above. No table, column, index, policy, or grant is
--   dropped, and no existing constraint changes meaning.
-- - The widening is pure: every scope the old constraint allowed the new one
--   allows, so no existing row can become invalid and no backfill is needed.
--   The recreated constraint carries an explicit name rather than the
--   auto-generated one it replaces.
-- - Lock class: dropping and recreating the check takes ACCESS EXCLUSIVE on
--   platform.auth_rate_limits for one full-table validation. That table holds
--   only fixed-window counters, is swept to at most twenty-four hours of rows
--   by consume_auth_rate_limit itself, and has no durable data: a caller that
--   blocks for the validation retries, and a counter that is missed is a counter
--   in the caller's favour by one attempt. The two create-or-replace statements
--   take ACCESS EXCLUSIVE on the two functions only.
-- - Roll forward by a later migration. A destructive down migration is allowed
--   only on an unlinked local database before any durable data exists.
--
-- Trust boundary:
-- - The new read is owned by migration_owner, is security definer with
--   set search_path = '', contains no dynamic SQL, and is granted to
--   app_runtime alone, exactly like the eleven reads beside it.
-- - It is deliberately the narrowest read that pays for itself. It answers null
--   for a person with no credential row, for a person who is not active, and
--   for anyone whose address is already confirmed, so it can state nothing at
--   all about a confirmed account, and the only address it can ever return
--   belongs to the person the caller already holds a verified session for.
-- - platform.user_credentials holds PII and its grants are unchanged: no
--   runtime role gains any grant on it here.
--
-- Verification queries are implemented in
-- supabase/tests/verification_resend.pgtap.sql.

set role migration_owner;

-- PRD-006a D4, widened by one scope. Every value the old check allowed the new
-- one allows.
alter table platform.auth_rate_limits
  drop constraint auth_rate_limits_scope_check;
alter table platform.auth_rate_limits
  add constraint auth_rate_limits_scope_ck check (
    scope in (
      'sign_in_ip', 'sign_up_ip', 'forgot_ip', 'forgot_email', 'reset_ip',
      'verify_ip', 'resend_verification_user'
    )
  );

-- The same function as the previous migration with one scope added to the
-- guard. Everything else, including the fixed-window arithmetic and the
-- opportunistic sweep, is byte-for-byte what it was.
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
      'verify_ip', 'resend_verification_user'
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

-- The same function as the previous migration with one action added to the
-- guard. The subject is still a delivery outcome or a provider message id, and
-- is never the URL token, never the token hash, and never the address the
-- message went to.
create or replace function platform.record_email_delivery(
  user_id uuid,
  action text,
  result text,
  subject_id text,
  correlation_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  audit_location_id uuid;
begin
  if record_email_delivery.user_id is null
    or record_email_delivery.action is null
    or record_email_delivery.result is null
    or record_email_delivery.subject_id is null
    or record_email_delivery.correlation_id is null
    or record_email_delivery.action not in (
      'auth.reset-email', 'auth.verification-email', 'auth.verification-resent'
    )
    or record_email_delivery.result not in ('success', 'failed')
    or pg_catalog.length(record_email_delivery.subject_id) not between 1 and 300
    or pg_catalog.length(record_email_delivery.correlation_id) not between 1 and 200
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  audit_location_id := platform.primary_location_for_user(record_email_delivery.user_id);
  if audit_location_id is null then
    return false;
  end if;

  insert into audit.events (
    location_id, actor_type, actor_id, subject_type, subject_id,
    action, result, correlation_id
  ) values (
    audit_location_id,
    'user',
    record_email_delivery.user_id,
    'email_delivery',
    record_email_delivery.subject_id,
    record_email_delivery.action,
    record_email_delivery.result,
    record_email_delivery.correlation_id
  );
  return true;
end
$function$;

-- PRD-006a D5. The address a confirmation message would go to, and only while
-- sending one is still the right thing to do.
--
-- It is a separate read rather than a column on lookup_password_credential_for_user
-- because the narrow one can answer nothing at all about a confirmed account:
-- every branch that is not "this person is active, has a credential, and has not
-- confirmed yet" returns null, and null is what the caller turns into an
-- already_verified audit row without ever seeing an address.
create function platform.unverified_email_display_for_user(user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select credential.email_display
  from platform.user_credentials as credential
  join platform.app_users as actor
    on actor.id = credential.user_id
   and actor.status = 'active'
  where credential.user_id = unverified_email_display_for_user.user_id
    and credential.email_verified_at is null
$function$;

revoke execute on function platform.unverified_email_display_for_user(uuid) from public;
grant execute on function platform.unverified_email_display_for_user(uuid) to app_runtime;

comment on function platform.unverified_email_display_for_user(uuid) is
  'Security definer read for the shell resend control. Returns the display email address only while the person is active, holds a credential, and has not confirmed the address; null in every other case, so it states nothing about a confirmed account.';

reset role;
