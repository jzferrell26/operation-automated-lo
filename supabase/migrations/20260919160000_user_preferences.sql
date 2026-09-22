-- PRD-006c D4: per-user, per-location preferences, holding the guided setup's
-- progress and the small profile its first steps collect.
--
-- Target: PostgreSQL 17 through the local Supabase 2.109.1 contract.
--
-- Migration safety:
-- - Additive only. One new table, one new index, three new policies, three new
--   grants. No existing table, column, index, policy, grant, or function is
--   touched, so nothing already deployed changes behaviour.
-- - Lock classes: creating the table takes ACCESS EXCLUSIVE on an object that
--   has no rows and no readers. The two foreign keys take ROW SHARE on
--   platform.locations and platform.app_users, which blocks neither reads nor
--   writes on either.
-- - Both foreign keys carry an index. location_id leads the primary key, so the
--   primary key's implicit index serves it; user_id gets its own.
-- - Roll forward by a later migration. A destructive down migration is allowed
--   only on an unlinked local database before any durable data exists.
--
-- Trust boundary:
-- - This is tenant data, unlike the credential tables PRD-006a added. A row is
--   owned by one (location, person) pair and is only ever reached through a
--   tenant transaction, so it takes the ordinary three-policy shape the campaign
--   evidence tables use: migration_owner for all, app_runtime under
--   platform.tenant_matches(location_id), support_runtime for select.
-- - app_runtime gains select, insert, and update, because progress changes as
--   the user moves through the setup. It gains no delete: nothing in the product
--   removes a preference row, and a grant that no caller needs is a grant that
--   can only be misused. Owner-privileged deletion for a subject request stays
--   available to the migration login, under the retention runbook.
-- - The size check bounds what one row can hold, so a caller that starts writing
--   arbitrary documents into a preference key fails at the boundary rather than
--   turning this into an unbounded per-user store.

set role migration_owner;

create table platform.user_preferences (
  location_id uuid not null references platform.locations (id) on delete restrict,
  user_id uuid not null references platform.app_users (id) on delete restrict,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint user_preferences_pkey primary key (location_id, user_id, key),
  constraint user_preferences_key_ck check (key ~ '^[a-z][a-z0-9_.]{1,63}$'),
  -- Both keys this release writes hold an object, and every future key should:
  -- a bare scalar under a namespaced key carries no field names and cannot be
  -- extended without a migration.
  constraint user_preferences_value_object_ck
    check (pg_catalog.jsonb_typeof(value) = 'object'),
  constraint user_preferences_value_size_ck
    check (pg_catalog.pg_column_size(value) <= 16384)
);

create index user_preferences_user_id_idx on platform.user_preferences (user_id);

alter table platform.user_preferences enable row level security;
alter table platform.user_preferences force row level security;

create policy user_preferences_migration_owner_all on platform.user_preferences
  for all to migration_owner using (true) with check (true);
create policy user_preferences_app_tenant on platform.user_preferences
  for all to app_runtime
  using (platform.tenant_matches(location_id))
  with check (platform.tenant_matches(location_id));
create policy user_preferences_support_read on platform.user_preferences
  for select to support_runtime using (platform.support_context_allowed(location_id));

grant select, insert, update on platform.user_preferences to app_runtime;
grant select on platform.user_preferences to support_runtime;

reset role;
