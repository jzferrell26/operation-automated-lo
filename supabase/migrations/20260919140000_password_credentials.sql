-- PRD-006a D1: email and password credentials, single-use credential tokens,
-- and fixed-window rate-limit counters, behind the same security definer trust
-- boundary PRD-005b established for the first-party session store.
--
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- Migration safety:
-- - Additive apart from two widened check constraints and one dropped function,
--   each named below. Three new tables, eleven functions, three policies, and
--   grants on the new objects. No existing table, column, index, policy, or
--   grant is otherwise touched.
-- - Both widened checks are pure widenings: every value the old constraint
--   allowed the new one allows, so no existing row can become invalid and the
--   drop-and-recreate needs no backfill. The recreated constraints carry
--   explicit names rather than the auto-generated ones they replace.
-- - Lock classes: creating the three new tables takes ACCESS EXCLUSIVE on
--   objects that have no rows and no readers. Dropping and recreating the two
--   checks takes ACCESS EXCLUSIVE on platform.first_party_sessions for the
--   duration of one full-table validation; the table is new in the previous
--   migration and holds at most a handful of review rows, so this is the one
--   moment the widening is free. After production use, a later change to these
--   constraints must expand, backfill, switch, and contract instead.
-- - The new foreign keys take ROW SHARE on platform.app_users, which blocks
--   neither reads nor writes.
-- - Every foreign key on a new table carries its own index.
--
-- Trust boundary:
-- - platform.user_credentials, platform.credential_tokens, and
--   platform.auth_rate_limits hold no grant of any kind for app_runtime or
--   support_runtime. Credentials are not tenant data: a person may hold
--   bindings at several locations, so a credential row has no single tenant and
--   must never be reachable through a tenant context. Every access runs through
--   the security definer functions below, which are the whole boundary.
-- - Every function is owned by migration_owner, is security definer with
--   set search_path = '', contains no dynamic SQL, and refuses with errcode
--   42501 and one generic message unless its own comment says otherwise.
-- - No function accepts, returns, or logs a plaintext password. The password
--   hash crosses the boundary in both directions because the derivation runs in
--   Node (PostgreSQL ships no Argon2), and nothing else about the credential
--   does.
--
-- Verification queries are implemented in supabase/tests/password_credentials.pgtap.sql.

set role migration_owner;

-- PRD-006a D1. A password sign-in is neither of the two issuers PRD-005b knew
-- about, and revoking every session after a password change is none of its
-- three revocation reasons. Both constraints are widened, not replaced.
alter table platform.first_party_sessions
  drop constraint first_party_sessions_issued_by_check;
alter table platform.first_party_sessions
  add constraint first_party_sessions_issued_by_ck check (
    issued_by in ('review_sign_in', 'embedded_exchange', 'password_sign_in', 'password_reset')
  );

alter table platform.first_party_sessions
  drop constraint first_party_sessions_revocation_reason_check;
alter table platform.first_party_sessions
  add constraint first_party_sessions_revocation_reason_ck check (
    revocation_reason is null
    or revocation_reason in ('sign_out', 'operator', 'binding_revoked', 'password_changed')
  );

-- platform.issue_first_party_session validates issued_by against its own inline
-- list, so the widened column check alone would still refuse the two new
-- issuers. The function body is replaced with the same body and the widened
-- list; nothing else about it changes.
create or replace function platform.issue_first_party_session(
  location_id uuid,
  user_id uuid,
  binding_role text,
  session_role text,
  session_secret_hash text,
  lifetime_seconds integer,
  issued_by text,
  correlation_id text
)
returns platform.first_party_sessions
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  refused boolean := false;
  resolved_binding_id uuid;
  resolved_installation_id uuid;
  resolved_role_version bigint;
  safe_correlation_id text;
  issued_row platform.first_party_sessions;
