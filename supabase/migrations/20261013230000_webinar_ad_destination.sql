-- CTR-002 revision 2, PostgreSQL 17. Additive functions only, no table/RLS changes.
-- CREATE FUNCTION takes catalog/object locks on the new functions only. No table
-- ACCESS EXCLUSIVE lock, rewrite, index, backfill or new durable data is required.
-- Roll back an unused deployment by dropping these four functions; after use,
-- roll forward. Existing owner list/export/revoke and public capabilities stay intact.
set role migration_owner;

-- Private shared predicate. Native authentication supplies these parameters;
-- tenant and actor come exclusively from the transaction context. Embedded
-- sessions are verified by the existing signed-session boundary, with current
-- database binding rechecked here. First-party sessions are also checked in DB.
create function campaign.webinar_destination_authorized(
  wanted_role text, wanted_role_version bigint, wanted_mode text, wanted_session uuid
)
returns boolean language sql stable security definer set search_path='' as $f$
  select coalesce(
    platform.current_actor_type()='user'
    and wanted_role in ('location_admin','campaign_creator','campaign_approver')
    and wanted_mode in ('first_party','embedded')
    and wanted_role_version=platform.current_role_version(
      platform.current_location_id(),platform.current_actor_id(),
      case wanted_role when 'location_admin' then 'location_admin'
        when 'campaign_creator' then 'creator' when 'campaign_approver' then 'approver' end)
    and (wanted_mode='embedded' or exists (
      select 1 from platform.first_party_sessions s
      where s.id=wanted_session and s.location_id=platform.current_location_id()
        and s.user_id=platform.current_actor_id() and s.session_role=wanted_role
        and s.role_version=wanted_role_version and s.revoked_at is null and s.expires_at>now()
    )), false)
$f$;

create function campaign.webinar_destination_owned(
  wanted_publication uuid, wanted_role text, wanted_role_version bigint,
  wanted_mode text, wanted_session uuid
)
returns jsonb language sql stable security definer set search_path='' as $f$
  select jsonb_build_object('publication',campaign.funnel_public_snapshot(p.id),
    'publisherActorRef','actor_'||replace(p.user_id::text,'-',''),'frozenDestination',null)
  from campaign.funnel_publications p
  where campaign.webinar_destination_authorized(wanted_role,wanted_role_version,wanted_mode,wanted_session)
    and wanted_role in ('location_admin','campaign_creator')
    and p.id=wanted_publication and platform.tenant_matches(p.location_id)
    and p.user_id=platform.current_actor_id() and p.kind in ('live-webinar','on-demand')
    and campaign.funnel_public_snapshot(p.id) is not null
$f$;

-- No free-standing publication or publisher argument. The immutable version is
-- the only way an authorized distinct reviewer can access another actor's page.
create function campaign.webinar_destination_for_version(
  wanted_campaign text, wanted_version text, wanted_role text,
  wanted_role_version bigint, wanted_mode text, wanted_session uuid
)
returns jsonb language sql stable security definer set search_path='' as $f$
  select jsonb_build_object('publication',campaign.funnel_public_snapshot(p.id),
    'publisherActorRef',v.created_by_actor_ref,'frozenDestination',v.manifest->'destination')
  from campaign.campaign_versions v
  join campaign.funnel_publications p on p.id::text=v.manifest->'destination'->>'publicationId'
    and p.location_id=v.location_id and p.user_id=v.created_by_actor_id
  where campaign.webinar_destination_authorized(wanted_role,wanted_role_version,wanted_mode,wanted_session)
    and platform.tenant_matches(v.location_id)
    and v.campaign_ref=wanted_campaign and v.campaign_version_ref=wanted_version
    and (wanted_role in ('location_admin','campaign_approver') or v.created_by_actor_id=platform.current_actor_id())
    and v.manifest->>'blueprintId'='webinar-ad' and p.kind in ('live-webinar','on-demand')
    and v.created_by_actor_ref='actor_'||replace(v.created_by_actor_id::text,'-','')
    and v.manifest->'destination'->>'publisherActorRef'=v.created_by_actor_ref
    and campaign.funnel_public_snapshot(p.id) is not null
$f$;

-- Historical evidence only. Native server validates the complete strict snapshot
-- and its frozen hash, then exports only headline/description/hash. This function
-- never supplies current eligibility, an approval right, inquiries or a listing.
create function campaign.webinar_destination_history_for_version(
  wanted_campaign text, wanted_version text, wanted_role text,
  wanted_role_version bigint, wanted_mode text, wanted_session uuid
)
returns jsonb language sql stable security definer set search_path='' as $f$
  select jsonb_build_object('publication',jsonb_build_object('id',p.id,'snapshot',p.snapshot,
      'active',p.active,'sourceRevision',p.source_revision,'createdAt',p.created_at,'expiresAt',p.expires_at),
    'publisherActorRef',v.created_by_actor_ref,'frozenDestination',v.manifest->'destination')
  from campaign.campaign_versions v
  join campaign.funnel_publications p on p.id::text=v.manifest->'destination'->>'publicationId'
    and p.location_id=v.location_id and p.user_id=v.created_by_actor_id
  where campaign.webinar_destination_authorized(wanted_role,wanted_role_version,wanted_mode,wanted_session)
    and platform.tenant_matches(v.location_id)
    and v.campaign_ref=wanted_campaign and v.campaign_version_ref=wanted_version
    and (wanted_role in ('location_admin','campaign_approver') or v.created_by_actor_id=platform.current_actor_id())
    and v.manifest->>'blueprintId'='webinar-ad' and p.kind in ('live-webinar','on-demand')
    and v.created_by_actor_ref='actor_'||replace(v.created_by_actor_id::text,'-','')
    and v.manifest->'destination'->>'publisherActorRef'=v.created_by_actor_ref
$f$;

revoke all on function campaign.webinar_destination_authorized(text,bigint,text,uuid),
  campaign.webinar_destination_owned(uuid,text,bigint,text,uuid),
  campaign.webinar_destination_history_for_version(text,text,text,bigint,text,uuid),
  campaign.webinar_destination_for_version(text,text,text,bigint,text,uuid) from public;
grant execute on function campaign.webinar_destination_owned(uuid,text,bigint,text,uuid),
  campaign.webinar_destination_history_for_version(text,text,text,bigint,text,uuid),
  campaign.webinar_destination_for_version(text,text,text,bigint,text,uuid) to app_runtime;
reset role;
