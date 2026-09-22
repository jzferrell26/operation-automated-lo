-- PRD-005b D4 and PRD-006a D5: cross-check the application role against the
-- binding role at issuance.
--
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- The gap this closes: platform.issue_first_party_session validated
-- session_role against the six-value application enum and looked up an active
-- binding for binding_role, but never asserted that the two describe the same
-- authority. A caller holding an active analyst binding could name
-- 'location_admin' as the session role and be issued a session that says so,
-- because each half passed its own check in isolation. The refusal now lives
-- inside the definer boundary rather than only in the Node caller that derives
-- the pair.
--
-- The mapping mirrors packages/auth/src/role-binding-map.ts exactly, including
-- its two deliberate gaps: 'realtor_collaborator' maps to no session role, and
-- 'platform_support' is backed by no binding. Both surface here as a null on
-- one side of the comparison, which `is distinct from` treats as a mismatch, so
-- neither can become a session through this function.
--
-- Migration safety:
-- - One create or replace of an existing function. No table, column, index,
--   policy, or grant is touched. create or replace preserves the function's
--   owner and its privileges, so the revoke from public and the grant to
--   app_runtime that 20260919120000_first_party_sessions.sql established carry
--   over unchanged, exactly as they did through the replacement in
--   20260919140000_password_credentials.sql. Nothing is re-granted here.
-- - Lock class: ACCESS EXCLUSIVE on the function's own catalog row for the
--   duration of the replacement. No table lock is taken and no row is read or
--   written, so there is no backfill and nothing to roll forward.
-- - The body is otherwise identical to the one
--   20260919140000_password_credentials.sql installed, including the empty
--   search_path, the generic 42501 refusal, and the denied audit row that the
--   raise takes down with it.
--
-- Behaviour change: a caller that names a binding role and a session role the
-- map does not pair is refused with the same errcode 42501 and the same generic
-- message every other refusal already carries, so no caller learns that this
-- check is the one that failed and no caller has to handle a new class of
-- error. Every production caller derives session_role from binding_role through
-- applicationRoleForDatabaseRole before it calls this function, so no
-- legitimate issuance changes.
--
-- Verification queries are implemented in
-- supabase/tests/first_party_sessions.pgtap.sql.

set role migration_owner;

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
    -- The cross-check. packages/auth/src/role-binding-map.ts is the one place
    -- this pairing is written in TypeScript, and this CASE is its mirror. A binding
    -- role the map leaves unmapped yields null, and `is distinct from` makes
    -- that a mismatch rather than a null the whole condition swallows.
    -- The parentheses matter: PL/pgSQL reads an if condition up to the first
    -- THEN at parenthesis depth zero, so a bare CASE here would end the condition.
    or issue_first_party_session.session_role is distinct from (case
        issue_first_party_session.binding_role
        when 'location_admin' then 'location_admin'
        when 'creator' then 'campaign_creator'
        when 'approver' then 'campaign_approver'
        when 'publisher' then 'campaign_publisher'
        when 'analyst' then 'viewer'
        else null
      end)
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

comment on function platform.issue_first_party_session(
  uuid, uuid, text, text, text, integer, text, text
) is
  'Security definer trust boundary for session issuance. Refuses with errcode 42501 and one generic message so no caller learns which check failed. The session role must be the one packages/auth/src/role-binding-map.ts pairs with the binding role.';

reset role;
