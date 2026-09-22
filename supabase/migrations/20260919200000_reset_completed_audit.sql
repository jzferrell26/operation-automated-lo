-- PRD-006a D1, D4, 006A-AC-014, 006A-AC-018 and 006A-AC-031: the reset-completed
-- audit row, and the lock that a locked-out caller can no longer extend.
--
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- What this changes, and why each piece exists:
--
-- 1. platform.set_password chooses its completion action from the reason it was
--    already given. D1's audit inventory (sub-PRD line 151) names
--    auth.reset-completed alongside auth.password-changed, and 006A-AC-018 asks
--    for it by name, but no code path wrote it: a completed reset and a
--    password change made from inside the product left byte-identical audit
--    trails, so an operator reading the trail could not tell somebody who had
--    proved control of an inbox from somebody who had typed their current
--    password. The reason argument already carries that distinction and the
--    correlation reference is already in scope, so the function that knows is
--    the function that writes. reason 'reset' now writes auth.reset-completed,
--    reason 'change' writes auth.password-changed exactly as before, and reason
--    'initial' writes neither: nothing was reset and nothing was changed when a
--    first password is set, and a password-changed row there was the inventory
--    being used as a catch-all rather than as a vocabulary.
--
-- 2. platform.record_password_sign_in_failure leaves an account alone while its
--    lock is open. D4 gives the lockout a fixed fifteen minutes, but the
--    counter update refreshed locked_until on every failure past the tenth, so
--    anybody who kept posting to a known address kept that address locked for
--    as long as they cared to keep posting: a denial of service that costs the
--    attacker one request every fifteen minutes and needs no password at all.
--    An attempt made while the lock is open now writes the same denied row and
--    changes nothing else, so the lock still expires when it was always going
--    to expire and a new count begins only once it has.
--
--    The counter and locked_until are writable only through this definer, so
--    this is the layer that owns the rule; the route keeps its own generic
--    refusal above it (apps/web/src/server/password-authentication-handler.ts).
--
-- Migration safety:
-- - Two replaced function bodies and nothing else. No table, column, index,
--   constraint, policy, grant, ownership, signature, or search_path changes, so
--   create or replace carries every one of them forward untouched.
-- - Additive in the audit trail: one action that D1 already names starts being
--   written. No existing row changes and no backfill is needed. Audit rows
--   written before this migration keep the action they were written with, which
--   is the point of an append-only trail.
-- - Lock class: create or replace takes ACCESS EXCLUSIVE on the two functions
--   only, for the length of the catalog update. No table is touched.
-- - Roll forward by a later migration. A destructive down migration is allowed
--   only on an unlinked local database before any durable data exists.
--
-- Trust boundary:
-- - Both functions stay owned by migration_owner, stay security definer with
--   set search_path = '', contain no dynamic SQL, and keep the grants the
--   original migration gave them: execute to app_runtime, revoked from public.
-- - Neither function's refusal shape changes. Every guard still raises 42501
--   with the one generic message, so no caller learns anything new about an
--   account from a refusal.
-- - No password, hash, token, address, or email value is written to an audit
--   row here. The subject stays the canonical actor_<hex> reference.
--
-- Verification queries are implemented in
-- supabase/tests/password_credentials.pgtap.sql.

set role migration_owner;