begin
  safe_correlation_id := case
    when issue_first_party_session.correlation_id is null then 'session.issuance.denied'
    when pg_catalog.length(issue_first_party_session.correlation_id) between 1 and 200
      then issue_first_party_session.correlation_id
    else pg_catalog.left(issue_first_party_session.correlation_id, 200)
  end;

  if issue_first_party_session.location_id is null
    or issue_first_party_session.user_id is null
    or issue_first_party_session.binding_role is null
    or issue_first_party_session.session_role is null
    or issue_first_party_session.session_secret_hash is null
    or issue_first_party_session.lifetime_seconds is null
    or issue_first_party_session.issued_by is null
    or issue_first_party_session.correlation_id is null
    or issue_first_party_session.session_secret_hash !~ '^[0-9a-f]{64}$'
    or issue_first_party_session.lifetime_seconds not between 1 and 2592000
    or pg_catalog.length(issue_first_party_session.correlation_id) not between 1 and 200
    or issue_first_party_session.issued_by not in (
      'review_sign_in', 'embedded_exchange', 'password_sign_in', 'password_reset'
    )
    or issue_first_party_session.session_role not in (
      'location_admin', 'campaign_creator', 'campaign_approver',
      'campaign_publisher', 'viewer', 'platform_support'
    )
    or not platform.location_is_active(issue_first_party_session.location_id)
    or not platform.actor_is_active(issue_first_party_session.user_id)
  then
    refused := true;
  end if;

  if not refused then
    select binding.id
      into resolved_binding_id
    from platform.role_bindings as binding
    where binding.location_id = issue_first_party_session.location_id
      and binding.user_id = issue_first_party_session.user_id
      and binding.role = issue_first_party_session.binding_role
      and binding.revoked_at is null;
    if resolved_binding_id is null then
      refused := true;
    end if;
  end if;

  if not refused then
    select installation.id
      into resolved_installation_id
    from platform.marketplace_installations as installation
    where installation.location_id = issue_first_party_session.location_id
    order by installation.created_at, installation.id
    limit 1;
    if resolved_installation_id is null then
      refused := true;
    end if;
  end if;

  if refused then
    if issue_first_party_session.user_id is not null
      and exists (
        select 1
        from platform.locations as location_row
        where location_row.id = issue_first_party_session.location_id
      )
    then
      insert into audit.events (
        location_id, actor_type, actor_id, subject_type, subject_id,
        action, result, correlation_id
      ) values (
        issue_first_party_session.location_id,
        'user',
        issue_first_party_session.user_id,
        'first_party_session_request',
        'actor_' || pg_catalog.replace(issue_first_party_session.user_id::text, '-', ''),
        'session.issued',
        'denied',
        safe_correlation_id
      );
    end if;
    raise exception using errcode = '42501',
      message = 'First-party session issuance was refused';
  end if;

  resolved_role_version := platform.current_role_version(
    issue_first_party_session.location_id,
    issue_first_party_session.user_id,
    issue_first_party_session.binding_role
  );

  insert into platform.first_party_sessions (
    session_secret_hash, location_id, user_id, role_binding_id, installation_id,
    session_role, role_version, issued_by, expires_at, correlation_id
  ) values (
    issue_first_party_session.session_secret_hash,
    issue_first_party_session.location_id,
    issue_first_party_session.user_id,
    resolved_binding_id,
    resolved_installation_id,
    issue_first_party_session.session_role,
    resolved_role_version,
    issue_first_party_session.issued_by,
    pg_catalog.now() + pg_catalog.make_interval(
      secs => issue_first_party_session.lifetime_seconds
    ),
    issue_first_party_session.correlation_id
  )
  returning * into issued_row;

  insert into audit.events (
    location_id, actor_type, actor_id, subject_type, subject_id,
    action, result, correlation_id
  ) values (
    issued_row.location_id,
    'user',
    issued_row.user_id,
    'first_party_session',
    'session_' || pg_catalog.replace(issued_row.id::text, '-', ''),
    'session.issued',
    'success',
    issued_row.correlation_id
  );

  return issued_row;
end
$function$;

-- PRD-006a D9. The persona selector this sub-PRD replaces was its only caller.
-- A pre-context definer read with no caller widens the trust boundary for
-- nothing, so it is dropped rather than left in place.
drop function platform.resolve_review_persona(uuid, text);

