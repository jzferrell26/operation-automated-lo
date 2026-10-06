-- Five field-only funnel drafts. Additive; no live publication or lead storage.
-- Existing tenants are not rewritten. At most one bounded draft per person/template.
-- Roll forward; never remove saved customer drafts to downgrade a reader.
set role migration_owner;
create table campaign.funnel_drafts (
  location_id uuid not null references platform.locations(id) on delete restrict,
  user_id uuid not null references platform.app_users(id) on delete restrict,
  kind text not null check (kind in ('live-webinar','on-demand','buyer','refinance','lead-magnet')),
  revision uuid not null,
  draft jsonb not null check (jsonb_typeof(draft) = 'object' and octet_length(draft::text) <= 950000),
  updated_at timestamptz not null default now(),
  primary key(location_id,user_id,kind),
  constraint funnel_private_only check ((draft->>'publicationAuthorized' = 'false' and draft->>'kind' = kind and draft->>'revision'=revision::text) is true)
);
create index funnel_drafts_user_idx on campaign.funnel_drafts(user_id);
alter table campaign.funnel_drafts enable row level security;
alter table campaign.funnel_drafts force row level security;
create policy funnel_drafts_migration_owner on campaign.funnel_drafts for all to migration_owner using(true) with check(true);
create policy funnel_drafts_own on campaign.funnel_drafts for all to app_runtime
  using(platform.tenant_matches(location_id) and user_id=platform.current_actor_id())
  with check(platform.tenant_matches(location_id) and user_id=platform.current_actor_id());
grant select,insert,update on campaign.funnel_drafts to app_runtime;
-- Personal draft/photo content is not exposed through support_runtime or public roles.
reset role;