-- The same function as 20260919140000_password_credentials.sql with the
-- completion action chosen from the reason. The guard, the credential update,
-- the revoke call, the sessions-revoked row, and the return value are
-- byte-for-byte what they were.
create or replace function platform.set_password(
  user_id uuid,
  password_hash text,
  reason text,
  correlation_id text,
  keep_session_id uuid default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  revoked_count integer;
  audit_location_id uuid;
  completion_action text;
begin
  if set_password.user_id is null
    or set_password.password_hash is null
    or set_password.reason is null
    or set_password.reason not in ('initial', 'reset', 'change')
    or set_password.correlation_id is null
    or pg_catalog.length(set_password.correlation_id) not between 1 and 200
    or not platform.actor_is_active(set_password.user_id)
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  update platform.user_credentials as credential
  set password_hash = set_password.password_hash,
      password_set_at = pg_catalog.now(),
      password_rotated_at = case
        when set_password.reason = 'initial' then credential.password_rotated_at
        else pg_catalog.now()
      end,
      failed_attempt_count = 0,
      locked_until = null,
      updated_at = pg_catalog.now()
  where credential.user_id = set_password.user_id;

  if not found then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  revoked_count := platform.revoke_all_first_party_sessions_for_user(
    set_password.user_id,
    'password_changed',
    set_password.correlation_id,
    set_password.keep_session_id
  );

  -- One action per reason, from D1's inventory. The case expression is wrapped
  -- because a bare case in this position reads to plpgsql as far as its first
  -- then, and the parentheses are what keep the whole expression the value of
  -- the assignment.
  completion_action := (
    case set_password.reason
      when 'reset' then 'auth.reset-completed'
      when 'change' then 'auth.password-changed'
      else null
    end
  );

  audit_location_id := platform.primary_location_for_user(set_password.user_id);
  if audit_location_id is not null then
    insert into audit.events (
      location_id, actor_type, actor_id, subject_type, subject_id,
      action, result, correlation_id
    ) values (
      audit_location_id,
      'user',
      set_password.user_id,
      'app_user',
      'actor_' || pg_catalog.replace(set_password.user_id::text, '-', ''),
      'auth.sessions-revoked',
      'success',
      set_password.correlation_id
    );

    if completion_action is not null then
      insert into audit.events (
        location_id, actor_type, actor_id, subject_type, subject_id,
        action, result, correlation_id
      ) values (
        audit_location_id,
        'user',
        set_password.user_id,
        'app_user',
        'actor_' || pg_catalog.replace(set_password.user_id::text, '-', ''),
        completion_action,
        'success',
        set_password.correlation_id
      );
    end if;
  end if;

  return revoked_count;
end
$function$;

comment on function platform.set_password(uuid, text, text, text, uuid) is
  'Sets a password and revokes the person''s other sessions. Writes auth.reset-completed for reason reset, auth.password-changed for reason change, and no completion row for reason initial, which is D1''s audit vocabulary rather than one row for every reason.';

-- The same function as 20260919140000_password_credentials.sql with one branch
-- added: while the lock is open the attempt is recorded and nothing is
-- counted. The guard, the increment arithmetic, the fifteen-minute window, the
-- once-only lockout row, and the return shape are byte-for-byte what they were.
create or replace function platform.record_password_sign_in_failure(
  user_id uuid,
  correlation_id text
)
returns table (locked_until timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  updated_row platform.user_credentials;
  audit_location_id uuid;
  newly_locked boolean := false;
  open_lock timestamptz;
begin
  if record_password_sign_in_failure.user_id is null
    or record_password_sign_in_failure.correlation_id is null
    or pg_catalog.length(record_password_sign_in_failure.correlation_id) not between 1 and 200
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  -- D4 gives the lockout a fixed fifteen minutes from the tenth failure. An
  -- attempt made inside that window is refused on its way in, so counting it
  -- would only let whoever is making it choose when the window ends.
  select credential.locked_until into open_lock
  from platform.user_credentials as credential
  where credential.user_id = record_password_sign_in_failure.user_id
    and credential.locked_until is not null
    and credential.locked_until > pg_catalog.now()
  for update;

  if open_lock is not null then
    audit_location_id := platform.primary_location_for_user(
      record_password_sign_in_failure.user_id
    );
    if audit_location_id is not null then
      insert into audit.events (
        location_id, actor_type, actor_id, subject_type, subject_id,
        action, result, correlation_id
      ) values (
        audit_location_id,
        'user',
        record_password_sign_in_failure.user_id,
        'app_user',
        'actor_' || pg_catalog.replace(record_password_sign_in_failure.user_id::text, '-', ''),
        'auth.sign-in',
        'denied',
        record_password_sign_in_failure.correlation_id
      );
    end if;
    return query select open_lock;
    return;
  end if;

  update platform.user_credentials as credential
  set failed_attempt_count = credential.failed_attempt_count + 1,
      locked_until = case
        when credential.failed_attempt_count + 1 >= 10
          then pg_catalog.now() + interval '15 minutes'
        else credential.locked_until
      end,
      updated_at = pg_catalog.now()
  where credential.user_id = record_password_sign_in_failure.user_id
  returning credential.* into updated_row;

  if not found then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  newly_locked := updated_row.failed_attempt_count = 10;
  audit_location_id := platform.primary_location_for_user(
    record_password_sign_in_failure.user_id
  );

  if audit_location_id is not null then
    insert into audit.events (
      location_id, actor_type, actor_id, subject_type, subject_id,
      action, result, correlation_id
    ) values (
      audit_location_id,
      'user',
      record_password_sign_in_failure.user_id,
      'app_user',
      'actor_' || pg_catalog.replace(record_password_sign_in_failure.user_id::text, '-', ''),
      'auth.sign-in',
      'denied',
      record_password_sign_in_failure.correlation_id
    );
    if newly_locked then
      insert into audit.events (
        location_id, actor_type, actor_id, subject_type, subject_id,
        action, result, correlation_id
      ) values (
        audit_location_id,
        'user',
        record_password_sign_in_failure.user_id,
        'app_user',
        'actor_' || pg_catalog.replace(record_password_sign_in_failure.user_id::text, '-', ''),
        'auth.lockout',
        'success',
        record_password_sign_in_failure.correlation_id
      );
    end if;
  end if;

  return query select updated_row.locked_until;
end
$function$;

comment on function platform.record_password_sign_in_failure(uuid, text) is
  'Records one refused sign-in. Past the tenth consecutive failure the account locks for fifteen minutes; attempts made while that lock is open are recorded and counted against nothing, so no caller can hold an account locked by repeating them.';

reset role;
