-- PRD-006a D3 and D5. The two security definer reads the password policy needs
-- so its personal-fragment rule can run at change-password and at reset, not
-- only at sign-up.
--
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- Why this exists:
--
-- D3 says the one policy module runs at sign-up, at reset, at change, and in
-- the seeding script. The module did run in all four places, but only sign-up
-- passed it a PasswordPolicyContext, so only sign-up could refuse a password
-- containing the person's own name or the local part of their own address. The
-- same password was accepted at change-password and at reset. The reason was
-- the same in both places and it was a missing read, not a missing check:
--
-- 1. change-password holds a verified session and a credential row, and the
--    credential row carries neither the address nor the name. Nothing on the
--    credential boundary returned them for a known person.
-- 2. reset holds a token and nothing else. D5 requires a policy failure to
--    leave the token unconsumed, so the identity has to be known before
--    platform.consume_credential_token runs, and consuming was the only way to
--    learn who the token belonged to.
--
-- Each of the two reads below answers exactly one of those, and nothing else.
--
-- Migration safety:
-- - Purely additive. Two new functions and their grants. No table, column,
--   index, policy, constraint, grant, or existing function is altered or
--   dropped, so there is nothing to back fill and no existing row can become
--   invalid.
-- - Lock class: create function takes no lock on any table. Both statements are
--   instant on any table size.
-- - Roll forward by a later migration. A destructive down migration is allowed
--   only on an unlinked local database before any durable data exists.
--
-- Trust boundary:
-- - Both are owned by migration_owner, are security definer with
--   set search_path = '', are one select statement with no branching and no
--   dynamic SQL, and are granted to app_runtime alone, exactly like the twelve
--   reads beside them. support_runtime gains nothing.
-- - Neither widens what a caller can learn beyond what the caller already
--   holds. password_policy_identity_for_user is keyed on a person the caller
--   has a verified session for, so the address it can return is that session's
--   own. password_policy_identity_for_reset_token is keyed on the hash of a
--   live reset token, which is the same key platform.consume_credential_token
--   takes and which already redeems into a signed-in session, so anybody who
--   can call it successfully could already set that person's password.
-- - The reset read is strictly narrower than the consume it precedes: same key,
--   same four liveness guards, and it writes nothing.
-- - Both answer zero rows rather than raising for every input they refuse, so
--   neither can be used to tell a refusal apart from an unknown person.
--
-- Verification queries are implemented in
-- supabase/tests/password_policy_identity.pgtap.sql.

set role migration_owner;

-- The address and the name the password policy compares a new password
-- against, for a person the caller already holds a verified session for.
--
-- Active people with a credential row only: a suspended person and a person
-- with no credential both yield nothing, which is the same answer the callers
-- already treat as "no context available" and evaluate the length and denylist
-- rules alone against.
create function platform.password_policy_identity_for_user(user_id uuid)
returns table (email_display text, display_name text)
language sql
stable
security definer
set search_path = ''
as $function$
  select credential.email_display, actor.safe_display_name
  from platform.user_credentials as credential
  join platform.app_users as actor
    on actor.id = credential.user_id
   and actor.status = 'active'
  where credential.user_id = password_policy_identity_for_user.user_id
$function$;

-- The same two values for the person a live password-reset token belongs to,
-- without consuming the token.
--
-- The four liveness guards are byte-for-byte the ones
-- platform.consume_credential_token applies, so a token this read answers for
-- is exactly a token that consume would redeem, and a token it refuses is
-- exactly a token consume would refuse. Purpose is fixed at 'password_reset'
-- rather than taken as an argument: an email_verification or sign_in_choice
-- token must never reach this read at all.
create function platform.password_policy_identity_for_reset_token(token_hash text)
returns table (email_display text, display_name text)
language sql
stable
security definer
set search_path = ''
as $function$
  select credential.email_display, actor.safe_display_name
  from platform.credential_tokens as token_row
  join platform.user_credentials as credential
    on credential.user_id = token_row.user_id
  join platform.app_users as actor
    on actor.id = token_row.user_id
   and actor.status = 'active'
  where token_row.token_hash = password_policy_identity_for_reset_token.token_hash
    and password_policy_identity_for_reset_token.token_hash ~ '^[0-9a-f]{64}$'
    and token_row.purpose = 'password_reset'
    and token_row.consumed_at is null
    and token_row.superseded_at is null
    and token_row.expires_at > pg_catalog.now()
$function$;

revoke execute on function platform.password_policy_identity_for_user(uuid) from public;
grant execute on function platform.password_policy_identity_for_user(uuid) to app_runtime;

revoke execute on function platform.password_policy_identity_for_reset_token(text) from public;
grant execute on function platform.password_policy_identity_for_reset_token(text) to app_runtime;

comment on function platform.password_policy_identity_for_user(uuid) is
  'Security definer read for the password policy at change-password. Returns the display address and safe display name of an active person who holds a credential row, keyed on a person the caller already holds a verified session for; no rows in every other case.';

comment on function platform.password_policy_identity_for_reset_token(text) is
  'Security definer read for the password policy at reset. Returns the display address and safe display name of the person a live password-reset token belongs to, under the same liveness guards platform.consume_credential_token applies, without consuming the token; no rows in every other case.';

reset role;