create table platform.user_credentials (
  user_id uuid primary key references platform.app_users (id) on delete restrict,
  email_normalized text not null unique,
  email_display text not null,
  email_verified_at timestamptz,
  password_hash text not null,
  password_set_at timestamptz not null default pg_catalog.now(),
  password_rotated_at timestamptz,
  failed_attempt_count integer not null default 0 check (failed_attempt_count >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint user_credentials_email_normalized_form_ck check (
    email_normalized = pg_catalog.lower(pg_catalog.btrim(email_normalized))
  ),
  constraint user_credentials_email_normalized_length_ck check (
    pg_catalog.length(email_normalized) between 6 and 254
  ),
  constraint user_credentials_email_normalized_shape_ck check (
    email_normalized ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint user_credentials_email_display_length_ck check (
    pg_catalog.length(email_display) between 6 and 254
  ),
  -- The stored hash is a PHC-style string, so the parameters travel with it and
  -- a later cost increase is a parse away rather than a migration. Argon2id is
  -- what this product writes; the scrypt shape is accepted so a hash written by
  -- an older or a fallback derivation still verifies.
  constraint user_credentials_password_hash_shape_ck check (
    password_hash ~ '^\$argon2id\$v=19\$m=[0-9]{4,7},t=[0-9]{1,3},p=[0-9]{1,3}\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$'
    or password_hash ~ '^\$scrypt\$ln=[0-9]{1,2},r=[0-9]{1,3},p=[0-9]{1,3}\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{86}$'
  )
);

create index user_credentials_locked_until_idx
  on platform.user_credentials (locked_until)
  where locked_until is not null;

create table platform.credential_tokens (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references platform.app_users (id) on delete restrict,
  purpose text not null check (
    purpose in ('password_reset', 'email_verification', 'sign_in_choice')
  ),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  superseded_at timestamptz,
  correlation_id text not null check (pg_catalog.length(correlation_id) between 1 and 200),
  constraint credential_tokens_lifetime_ck check (
    expires_at > issued_at and expires_at <= issued_at + interval '24 hours'
  )
);

create index credential_tokens_redeemable_idx
  on platform.credential_tokens (user_id, purpose, consumed_at, superseded_at);
create index credential_tokens_expires_at_idx on platform.credential_tokens (expires_at);

create table platform.auth_rate_limits (
  scope text not null check (
    scope in ('sign_in_ip', 'sign_up_ip', 'forgot_ip', 'forgot_email', 'reset_ip', 'verify_ip')
  ),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempt_count integer not null check (attempt_count > 0),
  -- Named rather than inferred so the upsert below can target the constraint by
  -- name. An `on conflict (scope, ...)` inference list sits inside a plpgsql
  -- body whose parameters are also called `scope` and `key_hash`, and index
  -- inference is one of the places plpgsql variable substitution would reach.
  constraint auth_rate_limits_pkey primary key (scope, key_hash, window_start)
);

create index auth_rate_limits_window_start_idx on platform.auth_rate_limits (window_start);

alter table platform.user_credentials enable row level security;
alter table platform.user_credentials force row level security;
alter table platform.credential_tokens enable row level security;
alter table platform.credential_tokens force row level security;
alter table platform.auth_rate_limits enable row level security;
alter table platform.auth_rate_limits force row level security;

create policy user_credentials_migration_owner_all on platform.user_credentials
  for all to migration_owner using (true) with check (true);
create policy credential_tokens_migration_owner_all on platform.credential_tokens
  for all to migration_owner using (true) with check (true);
create policy auth_rate_limits_migration_owner_all on platform.auth_rate_limits
  for all to migration_owner using (true) with check (true);

-- The location an account event is audited against. audit.events.location_id is
-- not nullable, so an event about a person needs a location to land on, and the
-- honest one is the workspace they have held longest. A person with no active
-- binding has no such location, and the caller writes no audit row rather than
-- inventing one.
create function platform.primary_location_for_user(user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select binding.location_id
  from platform.role_bindings as binding
  join platform.locations as location_row
    on location_row.id = binding.location_id
   and location_row.status = 'active'
  where binding.user_id = primary_location_for_user.user_id
    and binding.revoked_at is null
  order by binding.granted_at, binding.id
  limit 1
$function$;

-- PRD-006a D5. The sign-in credential read. It never raises: a caller that
-- learns the difference between "no such email" and "refused" learns whether an
-- account exists, which is exactly what sign-in must not disclose. The hash is
-- returned because the derivation runs in Node; PostgreSQL ships no Argon2.
create function platform.lookup_password_credential(email_normalized text)
returns table (
  user_id uuid,
  password_hash text,
  locked_until timestamptz,
  failed_attempt_count integer,
  email_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    credential.user_id,
    credential.password_hash,
    credential.locked_until,
    credential.failed_attempt_count,
    credential.email_verified_at is not null
  from platform.user_credentials as credential
  join platform.app_users as actor
    on actor.id = credential.user_id
   and actor.status = 'active'
  where credential.email_normalized = lookup_password_credential.email_normalized
$function$;

-- PRD-006a D5, the change-password path. The same credential read keyed by the
-- person rather than by the address, because a person changing their password
-- from inside the product has a verified session and has not been asked to
-- retype their email address.
--
-- This is the twelfth application-callable function. D1's twelfth was
-- `describe_first_party_session`, which D1 itself says to drop if PRD-005 Wave
-- 2 has already shipped an equivalent: it has, as
-- `platform.resolve_session_display`, which 006A-AC-028 now reuses. This takes
-- the freed slot, and it takes it for a real need: without it the only way to
-- verify a current password would be to accept an email address from the
-- browser and look the credential up by it, which is a credential oracle even
-- when the result is checked against the session.
--
-- Like `lookup_password_credential` it never raises.
create function platform.lookup_password_credential_for_user(user_id uuid)
returns table (
  user_id uuid,
  password_hash text,
  locked_until timestamptz,
  failed_attempt_count integer,
  email_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    credential.user_id,
    credential.password_hash,
    credential.locked_until,
    credential.failed_attempt_count,
    credential.email_verified_at is not null
  from platform.user_credentials as credential
  join platform.app_users as actor
    on actor.id = credential.user_id
   and actor.status = 'active'
  where credential.user_id = lookup_password_credential_for_user.user_id
$function$;

-- PRD-006a D5. The closed list of workspaces a signed-in person may choose
-- between. The browser never names a location; it picks an entry from this.
create function platform.list_sign_in_bindings(user_id uuid)
returns table (location_id uuid, location_display_name text, binding_role text)
language sql
stable
security definer
set search_path = ''
as $function$
  select binding.location_id, location_row.display_name, binding.role
  from platform.role_bindings as binding
  join platform.locations as location_row
    on location_row.id = binding.location_id
   and location_row.status = 'active'
  join platform.app_users as actor
    on actor.id = binding.user_id
   and actor.status = 'active'
  where binding.user_id = list_sign_in_bindings.user_id
    and binding.revoked_at is null
  order by binding.granted_at, binding.id
$function$;

-- PRD-006a D4. Ten consecutive failures lock the account for fifteen minutes.
-- The lockout row is written once, on the transition, so a caller cannot read
-- the count back out of the audit trail.
create function platform.record_password_sign_in_failure(user_id uuid, correlation_id text)
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
begin
  if record_password_sign_in_failure.user_id is null
    or record_password_sign_in_failure.correlation_id is null
    or pg_catalog.length(record_password_sign_in_failure.correlation_id) not between 1 and 200
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
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

-- PRD-006a D5. Clears the counter and the lock and records the success. The
-- session itself is issued by platform.issue_first_party_session afterwards,
-- which writes session.issued.
create function platform.record_password_sign_in_success(user_id uuid, correlation_id text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  audit_location_id uuid;
begin
  if record_password_sign_in_success.user_id is null
    or record_password_sign_in_success.correlation_id is null
    or pg_catalog.length(record_password_sign_in_success.correlation_id) not between 1 and 200
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  update platform.user_credentials as credential
  set failed_attempt_count = 0,
      locked_until = null,
      updated_at = pg_catalog.now()
  where credential.user_id = record_password_sign_in_success.user_id;

  if not found then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  audit_location_id := platform.primary_location_for_user(
    record_password_sign_in_success.user_id
  );
  if audit_location_id is not null then
    insert into audit.events (
      location_id, actor_type, actor_id, subject_type, subject_id,
      action, result, correlation_id
    ) values (
      audit_location_id,
      'user',
      record_password_sign_in_success.user_id,
      'app_user',
      'actor_' || pg_catalog.replace(record_password_sign_in_success.user_id::text, '-', ''),
      'auth.sign-in',
      'success',
      record_password_sign_in_success.correlation_id
    );
  end if;
end
$function$;

-- PRD-006a D1. Issuing a token supersedes every live token of the same person
-- and purpose, so a second "forgot password" click invalidates the first link
-- rather than leaving two usable ones. Only the SHA-256 hash of the URL token
-- crosses this boundary; the token itself never reaches the database.
create function platform.issue_credential_token(
  user_id uuid,
  purpose text,
  token_hash text,
  lifetime_seconds integer,
  correlation_id text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  issued_id uuid;
  audit_location_id uuid;
  audit_action text;
begin
  if issue_credential_token.user_id is null
    or issue_credential_token.purpose is null
    or issue_credential_token.token_hash is null
    or issue_credential_token.lifetime_seconds is null
    or issue_credential_token.correlation_id is null
    or issue_credential_token.purpose not in (
      'password_reset', 'email_verification', 'sign_in_choice'
    )
    or issue_credential_token.token_hash !~ '^[0-9a-f]{64}$'
    or issue_credential_token.lifetime_seconds not between 1 and 86400
    or pg_catalog.length(issue_credential_token.correlation_id) not between 1 and 200
    or not platform.actor_is_active(issue_credential_token.user_id)
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  update platform.credential_tokens as token_row
  set superseded_at = pg_catalog.now()
  where token_row.user_id = issue_credential_token.user_id
    and token_row.purpose = issue_credential_token.purpose
    and token_row.consumed_at is null
    and token_row.superseded_at is null;

  insert into platform.credential_tokens (
    user_id, purpose, token_hash, expires_at, correlation_id
  ) values (
    issue_credential_token.user_id,
    issue_credential_token.purpose,
    issue_credential_token.token_hash,
    pg_catalog.now() + pg_catalog.make_interval(
      secs => issue_credential_token.lifetime_seconds
    ),
    issue_credential_token.correlation_id
  )
  returning id into issued_id;

  -- A sign-in choice token is part of one sign-in, and that sign-in already
  -- writes auth.sign-in and session.issued. A third row would count the same
  -- event twice.
  audit_action := case issue_credential_token.purpose
    when 'password_reset' then 'auth.reset-requested'
    when 'email_verification' then 'auth.verification-requested'
    else null
  end;
  if audit_action is not null then
    audit_location_id := platform.primary_location_for_user(issue_credential_token.user_id);
    if audit_location_id is not null then
      insert into audit.events (
        location_id, actor_type, actor_id, subject_type, subject_id,
        action, result, correlation_id
      ) values (
        audit_location_id,
        'user',
        issue_credential_token.user_id,
        'credential_token',
        'credential_token_' || pg_catalog.replace(issued_id::text, '-', ''),
        audit_action,
        'success',
        issue_credential_token.correlation_id
      );
    end if;
  end if;

  return issued_id;
end
$function$;

-- PRD-006a D1. One atomic update is the whole consume. Two concurrent calls
-- serialise on the row, and the loser sees consumed_at already set and matches
-- nothing, so exactly one wins. No row means refused, and refused is one answer
-- whatever the reason: expired, consumed, superseded, wrong purpose, unknown.
create function platform.consume_credential_token(token_hash text, purpose text)
returns table (user_id uuid, token_id uuid)
language sql
volatile
security definer
set search_path = ''
as $function$
  update platform.credential_tokens as token_row
  set consumed_at = pg_catalog.now()
  where token_row.token_hash = consume_credential_token.token_hash
    and token_row.purpose = consume_credential_token.purpose
    and token_row.consumed_at is null
    and token_row.superseded_at is null
    and token_row.expires_at > pg_catalog.now()
  returning token_row.user_id, token_row.id
$function$;

-- PRD-006a D1. The bulk revoke a password change performs, also callable on its
-- own. It moves rows through the same two columns the mutation trigger allows
-- and writes one session.revoked per row, exactly as
-- platform.revoke_first_party_session does for a single session.
create function platform.revoke_all_first_party_sessions_for_user(
  user_id uuid,
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
  revoked_row platform.first_party_sessions;
  revoked_count integer := 0;
begin
  if revoke_all_first_party_sessions_for_user.user_id is null
    or revoke_all_first_party_sessions_for_user.reason is null
    or revoke_all_first_party_sessions_for_user.reason not in (
      'sign_out', 'operator', 'binding_revoked', 'password_changed'
    )
    or revoke_all_first_party_sessions_for_user.correlation_id is null
    or pg_catalog.length(
      revoke_all_first_party_sessions_for_user.correlation_id
    ) not between 1 and 200
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  for revoked_row in
    update platform.first_party_sessions as session_row
    set revoked_at = pg_catalog.now(),
        revocation_reason = revoke_all_first_party_sessions_for_user.reason
    where session_row.user_id = revoke_all_first_party_sessions_for_user.user_id
      and session_row.revoked_at is null
      and (
        revoke_all_first_party_sessions_for_user.keep_session_id is null
        or session_row.id <> revoke_all_first_party_sessions_for_user.keep_session_id
      )
    returning session_row.*
  loop
    revoked_count := revoked_count + 1;
    insert into audit.events (
      location_id, actor_type, actor_id, subject_type, subject_id,
      action, result, correlation_id
    ) values (
      revoked_row.location_id,
      'user',
      revoked_row.user_id,
      'first_party_session',
      'session_' || pg_catalog.replace(revoked_row.id::text, '-', ''),
      'session.revoked',
      'success',
      revoke_all_first_party_sessions_for_user.correlation_id
    );
  end loop;

  return revoked_count;
end
$function$;

-- PRD-006a D1. Setting a password revokes every other session the person holds.
-- A reset revokes all of them; a change from inside the product keeps the
-- session doing the changing, so the person is not signed out of the page they
-- are standing on. password_rotated_at stays null for the first password,
-- because nothing was rotated.
create function platform.set_password(
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
    ), (
      audit_location_id,
      'user',
      set_password.user_id,
      'app_user',
      'actor_' || pg_catalog.replace(set_password.user_id::text, '-', ''),
      'auth.password-changed',
      'success',
      set_password.correlation_id
    );
  end if;

  return revoked_count;
end
$function$;

-- PRD-006a D5. Self-serve account creation, in one transaction: the person, the
-- workspace, the pending installation that records nothing is installed on it,
-- the workspace-owner binding, and the credential.
--
-- A duplicate email is the one refusal this boundary lets a caller distinguish,
-- and it does so by letting the unique violation through as 23505. D5 gives the
-- reason: a sign-up that pretends to succeed leaves a real person with no
-- account and no explanation. Every other refusal is the same 42501.
create function platform.register_password_account(
  email_normalized text,
  email_display text,
  password_hash text,
  display_name text,
  location_display_name text,
  correlation_id text
)
returns table (user_id uuid, location_id uuid, installation_id uuid, binding_id uuid)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  new_user_id uuid;
  new_location_id uuid;
  new_installation_id uuid;
  new_binding_id uuid;
begin
  if register_password_account.email_normalized is null
    or register_password_account.email_display is null
    or register_password_account.password_hash is null
    or register_password_account.display_name is null
    or register_password_account.location_display_name is null
    or register_password_account.correlation_id is null
    or register_password_account.email_normalized <> pg_catalog.lower(
      pg_catalog.btrim(register_password_account.email_normalized)
    )
    or pg_catalog.length(register_password_account.email_normalized) not between 6 and 254
    or register_password_account.email_normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or pg_catalog.length(register_password_account.email_display) not between 6 and 254
    or pg_catalog.length(register_password_account.display_name) not between 1 and 200
    or pg_catalog.length(register_password_account.location_display_name) not between 1 and 200
    or pg_catalog.length(register_password_account.correlation_id) not between 1 and 200
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  insert into platform.app_users (safe_display_name, status)
  values (register_password_account.display_name, 'active')
  returning id into new_user_id;

  insert into platform.locations (display_name, status)
  values (register_password_account.location_display_name, 'active')
  returning id into new_location_id;

  insert into platform.marketplace_installations (
    location_id, marketplace_app_id, external_install_id, status
  ) values (new_location_id, 'oalo-self-serve', null, 'pending')
  returning id into new_installation_id;

  insert into platform.role_bindings (location_id, user_id, role)
  values (new_location_id, new_user_id, 'location_admin')
  returning id into new_binding_id;

  insert into platform.user_credentials (
    user_id, email_normalized, email_display, password_hash
  ) values (
    new_user_id,
    register_password_account.email_normalized,
    register_password_account.email_display,
    register_password_account.password_hash
  );

  insert into audit.events (
    location_id, actor_type, actor_id, subject_type, subject_id,
    action, result, correlation_id
  ) values (
    new_location_id,
    'user',
    new_user_id,
    'app_user',
    'actor_' || pg_catalog.replace(new_user_id::text, '-', ''),
    'auth.sign-up',
    'success',
    register_password_account.correlation_id
  );

  return query select new_user_id, new_location_id, new_installation_id, new_binding_id;
end
$function$;

-- PRD-006a D5. Confirming an email is idempotent: the second click on the same
-- link changes nothing and says so, rather than failing at a person who did
-- exactly what the email asked.
create function platform.mark_email_verified(user_id uuid, correlation_id text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  audit_location_id uuid;
begin
  if mark_email_verified.user_id is null
    or mark_email_verified.correlation_id is null
    or pg_catalog.length(mark_email_verified.correlation_id) not between 1 and 200
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  update platform.user_credentials as credential
  set email_verified_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where credential.user_id = mark_email_verified.user_id
    and credential.email_verified_at is null;

  if not found then
    return false;
  end if;

  audit_location_id := platform.primary_location_for_user(mark_email_verified.user_id);
  if audit_location_id is not null then
    insert into audit.events (
      location_id, actor_type, actor_id, subject_type, subject_id,
      action, result, correlation_id
    ) values (
      audit_location_id,
      'user',
      mark_email_verified.user_id,
      'app_user',
      'actor_' || pg_catalog.replace(mark_email_verified.user_id::text, '-', ''),
      'auth.email-verified',
      'success',
      mark_email_verified.correlation_id
    );
  end if;
  return true;
end
$function$;

-- PRD-006a D1 and 006A-AC-017. The audit row an email send leaves behind.
--
-- D1's function table does not list this one, and D1's audit-action table
-- requires it: `auth.reset-email` and `auth.verification-email` with a subject
-- of `not_configured`, `provider_error`, or the provider's message id are
-- exactly the rows 006A-AC-017 counts, and no other function in this migration
-- can write them, because the send outcome is not known until after the token
-- has been issued and the provider has answered. It is therefore added here,
-- with the narrowest shape that pays that debt: two actions, two results, and
-- no free-form action string.
--
-- The subject is a delivery outcome or a provider message id. It is never the
-- URL token, never the token hash, and never the address the message went to.
create function platform.record_email_delivery(
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
    or record_email_delivery.action not in ('auth.reset-email', 'auth.verification-email')
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

-- PRD-006a D4. A fixed-window counter keyed by a keyed hash of the client
-- address or the email, never by either value itself. Rotating the server
-- secret the caller keys with only resets the windows.
--
-- The opportunistic delete is bounded by the expression index on window_start
-- and runs on the same statement path as the upsert, so the table cannot grow
-- without an eviction.
create function platform.consume_auth_rate_limit(
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
      'sign_in_ip', 'sign_up_ip', 'forgot_ip', 'forgot_email', 'reset_ip', 'verify_ip'
    )
    or consume_auth_rate_limit.key_hash !~ '^[0-9a-f]{64}$'
    or consume_auth_rate_limit.attempt_limit not between 1 and 100000
    or consume_auth_rate_limit.window_seconds not between 1 and 86400
  then
    raise exception using errcode = '42501', message = 'The credential operation was refused';
  end if;

  -- Integer division, so the window a counter is keyed on is an exact value and
  -- two calls inside the same window can never disagree about it by a rounding
  -- step. `floor` runs before the cast because `date_part` answers in double
  -- precision.
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

  -- The sweep runs after the upsert and is measured from the window this call
  -- just wrote, not from the wall clock, so the counter this call is about to
  -- answer with can never be the row it deletes.
  delete from platform.auth_rate_limits as stale
  where stale.window_start < current_window - interval '24 hours';

  return current_count <= consume_auth_rate_limit.attempt_limit;
end
$function$;

revoke execute on function platform.primary_location_for_user(uuid) from public;
revoke execute on function platform.lookup_password_credential(text) from public;
revoke execute on function platform.lookup_password_credential_for_user(uuid) from public;
revoke execute on function platform.list_sign_in_bindings(uuid) from public;
revoke execute on function platform.record_password_sign_in_failure(uuid, text) from public;
revoke execute on function platform.record_password_sign_in_success(uuid, text) from public;
revoke execute on function platform.issue_credential_token(uuid, text, text, integer, text)
  from public;
revoke execute on function platform.consume_credential_token(text, text) from public;
revoke execute on function platform.revoke_all_first_party_sessions_for_user(
  uuid, text, text, uuid
) from public;
revoke execute on function platform.set_password(uuid, text, text, text, uuid) from public;
revoke execute on function platform.register_password_account(
  text, text, text, text, text, text
) from public;
revoke execute on function platform.mark_email_verified(uuid, text) from public;
revoke execute on function platform.record_email_delivery(uuid, text, text, text, text)
  from public;
revoke execute on function platform.consume_auth_rate_limit(text, text, integer, integer)
  from public;

-- platform.primary_location_for_user is deliberately absent from the grants
-- below. It is called only from inside the definer bodies in this migration,
-- which run as migration_owner and therefore need no grant, and nothing in the
-- application calls it. Granting it would widen the context-free path for a
-- helper no caller needs.
grant execute on function platform.lookup_password_credential(text) to app_runtime;
grant execute on function platform.lookup_password_credential_for_user(uuid) to app_runtime;
grant execute on function platform.list_sign_in_bindings(uuid) to app_runtime;
grant execute on function platform.record_password_sign_in_failure(uuid, text) to app_runtime;
grant execute on function platform.record_password_sign_in_success(uuid, text) to app_runtime;
grant execute on function platform.issue_credential_token(uuid, text, text, integer, text)
  to app_runtime;
grant execute on function platform.consume_credential_token(text, text) to app_runtime;
grant execute on function platform.revoke_all_first_party_sessions_for_user(
  uuid, text, text, uuid
) to app_runtime;
grant execute on function platform.set_password(uuid, text, text, text, uuid) to app_runtime;
grant execute on function platform.register_password_account(
  text, text, text, text, text, text
) to app_runtime;
grant execute on function platform.mark_email_verified(uuid, text) to app_runtime;
grant execute on function platform.record_email_delivery(uuid, text, text, text, text)
  to app_runtime;
grant execute on function platform.consume_auth_rate_limit(text, text, integer, integer)
  to app_runtime;

comment on table platform.user_credentials is
  'Per-person email address and password hash. Holds PII (email addresses): the retention, deletion, and export runbooks must name this table. No runtime role holds any grant on it; every access runs through the security definer functions in this migration. Never store a plaintext password here.';
comment on table platform.credential_tokens is
  'Single-use password-reset, email-verification, and sign-in-choice tokens, stored only as SHA-256 hashes. Holds PII by association (it names a person): the retention, deletion, and export runbooks must name this table. No runtime role holds any grant on it.';
comment on table platform.auth_rate_limits is
  'Fixed-window counters keyed by a keyed hash of a client address or an email address. Holds no address and no email address, so rotating the keying secret discards the windows and nothing else. No runtime role holds any grant on it.';
comment on function platform.register_password_account(text, text, text, text, text, text) is
  'Security definer trust boundary for self-serve account creation. A duplicate email address surfaces as 23505 on purpose (PRD-006a D5); every other refusal is 42501 with one generic message.';

reset role;
